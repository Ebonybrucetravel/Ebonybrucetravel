import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class CancelBookingUseCase {
  private readonly logger = new Logger(CancelBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(bookingId: string, userId: string) {
    this.logger.log(`Cancelling booking ${bookingId} for user ${userId}`);

    // 1. Find booking
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

    // 5. Update booking status
    const updatedBookingData = {
      ...(booking.bookingData as any || {}),
      cancelledAt: new Date().toISOString(),
      cancellationReason: 'User cancelled booking',
      cancellationRequestedBy: userId,
      cancellationSource: 'USER_PROFILE',
    };

    await this.bookingRepository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      bookingData: updatedBookingData,
    });

    this.logger.log(`Booking ${bookingId} cancelled successfully`);

    return {
      success: true,
      bookingId: bookingId,
      reference: booking.reference,
      provider: booking.provider,
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      refundEligible: false,
      refundAmount: 0,
      currency: booking.currency,
      message: 'Booking cancelled successfully.',
    };
  }
}