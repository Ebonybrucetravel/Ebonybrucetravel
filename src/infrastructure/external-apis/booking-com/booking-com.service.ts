import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * NOTE: Booking.com partner program may not be accessible.
 *
 * ALTERNATIVES (Per-booking commission, no upfront costs):
 *
 * FOR CAR RENTALS:
 * 1. DiscoverCars Affiliate - https://www.discovercars.com/affiliate-program
 *    - 4-8% commission, easier approval than Booking.com
 * 2. EconomyBookings - https://www.economybookings.com/affiliate-program
 * 3. Rentalcars - https://www.rentalcars.com/affiliate/
 *
 * FOR HOTELS:
 * 1. Agoda Affiliate - https://www.agoda.com/affiliates (RECOMMENDED)
 *    - 4-8% commission, easier approval, part of Booking Holdings
 * 2. Hotels.com Affiliate - https://www.hotels.com/affiliates
 * 3. Expedia Partner Solutions - https://www.expediapartnercentral.com
 *
 * See: HOTELS_CARS_ALTERNATIVES.md for full details
 */
@Injectable()
export class BookingComService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BOOKING_COM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('BOOKING_COM_BASE_URL') || '';
  }

  // TODO: Implement Booking.com API methods OR switch to alternatives
  // - searchCarRentals()
  // - getCarDetails()
  //
  // Recommended: Replace with DiscoverCars (cars) and Agoda (hotels)
}
