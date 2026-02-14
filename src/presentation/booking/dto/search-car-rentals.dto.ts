import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchCarRentalsDto {
  @ApiProperty({
    description: 'Pickup location code (airport IATA code or city code)',
    example: 'LHR',
  })
  @IsString()
  @IsNotEmpty()
  pickupLocationCode: string;

  @ApiPropertyOptional({
    description: 'Drop-off location code (if different from pickup). If not provided, same as pickup.',
    example: 'LHR',
  })
  @IsOptional()
  @IsString()
  dropoffLocationCode?: string;

  @ApiProperty({
    description:
      'Pickup date and time in ISO 8601 format (date + time required). E.g. 2026-06-04T10:00:00. Time is used for duration and Amadeus.',
    example: '2026-06-04T10:00:00',
  })
  @IsDateString()
  pickupDateTime: string;

  @ApiPropertyOptional({
    description:
      'Drop-off date and time in ISO 8601 format (date + time required when provided). E.g. 2026-06-07T10:00:00. If omitted, defaults to pickup + 24 hours.',
    example: '2026-06-07T10:00:00',
  })
  @IsOptional()
  @IsDateString()
  dropoffDateTime?: string;

  @ApiPropertyOptional({
    description: 'Number of passengers',
    minimum: 1,
    maximum: 9,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  passengers?: number;

  @ApiPropertyOptional({
    description: 'Vehicle types filter',
    type: [String],
    enum: ['SEDAN', 'SUV', 'VAN', 'CONVERTIBLE', 'COUPE', 'HATCHBACK', 'WAGON', 'PICKUP'],
    example: ['SEDAN', 'SUV'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['SEDAN', 'SUV', 'VAN', 'CONVERTIBLE', 'COUPE', 'HATCHBACK', 'WAGON', 'PICKUP'], {
    each: true,
  })
  vehicleTypes?: string[];

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217). Default: GBP. Accepts either "currency" or "targetCurrency".',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
    default: 'GBP',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'GBP';

  /** Alias for currency (same meaning). If both sent, targetCurrency takes precedence. */
  @ApiPropertyOptional({
    description: 'Same as currency. Use either currency or targetCurrency.',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
  })
  @IsOptional()
  @IsString()
  targetCurrency?: string;

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

