import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { LoyaltyService } from '@domains/loyalty/loyalty.service';
import { BookingService } from '@domains/booking/services/booking.service';
import { VoucherService } from '@domains/loyalty/voucher.service';
import { CreateDuffelOrderUseCase } from '@application/booking/use-cases/create-duffel-order.use-case';
import { CreateAmadeusHotelBookingUseCase } from '@application/booking/use-cases/create-amadeus-hotel-booking.use-case';
import { CreateCarRentalBookingUseCase } from '@application/booking/use-cases/create-car-rental-booking.use-case';
import { CreateHotelbedsBookingUseCase } from '@application/booking/use-cases/create-hotelbeds-booking.use-case';
import { TicketWakanowFlightUseCase } from '@application/booking/use-cases/ticket-wakanow-flight.use-case';
import { ResendService } from '@infrastructure/email/resend.service';
import { Provider } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly loyaltyService: LoyaltyService,
    private readonly voucherService: VoucherService,
    private readonly createDuffelOrderUseCase: CreateDuffelOrderUseCase,
    private readonly createAmadeusHotelBookingUseCase: CreateAmadeusHotelBookingUseCase,
    private readonly createCarRentalBookingUseCase: CreateCarRentalBookingUseCase,
    private readonly createHotelbedsBookingUseCase: CreateHotelbedsBookingUseCase,
    private readonly ticketWakanowFlightUseCase: TicketWakanowFlightUseCase,
    private readonly resendService: ResendService,
    private readonly bookingService: BookingService,
  ) {}

  async execute(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.created':
        await this.handlePaymentIntentCreated(event.data.object as Stripe.PaymentIntent);
        break;

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
      const verifiedPaymentIntent = await this.stripeService.retrievePaymentIntent(paymentIntent.id);

      if (verifiedPaymentIntent.status !== 'succeeded') {
        this.logger.warn(
          `Payment intent ${paymentIntent.id} status is ${verifiedPaymentIntent.status}, not 'succeeded'. ` +
          `Not processing booking ${bookingId}. This may be a test mode simulation.`,
        );
        return;
      }

      if (verifiedPaymentIntent.amount_received === 0) {
        this.logger.warn(
          `Payment intent ${paymentIntent.id} has amount_received = 0. Not processing booking ${bookingId}.`,
        );
        return;
      }
    } catch (error) {
      this.logger.error(
        `CRITICAL: Could not verify payment intent ${paymentIntent.id} with Stripe: ${error instanceof Error ? error.message : 'Unknown error'
        }. Booking ${bookingId} will NOT be marked as successful for security reasons.`,
      );
      return;
    }

    const chargeId =
      typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : (paymentIntent.latest_charge as any)?.id ?? null;

    try {
      const existingBooking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        select: { paymentStatus: true },
      });

      if (existingBooking?.paymentStatus === 'COMPLETED') {
        this.logger.log(
          `Booking ${bookingId} is already marked as COMPLETED. Ignoring duplicate webhook event.`,
        );
        return;
      }

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
          ...(chargeId && { stripeChargeId: chargeId }),
          paymentInfo: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            paidAt: new Date(),
            verified: true,
            ...(chargeId && { chargeId }),
          },
        },
      });

      this.logger.log(`Booking ${bookingId} payment confirmed`);

      // Voucher handling
      if (booking.voucherId) {
        this.voucherService
          .markVoucherAsUsed(booking.voucherId, bookingId)
          .then(() => {
            this.logger.log(`Voucher ${booking.voucherId} marked as used for booking ${bookingId}`);
          })
          .catch((error) => {
            this.logger.error(`Failed to mark voucher as used for booking ${bookingId}: `, error);
          });
      }

      // Loyalty points
      this.loyaltyService
        .earnPointsFromBooking(
          booking.userId,
          bookingId,
          booking.productType,
          Number(booking.totalAmount),
          booking.currency,
        )
        .then(({ pointsEarned, newBalance }) => {
          if (pointsEarned > 0) {
            this.logger.log(
              `Awarded ${pointsEarned} loyalty points to user ${booking.userId} for booking ${bookingId}. Balance: ${newBalance}`,
            );
          }
        })
        .catch((error) => {
          this.logger.error(`Failed to award loyalty points for booking ${bookingId}: `, error);
        });

      const isDuffelFlight =
        booking.provider === Provider.DUFFEL &&
        (booking.productType === 'FLIGHT_INTERNATIONAL' || booking.productType === 'FLIGHT_DOMESTIC');

      const isWakanowFlight =
        booking.provider === Provider.WAKANOW &&
        (booking.productType === 'FLIGHT_INTERNATIONAL' || booking.productType === 'FLIGHT_DOMESTIC');

      // ============================================================
      // ✅ SEND EMAILS FOR NON-FLIGHT BOOKINGS IMMEDIATELY
      // ============================================================
      if (!isDuffelFlight && !isWakanowFlight) {
        this.logger.log(`📧 Sending confirmation emails for ${booking.productType} booking ${bookingId}...`);
        this.sendBookingEmails(booking, paymentIntent)
          .then(() => {
            this.logger.log(`✅ Confirmation emails sent for booking ${bookingId}`);
            return this.prisma.booking.update({
              where: { id: bookingId },
              data: { confirmationEmailSentAt: new Date() },
            });
          })
          .catch((error) => {
            this.logger.error(`❌ Failed to send booking emails for ${bookingId}: `, error);
          });
      }

      // ============================================================
      // ✅ DUFFEL FLIGHT
      // ============================================================
      if (isDuffelFlight) {
        try {
          this.logger.log(`Creating Duffel order for booking ${bookingId}...`);
          const { orderId } = await this.createDuffelOrderUseCase.execute(bookingId);
          this.logger.log(`✅ Successfully created Duffel order ${orderId} for booking ${bookingId}`);

          // ✅ Send email after successful order creation
          const updatedBooking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { id: true, email: true, name: true } } },
          });
          if (updatedBooking) {
            this.logger.log(`📧 Sending Duffel flight confirmation email...`);
            await this.sendBookingEmails(updatedBooking, paymentIntent);
            await this.prisma.booking.update({
              where: { id: bookingId },
              data: { confirmationEmailSentAt: new Date() },
            });
            this.logger.log(`✅ Duffel flight confirmation email sent`);
          }
        } catch (error: any) {
          this.logger.error(`Failed to create Duffel order for booking ${bookingId}:`, error);

          const isExpiredError = error.status === 410 ||
            error.message?.includes('expired') ||
            error.message?.includes('GONE');

          if (isExpiredError) {
            this.logger.warn(`⚠️ Offer expired for booking ${bookingId}. Checking for stored data...`);

            const bookingData = booking.bookingData as any;
            const hasStoredOfferData = !!(bookingData?.offerData || bookingData?.offerPassengers);

            if (hasStoredOfferData) {
              this.logger.log(`🔄 Retrying with stored data for booking ${bookingId}...`);
              try {
                const { orderId } = await this.createDuffelOrderUseCase.execute(bookingId);
                this.logger.log(`✅ Duffel order created with stored data: ${orderId}`);

                // ✅ Send email after successful retry
                const updatedBooking = await this.prisma.booking.findUnique({
                  where: { id: bookingId },
                  include: { user: { select: { id: true, email: true, name: true } } },
                });
                if (updatedBooking) {
                  this.logger.log(`📧 Sending Duffel flight confirmation email (retry)...`);
                  await this.sendBookingEmails(updatedBooking, paymentIntent);
                  await this.prisma.booking.update({
                    where: { id: bookingId },
                    data: { confirmationEmailSentAt: new Date() },
                  });
                  this.logger.log(`✅ Duffel flight confirmation email sent (retry)`);
                }
                return;
              } catch (retryError) {
                this.logger.error(`❌ Retry with stored data failed: ${retryError.message}`);
              }
            }

            // Mark as FAILED but DO NOT auto-refund
            await this.prisma.booking.update({
              where: { id: bookingId },
              data: {
                status: 'FAILED',
                providerData: {
                  ...(booking.providerData as any),
                  orderCreationError: 'Offer expired - manual review required',
                  orderCreationFailedAt: new Date().toISOString(),
                  recoverable: true,
                  offerExpired: true,
                },
              },
            });

            // ✅ Send failure email
            if (booking.user?.email) {
              this.resendService.sendBookingFailureEmail({
                to: booking.user.email,
                customerName: booking.user.name || 'Valued Customer',
                bookingReference: booking.reference || booking.id,
                productType: booking.productType,
                amount: Number(booking.totalAmount),
                currency: booking.currency,
                failureReason: `The flight offer expired. Our team has been notified and will manually secure your booking or initiate a refund. No automatic refund has been processed.`,
              }).catch((err) => this.logger.error(`Failed to send failure email: `, err));
            }

            this.logger.log(`⏳ Booking ${bookingId} marked as FAILED - manual review required, no auto-refund`);
            return;
          }

          // Other errors: Mark as FAILED
          await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: 'FAILED',
              providerData: {
                ...(booking.providerData as any),
                orderCreationError: error instanceof Error ? error.message : 'Unknown error',
                orderCreationFailedAt: new Date().toISOString(),
                recoverable: false,
              },
            },
          });

          // ✅ Send failure email
          if (booking.user?.email) {
            this.resendService.sendBookingFailureEmail({
              to: booking.user.email,
              customerName: booking.user.name || 'Valued Customer',
              bookingReference: booking.reference || booking.id,
              productType: booking.productType,
              amount: Number(booking.totalAmount),
              currency: booking.currency,
              failureReason: `Failed to secure booking: ${error instanceof Error ? error.message : 'Unknown provider error'}. Our team has been notified and will assist you shortly.`,
            }).catch((err) => this.logger.error(`Failed to send failure email: `, err));
          }

          this.logger.warn(`Booking ${bookingId} failed, manual review required`);
        }
      }

      // ============================================================
      // ✅ WAKANOW FLIGHT
      // ============================================================
      if (isWakanowFlight) {
        try {
          this.logger.log(`Automatically ticketing Wakanow flight for booking ${bookingId}...`);

          const bookingData = booking.bookingData as any;
          const providerData = booking.providerData as any;

          // Helper function to extract PNR properly
          const extractPnr = (data: any, provider: any): string | null => {
            const candidates = [
              data?.wakanowPnr,
              data?.pnrNumber,
              data?.pnrReferenceNumber,
              provider?.FlightBookingResult?.FlightBookingSummaryModel?.PnReferenceNumber,
              provider?.FlightBookingSummaryModel?.PnReferenceNumber,
              provider?.FlightBookingSummary?.PnrReferenceNumber,
              provider?.PnReferenceNumber,
              data?.FlightBookingResult?.FlightBookingSummaryModel?.PnReferenceNumber,
              data?.PnReferenceNumber,
            ];

            for (const candidate of candidates) {
              if (candidate && typeof candidate === 'string') {
                if (!/^\d{10,}$/.test(candidate)) {
                  return candidate;
                }
              }
            }
            return null;
          };

          // Extract PNR
          let pnrNumber = extractPnr(bookingData, providerData);

          // Extract Wakanow Booking ID
          const wakanowBookingId =
            bookingData?.wakanowBookingId ||
            bookingData?.bookingId ||
            providerData?.BookingId ||
            providerData?.booking_id ||
            null;

          this.logger.log(`🔍 Found PNR: ${pnrNumber}, WakanowId: ${wakanowBookingId}`);

          // Validate
          if (!pnrNumber) {
            this.logger.error(`❌ No valid PNR found for booking ${bookingId}`);

            await this.prisma.booking.update({
              where: { id: bookingId },
              data: {
                providerData: {
                  ...providerData,
                  ticketingError: 'PNR not found',
                  ticketingErrorAt: new Date().toISOString(),
                } as any,
              },
            });

            throw new Error(`Cannot issue ticket: PNR not found. Booking ID: ${wakanowBookingId || bookingId}`);
          }

          if (!wakanowBookingId) {
            this.logger.error(`❌ No Wakanow Booking ID found for booking ${bookingId}`);
            throw new Error(`Cannot issue ticket: Wakanow Booking ID not found.`);
          }

          // Prevent using Booking ID as PNR
          if (pnrNumber === wakanowBookingId) {
            this.logger.warn(`⚠️ PNR equals Booking ID (${pnrNumber}). This is a bug - PNR should be the airline PNR.`);

            const recoveredPnr = providerData?.FlightBookingResult
              ?.FlightBookingSummaryModel
              ?.PnReferenceNumber;

            if (recoveredPnr && recoveredPnr !== wakanowBookingId && !/^\d{10,}$/.test(recoveredPnr)) {
              pnrNumber = recoveredPnr;
              this.logger.log(`✅ Recovered PNR from providerData: ${pnrNumber}`);
            } else {
              throw new Error(`Cannot issue ticket: PNR appears to be a Booking ID (${pnrNumber}). Please check the booking creation logic.`);
            }
          }

          this.logger.log(`✅ Valid data - PNR: ${pnrNumber}, BookingId: ${wakanowBookingId}`);

          // Retry logic with delays
          let lastError: any;
          let ticketSuccess = false;

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              if (attempt > 1) {
                const delayMs = 3000 * attempt;
                this.logger.log(`⏳ Waiting ${delayMs}ms before attempt ${attempt}/3...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }

              this.logger.log(`🔄 Ticket attempt ${attempt}/3 for booking ${bookingId}...`);

              await this.ticketWakanowFlightUseCase.execute(
                {
                  bookingId: wakanowBookingId,
                  pnrNumber: pnrNumber
                },
                bookingId
              );

              ticketSuccess = true;
              this.logger.log(`✅ Successfully ticketed Wakanow flight for booking ${bookingId} on attempt ${attempt}`);
              break;
            } catch (error) {
              lastError = error;
              this.logger.warn(`⚠️ Ticket attempt ${attempt}/3 failed for booking ${bookingId}: ${error.message}`);

              if (error.message?.includes('pending') || error.message?.includes('processing')) {
                this.logger.log(`⏳ Ticket is pending, will retry later.`);
                break;
              }

              if (error.message?.includes('PNR') || error.message?.includes('not found')) {
                this.logger.error(`❌ PNR issue detected, aborting retries.`);
                break;
              }
            }
          }

          if (!ticketSuccess) {
            throw lastError || new Error('All ticket attempts failed');
          }

          // ✅ Send email after successful ticketing
          const updatedBooking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { id: true, email: true, name: true } } },
          });
          if (updatedBooking) {
            this.logger.log(`📧 Sending Wakanow flight confirmation email...`);
            await this.sendBookingEmails(updatedBooking, paymentIntent);
            await this.prisma.booking.update({
              where: { id: bookingId },
              data: { confirmationEmailSentAt: new Date() },
            });
            this.logger.log(`✅ Wakanow flight confirmation email sent`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to ticket Wakanow flight for booking ${bookingId}. Payment confirmed but ticketing failed. Initiating automatic refund.`,
            error,
          );

          if (booking.stripeChargeId || chargeId) {
            try {
              this.logger.log(`Initiating automatic Stripe refund for failed Wakanow booking ${bookingId}...`);
              await this.stripeService.createRefund({ paymentIntentId: paymentIntent.id });

              await this.prisma.booking.update({
                where: { id: bookingId },
                data: { refundStatus: 'PROCESSING', paymentStatus: 'REFUNDED' }
              });
              this.logger.log(`Automatic refund initiated for Wakanow booking ${bookingId}`);
            } catch (refundError) {
              this.logger.error(`Failed to initiate automatic refund for Wakanow booking ${bookingId}: `, refundError);
            }
          }

          // ✅ Send failure email
          if (booking.user?.email) {
            this.resendService.sendBookingFailureEmail({
              to: booking.user.email,
              customerName: booking.user.name || 'Valued Customer',
              bookingReference: booking.reference || booking.id,
              productType: booking.productType,
              amount: Number(booking.totalAmount),
              currency: booking.currency,
              failureReason: `Flight ticketing failed with provider: ${error instanceof Error ? error.message : 'Unknown provider error'}. We have automatically initiated a full refund back to your payment method.`,
            }).catch((err) => this.logger.error(`Failed to send failure email to ${booking.user?.email}: `, err));
          }
        }
      }

      // ============================================================
      // ✅ AMADEUS HOTEL (Asynchronous)
      // ============================================================
      if (booking.provider === Provider.AMADEUS && booking.productType === 'HOTEL') {
        this.logger.log(`Processing Amadeus hotel order creation for booking ${bookingId} asynchronously...`);

        // ✅ Store booking with user for later use
        const bookingWithUser = booking;

        this.createAmadeusHotelBookingUseCase
          .createAmadeusBookingAfterPayment(bookingId)
          .then(async ({ orderId }) => {
            this.logger.log(`Successfully created Amadeus hotel order ${orderId} for booking ${bookingId}`);

            // ✅ Send email after successful order creation
            const updatedBooking = await this.prisma.booking.findUnique({
              where: { id: bookingId },
              include: { user: { select: { id: true, email: true, name: true } } },
            });
            if (updatedBooking) {
              this.logger.log(`📧 Sending Amadeus hotel confirmation email...`);
              await this.sendBookingEmails(updatedBooking, paymentIntent);
              await this.prisma.booking.update({
                where: { id: bookingId },
                data: { confirmationEmailSentAt: new Date() },
              });
              this.logger.log(`✅ Amadeus hotel confirmation email sent`);
            }
          })
          .catch(async (error) => {
            this.logger.error(
              `Failed to create Amadeus hotel order for booking ${bookingId}. Payment confirmed but order creation failed: `,
              error,
            );

            // ✅ Send failure email
            if (bookingWithUser.user?.email) {
              this.resendService.sendBookingFailureEmail({
                to: bookingWithUser.user.email,
                customerName: bookingWithUser.user.name || 'Valued Customer',
                bookingReference: bookingWithUser.reference || bookingId,
                productType: bookingWithUser.productType,
                amount: Number(bookingWithUser.totalAmount),
                currency: bookingWithUser.currency,
                failureReason: error instanceof Error ? error.message : 'Unknown provider error',
              }).catch((err) => this.logger.error(`Failed to send failure email: `, err));
            }

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
                // Ignore parsing errors
              }
            }

            this.prisma.booking
              .update({
                where: { id: bookingId },
                data: {
                  providerData: {
                    ...(bookingWithUser.providerData as any),
                    orderCreationError: amadeusError.message,
                    amadeusError,
                    orderCreationFailedAt: new Date().toISOString(),
                  },
                },
              })
              .catch((updateError) => {
                this.logger.error(`Failed to update booking ${bookingId} with error status: `, updateError);
              });
          });
      }

      // ============================================================
      // ✅ HOTELBEDS HOTEL (Asynchronous)
      // ============================================================
      if (booking.provider === Provider.HOTELBEDS && booking.productType === 'HOTEL') {
        this.logger.log(`Processing Hotelbeds hotel order creation for booking ${bookingId} asynchronously...`);

        // ✅ Store booking with user for later use
        const bookingWithUser = booking;

        this.createHotelbedsBookingUseCase
          .createHotelbedsBookingAfterPayment(bookingId)
          .then(async ({ orderId }) => {
            this.logger.log(`Successfully created Hotelbeds hotel order ${orderId} for booking ${bookingId}`);

            // ✅ Send email after successful order creation
            const updatedBooking = await this.prisma.booking.findUnique({
              where: { id: bookingId },
              include: { user: { select: { id: true, email: true, name: true } } },
            });
            if (updatedBooking) {
              this.logger.log(`📧 Sending Hotelbeds hotel confirmation email...`);
              await this.sendBookingEmails(updatedBooking, paymentIntent);
              await this.prisma.booking.update({
                where: { id: bookingId },
                data: { confirmationEmailSentAt: new Date() },
              });
              this.logger.log(`✅ Hotelbeds hotel confirmation email sent`);
            }
          })
          .catch(async (error) => {
            this.logger.error(
              `Failed to create Hotelbeds hotel order for booking ${bookingId}. Initiating automatic refund.`,
              error,
            );

            if (bookingWithUser.stripeChargeId || chargeId) {
              this.stripeService.createRefund({ paymentIntentId: paymentIntent.id })
                .then(() => {
                  return this.prisma.booking.update({
                    where: { id: bookingId },
                    data: { refundStatus: 'PROCESSING', paymentStatus: 'REFUNDED' }
                  });
                })
                .catch(err => this.logger.error(`Failed automatic refund for Hotelbeds booking ${bookingId}: `, err));
            }

            // ✅ Send failure email
            if (bookingWithUser.user?.email) {
              this.resendService.sendBookingFailureEmail({
                to: bookingWithUser.user.email,
                customerName: bookingWithUser.user.name || 'Valued Customer',
                bookingReference: bookingWithUser.reference || bookingId,
                productType: bookingWithUser.productType,
                amount: Number(bookingWithUser.totalAmount),
                currency: bookingWithUser.currency,
                failureReason: `Hotel booking failed with provider: ${error instanceof Error ? error.message : 'Unknown provider error'}. We have automatically initiated a full refund back to your payment method.`,
              }).catch((err) => this.logger.error(`Failed to send failure email: `, err));
            }
          });
      }

     
