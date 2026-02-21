import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateBookingDto } from '@presentation/booking/dto/create-booking.dto';

/**
 * Admin creates a booking on behalf of a customer. Same payload as user booking + userId.
 * After creation, admin pays via the same flow: POST /payments/stripe/create-intent (or Amadeus charge-margin).
 */
export class CreateBookingOnBehalfDto extends CreateBookingDto {
  @ApiProperty({ description: 'Customer user ID for whom the booking is created' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
