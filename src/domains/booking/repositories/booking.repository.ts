import { Booking } from '../entities/booking.entity';
import { BookingStatus, ProductType } from '@prisma/client';

export interface BookingRepository {
  create(booking: Partial<Booking>): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  findByReference(reference: string): Promise<Booking | null>;
  findByUserId(userId: string): Promise<Booking[]>;
  update(id: string, data: Partial<Booking>): Promise<Booking>;
  delete(id: string): Promise<void>;
  findMany(filters: {
    status?: BookingStatus;
    productType?: ProductType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Booking[]>;
}
