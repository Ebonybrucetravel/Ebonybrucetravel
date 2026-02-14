import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

/**
 * Saved Payment Method Service
 * 
 * Industry best practices applied:
 * - NEVER stores raw card numbers, CVV, or full expiry dates
 * - Uses Stripe's PCI-compliant tokenization (SetupIntents + PaymentMethods)
 * - Only stores: Stripe pm_xxx token, brand, last4, expiry month/year for display
 * - All sensitive card operations happen on Stripe's servers
 * - Card details are collected via Stripe.js/Elements on the frontend
 */
@Injectable()
export class SavedPaymentMethodService {
  private readonly logger = new Logger(SavedPaymentMethodService.name);
  private readonly MAX_SAVED_CARDS = 5; // Max cards per user

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Create a Stripe SetupIntent for saving a card
   * Frontend uses the clientSecret with Stripe.js to collect card details securely
   */
  async createSetupIntent(userId: string): Promise<{
    clientSecret: string;
    setupIntentId: string;
  }> {
    // Check card limit
    const existingCount = await this.prisma.savedPaymentMethod.count({
      where: { userId, deletedAt: null },
    });

    if (existingCount >= this.MAX_SAVED_CARDS) {
      throw new BadRequestException(
        `Maximum of ${this.MAX_SAVED_CARDS} saved cards allowed. Please remove a card first.`,
      );
    }

    // Get or create Stripe Customer
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);

    // Create SetupIntent (Stripe handles card collection securely)
    const stripe = this.stripeService.getStripe();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        userId,
      },
    });

    return {
      clientSecret: setupIntent.client_secret!,
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * Confirm and save a payment method after SetupIntent is completed
   * Called after frontend confirms the SetupIntent via Stripe.js
   */
  async confirmAndSavePaymentMethod(
    userId: string,
    setupIntentId: string,
    cardholderName?: string,
  ) {
    const stripe = this.stripeService.getStripe();

    // Retrieve the completed SetupIntent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      throw new BadRequestException(
        `SetupIntent is not completed. Current status: ${setupIntent.status}`,
      );
    }

    if (setupIntent.metadata?.userId !== userId) {
      throw new BadRequestException('SetupIntent does not belong to this user');
    }

    const paymentMethodId = setupIntent.payment_method as string;
    if (!paymentMethodId) {
      throw new BadRequestException('No payment method attached to SetupIntent');
    }

    // Check if this payment method is already saved
    const existing = await this.prisma.savedPaymentMethod.findUnique({
      where: { stripePaymentMethodId: paymentMethodId },
    });

    if (existing) {
      throw new BadRequestException('This card is already saved');
    }

    // Retrieve payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod.card) {
      throw new BadRequestException('Payment method is not a card');
    }

    // Check if this is the first card (make it default)
    const existingCount = await this.prisma.savedPaymentMethod.count({
      where: { userId, deletedAt: null },
    });
    const isDefault = existingCount === 0;

    // Save ONLY the safe display info + Stripe token reference
    const savedMethod = await this.prisma.savedPaymentMethod.create({
      data: {
        userId,
        stripePaymentMethodId: paymentMethodId,
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expiryMonth: paymentMethod.card.exp_month,
        expiryYear: paymentMethod.card.exp_year,
        cardholderName: cardholderName || null,
        isDefault,
      },
    });

    this.logger.log(
      `Saved payment method ${paymentMethodId} (${paymentMethod.card.brand} ****${paymentMethod.card.last4}) for user ${userId}`,
    );

    return this.formatPaymentMethod(savedMethod);
  }

  /**
   * List user's saved payment methods
   */
  async listPaymentMethods(userId: string) {
    const methods = await this.prisma.savedPaymentMethod.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return methods.map((m) => this.formatPaymentMethod(m));
  }

  /**
   * Set a payment method as default
   */
  async setDefault(userId: string, paymentMethodId: string) {
    const method = await this.prisma.savedPaymentMethod.findFirst({
      where: { id: paymentMethodId, userId, deletedAt: null },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Remove default from all, then set on the chosen one
    await this.prisma.$transaction([
      this.prisma.savedPaymentMethod.updateMany({
        where: { userId, deletedAt: null },
        data: { isDefault: false },
      }),
      this.prisma.savedPaymentMethod.update({
        where: { id: paymentMethodId },
        data: { isDefault: true },
      }),
    ]);

    return { success: true, message: 'Default payment method updated' };
  }

  /**
   * Remove a saved payment method (soft delete + detach from Stripe)
   */
  async removePaymentMethod(userId: string, paymentMethodId: string) {
    const method = await this.prisma.savedPaymentMethod.findFirst({
      where: { id: paymentMethodId, userId, deletedAt: null },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Detach from Stripe Customer
    try {
      const stripe = this.stripeService.getStripe();
      await stripe.paymentMethods.detach(method.stripePaymentMethodId);
    } catch (error) {
      this.logger.warn(
        `Failed to detach payment method from Stripe: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      // Continue with local removal even if Stripe detach fails
    }

    // Soft delete locally
    await this.prisma.savedPaymentMethod.update({
      where: { id: paymentMethodId },
      data: { deletedAt: new Date() },
    });

    // If removed card was default, set next available as default
    if (method.isDefault) {
      const nextCard = await this.prisma.savedPaymentMethod.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      if (nextCard) {
        await this.prisma.savedPaymentMethod.update({
          where: { id: nextCard.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true, message: 'Payment method removed' };
  }

  /**
   * Create a PaymentIntent using a saved payment method
   * For seamless checkout with saved cards
   */
  async createPaymentIntentWithSavedCard(
    userId: string,
    savedPaymentMethodId: string,
    amount: number,
    currency: string,
    bookingId: string,
    bookingReference: string,
  ) {
    const method = await this.prisma.savedPaymentMethod.findFirst({
      where: { id: savedPaymentMethodId, userId, deletedAt: null },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);
    const stripe = this.stripeService.getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      payment_method: method.stripePaymentMethodId,
      off_session: false,
      confirm: false, // Let frontend confirm to handle 3D Secure
      metadata: {
        bookingId,
        bookingReference,
        userId,
        savedPaymentMethodId: method.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Get or create a Stripe Customer for the user
   */
  private async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create Stripe Customer
    const stripe = this.stripeService.getStripe();
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });

    // Save Stripe Customer ID
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Created Stripe Customer ${customer.id} for user ${userId}`);
    return customer.id;
  }

  /**
   * Format payment method for API response (safe display data only)
   */
  private formatPaymentMethod(method: any) {
    return {
      id: method.id,
      brand: method.brand,
      last4: method.last4,
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      cardholderName: method.cardholderName,
      isDefault: method.isDefault,
      createdAt: method.createdAt,
    };
  }
}

