import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsNumber, ValidateNested } from 'class-validator';
import { ProductType, Provider } from '@prisma/client';
import { Type } from 'class-transformer';

// ✅ Price breakdown DTO
export class PriceBreakdownDto {
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @IsNumber()
  @IsOptional()
  markupAmount?: number;

  @IsNumber()
  @IsOptional()
  markupPercentage?: number;

  @IsNumber()
  @IsOptional()
  serviceFee?: number;

  @IsNumber()
  @IsOptional()
  serviceFeePercentage?: number;

  @IsNumber()
  @IsOptional()
  taxes?: number;

  @IsNumber()
  @IsOptional()
  taxPercentage?: number;

  @IsNumber()
  @IsNotEmpty()
  totalAmount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;
}

export class CreateBookingDto {
  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @IsEnum(Provider)
  @IsNotEmpty()
  provider: Provider;

  // ✅ Legacy fields - keep for backward compatibility
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsObject()
  @IsNotEmpty()
  bookingData: Record<string, any>;

  @IsObject()
  @IsOptional()
  passengerInfo?: Record<string, any>;

  // ✅ New price breakdown field
  @ValidateNested()
  @Type(() => PriceBreakdownDto)
  @IsOptional()
  priceBreakdown?: PriceBreakdownDto;

  // ✅ Individual price fields (for flexibility)
  @IsNumber()
  @IsOptional()
  markupAmount?: number;

  @IsNumber()
  @IsOptional()
  markupPercentage?: number;

  @IsNumber()
  @IsOptional()
  serviceFee?: number;

  @IsNumber()
  @IsOptional()
  serviceFeePercentage?: number;

  @IsNumber()
  @IsOptional()
  taxes?: number;

  @IsNumber()
  @IsOptional()
  taxPercentage?: number;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  // ✅ Wakanow specific fields
  @IsString()
  @IsOptional()
  bookingId?: string;

  @IsString()
  @IsOptional()
  selectData?: string;
}