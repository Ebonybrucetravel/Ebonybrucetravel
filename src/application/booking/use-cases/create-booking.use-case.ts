import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CreateBookingDto } from '@presentation/booking/dto/create-booking.dto';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookingStatus, Provider, ProductType } from '@prisma/client';

@Injectable()
export class CreateBookingUseCase {
  private readonly logger = new Logger(CreateBookingUseCase.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly markupRepository: MarkupRepository,
  ) {}

  async execute(dto: CreateBookingDto, userId: string): Promise<Booking> {
    // Normalize passengerInfo to always be an array for storage
    const normalizedPassengers = this.normalizePassengers(dto.passengerInfo);
    
    // DUFFEL: Validate date of birth for all passengers
    const isDuffelFlight =
      dto.provider === Provider.DUFFEL &&
      (dto.productType === 'FLIGHT_INTERNATIONAL' || dto.productType === 'FLIGHT_DOMESTIC');
    
    if (isDuffelFlight && dto.passengerInfo) {
      const passengers = Array.isArray(dto.passengerInfo) ? dto.passengerInfo : [dto.passengerInfo];
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i] as any;
        if (!p?.dateOfBirth?.trim?.()) {
          throw new BadRequestException(
            `Passenger ${i + 1}: date of birth (dateOfBirth, YYYY-MM-DD) is required for flight bookings.`,
          );
        }
      }
    }

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

    // DUFFEL: Store offer data and passengers in bookingData for later use
    if (isDuffelFlight && dto.offerId) {
      // CRITICAL FIX: Store passengers as an array in bookingData
      const passengersToStore = normalizedPassengers.map((p: any) => ({
        id: p.id || `pas_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        given_name: p.given_name || p.firstName || 'Guest',
        family_name: p.family_name || p.lastName || 'Traveler',
        born_on: p.born_on || p.dateOfBirth || '1990-01-01',
        gender: p.gender || 'm',
        email: p.email || 'guest@example.com',
        phone_number: p.phone_number || p.phone || '+1234567890',
        title: p.title || 'mr',
      }));

      bookingData = {
        ...bookingData,
        offerId: dto.offerId,
        offerRequestId: dto.offerRequestId || bookingData.offer_request_id,
        offerData: dto.offerData || null,
        // CRITICAL FIX: Store passengers as an array
        passengers: passengersToStore,
        offerPassengers: dto.offerData?.passengers || [],
        offerTotalAmount: dto.offerData?.total_amount || dto.totalAmount || 0,
        offerCurrency: dto.offerData?.total_currency || dto.currency || 'GBP',
        storedOfferDataAt: new Date().toISOString(),
      };
      this.logger.log(`📦 Stored Duffel offer data for authenticated booking: ${dto.offerId} with ${passengersToStore.length} passengers`);
    }

    // Amadeus or Hotelbeds hotel via generic POST /bookings: frontend often sends final_price as basePrice.
    // Treat it as final total and reverse-calculate so we don't double-add markup.
    const isHotelProvider =
      dto.productType === ProductType.HOTEL &&
      (dto.provider === Provider.AMADEUS || dto.provider === Provider.HOTELBEDS);

    if (isHotelProvider) {
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
      bookingData, // Contains passengers array for Duffel
      passengerInfo: dto.passengerInfo,
      status: BookingStatus.PENDING,
      paymentStatus: 'PENDING',
    });

    return booking;
  }

  /**
   * Normalize passenger data to always return an array
   */
  private normalizePassengers(passengerInfo: any): any[] {
    if (!passengerInfo) return [];
    
    // If it's already an array
    if (Array.isArray(passengerInfo)) {
      return passengerInfo;
    }
    
    // If it's a single passenger object
    if (typeof passengerInfo === 'object' && passengerInfo !== null) {
      return [passengerInfo];
    }
    
    // If it's a JSON string
    if (typeof passengerInfo === 'string') {
      try {
        const parsed = JSON.parse(passengerInfo);
        return this.normalizePassengers(parsed);
      } catch (e) {
        this.logger.error('Failed to parse passengerInfo JSON');
        return [];
      }
    }
    
    return [];
  }
}