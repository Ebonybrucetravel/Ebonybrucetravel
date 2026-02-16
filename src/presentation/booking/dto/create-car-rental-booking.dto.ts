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
import { Type, Transform } from 'class-transformer';

/**
 * Normalize driver from either flat shape or nested shape (name + contact).
 * Returns only whitelisted flat fields so forbidNonWhitelisted does not reject name/contact.
 */
function normalizeDriver(value: any): any {
  if (!value || typeof value !== 'object') return value;
  const firstName = value.firstName ?? value.name?.firstName;
  const lastName = value.lastName ?? value.name?.lastName;
  const email = value.email ?? value.contact?.email;
  const phone = value.phone ?? value.contact?.phone;
  const title = value.title && value.title !== '' ? value.title : 'MR';
  return {
    title,
    firstName,
    lastName,
    phone,
    email,
    ...(value.dateOfBirth != null && { dateOfBirth: value.dateOfBirth }),
    ...(value.licenseNumber != null && { licenseNumber: value.licenseNumber }),
    ...(value.licenseCountry != null && { licenseCountry: value.licenseCountry }),
  };
}

/**
 * Normalize payment so paymentCardInfo (frontend) is mapped to paymentCard fields.
 * Frontend may send payment.paymentCard.paymentCardInfo: { vendorCode, cardNumber, ... }.
 * Returns payment with only method + paymentCard (flat card fields, no paymentCardInfo).
 */
function normalizePayment(value: any): any {
  if (!value?.paymentCard || typeof value.paymentCard !== 'object') return value;
  const card = value.paymentCard;
  const info = card.paymentCardInfo;
  if (info && typeof info === 'object') {
    const { paymentCardInfo: _, ...rest } = card;
    return { method: value.method, paymentCard: { ...rest, ...info } };
  }
  return value;
}

export class CarRentalDriverDto {
  @ApiPropertyOptional({
    description: 'Driver title (defaults to MR if omitted or when using nested name/contact)',
    enum: ['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'],
    example: 'MR',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'])
  title?: string;

  @ApiProperty({
    description: 'Driver first name (or driver.name.firstName)',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Driver last name (or driver.name.lastName)',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Driver phone number E.164 (or driver.contact.phone)',
    example: '+33679278416',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Driver email (or driver.contact.email)',
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
    description:
      'Driver information. Accepts flat { title?, firstName, lastName, phone, email } or nested { name: { firstName, lastName }, contact: { email, phone } }. Title defaults to MR if omitted.',
    type: CarRentalDriverDto,
  })
  @Transform(({ value }) => normalizeDriver(value))
  @ValidateNested()
  @Type(() => CarRentalDriverDto)
  driver: CarRentalDriverDto;

  @ApiPropertyOptional({
    description:
      'Payment card (guest card). Accepts paymentCard with card fields directly, or paymentCard.paymentCardInfo: { vendorCode, cardNumber, expiryDate, holderName, securityCode }. Omit when using merchant model.',
    type: CarRentalPaymentDto,
  })
  @IsOptional()
  @Transform(({ value }) => (value && value.paymentCard ? normalizePayment(value) : value))
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

