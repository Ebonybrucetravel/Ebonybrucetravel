import { Injectable, Logger, Inject } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { ResendService } from '@infrastructure/email/resend.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface DuffelWebhookEvent {
  type: string;
  object: {
    id: string;
    [key: string]: any;
  };
  created_at: string;
}

@Injectable()
export class HandleDuffelWebhookUseCase {
  private readonly logger = new Logger(HandleDuffelWebhookUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly resendService: ResendService,
    private readonly prisma: PrismaService,
  ) { }

  async execute(event: DuffelWebhookEvent): Promise<void> {
    this.logger.log(`Processing Duffel webhook: ${event.type}`);

    switch (event.type) {
      case 'order.created':
        await this.handleOrderCreated(event.object);
        break;

      case 'order.creation_failed':
        await this.handleOrderCreationFailed(event.object);
        break;

      case 'order.updated':
        await this.handleOrderUpdated(event.object);
        break;

      case 'order.airline_initiated_change':
        await this.handleAirlineInitiatedChange(event.object);
        break;

      case 'order_cancellation.created':
        await this.handleCancellationCreated(event.object);
        break;

      case 'order_cancellation.confirmed':
        await this.handleCancellationConfirmed(event.object);
        break;

      default:
        this.logger.warn(`Unhandled Duffel webhook event type: ${event.type}`);
    }
  }

