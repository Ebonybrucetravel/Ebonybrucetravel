import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from '@domains/payment/services/stripe.service';
import { EncryptionService } from '@infrastructure/security/encryption.service';
import { CreateAmadeusHotelBookingUseCase } from '@application/booking/use-cases/create-amadeus-hotel-booking.use-case';
import { LoyaltyService } from '@domains/loyalty/loyalty.service';
import { VoucherService } from '@domains/loyalty/voucher.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { Provider } from '@prisma/client';
import { toNumber } from '@common/utils/decimal.util';
import Stripe from 'stripe';

/**
 * One-step payment for Amadeus hotel: create Amadeus order with stored card, then charge
 * the margin (markup + service fee) via Stripe server-side with the same card.
 * Call this after the user has created a booking via POST /bookings/hotels/bookings/amadeus.
 * No Stripe Elements on the frontend; one card entry, one "Confirm" action.
 */
@Injectable()
export class ChargeAmadeusHotelMarginUseCase {
  private readonly logger = new Logger(ChargeAmadeusHotelMarginUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly encryptionService: EncryptionService,
    private readonly createAmadeusHotelBookingUseCase: CreateAmadeusHotelBookingUseCase,
    private readonly loyaltyService: LoyaltyService,
    private readonly voucherService: VoucherService,
    private readonly resendService: ResendService,
  ) {}

