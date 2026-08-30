import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { BookingService } from '@domains/booking/services/booking.service';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateGuestBookingDto } from '@presentation/booking/dto/create-guest-booking.dto';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookWakanowFlightUseCase } from '@application/booking/use-cases/book-wakanow-flight.use-case';
import { BookingStatus, Provider } from '@prisma/client';

@Injectable()
export class CreateGuestBookingUseCase {
  private readonly logger = new Logger(CreateGuestBookingUseCase.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly markupCalculationService: MarkupCalculationService,
    private readonly markupRepository: MarkupRepository,
    private readonly prisma: PrismaService,
    private readonly bookWakanowFlightUseCase: BookWakanowFlightUseCase,
  ) {}

  async execute(dto: CreateGuestBookingDto): Promise<Booking> {
    if (!dto.passengerInfo) {
      throw new BadRequestException('Passenger information is required');
    }

    // Normalize passengerInfo to always be an array for storage
    const normalizedPassengers = this.normalizePassengers(dto.passengerInfo);
    
    // Clean Duffel passenger info
    let passengerInfo = dto.passengerInfo;
    let cleanedBookingData = dto.bookingData || {};
    
    if (dto.provider === Provider.DUFFEL) {
      passengerInfo = this.cleanDuffelPassengerInfo(dto.passengerInfo);
      this.logger.log('🧹 Cleaned Duffel passenger info - removed extra fields');
      
      // Store the offer data in bookingData for later use
      if (dto.offerData || dto.offerId) {
        // Ensure we have the full offer data
        const offerDataToStore = dto.offerData || {
          id: dto.offerId,
          offer_request_id: dto.offerRequestId,
        };
        
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
        
        cleanedBookingData = {
          ...cleanedBookingData,
          offerId: dto.offerId,
          offerRequestId: dto.offerRequestId || cleanedBookingData.offer_request_id,
          offerData: offerDataToStore,
          storedOfferDataAt: new Date().toISOString(),
          passengers: passengersToStore,
          offerPassengers: dto.offerData?.passengers || [],
          offerTotalAmount: dto.offerData?.total_amount || dto.totalAmount || 0,
          offerCurrency: dto.offerData?.total_currency || dto.currency || 'GBP',
        };
        this.logger.log(`📦 Stored Duffel offer data for: ${dto.offerId} with ${passengersToStore.length} passengers`);
      }
    }
// ==================== CAR RENTAL SECTION (FIXED) ====================

if (dto.provider === Provider.AMADEUS && dto.productType === 'CAR_RENTAL') {
  this.logger.log(`🚗 Creating car rental booking for guest.`);
  
  // Get email from passengerInfo
  const email = Array.isArray(passengerInfo) 
    ? passengerInfo[0]?.email 
    : passengerInfo?.email;
  
  if (!email) {
    throw new BadRequestException('Passenger email is required');
  }

  // Create or get user
  let guestUser = await this.prisma.user.findUnique({
    where: { email: email },
  });

  if (!guestUser) {
    const name = Array.isArray(passengerInfo)
      ? `${passengerInfo[0]?.firstName || 'Guest'} ${passengerInfo[0]?.lastName || 'User'}`
      : `${passengerInfo.firstName || 'Guest'} ${passengerInfo.lastName || 'User'}`;
    
    const phone = Array.isArray(passengerInfo)
      ? passengerInfo[0]?.phone || null
      : passengerInfo?.phone || null;

    guestUser = await this.prisma.user.create({
      data: {
        email: email,
        name: name,
        phone: phone,
        role: 'CUSTOMER',
        password: null,
        provider: null,
        providerId: null,
      },
    });
  }

  // ✅ Extract car rental data from DTO
  const bookingData = dto.bookingData || {};
  const offerId = bookingData.offerId || dto.bookingId;
  const offerPrice = bookingData.offerPrice || dto.basePrice || 0;
  const driver = bookingData.driver || {};
  const currency = dto.currency || 'NGN';

  if (!offerId) {
    this.logger.error('Missing offerId for car rental booking');
    throw new BadRequestException('Offer ID is required for car rental booking');
  }

  // ✅ Get values from DTO or use defaults
  const basePrice = dto.getBasePrice() || offerPrice;
  const markupPercentage = dto.getMarkupPercentage() || 10;
  const serviceFeePercentage = dto.getServiceFeePercentage() || 5;
  const taxPercentage = dto.getTaxPercentage() || 15;

  // ✅ Calculate derived values
  const markupAmount = (basePrice * markupPercentage) / 100;
  const serviceFee = (basePrice * serviceFeePercentage) / 100;
  const taxes = (basePrice * taxPercentage) / 100;
  const totalAmount = basePrice + markupAmount + serviceFee + taxes;

  this.logger.log(`💰 Car rental price breakdown:`, {
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

  // ✅ Create booking with car rental data
  const booking = await this.bookingService.createBooking({
    userId: guestUser.id,
    productType: 'CAR_RENTAL',
    provider: Provider.AMADEUS,
    basePrice: basePrice,
    markupAmount: markupAmount,
    markupPercentage: markupPercentage,
    serviceFee: serviceFee,                    // ✅ Calculated from percentage
    serviceFeePercentage: serviceFeePercentage,
    taxes: taxes,
    taxPercentage: taxPercentage,
    totalAmount: totalAmount,
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
        basePrice: basePrice,
        markupAmount: markupAmount,
        markupPercentage: markupPercentage,
        serviceFee: serviceFee,
        serviceFeePercentage: serviceFeePercentage,
        taxes: taxes,
        taxPercentage: taxPercentage,
        totalAmount: totalAmount,
        currency: currency,
      },
destination: bookingData.pickupLocation || bookingData.dropoffLocation || 'Unknown City'
    },
    passengerInfo: {
      firstName: driver?.firstName || passengerInfo?.firstName || 'Guest',
      lastName: driver?.lastName || passengerInfo?.lastName || 'User',
      email: email,
      phone: driver?.phone || passengerInfo?.phone || '',
      title: driver?.title || 'MR',
    },
    status: BookingStatus.PENDING,
    paymentStatus: 'PENDING',
  });

  this.logger.log(`✅ Car rental booking created: ${booking.id} (${booking.reference}) with offerId: ${offerId}`);
  return booking;
}



    const isWakanowFlight =
  dto.provider === Provider.WAKANOW &&
  (dto.productType === 'FLIGHT_INTERNATIONAL' || dto.productType === 'FLIGHT_DOMESTIC');

if (isWakanowFlight) {
  this.logger.log(`🛫 Creating Wakanow booking for BookingId: ${dto.bookingId}`);
  
  // ✅ FIX: Extract passengers from bookingData.passengers
  let wakanowPassengersData = [];
  
  if (dto.bookingData?.passengers && Array.isArray(dto.bookingData.passengers)) {
    wakanowPassengersData = dto.bookingData.passengers;
    this.logger.log(`📋 Extracted ${wakanowPassengersData.length} passengers from bookingData.passengers`);
  } else {
    wakanowPassengersData = normalizedPassengers;
    this.logger.log(`📋 Using ${wakanowPassengersData.length} passengers from normalizedPassengers`);
  }
  
  // ✅ Log raw passenger data
  if (wakanowPassengersData.length > 0) {
    this.logger.log(`🔍 Raw passenger data from bookingData:`, {
      firstName: wakanowPassengersData[0]?.firstName,
      lastName: wakanowPassengersData[0]?.lastName,
      PassportNumber: wakanowPassengersData[0]?.PassportNumber,
      ExpiryDate: wakanowPassengersData[0]?.ExpiryDate,
      PassportIssuingAuthority: wakanowPassengersData[0]?.PassportIssuingAuthority,
      PassportIssueCountryCode: wakanowPassengersData[0]?.PassportIssueCountryCode,
    });
  }

  // ✅ Map passengers with PascalCase passport fields
  const wakanowPassengers = wakanowPassengersData.map((p: any) => ({
    firstName: p.firstName || p.given_name || 'Guest',
    lastName: p.lastName || p.family_name || 'User',
    middleName: p.middleName || p.middle_name || '',
    email: p.email || 'guest@example.com',
    phoneNumber: p.phone || p.phoneNumber || p.phone_number || '+2340000000000',
    dateOfBirth: p.dateOfBirth || p.born_on || '1990-01-01',
    gender: p.gender || 'Male',
    title: p.title || 'Mr',
    passengerType: p.passengerType || 'Adult',
    // ✅ PascalCase - matches frontend
    PassportNumber: p.PassportNumber || p.passportNumber || p.passport_number || '',
    ExpiryDate: p.ExpiryDate || p.expiryDate || p.expiry_date || '',
    PassportIssuingAuthority: p.PassportIssuingAuthority || p.passportIssuingAuthority || p.passport_issuing_authority || '',
    PassportIssueCountryCode: p.PassportIssueCountryCode || p.passportIssueCountryCode || p.passport_issue_country_code || '',
    address: p.address || '123 Fake Street',
    country: p.country || 'Nigeria',
    countryCode: p.countryCode || p.country_code || 'NG',
    city: p.city || 'Lagos',
    postalCode: p.postalCode || p.postal_code || '100001',
    IsWakapointRegister: false,
  }));

  this.logger.log(`🔍 First passenger passport data after mapping:`, {
    firstName: wakanowPassengers[0]?.firstName,
    lastName: wakanowPassengers[0]?.lastName,
    PassportNumber: wakanowPassengers[0]?.PassportNumber,
    ExpiryDate: wakanowPassengers[0]?.ExpiryDate,
    PassportIssuingAuthority: wakanowPassengers[0]?.PassportIssuingAuthority,
    PassportIssueCountryCode: wakanowPassengers[0]?.PassportIssueCountryCode,
  });

  // Get email from passengerInfo
  const email = Array.isArray(passengerInfo) 
    ? passengerInfo[0]?.email 
    : passengerInfo?.email;
  
  if (!email) {
    throw new BadRequestException('Passenger email is required');
  }

  // Create or get user
  let guestUser = await this.prisma.user.findUnique({
    where: { email: email },
  });

  if (!guestUser) {
    const name = Array.isArray(passengerInfo)
      ? `${passengerInfo[0]?.firstName || 'Guest'} ${passengerInfo[0]?.lastName || 'User'}`
      : `${passengerInfo.firstName || 'Guest'} ${passengerInfo.lastName || 'User'}`;
    
    const phone = Array.isArray(passengerInfo)
      ? passengerInfo[0]?.phone || null
      : passengerInfo?.phone || null;

    guestUser = await this.prisma.user.create({
      data: {
        email: email,
        name: name,
        phone: phone,
        role: 'CUSTOMER',
        password: null,
        provider: null,
        providerId: null,
      },
    });
  }

  const wakanowResult = await this.bookWakanowFlightUseCase.execute(
    {
      bookingId: dto.bookingId,
      selectData: dto.selectData,
      passengers: wakanowPassengers,
      targetCurrency: dto.currency || 'NGN',
      priceBreakdown: {
        basePrice: dto.getBasePrice(),
        markupAmount: dto.getMarkupAmount(),
        markupPercentage: dto.getMarkupPercentage(),
        serviceFee: dto.getServiceFee(),
        serviceFeePercentage: dto.getServiceFeePercentage(),
        taxes: dto.getTaxes(),
        taxPercentage: dto.getTaxPercentage(),
        totalAmount: dto.getTotalAmount(),
        currency: dto.getCurrency(),
      },
    },
    guestUser.id,
  );

  if (wakanowResult.bookingData) {
    wakanowResult.bookingData.isMultiCity = dto.bookingData?.isMultiCity || false;
    wakanowResult.bookingData.allSegments = dto.bookingData?.allSegments || [];
    wakanowResult.bookingData.destination = dto.bookingData?.destination || 'Unknown City';
  }
  

  this.logger.log(`✅ Wakanow booking created. PNR: ${wakanowResult.bookingData?.pnrReferenceNumber}`);
   wakanowResult.bookingData.destination = dto.bookingData?.destination || 'Unknown City';
  return wakanowResult;
}

    const isDuffelFlight =
      dto.provider === Provider.DUFFEL &&
      (dto.productType === 'FLIGHT_INTERNATIONAL' || dto.productType === 'FLIGHT_DOMESTIC');
    
    if (isDuffelFlight && passengerInfo) {
      // Check if passengerInfo is array or single object
      const passengers = Array.isArray(passengerInfo) ? passengerInfo : [passengerInfo];
      for (const passenger of passengers) {
        const hasDob = passenger.dateOfBirth?.trim?.();
        if (!hasDob) {
          throw new BadRequestException(
            'Date of birth (dateOfBirth, YYYY-MM-DD) is required for flight bookings.',
          );
        }
      }
    }

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
      this.logger.warn('No price breakdown provided, calculating from markup service...');

      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        dto.productType,
        dto.currency || 'NGN',
      );