  private async handleOrderCreated(order: any): Promise<void> {
    try {
      let booking = await this.bookingRepository.findByProviderBookingId(order.id);

      if (!booking && order.metadata?.booking_reference) {
        this.logger.log(`Looking for booking by reference: ${order.metadata.booking_reference}`);
        booking = await this.bookingRepository.findByReference(order.metadata.booking_reference);
      }

      if (!booking && order.metadata?.booking_id) {
        this.logger.log(`Looking for booking by ID: ${order.metadata.booking_id}`);
        booking = await this.bookingRepository.findById(order.metadata.booking_id);
      }

      if (!booking) {
        this.logger.warn(`Booking not found for Duffel order ${order.id}`);
        await this.storePendingOrder(order);
        return;
      }

      await this.bookingRepository.update(booking.id, {
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.COMPLETED,
        providerBookingId: order.id,
        providerData: {
          ...(booking.providerData as any),
          order: order,
          orderCreatedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`✅ Order ${order.id} created for booking ${booking.id} (${booking.reference})`);
    } catch (error) {
      this.logger.error(`Failed to handle order.created for order ${order.id}:`, error);
      throw error;
    }
  }

  private async handleOrderCreationFailed(orderData: any): Promise<void> {
    try {
      let booking = await this.bookingRepository.findByProviderBookingId(
        orderData.order_id || orderData.id,
      );

      if (!booking) {
        const offerId = orderData.offer_id || orderData.metadata?.offer_id;
        if (offerId) {
          try {
            const matchingBooking = await this.bookingRepository.findByOfferIdInBookingData(offerId);
            if (matchingBooking) {
              await this.updateBookingOrderFailed(matchingBooking.id, orderData);
              return;
            }
          } catch (error) {
            this.logger.error(`Failed to search bookings by offer ID:`, error);
          }
        }
        
        if (orderData.metadata?.booking_reference) {
          booking = await this.bookingRepository.findByReference(orderData.metadata.booking_reference);
        }
        
        if (!booking) {
          this.logger.warn(`Booking not found for failed order ${orderData.id || orderData.order_id}`);
          await this.storeFailedOrder(orderData);
          return;
        }
      }

      await this.updateBookingOrderFailed(booking.id, orderData);
    } catch (error) {
      this.logger.error(`Failed to handle order.creation_failed:`, error);
      throw error;
    }
  }

  private async updateBookingOrderFailed(bookingId: string, orderData: any): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    
    await this.bookingRepository.update(bookingId, {
      status: BookingStatus.FAILED,
      providerData: {
        ...(booking?.providerData as any),
        orderCreationFailed: true,
        orderCreationError: orderData.error || orderData.message || 'Order creation failed',
        orderCreationFailedAt: new Date().toISOString(),
        orderData: orderData,
        recoverable: this.isRecoverableError(orderData),
      },
    });
  
    this.logger.warn(`Order creation failed for booking ${bookingId}`);
  
    // ✅ Send email notification to user
    try {
      if (booking?.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: booking.userId },
          select: { email: true, name: true },
        });
  
        if (user?.email) {
          await this.resendService.sendBookingFailureEmail({
            to: user.email,
            customerName: user.name || 'Valued Customer',
            bookingReference: booking.reference,
            productType: booking.productType || 'FLIGHT_INTERNATIONAL',
            amount: booking.totalAmount || 0,
            currency: booking.currency || 'GBP',
            failureReason: this.getFailureReason(orderData),
          });
          this.logger.log(`Booking failure email sent to ${user.email}`);
        }
      }
    } catch (emailError) {
      this.logger.error(`Failed to send booking failure email:`, emailError);
    }
  }

  private isRecoverableError(orderData: any): boolean {
    const error = orderData.error || orderData.message || '';
    const errorLower = error.toLowerCase();
    
    const recoverableErrors = [
      'expired',
      'timeout',
      'unavailable',
      'try again',
      'temporarily',
    ];
    
    return recoverableErrors.some(term => errorLower.includes(term));
  }

  private getFailureReason(orderData: any): string {
    const error = orderData.error || orderData.message || 'Unknown error';
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('expired')) {
      return 'The flight offer has expired. Please search for flights again and complete a new booking.';
    }
    if (errorLower.includes('timeout') || errorLower.includes('unavailable')) {
      return 'The booking service is temporarily unavailable. Please try again in a few minutes.';
    }
    return `Order creation failed: ${error}`;
  }

  private async handleOrderUpdated(order: any): Promise<void> {
    try {
      let booking = await this.bookingRepository.findByProviderBookingId(order.id);

      if (!booking && order.metadata?.booking_reference) {
        booking = await this.bookingRepository.findByReference(order.metadata.booking_reference);
      }

      if (!booking) {
        this.logger.warn(`Booking not found for updated order ${order.id}`);
        return;
      }

      await this.bookingRepository.update(booking.id, {
        status: order.status === 'confirmed' ? BookingStatus.CONFIRMED : booking.status,
        providerData: {
          ...(booking.providerData as any),
          order: order,
          orderUpdatedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Order ${order.id} updated for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle order.updated for order ${order.id}:`, error);
      throw error;
    }
  }

  private async handleAirlineInitiatedChange(change: any): Promise<void> {
    try {
      const orderId = change.order_id || change.id;
      let booking = await this.bookingRepository.findByProviderBookingId(orderId);

      if (!booking && change.metadata?.booking_reference) {
        booking = await this.bookingRepository.findByReference(change.metadata.booking_reference);
      }

      if (!booking) {
        this.logger.warn(`Booking not found for airline change ${orderId}`);
        return;
      }

      await this.bookingRepository.update(booking.id, {
        status: BookingStatus.CONFIRMED,
        providerData: {
          ...(booking.providerData as any),
          airlineInitiatedChange: change,
          airlineChangeReceivedAt: new Date().toISOString(),
          hasPendingAirlineChange: true,
        },
      });

      this.logger.log(`Airline-initiated change received for booking ${booking.id}`);

      try {
        const user = await this.prisma.user.findUnique({
          where: { id: booking.userId },
          select: { email: true, name: true },
        });

        if (user?.email) {
          // ✅ FIXED: Use correct method name
          await this.resendService.sendAirlineChangeEmail({
            to: user.email,
            customerName: user.name || 'Valued Customer',
            bookingReference: booking.reference,
            changeDetails: change,
            actionRequired: true,
          });
        }
      } catch (emailError) {
        this.logger.error(`Failed to send airline change email:`, emailError);
      }
    } catch (error) {
      this.logger.error(`Failed to handle airline_initiated_change:`, error);
      throw error;
    }
  }

  private async handleCancellationCreated(cancellation: any): Promise<void> {
    try {
      const orderId = cancellation.order_id;
      let booking = await this.bookingRepository.findByProviderBookingId(orderId);

      if (!booking && cancellation.metadata?.booking_reference) {
        booking = await this.bookingRepository.findByReference(cancellation.metadata.booking_reference);
      }

      if (!booking) {
        this.logger.warn(`Booking not found for cancellation ${cancellation.id}`);
        return;
      }

      await this.bookingRepository.update(booking.id, {
        providerData: {
          ...(booking.providerData as any),
          cancellationId: cancellation.id,
          cancellationData: cancellation,
          cancellationCreatedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Cancellation ${cancellation.id} created for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle cancellation.created:`, error);
      throw error;
    }
  }

  private async handleCancellationConfirmed(cancellation: any): Promise<void> {
    try {
      const orderId = cancellation.order_id;
      let booking = await this.bookingRepository.findByProviderBookingId(orderId);

      if (!booking && cancellation.metadata?.booking_reference) {
        booking = await this.bookingRepository.findByReference(cancellation.metadata.booking_reference);
      }

      if (!booking) {
        this.logger.warn(`Booking not found for confirmed cancellation ${cancellation.id}`);
        return;
      }

      const refundAmount = cancellation.refund_amount
        ? parseFloat(cancellation.refund_amount)
        : undefined;

      await this.bookingRepository.update(booking.id, {
        status: BookingStatus.CANCELLED,
        refundAmount: refundAmount,
        refundStatus: refundAmount ? 'COMPLETED' : undefined,
        providerData: {
          ...(booking.providerData as any),
          cancellationId: cancellation.id,
          cancellationData: cancellation,
          cancellationConfirmedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`✅ Cancellation ${cancellation.id} confirmed for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle cancellation.confirmed:`, error);
      throw error;
    }
  }

  // ============================================================
  // ✅ HELPER METHODS - Using Prisma raw queries as fallback
  // ============================================================
  
  private async storePendingOrder(order: any): Promise<void> {
    try {
      // ✅ Use raw Prisma query as fallback if model doesn't exist
      await this.prisma.$executeRaw`
        INSERT INTO "PendingOrder" ("id", "orderId", "orderData", "bookingReference", "bookingId", "status", "createdAt")
        VALUES (gen_random_uuid(), ${order.id}, ${JSON.stringify(order)}::jsonb, ${order.metadata?.booking_reference || null}, ${order.metadata?.booking_id || null}, 'PENDING', NOW())
        ON CONFLICT ("orderId") DO NOTHING
      `;
      this.logger.log(`Stored pending order ${order.id} for manual reconciliation`);
    } catch (error) {
      // ✅ Fallback: Store in a separate table or log
      this.logger.warn(`Could not store pending order in database, logging instead: ${order.id}`);
      this.logger.warn(`Pending order data: ${JSON.stringify(order).substring(0, 500)}`);
      
      // ✅ Also try to store as a record in the booking repository if possible
      try {
        await this.prisma.booking.updateMany({
          where: { reference: order.metadata?.booking_reference },
          data: {
            providerData: {
              pendingOrder: order,
              pendingOrderCreatedAt: new Date().toISOString(),
            },
          },
        });
      } catch (updateError) {
        this.logger.error(`Failed to store pending order on booking:`, updateError);
      }
    }
  }

  private async storeFailedOrder(orderData: any): Promise<void> {
    try {
      // ✅ Use raw Prisma query as fallback if model doesn't exist
      await this.prisma.$executeRaw`
        INSERT INTO "FailedOrder" ("id", "orderId", "orderData", "bookingReference", "errorMessage", "status", "createdAt")
        VALUES (gen_random_uuid(), ${orderData.order_id || orderData.id}, ${JSON.stringify(orderData)}::jsonb, ${orderData.metadata?.booking_reference || null}, ${orderData.error || orderData.message || 'Unknown error'}, 'FAILED', NOW())
        ON CONFLICT ("orderId") DO NOTHING
      `;
      this.logger.log(`Stored failed order for manual review`);
    } catch (error) {
      // ✅ Fallback: Log the failed order
      this.logger.warn(`Could not store failed order in database, logging instead`);
      this.logger.warn(`Failed order data: ${JSON.stringify(orderData).substring(0, 500)}`);
    }
  }
}