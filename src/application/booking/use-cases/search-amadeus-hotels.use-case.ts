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
      bestRateOnly = true,
      countryOfResidence,
      lang,
      radius = 200,
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
    
      if (finalHotelIds.length === 0 && radius) {
        this.logger.warn(`No valid hotel IDs found with radius ${radius}km for ${cityCode}, retrying without radius...`);
        
        const retryHotelsList = await this.amadeusService.getHotelsByCity({
          cityCode: cityCode,
        });
        
        if (retryHotelsList?.data) {
          finalHotelIds = retryHotelsList.data
            .map((hotel: any) => hotel.hotelId)
            .filter((id: string) => this.isValidHotelId(id, cityCode));
        }
      }
      
      if (finalHotelIds.length === 0) {
        throw new BadRequestException(
          `No valid hotel IDs found for city code: ${cityCode}. Please try a different city or use hotelIds directly.`,
        );
      }
      
      this.logger.log(`Found ${finalHotelIds.length} valid hotels for city code: ${cityCode}`);
    }


    if (hasGeographicCoordinates && !hasHotelIds && !hasCityCode) {
      this.logger.log(`Fetching hotels near coordinates: ${geographicCoordinates.latitude}, ${geographicCoordinates.longitude}`);
      
      const hotelsList = await this.amadeusService.getHotelsByGeocode({
        latitude: geographicCoordinates.latitude,
        longitude: geographicCoordinates.longitude,
        radius: radius,
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

    try {
// ✅ If getAll is true, fetch ALL hotels (no pagination)
let totalHotels = finalHotelIds.length;
let totalPages = 1;
let hasMore = false;

if (getAll) {
  // ✅ Use ALL hotels
  this.logger.log(`🔄 Fetching ALL ${totalHotels} hotels (no pagination)`);
  // Process in chunks of 10 (Amadeus API limit)
  const allResults = [];
  const chunkSize = 10;
  
  for (let i = 0; i < finalHotelIds.length; i += chunkSize) {
    const chunk = finalHotelIds.slice(i, i + chunkSize);
    this.logger.log(`📦 Fetching chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(finalHotelIds.length/chunkSize)}`);
    
    try {
      const chunkResponse = await this.amadeusService.searchHotels({
        hotelIds: chunk,
        checkInDate,
        checkOutDate,
        adults,
        roomQuantity,
        currency: targetCurrency,
        includeImages,
      });
      
      if (chunkResponse?.data) {
        allResults.push(...chunkResponse.data);
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch chunk ${i}: ${error.message}`);
    }
  }
  
  return this.processResults(
    allResults,
    targetCurrency,
    finalHotelIds.length,
    true 
  );
}


const startIndex = (page - 1) * limit;
const endIndex = startIndex + limit;
const paginatedHotelIds = finalHotelIds.slice(startIndex, endIndex);

if (paginatedHotelIds.length === 0) {
  throw new BadRequestException(
    `No hotels found for page ${page}. Please try a different page.`,
  );
}

this.logger.log(`Searching ${paginatedHotelIds.length} hotels: ${paginatedHotelIds.join(', ')}`);

      const response = await this.amadeusService.searchHotels({
        hotelIds: paginatedHotelIds,
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
        includeImages: includeImages,
      });

      // Validate response
      if (!response || !response.data || !Array.isArray(response.data)) {
        this.logger.error('Invalid response structure:', response);
        throw new HttpException(
          'Invalid response from Amadeus API: missing or invalid data array',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

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
          serviceFeeAmount = markupConfig.serviceFeeAmount || 0;
        } else {
          this.logger.warn(`No markup config found for ${targetCurrency}, using default ${markupPercentage}%`);
        }
      } catch (error) {
        this.logger.warn(`Could not fetch markup config, using default ${markupPercentage}%:`, error);
      }

      const processedResults = await Promise.all(
        response.data.map(async (hotelOffer: any) => {
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
          
              // ✅ Apply markup on the converted BASE price (BEFORE adding conversion fee)
              const markupAmount = (convertedBasePrice * markupPercentage) / 100;
              // ✅ Final price = base + markup + service fee + conversion fee (all added together)
              const finalPrice = convertedBasePrice + markupAmount + serviceFeeAmount + conversionFee;
          
              this.logger.debug(`Price calculation: Base=${convertedBasePrice}, Markup(${markupPercentage}%)=${markupAmount}, ServiceFee=${serviceFeeAmount}, ConvFee=${conversionFee}, Final=${finalPrice}`);
          
              return {
                ...offer,
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
                final_amount: this.currencyService.formatAmount(finalPrice, targetCurrency), // ← ADD THIS
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
      
          return {
            ...hotelOffer,
            hotel: hotelOffer.hotel,
            offers: processedOffers,
            currency: targetCurrency,
          };
        }),
      );

      totalPages = Math.ceil(totalHotels / limit);
      hasMore = page < totalPages;

      // Attach images from cache
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

      const result = {
        data: dataWithImages,
        meta: {
          count: processedResults.length,
          total: totalHotels,
          limit,
          page,
          totalPages,
          hasMore,
          nextPage: hasMore ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
        currency: targetCurrency,
        conversion_note: `Prices converted to ${targetCurrency} with ${markupPercentage}% markup${serviceFeeAmount > 0 ? ` and ${serviceFeeAmount} ${targetCurrency} service fee` : ''}.`,
        cached: false,
        images_enriched: includeImages, 
      };

      // Cache for 5 minutes
      this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      this.logger.error('Error searching Amadeus hotels:', error);
      
      // Handle specific Amadeus errors
      if (error.response?.data?.errors) {
        const amadeusError = error.response.data.errors[0];
        
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

  private async processResults(
    hotelData: any[],
    targetCurrency: string,
    totalHotels: number,
    cached: boolean = false
  ): Promise<any> {
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
        serviceFeeAmount = markupConfig.serviceFeeAmount || 0;
      }
    } catch (error) {
      this.logger.warn(`Could not fetch markup config, using default ${markupPercentage}%:`, error);
    }

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
        
            return {
              ...offer,
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
    
        return {
          ...hotelOffer,
          hotel: hotelOffer.hotel,
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
        total: totalHotels,
        limit: 100,
        page: 1,
        totalPages: 1,
        hasMore: false,
        nextPage: null,
        prevPage: null,
      },
      currency: targetCurrency,
      conversion_note: `Prices converted to ${targetCurrency} with ${markupPercentage}% markup${serviceFeeAmount > 0 ? ` and ${serviceFeeAmount} ${targetCurrency} service fee` : ''}.`,
      cached: cached,
      images_enriched: true,
      all_fetched: true,
    };
  }


  private isValidHotelId(hotelId: string, cityCode?: string): boolean {

    if (!hotelId || hotelId.length !== 8) {
      return false;
    }
    
    const invalidPatterns = ['FGDX', 'XXXX', 'TEST', '0000', '9999'];
    if (invalidPatterns.some(pattern => hotelId.includes(pattern))) {
      return false;
    }
    
    const cityPatterns: Record<string, RegExp> = {
      'DXB': /^(DXB|DHD|CPD|YHD|MKD|ROD|UID|RTD|IMD|HSD|MCD|WVD|OND|TJD)/,
      'LON': /^(HPL|PIL|RTL|CQL|EDL|IAL|AZL|HLL|TIL|DSL|SBL|XKL|RDL|MRL|WHL)/,
      'PAR': /^(ACP|BWP|OIP|HIP|AZP|LXP|CXL|RTP|UIP|MKP|YRP|YYP|XKP|DHP)/,
      'LOS': /^(SIL|FGL|ICL|PRL|HSL|RDL|SUL|OIL|IRL|ONL|BWL)/,
    };
    
    
    if (cityCode && cityPatterns[cityCode]) {
      return cityPatterns[cityCode].test(hotelId);
    }
    
    const hasLetters = /[A-Z]/.test(hotelId);
    const hasNumbers = /\d/.test(hotelId);
    
    return hasLetters && hasNumbers;
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
}
