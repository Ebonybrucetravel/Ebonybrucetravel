import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { TripsAfricaService } from '@infrastructure/external-apis/trips-africa/trips-africa.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CacheService } from '@infrastructure/cache/cache.service';
import { SearchFlightsDto, PassengerDto, CabinClass } from '@presentation/booking/dto/search-flights.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class SearchFlightsUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly tripsAfricaService: TripsAfricaService,
    private readonly markupRepository: MarkupRepository,
    private readonly cacheService: CacheService,
  ) {}

  async execute(
    searchParams: SearchFlightsDto,
    options?: {
      returnOffers?: boolean; // If false, only return offer_request_id (for pagination)
      limit?: number; // Limit initial offers returned
    },
  ) {
    const { origin, destination, departureDate, returnDate, passengers, cabinClass, maxConnections, passengerDetails } = searchParams;
    const { returnOffers = false, limit } = options || {}; // Default to false for pagination

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
      console.log('⚠️  Domestic route detected, but Trips Africa API not yet implemented. Using Duffel.');
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

      // Transform and apply markup
      const offersWithMarkup = await Promise.all(
        offers.map(async (offer) => {
          const basePrice = parseFloat(offer.total_amount);
          const currency = offer.total_currency;

          // Get markup configuration
          let markupPercentage = 0;
          try {
            const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
              ProductType.FLIGHT_INTERNATIONAL,
              currency,
            );
            markupPercentage = markupConfig?.markupPercentage || 0;
          } catch (error) {
            console.warn('Could not fetch markup config, using 0%:', error);
          }

          const markupAmount = (basePrice * markupPercentage) / 100;
          const finalPrice = basePrice + markupAmount;

          return {
            ...offer,
            original_amount: offer.total_amount,
            markup_percentage: markupPercentage,
            markup_amount: markupAmount.toFixed(2),
            final_amount: finalPrice.toFixed(2),
            currency: offer.total_currency,
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
        message: offersWithMarkup.length < (response.data.offers?.length || 0) 
          ? 'Use /bookings/offers endpoint to get more offers' 
          : undefined,
      };
    } catch (error) {
      console.error('Error searching flights:', error);
      throw error;
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
    
    return (
      nigerianAirports.includes(originUpper) && 
      nigerianAirports.includes(destUpper)
    );
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
    return Array(passengerCount).fill(null).map(() => ({
      type: 'adult' as const,
    }));
  }
}
