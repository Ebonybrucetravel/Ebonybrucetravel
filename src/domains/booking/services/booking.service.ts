import { Injectable, Inject, Logger } from '@nestjs/common'; 
import { Booking } from '../entities/booking.entity';
import { BookingRepository } from '../repositories/booking.repository';
import { BOOKING_REPOSITORY } from '../repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { generateBookingReference } from '@common/utils/booking-reference.util';
import { ResendService } from '../../../infrastructure/email/resend.service';

export interface CreateBookingParams {
  userId: string;
  productType: any;
  provider: any;
  basePrice: number;
  markupAmount?: number;
  markupPercentage?: number;
  serviceFee?: number;
  serviceFeePercentage?: number;
  taxes?: number;
  taxPercentage?: number;
  totalAmount: number;
  currency: string;
  bookingData: Record<string, any>;
  passengerInfo?: Record<string, any>;
  bookingId?: string;
  selectData?: string;
  providerBookingId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  cancellationDeadline?: Date;
  cancellationPolicySnapshot?: string;
  clientIp?: string;
  userAgent?: string;
  policyAcceptedAt?: Date;
  isGuest?: boolean;
}

export interface CreateGuestBookingParams {
  productType: any;
  provider: any;
  basePrice: number;
  markupAmount?: number;
  markupPercentage?: number;
  serviceFee?: number;
  serviceFeePercentage?: number;
  taxes?: number;
  taxPercentage?: number;
  totalAmount: number;
  currency: string;
  bookingData: Record<string, any>;
  passengerInfo: Record<string, any>;
  bookingId?: string;
  selectData?: string;
  providerBookingId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  cancellationDeadline?: Date;
  cancellationPolicySnapshot?: string;
  clientIp?: string;
  userAgent?: string;
  policyAcceptedAt?: Date;
  isGuest?: boolean;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly resendService: ResendService, 
  ) {}

  // ✅ Helper to extract passenger details
  private extractPassengerInfo(passengerInfo: any): {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  } {
    // Handle passengerInfo that might be an array or object
    let passenger = passengerInfo;
    
    // If it's an array, get the first element
    if (Array.isArray(passenger) && passenger.length > 0) {
      passenger = passenger[0];
    }
    
    // If passenger is still undefined or null, return defaults
    if (!passenger || typeof passenger !== 'object') {
      return {
        name: 'Valued Customer',
        email: 'no-email@provided.com',
        phone: 'N/A',
        address: '',
        city: '',
        country: '',
      };
    }
    
    // Extract name
    const firstName = passenger.firstName || passenger.FirstName || '';
    const lastName = passenger.lastName || passenger.LastName || '';
    const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'Valued Customer';
    
    // Extract email
    const email = passenger.email || passenger.Email || 'no-email@provided.com';
    
    // Extract phone
    const phone = passenger.phone || passenger.Phone || passenger.phoneNumber || passenger.PhoneNumber || 'N/A';
    
    // Extract address
    const address = passenger.address || passenger.Address || passenger.AddressLine1 || '';
    const city = passenger.city || passenger.City || '';
    const country = passenger.country || passenger.Country || '';
    
    return { name, email, phone, address, city, country };
  }

  // ✅ Helper to extract booking details for email
  private extractBookingDetails(bookingData: any, productType: any): any {
    const details: any = {};
    
    // Flight details
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      details.origin = bookingData?.origin || bookingData?.departureAirport || 'N/A';
      details.destination = bookingData?.destination || bookingData?.arrivalAirport || 'N/A';
      details.departureDate = bookingData?.departureDate || bookingData?.departureTime || '';
      details.arrivalDate = bookingData?.arrivalDate || bookingData?.arrivalTime || '';
      details.airlineName = bookingData?.airlineName || bookingData?.airline || 'N/A';
      details.flightNumber = bookingData?.flightNumber || bookingData?.flight_number || 'N/A';
      details.cabinClass = bookingData?.cabinClass || bookingData?.cabin || 'Economy';
      details.bookingClass = bookingData?.bookingClass || bookingData?.class || 'Economy';
      details.stops = bookingData?.stops || 0;
    }
    
    // Hotel details
    if (productType === 'HOTEL') {
      details.hotelName = bookingData?.hotelName || bookingData?.name || 'Hotel';
      details.hotelAddress = bookingData?.hotelAddress || bookingData?.address || '';
      details.hotelCity = bookingData?.hotelCity || bookingData?.city || '';
      details.hotelCountry = bookingData?.hotelCountry || bookingData?.country || '';
      details.checkInDate = bookingData?.checkInDate || bookingData?.check_in_date || '';
      details.checkOutDate = bookingData?.checkOutDate || bookingData?.check_out_date || '';
      details.roomType = bookingData?.roomType || 'Standard Room';
      details.guests = bookingData?.guests || bookingData?.adults || 1;
      details.numberOfRooms = bookingData?.numberOfRooms || bookingData?.rooms || 1;
      details.boardType = bookingData?.boardType || 'Room Only';
      details.hotelPhone = bookingData?.hotelPhone || '';
      details.hotelRating = bookingData?.hotelRating || null;
    }
    
    return details;
  }


