import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { ProductType } from '@prisma/client';

@Injectable()
export class FetchHotelRatesUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly markupRepository: MarkupRepository,
    private readonly currencyService: CurrencyService,
  ) {}

  async execute(searchResultId: string, targetCurrency: string = 'GBP') {
    try {
      // Fetch rates from Duffel
      const response = await this.duffelService.fetchHotelRates(searchResultId);

      if (!response || !response.data) {
        throw new Error('Invalid response from Duffel API: missing data');
      }

      const searchResult = response.data;

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

      // Process accommodation rooms and rates with currency conversion and markup
      if (searchResult.accommodation?.rooms) {
        const processedRooms = await Promise.all(
          searchResult.accommodation.rooms.map(async (room: any) => {
            if (!room.rates || room.rates.length === 0) {
              return room;
            }

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

                // Apply markup
                const rateMarkupAmount = (convertedRateTotal * markupPercentage) / 100;
                const rateFinalPrice = convertedRateTotal + rateMarkupAmount;

                return {
                  ...rate,
                  original_total_amount: rate.total_amount,
                  original_total_currency: rateCurrency,
                  total_amount: this.currencyService.formatAmount(convertedRateTotal, targetCurrency),
                  total_currency: targetCurrency,
                  conversion_fee: this.currencyService.formatAmount(rateConversionFee, targetCurrency),
                  conversion_fee_percentage:
                    rateCurrency !== targetCurrency ? this.currencyService.getConversionBuffer() : 0,
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

        return {
          ...searchResult,
          accommodation: {
            ...searchResult.accommodation,
            rooms: processedRooms,
          },
        };
      }

      return searchResult;
    } catch (error) {
      console.error('Error fetching hotel rates:', error);
      throw error;
    }
  }
}

