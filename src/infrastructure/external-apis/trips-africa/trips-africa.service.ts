import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * NOTE: For per-booking pricing model, consider:
 * 
 * 1. Direct Airline Affiliate Programs (5-10% commission, $0 upfront)
 *    - Contact: Air Peace, Arik Air, Ibom Air, Green Africa, United Nigeria
 *    - Email each airline for affiliate partnership
 * 
 * 2. Negotiate with Trips Africa for per-booking pricing
 *    - Request: ₦500-₦2,000 per successful booking instead of monthly fee
 * 
 * Current: Trips Africa API (likely monthly subscription)
 * Alternative: Airline affiliate programs (0% upfront, commission per booking)
 */
@Injectable()
export class TripsAfricaService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TRIPS_AFRICA_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('TRIPS_AFRICA_BASE_URL') || '';
  }

  // TODO: Implement Trips Africa API methods OR switch to airline affiliates
  // - searchFlights()
  // - createBooking()
  // - getBooking()
  // - cancelBooking()
}

