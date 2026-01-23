import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CabinClass {
  FIRST = 'first',
  BUSINESS = 'business',
  PREMIUM_ECONOMY = 'premium_economy',
  ECONOMY = 'economy',
}

export enum PassengerType {
  ADULT = 'adult',
  CHILD = 'child',
  INFANT_WITHOUT_SEAT = 'infant_without_seat',
}

export class PassengerDto {
  @ApiPropertyOptional({ enum: PassengerType, description: 'Passenger type' })
  @IsOptional()
  @IsEnum(PassengerType)
  type?: PassengerType;

  @ApiPropertyOptional({ description: 'Passenger age (if type is not specified)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiPropertyOptional({
    description: 'Family name (required if loyalty programme accounts are provided)',
  })
  @IsOptional()
  @IsString()
  family_name?: string;

  @ApiPropertyOptional({
    description: 'Given name (required if loyalty programme accounts are provided)',
  })
  @IsOptional()
  @IsString()
  given_name?: string;

  @ApiPropertyOptional({ description: 'Fare type (e.g., "student", "contract_bulk")' })
  @IsOptional()
  @IsString()
  fare_type?: string;
}

export class SearchFlightsDto {
  @ApiProperty({ description: 'Origin airport IATA code (e.g., "LHR", "JFK")' })
  @IsString()
  origin: string;

  @ApiProperty({ description: 'Destination airport IATA code (e.g., "LHR", "JFK")' })
  @IsString()
  destination: string;

  @ApiProperty({ description: 'Departure date in ISO 8601 format (e.g., "2024-04-24")' })
  @IsDateString()
  departureDate: string;

  @ApiPropertyOptional({ description: 'Return date in ISO 8601 format (for round trips)' })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty({
    description: 'Number of passengers',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  passengers: number;

  @ApiPropertyOptional({
    enum: CabinClass,
    description: 'Cabin class preference',
    default: CabinClass.ECONOMY,
  })
  @IsOptional()
  @IsEnum(CabinClass)
  cabinClass?: CabinClass;

  @ApiPropertyOptional({
    description: 'Maximum number of connections (0 for direct flights only)',
    default: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxConnections?: number;

  @ApiPropertyOptional({
    description: 'Passenger details (optional - defaults to adults if not specified)',
    type: [PassengerDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengerDetails?: PassengerDto[];
}
