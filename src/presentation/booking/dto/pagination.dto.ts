import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 200,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (from previous response)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Sort field (e.g., "total_amount", "total_duration")',
    enum: ['total_amount', 'total_duration', 'departure_time'],
    default: 'total_amount',
  })
  @IsOptional()
  @IsString()
  sort?: string = 'total_amount';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Number of items in current page' })
  count: number;

  @ApiProperty({ description: 'Total number of items available' })
  total: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiPropertyOptional({ description: 'Cursor for next page' })
  nextCursor?: string | null;

  @ApiPropertyOptional({ description: 'Cursor for previous page' })
  prevCursor?: string | null;

  @ApiProperty({ description: 'Whether there are more items' })
  hasMore: boolean;

  @ApiProperty({ description: 'Current page number (1-based)' })
  page: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
