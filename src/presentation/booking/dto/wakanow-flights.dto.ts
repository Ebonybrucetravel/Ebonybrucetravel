import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEmail,
  IsNumber,
  IsObject,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WakanowFlightSearchType {
  ONEWAY = 'Oneway',
  RETURN = 'Return',
  MULTIDESTINATION = 'Multidestination',
}

export enum WakanowTicketClass {
  ECONOMY = 'Y',
  BUSINESS = 'C',
  FIRST = 'F',
  PREMIUM_ECONOMY = 'W',
}


export class WakanowItineraryDto {
  @ApiProperty({ description: 'Departure airport IATA code (3 letters)', example: 'LOS' })
  @IsString()
  @IsNotEmpty()
  Departure: string;

  @ApiProperty({ description: 'Destination airport IATA code (3 letters)', example: 'ABV' })
  @IsString()
  @IsNotEmpty()
  Destination: string;

  @ApiProperty({ description: 'Departure date in MM/dd/yyyy format', example: '07/15/2026' })
  @IsString()
  @IsNotEmpty()
  DepartureDate: string;
}

export class SearchWakanowFlightsDto {
  @ApiProperty({ enum: WakanowFlightSearchType, description: 'Flight search type' })
  @IsEnum(WakanowFlightSearchType)
  flightSearchType: WakanowFlightSearchType;

  @ApiProperty({ description: 'Number of adult passengers', minimum: 1 })
  @IsInt()
  @Min(1)
  adults: number;

