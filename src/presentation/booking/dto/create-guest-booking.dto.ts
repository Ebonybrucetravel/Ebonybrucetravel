// src/presentation/booking/dto/create-guest-booking.dto.ts
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  ValidateNested,
  Min,
  IsPositive,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType, Provider } from '@prisma/client';

import { PriceBreakdownDto } from './create-booking.dto';

// ✅ Base passenger info - shared by all providers
class GuestPassengerInfoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false, description: 'Required for flights. One of: mr, mrs, ms, miss, dr' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, description: 'Required for flights. One of: m, f' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false, description: 'Required for flights. Date of birth YYYY-MM-DD' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  // ✅ These fields are IGNORED by Duffel but kept for Wakanow/Amadeus
  // They are marked as optional and will be stripped for Duffel in the use case
  @ApiPropertyOptional({ description: 'Wakanow only - Passport number' })
  @IsString()
  @IsOptional()
  passportNumber?: string;

  @ApiPropertyOptional({ description: 'Wakanow only - Passport expiry date' })
  @IsString()
  @IsOptional()
  passportExpiry?: string;

  @ApiPropertyOptional({ description: 'Wakanow only - Passport issuing country' })
  @IsString()
  @IsOptional()
  passportCountry?: string;

  @ApiPropertyOptional({ description: 'Wakanow only - Street address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Wakanow only - City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Wakanow only - Country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Wakanow only - Country code' })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Wakanow only - Postal code' })
  @IsString()
  @IsOptional()
  postalCode?: string;
}

/**
 * Payload to create a guest booking (no authentication required).
 * 
 * @example Guest booking with price breakdown
 * {
 *   "productType": "FLIGHT_DOMESTIC",
 *   "provider": "WAKANOW",
 *   "bookingData": { "flightSummary": {...} },
 *   "passengerInfo": {
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "email": "john@example.com",
 *     "phone": "+2348000000000",
 *     "passportNumber": "A12345678",
 *     "passportExpiry": "2030-01-01",
 *     "passportCountry": "NG",
 *     "address": "No 1, Guest Street",
 *     "city": "Lagos",
 *     "country": "Nigeria",
 *     "countryCode": "NG",
 *     "postalCode": "100001"
 *   },
 *   "priceBreakdown": {
 *     "basePrice": 204028.73,
 *     "markupAmount": 20402.87,
 *     "markupPercentage": 10,
 *     "serviceFee": 10201.44,
 *     "serviceFeePercentage": 5,
 *     "taxes": 30604.31,
 *     "taxPercentage": 15,
 *     "totalAmount": 244833.04,
 *     "currency": "NGN"
 *   }
 * }
 * 
 * @example Duffel booking (minimal - no address) - WITH offerData
 * {
 *   "productType": "FLIGHT_INTERNATIONAL",
 *   "provider": "DUFFEL",
 *   "offerId": "off_0000B7fUFD5dDY93jVTP84",
 *   "offerRequestId": "orq_0000B7fUFD5dDY93jVTP84",
 *   "offerData": {
 *     "id": "off_0000B7fUFD5dDY93jVTP84",
 *     "total_amount": "500.00",
 *     "total_currency": "GBP",
 *     "passengers": [...],
 *     "slices": [...]
 *   },
 *   "bookingData": { "adults": 1 },
 *   "passengerInfo": {
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "email": "john@example.com",
 *     "phone": "+1234567890",
 *     "dateOfBirth": "1990-05-15",
 *     "gender": "m"
 *   },
 *   "priceBreakdown": {
 *     "basePrice": 500,
 *     "markupAmount": 50,
 *     "markupPercentage": 10,
 *     "serviceFee": 25,
 *     "serviceFeePercentage": 5,
 *     "taxes": 75,
 *     "taxPercentage": 15,
 *     "totalAmount": 650,
 *     "currency": "USD"
 *   }
 * }
 */
export class CreateGuestBookingDto {
  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @ApiProperty({ enum: Provider })
  @IsEnum(Provider)
  @IsNotEmpty()
  provider: Provider;

