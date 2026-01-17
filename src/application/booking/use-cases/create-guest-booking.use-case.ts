import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateGuestBookingDto } from '@presentation/booking/dto/create-guest-booking.dto';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class CreateGuestBookingUseCase {
  constructor(
    private readonly bookingService: BookingService,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly markupRepository: MarkupRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: CreateGuestBookingDto): Promise<Booking> {
    // Check if guest user exists, if not create one
    let guestUser = await this.prisma.user.findUnique({
      where: { email: dto.passengerInfo.email },
    });

    if (!guestUser) {
      // Create guest user account (they can register later)
      guestUser = await this.prisma.user.create({
        data: {
          email: dto.passengerInfo.email,
          name: `${dto.passengerInfo.firstName} ${dto.passengerInfo.lastName}`,
          phone: dto.passengerInfo.phone,
          role: 'CUSTOMER',
          password: '', // Empty password - guest user
        },
      });
    }

    // Get active markup config
    const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
      dto.productType,
      dto.currency,
    );

    if (!markupConfig) {
      throw new NotFoundException(
        `No active markup configuration found for ${dto.productType} in ${dto.currency}`,
      );
    }

    // Calculate pricing
    const pricing = this.markupCalculationService.calculateTotal(
      dto.basePrice,
      dto.productType,
      dto.currency,
      markupConfig,
    );

    // Create booking
    const booking = await this.bookingService.createBooking({
      userId: guestUser.id,
      productType: dto.productType,
      provider: dto.provider,
      basePrice: pricing.basePrice,
      markupAmount: pricing.markupAmount,
      serviceFee: pricing.serviceFee,
      totalAmount: pricing.totalAmount,
      currency: dto.currency,
      bookingData: dto.bookingData,
      passengerInfo: dto.passengerInfo,
      status: BookingStatus.PENDING,
      paymentStatus: 'PENDING',
    });

    return booking;
  }
}

