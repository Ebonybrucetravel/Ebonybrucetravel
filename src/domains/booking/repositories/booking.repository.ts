import { Booking } from '../entities/booking.entity';
import { BookingStatus, ProductType, PaymentStatus, Provider } from '@prisma/client';

export interface BookingRepository {
  // ✅ Basic CRUD operations
  create(booking: Partial<Booking>): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  findByReference(reference: string): Promise<Booking | null>;
  findByUserId(userId: string): Promise<Booking[]>;
  findByProviderBookingId(providerBookingId: string): Promise<Booking | null>;
  findByOfferIdInBookingData(offerId: string): Promise<Booking | null>;
  findAll(): Promise<Booking[]>;
  update(id: string, data: Partial<Booking>): Promise<Booking>;
  delete(id: string): Promise<void>;
  
  // ✅ Enhanced findMany with more filters
  findMany(filters: {
    status?: BookingStatus;
    productType?: ProductType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    paymentStatus?: PaymentStatus;
    provider?: Provider;
    isGuest?: boolean;
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
  }): Promise<Booking[]>;
  
  // ✅ Price breakdown specific methods
  findByPriceRange(minAmount: number, maxAmount: number): Promise<Booking[]>;
  findByCurrency(currency: string): Promise<Booking[]>;
  findByAmountGreaterThan(amount: number): Promise<Booking[]>;
  
  // ✅ Statistics and analytics
  getTotalRevenue(filters?: { startDate?: Date; endDate?: Date }): Promise<number>;
  getBookingsByProductType(productType: ProductType): Promise<Booking[]>;
  getBookingStats(): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    byProductType: Record<ProductType, number>;
    byPaymentStatus: Record<PaymentStatus, number>;
    totalRevenue: number;
    averagePrice: number;
  }>;
  
  // ✅ Reporting methods
  getRevenueByCurrency(): Promise<Array<{ currency: string; total: number }>>;
  getBookingsByDateRange(startDate: Date, endDate: Date): Promise<Booking[]>;
  getRecentBookings(limit: number): Promise<Booking[]>;
}