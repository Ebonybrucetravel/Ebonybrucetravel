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
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform, plainToInstance } from 'class-transformer';

function normalizePassenger(value: any): any {
  if (!value || typeof value !== 'object') return value;
  

  if (value.name && value.contact) {
    return value;
  }
  

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

function normalizePayment(value: any): any {
  if (!value) return value;
  

  if (value.methodOfPayment) {
    return value;
  }
  

  const result: any = {
    methodOfPayment: value.method || 'CREDIT_CARD',
  };
  
  if (value.paymentServiceProvider) {
    result.paymentServiceProvider = value.paymentServiceProvider;
  }
  
  if (value.paymentCard || value.creditCard) {
    const card = value.paymentCard || value.creditCard;
    const info = card.paymentCardInfo || card;
    result.creditCard = {
      vendorCode: info.vendorCode || 'VI',
      number: info.cardNumber || info.number,
      holderName: info.holderName,
      expiryDate: info.expiryDate,
      cvv: info.securityCode || info.cvv,
    };
  }
  
  if (value.paymentReference) {
    result.paymentReference = value.paymentReference;
  }
  
  return result;
}

export class PassengerNameDto {
  @ApiProperty({
    description: 'Passenger title',
    enum: ['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'],
    example: 'MR',
    default: 'MR',
  })
  @IsString()
  @IsOptional()
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
    example: 'Smith',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

export class PassengerContactDto {
  @ApiProperty({
    description: 'Passenger phone number (E.164 format)',
    example: '+441234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Passenger email address',
    example: 'john.smith@example.com',
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
    default: 'VI',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'])
  vendorCode: string = 'VI';

  @ApiProperty({
    description: 'Card number (16 digits)',
    example: '4111111111111111',
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
    example: 'John Smith',
  })
  @IsString()
  @IsNotEmpty()
  holderName: string;

  @ApiPropertyOptional({
    description: 'Card security code (CVV/CVC)',
    example: '123',
  })
  @IsOptional()
  @IsString()
  cvv?: string;
}

export class PaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['CREDIT_CARD', 'INVOICE'],
    example: 'CREDIT_CARD',
    default: 'CREDIT_CARD',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['CREDIT_CARD', 'INVOICE'])
  methodOfPayment: 'CREDIT_CARD' | 'INVOICE' = 'CREDIT_CARD';

  @ApiPropertyOptional({
    description: 'Payment service provider (e.g., STRIPE_CONNECT)',
    enum: ['STRIPE_CONNECT'],
    example: 'STRIPE_CONNECT',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['STRIPE_CONNECT'])
  paymentServiceProvider?: string;

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

export class PriceBreakdownDto {
  @ApiProperty({
    description: 'Base price (original offer price)',
    example: 50.00,
  })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    description: 'Markup percentage applied',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  markupPercentage: number;

  @ApiProperty({
    description: 'Markup amount',
    example: 5.00,
  })
  @IsNumber()
  @Min(0)
  markupAmount: number;

  @ApiProperty({
    description: 'Service fee',
    example: 2.50,
  })
  @IsNumber()
  @Min(0)
  serviceFee: number;

  @ApiProperty({
    description: 'Service fee percentage',
    example: 5,
  })
  @IsNumber()
  @Min(0)
  serviceFeePercentage: number;

  @ApiProperty({
    description: 'Taxes',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  taxes: number;

  @ApiProperty({
    description: 'Tax percentage',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  taxPercentage: number;

  @ApiProperty({
    description: 'Total amount (including all fees)',
    example: 57.50,
  })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'GBP',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;
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

  @ApiProperty({
    description: 'Offer price from search results (original price)',
    example: 50.00,
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

  @ApiPropertyOptional({
    description: 'Total amount (calculated with markup) - optional if priceBreakdown provided',
    example: 57.50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Structured price breakdown (preferred over totalAmount)',
    type: PriceBreakdownDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceBreakdownDto)
  priceBreakdown?: PriceBreakdownDto;

  @ApiPropertyOptional({
    description: 'Pickup location code (IATA)',
    example: 'CDG',
  })
  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @ApiPropertyOptional({
    description: 'Dropoff location code (IATA)',
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
    description: 'Transfer type',
    enum: ['PRIVATE', 'SHARED', 'TAXI', 'HOURLY', 'AIRPORT_EXPRESS', 'AIRPORT_BUS'],
    default: 'PRIVATE',
    example: 'PRIVATE',
  })
  @IsOptional()
  @IsEnum(['PRIVATE', 'SHARED', 'TAXI', 'HOURLY', 'AIRPORT_EXPRESS', 'AIRPORT_BUS'])
  transferType?: string = 'PRIVATE';

  @ApiPropertyOptional({
    description: 'Vehicle type description',
    example: 'Mercedes-Benz V-Class or similar',
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({
    description: 'Service provider name/code',
    example: 'ABC',
  })
  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @ApiPropertyOptional({
    description: 'Full offer data from search results',
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

  @ApiProperty({
    description: 'Flight number (required for car rental transfers)',
    example: 'AF380',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Flight number is required for car rental transfers' })
  flightNumber: string;

  @ApiProperty({
    description: 'Flight date (ISO 8601 format)',
    example: '2026-08-29',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Flight date is required for car rental transfers' })
  flightDate: string;

  @ApiPropertyOptional({
    description: 'Airline code (e.g., AF for Air France)',
    example: 'AF',
  })
  @IsOptional()
  @IsString()
  airlineCode?: string;

  @ApiPropertyOptional({
    description: 'Flight time (HH:MM format)',
    example: '14:30',
  })
  @IsOptional()
  @IsString()
  flightTime?: string;

  @ApiPropertyOptional({
    description: 'Agency email for booking',
    example: 'agency@example.com',
  })
  @IsOptional()
  @IsEmail()
  agencyEmail?: string;

  @ApiPropertyOptional({
    description: 'Billing address',
    type: BillingAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @ApiPropertyOptional({
    description: 'Payment details (optional - uses test card if not provided)',
    type: PaymentDto,
  })
  @IsOptional()
  @Transform(({ value }) => normalizePayment(value))
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  @ApiPropertyOptional({
    description: '[DEPRECATED] Driver information - use passengers array instead',
    deprecated: true,
    type: Object,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;
    return normalizePassenger(value);
  })
  driver?: any;

  getTotalAmount(): number {
    if (this.priceBreakdown) {
      return this.priceBreakdown.totalAmount;
    }
    return this.totalAmount || this.offerPrice;
  }

  getCurrency(): string {
    if (this.priceBreakdown) {
      return this.priceBreakdown.currency;
    }
    return this.currency;
  }

  getPrimaryPassenger(): PassengerDto {
    if (this.passengers && this.passengers.length > 0) {
      return this.passengers[0];
    }
    if (this.driver) {
      return this.driver;
    }
    throw new Error('No passenger found');
  }
}