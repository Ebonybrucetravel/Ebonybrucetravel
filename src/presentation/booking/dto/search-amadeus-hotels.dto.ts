import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchAmadeusHotelsDto {
  @ApiPropertyOptional({
    description: 'Amadeus hotel IDs (8 chars each). Either hotelIds or cityCode required.',
    type: [String],
    example: ['MCLONGHM'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hotelIds?: string[];

  @ApiPropertyOptional({
    description: 'City IATA code (e.g., "LON" for London). Either hotelIds or cityCode required.',
    example: 'LON',
  })
  @IsOptional()
  @IsString()
  cityCode?: string;

  @ApiProperty({
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2026-06-04',
  })
  @IsDateString()
  checkInDate: string;

  @ApiProperty({
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2026-06-07',
  })
  @IsDateString()
  checkOutDate: string;

  @ApiPropertyOptional({
    description: 'Number of adults',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({
    description: 'Number of rooms',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  roomQuantity?: number;

  @ApiPropertyOptional({
    description: 'Price range per night (e.g., "200-300" or "-300" or "100"). Currency required if set.',
    example: '200-300',
  })
  @IsOptional()
  @IsString()
  priceRange?: string;

  @ApiPropertyOptional({
    description: 'Payment policy filter',
    enum: ['GUARANTEE', 'DEPOSIT', 'NONE'],
    default: 'NONE',
  })
  @IsOptional()
  @IsEnum(['GUARANTEE', 'DEPOSIT', 'NONE'])
  paymentPolicy?: 'GUARANTEE' | 'DEPOSIT' | 'NONE';

  @ApiPropertyOptional({
    description: 'Board type (meal plan)',
    enum: ['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'],
  })
  @IsOptional()
  @IsEnum(['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'])
  boardType?: 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';

  @ApiPropertyOptional({
    description: 'Include sold-out properties',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeClosed?: boolean;

  @ApiPropertyOptional({
    description: 'Return only cheapest offer per hotel',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  bestRateOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217). Default: GBP',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
    default: 'GBP',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'GBP';

  @ApiPropertyOptional({
    description: 'Country of residence (ISO 3166-1)',
    example: 'GB',
  })
  @IsOptional()
  @IsString()
  countryOfResidence?: string;

  @ApiPropertyOptional({
    description: 'Language for descriptions (ISO 639)',
    example: 'EN',
  })
  @IsOptional()
  @IsString()
  lang?: string;
}

