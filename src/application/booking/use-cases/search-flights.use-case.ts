import { Injectable, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { TripsAfricaService } from '@infrastructure/external-apis/trips-africa/trips-africa.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import {
  SearchFlightsDto,
  PassengerDto,
  CabinClass,
} from '@presentation/booking/dto/search-flights.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class SearchFlightsUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly tripsAfricaService: TripsAfricaService,
    private readonly markupRepository: MarkupRepository,
    private readonly cacheService: CacheService,
    private readonly currencyService: CurrencyService,
  ) {}

  async execute(
    searchParams: SearchFlightsDto,
    options?: {
      returnOffers?: boolean; // If false, only return offer_request_id (for pagination)
      limit?: number; // Limit initial offers returned
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
    const { returnOffers = false, limit } = options || {}; // Default to false for pagination

    // Validate currency
    const targetCurrency = currency.toUpperCase();
    if (!this.currencyService.isSupportedCurrency(targetCurrency)) {
      throw new BadRequestException(
        `Unsupported currency: ${currency}. Supported currencies: ${this.currencyService.getSupportedCurrencies().join(', ')}`,
      );
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(searchParams);
    const cachedOfferRequestId = this.cacheService.getCachedSearchResult(searchParams);

    if (cachedOfferRequestId) {
      // If we have a cached offer request ID and don't need offers, return it
      if (!returnOffers) {
        return {
          offer_request_id: cachedOfferRequestId,
          cached: true,
        };
      }

      // If we need offers, fetch them (will be paginated separately)
      // For now, return the offer_request_id and let frontend paginate
      return {
        offer_request_id: cachedOfferRequestId,
        cached: true,
        message: 'Use /bookings/offers endpoint to paginate offers',
      };
    }

    // Determine if route is domestic (Nigeria) or international
    const isDomestic = this.isNigerianRoute(origin, destination);

    if (isDomestic) {
      // TODO: Implement Trips Africa API integration
      console.log(
        '⚠️  Domestic route detected, but Trips Africa API not yet implemented. Using Duffel.',
      );
    }

    // Prepare passengers array
    const duffelPassengers = this.preparePassengers(passengers, passengerDetails);

    // Prepare slices (one for outbound, one for return if returnDate is provided)
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

    // Create offer request
    const offerRequest = {
      slices,
      passengers: duffelPassengers,
      cabin_class: cabinClass || CabinClass.ECONOMY,
      max_connections: maxConnections ?? 1,
    };

    try {
      // Call Duffel API - don't return offers immediately for better pagination control
      const response = await this.duffelService.searchFlights(offerRequest, {
        returnOffers: returnOffers, // Only return offers if explicitly requested
        supplierTimeout: 20000, // 20 seconds
      });

      // Cache the offer request ID for 10 minutes
      // This allows multiple users searching the same route to reuse the offer request
      this.cacheService.cacheSearchResult(searchParams, response.data.id, 10 * 60 * 1000);

      // If offers are not requested, just return the offer_request_id
      if (!returnOffers) {
        return {
          offer_request_id: response.data.id,
          live_mode: response.data.live_mode,
          message: 'Use /bookings/offers endpoint to paginate offers',
        };
      }

      // If offers are returned, limit them and apply markup
      let offers = response.data.offers || [];

      // Limit offers if specified
      if (limit && limit > 0) {
        offers = offers.slice(0, limit);
      }

      // Transform, apply markup, and convert currency
      const offersWithMarkup = await Promise.all(
        offers.map(async (offer) => {
          const duffelCurrency = offer.total_currency; // Usually USD from Duffel
          const basePrice = parseFloat(offer.total_amount);
          const baseAmount = parseFloat(offer.base_amount);
          const taxAmount = offer.tax_amount ? parseFloat(offer.tax_amount) : 0;

          // Step 1: Convert prices from Duffel currency to target currency (pure conversion)
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

          // Step 2: Calculate currency conversion fee (buffer) as separate line item
          // This protects against rate fluctuations and ensures payment success
          const conversionDetails = this.currencyService.calculateConversionFee(
            convertedBasePrice,
            duffelCurrency,
            targetCurrency,
          );

          // Step 3: Get markup configuration using target currency
          let markupPercentage = 0;
          try {
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
              ProductType.FLIGHT_INTERNATIONAL,
              targetCurrency,
            );
            markupPercentage = markupConfig?.markupPercentage || 0;
          } catch (error) {
            console.warn(`Could not fetch markup config for ${targetCurrency}, using 0%:`, error);
          }

          // Step 4: Apply markup to price after conversion fee
          const markupAmount = (conversionDetails.totalWithFee * markupPercentage) / 100;
          const finalPrice = conversionDetails.totalWithFee + markupAmount;

          return {
            ...offer,
            // Original amounts in Duffel currency (for reference)
            original_amount: offer.total_amount,
            original_currency: duffelCurrency,
            // Base converted amounts (pure conversion, no fees)
            base_amount: this.currencyService.formatAmount(convertedBaseAmount, targetCurrency),
            base_currency: targetCurrency,
            tax_amount: offer.tax_amount
              ? this.currencyService.formatAmount(convertedTaxAmount, targetCurrency)
              : null,
            tax_currency: offer.tax_amount ? targetCurrency : null,
            // Currency conversion breakdown (transparent fee structure)
            conversion_fee: this.currencyService.formatAmount(
              conversionDetails.conversionFee,
              targetCurrency,
            ),
            conversion_fee_percentage:
              duffelCurrency !== targetCurrency ? this.currencyService.getConversionBuffer() : 0,
            // Price after conversion and fee (before markup)
            price_after_conversion: this.currencyService.formatAmount(
              conversionDetails.totalWithFee,
              targetCurrency,
            ),
            total_amount: this.currencyService.formatAmount(
              conversionDetails.totalWithFee,
              targetCurrency,
            ),
            total_currency: targetCurrency,
            // Markup and final amounts
            markup_percentage: markupPercentage,
            markup_amount: this.currencyService.formatAmount(markupAmount, targetCurrency),
            final_amount: this.currencyService.formatAmount(finalPrice, targetCurrency),
            currency: targetCurrency,
          };
        }),
      );

      // Cache offers for 2 minutes (they expire quickly)
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
      // Log error for debugging
      console.error('Error searching flights:', error);

      // Re-throw HttpException as-is (from DuffelService or validation)
      if (error instanceof HttpException) {
        throw error;
      }

      // Convert other errors to proper HTTP exceptions
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check for network/API errors
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        throw new HttpException(
          {
            message: 'Unable to connect to flight search service. Please try again in a few moments.',
            error: 'Service unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Generic error
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

  /**
   * Check if route is domestic (both airports in Nigeria)
   * Nigerian airports: LOS, ABV, KAN, PHC, QOW, etc.
   */
  private isNigerianRoute(origin: string, destination: string): boolean {
    const nigerianAirports = ['LOS', 'ABV', 'KAN', 'PHC', 'QOW', 'ENU', 'ILR', 'JOS', 'YOL', 'CBQ'];
    const originUpper = origin.toUpperCase();
    const destUpper = destination.toUpperCase();

    return nigerianAirports.includes(originUpper) && nigerianAirports.includes(destUpper);
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(params: SearchFlightsDto): string {
    return `search:${params.origin}:${params.destination}:${params.departureDate}:${params.returnDate || ''}:${params.passengers}:${params.cabinClass || 'economy'}:${params.maxConnections || 1}`;
  }

  /**
   * Prepare passengers array for Duffel API
   */
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
      // Use provided passenger details
      return passengerDetails.map((p) => ({
        type: p.type,
        age: p.age,
        family_name: p.family_name,
        given_name: p.given_name,
        fare_type: p.fare_type,
      }));
    }

    // Default: all adults
    return Array(passengerCount)
      .fill(null)
      .map(() => ({
        type: 'adult' as const,
      }));
  }
}
