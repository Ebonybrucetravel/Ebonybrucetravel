import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PaxDto {
    @ApiProperty({ example: 'AD', enum: ['AD', 'CH'], description: 'Pax type: AD for Adult, CH for Child' })
    @IsString()
    @IsNotEmpty()
    type: 'AD' | 'CH';

    @ApiPropertyOptional({ example: 8, description: 'Age of the pax (required for CH)' })
    @IsOptional()
    @IsNumber()
    age?: number;
}

export class OccupancyDto {
    @ApiProperty({ example: 1, description: 'Number of rooms with this occupancy' })
    @IsNumber()
    @Min(1)
    rooms: number;

    @ApiProperty({ example: 2, description: 'Number of adults per room' })
    @IsNumber()
    @Min(1)
    adults: number;

    @ApiProperty({ example: 0, description: 'Number of children per room' })
    @IsNumber()
    @Min(0)
    children: number;

    @ApiPropertyOptional({ type: [PaxDto], description: 'List of passengers for this room (needed if children exist to provide ages)' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaxDto)
    paxes?: PaxDto[];
}

export class SearchHotelbedsDto {
    @ApiProperty({ example: '2024-12-01', description: 'Check-in date (YYYY-MM-DD)' })
    @IsString()
    @IsNotEmpty()
    checkInDate: string;

    @ApiProperty({ example: '2024-12-05', description: 'Check-out date (YYYY-MM-DD)' })
    @IsString()
    @IsNotEmpty()
    checkOutDate: string;

    @ApiPropertyOptional({ example: 'PMI', description: 'Destination code (e.g. PMI for Mallorca)' })
    @IsOptional()
    @IsString()
    destinationCode?: string;

    @ApiPropertyOptional({ example: [1, 2, 3], description: 'Specific hotel IDs to search' })
    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    hotelIds?: number[];

    @ApiProperty({ type: [OccupancyDto], description: 'Room occupancy requirements' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OccupancyDto)
    occupancies: OccupancyDto[];

    @ApiPropertyOptional({ example: 'ENG', description: 'Language code (default: ENG)' })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiPropertyOptional({ example: 'GBP', description: 'Currency to convert to (display only). Actual search is usually done in supplier default currency.' })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiPropertyOptional({ example: 1, description: 'Page number for pagination (1-based). Default: 1.' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ example: 20, description: 'Number of hotels per page (max 100). Default: 20.' })
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number;
}
