import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/stripe.service';
import { PaystackService } from './services/paystack.service';

@Module({
  providers: [PaymentService, StripeService, PaystackService],
  exports: [PaymentService, StripeService, PaystackService],
})
export class PaymentModule {}