  @ApiPropertyOptional({ description: 'Number of child passengers', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number = 0;

  @ApiPropertyOptional({ description: 'Number of infant passengers', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  infants?: number = 0;

  @ApiPropertyOptional({
    enum: WakanowTicketClass,
    description: 'Ticket class. Y=Economy, C=Business, F=First, W=PremiumEconomy',
    default: WakanowTicketClass.ECONOMY,
  })
  @IsOptional()
  @IsEnum(WakanowTicketClass)
  ticketClass?: WakanowTicketClass = WakanowTicketClass.ECONOMY;

  @ApiPropertyOptional({
    description: 'Target currency for pricing (default: NGN)',
    default: 'NGN',
  })
  @IsOptional()
  @IsString()
  targetCurrency?: string = 'NGN';

  @ApiProperty({ description: 'Flight itineraries', type: [WakanowItineraryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WakanowItineraryDto)
  itineraries: WakanowItineraryDto[];

  @ApiPropertyOptional({
    description: 'Currency code for final price display (ISO 4217). Applied after conversion from NGN.',
    default: 'GBP',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'GBP';
}


export class SelectWakanowFlightDto {
  @ApiProperty({ description: 'SelectData string from the search results' })
  @IsString()
  @IsNotEmpty()
  selectData: string;

  @ApiPropertyOptional({ description: 'Target currency', default: 'NGN' })
  @IsOptional()
  @IsString()
  targetCurrency?: string = 'NGN';
}


export class PriceBreakdownDto {
  @ApiProperty({ description: 'Base price (before markup and service fee)' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Markup amount' })
  @IsNumber()
  @Min(0)
  markupAmount: number;

  @ApiProperty({ description: 'Markup percentage' })
  @IsNumber()
  @Min(0)
  markupPercentage: number;

  @ApiProperty({ description: 'Service fee amount' })
  @IsNumber()
  @Min(0)
  serviceFee: number;

  @ApiProperty({ description: 'Service fee percentage' })
  @IsNumber()
  @Min(0)
  serviceFeePercentage: number;

  @ApiProperty({ description: 'Taxes (markup + service fee combined)' })
  @IsNumber()
  @Min(0)
  taxes: number;

  @ApiProperty({ description: 'Tax percentage (markup% + service fee%)' })
  @IsNumber()
  @Min(0)
  taxPercentage: number;

  @ApiProperty({ description: 'Total amount (base + markup + service fee)' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ description: 'Currency code', example: 'NGN' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Breakdown description' })
  @IsOptional()
  @IsString()
  breakdown?: string;
}


export class WakanowPassengerDto {
  @ApiProperty({
    description: 'Passenger type',
    example: 'Adult',
    enum: ['Adult', 'Child', 'Infant'],
    default: 'Adult',
  })
  @IsString()
  @IsOptional()
  passengerType?: string = 'Adult';

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ description: 'Middle name' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'Date of birth (YYYY-MM-DD)', example: '1990-01-15' })
  @IsString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({ description: 'Phone number with country code', example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Gender', enum: ['Male', 'Female'] })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ description: 'Title', enum: ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'] })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Passport number (required for international flights)' })
  @IsOptional()
  @IsString()
  passportNumber?: string;

  @ApiPropertyOptional({ description: 'Passport expiry date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Passport issuing authority' })
  @IsOptional()
  @IsString()
  passportIssuingAuthority?: string;

  @ApiPropertyOptional({ description: 'Passport issue country code (ISO 2-letter)', example: 'NG' })
  @IsOptional()
  @IsString()
  passportIssueCountryCode?: string;

  @ApiPropertyOptional({ description: 'Address', example: '123 Fake Street' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 2-letter)', example: 'NG' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Lagos' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '100001' })
  @IsOptional()
  @IsString()
  postalCode?: string;
}


export class BookWakanowFlightDto {
  @ApiProperty({ description: 'Passenger details', type: [WakanowPassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WakanowPassengerDto)
  passengers: WakanowPassengerDto[];

  @ApiProperty({ description: 'Booking ID from the select response' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'SelectData from the select response (NOT from search)' })
  @IsString()
  @IsNotEmpty()
  selectData: string;

  @ApiPropertyOptional({ description: 'Target currency', default: 'NGN' })
  @IsOptional()
  @IsString()
  targetCurrency?: string = 'NGN';

  @ApiPropertyOptional({
    description: 'Price breakdown from the select response. If provided, these prices will be used instead of recalculating.',
    type: PriceBreakdownDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PriceBreakdownDto)
  priceBreakdown?: PriceBreakdownDto;
}


export class TicketWakanowFlightDto {
  @ApiProperty({ description: 'Wakanow Booking ID' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'PNR reference number from the book response' })
  @IsString()
  @IsNotEmpty()
  pnrNumber: string;

  @ApiPropertyOptional({
    description:
      'Local platform booking ID (from POST /bookings/wakanow/book). ' +
      'When provided, the local booking record will be updated to CONFIRMED after successful ticketing.',
  })
  @IsOptional()
  @IsString()
  localBookingId?: string;
}

export class ConfirmWakanowPaymentDto {
  @ApiProperty({ description: 'Local booking ID' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'Payment reference from payment provider' })
  @IsString()
  @IsNotEmpty()
  paymentReference: string;
}


export class IssueWakanowTicketDto {
  @ApiProperty({ description: 'Local booking ID' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;
}


export class CompleteWakanowBookingDto {
  @ApiProperty({ description: 'Payment reference from payment provider' })
  @IsString()
  @IsNotEmpty()
  paymentReference: string;
}

export class GetWakanowStatusDto {
  @ApiProperty({ description: 'Local booking ID' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;
}


export interface WakanowSearchResponse {
  success: boolean;
  data: {
    offers: any[];
    total_offers: number;
    selectData: string | null;
    message: string;
  };
  message: string;
}

export interface WakanowSelectResponse {
  success: boolean;
  data: {
    provider: string;
    booking_id: string | null;
    select_data: string;
    is_price_matched: boolean;
    is_passport_required: boolean;
    priceBreakdown: PriceBreakdownDto | null;
    basePrice: number | null;
    markupAmount: number | null;
    markupPercentage: number | null;
    serviceFee: number | null;
    serviceFeePercentage: number | null;
    taxes: number | null;
    taxPercentage: number | null;
    totalAmount: number | null;
    currency: string;
    flight_summary: any | null;
    fare_rules: string[];
    penalty_rules: string[] | null;
    terms_and_conditions: {
      TermsAndConditions: string[];
      TermsAndConditionImportantNotice: string;
    };
    custom_messages: any[];
    message: string;
  };
  message: string;
}

export interface WakanowBookResponse {
  success: boolean;
  data: {
    id: string;
    reference: string;
    userId: string;
    productType: string;
    status: string;
    provider: string;
    providerBookingId: string;
    totalAmount: number;
    currency: string;
    wakanow_booking_id: string;
    pnr_reference: string;
    requiresPayment: boolean;
    paymentStatus: string;
    localBookingId: string;
    paymentInstructions: {
      url: string;
      amount: number;
      currency: string;
      reference: string;
      description: string;
      passengerCount: number;
    };
    priceBreakdown: PriceBreakdownDto | null;
  };
  message: string;
}

export interface WakanowConfirmPaymentResponse {
  success: boolean;
  data: any;
  message: string;
  nextStep: {
    action: string;
    endpoint: string;
    description: string;
  };
}

export interface WakanowTicketResponse {
  success: boolean;
  data: any;
  message: string;
}

export interface WakanowStatusResponse {
  success: boolean;
  data: {
    id: string;
    reference: string;
    status: string;
    paymentStatus: string;
    provider: string;
    providerBookingId: string;
    pnr: string | null;
    pnrStatus: string | null;
    ticketStatus: string | null;
    ticketingStatus: string | null;
    createdAt: Date;
    updatedAt: Date;
    ticketIssuedAt: string | null;
    totalAmount: number;
    currency: string;
    canPay: boolean;
    canTicket: boolean;
    isComplete: boolean;
    isCancelled: boolean;
    isExpired: boolean;
    nextSteps: Array<{
      action: string;
      label: string;
      url?: string;
      description: string;
      priority: number;
    }>;
  };
  message: string;
}

export interface WakanowCompleteBookingResponse {
  success: boolean;
  data: {
    booking: any;
    payment: any;
  };
  message: string;
  nextStep: {
    action: string;
    description: string;
  };
}