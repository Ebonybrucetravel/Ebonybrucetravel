import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceSuggestionsDto {
  @ApiProperty({
    description: 'Search query for airport/city name or IATA code (e.g., "heathrow", "LHR", "london")',
    example: 'heathrow',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Latitude for location-based search (-90 to 90)',
    example: 51.5071,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude for location-based search (-180 to 180)',
    example: -0.1416,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({
    description: 'Search radius in metres (for location-based search)',
    example: 10000,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rad?: number;
}

