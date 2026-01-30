import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class HotelGuestDto {
  @ApiProperty({ description: 'Guest first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  given_name: string;

  @ApiProperty({ description: 'Guest last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  family_name: string;

  @ApiProperty({ enum: ['adult', 'child'], description: 'Guest type' })
  @IsEnum(['adult', 'child'])
  type: 'adult' | 'child';

  @ApiPropertyOptional({
    description: 'Age of the guest (required for child type)',
    minimum: 0,
    maximum: 17,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}

export class CreateHotelBookingDto {
  @ApiProperty({
    description: 'Quote ID from create quote endpoint',
    example: 'quo_0000BTVRuKZTavzrZDJ4cb',
  })
  @IsString()
  @IsNotEmpty()
  quote_id: string;

  @ApiProperty({
    description: 'Lead guest email address',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Lead guest phone number in E.164 format',
    example: '+442080160509',
  })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({
    description: 'List of guests for the booking',
    type: [HotelGuestDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HotelGuestDto)
  guests: HotelGuestDto[];

  @ApiPropertyOptional({
    description: 'Special requests for the accommodation',
    example: 'Late check-in requested',
  })
  @IsOptional()
  @IsString()
  accommodation_special_requests?: string;

  @ApiPropertyOptional({
    description: 'Payment object (for card payments with 3D Secure)',
    example: { three_d_secure_session_id: '3ds_0000AWr2XsTRIF1Vp34gh5' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDto)
  payment?: PaymentDto;

  @ApiPropertyOptional({
    description: 'Metadata key-value pairs (max 50 pairs)',
    example: { customer_reference_number: 'DLXYYZ5' },
  })
  @IsOptional()
  metadata?: Record<string, string>;
}

export class PaymentDto {
  @ApiPropertyOptional({
    description: '3D Secure session ID for card payments',
    example: '3ds_0000AWr2XsTRIF1Vp34gh5',
  })
  @IsOptional()
  @IsString()
  three_d_secure_session_id?: string;
}

