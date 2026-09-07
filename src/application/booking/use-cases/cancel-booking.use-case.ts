import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus, Provider } from '@prisma/client';
import { StripeService } from '@domains/payment/services/stripe.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class CancelBookingUseCase {
  private readonly logger = new Logger(CancelBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly stripeService: StripeService,
    private readonly resendService: ResendService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(bookingId: string, userId: string) {
    this.logger.log(`Cancelling booking ${bookingId} for user ${userId}`);

    // 1. Find booking with user relation
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // 2. Verify user owns this booking
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }

    // 3. Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // 4. Only allow cancellation for PENDING or PAYMENT_PENDING
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw new BadRequestException(
        `Booking cannot be cancelled in current status: ${booking.status}. Please contact support.`
      );
    }

    // 5. Check if payment was made and needs refund
    let refundProcessed = false;
    let refundAmount = 0;
    let refundCurrency = booking.currency;
    let refundId: string | null = null;

    if (booking.paymentStatus === PaymentStatus.COMPLETED) {
      this.logger.log(`Payment completed for booking ${bookingId}, initiating refund...`);
      
      try {
        // ✅ Get payment intent ID from booking (multiple possible locations)
        const bookingData = booking.bookingData as any || {};
        const paymentInfo = booking.paymentInfo as any || {};
        
        const paymentIntentId = 
          booking.paymentReference || 
          paymentInfo.paymentIntentId ||
          bookingData.paymentIntentId ||
          bookingData.stripePaymentIntentId ||
          null;

        if (paymentIntentId) {
          this.logger.log(`💰 Found payment intent: ${paymentIntentId}`);
          
          // ✅ Process refund via Stripe
          const amountInSmallestUnit = booking.totalAmount 
            ? Math.round(Number(booking.totalAmount) * 100) 
            : undefined;

          const refund = await this.stripeService.createRefund({
            paymentIntentId: paymentIntentId,
            amount: amountInSmallestUnit,
            reason: 'requested_by_customer',
          });

          refundProcessed = true;
          refundId = refund.id;
          refundAmount = refund.amount ? refund.amount / 100 : Number(booking.totalAmount) || 0;
          refundCurrency = refund.currency?.toUpperCase() || booking.currency;

          this.logger.log(`✅ Refund processed for booking ${bookingId}: ${refundAmount} ${refundCurrency} (Refund ID: ${refundId})`);
        } else {
          this.logger.warn(`⚠️ No payment intent found for booking ${bookingId}, cannot process refund`);
          
          // Check if this is a hotel booking with paymentMethodId but no payment intent yet
          if (booking.provider === Provider.AMADEUS && booking.productType === 'HOTEL') {
            this.logger.warn(`⚠️ Hotel booking with no payment intent. Payment may not have been captured yet.`);
          }
        }
      } catch (refundError) {
        this.logger.error(`❌ Refund failed for booking ${bookingId}:`, refundError);
        // Continue with cancellation but mark refund as failed
      }
    } else {
      this.logger.log(`ℹ️ Booking ${bookingId} has payment status: ${booking.paymentStatus}, no refund needed`);
    }

    // 6. Update booking status
    const updatedBookingData = {
      ...(booking.bookingData as any || {}),
      cancelledAt: new Date().toISOString(),
      cancellationReason: 'User cancelled booking',
      cancellationRequestedBy: userId,
      cancellationSource: 'USER_PROFILE',
      ...(refundProcessed && {
        refundProcessedAt: new Date().toISOString(),
        refundAmount: refundAmount,
        refundCurrency: refundCurrency,
        refundId: refundId,
        refundStatus: 'COMPLETED',
      }),
      ...(!refundProcessed && booking.paymentStatus === PaymentStatus.COMPLETED && {
        refundStatus: 'FAILED',
        refundFailedAt: new Date().toISOString(),
        refundErrorMessage: 'Refund could not be processed automatically. Please contact support.',
      }),
    };

    // Update booking with cancellation and refund status
    const updateData: any = {
      status: BookingStatus.CANCELLED,
      bookingData: updatedBookingData,
    };

    if (refundProcessed) {
      updateData.paymentStatus = PaymentStatus.REFUNDED;
      updateData.refundStatus = 'COMPLETED';
      updateData.refundAmount = refundAmount;
    } else if (booking.paymentStatus === PaymentStatus.COMPLETED) {
      // Payment was completed but refund failed - keep payment status but mark refund as failed
      updateData.refundStatus = 'FAILED';
    }

    await this.bookingRepository.update(bookingId, updateData);

    // 7. Get user details for emails using Prisma directly
    let userEmail: string | null = null;
    let userName: string | null = null;
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: booking.userId },
        select: { email: true, name: true },
      });
      userEmail = user?.email || null;
      userName = user?.name || null;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${booking.userId}:`, error);
    }

    // 8. Send refund confirmation email if refund was processed
    if (refundProcessed && userEmail) {
      try {
        await this.resendService.sendRefundEmail({
          to: userEmail,
          customerName: userName || 'Valued Customer',
          bookingReference: booking.reference || bookingId,
          refundAmount: refundAmount,
          refundCurrency: refundCurrency,
          refundDate: new Date(),
        });
        this.logger.log(`✅ Refund email sent to ${userEmail}`);
      } catch (emailError) {
        this.logger.error(`Failed to send refund email:`, emailError);
      }
    } else if (!refundProcessed && booking.paymentStatus === PaymentStatus.COMPLETED && userEmail) {
      // Send failure notification if refund failed
      try {
        await this.resendService.sendBookingFailureEmail({
          to: userEmail,
          customerName: userName || 'Valued Customer',
          bookingReference: booking.reference || bookingId,
          productType: booking.productType,
          amount: Number(booking.totalAmount) || 0,
          currency: booking.currency || 'NGN',
          failureReason: 'Automatic refund failed. Please contact our support team to process your refund.',
        });
        this.logger.log(`✅ Refund failure email sent to ${userEmail}`);
      } catch (emailError) {
        this.logger.error(`Failed to send refund failure email:`, emailError);
      }
    }

    this.logger.log(`Booking ${bookingId} cancelled successfully`);

    return {
      success: true,
      bookingId: bookingId,
      reference: booking.reference,
      provider: booking.provider,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      refundEligible: refundProcessed,
      refundAmount: refundAmount,
      refundId: refundId,
      currency: refundCurrency || booking.currency,
      message: refundProcessed 
        ? 'Booking cancelled successfully. Refund has been processed.'
        : booking.paymentStatus === PaymentStatus.COMPLETED
          ? 'Booking cancelled successfully. Refund could not be processed automatically. Please contact support.'
          : 'Booking cancelled successfully. No refund was processed.',
    };
  }
}