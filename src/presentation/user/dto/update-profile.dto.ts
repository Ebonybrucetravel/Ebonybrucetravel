import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
  PREFER_NOT_TO_SAY = 'Prefer not to say',
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Mr',
    description: 'Title used for bookings (e.g. Mr, Mrs, Ms, Miss, Dr)',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: '1992-05-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    enum: Gender,
    example: 'Male',
    description: 'Gender selection',
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;
}

