import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BookWakanowFlightUseCase } from './book-wakanow-flight.use-case';
import { BookWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

@Injectable()
export class BookWakanowFlightGuestUseCase {
  private readonly logger = new Logger(BookWakanowFlightGuestUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookWakanowUseCase: BookWakanowFlightUseCase,
  ) {}

  async execute(dto: BookWakanowFlightDto) {
    // ✅ Log the incoming request
    this.logger.log('📝 Booking Wakanow flight as guest...');
    this.logger.log(`👤 Passengers: ${dto.passengers?.length || 0}`);
    this.logger.log(`🆔 BookingId: ${dto.bookingId}`);
    this.logger.log(`📋 SelectData length: ${dto.selectData?.length || 0}`);
    
    // ✅ Log price breakdown if provided
    if (dto.priceBreakdown) {
      this.logger.log('💰 Guest booking with price breakdown:', {
        basePrice: dto.priceBreakdown.basePrice,
        markupAmount: dto.priceBreakdown.markupAmount,
        markupPercentage: dto.priceBreakdown.markupPercentage,
        serviceFee: dto.priceBreakdown.serviceFee,
        serviceFeePercentage: dto.priceBreakdown.serviceFeePercentage,
        taxes: dto.priceBreakdown.taxes,
        taxPercentage: dto.priceBreakdown.taxPercentage,
        totalAmount: dto.priceBreakdown.totalAmount,
        currency: dto.priceBreakdown.currency,
      });
    } else {
      this.logger.warn('⚠️ No price breakdown provided for guest booking! Prices will be recalculated.');
    }

    // ✅ Validate lead passenger
    const leadPassenger = dto.passengers?.[0];
    if (!leadPassenger?.email) {
      throw new BadRequestException('Lead passenger email is required for guest bookings');
    }

    const email = leadPassenger.email.toLowerCase().trim();

    // ✅ Find or create guest user
    let guestUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!guestUser) {
      this.logger.log(`👤 Creating new guest user for ${email}`);
      guestUser = await this.prisma.user.create({
        data: {
          email,
          name: `${leadPassenger.firstName} ${leadPassenger.lastName}`.trim(),
          phone: leadPassenger.phoneNumber,
          role: 'CUSTOMER',
          password: null,
          provider: null,
          providerId: null,
          // ✅ Remove isGuest and emailVerified if they don't exist in your model
          // Only include fields that exist in your User model
        },
      });
      this.logger.log(`✅ Created guest user: ${guestUser.id}`);
    } else {
      this.logger.log(`✅ Using existing guest user: ${guestUser.id}`);
    }

    // ✅ Log that we're passing price breakdown to book use case
    if (dto.priceBreakdown) {
      this.logger.log('💰 Passing price breakdown to BookWakanowFlightUseCase');
    }

    // ✅ Execute the booking with the price breakdown
    const result = await this.bookWakanowUseCase.execute(dto, guestUser.id);

    // ✅ Log the result
    this.logger.log(`✅ Guest booking completed. Booking: ${result.id}, PNR: ${result.pnr_reference}`);
    this.logger.log(`💰 Final total: ${result.totalAmount} ${result.currency}`);

    // ✅ Return the result with guest flag
    return {
      ...result,
      isGuest: true,
      guestEmail: email,
      message: 'Guest flight booked successfully. Please proceed to payment.',
    };
  }
}