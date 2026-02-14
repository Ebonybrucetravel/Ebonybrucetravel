import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { VoucherService } from '@domains/loyalty/voucher.service';
import { AgencyCardService } from '@infrastructure/security/agency-card.service';
import { toNumber } from '@common/utils/decimal.util';

@Injectable()
export class CreatePaymentIntentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly voucherService: VoucherService,
    private readonly agencyCardService: AgencyCardService,
  ) {}

  async execute(
    bookingId: string,
    voucherCode?: string,
    userId?: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string; voucherApplied?: any }> {
    // Get booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'COMPLETED') {
      throw new Error('Booking is already paid');
    }

    // Apply voucher if provided
    let voucherDiscount = 0;
    let voucherId: string | undefined;
    let finalAmount = toNumber(booking.totalAmount);

    if (voucherCode && userId) {
      try {
        const voucherResult = await this.voucherService.applyVoucher(
          voucherCode,
          userId,
          booking.productType,
          finalAmount,
          booking.currency,
        );
        voucherDiscount = voucherResult.discountAmount;
        finalAmount = voucherResult.finalAmount;
        voucherId = voucherResult.voucherId;

        // Update booking with voucher info
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            voucherId: voucherResult.voucherId,
            voucherCode: voucherResult.voucherCode,
            voucherDiscount: voucherDiscount,
            finalAmount: finalAmount,
          },
        });
      } catch (error) {
        throw new NotFoundException(
          error instanceof Error ? error.message : 'Failed to apply voucher',
        );
      }
    }

    // Decide what amount to charge via Stripe
    // Merchant model: customer pays full amount; we pay Amadeus from agency card → charge full.
    // Guest-card model: Amadeus hotel only charge margin (markup + service fee); hotel charged via guest card.
    const currency = booking.currency.toUpperCase();
    const multiplier = currency === 'JPY' ? 1 : 100; // JPY has no decimal places

    let amountToCharge = finalAmount;
    const isAmadeusHotel = booking.provider === 'AMADEUS' && booking.productType === 'HOTEL';
    const chargeMarginOnly =
      isAmadeusHotel && !this.agencyCardService.isMerchantModel();

    if (chargeMarginOnly) {
      const markup = toNumber(booking.markupAmount);
      const serviceFee = toNumber(booking.serviceFee);
      const originalTotal = toNumber(booking.totalAmount);
      const markupAndFeeTotal = markup + serviceFee;
      if (voucherDiscount > 0 && originalTotal > 0) {
        const discountRatio = voucherDiscount / originalTotal;
        amountToCharge = markupAndFeeTotal * (1 - discountRatio);
      } else {
        amountToCharge = markupAndFeeTotal;
      }
    }

    const amountInSmallestUnit = Math.round(amountToCharge * multiplier);

    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: amountInSmallestUnit,
      currency: booking.currency,
      bookingId: booking.id,
      bookingReference: booking.reference,
      metadata: {
        userId: booking.userId,
        productType: booking.productType,
        provider: booking.provider,
        stripeAmountType: chargeMarginOnly ? 'MARKUP_AND_FEES_ONLY' : 'FULL_BOOKING_AMOUNT',
        ...(voucherId && {
          voucherId,
          voucherCode,
          voucherDiscount: voucherDiscount.toString(),
        }),
      },
    });

    // Update booking with payment intent ID
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentReference: paymentIntent.id,
        paymentStatus: 'PROCESSING',
        status: 'PAYMENT_PENDING',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      ...(voucherDiscount > 0 && {
        voucherApplied: {
          voucherCode,
          discountAmount: voucherDiscount,
          originalAmount: toNumber(booking.totalAmount),
          finalAmount,
        },
      }),
    };
  }
}

