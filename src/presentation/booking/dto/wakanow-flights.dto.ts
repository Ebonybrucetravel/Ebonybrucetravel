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
  IsDateString,
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
  Departure: string;
  @ApiProperty({ description: 'Destination airport IATA code (3 letters)', example: 'ABV' })
  @IsString()
  Destination: string;
  @ApiProperty({ description: 'Departure date in MM/dd/yyyy format', example: '07/15/2026' })
  @IsString()
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
  selectData: string;
  @ApiPropertyOptional({ description: 'Target currency', default: 'NGN' })
  @IsOptional()
  @IsString()
  targetCurrency?: string = 'NGN';
}
export class WakanowPassengerDto {
  @ApiProperty({ description: 'Passenger type', example: 'Adult', enum: ['Adult', 'Child', 'Infant'] })
  @IsString()
  passengerType: string;
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  firstName: string;
  @ApiPropertyOptional({ description: 'Middle name' })
  @IsOptional()
  @IsString()
  middleName?: string;
  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  lastName: string;
  @ApiProperty({ description: 'Date of birth (ISO 8601 or MM/dd/yyyy)', example: '1990-01-15' })
  @IsString()
  dateOfBirth: string;
  @ApiProperty({ description: 'Phone number with country code', example: '+2348012345678' })
  @IsString()
  phoneNumber: string;
  @ApiProperty({ description: 'Email address' })
  @IsString()
  email: string;
  @ApiProperty({ description: 'Gender', enum: ['Male', 'Female'] })
  @IsString()
  gender: string;
  @ApiProperty({ description: 'Title', enum: ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr'] })
  @IsString()
  title: string;
  @ApiPropertyOptional({ description: 'Passport number (required for international flights)' })
  @IsOptional()
  @IsString()
  passportNumber?: string;
  @ApiPropertyOptional({ description: 'Passport expiry date (ISO 8601 or MM/dd/yyyy)' })
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
  @ApiProperty({ description: 'Address', example: '123 Fake Street' })
  @IsString()
  address: string;
  @ApiProperty({ description: 'Country', example: 'Nigeria' })
  @IsString()
  country: string;
  @ApiProperty({ description: 'Country code (ISO 2-letter)', example: 'NG' })
  @IsString()
  countryCode: string;
  @ApiProperty({ description: 'City', example: 'Lagos' })
  @IsString()
  city: string;
  @ApiProperty({ description: 'Postal code', example: '100001' })
  @IsString()
  postalCode: string;
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
  bookingId: string;
  @ApiProperty({ description: 'SelectData from the select response (NOT from search)' })
  @IsString()
  selectData: string;
  @ApiPropertyOptional({ description: 'Target currency', default: 'NGN' })
  @IsOptional()
  @IsString()
  targetCurrency?: string = 'NGN';
}
export class TicketWakanowFlightDto {
  @ApiProperty({ description: 'Wakanow Booking ID' })
  @IsString()
  bookingId: string;
  @ApiProperty({ description: 'PNR reference number from the book response' })
  @IsString()
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
