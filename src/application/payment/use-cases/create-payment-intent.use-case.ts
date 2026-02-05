import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from '@domains/payment/services/stripe.service';

@Injectable()
export class CreatePaymentIntentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async execute(bookingId: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
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

    // Decide what amount to charge via Stripe
    // For most products, Stripe charges the full totalAmount.
    // For Amadeus HOTEL bookings, Stripe should only charge our markup + service fee
    // (the hotel/base amount is charged directly by Amadeus/hotel).
    const currency = booking.currency.toUpperCase();
    const multiplier = currency === 'JPY' ? 1 : 100; // JPY has no decimal places

    let amountToCharge = booking.totalAmount;

    // If this is an Amadeus hotel booking, only charge our margin (markup + service fee)
    if (booking.provider === 'AMADEUS' && booking.productType === 'HOTEL') {
      // Convert Prisma Decimal types to numbers for proper addition
      amountToCharge = Number(booking.markupAmount) + Number(booking.serviceFee);
    }

    const amountInSmallestUnit = Math.round(Number(amountToCharge) * multiplier);

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
        // Helpful for reconciliation: what did Stripe actually charge for?
        stripeAmountType:
          booking.provider === 'AMADEUS' && booking.productType === 'HOTEL'
            ? 'MARKUP_AND_FEES_ONLY'
            : 'FULL_BOOKING_AMOUNT',
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
    };
  }
}

