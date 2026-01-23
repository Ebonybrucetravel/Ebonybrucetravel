import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { Booking } from '@domains/booking/entities/booking.entity';
import { BookingStatus, ProductType } from '@prisma/client';
import { toNumber } from '@common/utils/decimal.util';

@Injectable()
export class BookingRepositoryImpl implements BookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(booking: Partial<Booking>): Promise<Booking> {
    const created = await this.prisma.booking.create({
      data: {
        reference: booking.reference!,
        userId: booking.userId!,
        productType: booking.productType!,
        status: booking.status || 'PENDING',
        provider: booking.provider!,
        providerBookingId: booking.providerBookingId,
        providerData: booking.providerData || {},
        basePrice: booking.basePrice!,
        markupAmount: booking.markupAmount!,
        serviceFee: booking.serviceFee!,
        totalAmount: booking.totalAmount!,
        currency: booking.currency || 'NGN',
        bookingData: booking.bookingData || {},
        passengerInfo: booking.passengerInfo,
        paymentInfo: booking.paymentInfo,
        paymentStatus: booking.paymentStatus || 'PENDING',
        paymentProvider: booking.paymentProvider as any,
        paymentReference: booking.paymentReference,
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

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
        ...(data.paymentProvider && { paymentProvider: data.paymentProvider as any }),
        ...(data.paymentReference && { paymentReference: data.paymentReference }),
        ...(data.providerBookingId && { providerBookingId: data.providerBookingId }),
        ...(data.providerData && { providerData: data.providerData }),
        ...(data.cancelledAt && { cancelledAt: data.cancelledAt }),
        ...(data.cancelledBy && { cancelledBy: data.cancelledBy }),
        ...(data.refundAmount && { refundAmount: data.refundAmount }),
        ...(data.refundStatus && { refundStatus: data.refundStatus as any }),
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
  }): Promise<Booking[]> {
    const where: any = {
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.productType) {
      where.productType = filters.productType;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
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

    return bookings.map((booking) => this.mapToBooking(booking));
  }

  /**
   * Map Prisma booking result to Booking entity
   * Converts Decimal types to numbers
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
      basePrice: toNumber(prismaBooking.basePrice),
      markupAmount: toNumber(prismaBooking.markupAmount),
      serviceFee: toNumber(prismaBooking.serviceFee),
      totalAmount: toNumber(prismaBooking.totalAmount),
      currency: prismaBooking.currency,
      bookingData: prismaBooking.bookingData,
      passengerInfo: prismaBooking.passengerInfo,
      paymentInfo: prismaBooking.paymentInfo,
      paymentStatus: prismaBooking.paymentStatus,
      paymentProvider: prismaBooking.paymentProvider,
      paymentReference: prismaBooking.paymentReference,
      cancelledAt: prismaBooking.cancelledAt,
      cancelledBy: prismaBooking.cancelledBy,
      refundAmount: prismaBooking.refundAmount ? toNumber(prismaBooking.refundAmount) : undefined,
      refundStatus: prismaBooking.refundStatus,
      createdAt: prismaBooking.createdAt,
      updatedAt: prismaBooking.updatedAt,
      deletedAt: prismaBooking.deletedAt,
    };
  }
}
