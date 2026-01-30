import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { SearchHotelsDto } from '@presentation/booking/dto/search-hotels.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class SearchHotelsUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly markupRepository: MarkupRepository,
    private readonly cacheService: CacheService,
    private readonly currencyService: CurrencyService,
  ) {}

  async execute(searchParams: SearchHotelsDto) {
    const {
      location,
      accommodation,
      check_in_date,
      check_out_date,
      rooms,
      guests,
      free_cancellation_only,
      mobile,
      negotiated_rate_ids,
      currency: targetCurrency = 'GBP',
    } = searchParams;

    // Validate that either location or accommodation is provided
    if (!location && !accommodation) {
      throw new Error('Either location or accommodation must be provided');
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(searchParams);
    const cached = this.cacheService.get<any>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Prepare search parameters for Duffel API
      const searchRequest: any = {
        check_in_date,
        check_out_date,
        rooms,
        guests: guests.map((g) => ({
          type: g.type,
          ...(g.age !== undefined && { age: g.age }),
        })),
        ...(free_cancellation_only !== undefined && { free_cancellation_only }),
        ...(mobile !== undefined && { mobile }),
        ...(negotiated_rate_ids && negotiated_rate_ids.length > 0 && { negotiated_rate_ids }),
      };

      // Add location or accommodation
      if (location) {
        searchRequest.location = {
          geographic_coordinates: location.geographic_coordinates,
          ...(location.radius && { radius: location.radius }),
        };
      } else if (accommodation) {
        searchRequest.accommodation = {
          ids: accommodation.ids,
          ...(accommodation.fetch_rates !== undefined && { fetch_rates: accommodation.fetch_rates }),
        };
      }

      // Call Duffel API
      const response = await this.duffelService.searchHotels(searchRequest);

      if (!response || !response.data || !response.data.results) {
        throw new Error('Invalid response from Duffel API: missing results');
      }

      // Process search results with currency conversion and markup
      const processedResults = await Promise.all(
        response.data.results.map(async (result: any) => {
          // Process cheapest rate amounts
          const cheapestRateTotal = result.cheapest_rate_total_amount
            ? parseFloat(result.cheapest_rate_total_amount)
            : 0;
          const cheapestRateCurrency = result.cheapest_rate_currency || 'GBP';

          // Convert cheapest rate to target currency
          let convertedCheapestTotal = cheapestRateTotal;
          let conversionFee = 0;
          if (cheapestRateCurrency !== targetCurrency && cheapestRateTotal > 0) {
            convertedCheapestTotal = await this.currencyService.convert(
              cheapestRateTotal,
              cheapestRateCurrency,
              targetCurrency,
            );
            const conversionDetails = this.currencyService.calculateConversionFee(
              convertedCheapestTotal,
              cheapestRateCurrency,
              targetCurrency,
            );
            convertedCheapestTotal = conversionDetails.totalWithFee;
            conversionFee = conversionDetails.conversionFee;
          }

          // Get markup configuration
          let markupPercentage = 0;
          try {
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
              ProductType.HOTEL,
              targetCurrency,
            );
            markupPercentage = markupConfig?.markupPercentage || 0;
          } catch (error) {
            console.warn(`Could not fetch markup config for HOTEL in ${targetCurrency}, using 0%:`, error);
          }

          // Apply markup
          const markupAmount = (convertedCheapestTotal * markupPercentage) / 100;
          const finalPrice = convertedCheapestTotal + markupAmount;

          // Process accommodation rooms and rates if available
          let processedRooms = [];
          if (result.accommodation?.rooms) {
            processedRooms = await Promise.all(
              result.accommodation.rooms.map(async (room: any) => {
                if (!room.rates || room.rates.length === 0) {
                  return room;
                }

                // Process each rate
                const processedRates = await Promise.all(
                  room.rates.map(async (rate: any) => {
                    const rateTotal = parseFloat(rate.total_amount);
                    const rateCurrency = rate.total_currency || 'GBP';

                    // Convert rate to target currency
                    let convertedRateTotal = rateTotal;
                    let rateConversionFee = 0;
                    if (rateCurrency !== targetCurrency && rateTotal > 0) {
                      convertedRateTotal = await this.currencyService.convert(
                        rateTotal,
                        rateCurrency,
                        targetCurrency,
                      );
                      const rateConversionDetails = this.currencyService.calculateConversionFee(
                        convertedRateTotal,
                        rateCurrency,
                        targetCurrency,
                      );
                      convertedRateTotal = rateConversionDetails.totalWithFee;
                      rateConversionFee = rateConversionDetails.conversionFee;
                    }

                    // Apply markup to rate
                    const rateMarkupAmount = (convertedRateTotal * markupPercentage) / 100;
                    const rateFinalPrice = convertedRateTotal + rateMarkupAmount;

                    return {
                      ...rate,
                      // Original amounts
                      original_total_amount: rate.total_amount,
                      original_total_currency: rateCurrency,
                      // Converted amounts
                      total_amount: this.currencyService.formatAmount(convertedRateTotal, targetCurrency),
                      total_currency: targetCurrency,
                      conversion_fee: this.currencyService.formatAmount(rateConversionFee, targetCurrency),
                      conversion_fee_percentage:
                        rateCurrency !== targetCurrency ? this.currencyService.getConversionBuffer() : 0,
                      // Markup
                      markup_percentage: markupPercentage,
                      markup_amount: this.currencyService.formatAmount(rateMarkupAmount, targetCurrency),
                      final_amount: this.currencyService.formatAmount(rateFinalPrice, targetCurrency),
                    };
                  }),
                );

                return {
                  ...room,
                  rates: processedRates,
                };
              }),
            );
          }

          return {
            ...result,
            // Cheapest rate with conversion and markup
            cheapest_rate_total_amount: this.currencyService.formatAmount(convertedCheapestTotal, targetCurrency),
            cheapest_rate_currency: targetCurrency,
            conversion_fee: this.currencyService.formatAmount(conversionFee, targetCurrency),
            conversion_fee_percentage:
              cheapestRateCurrency !== targetCurrency ? this.currencyService.getConversionBuffer() : 0,
            markup_percentage: markupPercentage,
            markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
            final_amount: this.currencyService.formatAmount(finalPrice, targetCurrency),
            // Processed accommodation with rooms
            accommodation: result.accommodation
              ? {
                  ...result.accommodation,
                  rooms: processedRooms,
                }
              : result.accommodation,
          };
        }),
      );

      const result = {
        search_id: response.data.id || null,
        created_at: response.data.created_at,
        results: processedResults,
      };

      // Cache for 5 minutes (hotel search results expire quickly)
      this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Error searching hotels:', error);
      throw error;
    }
  }

  private generateCacheKey(searchParams: SearchHotelsDto): string {
    const {
      location,
      accommodation,
      check_in_date,
      check_out_date,
      rooms,
      guests,
      free_cancellation_only,
      mobile,
      currency,
    } = searchParams;

    const locationKey = location
      ? `${location.geographic_coordinates.latitude},${location.geographic_coordinates.longitude},${location.radius || 5}`
      : '';
    const accommodationKey = accommodation ? accommodation.ids.join(',') : '';
    const guestsKey = guests.map((g) => `${g.type}${g.age || ''}`).join(',');

    return `hotel_search:${locationKey || accommodationKey}:${check_in_date}:${check_out_date}:${rooms}:${guestsKey}:${free_cancellation_only || false}:${mobile || false}:${currency || 'GBP'}`;
  }
}

