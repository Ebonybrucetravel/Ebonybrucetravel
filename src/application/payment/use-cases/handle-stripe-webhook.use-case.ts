import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { CreateDuffelOrderUseCase } from '@application/booking/use-cases/create-duffel-order.use-case';
import Stripe from 'stripe';

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly createDuffelOrderUseCase: CreateDuffelOrderUseCase,
  ) {}

  async execute(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      this.logger.error('Payment intent missing bookingId in metadata');
      return;
    }

    try {
      // First, update booking payment status
      const booking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            paidAt: new Date(),
          },
        },
      });

      this.logger.log(`Booking ${bookingId} payment confirmed`);

      // If this is a Duffel flight booking, create the Duffel order
      if (booking.provider === 'DUFFEL' && (booking.productType === 'FLIGHT_INTERNATIONAL' || booking.productType === 'FLIGHT_DOMESTIC')) {
        try {
          this.logger.log(`Creating Duffel order for booking ${bookingId}...`);
          const { orderId } = await this.createDuffelOrderUseCase.execute(bookingId);
          this.logger.log(`Successfully created Duffel order ${orderId} for booking ${bookingId}`);
        } catch (error) {
          // Log error but don't fail the webhook - payment is already confirmed
          this.logger.error(
            `Failed to create Duffel order for booking ${bookingId}. Payment confirmed but order creation failed:`,
            error,
          );
          // Update booking to indicate order creation failed
          await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
              providerData: {
                ...(booking.providerData as any),
                orderCreationError: error instanceof Error ? error.message : 'Unknown error',
                orderCreationFailedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to update booking ${bookingId}:`, error);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      this.logger.error('Payment intent missing bookingId in metadata');
      return;
    }

    try {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'FAILED',
          status: 'FAILED',
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            failureReason: paymentIntent.last_payment_error?.message,
            failedAt: new Date(),
          },
        },
      });

      this.logger.log(`Booking ${bookingId} payment failed`);
    } catch (error) {
      this.logger.error(`Failed to update booking ${bookingId}:`, error);
    }
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      this.logger.error('Payment intent missing bookingId in metadata');
      return;
    }

    try {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            canceledAt: new Date(),
          },
        },
      });

      this.logger.log(`Booking ${bookingId} payment canceled`);
    } catch (error) {
      this.logger.error(`Failed to update booking ${bookingId}:`, error);
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      this.logger.error('Charge missing payment_intent');
      return;
    }

    try {
      // Find booking by payment reference
      const booking = await this.prisma.booking.findFirst({
        where: { paymentReference: paymentIntentId },
      });

      if (!booking) {
        this.logger.warn(`Booking not found for payment intent ${paymentIntentId}`);
        return;
      }

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          refundStatus: 'COMPLETED',
          refundAmount: charge.amount_refunded
            ? Number(charge.amount_refunded) / (booking.currency === 'NGN' ? 100 : 100)
            : null,
          paymentStatus: charge.amount_refunded === charge.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          status: 'REFUNDED',
        },
      });

      this.logger.log(`Booking ${booking.id} refunded`);
    } catch (error) {
      this.logger.error(`Failed to process refund:`, error);
    }
  }
}

