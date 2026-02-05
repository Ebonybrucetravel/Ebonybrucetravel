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
      currency: targetCurrency = 'GBP',
      limit = 20,
      page = 1,
    } = searchParams;

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
    const cacheKey = `car_rental:${pickupLocationCode}:${dropoffLocationCode || pickupLocationCode}:${pickupDateTime}:${dropoffDateTime || 'auto'}:${passengers}:${targetCurrency}`;
    const cached = this.cacheService.get<any>(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      // Search transfers (Amadeus transfer API can be used for car rentals)
      const response = await this.amadeusService.searchTransfers({
        originLocationCode: pickupLocationCode,
        destinationLocationCode: dropoffLocationCode || pickupLocationCode,
        departureDateTime: pickupDateTime,
        returnDateTime: dropoffDateTime || dropoff.toISOString(),
        passengers,
        vehicleTypes: vehicleTypes || undefined,
      });

      // Process results with currency conversion and markup
      const processedResults = await Promise.all(
        (response.data || []).map(async (offer: any) => {
          const basePrice = parseFloat(offer.price?.total || offer.price?.base || '0');
          const amadeusCurrency = offer.price?.currency || 'USD';

          // Use original price if available, otherwise use converted price
          const originalPrice = offer.price?.original_total
            ? parseFloat(offer.price.original_total)
            : basePrice;
          const originalCurrency = offer.price?.original_currency || amadeusCurrency;

          // Convert currency using our exchange rate API
          const convertedBasePrice = await this.currencyService.convert(
            originalPrice,
            originalCurrency,
            targetCurrency,
          );

          // Get markup configuration
          let markupPercentage = 0;
          let serviceFeeAmount = 0;
          try {
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
              ProductType.CAR_RENTAL,
              targetCurrency,
            );
            if (markupConfig) {
              markupPercentage = markupConfig.markupPercentage || 0;
              serviceFeeAmount = markupConfig.serviceFeeAmount || 0;
            }
          } catch (error) {
            this.logger.warn(
              `Could not fetch markup config for CAR_RENTAL in ${targetCurrency}, using 0%:`,
              error,
            );
          }

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
              originalCurrency !== targetCurrency ? this.currencyService.getConversionBuffer() : 0,
            price_after_conversion: this.currencyService.formatAmount(
              conversionDetails.totalWithFee,
              targetCurrency,
            ),
            markup_percentage: markupPercentage,
            markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
            service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
            final_price: this.currencyService.formatAmount(finalPrice, targetCurrency),
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
        currency: targetCurrency,
        conversion_note: `Prices include a ${this.currencyService.getConversionBuffer()}% conversion fee to protect against exchange rate fluctuations.`,
        cached: false,
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

