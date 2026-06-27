import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { CreateBookingDto } from '@presentation/booking/dto/create-booking.dto';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookWakanowFlightUseCase } from '@application/booking/use-cases/book-wakanow-flight.use-case';
import { BookingStatus, Provider, ProductType } from '@prisma/client';

@Injectable()
export class CreateBookingUseCase {
  private readonly logger = new Logger(CreateBookingUseCase.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly markupRepository: MarkupRepository,
    private readonly bookWakanowFlightUseCase: BookWakanowFlightUseCase,
  ) {}

  async execute(dto: CreateBookingDto, userId: string): Promise<Booking> {

    const totalAmountFromDto = dto.getTotalAmount ? dto.getTotalAmount() : (dto.totalAmount || 0);
    

    const isDuffelFlight =
      dto.provider === Provider.DUFFEL &&
      (dto.productType === 'FLIGHT_INTERNATIONAL' || dto.productType === 'FLIGHT_DOMESTIC');

      const isWakanowFlight =  
      dto.provider === Provider.WAKANOW &&
      (dto.productType === 'FLIGHT_INTERNATIONAL' || dto.productType === 'FLIGHT_DOMESTIC');
    

      if (isWakanowFlight) {
        this.logger.log(`🛫 Creating Wakanow booking for authenticated user. BookingId: ${dto.providerBookingId || dto.bookingId}`);
        
        // Normalize passengers first
        const normalizedPassengers = this.normalizePassengers(dto.passengerInfo);
        
        // Map passengers to WakanowPassengerDto format safely
        const passengers = normalizedPassengers.map((p: any) => ({
          firstName: p.firstName || p.given_name || 'Guest',
          lastName: p.lastName || p.family_name || 'User',
          middleName: p.middleName || p.middle_name || '',
          email: p.email || 'guest@example.com',
          phoneNumber: p.phoneNumber || p.phone || p.phone_number || '+2340000000000',
          dateOfBirth: p.dateOfBirth || p.born_on || '1990-01-01',
          gender: p.gender || 'Male',
          title: p.title || 'Mr',
          passengerType: p.passengerType || 'Adult',
          passportNumber: p.passportNumber || p.passport_number || '',
          expiryDate: p.expiryDate || p.expiry_date || '',
          passportIssuingAuthority: p.passportIssuingAuthority || p.passport_issuing_authority || '',
          passportIssueCountryCode: p.passportIssueCountryCode || p.passport_issue_country_code || '',
          address: p.address || '123 Fake Street',
          country: p.country || 'Nigeria',
          countryCode: p.countryCode || p.country_code || 'NG',
          city: p.city || 'Lagos',
          postalCode: p.postalCode || p.postal_code || '100001',
          IsWakapointRegister: false,
        }));
        
        // Get price breakdown safely
        const getBasePrice = dto.getBasePrice ? dto.getBasePrice() : (dto.basePrice || 0);
        const getMarkupAmount = dto.getMarkupAmount ? dto.getMarkupAmount() : (dto.markupAmount || 0);
        const getMarkupPercentage = dto.getMarkupPercentage ? dto.getMarkupPercentage() : (dto.markupPercentage || 10);
        const getServiceFee = dto.getServiceFee ? dto.getServiceFee() : (dto.serviceFee || 0);
        const getServiceFeePercentage = dto.getServiceFeePercentage ? dto.getServiceFeePercentage() : (dto.serviceFeePercentage || 5);
        const getTaxes = dto.getTaxes ? dto.getTaxes() : (dto.taxes || 0);
        const getTaxPercentage = dto.getTaxPercentage ? dto.getTaxPercentage() : (dto.taxPercentage || 15);
        const getTotalAmount = dto.getTotalAmount ? dto.getTotalAmount() : (dto.totalAmount || 0);
        
        const wakanowDto = {
          bookingId: dto.providerBookingId || dto.bookingId,
          selectData: dto.selectData || dto.bookingData?.selectData,
          passengers: passengers,
          targetCurrency: dto.currency || 'NGN',
          priceBreakdown: {
            basePrice: getBasePrice,
            markupAmount: getMarkupAmount,
            markupPercentage: getMarkupPercentage,
            serviceFee: getServiceFee,
            serviceFeePercentage: getServiceFeePercentage,
            taxes: getTaxes,
            taxPercentage: getTaxPercentage,
            totalAmount: getTotalAmount,
            currency: dto.currency || 'NGN',
          },
        };
      
        const wakanowResult = await this.bookWakanowFlightUseCase.execute(wakanowDto, userId);
        this.logger.log(`✅ Wakanow booking created. PNR: ${wakanowResult.bookingData?.pnrReferenceNumber}`);
        return wakanowResult;
      }
      // ✅ HANDLE CAR RENTAL FOR AUTHENTICATED USERS
if (dto.provider === Provider.AMADEUS && dto.productType === 'CAR_RENTAL') {
  this.logger.log(`🚗 Creating car rental booking for authenticated user.`);
  
  // ✅ Extract car rental data from DTO
  const bookingData = dto.bookingData || {};
  const offerId = bookingData.offerId || dto.providerBookingId;
  const offerPrice = bookingData.offerPrice || dto.basePrice || 0;
  const driver = bookingData.driver || {};
  const currency = dto.currency || 'NGN';

  if (!offerId) {
    this.logger.error('Missing offerId for car rental booking');
    throw new BadRequestException('Offer ID is required for car rental booking');
  }

  // Get markup config
  const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
    'CAR_RENTAL',
    currency,
  );

  if (!markupConfig) {
    throw new NotFoundException(
      `No active markup configuration found for CAR_RENTAL in ${currency}`,
    );
  }

  // Calculate pricing
  const pricing = this.markupCalculationService.calculateTotal(
    offerPrice,
    'CAR_RENTAL',
    currency,
    markupConfig,
  );

  // ✅ Use fixed percentages (serviceFeePercentage doesn't exist on MarkupConfig)
  const serviceFeePercentage = 5;  // Fixed default
  const markupPercentage = markupConfig.markupPercentage || 10;

  // ✅ Create booking with car rental data
  const booking = await this.bookingService.createBooking({
    userId,
    productType: 'CAR_RENTAL',
    provider: Provider.AMADEUS,
    basePrice: offerPrice,
    markupAmount: pricing.markupAmount,
    markupPercentage: markupPercentage,
    serviceFee: pricing.serviceFee,
    serviceFeePercentage: serviceFeePercentage,
    taxes: pricing.markupAmount + pricing.serviceFee,
    taxPercentage: markupPercentage + serviceFeePercentage,
    totalAmount: dto.getTotalAmount ? dto.getTotalAmount() : (dto.totalAmount || pricing.totalAmount),
    currency: currency,
    bookingData: {
      amadeus_offer_id: offerId,
      offerId: offerId,
      offer_price: offerPrice,
      driver: driver,
      special_requests: bookingData.specialRequests || '',
      offerData: bookingData.offerData || {},
      pickupLocation: bookingData.pickupLocation || '',
      dropoffLocation: bookingData.dropoffLocation || '',
      pickupDateTime: bookingData.pickupDateTime || '',
      dropoffDateTime: bookingData.dropoffDateTime || '',
      vehicleType: bookingData.vehicleType || '',
      serviceProvider: bookingData.serviceProvider || '',
      priceBreakdown: {
        basePrice: offerPrice,
        markupAmount: pricing.markupAmount,
        markupPercentage: markupPercentage,
        serviceFee: pricing.serviceFee,
        serviceFeePercentage: serviceFeePercentage,
        taxes: pricing.markupAmount + pricing.serviceFee,
        taxPercentage: markupPercentage + serviceFeePercentage,
        totalAmount: dto.getTotalAmount ? dto.getTotalAmount() : (dto.totalAmount || pricing.totalAmount),
        currency: currency,
      },
    },
    passengerInfo: {
      firstName: driver?.firstName || dto.passengerInfo?.firstName || 'Guest',
      lastName: driver?.lastName || dto.passengerInfo?.lastName || 'User',
      email: dto.passengerInfo?.email || '',
      phone: driver?.phone || dto.passengerInfo?.phone || '',
      title: driver?.title || 'MR',
    },
    status: BookingStatus.PENDING,
    paymentStatus: 'PENDING',
  });

  this.logger.log(`✅ Car rental booking created: ${booking.id} (${booking.reference}) with offerId: ${offerId}`);
  return booking;
}

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