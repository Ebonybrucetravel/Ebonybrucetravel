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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType, Provider } from '@prisma/client';

// ✅ Reuse PriceBreakdownDto from create-booking.dto
import { PriceBreakdownDto } from './create-booking.dto';

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
 *     "phone": "+2348000000000"
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

  @ApiProperty({ type: GuestPassengerInfoDto })
  @ValidateNested()
  @Type(() => GuestPassengerInfoDto)
  passengerInfo: GuestPassengerInfoDto;

  // ✅ New price breakdown field
  @ApiPropertyOptional({
    description: 'Complete price breakdown including base price, markup, service fee, and taxes',
    type: PriceBreakdownDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceBreakdownDto)
  priceBreakdown?: PriceBreakdownDto;

  // ✅ Individual price fields (for flexibility)
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

  @ApiPropertyOptional({ description: 'Wakanow booking ID' })
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Wakanow select data' })
  @IsString()
  @IsOptional()
  selectData?: string;

  @ApiPropertyOptional({ description: 'Provider booking ID' })
  @IsString()
  @IsOptional()
  providerBookingId?: string;

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
}