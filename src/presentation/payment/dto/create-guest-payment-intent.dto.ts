import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateGuestPaymentIntentDto {
  @ApiProperty({
    description: 'Booking reference for the guest booking',
    example: 'EBT-20260126-123456',
  })
  @IsString()
  @IsNotEmpty()
  bookingReference: string;

  @ApiProperty({
    description: 'Passenger email used for the guest booking',
    example: 'guest@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}


