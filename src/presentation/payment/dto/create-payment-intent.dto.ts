import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Booking ID to create payment intent for',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiPropertyOptional({
    description: 'Voucher code to apply discount (must be validated first)',
    example: 'EBT-V-A1B2C3D4',
  })
  @IsOptional()
  @IsString()
  voucherCode?: string;
}

