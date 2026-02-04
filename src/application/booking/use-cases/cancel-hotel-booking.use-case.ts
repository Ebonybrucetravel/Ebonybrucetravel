import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BookingStatus, Provider } from '@prisma/client';

@Injectable()
export class CancelHotelBookingUseCase {
  private readonly logger = new Logger(CancelHotelBookingUseCase.name);

  constructor(
    private readonly duffelService: DuffelService,
    private readonly amadeusService: AmadeusService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(bookingId: string) {
    try {
      // Get booking from our database
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Check if booking can be cancelled
      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      // Cancel booking in provider (Duffel or Amadeus)
      let cancellationResult = null;
      if (booking.providerBookingId) {
        try {
          if (booking.provider === Provider.DUFFEL) {
            this.logger.log(`Cancelling Duffel hotel booking ${booking.providerBookingId}`);
            const duffelResponse = await this.duffelService.cancelHotelBooking(booking.providerBookingId);
            cancellationResult = duffelResponse.data;
          } else if (booking.provider === Provider.AMADEUS) {
            this.logger.log(`Cancelling Amadeus hotel booking ${booking.providerBookingId}`);
            const amadeusResponse = await this.amadeusService.cancelHotelBooking(booking.providerBookingId);
            cancellationResult = amadeusResponse.data;
          } else {
            this.logger.warn(`Unsupported provider for hotel cancellation: ${booking.provider}`);
          }
        } catch (error) {
          this.logger.error(`Failed to cancel booking in ${booking.provider}:`, error);
          // Continue with database update even if provider cancellation fails
          // This allows us to mark the booking as cancelled locally even if provider API fails
        }
      }

      // Determine refund status based on provider response
      let refundStatus = 'PENDING';
      if (booking.provider === Provider.DUFFEL) {
        refundStatus = cancellationResult?.refund_status === 'COMPLETED' ? 'REFUNDED' : 'PENDING';
      } else if (booking.provider === Provider.AMADEUS) {
        // Amadeus cancellation response structure may differ
        // Check if cancellation was successful and refund status
        if (cancellationResult?.data?.bookingStatus === 'CANCELLED') {
          // Check for refund information in Amadeus response
          refundStatus = cancellationResult?.data?.refundStatus || 'PENDING';
        }
      }

      // Update booking status in our database
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          paymentStatus: refundStatus === 'REFUNDED' ? 'REFUNDED' : booking.paymentStatus,
          bookingData: {
            ...(booking.bookingData as any),
            cancellation: cancellationResult,
            cancelledAt: new Date().toISOString(),
            cancellationProvider: booking.provider,
          },
        },
      });

      this.logger.log(`Successfully cancelled hotel booking ${bookingId} (${booking.provider})`);

      return {
        booking: updatedBooking,
        cancellation: cancellationResult,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error cancelling hotel booking:', error);
      throw error;
    }
  }
}

