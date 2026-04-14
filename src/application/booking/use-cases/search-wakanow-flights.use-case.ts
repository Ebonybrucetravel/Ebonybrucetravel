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
    const cacheKey = `wakanow:search:${JSON.stringify(wakanowRequest)}`;
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) {
      this.logger.log('Returning cached Wakanow search results');
      return cached;
    }
    const results = await this.wakanowService.searchFlights(wakanowRequest);
    if (results.length === 0) {
      return {
        provider: 'WAKANOW',
        offers: [],
        total_offers: 0,
        message: 'No flights found for the selected route and dates',
      };
    }
    const displayCurrency = currency.toUpperCase();
    const normalizedOffers = await Promise.all(
      results.map(async (result, index) => {
        return this.normalizeOffer(result, index, isDomestic, targetCurrency, displayCurrency);
      }),
    );
    const response = {
      provider: 'WAKANOW',
      offers: normalizedOffers,
      total_offers: normalizedOffers.length,
    };
    this.cacheService.set(cacheKey, response, 5 * 60 * 1000);
    return response;
  }
  private async normalizeOffer(
    result: WakanowSearchResult,
    index: number,
    isDomestic: boolean,
    wakanowCurrency: string,
    displayCurrency: string,
  ) {
    const combo = result.FlightCombination;
    const basePrice = combo.Price.Amount;
    const priceCurrency = combo.Price.CurrencyCode || wakanowCurrency;
    let convertedPrice = basePrice;
    if (priceCurrency !== displayCurrency) {
      convertedPrice = await this.currencyService.convert(basePrice, priceCurrency, displayCurrency);
    }
    const conversionDetails = this.currencyService.calculateConversionFee(
      convertedPrice,
      priceCurrency,
      displayCurrency,
    );
    let markupPercentage = 0;
    try {
      const productType = isDomestic ? ProductType.FLIGHT_DOMESTIC : ProductType.FLIGHT_INTERNATIONAL;
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(productType, displayCurrency);
      markupPercentage = markupConfig?.markupPercentage || 0;
    } catch (error) {
      this.logger.warn(`Could not fetch markup config for ${displayCurrency}, using 0%`);
    }
    const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
    const finalPrice = conversionDetails.totalWithFee + markupAmount;
    let totalBaseFare = 0;
    let totalTax = 0;
    for (const pd of combo.PriceDetails) {
      totalBaseFare += pd.BaseFare.Amount;
      totalTax += pd.Tax.Amount;
    }
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
    return {
      provider: 'WAKANOW' as const,
      id: `wakanow-${index}`,
      select_data: result.SelectData,
      slices,
      marketing_carrier: combo.MarketingCarrier,
      adults: combo.Adults,
      children: combo.Children,
      infants: combo.Infants,
      original_amount: String(basePrice),
      original_currency: priceCurrency,
      base_amount: this.currencyService.formatAmount(convertedPrice, displayCurrency),
      base_currency: displayCurrency,
      tax_amount: totalTax > 0
        ? this.currencyService.formatAmount(
            await this.currencyService.convert(totalTax, priceCurrency, displayCurrency),
            displayCurrency,
          )
        : '0.00',
      conversion_fee: this.currencyService.formatAmount(conversionDetails.conversionFee, displayCurrency),
      conversion_fee_percentage: priceCurrency !== displayCurrency ? this.currencyService.getConversionBuffer() : 0,
      markup_percentage: markupPercentage,
      markup_amount: this.currencyService.formatAmount(markupAmount, displayCurrency),
      total_amount: this.currencyService.formatAmount(conversionDetails.totalWithFee, displayCurrency),
      final_amount: this.currencyService.formatAmount(finalPrice, displayCurrency),
      total_currency: displayCurrency,
      currency: displayCurrency,
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
    const nigerianAirports = ['LOS', 'ABV', 'KAN', 'PHC', 'QOW', 'ENU', 'ILR', 'JOS', 'YOL', 'CBQ', 'BNI', 'AKR', 'MIU', 'QRW'];
    return itineraries.every(
      (it) =>
        nigerianAirports.includes(it.Departure.toUpperCase()) &&
        nigerianAirports.includes(it.Destination.toUpperCase()),
    );
  }
}
