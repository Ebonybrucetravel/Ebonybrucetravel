import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class TicketWakanowBookingUseCase {
  private readonly logger = new Logger(TicketWakanowBookingUseCase.name);

  constructor(
    private readonly wakanowService: WakanowService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async execute(localBookingId: string) {
    this.logger.log(`🎫 Issuing ticket for booking: ${localBookingId}`);


    const booking = await this.bookingRepository.findById(localBookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${localBookingId} not found`);
    }


    if (booking.provider !== 'WAKANOW') {
      throw new BadRequestException('This booking is not a Wakanow booking');
    }


    if (booking.paymentStatus !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot issue ticket: Payment status is ${booking.paymentStatus}. Payment must be completed first.`
      );
    }


    if (booking.status === BookingStatus.CONFIRMED) {
      this.logger.log(`Booking ${localBookingId} already confirmed`);
      return {
        ...booking,
        message: 'Ticket already issued',
        alreadyIssued: true,
      };
    }


    const wakanowBookingId = booking.providerBookingId;
    const pnrNumber = booking.bookingData?.pnrReferenceNumber;

    if (!wakanowBookingId) {
      throw new BadRequestException('Missing Wakanow booking ID');
    }

    if (!pnrNumber) {
      throw new BadRequestException('Missing PNR number');
    }

    this.logger.log(`Issuing ticket for PNR: ${pnrNumber}, Wakanow BookingId: ${wakanowBookingId}`);


    try {
      const ticketResponse = await this.wakanowService.ticketFlight({
        BookingId: wakanowBookingId,
        PnrNumber: pnrNumber,
      });

  
      const updatedBookingData = {
        ...(booking.bookingData as any || {}),
        ticketStatus: ticketResponse.FlightBookingSummary?.TicketStatus,
        pnrStatus: ticketResponse.FlightBookingSummary?.PnrStatus,
        ticketingStatus: ticketResponse.BookingStatusDetails?.TicketingStatus,
        ticketIssuedAt: new Date().toISOString(),
        ticketResponse: ticketResponse,
      };

      await this.bookingRepository.update(localBookingId, {
        status: BookingStatus.CONFIRMED,
        providerData: ticketResponse as any,
        bookingData: updatedBookingData,
      });

      this.logger.log(`✅ Ticket issued for booking ${localBookingId}`);


      const updatedBooking = await this.bookingRepository.findById(localBookingId);

      return {
        ...updatedBooking,
        success: true,
        message: ticketResponse.BookingStatusDetails?.Message || 'Ticket issued successfully',
        ticketDetails: {
          pnr: ticketResponse.FlightBookingSummary?.PnrReferenceNumber,
          pnrStatus: ticketResponse.FlightBookingSummary?.PnrStatus,
          ticketStatus: ticketResponse.FlightBookingSummary?.TicketStatus,
          bookingStatus: ticketResponse.BookingStatusDetails?.BookingStatus,
          ticketingStatus: ticketResponse.BookingStatusDetails?.TicketingStatus,
          paymentStatus: ticketResponse.BookingStatusDetails?.PaymentStatus,
        },
        walletBalance: ticketResponse.WalletBallance,
        paymentDetails: ticketResponse.BookingPaymentDetails,
        travellers: ticketResponse.FlightBookingSummary?.TravellerDetails,
        flightSummary: ticketResponse.FlightBookingSummary?.FlightSummaryModel,
      };

    } catch (error: any) {
      this.logger.error(`Ticket issuance failed for booking ${localBookingId}:`, error);

      
      const errorBookingData = {
        ...(booking.bookingData as any || {}),
        ticketError: error.message,
        ticketErrorAt: new Date().toISOString(),
      };

      await this.bookingRepository.update(localBookingId, {
        bookingData: errorBookingData,
      });

      throw new BadRequestException(
        `Ticket issuance failed: ${error.message}. Please contact support.`
      );
    }
  }
}