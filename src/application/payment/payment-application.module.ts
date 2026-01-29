import { Module } from '@nestjs/common';
import { ProcessPaymentUseCase } from './use-cases/process-payment.use-case';
import { CreatePaymentIntentUseCase } from './use-cases/create-payment-intent.use-case';
import { CreateGuestPaymentIntentUseCase } from './use-cases/create-guest-payment-intent.use-case';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.use-case';
import { PaymentModule } from '@domains/payment/payment.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { BookingApplicationModule } from '@application/booking/booking-application.module'; // Added to access CreateDuffelOrderUseCase
import { EmailModule } from '@infrastructure/email/email.module';

@Module({
  imports: [PaymentModule, DatabaseModule, BookingApplicationModule, EmailModule], // Added EmailModule
  providers: [
    ProcessPaymentUseCase,
    CreatePaymentIntentUseCase,
    CreateGuestPaymentIntentUseCase,
    HandleStripeWebhookUseCase,
  ],
  exports: [
    ProcessPaymentUseCase,
    CreatePaymentIntentUseCase,
    CreateGuestPaymentIntentUseCase,
    HandleStripeWebhookUseCase,
  ],
})
export class PaymentApplicationModule {}
