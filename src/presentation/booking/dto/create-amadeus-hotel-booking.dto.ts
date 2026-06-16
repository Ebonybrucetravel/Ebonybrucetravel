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
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsInt,
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
  @ApiProperty({ description: 'Guest name information', type: AmadeusGuestNameDto })
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
    example: [{ guestReference: "1" }]
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

// ==================== HOTEL DETAILS DTO ====================

export class AmadeusHotelDetailsDto {
  @ApiPropertyOptional({
    description: 'Hotel ID from Amadeus',
    example: 'MCDXBAEM',
  })
  @IsOptional()
  @IsString()
  hotelId?: string;

  @ApiPropertyOptional({
    description: 'Hotel name',
    example: 'Marriott Hotel Dubai',
  })
  @IsOptional()
  @IsString()
  hotelName?: string;

  @ApiPropertyOptional({
    description: 'Hotel address',
    example: '1 Sheikh Zayed Road, Dubai',
  })
  @IsOptional()
  @IsString()
  hotelAddress?: string;

  @ApiPropertyOptional({
    description: 'Hotel city',
    example: 'Dubai',
  })
  @IsOptional()
  @IsString()
  hotelCity?: string;

  @ApiPropertyOptional({
    description: 'Hotel country code (ISO 3166-1 alpha-2)',
    example: 'AE',
  })
  @IsOptional()
  @IsString()
  hotelCountry?: string;

