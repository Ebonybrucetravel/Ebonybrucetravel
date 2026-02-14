import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { BookingStatus, Provider, RefundStatus } from '@prisma/client';
import { CancellationRequestStatus } from '@prisma/client';

const toNumber = (v: any): number => (v == null ? 0 : Number(v));

export type ProcessCancellationRequestAction = 'reject' | 'partial_refund' | 'full_refund';

export interface ProcessCancellationRequestDto {
  action: ProcessCancellationRequestAction;
  refundAmount?: number; // For partial_refund, in major units (e.g. GBP)
  adminNotes?: string;
  rejectionReason?: string;
}

/**
 * Admin processes an after-deadline cancellation request: reject, partial refund, or full refund.
 * Per BOOKING_OPERATIONS_AND_RISK.
 */
@Injectable()
export class ProcessCancellationRequestUseCase {
  private readonly logger = new Logger(ProcessCancellationRequestUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amadeusService: AmadeusService,
    private readonly stripeService: StripeService,
    private readonly resendService: ResendService,
  ) {}

  async listPending() {
    const requests = await this.prisma.cancellationRequest.findMany({
      where: { status: CancellationRequestStatus.PENDING },
      include: {
        booking: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });
    return requests.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      reference: r.booking.reference,
      requestedAt: r.requestedAt,
      requestedBy: r.requestedBy,
      guestEmail: r.booking.user?.email,
      guestName: r.booking.user?.name,
      cancellationDeadline: r.booking.cancellationDeadline,
      cancellationPolicySnapshot: r.booking.cancellationPolicySnapshot,
      deadlinePassed: r.booking.cancellationDeadline ? new Date() >= new Date(r.booking.cancellationDeadline) : true,
      totalAmount: toNumber(r.booking.totalAmount),
      markupAmount: toNumber(r.booking.markupAmount),
      serviceFee: toNumber(r.booking.serviceFee),
      currency: r.booking.currency,
    }));
  }

  async execute(requestId: string, adminUserId: string, dto: ProcessCancellationRequestDto) {
    const request = await this.prisma.cancellationRequest.findUnique({
      where: { id: requestId },
      include: {
        booking: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Cancellation request ${requestId} not found`);
    }

    if (request.status !== CancellationRequestStatus.PENDING) {
      throw new BadRequestException(`Request already ${request.status}`);
    }

    const booking = request.booking;
    if (booking.provider !== Provider.AMADEUS || booking.productType !== 'HOTEL') {
      throw new BadRequestException('Only Amadeus hotel bookings are supported');
    }

    const now = new Date();

    if (dto.action === 'reject') {
      await this.prisma.cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: CancellationRequestStatus.REJECTED,
          processedAt: now,
          processedBy: adminUserId,
          adminNotes: dto.adminNotes,
          rejectionReason: dto.rejectionReason,
        },
      });
      this.logger.log(`Cancellation request ${requestId} rejected by admin ${adminUserId}`);
      return { processed: true, action: 'reject', message: 'Cancellation request rejected.' };
    }

    // full_refund or partial_refund: cancel in Amadeus, refund via Stripe, update booking
    if (booking.providerBookingId) {
      try {
        await this.amadeusService.cancelHotelBooking(booking.providerBookingId);
        this.logger.log(`Amadeus order ${booking.providerBookingId} cancelled for request ${requestId}`);
      } catch (error) {
        this.logger.error(`Amadeus cancel failed for request ${requestId}:`, error);
        throw new BadRequestException('Could not cancel with the hotel. Please try again or contact support.');
      }
    }

    let refundAmountMajor = 0;
    if (dto.action === 'full_refund') {
      const markup = toNumber(booking.markupAmount);
      const serviceFee = toNumber(booking.serviceFee);
      const voucherDiscount = toNumber(booking.voucherDiscount) || 0;
      const originalTotal = toNumber(booking.totalAmount);
      refundAmountMajor = markup + serviceFee;
      if (voucherDiscount > 0 && originalTotal > 0) {
        refundAmountMajor *= 1 - voucherDiscount / originalTotal;
      }
    } else if (dto.action === 'partial_refund' && typeof dto.refundAmount === 'number' && dto.refundAmount > 0) {
      refundAmountMajor = dto.refundAmount;
    }

    const currency = (booking.currency || 'GBP').toUpperCase();
    const multiplier = currency === 'JPY' ? 1 : 100;
    const amountInSmallestUnit = Math.round(refundAmountMajor * multiplier);

    if (amountInSmallestUnit > 0 && booking.paymentReference) {
      try {
        await this.stripeService.createRefund({
          paymentIntentId: booking.paymentReference,
          amount: amountInSmallestUnit,
          reason: 'requested_by_customer',
        });
      } catch (error) {
        this.logger.error(`Stripe refund failed for request ${requestId}:`, error);
        throw new BadRequestException('Refund could not be processed. Please try again.');
      }
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancelledBy: adminUserId,
        refundAmount: refundAmountMajor,
        refundStatus: RefundStatus.PROCESSING,
        bookingData: {
          ...(booking.bookingData as any),
          cancelledAt: now.toISOString(),
          cancellationProvider: Provider.AMADEUS,
          cancellationRequestId: requestId,
        },
      },
    });

    await this.prisma.cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: CancellationRequestStatus.APPROVED,
        processedAt: now,
        processedBy: adminUserId,
        adminNotes: dto.adminNotes,
        refundAmount: refundAmountMajor,
        refundStatus: RefundStatus.PROCESSING,
      },
    });

    if (booking.user?.email && refundAmountMajor > 0) {
      try {
        await this.resendService.sendCancellationEmail({
          to: booking.user.email,
          customerName: booking.user.name || 'Valued Customer',
          bookingReference: booking.reference,
          refundAmount: refundAmountMajor,
          refundCurrency: booking.currency,
          hasAirlineCredits: false,
          cancellationDate: now,
        });
      } catch (e) {
        this.logger.error('Failed to send cancellation email:', e);
      }
    }

    this.logger.log(`Cancellation request ${requestId} approved (${dto.action}) by admin ${adminUserId}`);
    return {
      processed: true,
      action: dto.action,
      refundAmount: refundAmountMajor,
      refundCurrency: booking.currency,
      message: `Cancellation approved. ${refundAmountMajor > 0 ? `Refund of ${refundAmountMajor} ${booking.currency} will be processed.` : ''}`,
    };
  }
}
