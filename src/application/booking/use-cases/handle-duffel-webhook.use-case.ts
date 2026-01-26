import { Injectable, Logger, Inject } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';

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
  ) {}

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
      // Find booking by order ID (stored in providerBookingId)
      const booking = await this.bookingRepository.findByProviderBookingId(order.id);

      if (!booking) {
        this.logger.warn(`Booking not found for Duffel order ${order.id}`);
        return;
      }

      // Update booking with order details
      await this.bookingRepository.update(booking.id, {
        status: BookingStatus.CONFIRMED,
        providerData: {
          ...(booking.providerData as any),
          order: order,
          orderCreatedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Order ${order.id} created for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle order.created for order ${order.id}:`, error);
      throw error;
    }
  }

  private async handleOrderCreationFailed(orderData: any): Promise<void> {
    try {
      // Find booking by order ID or offer ID
      const booking = await this.bookingRepository.findByProviderBookingId(
        orderData.order_id || orderData.id,
      );

      if (!booking) {
        // Try to find by offer ID in metadata
        const offerId = orderData.offer_id || orderData.metadata?.offer_id;
        if (offerId) {
          try {
            const bookings = await this.bookingRepository.findAll();
            const matchingBooking = bookings.find(
              (b) => (b.bookingData as any)?.offerId === offerId,
            );
            if (matchingBooking) {
              await this.updateBookingOrderFailed(matchingBooking.id, orderData);
              return;
            }
          } catch (error) {
            this.logger.error(`Failed to search bookings by offer ID:`, error);
          }
        }
        this.logger.warn(`Booking not found for failed order ${orderData.id || orderData.order_id}`);
        return;
      }

      await this.updateBookingOrderFailed(booking.id, orderData);
    } catch (error) {
      this.logger.error(`Failed to handle order.creation_failed:`, error);
      throw error;
    }
  }

  private async updateBookingOrderFailed(bookingId: string, orderData: any): Promise<void> {
    await this.bookingRepository.update(bookingId, {
      status: BookingStatus.FAILED,
      providerData: {
        ...((await this.bookingRepository.findById(bookingId))?.providerData as any),
        orderCreationFailed: true,
        orderCreationError: orderData.error || orderData.message || 'Order creation failed',
        orderCreationFailedAt: new Date().toISOString(),
        orderData: orderData,
      },
    });

    this.logger.warn(`Order creation failed for booking ${bookingId}`);
  }

  private async handleOrderUpdated(order: any): Promise<void> {
    try {
      const booking = await this.bookingRepository.findByProviderBookingId(order.id);

      if (!booking) {
        this.logger.warn(`Booking not found for updated order ${order.id}`);
        return;
      }

      // Update booking with latest order data
      await this.bookingRepository.update(booking.id, {
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
      const booking = await this.bookingRepository.findByProviderBookingId(orderId);

      if (!booking) {
        this.logger.warn(`Booking not found for airline change ${orderId}`);
        return;
      }

      // Store airline-initiated change information
      await this.bookingRepository.update(booking.id, {
        providerData: {
          ...(booking.providerData as any),
          airlineInitiatedChange: change,
          airlineChangeReceivedAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Airline-initiated change received for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle airline_initiated_change:`, error);
      throw error;
    }
  }

  private async handleCancellationCreated(cancellation: any): Promise<void> {
    try {
      const orderId = cancellation.order_id;
      const booking = await this.bookingRepository.findByProviderBookingId(orderId);

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
      const booking = await this.bookingRepository.findByProviderBookingId(orderId);

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

      this.logger.log(`Cancellation ${cancellation.id} confirmed for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle cancellation.confirmed:`, error);
      throw error;
    }
  }
}

