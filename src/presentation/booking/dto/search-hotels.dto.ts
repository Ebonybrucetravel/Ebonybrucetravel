import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Define GeographicCoordinatesDto first (used by LocationSearchDto)
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

export class GuestDto {
  @ApiProperty({ enum: ['adult', 'child'], description: 'Guest type' })
  @IsEnum(['adult', 'child'])
  type: 'adult' | 'child';

  @ApiPropertyOptional({
    description: 'Age of the guest (required for child type, must be 0-17)',
    minimum: 0,
    maximum: 17,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}

export class LocationSearchDto {
  @ApiProperty({
    description: 'Geographic coordinates for location-based search',
    example: { latitude: 51.5071, longitude: -0.1416 },
  })
  @ValidateNested()
  @Type(() => GeographicCoordinatesDto)
  geographic_coordinates: GeographicCoordinatesDto;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers (1-100, default: 5)',
    minimum: 1,
    maximum: 100,
    default: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  radius?: number;
}

export class AccommodationSearchDto {
  @ApiProperty({
    description: 'List of accommodation IDs to search (max 10 with rates, 200 without)',
    type: [String],
    example: ['acc_0000AWr2VsUNIF1Vl91xg0'],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiPropertyOptional({
    description: 'Whether to fetch rates for each accommodation',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fetch_rates?: boolean;
}

export class SearchHotelsDto {
  @ApiPropertyOptional({
    description: 'Location-based search (latitude/longitude with radius)',
    type: LocationSearchDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationSearchDto)
  location?: LocationSearchDto;

  @ApiPropertyOptional({
    description: 'Accommodation-based search (by accommodation IDs)',
    type: AccommodationSearchDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccommodationSearchDto)
  accommodation?: AccommodationSearchDto;

  @ApiProperty({
    description: 'Check-in date (ISO 8601 format, max 330 days in future)',
    example: '2024-06-04',
  })
  @IsDateString()
  check_in_date: string;

  @ApiProperty({
    description: 'Check-out date (ISO 8601 format, max 99 nights stay)',
    example: '2024-06-07',
  })
  @IsDateString()
  check_out_date: string;

  @ApiProperty({
    description: 'Number of rooms required',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  rooms: number;

  @ApiProperty({
    description: 'List of guests',
    type: [GuestDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestDto)
  guests: GuestDto[];

  @ApiPropertyOptional({
    description: 'Search only for rates with free cancellation',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  free_cancellation_only?: boolean;

  @ApiPropertyOptional({
    description: 'Whether search is from a mobile device',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  mobile?: boolean;

  @ApiPropertyOptional({
    description: 'List of negotiated rate IDs to include in search',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  negotiated_rate_ids?: string[];

  @ApiPropertyOptional({
    description: 'Currency code for price display (ISO 4217). Default: GBP. Supported: GBP, USD, EUR, NGN, JPY, CNY, GHS, KES, ZAR',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
    default: 'GBP',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'GBP';
}

