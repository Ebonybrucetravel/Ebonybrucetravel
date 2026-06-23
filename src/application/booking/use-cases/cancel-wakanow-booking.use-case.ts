import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';

@Injectable()
export class CancelWakanowBookingUseCase {
  private readonly logger = new Logger(CancelWakanowBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly wakanowService: WakanowService,
  ) {}

  async execute(bookingId: string, userId: string) {
    this.logger.log(`Cancelling Wakanow booking ${bookingId} for user ${userId}`);

    // 1. Find booking
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // 2. Verify user owns this booking
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }

    // 3. Verify it's a Wakanow booking
    if (booking.provider !== 'WAKANOW') {
      throw new BadRequestException('This booking is not a Wakanow booking');
    }

    // 4. Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      // CONFIRMED bookings might have tickets issued - check ticket status
      const ticketStatus = booking.bookingData?.ticketStatus as string;
      
      if (ticketStatus === 'Success' || ticketStatus === 'Issued') {
        throw new BadRequestException(
          'This booking has already been ticketed and cannot be cancelled online. Please contact our support team for assistance.'
        );
      }
      
      // If not ticketed, allow cancellation
      this.logger.log('Booking is confirmed but not ticketed - allowing cancellation');
    }

    // 5. Check if payment was completed
    if (booking.paymentStatus === PaymentStatus.COMPLETED) {
      // Payment was made - need to process refund
      this.logger.log('Payment was completed - refund will be processed');
    }

    // 6. Get Wakanow booking details for logging
    const wakanowBookingId = booking.providerBookingId;
    const pnrNumber = booking.bookingData?.pnrReferenceNumber;

    this.logger.log(`Cancelling Wakanow booking: ${wakanowBookingId}, PNR: ${pnrNumber}`);

    // 7. Update booking status to CANCELLED
    const updatedBookingData = {
      ...(booking.bookingData as any || {}),
      cancelledAt: new Date().toISOString(),
      cancellationReason: 'User cancelled booking',
      cancellationRequestedBy: userId,
      cancellationSource: 'USER_PROFILE',
      wakanowBookingId: wakanowBookingId,
      pnrNumber: pnrNumber,
      refundStatus: booking.paymentStatus === PaymentStatus.COMPLETED ? 'PENDING' : 'NOT_APPLICABLE',
    };

    await this.bookingRepository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      bookingData: updatedBookingData,
    });

    this.logger.log(`Wakanow booking ${bookingId} cancelled successfully`);

    // 8. Return cancellation details
    return {
      success: true,
      bookingId: bookingId,
      reference: booking.reference,
      provider: booking.provider,
      wakanowBookingId: wakanowBookingId,
      pnrNumber: pnrNumber || 'N/A',
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      refundEligible: booking.paymentStatus === PaymentStatus.COMPLETED,
      refundAmount: booking.paymentStatus === PaymentStatus.COMPLETED ? booking.totalAmount : 0,
      currency: booking.currency,
      message: booking.paymentStatus === PaymentStatus.COMPLETED 
        ? 'Booking cancelled successfully. Your refund will be processed within 7-10 business days.'
        : 'Booking cancelled successfully. No payment was processed.',
    };
  }
}