  /**
   * Guest flow: resolve booking by reference + email, verify email, then charge margin.
   */
  async executeByReferenceAndEmail(
    bookingReference: string,
    email: string,
  ): Promise<{ booking: any; paymentIntentId: string }> {
    if (!bookingReference?.trim() || !email?.trim()) {
      throw new BadRequestException('Booking reference and email are required.');
    }
    const booking = await this.prisma.booking.findUnique({
      where: { reference: bookingReference },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with reference ${bookingReference} not found.`);
    }
    const passengerInfo = (booking.passengerInfo as any) || {};
    const passengerEmail = passengerInfo.email;
    const userEmail = booking.user?.email;
    const emailMatchesPassenger =
      passengerEmail && passengerEmail.toLowerCase() === email.toLowerCase();
    const emailMatchesUser = userEmail && userEmail.toLowerCase() === email.toLowerCase();
    if (!emailMatchesPassenger && !emailMatchesUser) {
      throw new BadRequestException(
        'Email does not match booking. Please check your booking reference and email address.',
      );
    }
    return this.execute(booking.id, booking.userId);
  }

  async execute(bookingId: string, userId: string): Promise<{ booking: any; paymentIntentId: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only charge margin for your own booking');
    }

    if (booking.provider !== Provider.AMADEUS || booking.productType !== 'HOTEL') {
      throw new BadRequestException('This endpoint is only for Amadeus hotel bookings');
    }

    if (booking.paymentStatus === 'COMPLETED') {
      throw new BadRequestException('Booking is already paid');
    }

    const statusAllowed = ['PENDING', 'PAYMENT_PENDING'];
    if (!statusAllowed.includes(booking.status)) {
      throw new BadRequestException(
        `Booking cannot be charged in status ${booking.status}. Expected PENDING or PAYMENT_PENDING.`,
      );
    }

    const bookingData = booking.bookingData as any;
    if (!bookingData?.payment_card_info?.encrypted) {
      throw new BadRequestException(
        'Booking has no stored card. Use POST /bookings/hotels/bookings/amadeus with payment card first.',
      );
    }

    let cardDetails: {
      vendorCode: string;
      cardNumber: string;
      expiryDate: string;
      holderName?: string;
      securityCode?: string;
    };
    try {
      cardDetails = this.encryptionService.decryptCardDetails(bookingData.payment_card_info.encrypted);
    } catch (error) {
      this.logger.error(`Failed to decrypt card for booking ${bookingId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException('Failed to decrypt card details. Booking cannot be completed.');
    }

    // Margin amount: same logic as CreatePaymentIntentUseCase for Amadeus hotel
    const markup = toNumber(booking.markupAmount);
    const serviceFee = toNumber(booking.serviceFee);
    const originalTotal = toNumber(booking.totalAmount);
    const voucherDiscount = toNumber(booking.voucherDiscount) || 0;
    const markupAndFeeTotal = markup + serviceFee;
    let amountToCharge = markupAndFeeTotal;
    if (voucherDiscount > 0 && originalTotal > 0) {
      const discountRatio = voucherDiscount / originalTotal;
      amountToCharge = markupAndFeeTotal * (1 - discountRatio);
    }

    const currency = booking.currency.toUpperCase();
    const multiplier = currency === 'JPY' ? 1 : 100;
    const amountInSmallestUnit = Math.round(amountToCharge * multiplier);

    if (amountInSmallestUnit <= 0) {
      throw new BadRequestException('Margin amount to charge is zero or negative');
    }

    // 1) Create Amadeus order (reserve hotel; this clears the stored card)
    await this.createAmadeusHotelBookingUseCase.createAmadeusBookingAfterPayment(bookingId);

    // 2) Charge margin via Stripe with the card we still have in memory
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: amountInSmallestUnit,
      currency: booking.currency,
      bookingId: booking.id,
      bookingReference: booking.reference,
      metadata: {
        userId: booking.userId,
        productType: booking.productType,
        provider: booking.provider,
        stripeAmountType: 'MARKUP_AND_FEES_ONLY',
      },
    });

    const [expYear, expMonth] = (cardDetails.expiryDate || '').split('-').map(Number);
    if (!expYear || !expMonth || expMonth < 1 || expMonth > 12) {
      throw new BadRequestException('Invalid card expiry format. Expected YYYY-MM.');
    }

    let paymentMethod;
    let confirmed;
    try {
      paymentMethod = await this.stripeService.createPaymentMethodFromCard({
        number: cardDetails.cardNumber.replace(/\s/g, ''),
        exp_month: expMonth,
        exp_year: expYear,
        cvc: cardDetails.securityCode,
      });
      confirmed = await this.stripeService.confirmPaymentIntent(
        paymentIntent.id,
        paymentMethod.id,
      );
    } catch (stripeError: any) {
      const msg = stripeError?.message ?? String(stripeError);
      if (
        typeof msg === 'string' &&
        (msg.includes('raw card data') || msg.includes('Sending credit card numbers directly'))
      ) {
        throw new BadRequestException(
          'Stripe test mode does not allow raw card numbers by default. ' +
            'Either enable "Raw card data APIs" in your Stripe test account (Support → enable for test), ' +
            'or use the two-step flow: create payment intent then complete payment with Stripe Elements on the frontend.',
        );
      }
      throw stripeError;
    }

    if (confirmed.status !== 'succeeded') {
      this.logger.error(
        `Stripe confirm did not succeed for booking ${bookingId}: status=${confirmed.status}`,
      );
      throw new BadRequestException(
        `Payment could not be completed: ${confirmed.last_payment_error?.message || confirmed.status}`,
      );
    }

    // 3) Update booking with payment result
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: 'COMPLETED',
        paymentProvider: 'STRIPE',
        paymentReference: confirmed.id,
        paymentInfo: {
          paymentIntentId: confirmed.id,
          amount: confirmed.amount_received ?? amountInSmallestUnit,
          currency: confirmed.currency,
          status: confirmed.status,
          paidAt: new Date(),
          verified: true,
        },
      },
    });

    // 4) Side effects: voucher, loyalty, emails
    const updatedBooking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (updatedBooking?.voucherId) {
      this.voucherService
        .markVoucherAsUsed(updatedBooking.voucherId, bookingId)
        .then(() => this.logger.log(`Voucher marked as used for booking ${bookingId}`))
        .catch((err) => this.logger.error(`Failed to mark voucher as used for ${bookingId}:`, err));
    }

    this.loyaltyService
      .earnPointsFromBooking(
        updatedBooking!.userId,
        bookingId,
        updatedBooking!.productType,
        Number(updatedBooking!.totalAmount),
        updatedBooking!.currency,
      )
      .then(({ pointsEarned }) => {
        if (pointsEarned > 0) {
          this.logger.log(`Awarded ${pointsEarned} loyalty points for booking ${bookingId}`);
        }
      })
      .catch((err) => this.logger.error(`Failed to award loyalty for ${bookingId}:`, err));

    this.sendBookingEmails(updatedBooking!, confirmed).catch((err) =>
      this.logger.error(`Failed to send booking emails for ${bookingId}:`, err),
    );

    return {
      booking: updatedBooking,
      paymentIntentId: confirmed.id,
    };
  }

  private async sendBookingEmails(
    booking: any,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const user = booking.user;
      if (!user?.email) return;

      const bookingData = booking.bookingData as any;
      const passengerInfo = booking.passengerInfo as any;
      const bookingDetails: any = {};
      bookingDetails.hotelName = bookingData?.hotelName || bookingData?.hotel?.name || 'Hotel';
      bookingDetails.roomType = bookingData?.roomType || bookingData?.room?.type;
      bookingDetails.checkInDate = bookingData?.checkInDate || bookingData?.check_in_date;
      bookingDetails.checkOutDate = bookingData?.checkOutDate || bookingData?.check_out_date;
      bookingDetails.guests =
        bookingData?.guests?.length || passengerInfo?.guests?.length || 1;
      bookingDetails.adults =
        bookingData?.adults || passengerInfo?.adults || bookingDetails.guests;
      bookingDetails.children = bookingData?.children || passengerInfo?.children || 0;

      await this.resendService.sendBookingConfirmationEmail({
        to: user.email,
        customerName: user.name || passengerInfo?.firstName || 'Valued Customer',
        bookingReference: booking.reference,
        productType: booking.productType,
        provider: booking.provider,
        bookingDetails,
        pricing: {
          basePrice: Number(booking.basePrice),
          markupAmount: Number(booking.markupAmount),
          serviceFee: Number(booking.serviceFee),
          totalAmount: Number(booking.totalAmount),
          currency: booking.currency,
        },
        confirmationDate: new Date(),
        bookingId: booking.id,
        cancellationDeadline: booking.cancellationDeadline ?? undefined,
        cancellationPolicySummary: booking.cancellationPolicySnapshot ?? undefined,
        noShowWording:
          booking.productType === 'HOTEL'
            ? 'In case of no-show, the hotel may charge the full stay amount to the card used at booking. Our service fee is non-refundable once the booking is confirmed.'
            : undefined,
      });

      await this.resendService.sendPaymentReceiptEmail({
        to: user.email,
        customerName: user.name || passengerInfo?.firstName || 'Valued Customer',
        bookingReference: booking.reference,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount_received ?? paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentDate: new Date(),
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        productType: booking.productType,
        bookingDetails,
      });

      this.logger.log(`Booking confirmation and receipt emails sent for booking ${booking.id}`);
    } catch (error) {
      this.logger.error('Failed to send booking emails:', error);
    }
  }
}
