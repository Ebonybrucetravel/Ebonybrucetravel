import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';

@Injectable()
export class CancelWakanowBookingUseCase {
  private readonly logger = new Logger(CancelWakanowBookingUseCase.name);

  // ✅ Wakanow cancellation fee is $50 USD as per terms
  private readonly CANCELLATION_FEE_USD = 50;

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly wakanowService: WakanowService,
  ) {}

  async execute(bookingId: string, userId: string) {
    this.logger.log(`Cancelling Wakanow booking ${bookingId} for user ${userId}`);

    // 1. Find booking
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // 2. Verify user owns this booking
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }

    // 3. Verify it's a Wakanow booking
    if (booking.provider !== 'WAKANOW') {
      throw new BadRequestException('This booking is not a Wakanow booking');
    }

    // 4. Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      // CONFIRMED bookings might have tickets issued - check ticket status
      const ticketStatus = booking.bookingData?.ticketStatus as string;
      
      if (ticketStatus === 'Success' || ticketStatus === 'Issued') {
        throw new BadRequestException(
          'This booking has already been ticketed and cannot be cancelled online. Please contact our support team for assistance.'
        );
      }
      
      // If not ticketed, allow cancellation
      this.logger.log('Booking is confirmed but not ticketed - allowing cancellation');
    }

    // 5. Calculate cancellation fee and refund
    // ✅ Calculate cancellation fee based on booking currency
    const currency = booking.currency || 'NGN';
    
    // ✅ Convert $50 USD to the booking currency
    // Using a conservative exchange rate - you should use your currency service
    const USD_TO_NGN_RATE = 1500; // 1 USD = 1500 NGN (adjust as needed)
    const USD_TO_GBP_RATE = 0.78; // 1 USD = 0.78 GBP
    
    let cancellationFeeInCurrency: number;
    let cancellationFeeCurrency: string;
    
    if (currency === 'USD') {
      cancellationFeeInCurrency = this.CANCELLATION_FEE_USD;
      cancellationFeeCurrency = 'USD';
    } else if (currency === 'GBP') {
      cancellationFeeInCurrency = this.CANCELLATION_FEE_USD * USD_TO_GBP_RATE;
      cancellationFeeCurrency = 'GBP';
    } else if (currency === 'NGN') {
      cancellationFeeInCurrency = this.CANCELLATION_FEE_USD * USD_TO_NGN_RATE;
      cancellationFeeCurrency = 'NGN';
    } else {
      // Default: use the booking currency with a fallback conversion
      cancellationFeeInCurrency = this.CANCELLATION_FEE_USD * USD_TO_NGN_RATE;
      cancellationFeeCurrency = currency;
    }

    // ✅ Calculate refund amount
    const totalAmount = booking.totalAmount || 0;
    const refundAmount = Math.max(0, totalAmount - cancellationFeeInCurrency);

    // 6. Check if payment was completed
    const isRefundEligible = booking.paymentStatus === PaymentStatus.COMPLETED;

    if (isRefundEligible) {
      this.logger.log(`Payment was completed. Refund: ${refundAmount} ${currency}, Fee: ${cancellationFeeInCurrency} ${currency}`);
    }

    // 7. Get Wakanow booking details for logging
    const wakanowBookingId = booking.providerBookingId;
    const pnrNumber = booking.bookingData?.pnrReferenceNumber;

    this.logger.log(`Cancelling Wakanow booking: ${wakanowBookingId}, PNR: ${pnrNumber}`);

    // 8. Update booking status to CANCELLED
    const updatedBookingData = {
      ...(booking.bookingData as any || {}),
      cancelledAt: new Date().toISOString(),
      cancellationReason: 'User cancelled booking',
      cancellationRequestedBy: userId,
      cancellationSource: 'USER_PROFILE',
      wakanowBookingId: wakanowBookingId,
      pnrNumber: pnrNumber,
      refundStatus: isRefundEligible ? 'PENDING' : 'NOT_APPLICABLE',
      // ✅ Store cancellation fee details
      cancellationFee: cancellationFeeInCurrency,
      cancellationFeeCurrency: cancellationFeeCurrency,
      cancellationFeeUSD: this.CANCELLATION_FEE_USD,
      refundAmount: refundAmount,
    };

    await this.bookingRepository.update(bookingId, {
      status: BookingStatus.CANCELLED,
      bookingData: updatedBookingData,
    });

    this.logger.log(`Wakanow booking ${bookingId} cancelled successfully`);

    // 9. Return cancellation details with fee information
    return {
      success: true,
      bookingId: bookingId,
      reference: booking.reference,
      provider: booking.provider,
      wakanowBookingId: wakanowBookingId,
      pnrNumber: pnrNumber || 'N/A',
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      refundEligible: isRefundEligible,
      refundAmount: refundAmount,
      cancellationFee: cancellationFeeInCurrency,
      cancellationFeeCurrency: cancellationFeeCurrency,
      cancellationFeeUSD: this.CANCELLATION_FEE_USD,
      currency: currency,
      message: isRefundEligible 
        ? `Booking cancelled successfully. A cancellation fee of ${cancellationFeeCurrency} ${cancellationFeeInCurrency.toFixed(2)} ($${this.CANCELLATION_FEE_USD} USD) has been applied. Your refund of ${currency} ${refundAmount.toFixed(2)} will be processed within 7-10 business days.`
        : 'Booking cancelled successfully. No payment was processed.',
    };
  }
}