import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  IsEmail,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType, Provider } from '@prisma/client';

class IdentityDocumentDto {
  @ApiProperty({
    description: 'Document type',
    enum: ['passport', 'tax_id', 'known_traveler_number', 'passenger_redress_number'],
    example: 'passport',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Document number (e.g. passport number)', example: 'AB1234567' })
  @IsString()
  @IsNotEmpty()
  uniqueIdentifier: string;

  @ApiPropertyOptional({
    description: 'ISO country code of the issuing country',
    example: 'GB',
  })
  @IsString()
  @IsOptional()
  issuingCountryCode?: string;

  @ApiPropertyOptional({
    description: 'Expiry date in YYYY-MM-DD format',
    example: '2030-06-15',
  })
  @IsString()
  @IsOptional()
  expiresOn?: string;
}

class LoyaltyProgrammeAccountDto {
  @ApiProperty({ description: 'Airline IATA code', example: 'BA' })
  @IsString()
  @IsNotEmpty()
  airlineIataCode: string;

  @ApiProperty({ description: 'Loyalty programme account number', example: '12901014' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;
}

class PassengerInfoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: false, description: 'Required for flights. One of: mr, mrs, ms, miss, dr' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false, description: 'Required for flights. One of: m, f' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({ required: false, description: 'Required for flights. Date of birth YYYY-MM-DD' })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Passport or ID documents. Required for international flights when the airline demands it. ' +
      'The offer response includes passenger_identity_documents_required to indicate this.',
    type: [IdentityDocumentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IdentityDocumentDto)
  identityDocuments?: IdentityDocumentDto[];

  @ApiPropertyOptional({
    description: 'Frequent flyer / loyalty programme accounts',
    type: [LoyaltyProgrammeAccountDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoyaltyProgrammeAccountDto)
  loyaltyProgrammeAccounts?: LoyaltyProgrammeAccountDto[];
}

export class CreateBookingDto {
  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  @IsNotEmpty()
  productType: ProductType;

  @ApiProperty({ enum: Provider })
  @IsEnum(Provider)
  @IsNotEmpty()
  provider: Provider;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty()
  @IsObject()
  @IsNotEmpty()
  bookingData: Record<string, any>;

  @ApiProperty({ type: PassengerInfoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PassengerInfoDto)
  passengerInfo?: PassengerInfoDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  providerBookingId?: string;
}
