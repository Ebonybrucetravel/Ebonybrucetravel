import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { BookingStatus, Provider, RefundStatus } from '@prisma/client';
import { CancellationRequestStatus } from '@prisma/client';

const toNumber = (v: any): number => (v == null ? 0 : Number(v));

/**
 * User-initiated hotel cancellation per BOOKING_OPERATIONS_AND_RISK:
 * - Before cancellation deadline: Amadeus cancel → Stripe refund (margin) → update status → email.
 * - After deadline: create CancellationRequest for admin queue; no auto-refund.
 */
@Injectable()
export class RequestHotelCancellationUseCase {
  private readonly logger = new Logger(RequestHotelCancellationUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amadeusService: AmadeusService,
    private readonly stripeService: StripeService,
    private readonly resendService: ResendService,
  ) {}

  async execute(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own booking');
    }

    if (booking.provider !== Provider.AMADEUS || booking.productType !== 'HOTEL') {
      throw new BadRequestException('This endpoint only supports Amadeus hotel bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be cancelled');
    }

    const now = new Date();
    const deadline = booking.cancellationDeadline ? new Date(booking.cancellationDeadline) : null;

    // After deadline (or no deadline stored): submit for admin review
    if (!deadline || now >= deadline) {
      const existing = await this.prisma.cancellationRequest.findFirst({
        where: { bookingId, status: CancellationRequestStatus.PENDING },
      });
      if (existing) {
        return {
          submitted: true,
          message:
            'A cancellation request is already pending. Our team will respond within 3–5 business days.',
          cancellationRequestId: existing.id,
        };
      }

      const request = await this.prisma.cancellationRequest.create({
        data: {
          bookingId,
          requestedBy: userId,
          status: CancellationRequestStatus.PENDING,
        },
      });

      this.logger.log(`Cancellation request ${request.id} created for booking ${bookingId} (after deadline)`);

      return {
        submitted: true,
        message:
          'Cancellation request submitted. Our team will review and respond within 3–5 business days.',
        cancellationRequestId: request.id,
      };
    }

    // Before deadline: auto-cancel and refund margin
    let amadeusCancellationResult: any = null;
    if (booking.providerBookingId) {
      try {
        amadeusCancellationResult = await this.amadeusService.cancelHotelBooking(booking.providerBookingId);
        this.logger.log(`Amadeus hotel order ${booking.providerBookingId} cancelled for booking ${bookingId}`);
      } catch (error) {
        this.logger.error(`Amadeus cancel failed for booking ${bookingId}:`, error);
        throw new BadRequestException(
          'Could not cancel the reservation with the hotel. Please contact support.',
        );
      }
    }

    const paymentIntentId = booking.paymentReference;
    if (paymentIntentId && booking.paymentStatus === 'COMPLETED') {
      const markup = toNumber(booking.markupAmount);
      const serviceFee = toNumber(booking.serviceFee);
      const voucherDiscount = toNumber(booking.voucherDiscount) || 0;
      const originalTotal = toNumber(booking.totalAmount);
      let marginToRefund = markup + serviceFee;
      if (voucherDiscount > 0 && originalTotal > 0) {
        const discountRatio = voucherDiscount / originalTotal;
        marginToRefund = marginToRefund * (1 - discountRatio);
      }
      const currency = (booking.currency || 'GBP').toUpperCase();
      const multiplier = currency === 'JPY' ? 1 : 100;
      const amountInSmallestUnit = Math.round(marginToRefund * multiplier);

      if (amountInSmallestUnit > 0) {
        try {
          await this.stripeService.createRefund({
            paymentIntentId,
            amount: amountInSmallestUnit,
            reason: 'requested_by_customer',
          });
          this.logger.log(`Stripe refund (margin) created for booking ${bookingId}`);
        } catch (error) {
          this.logger.error(`Stripe refund failed for booking ${bookingId}:`, error);
          // Still mark booking cancelled; refund can be done manually
        }
      }
    }

    const refundAmount = toNumber(booking.markupAmount) + toNumber(booking.serviceFee);
    const voucherDiscount = toNumber(booking.voucherDiscount) || 0;
    const originalTotal = toNumber(booking.totalAmount);
    let actualRefund = refundAmount;
    if (voucherDiscount > 0 && originalTotal > 0) {
      actualRefund = refundAmount * (1 - voucherDiscount / originalTotal);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        refundAmount: actualRefund,
        refundStatus: RefundStatus.PROCESSING,
        bookingData: {
          ...(booking.bookingData as any),
          cancellation: amadeusCancellationResult?.data ?? amadeusCancellationResult,
          cancelledAt: new Date().toISOString(),
          cancellationProvider: Provider.AMADEUS,
        },
      },
      include: { user: { select: { email: true, name: true } } },
    });
    if (updatedBooking.user?.email) {
      try {
        await this.resendService.sendCancellationEmail({
          to: updatedBooking.user.email,
          customerName: updatedBooking.user.name || 'Valued Customer',
          bookingReference: booking.reference,
          refundAmount: actualRefund,
          refundCurrency: booking.currency,
          hasAirlineCredits: false,
          cancellationDate: new Date(),
        });
      } catch (emailError) {
        this.logger.error('Failed to send cancellation email:', emailError);
      }
    }

    return {
      cancelled: true,
      message: 'Booking cancelled. Your margin (service fee) will be refunded to your original payment method.',
      booking: {
        id: updatedBooking.id,
        reference: updatedBooking.reference,
        status: updatedBooking.status,
        refundAmount: actualRefund,
        refundCurrency: booking.currency,
      },
    };
  }
}