      if (!markupConfig) {
        throw new NotFoundException(
          `No active markup configuration found for ${dto.productType} in ${dto.currency || 'NGN'}`,
        );
      }

      const pricing = this.markupCalculationService.calculateTotal(
        dto.basePrice || 0,
        dto.productType,
        dto.currency || 'NGN',
        markupConfig,
      );

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

    if (totalAmount <= 0) {
      throw new BadRequestException('Total amount must be greater than 0');
    }

    if (!currency) {
      throw new BadRequestException('Currency is required');
    }

    // Get email from passengerInfo (handle both array and single object)
    const email = Array.isArray(passengerInfo) 
      ? passengerInfo[0]?.email 
      : passengerInfo?.email;
    
    if (!email) {
      throw new BadRequestException('Passenger email is required');
    }

    let guestUser = await this.prisma.user.findUnique({
      where: { email: email },
    });

    if (!guestUser) {
      const name = Array.isArray(passengerInfo)
        ? `${passengerInfo[0]?.firstName || 'Guest'} ${passengerInfo[0]?.lastName || 'User'}`
        : `${passengerInfo.firstName || 'Guest'} ${passengerInfo.lastName || 'User'}`;
      
      const phone = Array.isArray(passengerInfo)
        ? passengerInfo[0]?.phone || null
        : passengerInfo?.phone || null;

      guestUser = await this.prisma.user.create({
        data: {
          email: email,
          name: name,
          phone: phone,
          role: 'CUSTOMER',
          password: null,
          provider: null,
          providerId: null,
        },
      });
    }

