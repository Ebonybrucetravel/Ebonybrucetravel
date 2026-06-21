import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateGuestBookingDto } from '@presentation/booking/dto/create-guest-booking.dto';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookingStatus, Provider } from '@prisma/client';

@Injectable()
export class CreateGuestBookingUseCase {
  private readonly logger = new Logger(CreateGuestBookingUseCase.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly markupRepository: MarkupRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: CreateGuestBookingDto): Promise<Booking> {
    // ✅ Validate required fields
    if (!dto.passengerInfo) {
      throw new BadRequestException('Passenger information is required');
    }

    const isDuffelFlight =
      dto.provider === Provider.DUFFEL &&
      (dto.productType === 'FLIGHT_INTERNATIONAL' || dto.productType === 'FLIGHT_DOMESTIC');
    
    if (isDuffelFlight && dto.passengerInfo) {
      const hasDob = (dto.passengerInfo as any).dateOfBirth?.trim?.();
      if (!hasDob) {
        throw new BadRequestException(
          'Date of birth (dateOfBirth, YYYY-MM-DD) is required for flight bookings.',
        );
      }
    }

    // ✅ Check if the DTO has price breakdown
    const hasPriceBreakdown = !!dto.priceBreakdown || 
                              (dto.totalAmount && dto.totalAmount > 0);

    let basePrice: number;
    let markupAmount: number;
    let markupPercentage: number;
    let serviceFee: number;
    let serviceFeePercentage: number;
    let taxes: number;
    let taxPercentage: number;
    let totalAmount: number;
    let currency: string;

    if (hasPriceBreakdown) {
      // ✅ Use the price breakdown from the DTO
      basePrice = dto.getBasePrice();
      markupAmount = dto.getMarkupAmount();
      markupPercentage = dto.getMarkupPercentage();
      serviceFee = dto.getServiceFee();
      serviceFeePercentage = dto.getServiceFeePercentage();
      taxes = dto.getTaxes();
      taxPercentage = dto.getTaxPercentage();
      totalAmount = dto.getTotalAmount();
      currency = dto.getCurrency();

      this.logger.log(`💰 Using price breakdown from DTO:`, {
        basePrice,
        markupAmount,
        markupPercentage,
        serviceFee,
        serviceFeePercentage,
        taxes,
        taxPercentage,
        totalAmount,
        currency,
      });
    } else {
      // ✅ Fallback: Calculate pricing using markup service
      this.logger.warn('No price breakdown provided, calculating from markup service...');

      // Get active markup config
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        dto.productType,
        dto.currency || 'NGN',
      );

      if (!markupConfig) {
        throw new NotFoundException(
          `No active markup configuration found for ${dto.productType} in ${dto.currency || 'NGN'}`,
        );
      }

      // Calculate pricing
      const pricing = this.markupCalculationService.calculateTotal(
        dto.basePrice || 0,
        dto.productType,
        dto.currency || 'NGN',
        markupConfig,
      );

      // ✅ Fix: Use type assertion for markupConfig since the interface might not have serviceFeePercentage
      const config = markupConfig as any;
      basePrice = pricing.basePrice || dto.basePrice || 0;
      markupAmount = pricing.markupAmount || 0;
      markupPercentage = config.markupPercentage || 10;
      serviceFee = pricing.serviceFee || 0;
      serviceFeePercentage = config.serviceFeePercentage || 5;
      taxes = markupAmount + serviceFee;
      taxPercentage = markupPercentage + serviceFeePercentage;
      totalAmount = pricing.totalAmount || 0;
      currency = dto.currency || 'NGN';
    }

    // ✅ Validate total amount
    if (totalAmount <= 0) {
      throw new BadRequestException('Total amount must be greater than 0');
    }

    if (!currency) {
      throw new BadRequestException('Currency is required');
    }

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
          password: null, // Guest users don't have passwords (they can register later)
          provider: null,
          providerId: null,
        },
      });
    }

    // ✅ Create booking with all price fields
    const booking = await this.bookingService.createBooking({
      userId: guestUser.id,
      productType: dto.productType,
      provider: dto.provider,
      basePrice,
      markupAmount,
      markupPercentage,
      serviceFee,
      serviceFeePercentage,
      taxes,
      taxPercentage,
      totalAmount,
      currency,
      bookingData: dto.bookingData,
      passengerInfo: dto.passengerInfo,
      bookingId: dto.bookingId,
      selectData: dto.selectData,
      providerBookingId: dto.providerBookingId,
      status: BookingStatus.PENDING,
      paymentStatus: 'PENDING',
    });

    return booking;
  }
}