import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { HotelImageCacheService } from '@application/hotel-images/hotel-image-cache.service';
import { SearchAmadeusHotelsDto } from '@presentation/booking/dto/search-amadeus-hotels.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class SearchAmadeusHotelsUseCase {
  private readonly logger = new Logger(SearchAmadeusHotelsUseCase.name);

  // Master city → coords map. Single source of truth.
  // Used by: execute() fallback, processResults() cityName, enrichHotelsWithLocation().
  private readonly CITY_CENTERS: Record<string, { lat: number; lng: number; name: string }> = {
    LON: { lat: 51.5074, lng: -0.1278, name: 'London' },
    PAR: { lat: 48.8566, lng: 2.3522, name: 'Paris' },
    NYC: { lat: 40.7128, lng: -74.006, name: 'New York' },
    DXB: { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
    LOS: { lat: 6.5244, lng: 3.3792, name: 'Lagos' },
    ABV: { lat: 9.0579, lng: 7.4951, name: 'Abuja' },
    MAD: { lat: 40.4168, lng: -3.7038, name: 'Madrid' },
    BCN: { lat: 41.3851, lng: 2.1734, name: 'Barcelona' },
    ROM: { lat: 41.9028, lng: 12.4964, name: 'Rome' },
    AMS: { lat: 52.3676, lng: 4.9041, name: 'Amsterdam' },
    BER: { lat: 52.52, lng: 13.405, name: 'Berlin' },
    IST: { lat: 41.0082, lng: 28.9784, name: 'Istanbul' },
    IBA: { lat: 7.3775, lng: 3.947, name: 'Ibadan' },
    KAN: { lat: 12.0022, lng: 8.592, name: 'Kano' },
    PHC: { lat: 4.8156, lng: 7.0498, name: 'Port Harcourt' },
    ENU: { lat: 6.4402, lng: 7.4943, name: 'Enugu' },
    BNI: { lat: 6.335, lng: 5.6037, name: 'Benin City' },
    CBQ: { lat: 4.976, lng: 8.3374, name: 'Calabar' },
    QRW: { lat: 5.5167, lng: 5.75, name: 'Warri' },
    JOS: { lat: 9.8965, lng: 8.8583, name: 'Jos' },
    KAD: { lat: 10.5222, lng: 7.4383, name: 'Kaduna' },
    MIU: { lat: 11.8333, lng: 13.15, name: 'Maiduguri' },
    SKO: { lat: 13.0059, lng: 5.2476, name: 'Sokoto' },
    YOL: { lat: 9.2, lng: 12.4833, name: 'Yola' },
    AKR: { lat: 7.2571, lng: 5.2058, name: 'Akure' },
    MXJ: { lat: 9.6139, lng: 6.5569, name: 'Minna' },
    UYO: { lat: 5.0378, lng: 7.9128, name: 'Uyo' },
    ABK: { lat: 6.3249, lng: 8.1137, name: 'Abakaliki' },
    QOW: { lat: 5.4836, lng: 7.0333, name: 'Owerri' },
    BCU: { lat: 10.3103, lng: 9.8439, name: 'Bauchi' },
  };

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly markupRepository: MarkupRepository,
    private readonly cacheService: CacheService,
    private readonly currencyService: CurrencyService,
    private readonly hotelImageCacheService: HotelImageCacheService,
  ) { }

  async execute(searchParams: SearchAmadeusHotelsDto) {
    const {
      hotelIds,
      cityCode,
      geographicCoordinates,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      priceRange,
      currency: targetCurrency = 'NGN',
      paymentPolicy,
      boardType,
      includeClosed,
      bestRateOnly = false,
      countryOfResidence,
      lang,
      radius = 50,
      radiusUnit = 'KM',
      limit = 20,
      page = 1,
      includeImages = true,
      getAll = false, 

    } = searchParams;

    
    const hasHotelIds = hotelIds && hotelIds.length > 0;
    const hasCityCode = cityCode && cityCode.trim() !== '';
    const hasGeographicCoordinates = geographicCoordinates !== undefined;

    if (!hasHotelIds && !hasCityCode && !hasGeographicCoordinates) {
      throw new BadRequestException(
        'Either hotelIds, cityCode, or geographicCoordinates must be provided for hotel search.',
      );
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      throw new BadRequestException(
        `Check-in date (${checkInDate}) cannot be in the past. Please select a future date.`,
      );
    }

    const checkOut = new Date(checkOutDate);
    checkOut.setHours(0, 0, 0, 0);

    if (checkOut <= checkIn) {
      throw new BadRequestException(
        `Check-out date (${checkOutDate}) must be after check-in date (${checkInDate}).`,
      );
    }

 
    let finalHotelIds = hotelIds;
    
    if (hasCityCode && !hasHotelIds) {
      this.logger.log(`Fetching hotels for city code: ${cityCode}`);

      const safeRadius = Math.min(Math.max(Number(radius) || 50, 1), 100);

      // ── Attempt 1: by-city ──
      let finalHotelIdsAttempt: string[] = [];
      try {
        const hotelsList = await this.amadeusService.getHotelsByCity({
          cityCode: cityCode,
          radius: safeRadius,
          radiusUnit: radiusUnit,
        });

        finalHotelIdsAttempt = (hotelsList?.data || [])
          .map((hotel: any) => hotel.hotelId)
          .filter((id: string) => this.isValidHotelId(id, cityCode));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`by-city failed for ${cityCode}: ${msg}`);
      }

      // ── Attempt 2: by-geocode fallback (handles Ibadan, Kano, etc.) ──
      if (finalHotelIdsAttempt.length === 0) {
        const coords = this.CITY_CENTERS[cityCode];
        if (coords) {
          this.logger.warn(
            `by-city returned nothing for ${cityCode}; trying by-geocode at (${coords.lat}, ${coords.lng})`,
          );
          try {
            const geoList = await this.amadeusService.getHotelsByGeocode({
              latitude: coords.lat,
              longitude: coords.lng,
              radius: safeRadius,
              radiusUnit: 'KM',
            });

            finalHotelIdsAttempt = (geoList?.data || [])
              .map((hotel: any) => hotel.hotelId)
              .filter((id: string) => this.isValidHotelId(id, cityCode));

            this.logger.log(`by-geocode fallback found ${finalHotelIdsAttempt.length} hotel IDs for ${cityCode}`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`by-geocode fallback failed for ${cityCode}: ${msg}`);
          }
        } else {
          this.logger.warn(`No city center coordinates on file for ${cityCode}; cannot fall back`);
        }
      }

      if (finalHotelIdsAttempt.length === 0) {
        throw new BadRequestException(
          `No hotels found for ${cityCode}. Amadeus has no indexed inventory for this city.`,
        );
      }

      finalHotelIds = finalHotelIdsAttempt;
      this.logger.log(`Found ${finalHotelIds.length} valid hotels for city code: ${cityCode}`);
    }


    if (hasGeographicCoordinates && !hasHotelIds && !hasCityCode) {
      this.logger.log(`Fetching hotels near coordinates: ${geographicCoordinates.latitude}, ${geographicCoordinates.longitude}`);
      
      const safeRadius = Math.min(Math.max(Number(radius) || 50, 1), 100);

      const hotelsList = await this.amadeusService.getHotelsByCity({
        cityCode: cityCode,
        radius: safeRadius,
        radiusUnit: radiusUnit,
      });
      
      if (!hotelsList?.data || hotelsList.data.length === 0) {
        throw new BadRequestException(
          `No hotels found near the provided coordinates. Please try different coordinates or use hotelIds directly.`,
        );
      }
      
      finalHotelIds = hotelsList.data
        .map((hotel: any) => hotel.hotelId)
        .filter((id: string) => this.isValidHotelId(id));
      
      if (finalHotelIds.length === 0) {
        throw new BadRequestException(
          `No valid hotel IDs found near the provided coordinates. Please try a different location.`,
        );
      }
      
      this.logger.log(`Found ${finalHotelIds.length} valid hotels near the provided coordinates`);
    }

  
    if (!finalHotelIds || finalHotelIds.length === 0) {
      throw new BadRequestException(
        'No hotel IDs available for search. Please provide valid hotelIds, a cityCode with available hotels, or geographic coordinates.',
      );
    }

    // Check cache
    const cacheKey = this.generateCacheKey(searchParams);
    const cached = this.cacheService.get<any>(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }
        // Fetch everything if the city has a manageable number of hotels.
    // Only truncate when the list is genuinely huge (Amadeus offer pricing is slow).
    const SOFT_LIMIT = 300;
    const HARD_FETCH_CAP = 400;

    let idsToFetch: string[];
    let truncated = false;

    if (finalHotelIds.length <= SOFT_LIMIT) {
      idsToFetch = finalHotelIds;
      this.logger.log(`Fetching ALL ${finalHotelIds.length} hotels for ${cityCode || 'geocode search'}`);
    } else {
      idsToFetch = finalHotelIds.slice(0, HARD_FETCH_CAP);
      truncated = true;
      this.logger.log(
        `Truncating: fetching ${idsToFetch.length} of ${finalHotelIds.length} hotels (cap: ${HARD_FETCH_CAP})`,
      );
    }

    try {

      if (getAll) {
        // ✅ Use ALL hotels
        this.logger.log(`🔄 Fetching ${idsToFetch.length} of ${finalHotelIds.length} hotels (no pagination)`);

  // Process in chunks of 10 (Amadeus API limit), 5 chunks at a time
  const allResults = [];
  const chunkSize = 10;
  const PARALLEL = 10;

  const chunks: string[][] = [];
  for (let i = 0; i < idsToFetch.length; i += chunkSize) {
    chunks.push(idsToFetch.slice(i, i + chunkSize));
  }

  for (let b = 0; b < chunks.length; b += PARALLEL) {
    const batch = chunks.slice(b, b + PARALLEL);
    this.logger.log(
      `📦 Fetching batch ${Math.floor(b / PARALLEL) + 1}/${Math.ceil(chunks.length / PARALLEL)} (${batch.length} chunks)`,
    );

    const batchResults = await Promise.all(
      batch.map((chunk) =>
        this.amadeusService
          .searchHotels({
            hotelIds: chunk,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity,
            currency: targetCurrency,
            includeImages: false,
          })
          .then((res) => res?.data || [])
          .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Chunk failed: ${errorMessage}`);
            return [];
          }),
      ),
    );

    for (const r of batchResults) {
      allResults.push(...r);
    }
  }
  
    
  const processed = await this.processResults(
    allResults,
    targetCurrency,
    finalHotelIds.length,
    cityCode || '',
  );


  const ENRICH_LIMIT = 10;
  const toEnrich = processed.data.slice(0, ENRICH_LIMIT);
  const untouched = processed.data.slice(ENRICH_LIMIT);

  const enrichedSlice = await this.enrichHotelsWithLocation(
    toEnrich,
    cityCode || '',
    { skipReverseGeocode: true },
  );

  processed.data = [...enrichedSlice, ...untouched];

  processed.cached = false;
  this.cacheService.set(cacheKey, processed, 5 * 60 * 1000);

  return processed;
}

  
    // ─────────────────────────────────────────────────────────────
  // PAGINATED BRANCH — fetch-all-then-paginate-in-memory
  // ─────────────────────────────────────────────────────────────

  const allCacheKey = this.generateCacheKey({
    ...searchParams,
    page: 1,
    limit: 9999,
    getAll: true,
  });

  let allData = this.cacheService.get<any>(allCacheKey);

  if (!allData) {
    this.logger.log(`🔄 Fetching ${idsToFetch.length} of ${finalHotelIds.length} hotels for pagination`);

    const allResults = [];
    const chunkSize = 10;
    const PARALLEL = 10;

    const chunks: string[][] = [];
    for (let i = 0; i < idsToFetch.length; i += chunkSize) {
      chunks.push(idsToFetch.slice(i, i + chunkSize));
    }

    for (let b = 0; b < chunks.length; b += PARALLEL) {
      const batch = chunks.slice(b, b + PARALLEL);
      this.logger.log(
        `📦 Fetching batch ${Math.floor(b / PARALLEL) + 1}/${Math.ceil(chunks.length / PARALLEL)} (${batch.length} chunks)`,
      );

      const batchResults = await Promise.all(
        batch.map((chunk) =>
          this.amadeusService
            .searchHotels({
              hotelIds: chunk,
              checkInDate,
              checkOutDate,
              adults,
              roomQuantity,
              ...(priceRange && { priceRange, currency: targetCurrency }),
              ...(!priceRange && { currency: targetCurrency }),
              ...(paymentPolicy && { paymentPolicy }),
              ...(boardType && { boardType }),
              ...(includeClosed !== undefined && { includeClosed }),
              ...(bestRateOnly !== undefined && { bestRateOnly }),
              ...(countryOfResidence && { countryOfResidence }),
              ...(lang && { lang }),
              includeImages: false,
            })
            .then((res) => res?.data || [])
            .catch((error) => {
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.logger.warn(`Chunk failed: ${errorMessage}`);
              return [];
            }),
        ),
      );

      for (const r of batchResults) {
        allResults.push(...r);
      }
    }

    const processed = await this.processResults(
      allResults,
      targetCurrency,
      finalHotelIds.length,
    );

    const ENRICH_LIMIT = 10;
    const toEnrich = processed.data.slice(0, ENRICH_LIMIT);
    const untouched = processed.data.slice(ENRICH_LIMIT);

    const enrichedSlice = await this.enrichHotelsWithLocation(
      toEnrich,
      cityCode || '',
      { skipReverseGeocode: true },
    );

    processed.data = [...enrichedSlice, ...untouched];
    this.cacheService.set(allCacheKey, processed, 5 * 60 * 1000);
    allData = processed;
  }

  // ── Paginate from the full, cached dataset ──
  const totalAvailable = allData.data.length;
  const totalPages = Math.ceil(totalAvailable / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = allData.data.slice(startIndex, endIndex);
  const hasMore = page < totalPages;

  if (paginatedData.length === 0) {
    throw new BadRequestException(
      `No hotels found for page ${page}. Please try a different page.`,
    );
  }

  const result = {
    data: paginatedData,
    meta: {
      count: paginatedData.length,
      total: totalAvailable,
      totalListedByAmadeus: finalHotelIds.length,
      truncated,
      coveragePercentage:
        finalHotelIds.length > 0
          ? Math.round((totalAvailable / finalHotelIds.length) * 100)
          : 0,
      limit,
      page,
      totalPages,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
    currency: targetCurrency,
    conversion_note: allData.conversion_note,
    cached: false,
    images_enriched: includeImages,
  };

  this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

  return result;
  } catch (error) {
    this.logger.error('Error searching Amadeus hotels:', error);
      
      const anyError = error as any;
      // Handle specific Amadeus errors
      if (anyError.response?.data?.errors) {
        const amadeusError = anyError.response.data.errors[0];
        
        // Handle VERIFY CHAIN/REP CODE error
        if (amadeusError.code === '1351' || amadeusError.detail?.includes('VERIFY CHAIN/REP CODE')) {
          throw new HttpException(
            {
              success: false,
              message: 'Some hotel IDs are invalid or not available for search. Please try a different city or search with specific hotel IDs.',
              error: amadeusError.detail || amadeusError.title,
              code: amadeusError.code,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        
        if (amadeusError.code === '38190' || amadeusError.code === '701') {
          throw new HttpException(
            {
              success: false,
              message: 'Amadeus API authentication failed. Please check your API credentials.',
              error: amadeusError.title,
              code: amadeusError.code,
            },
            HttpStatus.UNAUTHORIZED,
          );
        }
      }
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Unable to search hotels at this time. Please check your search parameters and try again.',
          error: 'Search failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async executeWithRoomTypes(searchParams: SearchAmadeusHotelsDto): Promise<any> {
    this.logger.log(`🔍 Searching Amadeus hotels with room types: ${JSON.stringify(searchParams)}`);
    
    const {
      hotelIds,
      cityCode,
      geographicCoordinates,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      currency: targetCurrency = 'NGN',
      bestRateOnly = false,
      radius = 50,
      radiusUnit = 'KM',
    } = searchParams;

    // Validate inputs
    const hasHotelIds = hotelIds && hotelIds.length > 0;
    const hasCityCode = cityCode && cityCode.trim() !== '';
    const hasGeographicCoordinates = geographicCoordinates !== undefined;

    if (!hasHotelIds && !hasCityCode && !hasGeographicCoordinates) {
      throw new BadRequestException(
        'Either hotelIds, cityCode, or geographicCoordinates must be provided for hotel search.',
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      throw new BadRequestException(
        `Check-in date (${checkInDate}) cannot be in the past. Please select a future date.`,
      );
    }

    const checkOut = new Date(checkOutDate);
    checkOut.setHours(0, 0, 0, 0);

    if (checkOut <= checkIn) {
      throw new BadRequestException(
        `Check-out date (${checkOutDate}) must be after check-in date (${checkInDate}).`,
      );
    }

    let finalHotelIds = hotelIds;
    
    if (hasCityCode && !hasHotelIds) {
      this.logger.log(`Fetching hotels for city code: ${cityCode}`);
      
      const hotelsList = await this.amadeusService.getHotelsByCity({
        cityCode: cityCode,
        radius: radius,
        radiusUnit: radiusUnit,
      });
      
      if (!hotelsList?.data || hotelsList.data.length === 0) {
        throw new BadRequestException(
          `No hotels found for city code: ${cityCode}. Please try a different city or use hotelIds directly.`,
        );
      }
      
      finalHotelIds = hotelsList.data
        .map((hotel: any) => hotel.hotelId)
        .filter((id: string) => this.isValidHotelId(id, cityCode));
      
      if (finalHotelIds.length === 0) {
        throw new BadRequestException(
          `No valid hotel IDs found for city code: ${cityCode}. Please try a different city or use hotelIds directly.`,
        );
      }
      
      this.logger.log(`Found ${finalHotelIds.length} valid hotels for city code: ${cityCode}`);
    }

    // Get hotel IDs if geographic coordinates provided
    if (hasGeographicCoordinates && !hasHotelIds && !hasCityCode) {
      this.logger.log(`Fetching hotels near coordinates: ${geographicCoordinates.latitude}, ${geographicCoordinates.longitude}`);
      
      const safeGeoRadius = Math.min(Math.max(Number(radius) || 50, 1), 100);

      const hotelsList = await this.amadeusService.getHotelsByGeocode({
        latitude: geographicCoordinates.latitude,
        longitude: geographicCoordinates.longitude,
        radius: safeGeoRadius,
        radiusUnit: radiusUnit,
      });
      
      if (!hotelsList?.data || hotelsList.data.length === 0) {
        throw new BadRequestException(
          `No hotels found near the provided coordinates. Please try different coordinates or use hotelIds directly.`,
        );
      }
      
      finalHotelIds = hotelsList.data
        .map((hotel: any) => hotel.hotelId)
        .filter((id: string) => this.isValidHotelId(id));
      
      if (finalHotelIds.length === 0) {
        throw new BadRequestException(
          `No valid hotel IDs found near the provided coordinates. Please try a different location.`,
        );
      }
      
      this.logger.log(`Found ${finalHotelIds.length} valid hotels near the provided coordinates`);
    }

    if (!finalHotelIds || finalHotelIds.length === 0) {
      throw new BadRequestException(
        'No hotel IDs available for search. Please provide valid hotelIds, a cityCode with available hotels, or geographic coordinates.',
      );
    }

    const results = await this.amadeusService.getHotelOffersWithRoomTypes({
      hotelIds: finalHotelIds,
      checkInDate,
      checkOutDate,
      adults: adults || 2,
      roomQuantity: roomQuantity || 1,
      currency: targetCurrency || 'GBP',
      bestRateOnly: bestRateOnly,
    });

    const processedResults = await this.processRoomTypesWithMarkup(results, targetCurrency);
    return processedResults;
  }

  async getOfferPricingWithFees(offerId: string, currency: string = 'GBP'): Promise<any> {
    this.logger.log(`💰 Getting offer pricing with fees for offer: ${offerId}`);
    
    const results = await this.amadeusService.getHotelOfferPricingWithFees(offerId, currency);
    const processedResults = await this.processOfferPricingWithMarkup(results, currency);
    
    return processedResults;
  }

  private async processRoomTypesWithMarkup(results: any, targetCurrency: string): Promise<any> {
    if (!results?.data) {
      return results;
    }

    const EXCLUDED_FROM_MARKUP = new Set([
      'BASE_RATE',
      'BASE',
      'MARKUP',
      'SERVICE_FEE',
      'CONVERSION_FEE',
    ]);
  
    let markupPercentage = 2.5;
    let serviceFeeAmount = 0;
    try {
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        ProductType.HOTEL,
        targetCurrency,
      );
      if (markupConfig) {
        markupPercentage = markupConfig.markupPercentage || 2.5;
        serviceFeeAmount = markupConfig.serviceFeePercentage || 0;
      }
    } catch (error) {
      this.logger.warn(`Could not fetch markup config, using default ${markupPercentage}%:`, error);
    }
  
    const processedData = await Promise.all(
      results.data.map(async (hotel: any) => {
        const processedRoomTypes = await Promise.all(
          (hotel.roomTypes || []).map(async (roomType: any) => {
            // ✅ FIX: Use total first, then base - properly parse
            let originalPrice = roomType.price?.total || roomType.price?.base || 0;
            const originalCurrency = roomType.price?.currency || 'EUR';
            
            // ✅ Parse the price correctly (handle string or number)
            const parsedOriginalPrice = typeof originalPrice === 'string' 
              ? parseFloat(originalPrice) 
              : (originalPrice || 0);
            
            // ✅ If still 0, try to get from raw data if available
            let finalOriginalPrice = parsedOriginalPrice;
            if (finalOriginalPrice === 0 && roomType.raw?.price?.total) {
              const rawPrice = roomType.raw.price.total;
              finalOriginalPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice || 0);
            }
            
            // ✅ If still 0, try to get from the offer's price.total directly from results
            if (finalOriginalPrice === 0 && roomType.price?.total) {
              const totalPrice = roomType.price.total;
              finalOriginalPrice = typeof totalPrice === 'string' ? parseFloat(totalPrice) : (totalPrice || 0);
            }
            
            this.logger.debug(`Room ${roomType.type}: originalPrice=${finalOriginalPrice}, currency=${originalCurrency}`);
            
            let convertedBasePrice: number;
            let conversionFee: number = 0;
            let conversionFeePercentage: number = 0;
        
            if (originalCurrency !== targetCurrency) {
              convertedBasePrice = await this.currencyService.convert(
                finalOriginalPrice,
                originalCurrency,
                targetCurrency,
              );
              const conversionDetails = this.currencyService.calculateConversionFee(
                convertedBasePrice,
                originalCurrency,
                targetCurrency,
              );
              conversionFee = conversionDetails.conversionFee;
              conversionFeePercentage = this.currencyService.getConversionBuffer();
            } else {
              convertedBasePrice = finalOriginalPrice;
            }
        
            const markupAmount = (convertedBasePrice * markupPercentage) / 100;
            const finalPrice = convertedBasePrice + markupAmount + serviceFeeAmount + conversionFee;
        
            // ✅ Transform fees with async handling
            const transformedFees = await Promise.all(
              (roomType.price?.fees || []).map(async (fee: any) => {
                let feeAmount = fee.amount || 0;
                let feeCurrency = fee.currency || originalCurrency;
                
                // ✅ Parse fee amount correctly
                const parsedFeeAmount = typeof feeAmount === 'string' 
                  ? parseFloat(feeAmount) 
                  : (feeAmount || 0);
                
                if (feeCurrency !== targetCurrency) {
                  feeAmount = await this.currencyService.convert(parsedFeeAmount, feeCurrency, targetCurrency);
                } else {
                  feeAmount = parsedFeeAmount;
                }
                
                if (!EXCLUDED_FROM_MARKUP.has(fee.type)) {
                  feeAmount = feeAmount + (feeAmount * markupPercentage / 100);
                }
                
                return {
                  ...fee,
                  amount: this.currencyService.formatAmount(feeAmount, targetCurrency),
                  currency: targetCurrency,
                };
              })
            );
  
            // ✅ Add MARKUP fee
            if (markupAmount > 0) {
              transformedFees.push({
                type: 'MARKUP',
                amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
                currency: targetCurrency,
                description: `Markup (${markupPercentage}%)`,
                includedInBase: false,
              });
            }
  
            // ✅ Add SERVICE_FEE
            if (serviceFeeAmount > 0) {
              transformedFees.push({
                type: 'SERVICE_FEE',
                amount: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
                currency: targetCurrency,
                description: 'Service fee',
                includedInBase: false,
              });
            }
  
            // ✅ Add CONVERSION_FEE
            if (conversionFee > 0) {
              transformedFees.push({
                type: 'CONVERSION_FEE',
                amount: this.currencyService.formatAmount(conversionFee, targetCurrency),
                currency: targetCurrency,
                description: `Currency conversion fee (${conversionFeePercentage}%)`,
                includedInBase: false,
              });
            }
  
            // ✅ Log final price for debugging
            this.logger.debug(`Room ${roomType.type}: base=${convertedBasePrice}, markup=${markupAmount}, serviceFee=${serviceFeeAmount}, conversionFee=${conversionFee}, total=${finalPrice}`);
  
            return {
              ...roomType,
              price: {
                ...roomType.price,
                base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                total: this.currencyService.formatAmount(finalPrice, targetCurrency),
                currency: targetCurrency,
                fees: transformedFees,
                original_base: finalOriginalPrice,
                original_currency: originalCurrency,
                markup_percentage: markupPercentage,
                markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
                service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
                conversion_fee: this.currencyService.formatAmount(conversionFee, targetCurrency),
              },
            };
          }),
        );
  
        return {
          ...hotel,
          roomTypes: processedRoomTypes,
          currency: targetCurrency,
        };
      }),
    );
  
    return {
      ...results,
      data: processedData,
      currency: targetCurrency,
      markup_percentage: markupPercentage,
      service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
      conversion_note: `Prices converted to ${targetCurrency} with ${markupPercentage}% markup${serviceFeeAmount > 0 ? ` and ${this.currencyService.formatAmount(serviceFeeAmount, targetCurrency)} service fee` : ''}.`,
    };
  }


  private async processOfferPricingWithMarkup(results: any, targetCurrency: string): Promise<any> {
    if (!results?.data) {
      return results;
    }

    const EXCLUDED_FROM_MARKUP = new Set([
      'BASE_RATE',
      'BASE',
      'MARKUP',
      'SERVICE_FEE',
      'CONVERSION_FEE',
    ]);

    let markupPercentage = 2.5;
    let serviceFeeAmount = 0;
    try {
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        ProductType.HOTEL,
        targetCurrency,
      );
      if (markupConfig) {
        markupPercentage = markupConfig.markupPercentage || 2.5;
        serviceFeeAmount = markupConfig.serviceFeePercentage || 0;
      }
    } catch (error) {
      this.logger.warn(`Could not fetch markup config, using default ${markupPercentage}%:`, error);
    }

    const offer = results.data;
    const originalPrice = offer.price?.base || 0;
    const originalCurrency = offer.price?.currency || 'EUR';
    
    let convertedBasePrice: number;
    let conversionFee: number = 0;
    let conversionFeePercentage: number = 0;

    if (originalCurrency !== targetCurrency) {
      convertedBasePrice = await this.currencyService.convert(
        originalPrice,
        originalCurrency,
        targetCurrency,
      );
      const conversionDetails = this.currencyService.calculateConversionFee(
        convertedBasePrice,
        originalCurrency,
        targetCurrency,
      );
      conversionFee = conversionDetails.conversionFee;
      conversionFeePercentage = this.currencyService.getConversionBuffer();
    } else {
      convertedBasePrice = originalPrice;
    }

    const markupAmount = (convertedBasePrice * markupPercentage) / 100;
    const finalPrice = convertedBasePrice + markupAmount + serviceFeeAmount + conversionFee;

    const transformedFees = await Promise.all(
      (offer.price?.fees || []).map(async (fee: any) => {
        let feeAmount = fee.amount || 0;
        const feeCurrency = fee.currency || originalCurrency;
        if (feeCurrency !== targetCurrency) {
          feeAmount = await this.currencyService.convert(
            feeAmount,
            feeCurrency,
            targetCurrency,
          );
        }
        if (!EXCLUDED_FROM_MARKUP.has(fee.type)) {
          feeAmount = feeAmount + (feeAmount * markupPercentage / 100);
        }
        return {
          ...fee,
          amount: this.currencyService.formatAmount(feeAmount, targetCurrency),
          currency: targetCurrency,
        };
      }),
    );

    if (markupAmount > 0) {
      transformedFees.push({
        type: 'MARKUP',
        amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
        currency: targetCurrency,
        description: `Markup (${markupPercentage}%)`,
        includedInBase: false,
      });
    }

    if (serviceFeeAmount > 0) {
      transformedFees.push({
        type: 'SERVICE_FEE',
        amount: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
        currency: targetCurrency,
        description: 'Service fee',
        includedInBase: false,
      });
    }

    if (conversionFee > 0) {
      transformedFees.push({
        type: 'CONVERSION_FEE',
        amount: this.currencyService.formatAmount(conversionFee, targetCurrency),
        currency: targetCurrency,
        description: `Currency conversion fee (${conversionFeePercentage}%)`,
        includedInBase: false,
      });
    }

    return {
      ...results,
      data: {
        ...offer,
        price: {
          ...offer.price,
          base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
          total: this.currencyService.formatAmount(finalPrice, targetCurrency),
          currency: targetCurrency,
          fees: transformedFees,
          original_base: originalPrice,
          original_currency: originalCurrency,
          markup_percentage: markupPercentage,
          markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
          service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
          conversion_fee: this.currencyService.formatAmount(conversionFee, targetCurrency),
        },
      },
      currency: targetCurrency,
      markup_percentage: markupPercentage,
      service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
      conversion_note: `Prices converted to ${targetCurrency} with ${markupPercentage}% markup${serviceFeeAmount > 0 ? ` and ${this.currencyService.formatAmount(serviceFeeAmount, targetCurrency)} service fee` : ''}.`,
    };
  }


  private async processResults(
    hotelData: any[],
    targetCurrency: string,
    totalHotels: number,
    cityCode?: string,
  ): Promise<any> {
    const CITY_CENTERS = this.CITY_CENTERS;

    const AMENITY_LABELS: Record<string, string> = {
      // Room basics
      NON_SMOKING_ROOMS: '🚭 Non-Smoking',
      AIR_CONDITIONING: '❄️ A/C',
      FREE_HIGH_SPEED_INTERNET_IN_ROOM: '📶 Free WiFi',
      WIFI: '📶 Free WiFi',
      WIRELESS_CONNECTIVITY_IN_ROOMS: '📶 Free WiFi',
      TELEVISION: '📺 TV',
      DUVET: '🛏 Duvet',
      IRON_AND_IRONING_BOARD: '🧺 Iron',
      SAFE: '🔐 Safe',
      TELEPHONE: '☎️ Phone',
      BATH: '🛁 Bath',
      BATHROBE: '🛁 Bathrobe',
      MARBLE_BATHROOM: '🛁 Marble Bath',
      SEPARATE_TUB_AND_SHOWER: '🛁 Tub & Shower',
      DOUBLE_VANITY: '🪞 Double Vanity',
      UPGRADED_BATHROOM_AMENITIES: '🛁 Upgraded Bath',
      WALK_IN_CLOSET: '👔 Walk-in Closet',
      PLUG_AND_PLAY_PANEL: '🔌 Plug & Play',
      SITTING_AREA: '🛋 Sitting Area',
      FIREPLACE: '🔥 Fireplace',
      OVERSIZED_ROOMS: '📐 Oversized Room',
      CONNECTING_ROOMS: '🚪 Connecting Rooms',
      DUAL_VOLTAGE_OUTLET: '🔌 Dual Voltage',
      LAMP: '💡 Lamp',
      TABLES_AND_CHAIRS: '🪑 Tables & Chairs',
      WELCOME_GIFT: '🎁 Welcome Gift',
      IPOD_DOCKING_STATION: '🎵 iPod Dock',
      TURN_DOWN_SERVICE: '🌙 Turn-Down Service',
      KING_BED: '🛏 King Bed',
      QUEEN_BED: '🛏 Queen Bed',
      TWIN_BED: '🛏 Twin Beds',
      SINGLE_BED: '🛏 Single Bed',
      SOFA_BED: '🛋 Sofa Bed',
      ROLLAWAY_BEDS: '🛏 Rollaway Bed',
      MEAL_INCLUDED_BREAKFAST: '🍳 Breakfast Included',
      FULL_KITCHEN: '🍳 Full Kitchen',
      OVEN: '🔥 Oven',
      KITCHEN_SUPPLIES: '🍽 Kitchen Supplies',
      SILVERWARE_OR_UTENSILS: '🍴 Utensils',
      CUPS_OR_GLASSWARE: '🥂 Glassware',
      SWIMMING_POOL: '🏊 Pool',
      FITNESS_CENTER: '🏋 Fitness Center',
      HEALTH_CLUB: '🏋 Fitness Center',
      SPA: '💆 Spa',
      PARKING: '🅿️ Parking',
      RESTAURANT: '🍽 Restaurant',
      BAR: '🍸 Bar',
      AIRPORT_SHUTTLE: '🚐 Shuttle',
      BUSINESS_CENTER: '💼 Business Center',
      LAUNDRY: '🧺 Laundry',
      ROOM_SERVICE: '🛎 Room Service',
      PETS_ALLOWED: '🐾 Pet Friendly',
      MEETING_ROOMS: '📊 Meeting Rooms',
      ELEVATOR: '🛗 Elevator',
      TWENTY_FOUR_HOUR_FRONT_DESK: '🕐 24h Front Desk',
    };

    // Fetch markup configuration
    let markupPercentage = 2.5;
    let serviceFeeAmount = 0;
    try {
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        ProductType.HOTEL,
        targetCurrency,
      );
      if (markupConfig) {
        markupPercentage = markupConfig.markupPercentage || 2.5;
        serviceFeeAmount = markupConfig.serviceFeePercentage || 0;
      }
    } catch (error) {
      this.logger.warn(`Could not fetch markup config, using default ${markupPercentage}%:`, error);
    }

    const withOffers = hotelData.filter((h: any) => Array.isArray(h.offers) && h.offers.length > 0);
    this.logger.log(`Amadeus returned ${hotelData.length} hotels, ${withOffers.length} have offers`);

    const processedResults = await Promise.all(
      hotelData.map(async (hotelOffer: any) => {
        const processedOffers = await Promise.all(
          (hotelOffer.offers || []).map(async (offer: any) => {
            const originalBasePrice = parseFloat(offer.price?.total || offer.price?.base || '0');
            const originalCurrency = offer.price?.currency || 'EUR';
            
            let convertedBasePrice: number;
            let conversionFee: number = 0;
            let conversionFeePercentage: number = 0;
        
            if (originalCurrency !== targetCurrency) {
              convertedBasePrice = await this.currencyService.convert(
                originalBasePrice,
                originalCurrency,
                targetCurrency,
              );
              
              const conversionDetails = this.currencyService.calculateConversionFee(
                convertedBasePrice,
                originalCurrency,
                targetCurrency,
              );
              
              conversionFee = conversionDetails.conversionFee;
              conversionFeePercentage = this.currencyService.getConversionBuffer();
            } else {
              convertedBasePrice = originalBasePrice;
            }
        
            const markupAmount = (convertedBasePrice * markupPercentage) / 100;
            const finalPrice = convertedBasePrice + markupAmount + serviceFeeAmount + conversionFee;

            // ── Extract a clean room name from the messy Amadeus description ──
            const rawRoomDescription =
              typeof offer?.room?.description === 'string'
                ? offer.room.description
                : offer?.room?.description?.text || '';

            const roomName = this.extractRoomName(
              rawRoomDescription,
              offer?.room?.typeEstimated?.category,
            );

            return {
              ...offer,
              roomName,                                       // ← ADD
              original_price: originalBasePrice.toString(),
              original_currency: originalCurrency,
              base_price: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
              currency: targetCurrency,
              conversion_fee: this.currencyService.formatAmount(conversionFee, targetCurrency),
              conversion_fee_percentage: conversionFeePercentage,
              markup_percentage: markupPercentage,
              markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
              service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
              final_price: this.currencyService.formatAmount(finalPrice, targetCurrency),
              final_amount: this.currencyService.formatAmount(finalPrice, targetCurrency),
              price: {
                ...offer.price,
                currency: targetCurrency,
                base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                total: this.currencyService.formatAmount(finalPrice, targetCurrency),
                original_total: originalBasePrice.toString(),
                original_currency: originalCurrency,
              },
            };
          }),
        );
    
               // ── Compute amenities + cityName for EVERY hotel (no network) ──
               const hotel = hotelOffer.hotel || {};

               const firstOffer = (processedOffers && processedOffers[0]) || {};
               const offerAmenityCodes: string[] = (
                 firstOffer.roomInformation?.amenities || []
               ).map((a: any) => a.code);
               const hotelAmenityCodes: string[] = hotel.amenities || [];
               const allAmenityCodes = Array.from(
                 new Set([...hotelAmenityCodes, ...offerAmenityCodes]),
               );
               const amenityLabels = allAmenityCodes
                 .map((code) => AMENITY_LABELS[code])
                 .filter(Boolean)
                 .slice(0, 6);
       
               const cityName =
                 CITY_CENTERS[cityCode || '']?.name || hotel.cityName || '';
       
               return {
                 ...hotelOffer,
                 hotel: {
                   ...hotel,
                   amenities: allAmenityCodes,
                   amenityLabels,
                   cityName,
                 },
                 offers: processedOffers,
                 currency: targetCurrency,
               };
      }),
    );

    // Attach images
    const ids = processedResults
      .map((r: any) => r.hotel?.hotelId)
      .filter((id): id is string => Boolean(id));
    
    let primaryUrls: Record<string, string> = {};
    if (ids.length > 0) {
      try {
        primaryUrls = await this.hotelImageCacheService.getPrimaryImageUrls(ids);
      } catch (e) {
        this.logger.warn('Could not attach primary image URLs to search results', e);
      }
    }
    
    const dataWithImages = processedResults.map((item: any) => ({
      ...item,
      primaryImageUrl: item.hotel?.hotelId ? primaryUrls[item.hotel.hotelId] ?? null : null,
    }));

    return {
      data: dataWithImages,
      meta: {
        count: processedResults.length,
        total: processedResults.length,       // ← what we actually returned
        totalListedByAmadeus: totalHotels,    // ← what Amadeus listed
        coveragePercentage:
          totalHotels > 0
            ? Math.round((processedResults.length / totalHotels) * 100)
            : 0,
        limit: totalHotels,
        page: 1,
        totalPages: 1,
        hasMore: false,
        nextPage: null,
        prevPage: null,
      },
      currency: targetCurrency,
      conversion_note: `Prices converted to ${targetCurrency} with ${markupPercentage}% markup${serviceFeeAmount > 0 ? ` and ${this.currencyService.formatAmount(serviceFeeAmount, targetCurrency)} service fee` : ''}.`,
      cached: false,
      images_enriched: true,
      all_fetched: true,
    };
  }


  private isValidHotelId(hotelId: string, cityCode?: string): boolean {
    // Amadeus hotel IDs are exactly 8 uppercase alphanumeric characters.
    // Format: [chain 2][city 3][suffix 3] — e.g. ADMAD02V, ADMADAAD, ADMADCFU.
    if (!hotelId || !/^[A-Z0-9]{8}$/.test(hotelId)) {
      return false;
    }

    // Reject only obvious placeholder/garbage IDs.
    const invalidPatterns = ['FGDX', 'XXXX', 'TEST', '0000', '9999'];
    if (invalidPatterns.some((p) => hotelId.includes(p))) {
      return false;
    }

    // Do NOT require digits — most valid IDs (ADMADAAD, ADMADCFU, ADMADDMM)
    // contain only letters.
    // Do NOT use hardcoded city-prefix whitelists — they reject valid hotels.
    return true;
  }


     private extractRoomName(description: string, estimatedCategory?: string): string {
      // ── Tier 1: Try to parse the description ──
      if (description && description.trim()) {
        const RATE_PREFIX_PATTERN =
          /^(FLEXIBLE|BREAKFAST|BEST|DAILY|15PCT|SIGNATURE|PACKAGE|RATE|2X POINTS|HALF BOARD|ROOM ONLY|ADVANCE SAVER|CORPORATE|BB|HB|RO|SLS|BBI|RAC|BAR|DAILY RATE|BEST AVAILABLE|BEST FLEXIBLE|READY TO SAVOR|EXPERIENCE|ROMANCE|LITTLE FEET|COLLECTION)/i;
  
        const STOP_WORDS =
          /\b(INC VAT|FREE WIFI|FREE HIGH SPEED|WITH BREAKFAST|BREAKFAST INCLUDED|ROOM ONLY|NON[- ]?REFUNDABLE|REFUNDABLE|150 MBPS|150MBPS|WIFI|INTERNET)\b/gi;
  
        // Split on newlines first, then on " - " (dash with spaces on both sides)
        const segments = description
          .split(/\n/)
          .flatMap((line) => line.split(/\s+-\s+/))
          .map((s) => s.trim())
          .filter(Boolean);
  
        for (const segment of segments) {
          // Skip rate plan names
          if (RATE_PREFIX_PATTERN.test(segment)) continue;
  
          // Skip pure-numbers or super-short segments
          if (segment.length < 3) continue;
  
          // Strip trailing rate-plan junk
          const cleaned = segment
            .replace(STOP_WORDS, '')
            .replace(/\s+/g, ' ')
            .replace(/^[\s\-:•*]+|[\s\-:•*]+$/g, '')
            .trim();
  
          if (cleaned.length < 3) continue;
  
          // If it's too long, cut at the first comma or hyphen
          let final = cleaned;
          if (final.length > 50) {
            final = final.split(/[,–—-]/)[0].trim();
          }
  
          if (final.length >= 3 && final.length <= 60) {
            // Title-case only ALLCAPS words, leave mixed-case words alone
            return final.replace(/\b\w+/g, (w) =>
              w.length > 2 && w === w.toUpperCase()
                ? w.charAt(0) + w.slice(1).toLowerCase()
                : w,
            );
          }
        }
      }
  
      // ── Tier 2: Fall back to the estimated category ──
      if (estimatedCategory && typeof estimatedCategory === 'string') {
        return estimatedCategory
          .toLowerCase()
          .split('_')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
  
      // ── Tier 3: Give up ──
      return '';
    }

  private generateCacheKey(searchParams: SearchAmadeusHotelsDto): string {
    const {
      hotelIds,
      cityCode,
      geographicCoordinates,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      currency,
      page,
      limit,
      radius,
      radiusUnit,
      includeImages,
      getAll,  
    } = searchParams;
  
    let key = `amadeus_hotel_search_v3:${checkInDate}-${checkOutDate}-${adults}-${roomQuantity}-${currency}-p${page}-l${limit}`;
  
    if (getAll) {
      key += ':all';
    }
  
    if (hotelIds && hotelIds.length > 0) {
      key += `:hotels-${[...hotelIds].sort().join(',')}`;
    } else if (cityCode) {
      key += `:city-${cityCode}`;
    } else if (geographicCoordinates) {
      key += `:geo-${geographicCoordinates.latitude.toFixed(4)}-${geographicCoordinates.longitude.toFixed(4)}-r${radius || 10}-${radiusUnit || 'KM'}`;
    }
  
    if (includeImages !== undefined) {
      key += `:img-${includeImages}`;
    }
  
    return key;
  }

  private async enrichHotelsWithLocation(
    hotelOffers: any[],
    cityCode: string,
    options: { skipReverseGeocode?: boolean } = {},
  ): Promise<any[]> {
    if (!hotelOffers || hotelOffers.length === 0) return hotelOffers;

    const CITY_CENTERS = this.CITY_CENTERS;

    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const AMENITY_LABELS: Record<string, string> = {
      // Room basics
      NON_SMOKING_ROOMS: '🚭 Non-Smoking',
      AIR_CONDITIONING: '❄️ A/C',
      FREE_HIGH_SPEED_INTERNET_IN_ROOM: '📶 Free WiFi',
      WIFI: '📶 Free WiFi',
      WIRELESS_CONNECTIVITY_IN_ROOMS: '📶 Free WiFi',
      TELEVISION: '📺 TV',
      DUVET: '🛏 Duvet',
      IRON_AND_IRONING_BOARD: '🧺 Iron',
      SAFE: '🔐 Safe',
      TELEPHONE: '☎️ Phone',
      BATH: '🛁 Bath',
      BATHROBE: '🛁 Bathrobe',
      MARBLE_BATHROOM: '🛁 Marble Bath',
      SEPARATE_TUB_AND_SHOWER: '🛁 Tub & Shower',
      DOUBLE_VANITY: '🪞 Double Vanity',
      UPGRADED_BATHROOM_AMENITIES: '🛁 Upgraded Bath',
      WALK_IN_CLOSET: '👔 Walk-in Closet',
      PLUG_AND_PLAY_PANEL: '🔌 Plug & Play',
      SITTING_AREA: '🛋 Sitting Area',
      FIREPLACE: '🔥 Fireplace',
      OVERSIZED_ROOMS: '📐 Oversized Room',
      CONNECTING_ROOMS: '🚪 Connecting Rooms',
      DUAL_VOLTAGE_OUTLET: '🔌 Dual Voltage',
      LAMP: '💡 Lamp',
      TABLES_AND_CHAIRS: '🪑 Tables & Chairs',
      WELCOME_GIFT: '🎁 Welcome Gift',
      IPOD_DOCKING_STATION: '🎵 iPod Dock',
      TURN_DOWN_SERVICE: '🌙 Turn-Down Service',

      // Beds
      KING_BED: '🛏 King Bed',
      QUEEN_BED: '🛏 Queen Bed',
      TWIN_BED: '🛏 Twin Beds',
      SINGLE_BED: '🛏 Single Bed',
      SOFA_BED: '🛋 Sofa Bed',
      ROLLAWAY_BEDS: '🛏 Rollaway Bed',

      // Meals
      MEAL_INCLUDED_BREAKFAST: '🍳 Breakfast Included',

      // Kitchen
      FULL_KITCHEN: '🍳 Full Kitchen',
      OVEN: '🔥 Oven',
      KITCHEN_SUPPLIES: '🍽 Kitchen Supplies',
      SILVERWARE_OR_UTENSILS: '🍴 Utensils',
      CUPS_OR_GLASSWARE: '🥂 Glassware',

      // Hotel facilities
      SWIMMING_POOL: '🏊 Pool',
      FITNESS_CENTER: '🏋 Fitness Center',
      HEALTH_CLUB: '🏋 Fitness Center',
      SPA: '💆 Spa',
      PARKING: '🅿️ Parking',
      RESTAURANT: '🍽 Restaurant',
      BAR: '🍸 Bar',
      AIRPORT_SHUTTLE: '🚐 Shuttle',
      BUSINESS_CENTER: '💼 Business Center',
      LAUNDRY: '🧺 Laundry',
      ROOM_SERVICE: '🛎 Room Service',
      PETS_ALLOWED: '🐾 Pet Friendly',
      MEETING_ROOMS: '📊 Meeting Rooms',
      ELEVATOR: '🛗 Elevator',
      TWENTY_FOUR_HOUR_FRONT_DESK: '🕐 24h Front Desk',
    };

    // Process sequentially with throttling (Nominatim: 1 req/sec)
    const enriched: any[] = [];

    for (const item of hotelOffers) {
      const hotel = item.hotel || {};
      const hotelId = hotel.hotelId;

      if (!hotelId) {
        enriched.push(item);
        continue;
      }

      // ── Build amenities list (from first offer's room info) ──
      const firstOffer = (item.offers && item.offers[0]) || {};
      const offerAmenityCodes: string[] = (firstOffer.roomInformation?.amenities || []).map(
        (a: any) => a.code,
      );
      const hotelAmenityCodes: string[] = hotel.amenities || [];
      const allAmenityCodes = Array.from(
        new Set([...hotelAmenityCodes, ...offerAmenityCodes]),
      );
      const amenityLabels = allAmenityCodes
        .map((code) => AMENITY_LABELS[code])
        .filter(Boolean)
        .slice(0, 6);

      // ── Distance from city center ──
      let distanceFromCenter: number | null = null;
      let distanceUnit: 'km' | 'm' = 'km';
      const center = CITY_CENTERS[cityCode];
      if (
        center &&
        typeof hotel.latitude === 'number' &&
        typeof hotel.longitude === 'number'
      ) {
        const km = haversineKm(center.lat, center.lng, hotel.latitude, hotel.longitude);
        if (km < 1) {
          distanceFromCenter = Math.round(km * 1000);
          distanceUnit = 'm';
        } else {
          distanceFromCenter = Math.round(km * 10) / 10;
          distanceUnit = 'km';
        }
      }

      // ── Reverse geocode (cached per hotel for 30 days) ──
      let neighbourhood = '';
      let cityName = center?.name || '';
      let countryName = '';
      let countryCode = '';
      let formattedAddress = '';

      const geoCacheKey = `geo:hotel:${hotelId}:v1`;
      const cachedGeo = this.cacheService.get<{
        neighbourhood: string;
        cityName: string;
        countryName: string;
        countryCode: string;
        formattedAddress: string;
      }>(geoCacheKey);

      if (cachedGeo) {
        neighbourhood = cachedGeo.neighbourhood;
        cityName = cachedGeo.cityName || cityName;
        countryName = cachedGeo.countryName;
        countryCode = cachedGeo.countryCode;
        formattedAddress = cachedGeo.formattedAddress;
      } else if (
        !options.skipReverseGeocode &&
        typeof hotel.latitude === 'number' &&
        typeof hotel.longitude === 'number'
      ) {
        try {
          const url =
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
            `&lat=${hotel.latitude}&lon=${hotel.longitude}` +
            `&zoom=14&addressdetails=1&accept-language=en`;

          const res = await fetch(url, {
            headers: {
              // ⚠️ REQUIRED by Nominatim ToS — replace with your real contact
              'User-Agent': 'EbonyBruceTravels/1.0 (contact@ebonybrucetravels.com)',
              Accept: 'application/json',
            },
          });

          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};

            neighbourhood =
              a.suburb ||
              a.neighbourhood ||
              a.quarter ||
              a.city_district ||
              a.borough ||
              a.village ||
              '';

            cityName = a.city || a.town || a.municipality || a.county || cityName;
            countryName = a.country || '';
            countryCode = (a.country_code || '').toUpperCase();

            const parts = [
              [a.house_number, a.road].filter(Boolean).join(' '),
              neighbourhood,
              cityName,
              a.postcode,
              countryName,
            ].filter(Boolean);
            formattedAddress = parts.join(', ');

            // Cache for 30 days
            this.cacheService.set(
              geoCacheKey,
              { neighbourhood, cityName, countryName, countryCode, formattedAddress },
              30 * 24 * 60 * 60 * 1000,
            );
          }
        } catch (err) {
          this.logger.warn(`Geocode failed for hotel ${hotelId}: ${err}`);
        }

        // Respect Nominatim rate limit ONLY when we actually hit the API
        await new Promise((r) => setTimeout(r, 1100));
      }

      // ── Merge everything back into the hotel object ──
      enriched.push({
        ...item,
        hotel: {
          ...hotel,
          neighbourhood,
          cityName: cityName || center?.name || '',
          countryName,
          countryCode,
          formattedAddress,
          distanceFromCenter,
          distanceUnit,
          amenities: allAmenityCodes, // raw codes
          amenityLabels, // display labels for the frontend
        },
      });
    }

    return enriched;
  }
}