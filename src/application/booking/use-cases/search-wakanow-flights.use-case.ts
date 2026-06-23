// application/booking/use-cases/search-wakanow-flights.use-case.ts

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
  
  private markupConfigCache: Map<string, { markupPercentage: number; serviceFeeAmount: number }> = new Map();
  private readonly VALID_SELECT_DATA_MAX_LENGTH = 500;
  private readonly INVALID_SELECT_DATA_PREFIXES = ['7h4AAB+LCAAAAAAABAD', 'H4sI'];

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

    // ❌ DISABLE CACHE - SelectData expires quickly, always fetch fresh
    // const cacheKey = `wakanow:search:${JSON.stringify(wakanowRequest)}`;
    // const cached = this.cacheService.get<any>(cacheKey);
    // if (cached) {
    //   this.logger.log('Returning cached Wakanow search results');
    //   return cached;
    // }

    // ✅ Fetch from Wakanow with retry
    let results: WakanowSearchResult[] = [];
    let attempt = 0;
    const maxRetries = 2;

    while (attempt < maxRetries) {
      try {
        attempt++;
        this.logger.log(`🔍 Wakanow search attempt ${attempt}/${maxRetries}...`);
        results = await this.wakanowService.searchFlights(wakanowRequest);
        break;
      } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || '';
        const errorStatus = error?.status || error?.code || 0;

        if (attempt < maxRetries && 
            (errorStatus === 500 || errorStatus === 503 || errorMsg.includes('timeout'))) {
          this.logger.warn(`⚠️ Search attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw error;
      }
    }
    
    this.logger.log(`Wakanow search returned ${results.length} raw results`);

    if (results.length === 0) {
      return {
        offers: [],
        total_offers: 0,
        selectData: null,
        message: 'No flights found for the selected route and dates',
      };
    }

    // ✅ Filter out invalid SelectData (too long or gzip compressed)
    const validResults = results.filter((result) => {
      const selectData = result.SelectData || '';
      const isValid = selectData.length > 0 && 
                      selectData.length < this.VALID_SELECT_DATA_MAX_LENGTH &&
                      !this.INVALID_SELECT_DATA_PREFIXES.some(prefix => selectData.startsWith(prefix));
      
      if (!isValid) {
        this.logger.warn(`⚠️ Filtering out SelectData: length=${selectData.length}, startsWithInvalid=${!isValid}`);
        if (selectData.length > 0) {
          this.logger.warn(`⚠️ Preview: ${selectData.substring(0, 50)}...`);
        }
      }
      
      return isValid;
    });

    this.logger.log(`✅ ${validResults.length} results with valid SelectData (out of ${results.length})`);

    if (validResults.length === 0) {
      this.logger.warn('⚠️ All results had invalid SelectData.');
      
      // ✅ Try to get results with the short format
      const shortResults = results.filter((result) => {
        const selectData = result.SelectData || '';
        return selectData.length > 0 && selectData.length < 200;
      });
      
      if (shortResults.length > 0) {
        this.logger.log(`✅ Found ${shortResults.length} results with short SelectData format`);
        results = shortResults;
      } else {
        this.logger.error('❌ No valid SelectData found');
        return {
          offers: [],
          total_offers: 0,
          selectData: null,
          message: 'No valid flight selections available. Please try again.',
        };
      }
    } else {
      results = validResults;
    }

    this.logger.log(`✅ Using ${results.length} results with valid SelectData`);

    // ✅ Get markup config ONCE
    const productType = isDomestic ? ProductType.FLIGHT_DOMESTIC : ProductType.FLIGHT_INTERNATIONAL;
    const markupConfig = await this.getMarkupConfig(productType, displayCurrency);
    const { markupPercentage, serviceFeeAmount } = markupConfig;

    // ✅ Pre-fetch conversion rate once
    let conversionRate = 1;
    let conversionFee = 0;
    let totalWithFee = 0;
    let baseCurrency = 'NGN';

    if (results.length > 0 && results[0]?.FlightCombination?.Price?.CurrencyCode) {
      baseCurrency = results[0].FlightCombination.Price.CurrencyCode;
      
      if (baseCurrency !== displayCurrency) {
        try {
          const conversionResult = await this.currencyService.convert(1, baseCurrency, displayCurrency);
          conversionRate = conversionResult;
          const conversionDetails = this.currencyService.calculateConversionFee(1, baseCurrency, displayCurrency);
          conversionFee = conversionDetails.conversionFee;
          totalWithFee = conversionDetails.totalWithFee;
        } catch (error) {
          this.logger.warn(`⚠️ Currency conversion failed, using 1:1 rate: ${error.message}`);
          conversionRate = 1;
          conversionFee = 0;
          totalWithFee = 1;
        }
      } else {
        conversionRate = 1;
        conversionFee = 0;
        totalWithFee = 1;
      }
    }

    this.logger.log(`💰 Using conversion rate: ${conversionRate}, fee: ${conversionFee}`);

    // ✅ Normalize all offers
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

    // ✅ Get selectData from the first offer (should be valid now)
    const firstSelectData = normalizedOffers.length > 0 ? normalizedOffers[0].selectData : null;

    this.logger.log(`📊 Normalized ${normalizedOffers.length} offers`);
    
    // ✅ Log selectData info for debugging
    if (firstSelectData) {
      this.logger.log(`🔑 First SelectData length: ${firstSelectData.length}`);
      this.logger.log(`🔑 First SelectData preview: ${firstSelectData.substring(0, 50)}...`);
    }

    // ✅ Return fresh response (NO CACHING)
    return {
      offers: normalizedOffers,
      total_offers: normalizedOffers.length,
      selectData: firstSelectData,
      message: normalizedOffers.length > 0 
        ? `Found ${normalizedOffers.length} flight offers` 
        : 'No flights found for the selected route and dates',
    };
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
        markupPercentage: config?.markupPercentage || 10,
        serviceFeeAmount: config?.serviceFeeAmount || 0,
      };
      this.markupConfigCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.warn(`Could not fetch markup config for ${currency}, using default 10%`);
      return { markupPercentage: 10, serviceFeeAmount: 0 };
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
   * ✅ Fast normalization
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
    
    const convertedPrice = basePrice * conversionRate;
    const convertedTotalWithFee = basePrice * totalWithFee;
    const convertedConversionFee = basePrice * conversionFee;
    const markupAmount = (convertedTotalWithFee * markupPercentage) / 100;
    const finalPrice = convertedTotalWithFee + markupAmount + serviceFeeAmount;

    let totalBaseFare = 0;
    let totalTax = 0;
    for (const pd of combo.PriceDetails) {
      totalBaseFare += pd.BaseFare.Amount;
      totalTax += pd.Tax.Amount;
    }
    const convertedTax = totalTax * conversionRate;

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

    const roundedBasePrice = Math.round(convertedPrice * 100) / 100;
    const roundedMarkup = Math.round(markupAmount * 100) / 100;
    const roundedServiceFee = Math.round(serviceFeeAmount * 100) / 100;
    const roundedTotal = Math.round(finalPrice * 100) / 100;
    const roundedTaxes = Math.round((roundedMarkup + roundedServiceFee) * 100) / 100;
    const combinedTaxPercentage = markupPercentage + 5;

    const selectData = result.SelectData || '';

    return {
      provider: 'WAKANOW' as const,
      id: `wakanow-${index}`,
      select_data: selectData,
      selectData: selectData,
      slices,
      marketing_carrier: combo.MarketingCarrier,
      adults: combo.Adults,
      children: combo.Children,
      infants: combo.Infants,
      
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
      
      isDomestic: isDomestic,
      isWakanow: true,
      isWakanowDomestic: isDomestic,
      
      _generatedAt: Date.now(),
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