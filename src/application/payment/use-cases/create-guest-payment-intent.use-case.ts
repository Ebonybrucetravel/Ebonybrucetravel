import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreatePaymentIntentUseCase } from './create-payment-intent.use-case';

@Injectable()
export class CreateGuestPaymentIntentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createPaymentIntentUseCase: CreatePaymentIntentUseCase,
  ) {}

  /**
   * Create a Stripe payment intent for a guest booking using
   * booking reference + passenger email (no authentication).
   *
   * This is a common industry pattern for guest checkout:
   * - Use opaque booking reference (like a PNR)
   * - Verify with passenger email
   */
  async execute(bookingReference: string, email: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!bookingReference || !email) {
      throw new BadRequestException('Booking reference and email are required.');
    }

    // Find booking by reference
    const booking = await this.prisma.booking.findUnique({
      where: { reference: bookingReference },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference ${bookingReference} not found.`);
    }

    // Verify email matches passenger info or user email
    const passengerInfo = (booking.passengerInfo as any) || {};
    const passengerEmail = passengerInfo.email;

    const user = booking.userId
      ? await this.prisma.user.findUnique({
          where: { id: booking.userId },
        })
      : null;

    const userEmail = user?.email;

    const emailMatchesPassenger = passengerEmail && passengerEmail.toLowerCase() === email.toLowerCase();
    const emailMatchesUser = userEmail && userEmail.toLowerCase() === email.toLowerCase();

    if (!emailMatchesPassenger && !emailMatchesUser) {
      throw new BadRequestException(
        'Email does not match booking. Please check your booking reference and email address.',
      );
    }

    // Delegate to the regular payment intent use case (reuses all checks)
    return this.createPaymentIntentUseCase.execute(booking.id);
  }
}