if (booking.provider === Provider.AMADEUS && booking.productType === 'CAR_RENTAL') {
  this.logger.log(`Processing Amadeus transfer order creation for car rental booking ${bookingId} asynchronously...`);

  const bookingWithUser = booking;

  // ✅ Use .then() and .catch() - already doing this! 
  this.createCarRentalBookingUseCase
    .createAmadeusOrderAfterPayment(bookingId)
    .then(async ({ orderId }) => {
      this.logger.log(`✅ Successfully created Amadeus transfer order ${orderId} for car rental booking ${bookingId}`);

      // ✅ Send email after successful order creation
      const updatedBooking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      if (updatedBooking) {
        this.logger.log(`📧 Sending car rental confirmation email...`);
        await this.sendBookingEmails(updatedBooking, paymentIntent);
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { confirmationEmailSentAt: new Date() },
        });
        this.logger.log(`✅ Car rental confirmation email sent`);
      }
    })
    .catch(async (error) => {
      this.logger.error(
        `Failed to create Amadeus transfer order for car rental booking ${bookingId}. Payment confirmed but order creation failed: `,
        error,
      );

      // ✅ Send failure email
      if (bookingWithUser.user?.email) {
        this.resendService.sendBookingFailureEmail({
          to: bookingWithUser.user.email,
          customerName: bookingWithUser.user.name || 'Valued Customer',
          bookingReference: bookingWithUser.reference || bookingId,
          productType: bookingWithUser.productType,
          amount: Number(bookingWithUser.totalAmount),
          currency: bookingWithUser.currency,
          failureReason: error instanceof Error ? error.message : 'Unknown provider error',
        }).catch((err) => this.logger.error(`Failed to send failure email: `, err));
      }

      this.prisma.booking
        .update({
          where: { id: bookingId },
          data: {
            providerData: {
              ...(bookingWithUser.providerData as any),
              orderCreationError: error instanceof Error ? error.message : 'Unknown error',
              orderCreationFailedAt: new Date().toISOString(),
            },
          },
        })
        .catch((updateError) => {
          this.logger.error(`Failed to update booking ${bookingId} with error status: `, updateError);
        });
    });
}
    } catch (error) {
      this.logger.error(`Failed to update booking ${bookingId}: `, error);
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
      this.logger.error(`Failed to update booking ${bookingId}: `, error);
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
      this.logger.error(`Failed to update booking ${bookingId}: `, error);
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId = charge.payment_intent as string;

    if (!paymentIntentId) {
      this.logger.error('Charge missing payment_intent');
      return;
    }

    try {
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
          this.logger.log(`✅ Refund email sent to ${user.email}`);
        }
      } catch (emailError) {
        this.logger.error(`Failed to send refund email: `, emailError);
      }
    } catch (error) {
      this.logger.error(`Failed to process refund: `, error);
    }
  }

 // ============================================================
