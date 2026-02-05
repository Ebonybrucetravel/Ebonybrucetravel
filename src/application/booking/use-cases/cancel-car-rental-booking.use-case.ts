import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BookingStatus, Provider, RefundStatus } from '@prisma/client';

@Injectable()
export class CancelCarRentalBookingUseCase {
  private readonly logger = new Logger(CancelCarRentalBookingUseCase.name);

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(bookingId: string, cancelledBy: string) {
    try {
      // Get booking from our database
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Check if booking is a car rental
      if (booking.productType !== 'CAR_RENTAL') {
        throw new BadRequestException('This endpoint only supports cancellation of car rental bookings.');
      }

      // Check if booking can be cancelled
      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      // Only allow cancellation if booking is confirmed
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException(
          `Cannot cancel booking with status ${booking.status}. Only confirmed bookings can be cancelled.`,
        );
      }

      // Cancel booking in Amadeus (car rentals use transfer API)
      let cancellationResult = null;
      if (booking.providerBookingId && booking.provider === Provider.AMADEUS) {
        try {
          this.logger.log(`Cancelling Amadeus transfer order ${booking.providerBookingId}`);
          const amadeusResponse = await this.amadeusService.cancelTransfer(booking.providerBookingId);
          cancellationResult = amadeusResponse.data || amadeusResponse;
        } catch (error) {
          this.logger.error(`Failed to cancel booking in Amadeus:`, error);
          // Continue with database update even if provider cancellation fails
          // This allows us to mark the booking as cancelled locally even if provider API fails
        }
      }

      // Determine refund status based on provider response
      let refundStatus: RefundStatus = RefundStatus.PENDING;
      if (cancellationResult) {
        // Check if cancellation response indicates refund eligibility
        // Amadeus transfer cancellation may include refund information
        if (cancellationResult.refundable === false || cancellationResult.refund === false) {
          refundStatus = RefundStatus.FAILED; // Non-refundable
        } else if (cancellationResult.refundAmount || cancellationResult.refund) {
          refundStatus = RefundStatus.PROCESSING; // Refund will be processed
        }
      }

      // Update booking status
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy,
          refundStatus,
          providerData: {
            ...(booking.providerData as any),
            cancellationResult,
            cancelledAt: new Date().toISOString(),
            cancelledBy,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Car rental booking ${bookingId} cancelled successfully`);

      return {
        booking: updatedBooking,
        cancellationResult,
        refundStatus,
      };
    } catch (error) {
      this.logger.error(`Error cancelling car rental booking ${bookingId}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

