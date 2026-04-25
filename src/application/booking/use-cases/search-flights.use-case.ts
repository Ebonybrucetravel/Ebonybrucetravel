import { Injectable, HttpException, HttpStatus, BadRequestException, Logger } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { TripsAfricaService } from '@infrastructure/external-apis/trips-africa/trips-africa.service';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import {
  SearchFlightsDto,
  PassengerDto,
  CabinClass,
} from '@presentation/booking/dto/search-flights.dto';
import { SearchWakanowFlightsUseCase } from './search-wakanow-flights.use-case';
import { ProductType } from '@prisma/client';

@Injectable()
export class SearchFlightsUseCase {
  private readonly logger = new Logger(SearchFlightsUseCase.name);

  constructor(
    private readonly duffelService: DuffelService,
    private readonly tripsAfricaService: TripsAfricaService,
    private readonly wakanowService: WakanowService,
    private readonly searchWakanowFlightsUseCase: SearchWakanowFlightsUseCase,
    private readonly markupRepository: MarkupRepository,
    private readonly cacheService: CacheService,
    private readonly currencyService: CurrencyService,
  ) { }

  async execute(
    searchParams: SearchFlightsDto,
    options?: {
      returnOffers?: boolean;
      limit?: number;
    },
  ) {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      maxConnections,
      passengerDetails,
      currency = 'GBP',
    } = searchParams;
    const { returnOffers = false, limit } = options || {};

