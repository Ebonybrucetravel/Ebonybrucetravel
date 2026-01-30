import { Injectable, NotFoundException } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class GetHotelBookingUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(bookingId: string, userId?: string) {
    try {
      // Get booking from our database
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Check if user has access (if userId provided)
      if (userId && booking.userId !== userId) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Get latest booking data from Duffel
      let duffelBooking = null;
      if (booking.providerBookingId) {
        try {
          const duffelResponse = await this.duffelService.getHotelBooking(booking.providerBookingId);
          duffelBooking = duffelResponse.data;
        } catch (error) {
          console.warn(`Failed to fetch booking from Duffel: ${error}`);
          // Use cached booking data if available
          if (booking.bookingData && typeof booking.bookingData === 'object') {
            duffelBooking = (booking.bookingData as any).duffel_booking;
          }
        }
      }

      return {
        booking,
        duffel_booking: duffelBooking,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting hotel booking:', error);
      throw error;
    }
  }
}

