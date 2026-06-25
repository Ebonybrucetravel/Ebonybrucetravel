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

    const totalAmountFromDto = dto.getTotalAmount ? dto.getTotalAmount() : (dto.totalAmount || 0);
    

    const isDuffelFlight =
      dto.provider === Provider.DUFFEL &&
      (dto.productType === 'FLIGHT_INTERNATIONAL' || dto.productType === 'FLIGHT_DOMESTIC');

    if (isDuffelFlight) {
      this.logger.log(`💰 Duffel total amount from DTO: ${totalAmountFromDto}`);
      
      let finalTotalAmount = totalAmountFromDto;
      
    
      if (!finalTotalAmount || finalTotalAmount <= 0) {
        if (dto.offerData?.total_amount) {
          finalTotalAmount = parseFloat(dto.offerData.total_amount);
          this.logger.log(`💰 Using total_amount from offerData: ${finalTotalAmount}`);
        } else if (dto.offerData?.totalAmount) {
          finalTotalAmount = parseFloat(dto.offerData.totalAmount);
          this.logger.log(`💰 Using totalAmount from offerData: ${finalTotalAmount}`);
        }
      }


      if (!finalTotalAmount || finalTotalAmount <= 0) {
        throw new BadRequestException(
          'Total amount is required and must be greater than 0. Please provide price breakdown or total amount.',
        );
      }
      

      (dto as any)._validatedTotalAmount = finalTotalAmount;
    }


    const normalizedPassengers = this.normalizePassengers(dto.passengerInfo);

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


    if (isDuffelFlight && dto.offerId) {
   
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

     
      const offerTotalAmount = dto.offerData?.total_amount || 
                              dto.offerData?.totalAmount || 
                              (dto as any)._validatedTotalAmount || 
                              totalAmountFromDto || 
                              0;

      bookingData = {
        ...bookingData,
        offerId: dto.offerId,
        offerRequestId: dto.offerRequestId || bookingData.offer_request_id,
        offerData: dto.offerData || null,
        // CRITICAL FIX: Store passengers as an array
        passengers: passengersToStore,
        offerPassengers: dto.offerData?.passengers || [],
        offerTotalAmount: offerTotalAmount,
        offerCurrency: dto.offerData?.total_currency || dto.offerData?.currency || dto.currency || 'GBP',
        storedOfferDataAt: new Date().toISOString(),
      };
      this.logger.log(`📦 Stored Duffel offer data for authenticated booking: ${dto.offerId} with ${passengersToStore.length} passengers`);
    }

  
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
      
    
      if (isDuffelFlight && (dto as any)._validatedTotalAmount) {
        pricing.totalAmount = (dto as any)._validatedTotalAmount;
        this.logger.log(`💰 Duffel: Using DTO total amount: ${pricing.totalAmount}`);
      }
    }

  
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

  
  private normalizePassengers(passengerInfo: any): any[] {
    if (!passengerInfo) return [];
    

    if (Array.isArray(passengerInfo)) {
      return passengerInfo;
    }
    

    if (typeof passengerInfo === 'object' && passengerInfo !== null) {
      return [passengerInfo];
    }
    

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