    // Create booking with cleaned booking data (contains offer data for Duffel)
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
       bookingData: {
        ...cleanedBookingData,
        destination: dto.offerData?.arrivalCity || dto.offerData?.destinationCity || 'Unknown City',
      },
      passengerInfo: passengerInfo,  
      bookingId: dto.bookingId,
      selectData: dto.selectData,
      providerBookingId: dto.providerBookingId,
      status: BookingStatus.PENDING,
      paymentStatus: 'PENDING',
    });

    return booking;
  }

  
  private normalizePassengers(passengerInfo: any): any[] {
  
    if (Array.isArray(passengerInfo)) {
      return passengerInfo;
    }
    
  
    if (typeof passengerInfo === 'object' && passengerInfo !== null) {
      
      if (passengerInfo.passengers && Array.isArray(passengerInfo.passengers)) {
        return passengerInfo.passengers;
      }
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

  private cleanDuffelPassengerInfo(info: any): any {
    // If info is an array, clean each passenger
    if (Array.isArray(info)) {
      return info.map(p => this.cleanSingleDuffelPassenger(p));
    }
    
    // If info is a single object
    if (typeof info === 'object' && info !== null) {
      return this.cleanSingleDuffelPassenger(info);
    }
    
    return info;
  }

  private cleanSingleDuffelPassenger(passenger: any): any {
    const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'title', 'gender', 'dateOfBirth'];
    const cleaned: any = {};
    
    for (const field of allowedFields) {
      if (passenger[field] !== undefined && passenger[field] !== null && passenger[field] !== '') {
        cleaned[field] = passenger[field];
      }
    }
    
    return cleaned;
  }
}