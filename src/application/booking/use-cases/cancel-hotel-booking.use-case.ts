import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class CancelHotelBookingUseCase {
  constructor(
    private readonly duffelService: DuffelService,
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

      // Cancel booking in Duffel
      let cancellationResult = null;
      if (booking.providerBookingId) {
        try {
          const duffelResponse = await this.duffelService.cancelHotelBooking(booking.providerBookingId);
          cancellationResult = duffelResponse.data;
        } catch (error) {
          console.error(`Failed to cancel booking in Duffel: ${error}`);
          // Continue with database update even if Duffel cancellation fails
        }
      }

      // Update booking status in our database
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          paymentStatus: cancellationResult?.refund_status === 'COMPLETED' ? 'REFUNDED' : 'PENDING',
          bookingData: {
            ...(booking.bookingData as any),
            cancellation: cancellationResult,
            cancelledAt: new Date().toISOString(),
          },
        },
      });

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

