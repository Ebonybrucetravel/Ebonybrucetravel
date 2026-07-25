import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { SearchCarRentalsDto, VehicleCategory, VehicleCode, TransferType } from '@presentation/booking/dto/search-car-rentals.dto';
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
      startLocationCode,
      endLocationCode,
      startDateTime,
      transferType = TransferType.PRIVATE,
      passengers = 1,
      duration,
      currency,
      vehicleCategory,
      vehicleCode,
      providerCodes,
      baggages = 0,
      discountNumbers,
      limit = 20,
      page = 1,
    } = searchParams;
    
    const effectiveCurrency = currency ?? 'GBP';

    // Validate dates
    const pickupDate = new Date(startDateTime);
    if (isNaN(pickupDate.getTime())) {
      throw new BadRequestException(`Invalid pickup date format: ${startDateTime}`);
    }
    
    this.validateDate(pickupDate);

    // Generate cache key
    const cacheKey = this.generateCacheKey({
      startLocationCode,
      endLocationCode,
      startDateTime: pickupDate.toISOString(),
      passengers,
      effectiveCurrency,
      transferType,
      vehicleCategory,
      vehicleCode,
    });
    
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const formattedStartDateTime = this.formatAmadeusDateTime(pickupDate);

      this.logger.log(`Searching transfers: ${startLocationCode} -> ${endLocationCode || startLocationCode}`);
      this.logger.log(`Start: ${formattedStartDateTime}, Type: ${transferType}, Passengers: ${passengers}`);

      const transferRequest = this.buildTransferRequest({
        startLocationCode,
        endLocationCode: endLocationCode || startLocationCode,
        startDateTime: formattedStartDateTime,
        transferType,
        passengers,
        effectiveCurrency,
        duration,
        vehicleCategory,
        vehicleCode,
        providerCodes,
        baggages,
        discountNumbers,
      });

      const response = await this.amadeusService.searchTransfers(transferRequest);

      if (this.hasErrors(response)) {
        return this.handleApiErrors(response, pickupDate, effectiveCurrency, limit, page);
      }

      return await this.processSuccessfulResponse({
        response,
        effectiveCurrency,
        limit,
        page,
        cacheKey,
      });

    } catch (error: any) {
      this.logger.error('Error searching transfers:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(
        error?.message || 'Failed to search transfers. Please check your search parameters.',
      );
    }
  }

  private validateDate(pickupDate: Date) {
    const now = new Date();
    
    if (pickupDate < now) {
      throw new BadRequestException(`Pickup date cannot be in the past.`);
    }

    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 12);
    if (pickupDate > maxDate) {
      throw new BadRequestException(
        `Pickup date is too far in the future. Maximum allowed is 12 months from today.`,
      );
    }

    const testMaxDate = new Date();
    testMaxDate.setDate(testMaxDate.getDate() + 7);
    if (pickupDate > testMaxDate) {
      this.logger.warn(
        `Pickup date is more than 7 days ahead. Amadeus test environment may only support dates within 1-7 days.`,
      );
    }
  }

  private buildTransferRequest(params: {
    startLocationCode: string;
    endLocationCode: string;
    startDateTime: string;
    transferType: TransferType;
    passengers: number;
    effectiveCurrency: string;
    duration?: string;
    vehicleCategory?: VehicleCategory;
    vehicleCode?: VehicleCode;
    providerCodes?: string;
    baggages?: number;
    discountNumbers?: string;
  }) {
    const request: any = {
      startLocationCode: params.startLocationCode,
      endLocationCode: params.endLocationCode,
      startDateTime: params.startDateTime,
      passengers: params.passengers,
      transferType: params.transferType,
      currency: params.effectiveCurrency,
    };

    if (params.duration) {
      request.duration = params.duration;
    }

    // ✅ Directly use VehicleCategory enum values (ST, BU, FC)
    if (params.vehicleCategory) {
      request.vehicleCategory = params.vehicleCategory;
    }

    // ✅ Directly use VehicleCode enum values
    if (params.vehicleCode) {
      request.vehicleCode = params.vehicleCode;
    }

    if (params.providerCodes) {
      request.providerCodes = params.providerCodes;
    }

    if (params.baggages !== undefined && params.baggages > 0) {
      request.baggages = params.baggages;
    }

    if (params.discountNumbers) {
      request.discountNumbers = params.discountNumbers;
    }

    this.logger.log(`Amadeus transfer request: ${JSON.stringify(request)}`);

    return request;
  }

  private formatAmadeusDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  private generateCacheKey(params: any): string {
    const { startLocationCode, endLocationCode, startDateTime, passengers, effectiveCurrency, transferType, vehicleCategory, vehicleCode } = params;
    return `transfer:${startLocationCode}:${endLocationCode || startLocationCode}:${startDateTime}:${passengers}:${effectiveCurrency}:${transferType}:${vehicleCategory || 'all'}:${vehicleCode || 'all'}`;
  }

  private hasErrors(response: any): boolean {
    return !!(response?.errors && Array.isArray(response.errors) && response.errors.length > 0);
  }

  private handleApiErrors(response: any, pickupDate: Date, currency: string, limit: number, page: number) {
    const firstError = response.errors[0];
    this.logger.error(`Amadeus API error: ${JSON.stringify(response.errors)}`);

    const errorMap: Record<string, { message: string; suggestion: string }> = {
      '4926': { 
        message: 'Invalid data received', 
        suggestion: 'Check your request parameters format' 
      },
      '1876': { 
        message: 'Invalid IATA code', 
        suggestion: 'Use valid IATA airport codes (e.g., JFK, CDG, LHR)' 
      },
      '3337': { 
        message: 'Invalid date/time', 
        suggestion: 'Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)' 
      },
      '2323': { 
        message: 'Service type missing', 
        suggestion: 'Specify transferType (PRIVATE, SHARED, TAXI, HOURLY, etc.)' 
      },
      '530': {
        message: 'Invalid vehicle type',
        suggestion: 'Use valid vehicle categories: ST, BU, FC or vehicle codes: CAR, VAN, SUV, etc.'
      },
      '8269': {
        message: 'No transfers available',
        suggestion: 'Try different dates or locations'
      },
      '34499': {
        message: 'Duration is mandatory',
        suggestion: 'Provide duration for HOURLY transfer type'
      },
      '32800': {
        message: 'Missing pickup location information',
        suggestion: 'Provide startLocationCode or address details'
      },
      '32803': {
        message: 'Missing drop-off location information',
        suggestion: 'Provide endLocationCode or address details'
      },
      '33891': {
        message: 'Pickup date/time required',
        suggestion: 'Provide startDateTime in ISO 8601 format'
      },
    };

    const errorInfo = errorMap[String(firstError.code)] || { 
      message: firstError.detail || 'Unknown error', 
      suggestion: 'Check Amadeus API documentation for more details' 
    };

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
      currency,
      conversion_note: `Prices include a conversion fee to protect against exchange rate fluctuations.`,
      cached: false,
      message: `Amadeus API error: ${errorInfo.message}`,
      error: {
        code: firstError.code,
        detail: firstError.detail,
        suggestion: errorInfo.suggestion,
        pickup_date_days_from_today: daysFromToday,
      },
    };
  }

  private async processSuccessfulResponse(params: {
    response: any;
    effectiveCurrency: string;
    limit: number;
    page: number;
    cacheKey: string;
  }) {
    const { response, effectiveCurrency, limit, page, cacheKey } = params;

    const offers = Array.isArray(response.data) ? response.data : [];
    
    if (offers.length === 0) {
      this.logger.warn('No transfer offers found');
      return this.createEmptyResponse(effectiveCurrency, limit, page);
    }

    const processedResults = await this.processOffers(offers, effectiveCurrency);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = processedResults.slice(startIndex, endIndex);
    const totalResults = processedResults.length;
    const totalPages = Math.ceil(totalResults / limit);

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
      conversion_note: `Prices include a conversion fee to protect against exchange rate fluctuations.`,
      cached: false,
    };

    this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }

  private async processOffers(offers: any[], targetCurrency: string) {
    return await Promise.all(
      offers.map(async (offer: any) => {
        try {
          const quotation = offer.quotation || {};
          const originalPrice = parseFloat(quotation.monetaryAmount || '0');
          const originalCurrency = quotation.currencyCode || 'USD';

          if (originalPrice <= 0) {
            return offer;
          }

          let convertedBasePrice = originalPrice;
          if (originalCurrency !== targetCurrency) {
            try {
              convertedBasePrice = await this.currencyService.convert(
                originalPrice,
                originalCurrency,
                targetCurrency,
              );
            } catch (error) {
              this.logger.warn(
                `Failed to convert ${originalPrice} ${originalCurrency} to ${targetCurrency}, using fallback`,
                error,
              );
              const converted = offer.converted || {};
              const amadeusConvertedPrice = parseFloat(converted.monetaryAmount || '0');
              if (amadeusConvertedPrice > 0 && converted.currencyCode === targetCurrency) {
                convertedBasePrice = amadeusConvertedPrice;
              }
            }
          }

          const markupResult = await this.calculateMarkup(convertedBasePrice, targetCurrency);

          return {
            ...offer,
            original_price: originalPrice.toString(),
            original_currency: originalCurrency,
            base_price: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
            currency: targetCurrency,
            price: {
              currency: targetCurrency,
              base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
              total: markupResult.final_price,
              original_total: originalPrice.toString(),
              original_currency: originalCurrency,
            },
            ...markupResult,
          };
        } catch (error) {
          this.logger.error('Error processing offer:', error);
          return offer;
        }
      }),
    );
  }

  private async calculateMarkup(basePrice: number, currency: string) {
    let markupPercentage = 0;
    let serviceFeeAmount = 0;

    try {
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        ProductType.CAR_RENTAL,
        currency,
      );
      if (markupConfig) {
        markupPercentage = markupConfig.markupPercentage || 0;
        serviceFeeAmount = markupConfig.serviceFeeAmount || 0;
      }
    } catch (error) {
      this.logger.warn(`Could not fetch markup config for CAR_RENTAL in ${currency}`, error);
    }

    const markupAmount = (basePrice * markupPercentage) / 100;
    const finalPrice = basePrice + markupAmount + serviceFeeAmount;

    return {
      markup_percentage: markupPercentage,
      markup_amount: this.currencyService.formatAmount(markupAmount, currency),
      service_fee: this.currencyService.formatAmount(serviceFeeAmount, currency),
      final_price: this.currencyService.formatAmount(finalPrice, currency), 
    };
  }

  private createEmptyResponse(currency: string, limit: number, page: number) {
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
      currency,
      conversion_note: `Prices include a conversion fee to protect against exchange rate fluctuations.`,
      cached: false,
      message: 'No transfer offers found. The Amadeus test environment has limited data. Try major airports (JFK, CDG, LHR) with dates within 1-7 days from today.',
    };
  }
}