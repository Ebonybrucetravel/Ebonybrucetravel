import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
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
  ) {}

  async execute(searchParams: SearchAmadeusHotelsDto) {
    const {
      hotelIds,
      cityCode,
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
    } = searchParams;

    // Validate that either hotelIds or cityCode is provided
    if (!hotelIds?.length && !cityCode) {
      throw new BadRequestException(
        'Either hotelIds or cityCode must be provided',
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
      // Amadeus v3 requires hotelIds (cityCode is not supported in v3)
      // If cityCode is provided, first get hotel IDs by city, then search
      let hotelIdsToSearch = hotelIds;

      if (cityCode && (!hotelIds || hotelIds.length === 0)) {
        // Step 1: Get hotel IDs by city code
        const hotelsListResponse = await this.amadeusService.getHotelsByCity({
          cityCode,
        });

        if (!hotelsListResponse || !hotelsListResponse.data || hotelsListResponse.data.length === 0) {
          throw new BadRequestException(
            `No hotels found for city code: ${cityCode}. Please try a different city or provide specific hotel IDs.`,
          );
        }

        // Extract hotel IDs from the response
        hotelIdsToSearch = hotelsListResponse.data
          .map((hotel: any) => hotel.hotelId)
          .filter((id: string) => id && id.length === 8); // Amadeus hotel IDs are 8 chars

        if (hotelIdsToSearch.length === 0) {
          throw new BadRequestException(
            `No valid hotel IDs found for city code: ${cityCode}. Please try a different city or provide specific hotel IDs.`,
          );
        }

        // Limit to first 50 hotels to avoid URL length issues
        if (hotelIdsToSearch.length > 50) {
          hotelIdsToSearch = hotelIdsToSearch.slice(0, 50);
        }
      }

      if (!hotelIdsToSearch || hotelIdsToSearch.length === 0) {
        throw new BadRequestException(
          'Either hotelIds or cityCode must be provided. hotelIds is required for Amadeus v3 API.',
        );
      }

      // Step 2: Search hotels using hotel IDs
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

      // Process results with currency conversion and markup
      const processedResults = await Promise.all(
        response.data.map(async (hotelOffer: any) => {
          // Process each offer within the hotel
          const processedOffers = await Promise.all(
            (hotelOffer.offers || []).map(async (offer: any) => {
              // Extract price from Amadeus structure: offer.price.total
              const basePrice = parseFloat(offer.price?.total || offer.price?.base || '0');
              const amadeusCurrency = offer.price?.currency || 'USD';

              // Convert currency
              const convertedBasePrice = await this.currencyService.convert(
                basePrice,
                amadeusCurrency,
                targetCurrency,
              );

              // Get markup configuration
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

              // Calculate conversion fee and markup
              const conversionDetails = this.currencyService.calculateConversionFee(
                convertedBasePrice,
                amadeusCurrency,
                targetCurrency,
              );

              // Apply markup percentage to price after conversion fee
              const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
              
              // Apply service fee (flat amount)
              const finalPrice = conversionDetails.totalWithFee + markupAmount + serviceFeeAmount;

              return {
                ...offer,
                original_price: basePrice.toString(),
                original_currency: amadeusCurrency,
                base_price: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                currency: targetCurrency,
                conversion_fee: this.currencyService.formatAmount(
                  conversionDetails.conversionFee,
                  targetCurrency,
                ),
                conversion_fee_percentage:
                  amadeusCurrency !== targetCurrency
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
                  original_total: offer.price.total,
                  original_currency: amadeusCurrency,
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

      const result = {
        data: processedResults,
        meta: response.meta || {},
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
    const { hotelIds, cityCode, checkInDate, checkOutDate, adults, roomQuantity, currency } = searchParams;
    let key = `amadeus_hotel_search:${checkInDate}-${checkOutDate}-${adults}-${roomQuantity}-${currency}`;
    if (hotelIds && hotelIds.length > 0) {
      key += `:hotels-${hotelIds.join(',')}`;
    } else if (cityCode) {
      key += `:city-${cityCode}`;
    }
    return key;
  }
}

