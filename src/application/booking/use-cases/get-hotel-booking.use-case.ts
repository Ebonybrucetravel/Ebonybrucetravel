import { Injectable, NotFoundException } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class GetHotelBookingUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly amadeusService: AmadeusService,
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

      // Get latest booking data from provider
      let providerBooking = null;
      if (booking.providerBookingId) {
        try {
          if (booking.provider === 'DUFFEL') {
            const duffelResponse = await this.duffelService.getHotelBooking(booking.providerBookingId);
            providerBooking = duffelResponse.data;
          } else if (booking.provider === 'AMADEUS') {
            const amadeusResponse = await this.amadeusService.getHotelBooking(booking.providerBookingId);
            providerBooking = amadeusResponse.data;
          }
        } catch (error) {
          console.warn(`Failed to fetch booking from ${booking.provider}: ${error}`);
          // Use cached booking data if available
          if (booking.providerData && typeof booking.providerData === 'object') {
            providerBooking = booking.providerData;
          } else if (booking.bookingData && typeof booking.bookingData === 'object') {
            if (booking.provider === 'DUFFEL') {
              providerBooking = (booking.bookingData as any).duffel_booking;
            } else if (booking.provider === 'AMADEUS') {
              providerBooking = (booking.bookingData as any).amadeus_booking;
            }
          }
        }
      }

      return {
        booking,
        provider_booking: providerBooking,
        ...(booking.provider === 'DUFFEL' && { duffel_booking: providerBooking }),
        ...(booking.provider === 'AMADEUS' && { amadeus_booking: providerBooking }),
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

