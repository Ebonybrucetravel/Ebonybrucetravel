import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  IsEmail,
  IsArray,
  ValidateNested,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType, Provider } from '@prisma/client';

class IdentityDocumentDto {
  @ApiProperty({
    description: 'Document type',
    enum: ['passport', 'tax_id', 'known_traveler_number', 'passenger_redress_number'],
    example: 'passport',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Document number (e.g. passport number)', example: 'AB1234567' })
  @IsString()
  @IsNotEmpty()
  uniqueIdentifier: string;

  @ApiPropertyOptional({
    description: 'ISO country code of the issuing country',
    example: 'GB',
  })
  @IsString()
  @IsOptional()
  issuingCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Expiry date in YYYY-MM-DD format',
    example: '2030-06-15',
  })
  @IsString()
  @IsOptional()
  expiresOn?: string;
}

class LoyaltyProgrammeAccountDto {
  @ApiProperty({ description: 'Airline IATA code', example: 'BA' })
  @IsString()
  @IsNotEmpty()
  airlineIataCode: string;

  @ApiProperty({ description: 'Loyalty programme account number', example: '12901014' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;
}

class PassengerInfoDto {
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

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Passport or ID documents. Required for international flights when the airline demands it. ' +
      'The offer response includes passenger_identity_documents_required to indicate this.',
    type: [IdentityDocumentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IdentityDocumentDto)
  identityDocuments?: IdentityDocumentDto[];

  @ApiPropertyOptional({
    description: 'Frequent flyer / loyalty programme accounts',
    type: [LoyaltyProgrammeAccountDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoyaltyProgrammeAccountDto)
  loyaltyProgrammeAccounts?: LoyaltyProgrammeAccountDto[];

  // ============================================================
  // ✅ WAKANOW FIELDS (OPTIONAL - ONLY USED BY WAKANOW)
  // ============================================================
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

// ✅ Price breakdown DTO
export class PriceBreakdownDto {
  @ApiPropertyOptional({ description: 'Base price before any additions', example: 204028.73 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Markup amount applied', example: 20402.87 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  markupAmount?: number;

  @ApiPropertyOptional({ description: 'Markup percentage', example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  markupPercentage?: number;

  @ApiPropertyOptional({ description: 'Service fee amount', example: 10201.44 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceFee?: number;

  @ApiPropertyOptional({ description: 'Service fee percentage', example: 5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  serviceFeePercentage?: number;

  @ApiPropertyOptional({ description: 'Combined taxes (markup + service fee)', example: 30604.31 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxes?: number;

  @ApiPropertyOptional({ description: 'Combined tax percentage (markup% + service%)', example: 15 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxPercentage?: number;

  @ApiProperty({ description: 'Total amount including all fees', example: 244833.04 })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  totalAmount: number;

  @ApiProperty({ description: 'Currency code', example: 'NGN' })
  @IsString()
  @IsNotEmpty()
  currency: string;
}

/**
 * Payload to create a booking.
 */
export class CreateBookingDto {
  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @ApiProperty({ enum: Provider })
  @IsEnum(Provider)
  @IsNotEmpty()
  provider: Provider;

  // ✅ Legacy fields - keep for backward compatibility (marked as optional now)
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

  @ApiProperty({ type: PassengerInfoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PassengerInfoDto)
  passengerInfo?: PassengerInfoDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  providerBookingId?: string;

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

  // ✅ NEW: PNR number for Wakanow bookings (used for automatic ticketing)
  @ApiPropertyOptional({ 
    description: 'PNR number for Wakanow flight bookings (used for automatic ticketing)', 
    example: '2606250400161' 
  })
  @IsString()
  @IsOptional()
  pnrNumber?: string;

  // ============================================================
  // ✅ STRIPE PAYMENT METHOD ID (PCI COMPLIANT)
  // ============================================================
  @ApiPropertyOptional({
    description: 'Stripe PaymentMethod ID for PCI compliant payments. ' +
      'When provided, no raw card details are stored on the server.',
    example: 'pm_card_visa',
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  // ============================================================
  // ✅ PRICE BREAKDOWN
  // ============================================================
  @ApiPropertyOptional({
    description: 'Complete price breakdown including base price, markup, service fee, and taxes',
    type: PriceBreakdownDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceBreakdownDto)
  priceBreakdown?: PriceBreakdownDto;

  // ✅ Individual price fields (for flexibility and backward compatibility)
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

  // ✅ Helper methods to safely extract values
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