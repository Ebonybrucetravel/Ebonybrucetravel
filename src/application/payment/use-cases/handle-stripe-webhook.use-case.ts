import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { CreateDuffelOrderUseCase } from '@application/booking/use-cases/create-duffel-order.use-case';
import { CreateAmadeusHotelBookingUseCase } from '@application/booking/use-cases/create-amadeus-hotel-booking.use-case';
import { CreateCarRentalBookingUseCase } from '@application/booking/use-cases/create-car-rental-booking.use-case';
import { ResendService } from '@infrastructure/email/resend.service';
import { Provider } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly createDuffelOrderUseCase: CreateDuffelOrderUseCase,
    private readonly createAmadeusHotelBookingUseCase: CreateAmadeusHotelBookingUseCase,
    private readonly createCarRentalBookingUseCase: CreateCarRentalBookingUseCase,
    private readonly resendService: ResendService,
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

    // CRITICAL: Verify payment intent status with Stripe before processing
    // This prevents marking bookings as successful when payment hasn't actually been processed
    try {
      const verifiedPaymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntent.id);

      if (verifiedPaymentIntent.status !== 'succeeded') {
        this.logger.warn(
          `Payment intent ${paymentIntent.id} status is ${verifiedPaymentIntent.status}, not 'succeeded'. ` +
            `Not processing booking ${bookingId}. This may be a test mode simulation.`,
        );
        return; // Don't process if payment hasn't actually succeeded
      }

      // Additional validation: ensure payment was actually charged
      if (verifiedPaymentIntent.amount_received === 0) {
        this.logger.warn(
          `Payment intent ${paymentIntent.id} has amount_received=0. Not processing booking ${bookingId}.`,
        );
        return; // Don't process if no payment was actually received
      }
    } catch (error) {
      // CRITICAL: If we can't verify with Stripe, DO NOT process the booking
      // This prevents false positives and ensures we only mark bookings as successful when payment is verified
      this.logger.error(
        `CRITICAL: Could not verify payment intent ${paymentIntent.id} with Stripe: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Booking ${bookingId} will NOT be marked as successful for security reasons.`,
      );
      return; // DO NOT process if we can't verify - this is a security requirement
    }

    try {
      // First, update booking payment status
      const booking = await this.prisma.booking.update({
        where: { id: bookingId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            paidAt: new Date(),
            verified: true, // Flag to indicate we verified with Stripe
          },
        },
      });

      this.logger.log(`Booking ${bookingId} payment confirmed`);

      // Send booking confirmation and payment receipt emails
      // Process asynchronously to avoid blocking webhook response
      this.sendBookingEmails(booking, paymentIntent).catch((error) => {
        this.logger.error(`Failed to send booking emails for ${bookingId}:`, error);
        // Don't throw - email failure shouldn't break the webhook
      });

      // If this is a Duffel flight booking, create the Duffel order
      if (
        booking.provider === Provider.DUFFEL &&
        (booking.productType === 'FLIGHT_INTERNATIONAL' || booking.productType === 'FLIGHT_DOMESTIC')
      ) {
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

      // If this is an Amadeus hotel booking, create the Amadeus order
      // Process asynchronously to avoid blocking webhook response
      if (booking.provider === Provider.AMADEUS && booking.productType === 'HOTEL') {
        this.logger.log(`Processing Amadeus hotel order creation for booking ${bookingId} asynchronously...`);
        // Don't await - process in background to respond quickly to Stripe
        this.createAmadeusHotelBookingUseCase
          .createAmadeusBookingAfterPayment(bookingId)
          .then(({ orderId }) => {
            this.logger.log(`Successfully created Amadeus hotel order ${orderId} for booking ${bookingId}`);
          })
          .catch((error) => {
            // Log error but don't fail the webhook - payment is already confirmed
            this.logger.error(
              `Failed to create Amadeus hotel order for booking ${bookingId}. Payment confirmed but order creation failed:`,
              error,
            );

            // Build sanitized Amadeus error details (safe for storage/display)
            let amadeusError: any = {
              message: error instanceof Error ? error.message : 'Unknown error',
            };

            if (error instanceof HttpException) {
              try {
                const response = error.getResponse();
                const status = error.getStatus();

                amadeusError.status = status;

                if (typeof response === 'string') {
                  amadeusError.detail = response;
                } else if (typeof response === 'object' && response) {
                  const res: any = response;
                  if (res.errors && Array.isArray(res.errors) && res.errors.length > 0) {
                    const first = res.errors[0];
                    amadeusError.code = first.code;
                    amadeusError.title = first.title;
                    amadeusError.detail = first.detail;
                    amadeusError.source = first.source;
                  } else {
                    amadeusError.detail = res.message || res.error || JSON.stringify(res);
                  }
                }
              } catch {
                // If parsing fails, keep the basic error message only
              }
            }

            // Update booking to indicate order creation failed with sanitized error info
            this.prisma.booking
              .update({
                where: { id: bookingId },
                data: {
                  providerData: {
                    ...(booking.providerData as any),
                    orderCreationError: amadeusError.message,
                    amadeusError,
                    orderCreationFailedAt: new Date().toISOString(),
                  },
                },
              })
              .catch((updateError) => {
                this.logger.error(`Failed to update booking ${bookingId} with error status:`, updateError);
              });
          });
      }

      // If this is a car rental booking, create the Amadeus transfer order
      // Process asynchronously to avoid blocking webhook response
      if (booking.provider === Provider.AMADEUS && booking.productType === 'CAR_RENTAL') {
        this.logger.log(`Processing Amadeus transfer order creation for car rental booking ${bookingId} asynchronously...`);
        // Don't await - process in background to respond quickly to Stripe
        this.createCarRentalBookingUseCase
          .createAmadeusOrderAfterPayment(bookingId)
          .then(({ orderId }) => {
            this.logger.log(
              `Successfully created Amadeus transfer order ${orderId} for car rental booking ${bookingId}`,
            );
          })
          .catch((error) => {
            this.logger.error(
              `Failed to create Amadeus transfer order for car rental booking ${bookingId}. Payment confirmed but order creation failed:`,
              error,
            );
            this.prisma.booking
              .update({
                where: { id: bookingId },
                data: {
                  providerData: {
                    ...(booking.providerData as any),
                    orderCreationError: error instanceof Error ? error.message : 'Unknown error',
                    orderCreationFailedAt: new Date().toISOString(),
                  },
                },
              })
              .catch((updateError) => {
                this.logger.error(`Failed to update booking ${bookingId} with error status:`, updateError);
              });
          });
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

      const refundAmount = charge.amount_refunded
        ? Number(charge.amount_refunded) / (booking.currency === 'NGN' ? 100 : 100)
        : null;

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          refundStatus: 'COMPLETED',
          refundAmount: refundAmount,
          paymentStatus: charge.amount_refunded === charge.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          status: 'REFUNDED',
        },
      });

      this.logger.log(`Booking ${booking.id} refunded`);

      // Send refund email to customer
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: booking.userId },
          select: { email: true, name: true },
        });

        if (user && user.email && refundAmount) {
          await this.resendService.sendRefundEmail({
            to: user.email,
            customerName: user.name || 'Valued Customer',
            bookingReference: booking.reference,
            refundAmount: refundAmount,
            refundCurrency: booking.currency,
            refundDate: new Date(),
          });
        }
      } catch (emailError) {
        // Don't fail refund if email fails
        this.logger.error(`Failed to send refund email:`, emailError);
      }
    } catch (error) {
      this.logger.error(`Failed to process refund:`, error);
    }
  }

  /**
   * Send booking confirmation and payment receipt emails
   */
  private async sendBookingEmails(booking: any, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const user = booking.user;
      if (!user || !user.email) {
        this.logger.warn(`Cannot send booking emails: user email not found for booking ${booking.id}`);
        return;
      }

      const bookingData = booking.bookingData as any;
      const passengerInfo = booking.passengerInfo as any;

      // Extract booking details based on product type
      const bookingDetails: any = {};
      if (booking.productType === 'HOTEL') {
        bookingDetails.hotelName = bookingData.hotelName || bookingData.hotel?.name || 'Hotel';
        bookingDetails.roomType = bookingData.roomType || bookingData.room?.type;
        bookingDetails.checkInDate = bookingData.checkInDate || bookingData.check_in_date;
        bookingDetails.checkOutDate = bookingData.checkOutDate || bookingData.check_out_date;
        bookingDetails.guests = bookingData.guests?.length || passengerInfo?.guests?.length || 1;
        bookingDetails.adults = bookingData.adults || passengerInfo?.adults || bookingDetails.guests;
        bookingDetails.children = bookingData.children || passengerInfo?.children || 0;
      } else if (booking.productType === 'FLIGHT_INTERNATIONAL' || booking.productType === 'FLIGHT_DOMESTIC') {
        bookingDetails.origin = bookingData.origin || bookingData.slices?.[0]?.origin?.iata_code;
        bookingDetails.destination = bookingData.destination || bookingData.slices?.[0]?.destination?.iata_code;
        bookingDetails.departureDate = bookingData.departureDate || bookingData.slices?.[0]?.segments?.[0]?.departing_at;
        bookingDetails.arrivalDate = bookingData.arrivalDate || bookingData.slices?.[0]?.segments?.[bookingData.slices?.[0]?.segments?.length - 1]?.arriving_at;
      } else if (booking.productType === 'CAR_RENTAL') {
        bookingDetails.pickupLocation = bookingData.pickupLocation || bookingData.pickup_location;
        bookingDetails.dropoffLocation = bookingData.dropoffLocation || bookingData.dropoff_location;
        bookingDetails.pickupDateTime = bookingData.pickupDateTime || bookingData.pickup_date_time;
        bookingDetails.dropoffDateTime = bookingData.dropoffDateTime || bookingData.dropoff_date_time;
      }

      // Send booking confirmation email
      await this.resendService.sendBookingConfirmationEmail({
        to: user.email,
        customerName: user.name || passengerInfo?.firstName || 'Valued Customer',
        bookingReference: booking.reference,
        productType: booking.productType,
        provider: booking.provider,
        bookingDetails,
        pricing: {
          basePrice: Number(booking.basePrice),
          markupAmount: Number(booking.markupAmount),
          serviceFee: Number(booking.serviceFee),
          totalAmount: Number(booking.totalAmount),
          currency: booking.currency,
        },
        confirmationDate: new Date(),
        bookingId: booking.id,
      });

      // Send payment receipt email
      await this.resendService.sendPaymentReceiptEmail({
        to: user.email,
        customerName: user.name || passengerInfo?.firstName || 'Valued Customer',
        bookingReference: booking.reference,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentDate: new Date(),
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        productType: booking.productType,
        bookingDetails,
      });

      this.logger.log(`Booking confirmation and receipt emails sent for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to send booking emails:`, error);
      // Don't throw - email failure shouldn't break the webhook
    }
  }
}

