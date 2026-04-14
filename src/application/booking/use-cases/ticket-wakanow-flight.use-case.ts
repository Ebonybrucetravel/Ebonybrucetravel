import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus } from '@prisma/client';
import { TicketWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';
@Injectable()
export class TicketWakanowFlightUseCase {
  private readonly logger = new Logger(TicketWakanowFlightUseCase.name);
  constructor(
    private readonly wakanowService: WakanowService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
  ) {}
  async execute(dto: TicketWakanowFlightDto, localBookingId?: string) {
    const { bookingId, pnrNumber } = dto;
    this.logger.log(`Issuing Wakanow ticket. BookingId: ${bookingId}, PNR: ${pnrNumber}`);
    if (localBookingId) {
      const booking = await this.bookingRepository.findById(localBookingId);
      if (!booking) {
        throw new NotFoundException(`Booking ${localBookingId} not found`);
      }
      if (booking.paymentStatus !== 'COMPLETED') {
        throw new BadRequestException(
          `Cannot issue ticket: Payment status is ${booking.paymentStatus}. Payment must be completed first.`,
        );
      }
      if (booking.provider !== 'WAKANOW') {
        throw new BadRequestException('This booking is not a Wakanow booking');
      }
    }
    const ticketResponse = await this.wakanowService.ticketFlight({
      BookingId: bookingId,
      PnrNumber: pnrNumber,
    });
    if (localBookingId) {
      await this.bookingRepository.update(localBookingId, {
        status: BookingStatus.CONFIRMED,
        providerData: ticketResponse as any,
      });
      this.logger.log(`Local booking ${localBookingId} updated to CONFIRMED`);
    }
    return {
      provider: 'WAKANOW',
      booking_id: ticketResponse.BookingId,
      pnr_status: ticketResponse.FlightBookingSummary?.PnrStatus,
      ticket_status: ticketResponse.FlightBookingSummary?.TicketStatus,
      booking_status: ticketResponse.BookingStatusDetails?.BookingStatus,
      payment_status: ticketResponse.BookingStatusDetails?.PaymentStatus,
      ticketing_status: ticketResponse.BookingStatusDetails?.TicketingStatus,
      message: ticketResponse.BookingStatusDetails?.Message,
      wallet_balance: ticketResponse.WalletBallance,
      payment_details: ticketResponse.BookingPaymentDetails
        ? {
            total_price: ticketResponse.BookingPaymentDetails.TotalPrice,
            payment_method: ticketResponse.BookingPaymentDetails.PaymentMethodName,
            payment_reference: ticketResponse.BookingPaymentDetails.PaymentReferenceCode,
          }
        : undefined,
      flight_summary: ticketResponse.FlightBookingSummary
        ? {
            pnr: ticketResponse.FlightBookingSummary.PnrReferenceNumber,
            pnr_date: ticketResponse.FlightBookingSummary.PnrDate,
            travellers: ticketResponse.FlightBookingSummary.TravellerDetails,
          }
        : undefined,
    };
  }
}
