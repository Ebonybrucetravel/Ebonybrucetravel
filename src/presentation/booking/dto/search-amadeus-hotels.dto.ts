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

export class GeographicCoordinatesDto {
  @ApiProperty({
    description: 'Latitude (-90 to 90)',
    example: 51.5071,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude (-180 to 180)',
    example: -0.1416,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class SearchAmadeusHotelsDto {
  @ApiPropertyOptional({
    description: 'Amadeus hotel IDs (8 chars each). Either hotelIds, cityCode, or geographicCoordinates required.',
    type: [String],
    example: ['MCLONGHM'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hotelIds?: string[];

  @ApiPropertyOptional({
    description: 'City IATA code (e.g., "LON" for London). Either hotelIds, cityCode, or geographicCoordinates required.',
    example: 'LON',
  })
  @IsOptional()
  @IsString()
  cityCode?: string;

  @ApiPropertyOptional({
    description: 'Geographic coordinates for map-based search. Either hotelIds, cityCode, or geographicCoordinates required.',
    type: GeographicCoordinatesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeographicCoordinatesDto)
  geographicCoordinates?: GeographicCoordinatesDto;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers (when using geographicCoordinates)',
    minimum: 1,
    maximum: 100,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  radius?: number;

  @ApiPropertyOptional({
    description: 'Radius unit',
    enum: ['KM', 'MILE'],
    default: 'KM',
  })
  @IsOptional()
  @IsEnum(['KM', 'MILE'])
  radiusUnit?: 'KM' | 'MILE';

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

  // ==================== FILTERING OPTIONS ====================

  @ApiPropertyOptional({
    description: 'Hotel chain codes (2 chars each, e.g., ["MC", "HI"])',
    type: [String],
    example: ['MC'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chainCodes?: string[];

  @ApiPropertyOptional({
    description: 'Hotel amenities filter',
    type: [String],
    enum: [
      'SWIMMING_POOL',
      'SPA',
      'FITNESS_CENTER',
      'AIR_CONDITIONING',
      'RESTAURANT',
      'PARKING',
      'PETS_ALLOWED',
      'AIRPORT_SHUTTLE',
      'BUSINESS_CENTER',
      'DISABLED_FACILITIES',
      'WIFI',
      'MEETING_ROOMS',
      'NO_KID_ALLOWED',
      'TENNIS',
      'GOLF',
      'KITCHEN',
      'ANIMAL_WATCHING',
      'BABY-SITTING',
      'BEACH',
      'CASINO',
      'JACUZZI',
      'SAUNA',
      'SOLARIUM',
      'MASSAGE',
      'VALET_PARKING',
      'BAR or LOUNGE',
      'KIDS_WELCOME',
      'NO_PORN_FILMS',
      'MINIBAR',
      'TELEVISION',
      'WI-FI_IN_ROOM',
      'ROOM_SERVICE',
      'GUARDED_PARKG',
      'SERV_SPEC_MENU',
    ],
    example: ['SWIMMING_POOL', 'SPA', 'FITNESS_CENTER'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({
    description: 'Hotel star ratings (1-5)',
    type: [Number],
    enum: [1, 2, 3, 4, 5],
    example: [4, 5],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  ratings?: number[];

  @ApiPropertyOptional({
    description: 'Hotel source',
    enum: ['BEDBANK', 'DIRECTCHAIN', 'ALL'],
    default: 'ALL',
  })
  @IsOptional()
  @IsEnum(['BEDBANK', 'DIRECTCHAIN', 'ALL'])
  hotelSource?: 'BEDBANK' | 'DIRECTCHAIN' | 'ALL';

  // ==================== PAGINATION ====================

  @ApiPropertyOptional({
    description: 'Number of hotels per page',
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

