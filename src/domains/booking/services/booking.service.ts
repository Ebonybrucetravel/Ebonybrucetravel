import { Injectable, Inject } from '@nestjs/common';
import { Booking } from '../entities/booking.entity';
import { BookingRepository } from '../repositories/booking.repository';
import { BOOKING_REPOSITORY } from '../repositories/booking.repository.token';
import { BookingStatus } from '@prisma/client';
import { generateBookingReference } from '@common/utils/booking-reference.util';

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async createBooking(bookingData: Partial<Booking>): Promise<Booking> {
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

    return this.bookingRepository.create({
      ...bookingData,
      reference,
    });
  }

  async getBookingById(id: string): Promise<Booking | null> {
    return this.bookingRepository.findById(id);
  }

  async getBookingByReference(reference: string): Promise<Booking | null> {
    return this.bookingRepository.findByReference(reference);
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    if (!userId || userId === '') {
      // Admin query - get all bookings
      return this.bookingRepository.findMany({});
    }
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

