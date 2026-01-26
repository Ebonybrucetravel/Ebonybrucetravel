import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Booking ID to create payment intent for',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;
}

