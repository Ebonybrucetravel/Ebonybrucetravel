import { Injectable, Logger } from '@nestjs/common';
import { WakanowService, WakanowSearchRequest, WakanowSearchResult } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { ProductType } from '@prisma/client';
import { SearchWakanowFlightsDto } from '@presentation/booking/dto/wakanow-flights.dto';

@Injectable()
export class SearchWakanowFlightsUseCase {
  private readonly logger = new Logger(SearchWakanowFlightsUseCase.name);
  
  // ✅ Cache markup configs to avoid DB queries per offer
  private markupConfigCache: Map<string, { markupPercentage: number; serviceFeeAmount: number }> = new Map();

  constructor(
    private readonly wakanowService: WakanowService,
    private readonly markupRepository: MarkupRepository,
    private readonly cacheService: CacheService,
    private readonly currencyService: CurrencyService,
  ) {}

  async execute(searchParams: SearchWakanowFlightsDto) {
    const {
      flightSearchType,
      adults,
      children = 0,
      infants = 0,
      ticketClass = 'Y',
      targetCurrency = 'NGN',
      itineraries,
      currency = 'GBP',
    } = searchParams;

    const isDomestic = this.isNigerianRoute(itineraries);
    const displayCurrency = currency.toUpperCase();

    // ✅ Build request
    const wakanowRequest: WakanowSearchRequest = {
      FlightSearchType: flightSearchType,
      Ticketclass: ticketClass,
      Adults: adults,
      Children: children,
      Infants: infants,
      TargetCurrency: targetCurrency,
      Itineraries: itineraries.map((it) => ({
        Departure: it.Departure.toUpperCase(),
        Destination: it.Destination.toUpperCase(),
        DepartureDate: it.DepartureDate,
      })),
    };

    // ✅ Check cache
    const cacheKey = `wakanow:search:${JSON.stringify(wakanowRequest)}`;
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) {
      this.logger.log('Returning cached Wakanow search results');
      return cached;
    }

    // ✅ Fetch from Wakanow
    const results = await this.wakanowService.searchFlights(wakanowRequest);
    
    if (results.length === 0) {
      return {
        provider: 'WAKANOW',
        offers: [],
        total_offers: 0,
        message: 'No flights found for the selected route and dates',
      };
    }

    // ✅ Get markup config ONCE (not per offer)
    const productType = isDomestic ? ProductType.FLIGHT_DOMESTIC : ProductType.FLIGHT_INTERNATIONAL;
    const markupConfig = await this.getMarkupConfig(productType, displayCurrency);
    const { markupPercentage, serviceFeeAmount } = markupConfig;

    // ✅ Pre-fetch conversion rate once (not per offer)
    let conversionRate = 1;
    let conversionFee = 0;
    let totalWithFee = 0;
    let baseCurrency = 'NGN';

    // Get the currency from the first result
    if (results.length > 0 && results[0]?.FlightCombination?.Price?.CurrencyCode) {
      baseCurrency = results[0].FlightCombination.Price.CurrencyCode;
      
      if (baseCurrency !== displayCurrency) {
        const conversionResult = await this.currencyService.convert(1, baseCurrency, displayCurrency);
        conversionRate = conversionResult;
        const conversionDetails = this.currencyService.calculateConversionFee(1, baseCurrency, displayCurrency);
        conversionFee = conversionDetails.conversionFee;
        totalWithFee = conversionDetails.totalWithFee;
      } else {
        conversionRate = 1;
        conversionFee = 0;
        totalWithFee = 1;
      }
    }

    this.logger.log(`💰 Using conversion rate: ${conversionRate}, fee: ${conversionFee}`);

    // ✅ Normalize all offers in parallel with limited concurrency
    const normalizedOffers = await this.normalizeOffersBatch(
      results,
      isDomestic,
      displayCurrency,
      markupPercentage,
      serviceFeeAmount,
      conversionRate,
      conversionFee,
      totalWithFee,
      baseCurrency,
    );

