import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Allowed values for "Service Interested In" dropdown (must match frontend) */
export const CONTACT_SERVICE_OPTIONS = [
  'Travel Services',
  'Logistics - DHL',
  'Educational Consulting',
  'Hotel Reservations',
  'Other',
] as const;
export type ContactServiceOption = (typeof CONTACT_SERVICE_OPTIONS)[number];

export class SubmitContactDto {
  @ApiProperty({ example: 'John Doe', description: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+44 1582 340807', description: 'Phone Number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    description: 'Service Interested In',
    enum: CONTACT_SERVICE_OPTIONS,
    example: 'Travel Services',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(CONTACT_SERVICE_OPTIONS)
  serviceInterestedIn: string;

  @ApiProperty({ example: 'Tell us how we can help you...' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Optional subject (not on form)' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  subject?: string;
}
