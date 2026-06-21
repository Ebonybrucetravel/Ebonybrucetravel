
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookingStatus, ProductType, PaymentStatus, Provider } from '@prisma/client';
import { toNumber } from '@common/utils/decimal.util';

@Injectable()
export class BookingRepositoryImpl implements BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds a Prisma-compatible booking data object from the domain entity
   */
  private buildBookingData(booking: Partial<Booking>): any {
    return {
      reference: booking.reference!,
      userId: booking.userId,
      productType: booking.productType!,
      status: booking.status || BookingStatus.PENDING,
      provider: booking.provider!,
      providerBookingId: booking.providerBookingId,
      providerData: booking.providerData || {},
      
      // ✅ Price breakdown fields
      basePrice: booking.basePrice!,
      markupAmount: booking.markupAmount || 0,
      markupPercentage: booking.markupPercentage || 10,
      serviceFee: booking.serviceFee || 0,
      serviceFeePercentage: booking.serviceFeePercentage || 5,
      taxes: booking.taxes || 0,
      taxPercentage: booking.taxPercentage || 15,
      totalAmount: booking.totalAmount!,
      currency: booking.currency || 'NGN',
      
      // ✅ Booking data
      bookingData: booking.bookingData || {},
      passengerInfo: booking.passengerInfo,
      paymentInfo: booking.paymentInfo,
      paymentStatus: booking.paymentStatus || PaymentStatus.PENDING,
      paymentProvider: booking.paymentProvider as any,
      paymentReference: booking.paymentReference,
      
      // ✅ Provider-specific fields
      bookingId: booking.bookingId,
      selectData: booking.selectData,
      isGuest: booking.isGuest || false,
      
      // ✅ Voucher fields
      voucherId: booking.voucherId,
      voucherCode: booking.voucherCode,
      voucherDiscount: booking.voucherDiscount,
      finalAmount: booking.finalAmount,
      
      // ✅ Cancellation fields
      cancellationDeadline: booking.cancellationDeadline,
      cancellationPolicySnapshot: booking.cancellationPolicySnapshot,
      clientIp: booking.clientIp,
      userAgent: booking.userAgent,
      policyAcceptedAt: booking.policyAcceptedAt,
      stripeChargeId: booking.stripeChargeId,
      confirmationEmailSentAt: booking.confirmationEmailSentAt,
      cancelledAt: booking.cancelledAt,
      cancelledBy: booking.cancelledBy,
      refundAmount: booking.refundAmount,
      refundStatus: booking.refundStatus as any,
    };
  }

  async create(booking: Partial<Booking>): Promise<Booking> {
    const data = this.buildBookingData(booking);
    
    const created = await this.prisma.booking.create({
      data: data as any,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return this.mapToBooking(created);
  }

  async findById(id: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!booking || booking.deletedAt) {
      return null;
    }

    return this.mapToBooking(booking);
  }

  async findByReference(reference: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { reference },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!booking || booking.deletedAt) {
      return null;
    }

    return this.mapToBooking(booking);
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookings.map((booking) => this.mapToBooking(booking));
  }

  async findByProviderBookingId(providerBookingId: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        providerBookingId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!booking || booking.deletedAt) {
      return null;
    }

    return this.mapToBooking(booking);
  }

  async findByOfferIdInBookingData(offerId: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { bookingData: { path: ['offerId'], equals: offerId } },
          { bookingData: { path: ['offer_id'], equals: offerId } },
          { bookingData: { path: ['offer_request_id'], equals: offerId } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return null;
    }

    return this.mapToBooking(booking);
  }

  async findAll(): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bookings.map((booking) => this.mapToBooking(booking));
  }

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: data.status,
        paymentStatus: data.paymentStatus,
        paymentProvider: data.paymentProvider as any,
        paymentReference: data.paymentReference,
        providerBookingId: data.providerBookingId,
        providerData: data.providerData,
        cancelledAt: data.cancelledAt,
        cancelledBy: data.cancelledBy,
        refundAmount: data.refundAmount,
        refundStatus: data.refundStatus as any,
        cancellationDeadline: data.cancellationDeadline,
        cancellationPolicySnapshot: data.cancellationPolicySnapshot,
        clientIp: data.clientIp,
        userAgent: data.userAgent,
        policyAcceptedAt: data.policyAcceptedAt,
        stripeChargeId: data.stripeChargeId,
        confirmationEmailSentAt: data.confirmationEmailSentAt,
        // ✅ Updated new fields
        bookingId: data.bookingId,
        selectData: data.selectData,
        isGuest: data.isGuest,
        voucherId: data.voucherId,
        voucherCode: data.voucherCode,
        voucherDiscount: data.voucherDiscount,
        finalAmount: data.finalAmount,
      } as any,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return this.mapToBooking(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.booking.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async findMany(filters: {
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
  }): Promise<Booking[]> {
    const where: any = { deletedAt: null };

    if (filters.status) where.status = filters.status;
    if (filters.productType) where.productType = filters.productType;
    if (filters.userId) where.userId = filters.userId;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.provider) where.provider = filters.provider;
    if (filters.isGuest !== undefined) where.isGuest = filters.isGuest;
    if (filters.currency) where.currency = filters.currency;

    if (filters.minAmount || filters.maxAmount) {
      where.totalAmount = {};
      if (filters.minAmount) where.totalAmount.gte = filters.minAmount;
      if (filters.maxAmount) where.totalAmount.lte = filters.maxAmount;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return bookings.map((booking) => this.mapToBooking(booking));
  }

  async findByPriceRange(minAmount: number, maxAmount: number): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        totalAmount: {
          gte: minAmount,
          lte: maxAmount,
        },
      },
      orderBy: { totalAmount: 'desc' },
    });
    return bookings.map((b) => this.mapToBooking(b));
  }

  async findByCurrency(currency: string): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        currency,
      },
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((b) => this.mapToBooking(b));
  }

  async findByAmountGreaterThan(amount: number): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        totalAmount: {
          gt: amount,
        },
      },
      orderBy: { totalAmount: 'desc' },
    });
    return bookings.map((b) => this.mapToBooking(b));
  }

  async getTotalRevenue(filters?: { startDate?: Date; endDate?: Date }): Promise<number> {
    const where: any = {
      deletedAt: null,
      status: BookingStatus.CONFIRMED,
    };

    if (filters?.startDate) where.createdAt = { gte: filters.startDate };
    if (filters?.endDate) where.createdAt = { ...where.createdAt, lte: filters.endDate };

    const result = await this.prisma.booking.aggregate({
      where,
      _sum: { totalAmount: true },
    });

    return toNumber(result._sum.totalAmount || 0);
  }

  async getBookingsByProductType(productType: ProductType): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        productType,
      },
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((b) => this.mapToBooking(b));
  }

  async getBookingStats(): Promise<{
    total: number;
    byStatus: Record<BookingStatus, number>;
    byProductType: Record<ProductType, number>;
    byPaymentStatus: Record<PaymentStatus, number>;
    totalRevenue: number;
    averagePrice: number;
  }> {
    const total = await this.prisma.booking.count({
      where: { deletedAt: null },
    });

    const statusCounts = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    });

    const productTypeCounts = await this.prisma.booking.groupBy({
      by: ['productType'],
      where: { deletedAt: null },
      _count: true,
    });

    const paymentStatusCounts = await this.prisma.booking.groupBy({
      by: ['paymentStatus'],
      where: { deletedAt: null },
      _count: true,
    });

    const revenueStats = await this.prisma.booking.aggregate({
      where: {
        deletedAt: null,
        status: BookingStatus.CONFIRMED,
      },
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
    });

    const byStatus: Record<BookingStatus, number> = {} as any;
    statusCounts.forEach((item) => {
      byStatus[item.status as BookingStatus] = item._count;
    });

    const byProductType: Record<ProductType, number> = {} as any;
    productTypeCounts.forEach((item) => {
      byProductType[item.productType as ProductType] = item._count;
    });

    const byPaymentStatus: Record<PaymentStatus, number> = {} as any;
    paymentStatusCounts.forEach((item) => {
      byPaymentStatus[item.paymentStatus as PaymentStatus] = item._count;
    });

    return {
      total,
      byStatus,
      byProductType,
      byPaymentStatus,
      totalRevenue: toNumber(revenueStats._sum.totalAmount || 0),
      averagePrice: toNumber(revenueStats._avg.totalAmount || 0),
    };
  }

  async getRevenueByCurrency(): Promise<Array<{ currency: string; total: number }>> {
    const results = await this.prisma.booking.groupBy({
      by: ['currency'],
      where: {
        deletedAt: null,
        status: BookingStatus.CONFIRMED,
      },
      _sum: { totalAmount: true },
    });

    return results.map((item) => ({
      currency: item.currency,
      total: toNumber(item._sum.totalAmount || 0),
    }));
  }

  async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map((b) => this.mapToBooking(b));
  }

  async getRecentBookings(limit: number): Promise<Booking[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return bookings.map((b) => this.mapToBooking(b));
  }

  /**
   * Map Prisma booking result to Booking entity
   */
  private mapToBooking(prismaBooking: any): Booking {
    return {
      id: prismaBooking.id,
      reference: prismaBooking.reference,
      userId: prismaBooking.userId,
      productType: prismaBooking.productType,
      status: prismaBooking.status,
      provider: prismaBooking.provider,
      providerBookingId: prismaBooking.providerBookingId,
      providerData: prismaBooking.providerData,
      
      // ✅ Price breakdown fields
      basePrice: toNumber(prismaBooking.basePrice),
      markupAmount: toNumber(prismaBooking.markupAmount),
      markupPercentage: prismaBooking.markupPercentage || 10,
      serviceFee: toNumber(prismaBooking.serviceFee),
      serviceFeePercentage: prismaBooking.serviceFeePercentage || 5,
      taxes: toNumber(prismaBooking.taxes || 0),
      taxPercentage: prismaBooking.taxPercentage || 15,
      totalAmount: toNumber(prismaBooking.totalAmount),
      currency: prismaBooking.currency,
      
      // ✅ Booking data
      bookingData: prismaBooking.bookingData,
      passengerInfo: prismaBooking.passengerInfo,
      paymentInfo: prismaBooking.paymentInfo,
      paymentStatus: prismaBooking.paymentStatus,
      paymentProvider: prismaBooking.paymentProvider,
      paymentReference: prismaBooking.paymentReference,
      
      // ✅ Provider-specific fields
      bookingId: prismaBooking.bookingId,
      selectData: prismaBooking.selectData,
      isGuest: prismaBooking.isGuest || false,
      
      // ✅ Voucher fields
      voucherId: prismaBooking.voucherId,
      voucherCode: prismaBooking.voucherCode,
      voucherDiscount: prismaBooking.voucherDiscount ? toNumber(prismaBooking.voucherDiscount) : undefined,
      finalAmount: prismaBooking.finalAmount ? toNumber(prismaBooking.finalAmount) : undefined,
      
      // ✅ Cancellation fields
      cancelledAt: prismaBooking.cancelledAt,
      cancelledBy: prismaBooking.cancelledBy,
      refundAmount: prismaBooking.refundAmount ? toNumber(prismaBooking.refundAmount) : undefined,
      refundStatus: prismaBooking.refundStatus,
      cancellationDeadline: prismaBooking.cancellationDeadline,
      cancellationPolicySnapshot: prismaBooking.cancellationPolicySnapshot,
      clientIp: prismaBooking.clientIp,
      userAgent: prismaBooking.userAgent,
      policyAcceptedAt: prismaBooking.policyAcceptedAt,
      stripeChargeId: prismaBooking.stripeChargeId,
      confirmationEmailSentAt: prismaBooking.confirmationEmailSentAt,
      createdAt: prismaBooking.createdAt,
      updatedAt: prismaBooking.updatedAt,
      deletedAt: prismaBooking.deletedAt,
    };
  }
}