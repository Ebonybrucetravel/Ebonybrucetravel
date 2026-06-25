import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { LoyaltyService } from '@domains/loyalty/loyalty.service';
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
  ) { }

  async execute(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing Stripe webhook: ${event.type} `);

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
        this.logger.warn(`Unhandled webhook event type: ${event.type} `);
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
          `Booking ${bookingId} is already marked as COMPLETED.Ignoring duplicate webhook event.`,
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
              `Awarded ${pointsEarned} loyalty points to user ${booking.userId} for booking ${bookingId}.Balance: ${newBalance} `,
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

      if (!isDuffelFlight && !isWakanowFlight) {
        this.sendBookingEmails(booking, paymentIntent)
          .then(() =>
            this.prisma.booking.update({
              where: { id: bookingId },
              data: { confirmationEmailSentAt: new Date() },
            }),
          )
          .catch((error) => {
            this.logger.error(`Failed to send booking emails for ${bookingId}: `, error);
          });
      }

      // ============================================================
      // ✅ DUFFEL FLIGHT - UPDATED: No auto-refund on expiry, uses stored data
      // ============================================================
      if (isDuffelFlight) {
        try {
          this.logger.log(`Creating Duffel order for booking ${bookingId}...`);
          const { orderId } = await this.createDuffelOrderUseCase.execute(bookingId);
          this.logger.log(`✅ Successfully created Duffel order ${orderId} for booking ${bookingId}`);

          const updatedBooking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { id: true, email: true, name: true } } },
          });
          if (updatedBooking) {
            await this.sendBookingEmails(updatedBooking, paymentIntent);
            await this.prisma.booking.update({
              where: { id: bookingId },
              data: { confirmationEmailSentAt: new Date() },
            });
          }
        } catch (error: any) {
          this.logger.error(`Failed to create Duffel order for booking ${bookingId}:`, error);

          // ✅ Check if it's an expired offer error
          const isExpiredError = error.status === 410 || 
                                 error.message?.includes('expired') ||
                                 error.message?.includes('GONE');

          if (isExpiredError) {
            this.logger.warn(`⚠️ Offer expired for booking ${bookingId}. Checking for stored data...`);

            // ✅ Check if booking has stored offer data
            const bookingData = booking.bookingData as any;
            const hasStoredOfferData = !!(bookingData?.offerData || bookingData?.offerPassengers);

            if (hasStoredOfferData) {
              this.logger.log(`🔄 Retrying with stored data for booking ${bookingId}...`);
              try {
                const { orderId } = await this.createDuffelOrderUseCase.execute(bookingId);
                this.logger.log(`✅ Duffel order created with stored data: ${orderId}`);

                const updatedBooking = await this.prisma.booking.findUnique({
                  where: { id: bookingId },
                  include: { user: { select: { id: true, email: true, name: true } } },
                });
                if (updatedBooking) {
                  await this.sendBookingEmails(updatedBooking, paymentIntent);
                  await this.prisma.booking.update({
                    where: { id: bookingId },
                    data: { confirmationEmailSentAt: new Date() },
                  });
                }
                return;
              } catch (retryError) {
                this.logger.error(`❌ Retry with stored data failed: ${retryError.message}`);
              }
            }

            // ✅ Mark as FAILED but DO NOT auto-refund
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

            // ✅ Send failure email (NOT refund)
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

          // ✅ For other errors: Mark as FAILED, DO NOT auto-refund
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

          // Send failure email
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


if (isWakanowFlight) {
  try {
    this.logger.log(`Automatically ticketing Wakanow flight for booking ${bookingId}...`);
    
    const bookingData = booking.bookingData as any;
    const providerData = booking.providerData as any;
    
    let pnrNumber = 
      bookingData?.pnrNumber ||                          
      bookingData?.pnrReferenceNumber || 
      bookingData?.wakanowBookingId ||
      providerData?.FlightBookingSummary?.PnrReferenceNumber ||
      providerData?.FlightBookingResult?.FlightBookingSummaryModel?.PnrReferenceNumber ||
      null;
      
    if (!pnrNumber && (booking as any).pnrNumber) {
      pnrNumber = (booking as any).pnrNumber;
    }
    
    const wakanowBookingId = 
      bookingData?.wakanowBookingId || 
      bookingData?.bookingId ||
      providerData?.BookingId ||
      providerData?.booking_id ||
      pnrNumber;
    
    this.logger.log(`🔍 Found PNR: ${pnrNumber}, WakanowId: ${wakanowBookingId}`);
      
    if (!pnrNumber || !wakanowBookingId || pnrNumber === 'PENDING_ISSUE') {
      this.logger.error(`Ticketing data missing for booking ${bookingId}. PNR: ${pnrNumber}, WakanowId: ${wakanowBookingId}`);
      throw new Error(`Cannot issue ticket: ${!pnrNumber || pnrNumber === 'PENDING_ISSUE' ? 'PNR is missing or pending' : 'Wakanow BookingId is missing'}.`);
    }

    // ✅ Retry with delay (3 attempts, increasing delays)
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
          { bookingId: wakanowBookingId, pnrNumber }, 
          bookingId
        );
        
        ticketSuccess = true;
        this.logger.log(`✅ Successfully ticketed Wakanow flight for booking ${bookingId} on attempt ${attempt}`);
        break;
      } catch (error) {
        lastError = error;
        this.logger.warn(`⚠️ Ticket attempt ${attempt}/3 failed for booking ${bookingId}: ${error.message}`);
        
        // If it's a pending status, don't retry immediately
        if (error.message?.includes('pending') || error.message?.includes('processing')) {
          this.logger.log(`⏳ Ticket is pending, will retry later.`);
          break;
        }
      }
    }

    // If all retries failed
    if (!ticketSuccess) {
      throw lastError || new Error('All ticket attempts failed');
    }

    const updatedBooking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (updatedBooking) {
      await this.sendBookingEmails(updatedBooking, paymentIntent);
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { confirmationEmailSentAt: new Date() },
      });
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

     
      if (booking.provider === Provider.AMADEUS && booking.productType === 'HOTEL') {
        this.logger.log(`Processing Amadeus hotel order creation for booking ${bookingId} asynchronously...`);
        this.createAmadeusHotelBookingUseCase
          .createAmadeusBookingAfterPayment(bookingId)
          .then(({ orderId }) => {
            this.logger.log(`Successfully created Amadeus hotel order ${orderId} for booking ${bookingId}`);
          })
          .catch((error) => {
            this.logger.error(
              `Failed to create Amadeus hotel order for booking ${bookingId}.Payment confirmed but order creation failed: `,
              error,
            );

            if (booking.user?.email) {
              this.resendService.sendBookingFailureEmail({
                to: booking.user.email,
                customerName: booking.user.name || 'Valued Customer',
                bookingReference: booking.reference || booking.id,
                productType: booking.productType,
                amount: Number(booking.totalAmount),
                currency: booking.currency,
                failureReason: error instanceof Error ? error.message : 'Unknown provider error',
              }).catch((err) => this.logger.error(`Failed to send failure email to ${booking.user?.email}: `, err));
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
              }
            }

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
                this.logger.error(`Failed to update booking ${bookingId} with error status: `, updateError);
              });
          });
      }

      // ============================================================
      // ✅ HOTELBEDS HOTEL (UNCHANGED)
      // ============================================================
      if (booking.provider === Provider.HOTELBEDS && booking.productType === 'HOTEL') {
        this.logger.log(`Processing Hotelbeds hotel order creation for booking ${bookingId} asynchronously...`);
        this.createHotelbedsBookingUseCase
          .createHotelbedsBookingAfterPayment(bookingId)
          .then(({ orderId }) => {
            this.logger.log(`Successfully created Hotelbeds hotel order ${orderId} for booking ${bookingId}`);
          })
          .catch((error) => {
            this.logger.error(
              `Failed to create Hotelbeds hotel order for booking ${bookingId}.Initiating automatic refund.`,
              error,
            );

            if (booking.stripeChargeId || chargeId) {
              this.stripeService.createRefund({ paymentIntentId: paymentIntent.id })
                .then(() => {
                  return this.prisma.booking.update({
                    where: { id: bookingId },
                    data: { refundStatus: 'PROCESSING', paymentStatus: 'REFUNDED' }
                  });
                })
                .catch(err => this.logger.error(`Failed automatic refund for Hotelbeds booking ${bookingId}: `, err));
            }

            if (booking.user?.email) {
              this.resendService.sendBookingFailureEmail({
                to: booking.user.email,
                customerName: booking.user.name || 'Valued Customer',
                bookingReference: booking.reference || booking.id,
                productType: booking.productType,
                amount: Number(booking.totalAmount),
                currency: booking.currency,
                failureReason: `Hotel booking failed with provider: ${error instanceof Error ? error.message : 'Unknown provider error'}. We have automatically initiated a full refund back to your payment method.`,
              }).catch((err) => this.logger.error(`Failed to send failure email to ${booking.user?.email}: `, err));
            }
          });
      }

      // ============================================================
      // ✅ CAR RENTAL (UNCHANGED)
      // ============================================================
      if (booking.provider === Provider.AMADEUS && booking.productType === 'CAR_RENTAL') {
        this.logger.log(`Processing Amadeus transfer order creation for car rental booking ${bookingId} asynchronously...`);
        this.createCarRentalBookingUseCase
          .createAmadeusOrderAfterPayment(bookingId)
          .then(({ orderId }) => {
            this.logger.log(
              `Successfully created Amadeus transfer order ${orderId} for car rental booking ${bookingId} `,
            );
          })
          .catch((error) => {
            this.logger.error(
              `Failed to create Amadeus transfer order for car rental booking ${bookingId}. Payment confirmed but order creation failed: `,
              error,
            );

            if (booking.user?.email) {
              this.resendService.sendBookingFailureEmail({
                to: booking.user.email,
                customerName: booking.user.name || 'Valued Customer',
                bookingReference: booking.reference || booking.id,
                productType: booking.productType,
                amount: Number(booking.totalAmount),
                currency: booking.currency,
                failureReason: error instanceof Error ? error.message : 'Unknown provider error',
              }).catch((err) => this.logger.error(`Failed to send failure email to ${booking.user?.email}: `, err));
            }

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
        this.logger.warn(`Booking not found for payment intent ${paymentIntentId} `);
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
        }
      } catch (emailError) {
        this.logger.error(`Failed to send refund email: `, emailError);
      }
    } catch (error) {
      this.logger.error(`Failed to process refund: `, error);
    }
  }

  private async sendBookingEmails(booking: any, paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const user = booking.user;
      if (!user || !user.email) {
        this.logger.warn(`Cannot send booking emails: user email not found for booking ${booking.id}`);
        return;
      }

      const bookingData = booking.bookingData as any;
      const passengerInfo = booking.passengerInfo as any;

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
        cancellationDeadline: (booking as any).cancellationDeadline ?? undefined,
        cancellationPolicySummary: (booking as any).cancellationPolicySnapshot ?? undefined,
        noShowWording:
          (booking as any).productType === 'HOTEL'
            ? 'In case of no-show, the hotel may charge the full stay amount to the card used at booking. Our service fee is non-refundable once the booking is confirmed.'
            : undefined,
      });

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
      this.logger.error(`Failed to send booking emails: `, error);
    }
  }
}