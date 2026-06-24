import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { CurrencyService } from '@infrastructure/currency/currency.service';

@Injectable()
export class CancelWakanowBookingUseCase {
  private readonly logger = new Logger(CancelWakanowBookingUseCase.name);


  private readonly CANCELLATION_FEE_USD = 50;

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly wakanowService: WakanowService,
    private readonly resendService: ResendService,
    private readonly currencyService: CurrencyService,
  ) {}

  async execute(bookingId: string, userId: string) {
    this.logger.log(`Cancelling Wakanow booking ${bookingId} for user ${userId}`);

    // 1. Find booking
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

  
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }

  
    if (booking.provider !== 'WAKANOW') {
      throw new BadRequestException('This booking is not a Wakanow booking');
    }

   
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      const ticketStatus = booking.bookingData?.ticketStatus as string;
      
      if (ticketStatus === 'Success' || ticketStatus === 'Issued') {
        throw new BadRequestException(
          'This booking has already been ticketed and cannot be cancelled online. Please contact our support team for assistance.'
        );
      }
      
      this.logger.log('Booking is confirmed but not ticketed - allowing cancellation');
    }


    const currency = booking.currency || 'NGN';
    
   
    let cancellationFeeInCurrency: number;
    let cancellationFeeCurrency: string = currency;
    
    try {
   
      const convertedAmount = await this.currencyService.convert(
        this.CANCELLATION_FEE_USD,
        'USD',
        currency
      );
      
      if (convertedAmount && convertedAmount > 0) {
        cancellationFeeInCurrency = convertedAmount;
        this.logger.log(`✅ Converted $${this.CANCELLATION_FEE_USD} USD to ${currency}: ${cancellationFeeInCurrency}`);
      } else {
        this.logger.warn(`⚠️ Currency conversion returned ${convertedAmount}, using fallback...`);
        cancellationFeeInCurrency = await this.convertWithFallback(currency);
      }
    } catch (error) {
      this.logger.error(`❌ Currency conversion failed: ${error.message}`);
      cancellationFeeInCurrency = await this.convertWithFallback(currency);
    }


    const totalAmount = booking.totalAmount || 0;
    const refundAmount = Math.max(0, totalAmount - cancellationFeeInCurrency);


    const isRefundEligible = booking.paymentStatus === PaymentStatus.COMPLETED;

    if (isRefundEligible) {
      this.logger.log(`Payment was completed. Refund: ${refundAmount} ${currency}, Fee: ${cancellationFeeInCurrency} ${currency}`);
    }


    const wakanowBookingId = booking.providerBookingId;
    const pnrNumber = booking.bookingData?.pnrReferenceNumber;

    this.logger.log(`Cancelling Wakanow booking: ${wakanowBookingId}, PNR: ${pnrNumber}`);


    const updatedBookingData = {
      ...(booking.bookingData as any || {}),
      cancelledAt: new Date().toISOString(),
      cancellationReason: 'User cancelled booking',
      cancellationRequestedBy: userId,
      cancellationSource: 'USER_PROFILE',
      wakanowBookingId: wakanowBookingId,
      pnrNumber: pnrNumber,
      refundStatus: isRefundEligible ? 'PENDING' : 'NOT_APPLICABLE',
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

    try {
      const customerName = booking.passengerInfo?.firstName || 
                          booking.passengerInfo?.name || 
                          'Valued Customer';

      const userEmail = booking.passengerInfo?.email || 
                       (booking as any).user?.email || 
                       null;

      if (userEmail) {
        this.logger.log(`📧 Sending cancellation email to ${userEmail}`);
        
        await this.resendService.sendCancellationEmail({
          to: userEmail,
          customerName: customerName,
          bookingReference: booking.reference,
          refundAmount: isRefundEligible ? refundAmount : undefined,
          refundCurrency: isRefundEligible ? currency : undefined,
          refundTo: 'original payment method',
          hasAirlineCredits: false,
          airlineCredits: [],
          cancellationDate: new Date(),
        });

        this.logger.log(`✅ Cancellation email sent to ${userEmail}`);
      } else {
        this.logger.warn(`⚠️ No email found for booking ${bookingId} - skipping cancellation email`);
      }
    } catch (emailError: any) {
      this.logger.error(`❌ Failed to send cancellation email: ${emailError.message}`);
    }


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

  
  private async convertWithFallback(targetCurrency: string): Promise<number> {

    try {
     
      const usdToNgn = await this.currencyService.convert(
        this.CANCELLATION_FEE_USD,
        'USD',
        'NGN'
      );
      
      if (usdToNgn && usdToNgn > 0 && targetCurrency !== 'NGN') {
      
        const ngnToTarget = await this.currencyService.convert(
          usdToNgn,
          'NGN',
          targetCurrency
        );
        
        if (ngnToTarget && ngnToTarget > 0) {
          this.logger.log(`✅ Fallback conversion successful: $${this.CANCELLATION_FEE_USD} USD → ${ngnToTarget} ${targetCurrency}`);
          return ngnToTarget;
        }
      }
      
      if (usdToNgn && usdToNgn > 0 && targetCurrency === 'NGN') {
        return usdToNgn;
      }
    } catch (error) {
      this.logger.error(`Fallback conversion failed: ${error.message}`);
    }

    
    const usdToNgnRate = parseFloat(process.env.USD_TO_NGN_RATE || '1500');
    
    const fallbackRates: Record<string, number> = {
      'NGN': usdToNgnRate,
      'GBP': usdToNgnRate * 0.00078,
      'EUR': usdToNgnRate * 0.00092,
      'USD': 1,
      'GHS': usdToNgnRate * 0.01,
      'KES': usdToNgnRate * 0.087,
      'ZAR': usdToNgnRate * 0.012,
      'CAD': usdToNgnRate * 0.0012,
      'AUD': usdToNgnRate * 0.0013,
    };

    const rate = fallbackRates[targetCurrency] || usdToNgnRate;
    const result = this.CANCELLATION_FEE_USD * rate;
    
    this.logger.warn(`⚠️ Using fallback rate for ${targetCurrency}: ${rate} (${result})`);
    return result;
  }
}