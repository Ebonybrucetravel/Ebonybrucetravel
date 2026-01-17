import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductType, Provider } from '@prisma/client';

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

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  dateOfBirth?: string;
}

export class CreateBookingDto {
  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @ApiProperty({ enum: Provider })
  @IsEnum(Provider)
  @IsNotEmpty()
  provider: Provider;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

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
}

