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
  ) {}

  async execute(searchParams: SearchAmadeusHotelsDto) {
    const {
      hotelIds,
      cityCode,
      geographicCoordinates,
      radius = 5,
      radiusUnit = 'KM',
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      priceRange,
      currency: targetCurrency = 'GBP',
      paymentPolicy,
      boardType,
      includeClosed,
      bestRateOnly,
      countryOfResidence,
      lang,
      chainCodes,
      amenities,
      ratings,
      hotelSource,
      limit = 20,
      page = 1,
    } = searchParams;

    // Validate that at least one search method is provided
    if (!hotelIds?.length && !cityCode && !geographicCoordinates) {
      throw new BadRequestException(
        'Either hotelIds, cityCode, or geographicCoordinates must be provided',
      );
    }

    // Validate pagination
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (page < 1) {
      throw new BadRequestException('Page must be at least 1');
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
      // Amadeus v3 requires hotelIds (cityCode/geocode are not supported in v3)
      // If cityCode or geographicCoordinates is provided, first get hotel IDs, then search
      let hotelIdsToSearch = hotelIds;
      let allHotelIds: string[] = [];
      let totalHotels = 0;

      // Step 1: Get hotel IDs if needed
      if ((cityCode || geographicCoordinates) && (!hotelIds || hotelIds.length === 0)) {
        let hotelsListResponse: any;

        if (geographicCoordinates) {
          // Use geocode search for map-based search
          hotelsListResponse = await this.amadeusService.getHotelsByGeocode({
            latitude: geographicCoordinates.latitude,
            longitude: geographicCoordinates.longitude,
            radius,
            radiusUnit,
            chainCodes,
            amenities,
            ratings,
            hotelSource,
          });
        } else if (cityCode) {
          // Use city search
          hotelsListResponse = await this.amadeusService.getHotelsByCity({
            cityCode,
            chainCodes,
            amenities,
            ratings,
            radius,
            radiusUnit,
            hotelSource,
          });
        }

        if (!hotelsListResponse || !hotelsListResponse.data || hotelsListResponse.data.length === 0) {
          const locationDesc = geographicCoordinates
            ? `coordinates (${geographicCoordinates.latitude}, ${geographicCoordinates.longitude})`
            : `city code: ${cityCode}`;
          throw new BadRequestException(
            `No hotels found for ${locationDesc}. Please try different search criteria or provide specific hotel IDs.`,
          );
        }

        // Extract hotel IDs from the response
        allHotelIds = hotelsListResponse.data
          .map((hotel: any) => hotel.hotelId)
          .filter((id: string) => id && id.length === 8); // Amadeus hotel IDs are 8 chars

        if (allHotelIds.length === 0) {
          const locationDesc = geographicCoordinates
            ? `coordinates (${geographicCoordinates.latitude}, ${geographicCoordinates.longitude})`
            : `city code: ${cityCode}`;
          throw new BadRequestException(
            `No valid hotel IDs found for ${locationDesc}. Please try different search criteria or provide specific hotel IDs.`,
          );
        }
      } else if (hotelIds && hotelIds.length > 0) {
        allHotelIds = hotelIds;
      }

      // Step 2: Apply pagination to hotel IDs (before searching for offers)
      totalHotels = allHotelIds.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      hotelIdsToSearch = allHotelIds.slice(startIndex, endIndex);

      if (hotelIdsToSearch.length === 0) {
        throw new BadRequestException(
          `No hotels found for page ${page}. Please try a different page.`,
        );
      }

      // Step 3: Search hotels using hotel IDs (paginated subset)
      const response = await this.amadeusService.searchHotels({
        hotelIds: hotelIdsToSearch,
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
      });

      // Amadeus response structure: { data: [{ type: 'hotel-offers', hotel: {...}, offers: [{ price: {...} }] }] }
      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new HttpException(
          'Invalid response from Amadeus API: missing or invalid data array',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Fetch markup once per request (same for all offers) to avoid exhausting DB connections
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
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch markup config for HOTEL in ${targetCurrency}, using 0%:`,
          error,
        );
      }

      // Process results with currency conversion and markup
      const processedResults = await Promise.all(
        response.data.map(async (hotelOffer: any) => {
          // Process each offer within the hotel
          const processedOffers = await Promise.all(
            (hotelOffer.offers || []).map(async (offer: any) => {
              // IMPORTANT: Use original currency/price from Amadeus if available
              // Amadeus may have already converted to requested currency, but we want
              // to use our own exchange rate API for consistency and accuracy
              const originalPrice = offer.price?.original_total 
                ? parseFloat(offer.price.original_total) 
                : parseFloat(offer.price?.total || offer.price?.base || '0');
              const originalCurrency = offer.price?.original_currency 
                ? offer.price.original_currency 
                : (offer.price?.currency || 'USD');

              // Convert currency using our own exchange rate API
              // This ensures we use consistent rates, not Amadeus's rates
              const convertedBasePrice = await this.currencyService.convert(
                originalPrice,
                originalCurrency,
                targetCurrency,
              );

              // Calculate conversion fee and markup
              const conversionDetails = this.currencyService.calculateConversionFee(
                convertedBasePrice,
                originalCurrency,
                targetCurrency,
              );

              // Apply markup percentage to price after conversion fee
              const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
              
              // Apply service fee (flat amount)
              const finalPrice = conversionDetails.totalWithFee + markupAmount + serviceFeeAmount;

              return {
                ...offer,
                original_price: originalPrice.toString(),
                original_currency: originalCurrency,
                base_price: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                currency: targetCurrency,
                conversion_fee: this.currencyService.formatAmount(
                  conversionDetails.conversionFee,
                  targetCurrency,
                ),
                conversion_fee_percentage:
                  originalCurrency !== targetCurrency
                    ? this.currencyService.getConversionBuffer()
                    : 0,
                price_after_conversion: this.currencyService.formatAmount(
                  conversionDetails.totalWithFee,
                  targetCurrency,
                ),
                markup_percentage: markupPercentage,
                markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
                service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
                final_price: this.currencyService.formatAmount(finalPrice, targetCurrency),
                // Update price object with converted values
                price: {
                  ...offer.price,
                  currency: targetCurrency,
                  base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                  total: this.currencyService.formatAmount(finalPrice, targetCurrency),
                  original_total: originalPrice.toString(),
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
      // If we used direct hotelIds, set totalHotels
      if (hotelIds && hotelIds.length > 0 && allHotelIds.length === 0) {
        totalHotels = hotelIds.length;
        allHotelIds = hotelIds;
      }
      const totalPages = Math.ceil(totalHotels / limit);
      const hasMore = page < totalPages;

      // Attach primary image URL from cache when available (no extra API calls)
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
          ...(response.meta || {}),
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
        conversion_note: `Prices include a ${this.currencyService.getConversionBuffer()}% conversion fee to protect against exchange rate fluctuations.`,
        cached: false,
      };

      // Cache for 5 minutes
      this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Error searching Amadeus hotels:', error);
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
      geographicCoordinates,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      currency,
      amenities,
      ratings,
      chainCodes,
      radius,
      radiusUnit,
    } = searchParams;
    
    let key = `amadeus_hotel_search:${checkInDate}-${checkOutDate}-${adults}-${roomQuantity}-${currency}`;
    
    if (hotelIds && hotelIds.length > 0) {
      // Sort hotel IDs for consistent cache key
      key += `:hotels-${[...hotelIds].sort().join(',')}`;
    } else if (geographicCoordinates) {
      key += `:geo-${geographicCoordinates.latitude.toFixed(4)}-${geographicCoordinates.longitude.toFixed(4)}-${radius || 5}-${radiusUnit || 'KM'}`;
    } else if (cityCode) {
      key += `:city-${cityCode}`;
    }

    // Add filter parameters to cache key
    if (amenities && amenities.length > 0) {
      key += `:amenities-${[...amenities].sort().join(',')}`;
    }
    if (ratings && ratings.length > 0) {
      key += `:ratings-${[...ratings].sort().join(',')}`;
    }
    if (chainCodes && chainCodes.length > 0) {
      key += `:chains-${[...chainCodes].sort().join(',')}`;
    }

    return key;
  }
}

