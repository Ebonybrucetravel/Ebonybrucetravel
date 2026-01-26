import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });

    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  /**
   * Create a payment intent for a booking
   */
  async createPaymentIntent(params: {
    amount: number; // Amount in smallest currency unit (cents for USD, kobo for NGN)
    currency: string; // ISO 4217 currency code
    bookingId: string;
    bookingReference: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        metadata: {
          bookingId: params.bookingId,
          bookingReference: params.bookingReference,
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw new BadRequestException(
        `Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a refund for a payment
   */
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // Optional: partial refund
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentIntentId,
      };

      if (params.amount) {
        refundParams.amount = params.amount;
      }

      if (params.reason) {
        refundParams.reason = params.reason;
      }

      return await this.stripe.refunds.create(refundParams);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create refund: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify webhook signature
   * This is CRITICAL for security - verifies webhook actually came from Stripe
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
      return event;
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get Stripe instance (for advanced usage)
   */
  getStripe(): Stripe {
    return this.stripe;
  }
}
