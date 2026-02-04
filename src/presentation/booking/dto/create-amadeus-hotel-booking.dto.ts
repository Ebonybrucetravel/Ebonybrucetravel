import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsEmail,
  Matches,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AmadeusGuestNameDto {
  @ApiProperty({
    description: 'Guest title',
    enum: ['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'],
    example: 'MR',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['MR', 'MRS', 'MS', 'MISS', 'DR', 'PROF'])
  title: string;

  @ApiProperty({ description: 'Guest first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Guest last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}

export class AmadeusGuestContactDto {
  @ApiProperty({
    description: 'Guest phone number in E.164 format',
    example: '+33679278416',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +33679278416)',
  })
  phone: string;

  @ApiProperty({
    description: 'Guest email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class AmadeusGuestDto {
  @ApiProperty({ description: 'Guest title', type: AmadeusGuestNameDto })
  @ValidateNested()
  @Type(() => AmadeusGuestNameDto)
  name: AmadeusGuestNameDto;

  @ApiProperty({ description: 'Guest contact information', type: AmadeusGuestContactDto })
  @ValidateNested()
  @Type(() => AmadeusGuestContactDto)
  contact: AmadeusGuestContactDto;
}

export class AmadeusRoomGuestReferenceDto {
  @ApiProperty({
    description: 'Guest reference (matches guest index in guests array, 1-based)',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  guestReference: string;
}

export class AmadeusRoomAssociationDto {
  @ApiProperty({
    description: 'Hotel offer ID from search results',
    example: 'O2VHZUC2OH',
  })
  @IsString()
  @IsNotEmpty()
  hotelOfferId: string;

  @ApiProperty({
    description: 'Guest references for this room',
    type: [AmadeusRoomGuestReferenceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmadeusRoomGuestReferenceDto)
  guestReferences: AmadeusRoomGuestReferenceDto[];
}

export class AmadeusPaymentCardInfoDto {
  @ApiProperty({
    description: 'Card vendor code',
    enum: ['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'],
    example: 'VI',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['VI', 'MC', 'AX', 'CA', 'DC', 'DI', 'JC', 'TP'])
  vendorCode: string;

  @ApiProperty({
    description: 'Card number (will be masked in response)',
    example: '4151289722471370',
  })
  @IsString()
  @IsNotEmpty()
  cardNumber: string;

  @ApiProperty({
    description: 'Card expiry date (YYYY-MM format)',
    example: '2026-08',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'Expiry date must be in YYYY-MM format',
  })
  expiryDate: string;

  @ApiPropertyOptional({
    description: 'Card holder name',
    example: 'JOHN DOE',
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

export class AmadeusPaymentCardDto {
  @ApiProperty({
    description: 'Payment card information',
    type: AmadeusPaymentCardInfoDto,
  })
  @ValidateNested()
  @Type(() => AmadeusPaymentCardInfoDto)
  paymentCardInfo: AmadeusPaymentCardInfoDto;
}

export class AmadeusPaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: ['CREDIT_CARD'],
    example: 'CREDIT_CARD',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['CREDIT_CARD'])
  method: 'CREDIT_CARD';

  @ApiProperty({
    description: 'Payment card details',
    type: AmadeusPaymentCardDto,
  })
  @ValidateNested()
  @Type(() => AmadeusPaymentCardDto)
  paymentCard: AmadeusPaymentCardDto;
}

export class CreateAmadeusHotelBookingDto {
  @ApiProperty({
    description: 'Hotel offer ID from search results (e.g., from Search Hotels Amadeus endpoint)',
    example: 'O2VHZUC2OH',
  })
  @IsString()
  @IsNotEmpty()
  hotelOfferId: string;

  @ApiProperty({
    description: 'Final price from the offer (after markup and conversion). Use final_price from search results.',
    example: 2002.40,
  })
  @IsNumber()
  @IsNotEmpty()
  offerPrice: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    enum: ['GBP', 'USD', 'EUR', 'NGN', 'JPY', 'CNY', 'GHS', 'KES', 'ZAR'],
    example: 'GBP',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'List of guests for the booking',
    type: [AmadeusGuestDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmadeusGuestDto)
  guests: AmadeusGuestDto[];

  @ApiProperty({
    description: 'Room associations (which guests in which rooms)',
    type: [AmadeusRoomAssociationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmadeusRoomAssociationDto)
  roomAssociations: AmadeusRoomAssociationDto[];

  @ApiProperty({
    description: 'Payment information',
    type: AmadeusPaymentDto,
  })
  @ValidateNested()
  @Type(() => AmadeusPaymentDto)
  payment: AmadeusPaymentDto;

  @ApiPropertyOptional({
    description: 'Travel agent contact email (optional)',
    example: 'agent@example.com',
  })
  @IsOptional()
  @IsEmail()
  travelAgentEmail?: string;

  @ApiPropertyOptional({
    description: 'Special requests for the accommodation',
    example: 'Late check-in requested',
  })
  @IsOptional()
  @IsString()
  accommodationSpecialRequests?: string;
}

