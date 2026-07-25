import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform, plainToInstance } from 'class-transformer';

/**
 * Normalize passenger from driver shape to passenger shape
 */
function normalizePassenger(value: any): any {
  if (!value || typeof value !== 'object') return value;
  
  // If it's already a passenger with name and contact, return as is
  if (value.name && value.contact) {
    return value;
  }
  
  // Convert from driver shape to passenger shape
  const firstName = value.firstName ?? value.name?.firstName;
  const lastName = value.lastName ?? value.name?.lastName;
  const email = value.email ?? value.contact?.email;
  const phone = value.phone ?? value.contact?.phone;
  const title = value.title && value.title !== '' ? value.title : 'MR';
  
  return {
    name: {
      title,
      firstName,
      lastName,
    },
    contact: {
      phone,
      email,
    },
  };
}

/**
 * Normalize payment from frontend format to Amadeus format
 */
function normalizePayment(value: any): any {
  if (!value) return value;
  
  // If it's already in Amadeus format (methodOfPayment), return as is
  if (value.methodOfPayment) {
    return value;
  }
  
  // Convert from frontend format (method) to Amadeus format (methodOfPayment)
  const result: any = {
    methodOfPayment: value.method || 'CREDIT_CARD',
  };
  
  // Handle credit card
  if (value.paymentCard) {
    const card = value.paymentCard;
    const info = card.paymentCardInfo || card;
    result.creditCard = {
      vendorCode: info.vendorCode || 'VI',
      number: info.cardNumber || info.number,
      holderName: info.holderName,
      expiryDate: info.expiryDate || info.expiryDate,
      cvv: info.securityCode || info.cvv,
    };
  }
  
  return result;
}

export class PassengerNameDto {
  @ApiProperty({
    description: 'Passenger title',
    enum: ['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'],
    example: 'MR',
  })
  @IsString()
  @IsEnum(['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'])
  title: string = 'MR';

  @ApiProperty({
    description: 'Passenger first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Passenger last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

export class PassengerContactDto {
  @ApiProperty({
    description: 'Passenger phone number (E.164 format)',
    example: '+33679278416',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Passenger email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class PassengerDto {
  @ApiProperty({
    description: 'Passenger name information',
    type: PassengerNameDto,
  })
  @ValidateNested()
  @Type(() => PassengerNameDto)
  name: PassengerNameDto;

  @ApiProperty({
    description: 'Passenger contact information',
    type: PassengerContactDto,
  })
  @ValidateNested()
  @Type(() => PassengerContactDto)
  contact: PassengerContactDto;
}

export class CreditCardDto {
  @ApiProperty({
    description: 'Card vendor code',
    enum: ['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'],
    example: 'VI',
  })
  @IsString()
  @IsEnum(['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'])
  vendorCode: string = 'VI';

  @ApiProperty({
    description: 'Card number (16 digits)',
    example: '4151289722471370',
  })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty({
    description: 'Card expiry date (MMYY format)',
    example: '1226',
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
  cvv: string;
}

export class PaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['CREDIT_CARD', 'INVOICE'],
    example: 'CREDIT_CARD',
  })
  @IsString()
  @IsEnum(['CREDIT_CARD', 'INVOICE'])
  methodOfPayment: 'CREDIT_CARD' | 'INVOICE' = 'CREDIT_CARD';

  @ApiPropertyOptional({
    description: 'Credit card details (required for CREDIT_CARD method)',
    type: CreditCardDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard?: CreditCardDto;

  @ApiPropertyOptional({
    description: 'Payment reference (required for INVOICE method)',
    example: 'INV-2024-001',
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

export class BillingAddressDto {
  @ApiPropertyOptional({
    description: 'Billing address line',
    example: '5 Avenue Anatole France',
  })
  @IsOptional()
  @IsString()
  line?: string;

  @ApiPropertyOptional({
    description: 'Postal/zip code',
    example: '75007',
  })
  @IsOptional()
  @IsString()
  zip?: string;

  @ApiPropertyOptional({
    description: 'City name',
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  cityName?: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'FR',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class CreateCarRentalBookingDto {
  @ApiProperty({
    description: 'Transfer offer ID from search results',
    example: '0cb11574-4a02-11e8-842f-0ed5f89f718b',
  })
  @IsString()
  @IsNotEmpty()
  offerId: string;

  @ApiProperty({
    description: 'Offer price from search results',
    example: 63.70,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
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
    description: 'Passengers array (at least one passenger required)',
    type: [PassengerDto],
    example: [
      {
        name: {
          title: 'MR',
          firstName: 'John',
          lastName: 'Smith',
        },
        contact: {
          phone: '+441234567890',
          email: 'john.smith@example.com',
        },
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  // ✅ Legacy support for driver field (will be converted to passengers)
  @ApiPropertyOptional({
    description: 'Driver information (legacy - use passengers array instead)',
    type: Object,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    // Convert driver to passenger format
    return normalizePassenger(value);
  })
  driver?: any;

  // ✅ Total amount (with markup)
  @ApiProperty({
    description: 'Total amount (calculated with markup)',
    example: 57.50,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  totalAmount: number;

  // ✅ Optional booking data
  @ApiPropertyOptional({
    description: 'Pickup location code',
    example: 'CDG',
  })
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @ApiPropertyOptional({
    description: 'Dropoff location code',
    example: 'NCE',
  })
  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @ApiPropertyOptional({
    description: 'Pickup date and time (ISO 8601)',
    example: '2026-07-26T10:30:00',
  })
  @IsOptional()
  @IsString()
  pickupDateTime?: string;

  @ApiPropertyOptional({
    description: 'Dropoff date and time (ISO 8601)',
    example: '2026-07-26T14:30:00',
  })
  @IsOptional()
  @IsString()
  dropoffDateTime?: string;

  @ApiPropertyOptional({
    description: 'Vehicle type description',
    example: 'Mercedes-Benz V-Class or similar',
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'Service provider name',
    example: 'ABC',
  })
  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @ApiPropertyOptional({
    description: 'Full offer data from search',
    example: {},
  })
  @IsOptional()
  @IsObject()
  offerData?: any;

  @ApiPropertyOptional({
    description: 'Special requests or notes',
    example: 'Child seat required, extra waiting time',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @ApiPropertyOptional({
    description: 'Flight number (for connected flights)',
    example: 'AF380',
  })
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @ApiPropertyOptional({
    description: 'Billing address',
    type: BillingAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  // ✅ Payment - optional (will use test card if not provided)
  @ApiPropertyOptional({
    description: 'Payment details (optional - uses test card if not provided)',
    type: PaymentDto,
  })
  @IsOptional()
  @Transform(({ value }) => normalizePayment(value))
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  // ✅ Transfer type (from Amadeus)
  @ApiPropertyOptional({
    description: 'Transfer type',
    enum: ['PRIVATE', 'SHARED', 'TAXI', 'HOURLY', 'AIRPORT_EXPRESS', 'AIRPORT_BUS'],
    default: 'PRIVATE',
  })
  @IsOptional()
  @IsEnum(['PRIVATE', 'SHARED', 'TAXI', 'HOURLY', 'AIRPORT_EXPRESS', 'AIRPORT_BUS'])
  transferType?: string = 'PRIVATE';
}