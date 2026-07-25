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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ✅ Amadeus Transfer Types (from documentation)
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
  MBR = 'MBR', // Motorbike
  CAR = 'CAR', // Car
  SED = 'SED', // Sedan
  WGN = 'WGN', // Wagon
  ELC = 'ELC', // Electric car
  VAN = 'VAN', // Van or minivan
  SUV = 'SUV', // Sport utility vehicle
  LMS = 'LMS', // Limousine
  TRN = 'TRN', // Train
  BUS = 'BUS', // Bus
  HLC = 'HLC', // Helicopter
  JET = 'JET', // Jet
}

export class SearchCarRentalsDto {
  @ApiProperty({
    description: 'Pickup location (IATA code, e.g., CDG) or address details',
    example: 'CDG',
  })
  @IsString()
  @IsNotEmpty()
  startLocationCode: string;

  @ApiPropertyOptional({
    description: 'Drop-off location code (IATA code). If not provided, same as pickup.',
    example: 'NCE',
  })
  @IsOptional()
  @IsString()
  endLocationCode?: string;

  @ApiProperty({
    description: 'Pickup date and time in ISO 8601 format (YYYY-MM-DDThh:mm:ss)',
    example: '2026-07-26T10:30:00',
  })
  @IsDateString()
  startDateTime: string;

  @ApiProperty({
    description: 'Transfer service type',
    enum: TransferType,
    default: TransferType.PRIVATE,
    example: TransferType.PRIVATE,
  })
  @IsOptional()
  @IsEnum(TransferType)
  transferType?: TransferType = TransferType.PRIVATE;

  @ApiPropertyOptional({
    description: 'Number of passengers (1-9)',
    minimum: 1,
    maximum: 9,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  passengers?: number = 1;

  @ApiPropertyOptional({
    description: 'Duration in ISO 8601 format (PT2H30M). Required for HOURLY transfer type.',
    example: 'PT2H30M',
  })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({
    description: 'Preferred currency (ISO 4217)',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
    default: 'GBP',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'GBP';

  @ApiPropertyOptional({
    description: 'Vehicle category filter (ST, BU, FC)',
    enum: VehicleCategory,
    example: VehicleCategory.BU,
  })
  @IsOptional()
  @IsEnum(VehicleCategory)
  vehicleCategory?: VehicleCategory;

  @ApiPropertyOptional({
    description: 'Vehicle type filter',
    enum: VehicleCode,
    example: VehicleCode.VAN,
  })
  @IsOptional()
  @IsEnum(VehicleCode)
  vehicleCode?: VehicleCode;

  @ApiPropertyOptional({
    description: 'Provider codes (comma-separated). If not filled, all providers are searched.',
    example: 'TXO,FGT',
  })
  @IsOptional()
  @IsString()
  providerCodes?: string;

  @ApiPropertyOptional({
    description: 'Number of baggages to be supported by the vehicle',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  baggages?: number = 0;

  @ApiPropertyOptional({
    description: 'Corporate discount number (format: {providerCode}|{discountType}|{discountNumber})',
    example: 'ABC|CD|1122-DD-22',
  })
  @IsOptional()
  @IsString()
  discountNumbers?: string;

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