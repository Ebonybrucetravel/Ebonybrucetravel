import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { TripsAfricaService } from '@infrastructure/external-apis/trips-africa/trips-africa.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { SearchFlightsDto, PassengerDto, CabinClass } from '@presentation/booking/dto/search-flights.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class SearchFlightsUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly tripsAfricaService: TripsAfricaService,
    private readonly markupRepository: MarkupRepository,
  ) {}

  async execute(searchParams: SearchFlightsDto) {
    const { origin, destination, departureDate, returnDate, passengers, cabinClass, maxConnections, passengerDetails } = searchParams;

    // Determine if route is domestic (Nigeria) or international
    // For now, we'll use Duffel for all routes. Later, we can add logic to detect Nigerian airports
    const isDomestic = this.isNigerianRoute(origin, destination);

    if (isDomestic) {
      // TODO: Implement Trips Africa API integration
      // For now, fall back to Duffel
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
      // Call Duffel API
      const response = await this.duffelService.searchFlights(offerRequest, {
        returnOffers: true,
        supplierTimeout: 20000, // 20 seconds
      });

      // Transform and apply markup
      const offers = await Promise.all(
        response.data.offers.map(async (offer) => {
          // Calculate markup for this offer
          const basePrice = parseFloat(offer.total_amount);
          const currency = offer.total_currency;

          // Get markup configuration (default to 0 if not found)
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

          // Calculate final price with markup
          const markupAmount = (basePrice * markupPercentage) / 100;
          const finalPrice = basePrice + markupAmount;

          return {
            ...offer,
            // Add our calculated pricing
            original_amount: offer.total_amount,
            markup_percentage: markupPercentage,
            markup_amount: markupAmount.toFixed(2),
            final_amount: finalPrice.toFixed(2),
            currency: offer.total_currency,
          };
        }),
      );

      return {
        offer_request_id: response.data.id,
        offers,
        live_mode: response.data.live_mode,
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
