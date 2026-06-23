import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class ConfirmWakanowPaymentUseCase {
  private readonly logger = new Logger(ConfirmWakanowPaymentUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(localBookingId: string, paymentReference: string) {
    this.logger.log(`💰 Confirming payment for booking: ${localBookingId}`);


    const booking = await this.bookingRepository.findById(localBookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${localBookingId} not found`);
    }

    
    if (booking.provider !== 'WAKANOW') {
      throw new BadRequestException('This booking is not a Wakanow booking');
    }

   
    if (booking.paymentStatus === PaymentStatus.COMPLETED) {
      this.logger.log(`Payment already completed for booking ${localBookingId}`);
      return {
        ...booking,
        message: 'Payment already confirmed',
        alreadyConfirmed: true,
      };
    }

    if (booking.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm payment: Current status is ${booking.paymentStatus}`
      );
    }

   
    const updatedBookingData = {
      ...(booking.bookingData as any || {}),
      payment: {
        reference: paymentReference,
        confirmedAt: new Date().toISOString(),
        status: 'COMPLETED',
      },
    };

    await this.bookingRepository.update(localBookingId, {
      paymentStatus: PaymentStatus.COMPLETED,
      bookingData: updatedBookingData,
    });

    this.logger.log(`✅ Payment confirmed for booking ${localBookingId}`);


    const updatedBooking = await this.bookingRepository.findById(localBookingId);

    return {
      ...updatedBooking,
      message: 'Payment confirmed successfully. Please proceed to issue your ticket.',
      nextStep: 'Issue ticket',
      ticketUrl: `/api/v1/bookings/wakanow/ticket/${localBookingId}`,
      requiresTicketIssuance: true,
    };
  }
}