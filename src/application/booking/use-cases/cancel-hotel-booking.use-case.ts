import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
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

  async execute(bookingId: string, userId: string, userRole: string = 'USER') {
    try {
      // Get booking from our database
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Check if user has permission to cancel this booking
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
      
      if (!isAdmin && booking.userId !== userId) {
        throw new ForbiddenException('You do not have permission to cancel this booking');
      }

      // Check if booking can be cancelled
      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      // Check if cancellation deadline has passed (skip for admins)
      if (!isAdmin && booking.cancellationDeadline) {
        const now = new Date();
        const deadline = new Date(booking.cancellationDeadline);
        if (now > deadline) {
          throw new BadRequestException(
            'Cancellation deadline has passed. You can no longer cancel this booking.'
          );
        }
      }

      // Cancel booking in provider (Duffel or Amadeus)
      let cancellationResult = null;
      
      if (booking.providerBookingId) {
        try {
          if (booking.provider === Provider.DUFFEL) {
            this.logger.log(`Cancelling Duffel hotel booking ${booking.providerBookingId}`);
            const duffelResponse = await this.duffelService.cancelHotelBooking(booking.providerBookingId);
            cancellationResult = duffelResponse.data;
          } 
          else if (booking.provider === Provider.AMADEUS) {
            this.logger.log(`Cancelling Amadeus hotel booking ${booking.providerBookingId}`);
            
            // ✅ IMPROVED: Try multiple locations for the IDs
            const providerData = booking.providerData as any;
            
            let hotelOrderId = null;
            let hotelBookingId = null;
            
            // Log the providerData structure for debugging
            this.logger.log(`ProviderData structure: ${JSON.stringify(providerData, null, 2)}`);
            
            // Try to find hotelOrderId in various locations
            if (providerData?.data?.id) {
              hotelOrderId = providerData.data.id;
              this.logger.log(`Found hotelOrderId in providerData.data.id: ${hotelOrderId}`);
            } else if (providerData?.id) {
              hotelOrderId = providerData.id;
              this.logger.log(`Found hotelOrderId in providerData.id: ${hotelOrderId}`);
            } else if (providerData?.orderId) {
              hotelOrderId = providerData.orderId;
              this.logger.log(`Found hotelOrderId in providerData.orderId: ${hotelOrderId}`);
            } else if (booking.providerBookingId) {
              // Fallback: use the providerBookingId
              hotelOrderId = booking.providerBookingId;
              this.logger.log(`Using providerBookingId as hotelOrderId: ${hotelOrderId}`);
            }
            
            // Try to find hotelBookingId in various locations
            if (providerData?.data?.hotelBookings?.[0]?.id) {
              hotelBookingId = providerData.data.hotelBookings[0].id;
              this.logger.log(`Found hotelBookingId in providerData.data.hotelBookings[0].id: ${hotelBookingId}`);
            } else if (providerData?.hotelBookings?.[0]?.id) {
              hotelBookingId = providerData.hotelBookings[0].id;
              this.logger.log(`Found hotelBookingId in providerData.hotelBookings[0].id: ${hotelBookingId}`);
            } else if (providerData?.data?.hotelBookingId) {
              hotelBookingId = providerData.data.hotelBookingId;
              this.logger.log(`Found hotelBookingId in providerData.data.hotelBookingId: ${hotelBookingId}`);
            } else if (providerData?.hotelBookingId) {
              hotelBookingId = providerData.hotelBookingId;
              this.logger.log(`Found hotelBookingId in providerData.hotelBookingId: ${hotelBookingId}`);
            }
            
            // Also check bookingData for the IDs
            if (!hotelOrderId || !hotelBookingId) {
              const bookingData = booking.bookingData as any;
              if (bookingData?.amadeus_booking_details?.hotel_order_id) {
                hotelOrderId = bookingData.amadeus_booking_details.hotel_order_id;
                this.logger.log(`Found hotelOrderId in amadeus_booking_details: ${hotelOrderId}`);
              }
              if (bookingData?.amadeus_booking_details?.hotel_booking_id) {
                hotelBookingId = bookingData.amadeus_booking_details.hotel_booking_id;
                this.logger.log(`Found hotelBookingId in amadeus_booking_details: ${hotelBookingId}`);
              }
            }
            
            if (!hotelOrderId || !hotelBookingId) {
              this.logger.error('Failed to extract Amadeus IDs. providerData:', JSON.stringify(providerData, null, 2));
              throw new BadRequestException(
                'Unable to cancel: Missing Amadeus booking identifiers. Please contact support.'
              );
            }
            
            this.logger.log(`Amadeus IDs - Order: ${hotelOrderId}, Booking: ${hotelBookingId}`);
            
            // Call the correct method with both IDs
            const amadeusResponse = await this.amadeusService.cancelHotelBookingItem(
              hotelOrderId,
              hotelBookingId,
            );
            cancellationResult = amadeusResponse;
          } 
          else {
            this.logger.warn(`Unsupported provider for hotel cancellation: ${booking.provider}`);
          }
        } catch (error) {
          this.logger.error(`Failed to cancel booking in ${booking.provider}:`, error);
          // If the error is from Amadeus, re-throw it
          if (error instanceof BadRequestException || error instanceof ForbiddenException) {
            throw error;
          }
          // Continue with database update even if provider cancellation fails
        }
      }

      // Determine refund status based on provider response
      let refundStatus = 'PENDING';
      if (booking.provider === Provider.DUFFEL) {
        refundStatus = cancellationResult?.refund_status === 'COMPLETED' ? 'REFUNDED' : 'PENDING';
      } else if (booking.provider === Provider.AMADEUS) {
        if (cancellationResult?.data?.bookingStatus === 'CANCELLED') {
          refundStatus = cancellationResult?.data?.refundStatus || 'PENDING';
        }
      }

      // Update booking status in our database
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: userId,
          paymentStatus: refundStatus === 'REFUNDED' ? 'REFUNDED' : booking.paymentStatus,
          bookingData: {
            ...(booking.bookingData as any),
            cancellation: cancellationResult,
            cancelledAt: new Date().toISOString(),
            cancelledBy: userId,
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
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Error cancelling hotel booking:', error);
      throw error;
    }
  }
}