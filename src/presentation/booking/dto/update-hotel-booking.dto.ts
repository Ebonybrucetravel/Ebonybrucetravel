import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsObject, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePaymentCardInfoDto {
  @ApiPropertyOptional({ description: 'Card vendor code', example: 'VI' })
  @IsOptional()
  @IsString()
  vendorCode?: string;

  @ApiPropertyOptional({ description: 'Card number', example: '4242424242424242' })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({ description: 'Expiry date (YYYY-MM)', example: '2026-12' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Card holder name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  holderName?: string;

  @ApiPropertyOptional({ description: 'Security code', example: '123' })
  @IsOptional()
  @IsString()
  securityCode?: string;
}

export class UpdatePaymentCardDto {
  @ApiPropertyOptional({ description: 'Payment card info', type: UpdatePaymentCardInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentCardInfoDto)
  paymentCardInfo?: UpdatePaymentCardInfoDto;
}

export class UpdatePaymentDto {
  @ApiPropertyOptional({ description: 'Payment method', example: 'CREDIT_CARD' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Payment card details', type: UpdatePaymentCardDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentCardDto)
  paymentCard?: UpdatePaymentCardDto;
}

export class UpdateHotelBookingRequestDto {
  @ApiProperty({
    description: 'Type of update being performed',
    enum: ['dates', 'special', 'loyalty', 'payment'],
  })
  @IsString()
  @IsNotEmpty()
  updateType: 'dates' | 'special' | 'loyalty' | 'payment';

  @ApiPropertyOptional({
    description: 'Update payload containing the changes',
    example: {
      hotelBooking: {
        roomAssociation: {
          specialRequest: 'Guest will arrive at midnight'
        }
      }
    },
  })
  @IsOptional()
  @IsObject()
  payload?: any;

  @ApiProperty({
    description: 'Amadeus provider booking ID',
    example: 'RINTMIZQLzlwMJUtMDYtMDI=',
  })
  @IsString()
  @IsNotEmpty()
  providerBookingId: string;
}

export class UpdateHotelBookingDto {
  bookingId: string;
  providerBookingId: string;
  updateType?: 'dates' | 'special' | 'loyalty' | 'payment';
  payload?: any;
  specialRequest?: string;
  checkInDate?: string;
  checkOutDate?: string;
  loyaltyId?: string;
  payment?: UpdatePaymentDto;
}