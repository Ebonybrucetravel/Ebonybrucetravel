import { Injectable, Inject, Logger } from '@nestjs/common';
import { Booking } from '../entities/booking.entity';
import { BookingRepository } from '../repositories/booking.repository';
import { BOOKING_REPOSITORY } from '../repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { generateBookingReference } from '@common/utils/booking-reference.util';

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
  // ✅ Add cancellation fields
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
  // ✅ Add cancellation fields
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
  ) {}

  async createBooking(bookingData: CreateBookingParams): Promise<Booking> {
    this.logger.log(`Creating booking for user ${bookingData.userId}`);

    // Generate unique booking reference
    let reference = generateBookingReference();

    // Ensure reference is unique (retry if exists)
    let exists = await this.bookingRepository.findByReference(reference);
    let attempts = 0;
    while (exists && attempts < 10) {
      reference = generateBookingReference();
      exists = await this.bookingRepository.findByReference(reference);
      attempts++;
    }

    // ✅ Build the booking data with all price fields
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
      paymentStatus: bookingData.paymentStatus || PaymentStatus.PENDING, // ✅ Use enum
      isGuest: false,
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

    return this.bookingRepository.create(bookingPayload);
  }

  async createGuestBooking(bookingData: CreateGuestBookingParams): Promise<Booking> {
    this.logger.log('Creating guest booking');

    // Generate unique booking reference
    let reference = generateBookingReference();

    // Ensure reference is unique (retry if exists)
    let exists = await this.bookingRepository.findByReference(reference);
    let attempts = 0;
    while (exists && attempts < 10) {
      reference = generateBookingReference();
      exists = await this.bookingRepository.findByReference(reference);
      attempts++;
    }

    // ✅ Build the booking data with all price fields
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
      paymentStatus: bookingData.paymentStatus || PaymentStatus.PENDING, // ✅ Use enum
      isGuest: true,
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

    return this.bookingRepository.create(bookingPayload);
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