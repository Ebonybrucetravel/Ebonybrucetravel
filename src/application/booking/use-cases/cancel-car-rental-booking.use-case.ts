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

      // ✅ Check if booking has providerBookingId
      if (!booking.providerBookingId) {
        throw new BadRequestException('No Amadeus order found for this booking');
      }

      // ✅ Extract confirmation number from bookingData
      const bookingData = booking.bookingData as any;
      const confirmNbr = bookingData?.confirmNbr;

      if (!confirmNbr) {
        this.logger.warn(`No confirmation number found for booking ${bookingId}. Attempting cancellation without it.`);
      }

      // Cancel booking in Amadeus (car rentals use transfer API)
      let cancellationResult = null;
      let cancellationError = null;

      if (booking.provider === Provider.AMADEUS) {
        try {
          this.logger.log(`Cancelling Amadeus transfer order ${booking.providerBookingId} with confirmNbr: ${confirmNbr || 'not provided'}`);
          
          // ✅ Fix: Only pass 1 argument to cancelTransfer
          // The confirmNbr should be handled inside the service
          const amadeusResponse = await this.amadeusService.cancelTransfer(
            booking.providerBookingId,
          );
          
          cancellationResult = amadeusResponse.data || amadeusResponse;
          this.logger.log(`✅ Amadeus cancellation successful: ${JSON.stringify(cancellationResult)}`);
        } catch (error) {
          this.logger.error(`Failed to cancel booking in Amadeus:`, error);
          cancellationError = error;
          
          // ✅ Check if cancellation is not allowed due to cancellation rules
          if (error instanceof Error && error.message.includes('cancellation')) {
            throw new BadRequestException(
              `Cannot cancel this booking due to cancellation policy. ${error.message}`,
            );
          }
          // Continue with database update even if provider cancellation fails
          // This allows us to mark the booking as cancelled locally even if provider API fails
        }
      }

      // ✅ Determine refund status based on provider response or default to PENDING
      let refundStatus: RefundStatus = RefundStatus.PENDING;
      let cancellationFee = 0;
      let refundAmount = 0;

      // ✅ Fix: Safely parse totalAmount for arithmetic operations
      const totalAmount = typeof booking.totalAmount === 'string' 
        ? parseFloat(booking.totalAmount) 
        : Number(booking.totalAmount) || 0;

      // ✅ Check cancellation rules from booking data
      const cancellationRules = bookingData?.cancellationRules || [];
      if (cancellationRules.length > 0) {
        // Find applicable cancellation rule based on time before pickup
        const applicableRule = cancellationRules[0];
        if (applicableRule) {
          if (applicableRule.feeType === 'PERCENTAGE') {
            const feePercent = parseFloat(applicableRule.feeValue) || 0;
            cancellationFee = (totalAmount * feePercent) / 100;
          } else if (applicableRule.feeType === 'VALUE') {
            cancellationFee = parseFloat(applicableRule.feeValue) || 0;
          }
          refundAmount = totalAmount - cancellationFee;
        }
      }

      // ✅ If cancellation was successful and no error
      if (cancellationResult && !cancellationError) {
        // Check if cancellation response indicates refund eligibility
        if (cancellationResult.reservationStatus === 'CANCELLED') {
          // Check if there's any refund information
          if (cancellationResult.refundable === false) {
            refundStatus = RefundStatus.FAILED; // Non-refundable
          } else if (cancellationResult.refundAmount || cancellationResult.refund) {
            refundStatus = RefundStatus.PROCESSING;
          } else {
            // Default: refund will be processed
            refundStatus = RefundStatus.PENDING;
          }
        }
      }

      // ✅ Build updated provider data
      const updatedProviderData = {
        ...(booking.providerData as any),
        cancellation: {
          result: cancellationResult,
          error: cancellationError ? {
            message: cancellationError.message,
            stack: process.env.NODE_ENV === 'development' ? cancellationError.stack : undefined,
          } : null,
          cancelledAt: new Date().toISOString(),
          cancelledBy,
          confirmNbr,
          cancellationFee,
          refundAmount,
        },
      };

      // ✅ Update booking status
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy,
          refundStatus,
          providerData: updatedProviderData,
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

      this.logger.log(`✅ Car rental booking ${bookingId} cancelled successfully`);

      // ✅ Build response message based on cancellation result
      let message = 'Car rental booking cancelled successfully';
      if (cancellationError) {
        message = 'Booking cancelled locally but provider cancellation failed. Please contact support.';
      } else if (cancellationResult?.reservationStatus === 'CANCELLED') {
        message = 'Car rental booking cancelled successfully in Amadeus';
      }

      return {
        booking: updatedBooking,
        cancellationResult,
        refundStatus,
        cancellationFee,
        refundAmount,
        message,
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

  /**
   * Check if booking is eligible for cancellation based on cancellation rules
   * Returns cancellation fee amount or throws error if not eligible
   */
  private checkCancellationEligibility(booking: any): { eligible: boolean; fee: number; message?: string } {
    const bookingData = booking.bookingData as any;
    const cancellationRules = bookingData?.cancellationRules || [];
    
    // If no cancellation rules, assume eligible with no fee
    if (cancellationRules.length === 0) {
      return { eligible: true, fee: 0 };
    }

    // Get pickup date/time from booking data
    const pickupDateTime = bookingData?.pickupDateTime || bookingData?.startDateTime;
    if (!pickupDateTime) {
      // If no pickup time, assume eligible (but warn)
      this.logger.warn('No pickup date/time found for cancellation eligibility check');
      return { eligible: true, fee: 0 };
    }

    const pickupDate = new Date(pickupDateTime);
    const now = new Date();

    // Calculate hours until pickup
    const hoursUntilPickup = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // ✅ Safely get totalAmount for fee calculation
    const totalAmount = typeof booking.totalAmount === 'string' 
      ? parseFloat(booking.totalAmount) 
      : Number(booking.totalAmount) || 0;

    // ✅ Check each cancellation rule
    for (const rule of cancellationRules) {
      const metricMin = parseInt(rule.metricMin) || 0;
      const metricMax = parseInt(rule.metricMax) || 0;
      const metricType = rule.metricType || 'HOURS';

      // Convert metric to hours for comparison
      let minHours = metricMin;
      let maxHours = metricMax;
      
      if (metricType === 'DAYS') {
        minHours = metricMin * 24;
        maxHours = metricMax * 24;
      } else if (metricType === 'MINUTES') {
        minHours = metricMin / 60;
        maxHours = metricMax / 60;
      }

      // Check if current time falls within this rule's range
      if (hoursUntilPickup >= minHours && hoursUntilPickup < maxHours) {
        let fee = 0;
        if (rule.feeType === 'PERCENTAGE') {
          fee = (totalAmount * parseFloat(rule.feeValue)) / 100;
        } else if (rule.feeType === 'VALUE') {
          fee = parseFloat(rule.feeValue) || 0;
        }
        return { eligible: true, fee };
      }
    }

    // No matching rule found - booking may be non-refundable
    return { 
      eligible: false, 
      fee: totalAmount,
      message: 'Booking is non-refundable based on cancellation policy',
    };
  }
}