import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class HotelbedsGuestDto {
    @ApiProperty({ example: 'MR' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiPropertyOptional({ example: 'john.doe@example.com' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 1, description: 'Room number this guest is staying in' })
    @IsNumber()
    @Min(1)
    roomIdx: number;
}

export class CreateHotelbedsBookingDto {
    @ApiProperty({ description: 'The rate key returned by search or quote' })
    @IsString()
    @IsNotEmpty()
    rateKey: string;

    @ApiProperty({ description: 'Total price to be paid by client (including markup)' })
    @IsNumber()
    @Min(0)
    totalAmount: number;

    @ApiProperty({ example: 'GBP' })
    @IsString()
    @IsNotEmpty()
    currency: string;

    @ApiProperty({ type: [HotelbedsGuestDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => HotelbedsGuestDto)
    guests: HotelbedsGuestDto[];

    @ApiPropertyOptional({ example: 'Special requests like high floor, quiet room.' })
    @IsOptional()
    @IsString()
    specialRequests?: string;

    @ApiProperty({ example: true, description: 'User must accept cancellation policy' })
    @IsBoolean()
    @IsNotEmpty()
    policyAccepted: boolean;

    @ApiProperty({ description: 'Raw cancellation policy text for snapshotting' })
    @IsString()
    @IsNotEmpty()
    cancellationPolicySnapshot: string;

    @ApiProperty({ description: 'Cancellation deadline UTC ISO string' })
    @IsString()
    @IsNotEmpty()
    cancellationDeadline: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    clientIp?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    userAgent?: string;
}