// REPLACE THE sendBookingEmails METHOD WITH THIS COMPLETE VERSION
// ============================================================

private async sendBookingEmails(booking: any, paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const user = booking.user;
    if (!user || !user.email) {
      this.logger.warn(`Cannot send booking emails: user email not found for booking ${booking.id}`);
      return;
    }

    const bookingData = booking.bookingData as any || {};
    const passengerInfo = booking.passengerInfo as any || {};
    const productType = booking.productType;

    // ✅ Extract passenger details using the complete extraction logic
    const passengers = this.extractPassengers(booking, productType);
    const leadName = passengers.lead;
    const otherPassengers = passengers.others;

    // ✅ Get passenger contact details
    const passengerEmail = passengerInfo.email || 
                           bookingData.email || 
                           bookingData.driver?.email ||
                           user.email ||
                           'no-email@provided.com';
                           
    const passengerPhone = passengerInfo.phone || 
                           bookingData.phone || 
                           bookingData.driver?.phone ||
                           'N/A';

    
    const bookingDetails = this.extractBookingDetails(booking, productType, passengerInfo);


    const productTypeLabel = this.getProductTypeLabel(productType);


    this.logger.log(`📧 Sending confirmation email for ${productType} booking ${booking.reference}`);
    this.logger.log(`📧 Product: ${productTypeLabel}`);
    this.logger.log(`📧 Lead Passenger: ${leadName}`);
    this.logger.log(`📧 Other Passengers: ${otherPassengers.length}`);
    this.logger.log(`📧 Booking Details:`, bookingDetails);


    try {
      await this.resendService.sendBookingConfirmationEmail({
        to: user.email,
        customerName: leadName,
        bookingReference: booking.reference,
        productType: productType,
        provider: booking.provider,
        passengerDetails: {
          name: leadName,
          email: passengerEmail,
          phone: passengerPhone,
          address: passengerInfo.address || bookingData.billingAddress?.line || '',
          city: passengerInfo.city || bookingData.billingAddress?.cityName || '',
          country: passengerInfo.country || bookingData.billingAddress?.countryCode || '',
        },
        otherPassengers: otherPassengers.length > 0 ? otherPassengers : undefined,
        bookingDetails: bookingDetails,
        pricing: {
          basePrice: Number(booking.basePrice) || 0,
          markupAmount: Number(booking.markupAmount) || 0,
          serviceFee: Number(booking.serviceFee) || 0,
          totalAmount: Number(booking.totalAmount) || 0,
          currency: booking.currency || 'NGN',
        },
        confirmationDate: new Date(),
        bookingId: booking.id,
        cancellationDeadline: (booking as any).cancellationDeadline ?? undefined,
        cancellationPolicySummary: (booking as any).cancellationPolicySnapshot ?? undefined,
        noShowWording: productType === 'HOTEL' 
          ? 'In case of no-show, the hotel may charge the full stay amount to the card used at booking. Our service fee is non-refundable once the booking is confirmed.'
          : undefined,
      });
      this.logger.log(`✅ Booking confirmation email sent successfully`);
    } catch (bookingEmailError) {
      this.logger.error(`❌ Failed to send booking confirmation email:`, bookingEmailError);
    }


    this.logger.log(`📧 Sending payment receipt email to ${user.email}`);

    try {
      await this.resendService.sendPaymentReceiptEmail({
        to: user.email,
        customerName: leadName,
        bookingReference: booking.reference,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentDate: new Date(),
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        productType: productType,
        bookingDetails: bookingDetails,
      });
      this.logger.log(`✅ Payment receipt email sent successfully`);
    } catch (receiptEmailError) {
      this.logger.error(`❌ Failed to send payment receipt email:`, receiptEmailError);
    }

    this.logger.log(`📧 All emails processed for booking ${booking.id}`);

  } catch (error) {
    this.logger.error(`❌ sendBookingEmails failed:`, error);
    throw error;
  }
}


 private extractBookingDetails(booking: any, productType: string, passengerInfo?: any): any {
  const bookingData = booking.bookingData || {};
  const details: any = {};
  

  const pInfo = passengerInfo || booking.passengerInfo || {};


  if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
    if (booking.provider === 'WAKANOW') {
 
      details.origin = bookingData.origin || 
                       bookingData.departureAirport || 
                       bookingData.departure || 
                       bookingData.departure_code ||
                       bookingData.From || 
                       'N/A';
                       
      details.destination = bookingData.destination || 
                            bookingData.arrivalAirport || 
                            bookingData.arrival || 
                            bookingData.arrival_code ||
                            bookingData.To || 
                            'N/A';
                            
      details.departureDate = bookingData.departureDate || 
                              bookingData.departure_time || 
                              bookingData.departureTime || 
                              bookingData.DepartureDate ||
                              bookingData.departure_date ||
                              '';
                              
      details.arrivalDate = bookingData.arrivalDate || 
                            bookingData.arrival_time || 
                            bookingData.arrivalTime || 
                            bookingData.ArrivalDate ||
                            bookingData.arrival_date ||
                            '';
                            
      details.airlineName = bookingData.airlineName || 
                            bookingData.airline || 
                            bookingData.carrierName || 
                            bookingData.AirlineName ||
                            bookingData.marketing_carrier_name ||
                            '';
                            
      details.flightNumber = bookingData.flightNumber || 
                             bookingData.flight_number || 
                             bookingData.carrierFlightNumber || 
                             bookingData.FlightNumber ||
                             '';
                             
      details.cabinClass = bookingData.cabinClass || 
                           bookingData.cabin_class || 
                           bookingData.CabinClass ||
                           'Economy';
                           
      details.stops = bookingData.stops || 
                      bookingData.stopCount || 
                      bookingData.stop_count ||
                      0;
                      
      details.bookingClass = bookingData.bookingClass || 
                             bookingData.class || 
                             bookingData.booking_class ||
                             'Economy';
    }
    
 
    if (booking.provider === 'DUFFEL') {
      const slices = bookingData.slices || [];
      const outboundSlice = slices[0] || {};
      const returnSlice = slices.length > 1 ? slices[1] : null;
      const segments = outboundSlice.segments || [];
      const firstSegment = segments[0] || {};
      const lastSegment = segments[segments.length - 1] || firstSegment;
      
      details.origin = firstSegment.origin?.iata_code || 
                       firstSegment.origin?.iataCode || 
                       outboundSlice.origin?.iata_code ||
                       'N/A';
                       
      details.destination = lastSegment.destination?.iata_code || 
                            lastSegment.destination?.iataCode || 
                            outboundSlice.destination?.iata_code ||
                            'N/A';
                            
      details.departureDate = firstSegment.departing_at || 
                              firstSegment.departure?.at || 
                              outboundSlice.departure_time ||
                              '';
                              
      details.arrivalDate = lastSegment.arriving_at || 
                            lastSegment.arrival?.at || 
                            outboundSlice.arrival_time ||
                            '';
                            
      const owner = bookingData.owner || {};
      const operatingCarrier = firstSegment.operating_carrier || {};
      details.airlineName = owner.name || 
                            operatingCarrier.name || 
                            firstSegment.operating_carrier?.name ||
                            '';
                            
      details.flightNumber = firstSegment.marketing_carrier_flight_number || 
                             firstSegment.flight_number || 
                             firstSegment.number ||
                             '';
                             
      details.cabinClass = outboundSlice.cabin_class || 
                           outboundSlice.cabinClass || 
                           'Economy';
                           
      details.stops = Math.max(0, (segments.length || 1) - 1);
      
      details.bookingClass = details.cabinClass || 'Economy';
      
      // Duffel return flight
      if (returnSlice) {
        const returnSegments = returnSlice.segments || [];
        const firstReturn = returnSegments[0] || {};
        const lastReturn = returnSegments[returnSegments.length - 1] || firstReturn;
        
        details.returnOrigin = firstReturn.origin?.iata_code || 
                               firstReturn.origin?.iataCode || 
                               returnSlice.origin?.iata_code ||
                               '';
                               
        details.returnDestination = lastReturn.destination?.iata_code || 
                                    lastReturn.destination?.iataCode || 
                                    returnSlice.destination?.iata_code ||
                                    '';
                                    
        details.returnDepartureDate = firstReturn.departing_at || 
                                      firstReturn.departure?.at || 
                                      returnSlice.departure_time ||
                                      '';
                                      
        details.returnArrivalDate = lastReturn.arriving_at || 
                                    lastReturn.arrival?.at || 
                                    returnSlice.arrival_time ||
                                    '';
                                    
        const returnCarrier = firstReturn.operating_carrier || {};
        details.returnAirlineName = returnCarrier.name || details.airlineName || '';
        details.returnFlightNumber = firstReturn.marketing_carrier_flight_number || 
                                     firstReturn.flight_number || 
                                     '';
        details.returnStops = Math.max(0, (returnSegments.length || 1) - 1);
      }
    }
  }

  // ============================================================
  // 🏨 HOTEL
  // ============================================================
  if (productType === 'HOTEL') {
    const hotelDetails = bookingData.hotelDetails || {};
    
    details.hotelName = hotelDetails.hotelName || 
                        bookingData.hotelName || 
                        bookingData.name || 
                        bookingData.hotel?.name ||
                        bookingData.hotelData?.name ||
                        '';
                        
    details.hotelAddress = hotelDetails.hotelAddress || 
                           bookingData.hotelAddress || 
                           bookingData.address || 
                           bookingData.hotel?.address?.line ||
                           bookingData.hotelData?.address ||
                           '';
                           
    details.hotelCity = hotelDetails.hotelCity || 
                        bookingData.hotelCity || 
                        bookingData.city || 
                        bookingData.hotel?.address?.cityName ||
                        bookingData.hotelData?.city ||
                        '';
                        
    details.hotelCountry = hotelDetails.hotelCountry || 
                           bookingData.hotelCountry || 
                           bookingData.country || 
                           bookingData.hotel?.address?.countryCode ||
                           bookingData.hotelData?.country ||
                           '';
                           
    details.hotelRating = hotelDetails.hotelRating || 
                          bookingData.hotelRating || 
                          bookingData.rating || 
                          bookingData.hotel?.rating ||
                          bookingData.hotelData?.rating ||
                          null;
                          
    details.hotelPhone = hotelDetails.hotelPhone || 
                         bookingData.hotelPhone || 
                         bookingData.phone || 
                         bookingData.hotel?.contact?.phone ||
                         bookingData.hotelData?.phone ||
                         '';
                         
    details.checkInDate = hotelDetails.checkInDate || 
                          bookingData.checkInDate || 
                          bookingData.check_in_date || 
                          bookingData.hotel?.checkInDate ||
                          '';
                          
    details.checkOutDate = hotelDetails.checkOutDate || 
                           bookingData.checkOutDate || 
                           bookingData.check_out_date || 
                           bookingData.hotel?.checkOutDate ||
                           '';
                           
    details.roomType = hotelDetails.roomType || 
                       bookingData.roomType || 
                       bookingData.room_type || 
                       bookingData.selectedRoomType ||
                       bookingData.selectedRoom?.type ||
                       'Standard Room';
                       
    details.numberOfRooms = hotelDetails.numberOfRooms || 
                            bookingData.numberOfRooms || 
                            bookingData.rooms || 
                            bookingData.roomQuantity ||
                            1;
                            
    details.boardType = hotelDetails.boardType || 
                        bookingData.boardType || 
                        bookingData.board_type || 
                        'Room Only';
                        
    details.guests = hotelDetails.guests || 
                     bookingData.guests || 
                     bookingData.adults || 
                     bookingData.guestCount ||
                     1;
                     
    details.adults = hotelDetails.adults || 
                     bookingData.adults || 
                     details.guests;
                     
    details.children = hotelDetails.children || 
                       bookingData.children || 
                       0;
                       
    details.hotelCheckInTime = hotelDetails.hotelCheckInTime || 
                               bookingData.hotelCheckInTime || 
                               bookingData.checkInTime || 
                               '15:00';
                               
    details.hotelCheckOutTime = hotelDetails.hotelCheckOutTime || 
                                bookingData.hotelCheckOutTime || 
                                bookingData.checkOutTime || 
                                '12:00';
                                
    details.hotelDescription = hotelDetails.hotelDescription || 
                               bookingData.hotelDescription || 
                               '';
                               
    details.hotelAmenities = hotelDetails.hotelAmenities || 
                             bookingData.hotelAmenities || 
                             [];
                             
    details.hotelImages = hotelDetails.hotelImages || 
                          bookingData.hotelImages || 
                          [];
  }

  // ============================================================
  // 🚗 CAR RENTAL - FIXED (uses pInfo instead of passengerInfo)
  // ============================================================
  if (productType === 'CAR_RENTAL') {
    details.pickupLocation = bookingData.pickup_location || 
                             bookingData.pickupLocation || 
                             bookingData.pickup?.locationCode ||
                             bookingData.start?.locationCode ||
                             bookingData.startAddressLine ||
                             'N/A';
                             
    details.dropoffLocation = bookingData.dropoff_location || 
                              bookingData.dropoffLocation || 
                              bookingData.dropoff?.locationCode ||
                              bookingData.end?.locationCode ||
                              bookingData.endAddressLine ||
                              'N/A';
                              
    details.pickupDateTime = bookingData.pickupDateTime || 
                             bookingData.pickup_date_time || 
                             bookingData.pickup?.dateTime ||
                             bookingData.start?.dateTime ||
                             bookingData.startDateTime ||
                             '';
                             
    details.dropoffDateTime = bookingData.dropoffDateTime || 
                              bookingData.dropoff_date_time || 
                              bookingData.dropoff?.dateTime ||
                              bookingData.end?.dateTime ||
                              bookingData.endDateTime ||
                              '';
                              
    details.vehicleType = bookingData.vehicleType || 
                          bookingData.vehicle_type || 
                          bookingData.vehicle?.description ||
                          bookingData.realData?.vehicleType ||
                          bookingData.vehicleCategory ||
                          'Standard';
                          
    details.vehicleCategory = bookingData.vehicleCategory || 
                              bookingData.vehicle_category || 
                              'Standard';
                              
    details.vehicleCode = bookingData.vehicleCode || 
                          bookingData.vehicle_code || 
                          '';
                          
    details.vehicleName = bookingData.vehicleName || 
                          bookingData.vehicle_name || 
                          bookingData.vehicle || 
                          '';
                          
    details.carProvider = bookingData.serviceProvider || 
                          bookingData.carProvider || 
                          bookingData.provider ||
                          bookingData.serviceProvider?.name ||
                          bookingData.providerName ||
                          '';
                          
    details.seats = bookingData.vehicle?.seats?.[0]?.count || 
                    bookingData.seats ||
                    bookingData.realData?.seats ||
                    bookingData.passengers ||
                    4;
                    
    details.baggage = bookingData.vehicle?.baggages?.[0]?.count || 
                      bookingData.baggage ||
                      bookingData.realData?.baggage ||
                      bookingData.baggageCapacity ||
                      2;
                      
    details.transferType = bookingData.transferType || 
                           bookingData.transfer_type || 
                           'Private';
                           
    details.duration = bookingData.duration || 
                       bookingData.tripDuration || 
                       'N/A';
                       
    // Driver info - FIXED: use pInfo instead of passengerInfo
    const driver = bookingData.driver || {};
    details.driverName = driver.firstName && driver.lastName
      ? `${driver.firstName} ${driver.lastName}`
      : driver.name || 
        pInfo.firstName && pInfo.lastName
          ? `${pInfo.firstName} ${pInfo.lastName}`
          : pInfo.name || 
            'N/A';
            
    details.driverPhone = driver.phone || 
                          pInfo.phone || 
                          'N/A';
                          
    details.driverEmail = driver.email || 
                          pInfo.email || 
                          booking.user?.email || 
                          'N/A';
  }

  return details;
}

