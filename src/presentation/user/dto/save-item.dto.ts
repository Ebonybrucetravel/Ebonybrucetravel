import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ProductType, Provider } from '@prisma/client';

export class SaveItemDto {
  @ApiProperty({ enum: ProductType, example: 'HOTEL' })
  @IsEnum(ProductType)
  productType: ProductType;

  @ApiProperty({ example: 'Luxury Suite Colosseum' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Rome, Italy . 5 Star Hotel' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'https://images.example.com/hotel.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @IsNumber()
  rating?: number;

  @ApiPropertyOptional({ example: 'RTLNX123' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({ enum: Provider, example: 'AMADEUS' })
  @IsOptional()
  @IsEnum(Provider)
  provider?: Provider;

  @ApiPropertyOptional({ description: 'Full item data snapshot for offline display' })
  @IsOptional()
  itemData?: any;

  @ApiPropertyOptional({ example: 'Rome, Italy' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Beautiful hotel with pool view' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSavedItemNotesDto {
  @ApiProperty({ example: 'Great hotel, want to book for anniversary' })
  @IsString()
  notes: string;
}

export class ToggleSaveItemDto extends SaveItemDto {}

export class CheckSavedDto {
  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  productType: ProductType;

  @ApiProperty({ example: 'RTLNX123' })
  @IsString()
  @IsNotEmpty()
  providerId: string;
}

