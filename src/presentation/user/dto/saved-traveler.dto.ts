import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsDateString,
  IsEnum,
  MaxLength,
  IsArray,
} from 'class-validator';

export class CreateSavedTravelerDto {
  @ApiPropertyOptional({
    example: 'Mr',
    description: 'Title used for bookings (e.g. Mr, Mrs, Ms, Miss, Dr)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  title?: string;

  @ApiProperty({ example: 'Seyi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Obadeyi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'seyi@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['Male', 'Female', 'Other'], example: 'Male' })
  @IsOptional()
  @IsEnum(['Male', 'Female', 'Other'])
  gender?: string;

  @ApiPropertyOptional({
    enum: ['Self', 'Spouse', 'Child', 'Parent', 'Friend', 'Colleague', 'Other'],
    example: 'Spouse',
  })
  @IsOptional()
  @IsEnum(['Self', 'Spouse', 'Child', 'Parent', 'Friend', 'Colleague', 'Other'])
  relationship?: string;

  @ApiPropertyOptional({ example: 'A12345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNumber?: string;

  @ApiPropertyOptional({ example: 'NG', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  passportCountry?: string;

  @ApiPropertyOptional({ example: '2030-12-31' })
  @IsOptional()
  @IsDateString()
  passportExpiry?: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string;

  @ApiPropertyOptional({ example: 'FF123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  frequentFlyerNumber?: string;

  @ApiPropertyOptional({ example: 'BA', description: 'Airline IATA code' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  frequentFlyerAirline?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSavedTravelerDto extends PartialType(CreateSavedTravelerDto) {}

export class GetTravelersByIdsDto {
  @ApiProperty({
    example: ['clx123', 'clx456'],
    description: 'Array of saved traveler IDs to fetch for checkout',
  })
  @IsArray()
  @IsString({ each: true })
  travelerIds: string[];
}

