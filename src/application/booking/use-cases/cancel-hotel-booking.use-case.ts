import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BookingStatus, Provider } from '@prisma/client';
import { ResendService } from '@infrastructure/email/resend.service';

@Injectable()
export class CancelHotelBookingUseCase {
  private readonly logger = new Logger(CancelHotelBookingUseCase.name);

  constructor(
    private readonly duffelService: DuffelService,
    private readonly amadeusService: AmadeusService,
    private readonly prisma: PrismaService,
    private readonly resendService: ResendService,
  ) {}

  async execute(bookingId: string, userId: string, userRole: string = 'USER') {
    try {
      // Get booking from our database with user details
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          user: true,
        }
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

      // ✅ Extract hotel details for the cancellation email
      const bookingData = booking.bookingData as any;
      const hotelDetails = bookingData?.hotelDetails || {};
      
      const hotelName = hotelDetails?.hotelName || 
                        bookingData?.hotelName || 
                        'Hotel';
      
      this.logger.log(`🏨 Cancelling booking for hotel: "${hotelName}"`);

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
          if (error instanceof BadRequestException || error instanceof ForbiddenException) {
            throw error;
          }
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

      // ✅ Send cancellation email after successful cancellation
      if (updatedBooking.status === BookingStatus.CANCELLED) {
        await this.sendCancellationEmail(updatedBooking, cancellationResult, hotelDetails);
      }

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

  /**
   * Send cancellation confirmation email with hotel details
   */
  private async sendCancellationEmail(booking: any, cancellationResult: any, hotelDetails: any) {
    try {
      const bookingData = booking.bookingData as any;
      const passengerInfo = booking.passengerInfo as any;
      
      // Get customer email
      const customerEmail = passengerInfo?.email || 
                            bookingData?.guests?.[0]?.contact?.email ||
                            bookingData?.guests?.[0]?.email ||
                            booking.user?.email;

      if (!customerEmail) {
        this.logger.warn(`⚠️ No customer email found for booking ${booking.id}`);
        return;
      }

      // Get customer name
      const customerName = passengerInfo?.firstName && passengerInfo?.lastName
        ? `${passengerInfo.firstName} ${passengerInfo.lastName}`
        : bookingData?.guests?.[0]?.name?.firstName && bookingData?.guests?.[0]?.name?.lastName
          ? `${bookingData.guests[0].name.firstName} ${bookingData.guests[0].name.lastName}`
          : 'Valued Customer';

      // ✅ Get hotel name from stored details
      const hotelName = hotelDetails?.hotelName || 
                        bookingData?.hotelName || 
                        'Hotel';
      
      const bookingReference = booking.bookingReference || `EBT-${booking.id.slice(-8)}`;
      
      const refundAmount = booking.totalAmount || 0;
      const refundCurrency = booking.currency || 'USD';
      const hasAirlineCredits = false;
      const cancellationDate = booking.cancelledAt || new Date();

      this.logger.log(`📧 Sending cancellation email for hotel: "${hotelName}"`);

      // Send cancellation email with hotel details
      await this.sendCustomCancellationEmail(
        customerEmail, 
        customerName, 
        bookingReference, 
        hotelName,
        cancellationDate,
        refundAmount,
        refundCurrency
      );

      this.logger.log(`✅ Cancellation email sent to ${customerEmail} for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Failed to send cancellation email:`, error);
    }
  }

  /**
   * Custom cancellation email with hotel details
   */
  private async sendCustomCancellationEmail(
    to: string, 
    customerName: string, 
    bookingReference: string, 
    hotelName: string,
    cancellationDate: Date,
    refundAmount: number,
    refundCurrency: string
  ) {
    try {
      const subject = `Booking Cancellation Confirmation - ${bookingReference}`;
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Cancellation Confirmation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
            </div>
            
            <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                Booking Cancellation Confirmation
              </h2>
              
              <p>Dear ${customerName || 'Valued Customer'},</p>
              
              <p>We're writing to confirm that your booking has been cancelled.</p>
              
              <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${bookingReference}</p>
                <p style="margin: 5px 0;"><strong>Hotel Name:</strong> ${hotelName}</p>
                <p style="margin: 5px 0;"><strong>Cancellation Date:</strong> ${cancellationDate.toLocaleDateString()}</p>
              </div>
              
              <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0c5460;">Refund Information</h3>
                <p><strong>Refund Amount:</strong> ${refundAmount} ${refundCurrency}</p>
                <p>Your refund will be processed to your original payment method. Please allow 5-10 business days for the refund to appear in your account.</p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                <p>Thank you for choosing Ebony Bruce Travels.</p>
                <p style="margin-top: 20px;">
                  Best regards,<br>
                  <strong>The Ebony Bruce Travels Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </body>
        </html>
      `;

      // Use the ResendService's internal resend instance
      await this.resendService['resend'].emails.send({
        from: this.resendService['fromEmail'],
        to: to,
        subject: subject,
        html: html,
      });

      this.logger.log(`✅ Custom cancellation email sent with hotel name: "${hotelName}"`);
    } catch (error) {
      this.logger.error(`Failed to send custom cancellation email:`, error);
    }
  }
}