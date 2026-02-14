import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CreateBookingDto } from '@presentation/booking/dto/create-booking.dto';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class CreateBookingUseCase {
  constructor(
    private readonly bookingService: BookingService,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly markupRepository: MarkupRepository,
  ) {}

  async execute(dto: CreateBookingDto, userId: string): Promise<Booking> {
    // Get active markup config for product type and currency
    const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
      dto.productType,
      dto.currency,
    );

    if (!markupConfig) {
      throw new NotFoundException(
        `No active markup configuration found for ${dto.productType} in ${dto.currency}`,
      );
    }

    let pricing: {
      basePrice: number;
      markupAmount: number;
      serviceFee: number;
      totalAmount: number;
    };
    let bookingData = { ...dto.bookingData };

    // Amadeus hotel via generic POST /bookings: frontend often sends final_price as basePrice.
    // Treat it as final total and reverse-calculate so we don't double-add markup.
    const isAmadeusHotel =
      dto.productType === 'HOTEL' && (dto.provider as string) === 'AMADEUS';
    if (isAmadeusHotel) {
      const serviceFee = markupConfig.serviceFeeAmount || 0;
      const markupPct = markupConfig.markupPercentage || 0;
      const baseFromFinal = (dto.basePrice - serviceFee) / (1 + markupPct / 100);
      if (baseFromFinal > 0) {
        pricing = this.markupCalculationService.calculateTotal(
          baseFromFinal,
          dto.productType,
          dto.currency,
          markupConfig,
        );
        // Normalize: store amadeus_offer_id for webhook (createAmadeusBookingAfterPayment)
        if (bookingData.offerId && !bookingData.amadeus_offer_id) {
          bookingData = { ...bookingData, amadeus_offer_id: bookingData.offerId };
        }
      } else {
        pricing = this.markupCalculationService.calculateTotal(
          dto.basePrice,
          dto.productType,
          dto.currency,
          markupConfig,
        );
      }
    } else {
      pricing = this.markupCalculationService.calculateTotal(
        dto.basePrice,
        dto.productType,
        dto.currency,
        markupConfig,
      );
    }

    // Create booking with calculated amounts
    const booking = await this.bookingService.createBooking({
      userId,
      productType: dto.productType,
      provider: dto.provider,
      providerBookingId: dto.providerBookingId,
      basePrice: pricing.basePrice,
      markupAmount: pricing.markupAmount,
      serviceFee: pricing.serviceFee,
      totalAmount: pricing.totalAmount,
      currency: dto.currency,
      bookingData,
      passengerInfo: dto.passengerInfo,
      status: BookingStatus.PENDING,
      paymentStatus: 'PENDING',
    });

    return booking;
  }
}
