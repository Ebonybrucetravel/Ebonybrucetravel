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
    const startTime = Date.now();
    
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

    // ✅ Fetch from Wakanow with retry
    let results: WakanowSearchResult[] = [];
    let attempt = 0;
    const maxRetries = 2;

    while (attempt < maxRetries) {
      try {
        attempt++;
        this.logger.log(`🔍 Wakanow search attempt ${attempt}/${maxRetries}...`);
        const searchStart = Date.now();
        results = await this.wakanowService.searchFlights(wakanowRequest);
        this.logger.log(`⏱️ Wakanow API responded in ${Date.now() - searchStart}ms`);
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

    // ✅ Filter out invalid SelectData (FAST - O(n))
    const validResults: WakanowSearchResult[] = [];
    const shortResults: WakanowSearchResult[] = [];
    
    for (const result of results) {
      const selectData = result.SelectData || '';
      const isValid = selectData.length > 0 && 
                      selectData.length < this.VALID_SELECT_DATA_MAX_LENGTH &&
                      !this.INVALID_SELECT_DATA_PREFIXES.some(prefix => selectData.startsWith(prefix));
      
      if (isValid) {
        validResults.push(result);
      } else if (selectData.length > 0 && selectData.length < 200) {
        shortResults.push(result);
      }
    }

    this.logger.log(`✅ ${validResults.length} results with valid SelectData (out of ${results.length})`);

    // ✅ Use short results if no valid results
    let finalResults = validResults;
    if (finalResults.length === 0 && shortResults.length > 0) {
      this.logger.log(`✅ Using ${shortResults.length} results with short SelectData format`);
      finalResults = shortResults;
    }

    if (finalResults.length === 0) {
      this.logger.warn('⚠️ No valid SelectData found');
      return {
        offers: [],
        total_offers: 0,
        selectData: null,
        message: 'No valid flight selections available. Please try again.',
      };
    }

    this.logger.log(`✅ Using ${finalResults.length} results with valid SelectData`);

    // ✅ Get markup config ONCE
    const productType = isDomestic ? ProductType.FLIGHT_DOMESTIC : ProductType.FLIGHT_INTERNATIONAL;
    const markupConfig = await this.getMarkupConfig(productType, displayCurrency);
    const { markupPercentage, serviceFeeAmount } = markupConfig;

    // ✅ Get conversion details ONCE (not per offer)
    let conversionRate = 1;
    let conversionFee = 0;
    let totalWithFee = 1;
    let baseCurrency = 'NGN';

    if (finalResults.length > 0 && finalResults[0]?.FlightCombination?.Price?.CurrencyCode) {
      baseCurrency = finalResults[0].FlightCombination.Price.CurrencyCode;
      
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
      }
    }

    this.logger.log(`💰 Using conversion rate: ${conversionRate}, fee: ${conversionFee}`);

    // ✅ Pre-calculate constants for faster normalization
    const markupMultiplier = 1 + (markupPercentage / 100);

    // ✅ Normalize all offers SYNCHRONOUSLY (FAST - no async needed)
    const normalizedOffers = this.normalizeOffersBatch(
      finalResults,
      isDomestic,
      displayCurrency,
      markupPercentage,
      serviceFeeAmount,
      conversionRate,
      conversionFee,
      totalWithFee,
      baseCurrency,
      markupMultiplier,
    );

    // ✅ Get selectData from the first offer
    const firstSelectData = normalizedOffers.length > 0 ? normalizedOffers[0].selectData : null;

    const totalTime = Date.now() - startTime;
    this.logger.log(`📊 Normalized ${normalizedOffers.length} offers in ${totalTime}ms`);
    
    if (firstSelectData) {
      this.logger.log(`🔑 First SelectData length: ${firstSelectData.length}`);
      this.logger.log(`🔑 First SelectData preview: ${firstSelectData.substring(0, 50)}...`);
    }

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
   * ✅ Batch normalize offers - SYNCHRONOUS for speed
   */
  private normalizeOffersBatch(
    results: WakanowSearchResult[],
    isDomestic: boolean,
    displayCurrency: string,
    markupPercentage: number,
    serviceFeeAmount: number,
    conversionRate: number,
    conversionFee: number,
    totalWithFee: number,
    baseCurrency: string,
    markupMultiplier: number,
  ) {
    const normalizedOffers: any[] = [];
    const now = Date.now();
    
    // ✅ Use for loop - faster than map + Promise.all
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const offer = this.normalizeOfferFast(
        result,
        i,
        isDomestic,
        displayCurrency,
        markupPercentage,
        serviceFeeAmount,
        conversionRate,
        conversionFee,
        totalWithFee,
        baseCurrency,
        markupMultiplier,
        now,
      );
      normalizedOffers.push(offer);
    }
    
    return normalizedOffers;
  }

  /**
   * ✅ Fast normalization - NO async, pure calculations
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
    markupMultiplier: number,
    timestamp: number,
  ) {
    const combo = result.FlightCombination;
    const basePrice = combo.Price.Amount;
    
    // ✅ Calculate all prices in one go
    const convertedPrice = basePrice * conversionRate;
    const convertedTotalWithFee = basePrice * totalWithFee;
    const convertedConversionFee = basePrice * conversionFee;
    const markupAmount = convertedTotalWithFee * markupPercentage / 100;
    const finalPrice = convertedTotalWithFee + markupAmount + serviceFeeAmount;

    // ✅ Calculate tax once
    let totalBaseFare = 0;
    let totalTax = 0;
    const priceDetails = combo.PriceDetails;
    for (let i = 0; i < priceDetails.length; i++) {
      const pd = priceDetails[i];
      totalBaseFare += pd.BaseFare.Amount;
      totalTax += pd.Tax.Amount;
    }
    const convertedTax = totalTax * conversionRate;

    // ✅ Build slices
    const flightModels = combo.FlightModels;
    const slices = new Array(flightModels.length);
    
    for (let i = 0; i < flightModels.length; i++) {
      const fm = flightModels[i];
      const flightLegs = fm.FlightLegs;
      const segments = new Array(flightLegs.length);
      
      for (let j = 0; j < flightLegs.length; j++) {
        const leg = flightLegs[j];
        segments[j] = {
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
        };
      }
      
      slices[i] = {
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
        segments,
        airline: {
          name: fm.AirlineName,
          code: fm.Airline,
          logo_url: fm.AirlineLogoUrl,
        },
        free_baggage: fm.FreeBaggage,
      };
    }

    // ✅ Round values
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
      
      _generatedAt: timestamp,
    };
  }

  private isNigerianRoute(itineraries: Array<{ Departure: string; Destination: string }>): boolean {
    const nigerianAirports = new Set([
      'LOS', 'ABV', 'KAN', 'PHC', 'QOW', 'ENU', 'ILR', 'JOS', 'YOL', 
      'CBQ', 'BNI', 'AKR', 'MIU', 'QRW'
    ]);
    return itineraries.every(
      (it) =>
        nigerianAirports.has(it.Departure.toUpperCase()) &&
        nigerianAirports.has(it.Destination.toUpperCase()),
    );
  }
}