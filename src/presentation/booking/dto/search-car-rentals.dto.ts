import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export enum TransferType {
  PRIVATE = 'PRIVATE',
  SHARED = 'SHARED',
  TAXI = 'TAXI',
  HOURLY = 'HOURLY',
  AIRPORT_EXPRESS = 'AIRPORT_EXPRESS',
  AIRPORT_BUS = 'AIRPORT_BUS',
  HELICOPTER = 'HELICOPTER',
  PRIVATE_JET = 'PRIVATE_JET',
}

// ✅ Amadeus Vehicle Categories (from documentation)
export enum VehicleCategory {
  ST = 'ST', // Standard Class
  BU = 'BU', // Business Class
  FC = 'FC', // First Class
}

// ✅ Amadeus Vehicle Types (from documentation)
export enum VehicleCode {
  CAR = 'CAR', // Car
  SED = 'SED', // Sedan
  WGN = 'WGN', // Wagon
  ELC = 'ELC', // Electric car
  VAN = 'VAN', // Van or minivan
  SUV = 'SUV', // Sport utility vehicle
  LMS = 'LMS', // Limousine

}

export class SearchCarRentalsDto {
  // ==================== LOCATION FIELDS ====================
  
  @ApiPropertyOptional({
    description: 'Pickup location (IATA code, e.g., CDG). Required if startAddressLine is not provided.',
    example: 'CDG',
  })
  @IsOptional()
  @IsString()
  @ValidateIf(o => !o.startAddressLine)
  startLocationCode?: string;

  @ApiPropertyOptional({
    description: 'Drop-off location (IATA code). If not provided, same as pickup.',
    example: 'NCE',
  })
  @IsOptional()
  @IsString()
  endLocationCode?: string;

  // ==================== ADDRESS FIELDS (for non-IATA searches) ====================
  
  @ApiPropertyOptional({
    description: 'Pickup address line. Required if startLocationCode is not provided.',
    example: 'Avenue de la Bourdonnais, 19',
  })
  @IsOptional()
  @IsString()
  @ValidateIf(o => !o.startLocationCode)
  startAddressLine?: string;

  @ApiPropertyOptional({
    description: 'Pickup city name. Required if startLocationCode is not provided.',
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  @ValidateIf(o => !o.startLocationCode)
  startCityName?: string;

  @ApiPropertyOptional({
    description: 'Pickup country code (ISO 3166-1 alpha-2). Required if startLocationCode is not provided.',
    example: 'FR',
  })
  @IsOptional()
  @IsString()
  @ValidateIf(o => !o.startLocationCode)
  startCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Pickup postal/zip code.',
    example: '75007',
  })
  @IsOptional()
  @IsString()
  startZip?: string;

  @ApiPropertyOptional({
    description: 'Drop-off address line.',
    example: 'Nice Côte d\'Azur Airport',
  })
  @IsOptional()
  @IsString()
  endAddressLine?: string;

  @ApiPropertyOptional({
    description: 'Drop-off city name.',
    example: 'Nice',
  })
  @IsOptional()
  @IsString()
  endCityName?: string;

  @ApiPropertyOptional({
    description: 'Drop-off country code (ISO 3166-1 alpha-2).',
    example: 'FR',
  })
  @IsOptional()
  @IsString()
  endCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Drop-off postal/zip code.',
    example: '06200',
  })
  @IsOptional()
  @IsString()
  endZip?: string;

  // ==================== DATE/TIME ====================

  @ApiProperty({
    description: 'Pickup date and time in ISO 8601 format (YYYY-MM-DDThh:mm:ss)',
    example: '2026-07-26T10:30:00',
  })
  @IsDateString()
  @IsNotEmpty()
  startDateTime: string;

  // ==================== TRANSFER TYPE ====================

  @ApiProperty({
    description: 'Transfer service type',
    enum: TransferType,
    default: TransferType.PRIVATE,
    example: TransferType.PRIVATE,
  })
  @IsOptional()
  @IsEnum(TransferType)
  transferType?: TransferType = TransferType.PRIVATE;

  // ==================== PASSENGERS ====================

  @ApiPropertyOptional({
    description: 'Number of passengers (1-9)',
    minimum: 1,
    maximum: 9,
    default: 1,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  passengers?: number = 1;

  // ==================== DURATION (for HOURLY) ====================

  @ApiPropertyOptional({
    description: 'Duration in ISO 8601 format (e.g., PT2H30M). Required for HOURLY transfer type.',
    example: 'PT2H30M',
  })
  @IsOptional()
  @IsString()
  @ValidateIf(o => o.transferType === TransferType.HOURLY)
  duration?: string;

  // ==================== CURRENCY ====================

  @ApiPropertyOptional({
    description: 'Preferred currency (ISO 4217)',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
    default: 'GBP',
    example: 'GBP',
  })
  @IsOptional()
  @IsString()
  @IsIn(['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'])
  currency?: string = 'GBP';

  // ==================== VEHICLE FILTERS ====================

  @ApiPropertyOptional({
    description: 'Vehicle category filter (ST = Standard, BU = Business, FC = First Class)',
    enum: VehicleCategory,
    example: VehicleCategory.BU,
  })
  @IsOptional()
  @IsEnum(VehicleCategory)
  vehicleCategory?: VehicleCategory;

  @ApiPropertyOptional({
    description: 'Vehicle type filter (CAR, SED, WGN, ELC, VAN, SUV, LMS)',
    enum: VehicleCode,
    example: VehicleCode.VAN,
  })
  @IsOptional()
  @IsEnum(VehicleCode)
  vehicleCode?: VehicleCode;

  // ==================== PROVIDER ====================

  @ApiPropertyOptional({
    description: 'Provider codes (comma-separated). If not provided, all providers are searched.',
    example: 'TXO,FGT',
  })
  @IsOptional()
  @IsString()
  providerCodes?: string;

  // ==================== BAGGAGE ====================

  @ApiPropertyOptional({
    description: 'Number of baggages to be supported by the vehicle',
    minimum: 0,
    default: 0,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  baggages?: number = 0;

  // ==================== DISCOUNTS ====================

  @ApiPropertyOptional({
    description: 'Corporate discount number (format: {providerCode}|{discountType}|{discountNumber})',
    example: 'ABC|CD|1122-DD-22',
  })
  @IsOptional()
  @IsString()
  discountNumbers?: string;

  // ==================== PAGINATION ====================

  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;
}