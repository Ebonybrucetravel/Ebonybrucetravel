import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { StripeService } from './services/stripe.service';
import { PaystackService } from './services/paystack.service';
import { SavedPaymentMethodService } from './services/saved-payment-method.service';
import { DatabaseModule } from '@infrastructure/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PaymentService, StripeService, PaystackService, SavedPaymentMethodService],
  exports: [PaymentService, StripeService, PaystackService, SavedPaymentMethodService],
})
export class PaymentModule {}