private async sendConfirmationEmail(booking: Booking): Promise<void> {
  try {
   
    this.logger.log(`📦 Booking ${booking.reference} - Product Type: ${booking.productType}`);
    this.logger.log(`📦 bookingData keys:`, Object.keys(booking.bookingData || {}));
    
 
    if (booking.bookingData?.origin) {
      this.logger.log(`✈️ Flight details found in bookingData:`, {
        origin: booking.bookingData.origin,
        destination: booking.bookingData.destination,
        airlineName: booking.bookingData.airlineName,
        flightNumber: booking.bookingData.flightNumber,
        departureDate: booking.bookingData.departureDate,
        arrivalDate: booking.bookingData.arrivalDate,
        cabinClass: booking.bookingData.cabinClass,
        stops: booking.bookingData.stops,
      });
    } else {
      this.logger.warn(`⚠️ No flight details found in bookingData for booking ${booking.reference}`);
    }
    
    
    const passengerInfo = this.extractPassengerInfo(booking.passengerInfo);
    
    
    const bookingDetails = this.extractBookingDetails(booking.bookingData, booking.productType);
    

    this.logger.log(`📧 Extracted booking details for email:`, {
      origin: bookingDetails.origin,
      destination: bookingDetails.destination,
      airlineName: bookingDetails.airlineName,
      flightNumber: bookingDetails.flightNumber,
      departureDate: bookingDetails.departureDate,
      arrivalDate: bookingDetails.arrivalDate,
    });
    
   
    await this.resendService.sendBookingConfirmationEmail({
      to: passengerInfo.email,
      customerName: passengerInfo.name,
      bookingReference: booking.reference,
      productType: booking.productType,
      provider: booking.provider,
      passengerDetails: {
        name: passengerInfo.name,
        email: passengerInfo.email,
        phone: passengerInfo.phone,
        address: passengerInfo.address,
        city: passengerInfo.city,
        country: passengerInfo.country,
      },
      bookingDetails: {
     
        origin: bookingDetails.origin,
        destination: bookingDetails.destination,
        departureDate: bookingDetails.departureDate,
        arrivalDate: bookingDetails.arrivalDate,
        airlineName: bookingDetails.airlineName,
        flightNumber: bookingDetails.flightNumber,
        cabinClass: bookingDetails.cabinClass,
        bookingClass: bookingDetails.bookingClass,
        stops: bookingDetails.stops,
       
        checkInDate: bookingDetails.checkInDate,
        checkOutDate: bookingDetails.checkOutDate,
        hotelName: bookingDetails.hotelName,
        roomType: bookingDetails.roomType,
        guests: bookingDetails.guests,
        numberOfRooms: bookingDetails.numberOfRooms,
        boardType: bookingDetails.boardType,
        hotelAddress: bookingDetails.hotelAddress,
        hotelCity: bookingDetails.hotelCity,
        hotelCountry: bookingDetails.hotelCountry,
        hotelPhone: bookingDetails.hotelPhone,
        hotelRating: bookingDetails.hotelRating,
      },
      pricing: {
        basePrice: booking.basePrice || 0,
        markupAmount: booking.markupAmount || 0,
        serviceFee: booking.serviceFee || 0,
        totalAmount: booking.totalAmount || 0,
        currency: booking.currency || 'NGN',
      },
      confirmationDate: new Date(),
      bookingId: booking.id,
      cancellationDeadline: booking.cancellationDeadline,
      cancellationPolicySummary: booking.cancellationPolicySnapshot,
    });
    
    this.logger.log(`✅ Confirmation email sent for booking ${booking.reference} to ${passengerInfo.email}`);
  } catch (error) {
    this.logger.error(`❌ Failed to send confirmation email for booking ${booking.reference}:`, error);
  }
}

  async createBooking(bookingData: CreateBookingParams): Promise<Booking> {
    this.logger.log(`Creating booking for user ${bookingData.userId}`);

  
    let reference = generateBookingReference();

  
    let exists = await this.bookingRepository.findByReference(reference);
    let attempts = 0;
    while (exists && attempts < 10) {
      reference = generateBookingReference();
      exists = await this.bookingRepository.findByReference(reference);
      attempts++;
    }

  
    const bookingPayload: Partial<Booking> = {
      userId: bookingData.userId,
      reference,
      productType: bookingData.productType,
      provider: bookingData.provider,
      basePrice: bookingData.basePrice,
      markupAmount: bookingData.markupAmount || 0,
      markupPercentage: bookingData.markupPercentage || 10,
      serviceFee: bookingData.serviceFee || 0,
      serviceFeePercentage: bookingData.serviceFeePercentage || 5,
      taxes: bookingData.taxes || 0,
      taxPercentage: bookingData.taxPercentage || 15,
      totalAmount: bookingData.totalAmount,
      currency: bookingData.currency,
      bookingData: bookingData.bookingData,
      passengerInfo: bookingData.passengerInfo || {},
      bookingId: bookingData.bookingId,
      selectData: bookingData.selectData,
      providerBookingId: bookingData.providerBookingId,
      status: bookingData.status || BookingStatus.PENDING,
      paymentStatus: bookingData.paymentStatus || PaymentStatus.PENDING,
      isGuest: false,
      cancellationDeadline: bookingData.cancellationDeadline,
      cancellationPolicySnapshot: bookingData.cancellationPolicySnapshot,
      clientIp: bookingData.clientIp,
      userAgent: bookingData.userAgent,
      policyAcceptedAt: bookingData.policyAcceptedAt,
    };

    this.logger.log(`💰 Booking price breakdown:`, {
      basePrice: bookingPayload.basePrice,
      markupAmount: bookingPayload.markupAmount,
      markupPercentage: bookingPayload.markupPercentage,
      serviceFee: bookingPayload.serviceFee,
      serviceFeePercentage: bookingPayload.serviceFeePercentage,
      taxes: bookingPayload.taxes,
      taxPercentage: bookingPayload.taxPercentage,
      totalAmount: bookingPayload.totalAmount,
      currency: bookingPayload.currency,
    });

 
    const booking = await this.bookingRepository.create(bookingPayload);
    
    
    this.sendConfirmationEmail(booking).catch((error) => {
      this.logger.error(`Failed to send confirmation email for booking ${booking.reference}:`, error);
    });
    
    return booking;
  }

  async createGuestBooking(bookingData: CreateGuestBookingParams): Promise<Booking> {
    this.logger.log('Creating guest booking');

    let reference = generateBookingReference();

    let exists = await this.bookingRepository.findByReference(reference);
    let attempts = 0;
    while (exists && attempts < 10) {
      reference = generateBookingReference();
      exists = await this.bookingRepository.findByReference(reference);
      attempts++;
    }

    const bookingPayload: Partial<Booking> = {
      reference,
      productType: bookingData.productType,
      provider: bookingData.provider,
      basePrice: bookingData.basePrice,
      markupAmount: bookingData.markupAmount || 0,
      markupPercentage: bookingData.markupPercentage || 10,
      serviceFee: bookingData.serviceFee || 0,
      serviceFeePercentage: bookingData.serviceFeePercentage || 5,
      taxes: bookingData.taxes || 0,
      taxPercentage: bookingData.taxPercentage || 15,
      totalAmount: bookingData.totalAmount,
      currency: bookingData.currency,
      bookingData: bookingData.bookingData,
      passengerInfo: bookingData.passengerInfo,
      bookingId: bookingData.bookingId,
      selectData: bookingData.selectData,
      providerBookingId: bookingData.providerBookingId,
      status: bookingData.status || BookingStatus.PENDING,
      paymentStatus: bookingData.paymentStatus || PaymentStatus.PENDING,
      isGuest: true,
      cancellationDeadline: bookingData.cancellationDeadline,
      cancellationPolicySnapshot: bookingData.cancellationPolicySnapshot,
      clientIp: bookingData.clientIp,
      userAgent: bookingData.userAgent,
      policyAcceptedAt: bookingData.policyAcceptedAt,
    };

    this.logger.log(`💰 Guest booking price breakdown:`, {
      basePrice: bookingPayload.basePrice,
      markupAmount: bookingPayload.markupAmount,
      markupPercentage: bookingPayload.markupPercentage,
      serviceFee: bookingPayload.serviceFee,
      serviceFeePercentage: bookingPayload.serviceFeePercentage,
      taxes: bookingPayload.taxes,
      taxPercentage: bookingPayload.taxPercentage,
      totalAmount: bookingPayload.totalAmount,
      currency: bookingPayload.currency,
    });


    const booking = await this.bookingRepository.create(bookingPayload);
  
    this.sendConfirmationEmail(booking).catch((error) => {
      this.logger.error(`Failed to send confirmation email for guest booking ${booking.reference}:`, error);
    });
    
    return booking;
  }

  async getBookingById(id: string): Promise<Booking | null> {
    return this.bookingRepository.findById(id);
  }

  async getBookingByReference(reference: string): Promise<Booking | null> {
    return this.bookingRepository.findByReference(reference);
  }

  async getAllBookings(): Promise<Booking[]> {
    return this.bookingRepository.findAll();
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return this.bookingRepository.findByUserId(userId);
  }

  async updateBookingStatus(
    id: string,
    status: BookingStatus,
    cancelledBy?: string,
  ): Promise<Booking> {
    const updateData: Partial<Booking> = { status };
    if (status === BookingStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      if (cancelledBy) {
        updateData.cancelledBy = cancelledBy;
      }
    }
    return this.bookingRepository.update(id, updateData);
  }

  async cancelBooking(id: string, userId: string): Promise<Booking> {
    return this.updateBookingStatus(id, BookingStatus.CANCELLED, userId);
  }
}