import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, RefundStatus } from '@prisma/client';
import { retryWithBackoffAndLogging } from '@common/utils/retry.util';

@Injectable()
export class CancelDuffelOrderUseCase {
  private readonly logger = new Logger(CancelDuffelOrderUseCase.name);

  constructor(
    private readonly duffelService: DuffelService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(bookingId: string, userId?: string): Promise<{
    cancellationId: string;
    cancellationData: any;
    refundAmount?: number;
  }> {
    // Get booking from database
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found.`);
    }

    // Check if booking is already cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled.');
    }

    // Check if booking has a Duffel order
    if (!booking.providerBookingId) {
      throw new BadRequestException(
        'Booking does not have a Duffel order. Cannot cancel an order that does not exist.',
      );
    }

    // Only allow cancellation if booking is confirmed
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel booking with status ${booking.status}. Only confirmed bookings can be cancelled.`,
      );
    }

    try {
      // Create pending cancellation with retry logic
      this.logger.log(`Creating pending cancellation for Duffel order ${booking.providerBookingId}...`);
      const cancellation = await retryWithBackoffAndLogging(
        () => this.duffelService.createOrderCancellation(booking.providerBookingId!),
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          maxDelayMs: 10000,
          logger: this.logger,
          context: `Creating cancellation for order ${booking.providerBookingId}`,
        },
      );

      // Confirm the cancellation with retry logic
      this.logger.log(`Confirming cancellation ${cancellation.id}...`);
      const confirmedCancellation = await retryWithBackoffAndLogging(
        () => this.duffelService.confirmOrderCancellation(cancellation.id),
        {
          maxAttempts: 3,
          initialDelayMs: 2000,
          maxDelayMs: 10000,
          logger: this.logger,
          context: `Confirming cancellation ${cancellation.id}`,
        },
      );

      // Extract refund information if available
      const refundAmount = confirmedCancellation.refund_amount
        ? parseFloat(confirmedCancellation.refund_amount)
        : undefined;

      // Update booking status
      await this.bookingRepository.update(bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        refundAmount: refundAmount ? refundAmount : undefined,
        refundStatus: refundAmount ? RefundStatus.PENDING : undefined,
        providerData: {
          ...(booking.providerData as any),
          cancellationId: confirmedCancellation.id,
          cancellationData: confirmedCancellation,
          cancelledAt: new Date().toISOString(),
        },
      });

      this.logger.log(
        `Successfully cancelled Duffel order ${booking.providerBookingId} for booking ${bookingId}`,
      );

      return {
        cancellationId: confirmedCancellation.id,
        cancellationData: confirmedCancellation,
        refundAmount,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel Duffel order for booking ${bookingId}:`, error);

      // Update booking to indicate cancellation failed
      await this.bookingRepository.update(bookingId, {
        providerData: {
          ...(booking.providerData as any),
          cancellationError: error instanceof Error ? error.message : 'Unknown error',
          cancellationFailedAt: new Date().toISOString(),
        },
      });

      throw error;
    }
  }
}

