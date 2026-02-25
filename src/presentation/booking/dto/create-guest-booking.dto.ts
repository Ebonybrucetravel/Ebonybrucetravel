import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductType, Provider } from '@prisma/client';

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

export class CreateGuestBookingDto {
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

  @ApiProperty({ type: GuestPassengerInfoDto })
  @ValidateNested()
  @Type(() => GuestPassengerInfoDto)
  passengerInfo: GuestPassengerInfoDto;
}
