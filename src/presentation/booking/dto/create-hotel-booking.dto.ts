import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== UPDATE HOTEL BOOKING DTOs ====================

/**
 * Payment card information for updating a hotel booking
 */
export class UpdatePaymentCardInfoDto {
  @ApiPropertyOptional({
    description: 'Card vendor code',
    enum: ['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'],
    example: 'VI',
  })
  @IsOptional()
  @IsString()
  vendorCode?: string;

  @ApiPropertyOptional({
    description: 'Card number',
    example: '4242424242424242',
  })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({
    description: 'Card expiry date (YYYY-MM format)',
    example: '2026-12',
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Card holder name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  holderName?: string;

  @ApiPropertyOptional({
    description: 'Card security code (CVV)',
    example: '123',
  })
  @IsOptional()
  @IsString()
  securityCode?: string;
}

/**
 * Payment card for updating a hotel booking
 */
export class UpdatePaymentCardDto {
  @ApiPropertyOptional({
    description: 'Payment card information',
    type: UpdatePaymentCardInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentCardInfoDto)
  paymentCardInfo?: UpdatePaymentCardInfoDto;
}

/**
 * Payment for updating a hotel booking
 */
export class UpdatePaymentDto {
  @ApiPropertyOptional({
    description: 'Payment method',
    enum: ['CREDIT_CARD'],
    example: 'CREDIT_CARD',
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({
    description: 'Payment card details',
    type: UpdatePaymentCardDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentCardDto)
  paymentCard?: UpdatePaymentCardDto;
}

/**
 * Loyalty guest reference for hotel booking update
 */
export class UpdateGuestReferenceDto {
  @ApiProperty({
    description: 'Guest reference (1-based index)',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  guestReference: string;

  @ApiPropertyOptional({
    description: 'Hotel loyalty program ID',
    example: '3081031320523260',
  })
  @IsOptional()
  @IsString()
  hotelLoyaltyId?: string;
}

/**
 * Room association for updating a hotel booking
 */
export class UpdateRoomAssociationDto {
  @ApiPropertyOptional({
    description: 'Special request text',
    example: 'I will arrive at midnight',
  })
  @IsOptional()
  @IsString()
  specialRequest?: string;

  @ApiPropertyOptional({
    description: 'Guest references with loyalty IDs',
    type: [UpdateGuestReferenceDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGuestReferenceDto)
  guestReferences?: UpdateGuestReferenceDto[];
}

/**
 * Product dates for updating a hotel booking
 */
export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'New check-in date (YYYY-MM-DD)',
    example: '2026-07-27',
  })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @ApiPropertyOptional({
    description: 'New check-out date (YYYY-MM-DD)',
    example: '2026-07-28',
  })
  @IsOptional()
  @IsDateString()
  checkOutDate?: string;
}

/**
 * Hotel offer for updating a hotel booking
 */
export class UpdateHotelOfferDto {
  @ApiPropertyOptional({
    description: 'Product dates',
    type: UpdateProductDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProductDto)
  product?: UpdateProductDto;
}

/**
 * Hotel booking update payload
 */
export class UpdateHotelBookingPayloadDto {
  @ApiPropertyOptional({
    description: 'Room association updates',
    type: UpdateRoomAssociationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateRoomAssociationDto)
  roomAssociation?: UpdateRoomAssociationDto;

  @ApiPropertyOptional({
    description: 'Hotel offer updates (for date changes)',
    type: UpdateHotelOfferDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateHotelOfferDto)
  hotelOffer?: UpdateHotelOfferDto;

  @ApiPropertyOptional({
    description: 'Payment card updates',
    type: UpdatePaymentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentDto)
  payment?: UpdatePaymentDto;
}

// ==================== MAIN UPDATE HOTEL BOOKING DTO ====================

/**
 * DTO for updating a hotel booking via our backend
 * This is used by the PATCH endpoint /api/v1/bookings/hotels/:bookingId/update
 */
export class UpdateHotelBookingDto {
  @ApiProperty({
    description: 'Booking ID in our system',
    example: 'cmq9srl8n00060cprolc82n6w',
  })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({
    description: 'Amadeus provider booking ID (hotelOrderId)',
    example: 'RINTMIZQLzlwMJUtMDYtMDI=',
  })
  @IsString()
  @IsNotEmpty()
  providerBookingId: string;

  @ApiPropertyOptional({
    description: 'Update type: dates, special, or loyalty',
    enum: ['dates', 'special', 'loyalty', 'payment'],
  })
  @IsOptional()
  @IsString()
  updateType?: 'dates' | 'special' | 'loyalty' | 'payment';

  @ApiPropertyOptional({
    description: 'Special request text',
    example: 'I will arrive at midnight, please prepare extra pillows',
  })
  @IsOptional()
  @IsString()
  specialRequest?: string;

  @ApiPropertyOptional({
    description: 'New check-in date (YYYY-MM-DD)',
    example: '2026-07-27',
  })
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @ApiPropertyOptional({
    description: 'New check-out date (YYYY-MM-DD)',
    example: '2026-07-28',
  })
  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @ApiPropertyOptional({
    description: 'Hotel loyalty program ID',
    example: '3081031320523260',
  })
  @IsOptional()
  @IsString()
  loyaltyId?: string;

  @ApiPropertyOptional({
    description: 'Updated payment information',
    type: UpdatePaymentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePaymentDto)
  payment?: UpdatePaymentDto;

  @ApiPropertyOptional({
    description: 'Complete update payload (alternative to individual fields)',
    type: UpdateHotelBookingPayloadDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateHotelBookingPayloadDto)
  payload?: UpdateHotelBookingPayloadDto;
}

/**
 * Simple DTO for the PATCH endpoint that the frontend will call
 */
export class UpdateHotelBookingRequestDto {
  @ApiProperty({
    description: 'Type of update being performed',
    enum: ['dates', 'special', 'loyalty', 'payment'],
  })
  @IsString()
  @IsNotEmpty()
  updateType: 'dates' | 'special' | 'loyalty' | 'payment';

  @ApiProperty({
    description: 'Update payload containing the changes',
    type: 'object',
    example: {
      hotelBooking: {
        roomAssociation: {
          specialRequest: 'Guest will arrive at midnight'
        }
      }
    },
  })
  @IsOptional()
  payload?: any;

  @ApiProperty({
    description: 'Amadeus provider booking ID',
    example: 'RINTMIZQLzlwMJUtMDYtMDI=',
  })
  @IsString()
  @IsNotEmpty()
  providerBookingId: string;
}