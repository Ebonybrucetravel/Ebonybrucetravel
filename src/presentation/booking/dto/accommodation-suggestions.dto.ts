import { IsString, IsNotEmpty, MinLength, IsOptional, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({
    description: 'Geographic coordinates for location-based filtering',
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
  @IsNumber()
  @Min(1)
  @Max(100)
  radius?: number;
}

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

export class AccommodationSuggestionsDto {
  @ApiProperty({
    description: 'Search query (minimum 3 characters)',
    example: 'london',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  query: string;

  @ApiPropertyOptional({
    description: 'Location filter (optional)',
    type: LocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}

