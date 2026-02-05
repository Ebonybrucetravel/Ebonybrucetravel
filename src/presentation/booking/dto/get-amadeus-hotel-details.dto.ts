import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, Min, IsDateString, IsString } from 'class-validator';

export class GetAmadeusHotelDetailsDto {
  // Note: hotelId comes from path parameter, not query string
  // It's extracted via @Param('hotelId') in the controller

  @ApiPropertyOptional({
    description: 'Specific offer ID to get detailed pricing for',
    example: 'TSXOJ6LFQ2',
  })
  @IsOptional()
  @IsString()
  offerId?: string;

  @ApiPropertyOptional({
    description: 'Check-in date (YYYY-MM-DD) - Required if you want current offers',
    example: '2026-06-04',
  })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @ApiPropertyOptional({
    description: 'Check-out date (YYYY-MM-DD) - Required if you want current offers',
    example: '2026-06-07',
  })
  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @ApiPropertyOptional({
    description: 'Number of adults (for current offers)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @ApiPropertyOptional({
    description: 'Number of rooms (for current offers)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  roomQuantity?: number;

  @ApiPropertyOptional({
    description: 'Include hotel images (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeImages?: boolean;

  @ApiPropertyOptional({
    description: 'Include hotel ratings/sentiments (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeRatings?: boolean;

  @ApiPropertyOptional({
    description: 'Include current offers if dates provided (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeOffers?: boolean;
}