    const targetCurrency = currency.toUpperCase();
    if (!this.currencyService.isSupportedCurrency(targetCurrency)) {
      throw new BadRequestException(
        `Unsupported currency: ${currency}. Supported currencies: ${this.currencyService.getSupportedCurrencies().join(', ')}`,
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departure = new Date(departureDate);
    departure.setHours(0, 0, 0, 0);

    if (departure < today) {
      throw new BadRequestException(
        `Departure date (${departureDate}) cannot be in the past. Please select a future date.`,
      );
    }

    if (returnDate) {
      const returnD = new Date(returnDate);
      returnD.setHours(0, 0, 0, 0);

      if (returnD < departure) {
        throw new BadRequestException(
          `Return date (${returnDate}) must be after departure date (${departureDate}).`,
        );
      }
    }

    const cacheKey = this.generateCacheKey(searchParams);
    const cachedOfferRequestId = this.cacheService.getCachedSearchResult(searchParams);

    if (cachedOfferRequestId) {
      if (!returnOffers) {
        return {
          offer_request_id: cachedOfferRequestId,
          cached: true,
        };
      }

      return {
        offer_request_id: cachedOfferRequestId,
        cached: true,
        message: 'Use /bookings/offers endpoint to paginate offers',
      };
    }

    const isDomestic = this.isNigerianRoute(origin, destination);

    if (isDomestic) {
      this.logger.log('🇳🇬 Domestic route detected, using Wakanow API');
      try {
        const wakanowResult = await this.searchWakanowFlightsUseCase.execute({
          flightSearchType: returnDate ? 'Return' as any : 'Oneway' as any,
          adults: passengers,
          children: 0,
          infants: 0,
          ticketClass: this.mapCabinClassToWakanow(cabinClass),
          targetCurrency: 'NGN',
          currency: targetCurrency,
          itineraries: [
            {
              Departure: origin.toUpperCase(),
              Destination: destination.toUpperCase(),
              DepartureDate: this.formatDateForWakanow(departureDate),
            },
            ...(returnDate
              ? [
                  {
                    Departure: destination.toUpperCase(),
                    Destination: origin.toUpperCase(),
                    DepartureDate: this.formatDateForWakanow(returnDate),
                  },
                ]
              : []),
          ],
        });
        return wakanowResult;
      } catch (error) {
        this.logger.warn('Wakanow domestic search failed, falling back to Duffel:', error instanceof Error ? error.message : error);
      }
    }

    const duffelPassengers = this.preparePassengers(passengers, passengerDetails);

    const slices = [
      {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departure_date: departureDate,
      },
    ];

    if (returnDate) {
      slices.push({
        origin: destination.toUpperCase(),
        destination: origin.toUpperCase(),
        departure_date: returnDate,
      });
    }

    const offerRequest = {
      slices,
      passengers: duffelPassengers,
      cabin_class: cabinClass || CabinClass.ECONOMY,
      max_connections: maxConnections ?? 1,
    };

    try {
      const response = await this.duffelService.searchFlights(offerRequest, {
        returnOffers: returnOffers,
        supplierTimeout: 20000,
      });

      this.cacheService.cacheSearchResult(searchParams, response.data.id, 10 * 60 * 1000);

      if (!returnOffers) {
        return {
          offer_request_id: response.data.id,
          live_mode: response.data.live_mode,
          message: 'Use /bookings/offers endpoint to paginate offers',
        };
      }

      let offers = response.data.offers || [];

      if (limit && limit > 0) {
        offers = offers.slice(0, limit);
      }

      const offersWithMarkup = await Promise.all(
        offers.map(async (offer) => {
          const duffelCurrency = offer.total_currency;
          const basePrice = parseFloat(offer.total_amount);
          const baseAmount = parseFloat(offer.base_amount);
          const taxAmount = offer.tax_amount ? parseFloat(offer.tax_amount) : 0;

          const convertedBasePrice = await this.currencyService.convert(
            basePrice,
            duffelCurrency,
            targetCurrency,
          );
          const convertedBaseAmount = await this.currencyService.convert(
            baseAmount,
            duffelCurrency,
            targetCurrency,
          );
          const convertedTaxAmount = offer.tax_amount
            ? await this.currencyService.convert(taxAmount, duffelCurrency, targetCurrency)
            : 0;

          const conversionDetails = this.currencyService.calculateConversionFee(
            convertedBasePrice,
            duffelCurrency,
            targetCurrency,
          );

          let markupPercentage = 0;
          let serviceFeeAmount = 0;
          try {
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
              ProductType.FLIGHT_INTERNATIONAL,
              targetCurrency,
            );
            markupPercentage = markupConfig?.markupPercentage || 0;
            serviceFeeAmount = markupConfig?.serviceFeeAmount || 0;
          } catch (error) {
            console.warn(`Could not fetch markup config for ${targetCurrency}, using 0%:`, error);
          }

          const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
          const finalPrice = conversionDetails.totalWithFee + markupAmount + serviceFeeAmount;

          return {
            ...offer,
            original_amount: offer.total_amount,
            original_currency: duffelCurrency,
            base_amount: this.currencyService.formatAmount(convertedBaseAmount, targetCurrency),
            base_currency: targetCurrency,
            tax_amount: offer.tax_amount
              ? this.currencyService.formatAmount(convertedTaxAmount, targetCurrency)
              : null,
            tax_currency: offer.tax_amount ? targetCurrency : null,
            conversion_fee: this.currencyService.formatAmount(
              conversionDetails.conversionFee,
              targetCurrency,
            ),
            conversion_fee_percentage:
              duffelCurrency !== targetCurrency ? this.currencyService.getConversionBuffer() : 0,
            price_after_conversion: this.currencyService.formatAmount(
              conversionDetails.totalWithFee,
              targetCurrency,
            ),
            total_amount: this.currencyService.formatAmount(
              conversionDetails.totalWithFee,
              targetCurrency,
            ),
            total_currency: targetCurrency,
            markup_percentage: markupPercentage,
            markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
            service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
            final_amount: this.currencyService.formatAmount(finalPrice, targetCurrency),
            currency: targetCurrency,
          };
        }),
      );

      this.cacheService.cacheOffers(response.data.id, offersWithMarkup, 2 * 60 * 1000);

      return {
        offer_request_id: response.data.id,
        offers: offersWithMarkup,
        live_mode: response.data.live_mode,
        total_offers: response.data.offers?.length || 0,
        returned_offers: offersWithMarkup.length,
        message:
          offersWithMarkup.length < (response.data.offers?.length || 0)
            ? 'Use /bookings/offers endpoint to get more offers'
            : undefined,
      };
    } catch (error) {
      this.logger.error('Error searching flights:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        throw new HttpException(
          {
            message: 'Unable to connect to flight search service. Please try again in a few moments.',
            error: 'Service unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        {
          message: 'An error occurred while searching for flights. Please check your search parameters and try again.',
          error: 'Search failed',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private isNigerianRoute(origin: string, destination: string): boolean {
    const nigerianAirports = ['LOS', 'ABV', 'KAN', 'PHC', 'QOW', 'ENU', 'ILR', 'JOS', 'YOL', 'CBQ', 'BNI', 'AKR', 'MIU', 'QRW'];
    const originUpper = origin.toUpperCase();
    const destUpper = destination.toUpperCase();

    return nigerianAirports.includes(originUpper) && nigerianAirports.includes(destUpper);
  }

  private generateCacheKey(params: SearchFlightsDto): string {
    return `search:${params.origin}:${params.destination}:${params.departureDate}:${params.returnDate || ''}:${params.passengers}:${params.cabinClass || 'economy'}:${params.maxConnections || 1}`;
  }

  private mapCabinClassToWakanow(cabinClass?: string): any {
    const map: Record<string, string> = {
      economy: 'Y',
      premium_economy: 'W',
      business: 'C',
      first: 'F',
    };
    return map[cabinClass?.toLowerCase() || 'economy'] || 'Y';
  }

  private formatDateForWakanow(isoDate: string): string {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }

  private preparePassengers(
    passengerCount: number,
    passengerDetails?: PassengerDto[],
  ): Array<{
    type?: 'adult' | 'child' | 'infant_without_seat';
    age?: number;
    family_name?: string;
    given_name?: string;
    fare_type?: string;
  }> {
    if (passengerDetails && passengerDetails.length > 0) {
      return passengerDetails.map((p) => ({
        type: p.type,
        age: p.age,
        family_name: p.family_name,
        given_name: p.given_name,
        fare_type: p.fare_type,
      }));
    }

    return Array(passengerCount)
      .fill(null)
      .map(() => ({
        type: 'adult' as const,
      }));
  }
}
