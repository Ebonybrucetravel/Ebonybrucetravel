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

    // ✅ V3.5.0 REQUIRES hotelIds - no exceptions
    if (!hotelIds || hotelIds.length === 0) {
      throw new BadRequestException(
        'hotelIds are required for Hotel Search API v3.5.0. ' +
        'Please provide Amadeus property codes (8-character hotel IDs). ' +
        'Example: ["WHLON464", "XKLON321"]'
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
      // ✅ Apply pagination to hotel IDs (client-side pagination)
      const totalHotels = hotelIds.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedHotelIds = hotelIds.slice(startIndex, endIndex);

      if (paginatedHotelIds.length === 0) {
        throw new BadRequestException(
          `No hotels found for page ${page}. Please try a different page.`,
        );
      }

      this.logger.log(`Searching ${paginatedHotelIds.length} hotels: ${paginatedHotelIds.join(', ')}`);

      // ✅ Search hotels using hotelIds (v3.5.0 compliant)
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
      let markupPercentage = 2.5; // Default markup
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

      // Process results with currency conversion and markup
      const processedResults = await Promise.all(
        response.data.map(async (hotelOffer: any) => {
          const processedOffers = await Promise.all(
            (hotelOffer.offers || []).map(async (offer: any) => {
              // Get original price from Amadeus
              const originalPriceAmount = parseFloat(offer.price?.total || offer.price?.base || '0');
              const originalCurrency = offer.price?.currency || 'EUR';
              
              this.logger.debug(`Processing offer: ${originalPriceAmount} ${originalCurrency} → ${targetCurrency}`);

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

              // Apply markup percentage
              const markupAmount = (priceAfterConversion * markupPercentage) / 100;
              
              // Apply service fee (flat amount)
              const finalPrice = priceAfterConversion + markupAmount + serviceFeeAmount;

              this.logger.debug(`Price breakdown for ${hotelOffer.hotel?.hotelId}:`, {
                original: `${originalPriceAmount} ${originalCurrency}`,
                converted: `${convertedBasePrice.toFixed(2)} ${targetCurrency}`,
                conversionFee: `${conversionFee.toFixed(2)}`,
                priceAfterConversion: `${priceAfterConversion.toFixed(2)}`,
                markupAmount: `${markupAmount.toFixed(2)} (${markupPercentage}%)`,
                serviceFee: serviceFeeAmount,
                finalPrice: `${finalPrice.toFixed(2)}`
              });

              return {
                ...offer,
                // Original price info
                original_price: originalPriceAmount.toString(),
                original_currency: originalCurrency,
                
                // Converted price (without fees)
                base_price: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                currency: targetCurrency,
                
                // Conversion fees
                conversion_fee: this.currencyService.formatAmount(conversionFee, targetCurrency),
                conversion_fee_percentage: conversionFeePercentage,
                price_after_conversion: this.currencyService.formatAmount(priceAfterConversion, targetCurrency),
                
                // Markup and service fees
                markup_percentage: markupPercentage,
                markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
                service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
                
                // Final price (what customer pays)
                final_price: this.currencyService.formatAmount(finalPrice, targetCurrency),
                
                // Update price object for backward compatibility
                price: {
                  ...offer.price,
                  currency: targetCurrency,
                  base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                  total: this.currencyService.formatAmount(finalPrice, targetCurrency),
                  original_total: originalPriceAmount.toString(),
                  original_currency: originalCurrency,
                  conversion_fee: this.currencyService.formatAmount(conversionFee, targetCurrency),
                  markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
                  service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
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
      };

      // Cache for 5 minutes
      this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      this.logger.error('Error searching Amadeus hotels:', error);
      
      // Handle specific Amadeus error codes
      if (error.response?.data?.errors) {
        const amadeusError = error.response.data.errors[0];
        if (amadeusError.code === '38190' || amadeusError.code === '701') {
          throw new HttpException(
            {
              success: false,
              message: 'Amadeus API authentication failed. Please check your API credentials and ensure Hotel Search API v3.5.0 is enabled for your Enterprise account.',
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
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private generateCacheKey(searchParams: SearchAmadeusHotelsDto): string {
    const {
      hotelIds,
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
    }

    return key;
  }
}