    const response = {
      provider: 'WAKANOW',
      offers: normalizedOffers,
      total_offers: normalizedOffers.length,
    };

    // ✅ Cache for 5 minutes
    this.cacheService.set(cacheKey, response, 5 * 60 * 1000);
    
    return response;
  }

  /**
   * ✅ Get markup config with caching
   */
  private async getMarkupConfig(productType: ProductType, currency: string) {
    const cacheKey = `markup:${productType}:${currency}`;
    
    if (this.markupConfigCache.has(cacheKey)) {
      return this.markupConfigCache.get(cacheKey)!;
    }

    try {
      const config = await this.markupRepository.findActiveMarkupByProductType(productType, currency);
      const result = {
        markupPercentage: config?.markupPercentage || 0,
        serviceFeeAmount: config?.serviceFeeAmount || 0,
      };
      this.markupConfigCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.warn(`Could not fetch markup config for ${currency}, using 0%`);
      return { markupPercentage: 0, serviceFeeAmount: 0 };
    }
  }

  /**
   * ✅ Batch normalize offers with controlled concurrency
   */
  private async normalizeOffersBatch(
    results: WakanowSearchResult[],
    isDomestic: boolean,
    displayCurrency: string,
    markupPercentage: number,
    serviceFeeAmount: number,
    conversionRate: number,
    conversionFee: number,
    totalWithFee: number,
    baseCurrency: string,
  ) {
    // ✅ Process in batches of 10 to avoid overwhelming the event loop
    const batchSize = 10;
    const normalizedOffers: any[] = [];
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const batchPromises = batch.map((result, index) =>
        this.normalizeOfferFast(
          result,
          i + index,
          isDomestic,
          displayCurrency,
          markupPercentage,
          serviceFeeAmount,
          conversionRate,
          conversionFee,
          totalWithFee,
          baseCurrency,
        )
      );
      const batchResults = await Promise.all(batchPromises);
      normalizedOffers.push(...batchResults);
    }
    
    return normalizedOffers;
  }

  /**
   * ✅ Fast normalization - no async operations per offer
   */
  private normalizeOfferFast(
    result: WakanowSearchResult,
    index: number,
    isDomestic: boolean,
    displayCurrency: string,
    markupPercentage: number,
    serviceFeeAmount: number,
    conversionRate: number,
    conversionFee: number,
    totalWithFee: number,
    baseCurrency: string,
  ) {
    const combo = result.FlightCombination;
    const basePrice = combo.Price.Amount;
    
    // ✅ Use pre-calculated conversion values
    const convertedPrice = basePrice * conversionRate;
    const convertedTotalWithFee = basePrice * totalWithFee;
    const convertedConversionFee = basePrice * conversionFee;
    const markupAmount = (convertedTotalWithFee * markupPercentage) / 100;
    const finalPrice = convertedTotalWithFee + markupAmount + serviceFeeAmount;

    // ✅ Calculate totals
    let totalBaseFare = 0;
    let totalTax = 0;
    for (const pd of combo.PriceDetails) {
      totalBaseFare += pd.BaseFare.Amount;
      totalTax += pd.Tax.Amount;
    }
    const convertedTax = totalTax * conversionRate;

    // ✅ Build slices
    const slices = combo.FlightModels.map((fm) => ({
      origin: {
        iata_code: fm.DepartureCode,
        name: fm.DepartureName,
        city_name: fm.DepartureName,
      },
      destination: {
        iata_code: fm.ArrivalCode,
        name: fm.ArrivalName,
        city_name: fm.ArrivalName,
      },
      departure_time: fm.DepartureTime,
      arrival_time: fm.ArrivalTime,
      duration: fm.TripDuration,
      stops: fm.Stops,
      segments: fm.FlightLegs.map((leg) => ({
        flight_number: leg.FlightNumber,
        departure_code: leg.DepartureCode,
        departure_name: leg.DepartureName,
        destination_code: leg.DestinationCode,
        destination_name: leg.DestinationName,
        start_time: leg.StartTime,
        end_time: leg.EndTime,
        duration: leg.Duration,
        cabin_class: leg.CabinClassName,
        operating_carrier: leg.OperatingCarrierName,
        operating_carrier_code: leg.OperatingCarrier,
        marketing_carrier: leg.MarketingCarrier,
        aircraft: leg.Aircraft,
        layover: leg.Layover,
        layover_duration: leg.LayoverDuration,
      })),
      airline: {
        name: fm.AirlineName,
        code: fm.Airline,
        logo_url: fm.AirlineLogoUrl,
      },
      free_baggage: fm.FreeBaggage,
    }));

    // ✅ Calculate price breakdown for frontend
    const roundedBasePrice = Math.round(convertedPrice * 100) / 100;
    const roundedMarkup = Math.round(markupAmount * 100) / 100;
    const roundedServiceFee = Math.round(serviceFeeAmount * 100) / 100;
    const roundedTotal = Math.round(finalPrice * 100) / 100;
    const roundedTaxes = Math.round((roundedMarkup + roundedServiceFee) * 100) / 100;
    const combinedTaxPercentage = markupPercentage + 5; // 5% service fee

    return {
      provider: 'WAKANOW' as const,
      id: `wakanow-${index}`,
      select_data: result.SelectData,
      slices,
      marketing_carrier: combo.MarketingCarrier,
      adults: combo.Adults,
      children: combo.Children,
      infants: combo.Infants,
      
      // ✅ Price fields
      original_amount: String(basePrice),
      original_currency: baseCurrency,
      base_amount: convertedPrice.toFixed(2),
      base_currency: displayCurrency,
      tax_amount: convertedTax.toFixed(2),
      conversion_fee: convertedConversionFee.toFixed(2),
      conversion_fee_percentage: baseCurrency !== displayCurrency ? 5 : 0,
      markup_percentage: markupPercentage,
      markup_amount: roundedMarkup.toFixed(2),
      service_fee: roundedServiceFee.toFixed(2),
      total_amount: convertedTotalWithFee.toFixed(2),
      final_amount: roundedTotal.toFixed(2),
      total_currency: displayCurrency,
      currency: displayCurrency,
      
      // ✅ Price breakdown for frontend
      priceBreakdown: {
        basePrice: roundedBasePrice,
        markupAmount: roundedMarkup,
        markupPercentage: markupPercentage,
        serviceFee: roundedServiceFee,
        serviceFeePercentage: 5,
        taxes: roundedTaxes,
        taxPercentage: combinedTaxPercentage,
        totalAmount: roundedTotal,
        currency: displayCurrency,
        breakdown: `${roundedBasePrice} + ${roundedMarkup} (${markupPercentage}% markup) + ${roundedServiceFee} (5% service fee) = ${roundedTotal}`,
      },
      
      price_details: combo.PriceDetails.map((pd) => ({
        passenger_type: pd.PassengerType,
        base_fare: pd.BaseFare.Amount,
        tax: pd.Tax.Amount,
        currency: pd.BaseFare.CurrencyCode,
      })),
      fare_rules: combo.FareRules,
      penalty_rules: combo.PenaltyRules,
      is_refundable: combo.IsRefundable,
      connection_code: combo.ConnectionCode,
    };
  }

  private isNigerianRoute(itineraries: Array<{ Departure: string; Destination: string }>): boolean {
    const nigerianAirports = [
      'LOS', 'ABV', 'KAN', 'PHC', 'QOW', 'ENU', 'ILR', 'JOS', 'YOL', 
      'CBQ', 'BNI', 'AKR', 'MIU', 'QRW'
    ];
    return itineraries.every(
      (it) =>
        nigerianAirports.includes(it.Departure.toUpperCase()) &&
        nigerianAirports.includes(it.Destination.toUpperCase()),
    );
  }
}