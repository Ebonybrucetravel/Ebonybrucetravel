import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { PaymentStatus, BookingStatus } from '@prisma/client';

@Injectable()
export class GetWakanowBookingStatusUseCase {
  private readonly logger = new Logger(GetWakanowBookingStatusUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(localBookingId: string) {
    this.logger.log(`Getting booking status for: ${localBookingId}`);

    const booking = await this.bookingRepository.findById(localBookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${localBookingId} not found`);
    }

    if (booking.provider !== 'WAKANOW') {
      return {
        ...booking,
        message: 'This booking is not a Wakanow booking',
      };
    }


    const bookingData = booking.bookingData as any || {};

    const status = {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      provider: booking.provider,
      providerBookingId: booking.providerBookingId,
      
  
      pnr: bookingData.pnrReferenceNumber || null,
      pnrStatus: bookingData.pnrStatus || null,
      ticketStatus: bookingData.ticketStatus || null,
      ticketingStatus: bookingData.ticketingStatus || null,
      

      paymentReference: bookingData.payment?.reference || null,
      paymentConfirmedAt: bookingData.payment?.confirmedAt || null,
      

      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      ticketIssuedAt: bookingData.ticketIssuedAt || null,
      

      totalAmount: booking.totalAmount,
      currency: booking.currency,
      

      canPay: booking.paymentStatus === PaymentStatus.PENDING,
      canTicket: booking.paymentStatus === PaymentStatus.COMPLETED && 
                 booking.status !== BookingStatus.CONFIRMED,
      isComplete: booking.status === BookingStatus.CONFIRMED,
      isCancelled: booking.status === BookingStatus.CANCELLED,
      
    
      isExpired: false, 
      nextSteps: [],
    };

    if (status.canPay) {
      status.nextSteps.push({
        action: 'complete_payment',
        label: 'Complete Payment',
        url: `/api/v1/payments/initiate?bookingId=${booking.id}`,
        description: 'Payment is required to confirm your booking',
        priority: 1,
      });
    }

    if (status.canTicket) {
      status.nextSteps.push({
        action: 'issue_ticket',
        label: 'Issue Ticket',
        url: `/api/v1/bookings/wakanow/ticket/${booking.id}`,
        description: 'Payment completed. Issue your ticket now.',
        priority: 2,
      });
    }

    if (status.isComplete) {
      status.nextSteps.push({
        action: 'view_ticket',
        label: 'View E-Ticket',
        description: 'Your ticket has been issued. Check your email for the e-ticket.',
        priority: 0,
      });
    }

   
    if (status.isExpired) {
      status.nextSteps.push({
        action: 'search_again',
        label: 'Search Again',
        url: '/api/v1/bookings/wakanow/search',
        description: 'Your booking has expired. Please search for flights again.',
        priority: 1,
      });
    }

    if (status.isCancelled) {
      status.nextSteps.push({
        action: 'contact_support',
        label: 'Contact Support',
        description: 'Your booking has been cancelled. Please contact support for assistance.',
        priority: 1,
      });
    }

    return status;
  }
}