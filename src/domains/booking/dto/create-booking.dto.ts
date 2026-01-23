import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsNumber } from 'class-validator';
import { ProductType, Provider } from '@prisma/client';

export class CreateBookingDto {
  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @IsEnum(Provider)
  @IsNotEmpty()
  provider: Provider;

  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsObject()
  @IsNotEmpty()
  bookingData: Record<string, any>;

  @IsObject()
  @IsOptional()
  passengerInfo?: Record<string, any>;
}
