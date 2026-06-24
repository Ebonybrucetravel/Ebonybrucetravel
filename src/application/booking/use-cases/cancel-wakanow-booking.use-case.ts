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
      const ticketStatus = booking.bookingData?.ticketStatus as string;
      
      if (ticketStatus === 'Success' || ticketStatus === 'Issued') {
        throw new BadRequestException(
          'This booking has already been ticketed and cannot be cancelled online. Please contact our support team for assistance.'
        );
      }
      
      this.logger.log('Booking is confirmed but not ticketed - allowing cancellation');
    }

    // 5. Calculate cancellation fee using CurrencyService
    const currency = booking.currency || 'NGN';
    
    let cancellationFeeInCurrency: number;
    let cancellationFeeCurrency: string = currency;
    
    try {
      const convertedAmount = await this.currencyService.convert(
        this.CANCELLATION_FEE_USD,
        'USD',
        'NGN'
      );
      
      if (convertedAmount && convertedAmount > 0) {
        cancellationFeeInCurrency = convertedAmount;
        this.logger.log(`✅ Converted $${this.CANCELLATION_FEE_USD} USD to NGN: ${cancellationFeeInCurrency}`);
      } else {
        this.logger.warn(`⚠️ Currency conversion returned ${convertedAmount}, using fallback...`);
        cancellationFeeInCurrency = await this.convertWithFallback(currency);
      }
    } catch (error) {
      this.logger.error(`❌ Currency conversion failed: ${error.message}`);
      cancellationFeeInCurrency = await this.convertWithFallback(currency);
    }

    // 6. Calculate refund amount
    const totalAmount = booking.totalAmount || 0;
    const refundAmount = Math.max(0, totalAmount - cancellationFeeInCurrency);

    // 7. Check if payment was completed
    const isRefundEligible = booking.paymentStatus === PaymentStatus.COMPLETED;

    if (isRefundEligible) {
      this.logger.log(`Payment was completed. Refund: ${refundAmount} ${currency}, Fee: ${cancellationFeeInCurrency} ${currency}`);
    }

    // 8. Get Wakanow booking details for logging
    const wakanowBookingId = booking.providerBookingId;
    const pnrNumber = booking.bookingData?.pnrReferenceNumber;

    this.logger.log(`Cancelling Wakanow booking: ${wakanowBookingId}, PNR: ${pnrNumber}`);

    // 9. Update booking status to CANCELLED
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

    // ✅ 10. Send cancellation email - WITH JSON PARSING FIX
    try {
      // ✅ FIX: Parse passengerInfo if it's a JSON string
      let parsedPassengerInfo: any = null;
      let customerName = 'Valued Customer';
      let userEmail: string | null = null;
      const emailLocations: string[] = [];

      // ✅ Parse passengerInfo if it's a string
      if (booking.passengerInfo) {
        if (typeof booking.passengerInfo === 'string') {
          try {
            parsedPassengerInfo = JSON.parse(booking.passengerInfo);
            // If it's an array, get the first passenger
            if (Array.isArray(parsedPassengerInfo) && parsedPassengerInfo.length > 0) {
              parsedPassengerInfo = parsedPassengerInfo[0];
            }
            this.logger.debug(`✅ Parsed passengerInfo from JSON string`);
          } catch (e) {
            this.logger.debug(`Could not parse passengerInfo as JSON: ${e.message}`);
            parsedPassengerInfo = booking.passengerInfo;
          }
        } else {
          parsedPassengerInfo = booking.passengerInfo;
        }
      }

      // ✅ Get customer name from parsed passengerInfo
      if (parsedPassengerInfo) {
        if (parsedPassengerInfo.firstName) {
          customerName = parsedPassengerInfo.firstName;
          if (parsedPassengerInfo.lastName) {
            customerName += ` ${parsedPassengerInfo.lastName}`;
          }
        } else if (parsedPassengerInfo.name) {
          customerName = parsedPassengerInfo.name;
        } else if (parsedPassengerInfo.fullName) {
          customerName = parsedPassengerInfo.fullName;
        }
      }

      // ✅ Check passengerInfo (most common - parsed from JSON)
      if (parsedPassengerInfo && parsedPassengerInfo.email) {
        userEmail = parsedPassengerInfo.email;
        emailLocations.push('parsedPassengerInfo.email');
      }

      // 2. Check bookingData
      if (!userEmail && booking.bookingData?.email) {
        userEmail = booking.bookingData.email;
        emailLocations.push('bookingData.email');
      }

      // 3. Check raw booking data
      if (!userEmail && (booking as any).email) {
        userEmail = (booking as any).email;
        emailLocations.push('booking.email');
      }

      // 4. Check passengerInfo travellers array (parsed)
      if (!userEmail && parsedPassengerInfo?.travellers && parsedPassengerInfo.travellers.length > 0) {
        for (const traveller of parsedPassengerInfo.travellers) {
          if (traveller.email) {
            userEmail = traveller.email;
            emailLocations.push('parsedPassengerInfo.travellers[].email');
            break;
          }
        }
      }

      // 5. Check bookingData passengers array
      if (!userEmail && booking.bookingData?.passengers && booking.bookingData.passengers.length > 0) {
        for (const passenger of booking.bookingData.passengers) {
          if (passenger.email) {
            userEmail = passenger.email;
            emailLocations.push('bookingData.passengers[].email');
            break;
          }
        }
      }

      // 6. Check providerData for contact info
      if (!userEmail && booking.providerData?.contact?.email) {
        userEmail = booking.providerData.contact.email;
        emailLocations.push('providerData.contact.email');
      }

      // 7. Check providerData for passenger contact
      if (!userEmail && booking.providerData?.passengers && booking.providerData.passengers.length > 0) {
        for (const passenger of booking.providerData.passengers) {
          if (passenger.email) {
            userEmail = passenger.email;
            emailLocations.push('providerData.passengers[].email');
            break;
          }
        }
      }

      // 8. Check bookingData for contact
      if (!userEmail && booking.bookingData?.contact?.email) {
        userEmail = booking.bookingData.contact.email;
        emailLocations.push('bookingData.contact.email');
      }

      // 9. Check bookingData for lead passenger
      if (!userEmail && booking.bookingData?.leadPassenger?.email) {
        userEmail = booking.bookingData.leadPassenger.email;
        emailLocations.push('bookingData.leadPassenger.email');
      }

      // 10. Deep search in parsed passengerInfo for email
      if (!userEmail && parsedPassengerInfo && typeof parsedPassengerInfo === 'object') {
        const findEmail = (obj: any): string | null => {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.email && typeof obj.email === 'string') return obj.email;
          for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'object') {
              const result = findEmail(obj[key]);
              if (result) return result;
            }
          }
          return null;
        };
        const foundEmail = findEmail(parsedPassengerInfo);
        if (foundEmail) {
          userEmail = foundEmail;
          emailLocations.push('parsedPassengerInfo.deepSearch');
        }
      }

      if (userEmail) {
        this.logger.log(`📧 Found email in: ${emailLocations.join(', ')}`);
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
        
        this.logger.debug(`🔍 Complete booking data structure:`, {
          id: booking.id,
          reference: booking.reference,
          provider: booking.provider,
          userId: booking.userId,
          passengerInfoType: typeof booking.passengerInfo,
          passengerInfoIsString: typeof booking.passengerInfo === 'string',
          parsedPassengerInfo: parsedPassengerInfo ? JSON.stringify(parsedPassengerInfo).substring(0, 200) : 'null',
          bookingDataKeys: booking.bookingData ? Object.keys(booking.bookingData) : [],
          providerDataKeys: booking.providerData ? Object.keys(booking.providerData) : [],
          allKeys: Object.keys(booking),
        });
      }
    } catch (emailError: any) {
      // Don't fail the cancellation if email fails
      this.logger.error(`❌ Failed to send cancellation email: ${emailError.message}`);
      this.logger.error(`❌ Email error stack: ${emailError.stack}`);
    }

    // 11. Return cancellation details
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

  /**
   * ✅ Fallback conversion using environment variables and reserve rates
   */
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