/**
 * Extract passengers for all product types
 */
private extractPassengers(booking: any, productType: string): { lead: string, others: string[], all: any[] } {
  const bookingData = booking.bookingData || {};
  const passengerInfo = booking.passengerInfo || {};
  
  // Lead passenger - try multiple sources
  let leadName = 'Valued Customer';
  
  // Try from passengerInfo
  if (passengerInfo.firstName && passengerInfo.lastName) {
    leadName = `${passengerInfo.firstName} ${passengerInfo.lastName}`;
  } else if (passengerInfo.name) {
    leadName = passengerInfo.name;
  } else if (passengerInfo.firstName) {
    leadName = passengerInfo.firstName;
  } else if (passengerInfo.lastName) {
    leadName = passengerInfo.lastName;
  }
  
  // Try from user
  if (leadName === 'Valued Customer' && booking.user?.name) {
    leadName = booking.user.name;
  }
  
  const otherPassengers: string[] = [];
  const allPassengers: any[] = [];
  
  // Try different sources for passengers
  let passengers = [];
  
  // Source 1: bookingData.passengers
  if (bookingData.passengers && Array.isArray(bookingData.passengers)) {
    passengers = bookingData.passengers;
  }
  // Source 2: bookingData.travellers (Wakanow)
  else if (bookingData.travellers && Array.isArray(bookingData.travellers)) {
    passengers = bookingData.travellers;
  }
  // Source 3: bookingData.guests (Hotel)
  else if (bookingData.guests && Array.isArray(bookingData.guests)) {
    passengers = bookingData.guests;
  }
  // Source 4: bookingData.passengerInfo
  else if (bookingData.passengerInfo) {
    passengers = [bookingData.passengerInfo];
  }
  
  // Source 5: Passenger info from Duffel slices
  if (passengers.length === 0 && bookingData.slices) {
    const slices = bookingData.slices || [];
    const firstSlice = slices[0] || {};
    const passengersFromSlice = firstSlice.passengers || [];
    if (passengersFromSlice.length > 0) {
      passengers = passengersFromSlice;
    }
  }
  
  for (const p of passengers) {
    let pName = '';
    
    // Try different name field formats
    if (p.name?.firstName && p.name?.lastName) {
      pName = `${p.name.firstName} ${p.name.lastName}`;
    } else if (p.name?.name) {
      pName = p.name.name;
    } else if (p.FirstName && p.LastName) {
      pName = `${p.FirstName} ${p.LastName}`;
    } else if (p.firstName && p.lastName) {
      pName = `${p.firstName} ${p.lastName}`;
    } else if (p.name) {
      pName = p.name;
    } else if (p.fullName) {
      pName = p.fullName;
    } else if (p.forename && p.surname) {
      pName = `${p.forename} ${p.surname}`;
    }
    
    if (pName && pName.trim()) {
      allPassengers.push({ name: pName, ...p });
      if (pName !== leadName && !otherPassengers.includes(pName)) {
        otherPassengers.push(pName);
      }
    }
  }
  
  // If no passengers found, use lead passenger
  if (allPassengers.length === 0 && leadName) {
    allPassengers.push({ name: leadName });
  }
  
  return { lead: leadName, others: otherPassengers, all: allPassengers };
}

/**
 * Get product type label
 */
private getProductTypeLabel(productType: string): string {
  const labels: Record<string, string> = {
    'FLIGHT_INTERNATIONAL': 'International Flight',
    'FLIGHT_DOMESTIC': 'Domestic Flight',
    'HOTEL': 'Hotel',
    'CAR_RENTAL': 'Car Rental',
  };
  return labels[productType] || productType;
}

  private async handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      this.logger.debug(`PaymentIntent ${paymentIntent.id} created without bookingId`);
      return;
    }

    try {
      this.logger.log(`PaymentIntent ${paymentIntent.id} created for booking ${bookingId}`);
    } catch (error) {
      this.logger.error(`Failed to handle payment_intent.created for booking ${bookingId}: `, error);
    }
  }
}