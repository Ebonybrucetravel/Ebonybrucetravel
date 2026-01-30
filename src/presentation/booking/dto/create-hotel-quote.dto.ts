import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHotelQuoteDto {
  @ApiProperty({
    description: 'Rate ID from search results',
    example: 'rat_0000BTVRuKZTavzrZDJ4cb',
  })
  @IsString()
  @IsNotEmpty()
  rate_id: string;

  @ApiProperty({
    description: 'Search result ID from hotel search',
    example: 'srr_0000ASVBuJVLdmqtZDJ4ca',
  })
  @IsString()
  @IsNotEmpty()
  search_result_id: string;

  @ApiPropertyOptional({
    description: 'Loyalty programme account number (if required by rate)',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  loyalty_programme_account_number?: string;
}

