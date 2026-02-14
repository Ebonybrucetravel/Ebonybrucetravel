import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { SearchCarRentalsDto } from '@presentation/booking/dto/search-car-rentals.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class SearchCarRentalsUseCase {
  private readonly logger = new Logger(SearchCarRentalsUseCase.name);

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly markupRepository: MarkupRepository,
    private readonly cacheService: CacheService,
    private readonly currencyService: CurrencyService,
  ) {}

  async execute(searchParams: SearchCarRentalsDto) {
    const {
      pickupLocationCode,
      dropoffLocationCode,
      pickupDateTime,
      dropoffDateTime,
      passengers = 1,
      vehicleTypes,
      currency,
      targetCurrency,
      limit = 20,
      page = 1,
    } = searchParams;
    const effectiveCurrency = targetCurrency ?? currency ?? 'GBP';

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pickup = new Date(pickupDateTime);
    if (pickup < today) {
      throw new BadRequestException(
        `Pickup date (${pickupDateTime}) cannot be in the past. Please select a future date.`,
      );
    }

    const dropoff = dropoffDateTime ? new Date(dropoffDateTime) : new Date(pickup.getTime() + 24 * 60 * 60 * 1000);
    if (dropoff <= pickup) {
      throw new BadRequestException(
        `Drop-off date (${dropoffDateTime || 'auto'}) must be after pickup date (${pickupDateTime}).`,
      );
    }

    // Check cache
    const cacheKey = `car_rental:${pickupLocationCode}:${dropoffLocationCode || pickupLocationCode}:${pickupDateTime}:${dropoffDateTime || 'auto'}:${passengers}:${effectiveCurrency}`;
    const cached = this.cacheService.get<any>(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      // Search transfers (Amadeus transfer API can be used for car rentals)
      this.logger.log(
        `Searching car rentals: ${pickupLocationCode} -> ${dropoffLocationCode || pickupLocationCode}, ${pickupDateTime} to ${dropoffDateTime || dropoff.toISOString()}, passengers: ${passengers}`,
      );
      
      // Format dates for Amadeus API
      // Amadeus transfer API expects ISO 8601 format with timezone
      // Parse the input dates
      const pickupDate = new Date(pickupDateTime);
      const dropoffDate = dropoffDateTime ? new Date(dropoffDateTime) : dropoff;
      
      // Validate dates are valid
      if (isNaN(pickupDate.getTime())) {
        throw new BadRequestException(`Invalid pickup date format: ${pickupDateTime}`);
      }
      if (isNaN(dropoffDate.getTime())) {
        throw new BadRequestException(`Invalid dropoff date format: ${dropoffDateTime || 'auto'}`);
      }
      
      // Validate minimum rental duration
      // Amadeus typically requires at least 4 hours for transfers/car rentals
      const rentalDurationHours = (dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60);
      const rentalDurationDays = rentalDurationHours / 24;
      
      if (rentalDurationHours < 4) {
        throw new BadRequestException(
          `Rental duration is too short. Minimum rental period is 4 hours. Current duration: ${rentalDurationHours.toFixed(2)} hours. Please set dropoff time at least 4 hours after pickup time.`,
        );
      }
      
      // Warn if duration is very short (less than 1 day) - might not be a real car rental
      if (rentalDurationHours < 24) {
        this.logger.warn(
          `Short rental duration: ${rentalDurationHours.toFixed(2)} hours. This might be better suited for a transfer service rather than a car rental.`,
        );
      }
      
      // Validate dates are not too far in the future
      // Note: Amadeus test environment may have very limited date ranges (often only 1-7 days ahead)
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + 12); // 12 months ahead (production limit)
      
      // For test environment, try dates within 7 days first
      const testEnvMaxDate = new Date();
      testEnvMaxDate.setDate(testEnvMaxDate.getDate() + 7); // 7 days ahead for test
      
      if (pickupDate > maxFutureDate) {
        throw new BadRequestException(
          `Pickup date (${pickupDateTime}) is too far in the future. Amadeus API supports dates up to 12 months ahead.`,
        );
      }
      
      // Warn if date is more than 7 days ahead (test environment limitation)
      if (pickupDate > testEnvMaxDate) {
        this.logger.warn(
          `Pickup date (${pickupDateTime}) is more than 7 days ahead. Amadeus test environment may only support dates within 1-7 days. Try a date closer to today.`,
        );
      }
      
      // Validate dates are not in the past
      const now = new Date();
      if (pickupDate < now) {
        throw new BadRequestException(
          `Pickup date (${pickupDateTime}) cannot be in the past. Current time: ${now.toISOString()}`,
        );
      }
      
      // Format as ISO 8601 without timezone - Amadeus expects: YYYY-MM-DDTHH:mm:ss
      // Preserve the original date/time values (don't convert to UTC)
      // Extract date components from the original string to avoid timezone conversion issues
      const formatAmadeusDateTime = (dateString: string, fallbackDate: Date): string => {
        // Try to extract from original string first to preserve exact values
        const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
        if (isoMatch) {
          // Use the original string values (already in correct format)
          return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}:${isoMatch[6]}`;
        }
        // Fallback: format from Date object (use local time, not UTC)
        const year = fallbackDate.getFullYear();
        const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
        const day = String(fallbackDate.getDate()).padStart(2, '0');
        const hours = String(fallbackDate.getHours()).padStart(2, '0');
        const minutes = String(fallbackDate.getMinutes()).padStart(2, '0');
        const seconds = String(fallbackDate.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
      
      const formattedPickupDateTime = formatAmadeusDateTime(pickupDateTime, pickupDate);
      const formattedDropoffDateTime = dropoffDateTime 
        ? formatAmadeusDateTime(dropoffDateTime, dropoffDate)
        : formatAmadeusDateTime(dropoff.toISOString(), dropoffDate);
      
      this.logger.log(`Formatted dates for Amadeus - Pickup: ${formattedPickupDateTime}, Dropoff: ${formattedDropoffDateTime}`);
      this.logger.log(`Rental duration: ${rentalDurationHours.toFixed(2)} hours`);
      this.logger.log(`Sending to Amadeus: origin=${pickupLocationCode}, destination=${dropoffLocationCode || pickupLocationCode}, departure=${formattedPickupDateTime}, return=${formattedDropoffDateTime}, passengers=${passengers}`);
      
      // Calculate duration for the transfer (ISO8601 format: PTnHnM)
      // For round trips or hourly rentals, Amadeus uses duration instead of returnDateTime
      const calculateDuration = (start: Date, end: Date): string => {
        const diffMs = end.getTime() - start.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `PT${hours}H${minutes > 0 ? `${minutes}M` : ''}`;
      };
      
      const transferDuration = calculateDuration(pickupDate, dropoffDate);
      this.logger.log(`Transfer duration: ${transferDuration}`);
      
      const response = await this.amadeusService.searchTransfers({
        originLocationCode: pickupLocationCode,
        destinationLocationCode: dropoffLocationCode || pickupLocationCode,
        departureDateTime: formattedPickupDateTime,
        returnDateTime: formattedDropoffDateTime, // Not used by API, but kept for reference
        passengers,
        vehicleTypes: vehicleTypes || undefined,
        transferType: 'PRIVATE', // Default to PRIVATE transfer (can be PRIVATE, SHARED, TAXI, HOURLY, etc.)
        duration: transferDuration, // ISO8601 duration format (e.g., PT24H for 24 hours)
        currency: effectiveCurrency,
      });

      this.logger.log(`Amadeus transfer search response: ${JSON.stringify(response)}`);

      // Check if response has errors (like INVALID PICKUP DATE)
      if (response.errors && Array.isArray(response.errors) && response.errors.length > 0) {
        const firstError = response.errors[0];
        this.logger.error(`Amadeus transfer search error: ${JSON.stringify(response.errors, null, 2)}`);
        
        // Handle specific error codes
        if (firstError.code === 32698 && firstError.detail === 'INVALID PICKUP DATE') {
          // Calculate days from today
          const daysFromToday = Math.ceil((pickupDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            data: [],
            meta: {
              count: 0,
              total: 0,
              limit,
              page,
              totalPages: 0,
              hasMore: false,
              nextPage: null,
              prevPage: null,
            },
            currency: effectiveCurrency,
            conversion_note: `Prices include a ${this.currencyService.getConversionBuffer()}% conversion fee to protect against exchange rate fluctuations.`,
            cached: false,
            message: `INVALID PICKUP DATE error from Amadeus. Your pickup date is ${daysFromToday} days from today. The Amadeus test environment typically only supports dates within 1-7 days. Please try a date closer to today (e.g., tomorrow or within the next week).`,
            error: {
              code: firstError.code,
              detail: firstError.detail,
              suggestion: 'Try dates within 1-7 days from today for the test environment',
            },
          };
        }
      }
      
      // Check if response has data
      if (!response || !response.data) {
        this.logger.warn('Amadeus transfer search returned no data. Response:', JSON.stringify(response, null, 2));
        return {
          data: [],
          meta: {
            count: 0,
            total: 0,
            limit,
            page,
            totalPages: 0,
            hasMore: false,
            nextPage: null,
            prevPage: null,
          },
          currency: effectiveCurrency,
          conversion_note: `Prices include a ${this.currencyService.getConversionBuffer()}% conversion fee to protect against exchange rate fluctuations.`,
          cached: false,
          message: 'No car rental offers found. The Amadeus test environment has limited data. Try major airports (JFK, CDG, LHR) with dates within 1-7 days from today.',
        };
      }

      const offers = Array.isArray(response.data) ? response.data : [];
      
      if (offers.length === 0) {
        this.logger.warn(
          `No car rental offers found for ${pickupLocationCode} on ${pickupDateTime}. Full response:`,
          JSON.stringify(response, null, 2),
        );
        this.logger.warn('Possible reasons:');
        this.logger.warn('1. Test environment has limited data - try major airports like JFK, CDG, LHR');
        this.logger.warn('2. Dates too far in the future (try dates within 1-3 months from today)');
        this.logger.warn('3. No transfers available for the selected location/date combination');
        this.logger.warn('4. Location code format might not be recognized (try airport IATA codes)');
      }

      // Process results with currency conversion and markup
      // Follow the same pattern as flights and hotels: always use our own currency converter
      const processedResults = await Promise.all(
        offers.map(async (offer: any) => {
          // Amadeus Transfer API returns prices in quotation (original) and converted (target currency) fields
          // quotation: { monetaryAmount: string, currencyCode: string, base: { monetaryAmount: string }, ... }
          // converted: { monetaryAmount: string, currencyCode: string, base: { monetaryAmount: string }, ... }
          
          // Step 1: Get original price from quotation (Amadeus original currency)
          // Always use our own converter for consistency with flights and hotels
          const quotation = offer.quotation || {};
          const converted = offer.converted || {};
          const originalPrice = parseFloat(quotation.monetaryAmount || '0');
          const originalCurrency = quotation.currencyCode || 'USD';

          // Step 2: Convert prices from Amadeus currency to target currency (pure conversion)
          // This matches the pattern used in search-flights.use-case.ts and search-hotels.use-case.ts
          // Use Amadeus's pre-converted price as fallback if our conversion fails
          let convertedBasePrice = originalPrice;
          if (originalCurrency !== effectiveCurrency && originalPrice > 0) {
            try {
              convertedBasePrice = await this.currencyService.convert(
                originalPrice,
                originalCurrency,
                effectiveCurrency,
              );
              // Check if conversion actually succeeded (currencyService returns original amount on failure)
              // If result equals original and currencies differ, conversion likely failed
              if (convertedBasePrice === originalPrice) {
                throw new Error('Conversion returned original amount, likely failed');
              }
            } catch (error) {
              this.logger.warn(
                `Failed to convert ${originalPrice} ${originalCurrency} to ${effectiveCurrency}, using Amadeus converted price as fallback:`,
                error,
              );
              // Fallback: Use Amadeus's pre-converted price if available and in target currency
              const amadeusConvertedPrice = parseFloat(converted.monetaryAmount || '0');
              const amadeusConvertedCurrency = converted.currencyCode || '';
              if (
                amadeusConvertedPrice > 0 &&
                amadeusConvertedCurrency.toUpperCase() === effectiveCurrency.toUpperCase()
              ) {
                convertedBasePrice = amadeusConvertedPrice;
                this.logger.log(
                  `Using Amadeus converted price: ${amadeusConvertedPrice} ${effectiveCurrency}`,
                );
              } else {
                // Last resort: use original price (not ideal, but better than 0)
                convertedBasePrice = originalPrice;
                this.logger.error(
                  `Could not convert ${originalPrice} ${originalCurrency} to ${effectiveCurrency} and no valid fallback available`,
                );
              }
            }
          }

          // Get markup configuration
          let markupPercentage = 0;
          let serviceFeeAmount = 0;
          try {
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
              ProductType.CAR_RENTAL,
              effectiveCurrency,
            );
            if (markupConfig) {
              markupPercentage = markupConfig.markupPercentage || 0;
              serviceFeeAmount = markupConfig.serviceFeeAmount || 0;
            }
          } catch (error) {
            this.logger.warn(
              `Could not fetch markup config for CAR_RENTAL in ${effectiveCurrency}, using 0%:`,
              error,
            );
          }

          // Step 3: Calculate currency conversion fee (buffer) as separate line item
          // This protects against rate fluctuations and ensures payment success
          // This matches the pattern used in search-flights.use-case.ts and search-hotels.use-case.ts
          const conversionDetails = this.currencyService.calculateConversionFee(
            convertedBasePrice,
            originalCurrency,
            effectiveCurrency,
          );

          // Step 4: Apply markup to price after conversion fee
          // Markup is applied to the amount that includes conversion fee (more professional)
          const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;

          // Step 5: Apply service fee (flat amount)
          const finalPrice = conversionDetails.totalWithFee + markupAmount + serviceFeeAmount;

          return {
            ...offer,
            original_price: originalPrice.toString(),
            original_currency: originalCurrency,
            base_price: this.currencyService.formatAmount(convertedBasePrice, effectiveCurrency),
            currency: effectiveCurrency,
            conversion_fee: this.currencyService.formatAmount(
              conversionDetails.conversionFee,
              effectiveCurrency,
            ),
            conversion_fee_percentage:
              originalCurrency !== effectiveCurrency ? this.currencyService.getConversionBuffer() : 0,
            price_after_conversion: this.currencyService.formatAmount(
              conversionDetails.totalWithFee,
              effectiveCurrency,
            ),
            markup_percentage: markupPercentage,
            markup_amount: this.currencyService.formatAmount(markupAmount, effectiveCurrency),
            service_fee: this.currencyService.formatAmount(serviceFeeAmount, effectiveCurrency),
            final_price: this.currencyService.formatAmount(finalPrice, effectiveCurrency),
            price: {
              currency: effectiveCurrency,
              base: this.currencyService.formatAmount(convertedBasePrice, effectiveCurrency),
              total: this.currencyService.formatAmount(finalPrice, effectiveCurrency),
              original_total: originalPrice.toString(),
              original_currency: originalCurrency,
            },
          };
        }),
      );

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = processedResults.slice(startIndex, endIndex);
      const totalResults = processedResults.length;
      const totalPages = Math.ceil(totalResults / limit);

      // Cache results for 5 minutes
      const result = {
        data: paginatedResults,
        meta: {
          count: paginatedResults.length,
          total: totalResults,
          limit,
          page,
          totalPages,
          hasMore: page < totalPages,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
        currency: effectiveCurrency,
        conversion_note: `Prices include a ${this.currencyService.getConversionBuffer()}% conversion fee to protect against exchange rate fluctuations.`,
        cached: false,
        ...(totalResults === 0 && {
          message: 'No car rental offers found. The Amadeus test environment has limited data. Try: 1) Major airports (JFK, CDG, LHR), 2) Dates within 1-3 months from today, 3) Different location codes.',
        }),
      };

      this.cacheService.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes

      return result;
    } catch (error: any) {
      this.logger.error('Error searching car rentals:', error);
      throw new BadRequestException(
        error?.message || 'Failed to search car rentals. Please check your search parameters.',
      );
    }
  }
}