  @ApiPropertyOptional({ description: 'Base price (legacy - use priceBreakdown instead)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Currency (legacy - use priceBreakdown instead)' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsObject()
  @IsNotEmpty()
  bookingData: Record<string, any>;

  @ApiProperty({ type: GuestPassengerInfoDto })
  @ValidateNested()
  @Type(() => GuestPassengerInfoDto)
  passengerInfo: GuestPassengerInfoDto;

  @ApiPropertyOptional({
    description: 'Complete price breakdown including base price, markup, service fee, and taxes',
    type: PriceBreakdownDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceBreakdownDto)
  priceBreakdown?: PriceBreakdownDto;

  @ApiPropertyOptional({ description: 'Markup amount applied' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  markupAmount?: number;

  @ApiPropertyOptional({ description: 'Markup percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  markupPercentage?: number;

  @ApiPropertyOptional({ description: 'Service fee amount' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceFee?: number;

  @ApiPropertyOptional({ description: 'Service fee percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceFeePercentage?: number;

  @ApiPropertyOptional({ description: 'Combined taxes (markup + service fee)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxes?: number;

  @ApiPropertyOptional({ description: 'Combined tax percentage (markup% + service%)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxPercentage?: number;

  @ApiPropertyOptional({ description: 'Total amount including all fees' })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  totalAmount?: number;

  // ============================================================
  // ✅ WAKANOW FIELDS
  // ============================================================
  @ApiPropertyOptional({ description: 'Wakanow booking ID' })
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Wakanow select data' })
  @IsString()
  @IsOptional()
  selectData?: string;

  // ✅ NEW: PNR number for Wakanow bookings (required for automatic ticketing)
  @ApiPropertyOptional({ 
    description: 'PNR number for Wakanow flight bookings (used for automatic ticketing)', 
    example: '2606250400167' 
  })
  @IsString()
  @IsOptional()
  pnrNumber?: string;

  // ============================================================
  // ✅ DUFFEL FIELDS (NEW - ONLY FOR DUFFEL)
  // ============================================================
  @ApiPropertyOptional({ description: 'Duffel offer ID (required for Duffel)' })
  @IsString()
  @IsOptional()
  offerId?: string;

  @ApiPropertyOptional({ description: 'Duffel offer request ID' })
  @IsString()
  @IsOptional()
  offerRequestId?: string;

  @ApiPropertyOptional({ 
    description: 'Full offer data from Duffel (stored for later use when creating order)',
    type: 'object',
  })
  @IsObject()
  @IsOptional()
  offerData?: any;

  // ============================================================
  // ✅ COMMON FIELDS
  // ============================================================
  @ApiPropertyOptional({ description: 'Provider booking ID' })
  @IsString()
  @IsOptional()
  providerBookingId?: string;

  // ============================================================
  // ✅ HELPER METHODS (UNCHANGED)
  // ============================================================
  getTotalAmount(): number {
    return this.totalAmount || this.priceBreakdown?.totalAmount || 0;
  }

  getCurrency(): string {
    return this.currency || this.priceBreakdown?.currency || 'NGN';
  }

  getBasePrice(): number {
    return this.basePrice || this.priceBreakdown?.basePrice || 0;
  }

  getTaxes(): number {
    return this.taxes || this.priceBreakdown?.taxes || 0;
  }

  getMarkupAmount(): number {
    return this.markupAmount || this.priceBreakdown?.markupAmount || 0;
  }

  getServiceFee(): number {
    return this.serviceFee || this.priceBreakdown?.serviceFee || 0;
  }

  getMarkupPercentage(): number {
    return this.markupPercentage || this.priceBreakdown?.markupPercentage || 10;
  }

  getServiceFeePercentage(): number {
    return this.serviceFeePercentage || this.priceBreakdown?.serviceFeePercentage || 5;
  }

  getTaxPercentage(): number {
    return this.taxPercentage || this.priceBreakdown?.taxPercentage || 15;
  }

  // ✅ Type guard helpers
  isDuffel(): boolean {
    return this.provider === Provider.DUFFEL;
  }

  isWakanow(): boolean {
    return this.provider === Provider.WAKANOW;
  }

  isAmadeus(): boolean {
    return this.provider === Provider.AMADEUS;
  }
}