  @ApiPropertyOptional({
    description: 'Hotel rating (0-5)',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  hotelRating?: number;

  @ApiPropertyOptional({
    description: 'Hotel description',
    example: 'Luxury hotel in the heart of Dubai with stunning views',
  })
  @IsOptional()
  @IsString()
  hotelDescription?: string;

  @ApiPropertyOptional({
    description: 'Hotel check-in time (HH:mm format)',
    example: '15:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Check-in time must be in HH:mm format',
  })
  hotelCheckInTime?: string;

  @ApiPropertyOptional({
    description: 'Hotel check-out time (HH:mm format)',
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Check-out time must be in HH:mm format',
  })
  hotelCheckOutTime?: string;

  @ApiPropertyOptional({
    description: 'Hotel phone number',
    example: '+971 4 123 4567',
  })
  @IsOptional()
  @IsString()
  hotelPhone?: string;

  @ApiPropertyOptional({
    description: 'Hotel email',
    example: 'reservations@hotel.com',
  })
  @IsOptional()
  @IsEmail()
  hotelEmail?: string;

  @ApiPropertyOptional({
    description: 'Hotel website',
    example: 'https://www.hotel.com',
  })
  @IsOptional()
  @IsString()
  hotelWebsite?: string;

  @ApiPropertyOptional({
    description: 'Hotel amenities',
    example: ['WiFi', 'Swimming Pool', 'Restaurant', 'Fitness Center'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hotelAmenities?: string[];

  @ApiPropertyOptional({
    description: 'Hotel image URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hotelImages?: string[];

  @ApiPropertyOptional({
    description: 'Room type',
    example: 'Deluxe King Room',
  })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiPropertyOptional({
    description: 'Number of rooms',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfRooms?: number;

  @ApiPropertyOptional({
    description: 'Board type',
    enum: ['Room Only', 'Breakfast Included', 'Half Board', 'Full Board', 'All Inclusive'],
    example: 'Breakfast Included',
  })
  @IsOptional()
  @IsString()
  boardType?: string;

  @ApiPropertyOptional({
    description: 'Hotel latitude',
    example: 51.5074,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Hotel longitude',
    example: -0.1278,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Hotel star rating (1-5)',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  starRating?: number;

  @ApiPropertyOptional({
    description: 'Hotel check-in instructions',
    example: 'Please present ID and credit card at check-in',
  })
  @IsOptional()
  @IsString()
  checkInInstructions?: string;

  @ApiPropertyOptional({
    description: 'Hotel special features',
    example: ['Sea view', 'Pet friendly', 'Family rooms'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialFeatures?: string[];

  @ApiPropertyOptional({
    description: 'Hotel languages spoken',
    example: ['English', 'French', 'Spanish'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesSpoken?: string[];
}

// ==================== MAIN CREATE HOTEL BOOKING DTO ====================

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
  @Min(0)
  offerPrice: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217) - Amadeus expects EUR, GBP, or USD for hotel bookings',
    enum: ['EUR', 'GBP', 'USD', 'NGN'],
    example: 'EUR',  
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

  @ApiPropertyOptional({
    description:
      'Payment card (guest card). Omit when using merchant payment model: customer pays via Stripe only, agency pays Amadeus.',
    type: AmadeusPaymentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AmadeusPaymentDto)
  payment?: AmadeusPaymentDto;

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

  @ApiProperty({
    description: 'Cancellation deadline in UTC (ISO 8601). e.g. "2026-02-14T23:59:00.000Z"',
    example: '2026-02-14T23:59:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  cancellationDeadline: string;

  @ApiProperty({
    description:
      'Exact cancellation policy text shown at checkout (snapshot for dispute evidence). Must match what the guest saw.',
    example: 'Free cancellation until 14 Feb 2026 23:59 UTC. Non-refundable after that.',
  })
  @IsString()
  @IsNotEmpty()
  cancellationPolicySnapshot: string;

  @ApiProperty({
    description: 'Guest must confirm they agree to the cancellation and no-show policy (required)',
    example: true,
  })
  @IsBoolean()
  policyAccepted: boolean;

  @ApiPropertyOptional({
    description: 'Client IP (set by server from request; used for dispute evidence)',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  clientIp?: string;

  @ApiPropertyOptional({
    description: 'User agent (set by server from request; used for dispute evidence)',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({
    description: 'Check-in date (ISO 8601 format YYYY-MM-DD)',
    example: '2026-06-15',
  })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({
    description: 'Check-out date (ISO 8601 format YYYY-MM-DD)',
    example: '2026-06-18',
  })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  // ==================== HOTEL DETAILS FIELDS ====================

  @ApiPropertyOptional({
    description: 'Complete hotel details object',
    type: AmadeusHotelDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AmadeusHotelDetailsDto)
  hotelDetails?: AmadeusHotelDetailsDto;

  // Individual hotel fields for convenience (these will be merged with hotelDetails)

  @ApiPropertyOptional({
    description: 'Hotel ID from Amadeus',
    example: 'MCDXBAEM',
  })
  @IsOptional()
  @IsString()
  hotelId?: string;

  @ApiPropertyOptional({
    description: 'Hotel name',
    example: 'Marriott Hotel Dubai',
  })
  @IsOptional()
  @IsString()
  hotelName?: string;

  @ApiPropertyOptional({
    description: 'Hotel address',
    example: '1 Sheikh Zayed Road, Dubai',
  })
  @IsOptional()
  @IsString()
  hotelAddress?: string;

  @ApiPropertyOptional({
    description: 'Hotel city',
    example: 'Dubai',
  })
  @IsOptional()
  @IsString()
  hotelCity?: string;

  @ApiPropertyOptional({
    description: 'Hotel country code (ISO 3166-1 alpha-2)',
    example: 'AE',
  })
  @IsOptional()
  @IsString()
  hotelCountry?: string;

  @ApiPropertyOptional({
    description: 'Hotel rating (0-5)',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  hotelRating?: number;

  @ApiPropertyOptional({
    description: 'Hotel description',
    example: 'Luxury hotel in the heart of Dubai with stunning views',
  })
  @IsOptional()
  @IsString()
  hotelDescription?: string;

  @ApiPropertyOptional({
    description: 'Hotel check-in time (HH:mm format)',
    example: '15:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Check-in time must be in HH:mm format',
  })
  hotelCheckInTime?: string;

  @ApiPropertyOptional({
    description: 'Hotel check-out time (HH:mm format)',
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Check-out time must be in HH:mm format',
  })
  hotelCheckOutTime?: string;

  @ApiPropertyOptional({
    description: 'Hotel phone number',
    example: '+971 4 123 4567',
  })
  @IsOptional()
  @IsString()
  hotelPhone?: string;

  @ApiPropertyOptional({
    description: 'Hotel email',
    example: 'reservations@hotel.com',
  })
  @IsOptional()
  @IsEmail()
  hotelEmail?: string;

  @ApiPropertyOptional({
    description: 'Hotel website',
    example: 'https://www.hotel.com',
  })
  @IsOptional()
  @IsString()
  hotelWebsite?: string;

  @ApiPropertyOptional({
    description: 'Hotel amenities',
    example: ['WiFi', 'Swimming Pool', 'Restaurant', 'Fitness Center'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hotelAmenities?: string[];

  @ApiPropertyOptional({
    description: 'Hotel image URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hotelImages?: string[];

  @ApiPropertyOptional({
    description: 'Room type',
    example: 'Deluxe King Room',
  })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiPropertyOptional({
    description: 'Number of rooms',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfRooms?: number;

  @ApiPropertyOptional({
    description: 'Board type',
    enum: ['Room Only', 'Breakfast Included', 'Half Board', 'Full Board', 'All Inclusive'],
    example: 'Breakfast Included',
  })
  @IsOptional()
  @IsString()
  boardType?: string;

  @ApiPropertyOptional({
    description: 'Hotel latitude',
    example: 51.5074,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Hotel longitude',
    example: -0.1278,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Hotel star rating (1-5)',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  starRating?: number;

  @ApiPropertyOptional({
    description: 'Hotel check-in instructions',
    example: 'Please present ID and credit card at check-in',
  })
  @IsOptional()
  @IsString()
  checkInInstructions?: string;

  @ApiPropertyOptional({
    description: 'Hotel special features',
    example: ['Sea view', 'Pet friendly', 'Family rooms'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialFeatures?: string[];

  @ApiPropertyOptional({
    description: 'Hotel languages spoken',
    example: ['English', 'French', 'Spanish'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languagesSpoken?: string[];
}