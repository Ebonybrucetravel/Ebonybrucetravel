import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CarRentalDriverDto {
  @ApiProperty({
    description: 'Driver title',
    enum: ['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'],
    example: 'MR',
  })
  @IsString()
  @IsEnum(['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'])
  title: string;

  @ApiProperty({
    description: 'Driver first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Driver last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Driver phone number (E.164 format)',
    example: '+33679278416',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Driver email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Driver date of birth (YYYY-MM-DD)',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Driver license number',
    example: 'DL123456',
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({
    description: 'Driver license country code (ISO 3166-1 alpha-2)',
    example: 'GB',
  })
  @IsOptional()
  @IsString()
  licenseCountry?: string;
}

export class CarRentalPaymentCardDto {
  @ApiProperty({
    description: 'Card vendor code',
    enum: ['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'],
    example: 'VI',
  })
  @IsString()
  @IsEnum(['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'])
  vendorCode: string;

  @ApiProperty({
    description: 'Card number (16 digits)',
    example: '4151289722471370',
  })
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty({
    description: 'Card expiry date (YYYY-MM format)',
    example: '2026-08',
  })
  @IsString()
  @IsNotEmpty()
  expiryDate: string;

  @ApiProperty({
    description: 'Card holder name (as on card)',
    example: 'JOHN DOE',
  })
  @IsString()
  @IsNotEmpty()
  holderName: string;

  @ApiProperty({
    description: 'Card security code (CVV/CVC)',
    example: '123',
  })
  @IsString()
  @IsNotEmpty()
  securityCode: string;
}

export class CarRentalPaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['CREDIT_CARD'],
    example: 'CREDIT_CARD',
  })
  @IsString()
  @IsEnum(['CREDIT_CARD'])
  method: string;

  @ApiProperty({
    description: 'Payment card information',
    type: CarRentalPaymentCardDto,
  })
  @ValidateNested()
  @Type(() => CarRentalPaymentCardDto)
  paymentCard: CarRentalPaymentCardDto;
}

export class CreateCarRentalBookingDto {
  @ApiProperty({
    description: 'Transfer offer ID from search results',
    example: 'TRF123456',
  })
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty({
    description: 'Offer price from search results (final price after markup)',
    example: 250.00,
  })
  @IsNumber()
  @IsNotEmpty()
  offerPrice: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
    example: 'GBP',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Driver information',
    type: CarRentalDriverDto,
  })
  @ValidateNested()
  @Type(() => CarRentalDriverDto)
  driver: CarRentalDriverDto;

  @ApiPropertyOptional({
    description:
      'Payment card (guest card). Omit when using merchant payment model: customer pays via Stripe, agency pays Amadeus.',
    type: CarRentalPaymentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarRentalPaymentDto)
  payment?: CarRentalPaymentDto;

  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Child seat required',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}

