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

  // Predefined hotel IDs for major cities (workaround until you get Hotel List API access)
  private readonly CITY_HOTEL_MAP: Record<string, string[]> = {
    'LON': ['WHLON464', 'XKLON321', 'WHLON462', 'WHLON463'],
    'LOS': ['WHLOS001', 'WHLOS002', 'WHLOS003'],
    'PAR': ['WHPAR001', 'WHPAR002'],
    'NYC': ['WHNYC001', 'WHNYC002', 'WHNYC003'],
    'DXB': ['WHDXB001', 'WHDXB002'],
    // Add more cities as needed
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
      bestRateOnly = true,
      countryOfResidence,
      lang,
      limit = 20,
      page = 1,
    } = searchParams;

    // Validate search parameters for V3 API
    if (!hotelIds?.length && !cityCode && !geographicCoordinates) {
      throw new BadRequestException(
        'Either hotelIds, cityCode, or geographicCoordinates must be provided',
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

    // Check cache first
    const cacheKey = this.generateCacheKey(searchParams);
    const cached = this.cacheService.get<any>(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      // Get hotel IDs to search
      let hotelIdsToSearch = hotelIds;

      // If no hotelIds provided but cityCode is given, use predefined mapping
      if ((!hotelIdsToSearch || hotelIdsToSearch.length === 0) && cityCode) {
        hotelIdsToSearch = this.CITY_HOTEL_MAP[cityCode.toUpperCase()];
        
        if (!hotelIdsToSearch || hotelIdsToSearch.length === 0) {
          throw new BadRequestException(
            `No predefined hotels for city code: ${cityCode}. Please provide hotelIds directly.`
          );
        }
        
        this.logger.log(`Using predefined hotel IDs for ${cityCode}: ${hotelIdsToSearch.join(', ')}`);
      }

      // If still no hotelIds, throw error
      if (!hotelIdsToSearch || hotelIdsToSearch.length === 0) {
        throw new BadRequestException(
          'Hotel IDs are required for V3 Enterprise API. Please provide hotelIds parameter.'
        );
      }

      // ✅ Apply pagination to hotel IDs (client-side pagination)
      let allHotelIds = hotelIdsToSearch;
      const totalHotels = allHotelIds.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedHotelIds = allHotelIds.slice(startIndex, endIndex);

      if (paginatedHotelIds.length === 0) {
        throw new BadRequestException(
          `No hotels found for page ${page}. Please try a different page.`,
        );
      }

      // ✅ Search hotels using paginated hotel IDs (NO pagination params sent to Amadeus)
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
        // ❌ REMOVED: 'page[offset]' and 'page[limit]' parameters
      });

      // Validate response
      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new HttpException(
          'Invalid response from Amadeus API: missing or invalid data array',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Fetch markup configuration
      let markupPercentage = 0;
      let serviceFeeAmount = 0;
      try {
        const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
          ProductType.HOTEL,
          targetCurrency,
        );
        if (markupConfig) {
          markupPercentage = markupConfig.markupPercentage || 0;
          serviceFeeAmount = markupConfig.serviceFeeAmount || 0;
        } else {
          // Default markup if no config found
          markupPercentage = 2.5;
          serviceFeeAmount = 0;
          this.logger.warn(`No markup config found, using default ${markupPercentage}%`);
        }
      } catch (error) {
        this.logger.warn(`Could not fetch markup config, using defaults:`, error);
        markupPercentage = 2.5;
        serviceFeeAmount = 0;
      }

      // Process results with currency conversion and markup
      const processedResults = await Promise.all(
        response.data.map(async (hotelOffer: any) => {
          const processedOffers = await Promise.all(
            (hotelOffer.offers || []).map(async (offer: any) => {
              // Get original price from Amadeus
              const originalPriceAmount = parseFloat(offer.price?.total || offer.price?.base || '0');
              const originalCurrency = offer.price?.currency || 'EUR';
              
              this.logger.debug(`Processing offer: original ${originalPriceAmount} ${originalCurrency}`);

              // Convert currency if needed
              let convertedBasePrice: number;
              let conversionFee: number;
              let conversionFeePercentage: number;
              let priceAfterConversion: number;

              if (originalCurrency !== targetCurrency) {
                convertedBasePrice = await this.currencyService.convert(
                  originalPriceAmount,
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
                priceAfterConversion = conversionDetails.totalWithFee;
              } else {
                convertedBasePrice = originalPriceAmount;
                conversionFee = 0;
                conversionFeePercentage = 0;
                priceAfterConversion = originalPriceAmount;
              }

              // Apply markup
              const markupAmount = (priceAfterConversion * markupPercentage) / 100;
              const finalPrice = priceAfterConversion + markupAmount + serviceFeeAmount;

              return {
                ...offer,
                original_price: originalPriceAmount.toString(),
                original_currency: originalCurrency,
                base_price: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                currency: targetCurrency,
                conversion_fee: this.currencyService.formatAmount(conversionFee, targetCurrency),
                conversion_fee_percentage: conversionFeePercentage,
                price_after_conversion: this.currencyService.formatAmount(priceAfterConversion, targetCurrency),
                markup_percentage: markupPercentage,
                markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
                service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
                final_price: this.currencyService.formatAmount(finalPrice, targetCurrency),
                price: {
                  ...offer.price,
                  currency: targetCurrency,
                  base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                  total: this.currencyService.formatAmount(finalPrice, targetCurrency),
                  original_total: originalPriceAmount.toString(),
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

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalHotels / limit);
      const hasMore = page < totalPages;

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
        conversion_note: `Prices include ${markupPercentage}% markup and conversion fees.`,
        cached: false,
      };

      // Cache for 5 minutes
      this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      this.logger.error('Error searching Amadeus hotels:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Unable to search hotels at this time. Please check your search parameters and try again.',
          error: 'Search failed',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateCacheKey(searchParams: SearchAmadeusHotelsDto): string {
    const {
      hotelIds,
      cityCode,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      currency,
      page,
      limit,
    } = searchParams;

    let key = `amadeus_hotel_search_v3:${checkInDate}-${checkOutDate}-${adults}-${roomQuantity}-${currency}-p${page}-l${limit}`;

    if (hotelIds && hotelIds.length > 0) {
      key += `:hotels-${[...hotelIds].sort().join(',')}`;
    } else if (cityCode) {
      key += `:city-${cityCode}`;
    }

    return key;
  }
}
