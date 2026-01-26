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

    // Convert amount to smallest currency unit
    // For NGN: multiply by 100 (kobo)
    // For USD: multiply by 100 (cents)
    const amountInSmallestUnit = Math.round(
      Number(booking.totalAmount) * (booking.currency === 'NGN' ? 100 : 100),
    );

    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: amountInSmallestUnit,
      currency: booking.currency,
      bookingId: booking.id,
      bookingReference: booking.reference,
      metadata: {
        userId: booking.userId,
        productType: booking.productType,
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

