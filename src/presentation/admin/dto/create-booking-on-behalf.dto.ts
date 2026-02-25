import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateBookingDto } from '@presentation/booking/dto/create-booking.dto';

/**
 * Admin creates a booking on behalf of a customer.
 *
 * Same payload as user booking + userId.
 * After creation, admin pays via: POST /payments/stripe/create-intent (or Amadeus charge-margin).
 *
 * @example Domestic flight (Duffel)
 * {
 *   "userId": "cust_abc123",
 *   "productType": "FLIGHT_DOMESTIC",
 *   "provider": "DUFFEL",
 *   "basePrice": 185.50,
 *   "currency": "GBP",
 *   "bookingData": { "offerId": "off_00009htYpSCXrwaB9DnUm0" },
 *   "passengerInfo": {
 *     "firstName": "Jane",
 *     "lastName": "Doe",
 *     "email": "jane@example.com",
 *     "title": "mrs",
 *     "gender": "f",
 *     "dateOfBirth": "1990-05-15",
 *     "phone": "+447123456789"
 *   }
 * }
 *
 * @example International flight with passport (Duffel)
 * {
 *   "userId": "cust_abc123",
 *   "productType": "FLIGHT_INTERNATIONAL",
 *   "provider": "DUFFEL",
 *   "basePrice": 450.00,
 *   "currency": "GBP",
 *   "bookingData": { "offerId": "off_00009htYpSCXrwaB9DnUm0" },
 *   "passengerInfo": {
 *     "firstName": "Jane",
 *     "lastName": "Doe",
 *     "email": "jane@example.com",
 *     "title": "mrs",
 *     "gender": "f",
 *     "dateOfBirth": "1990-05-15",
 *     "phone": "+447123456789",
 *     "identityDocuments": [{
 *       "type": "passport",
 *       "uniqueIdentifier": "AB1234567",
 *       "issuingCountryCode": "GB",
 *       "expiresOn": "2030-06-15"
 *     }],
 *     "loyaltyProgrammeAccounts": [{
 *       "airlineIataCode": "BA",
 *       "accountNumber": "12901014"
 *     }]
 *   }
 * }
 */
export class CreateBookingOnBehalfDto extends CreateBookingDto {
  @ApiProperty({
    description: 'Customer user ID for whom the booking is created',
    example: 'cust_abc123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
