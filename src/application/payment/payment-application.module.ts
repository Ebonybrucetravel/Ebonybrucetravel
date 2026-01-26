import { Module } from '@nestjs/common';
import { ProcessPaymentUseCase } from './use-cases/process-payment.use-case';
import { CreatePaymentIntentUseCase } from './use-cases/create-payment-intent.use-case';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.use-case';
import { PaymentModule } from '@domains/payment/payment.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { BookingApplicationModule } from '@application/booking/booking-application.module'; // Added to access CreateDuffelOrderUseCase

@Module({
  imports: [PaymentModule, DatabaseModule, BookingApplicationModule], // Added BookingApplicationModule
  providers: [
    ProcessPaymentUseCase,
    CreatePaymentIntentUseCase,
    HandleStripeWebhookUseCase,
  ],
  exports: [
    ProcessPaymentUseCase,
    CreatePaymentIntentUseCase,
    HandleStripeWebhookUseCase,
  ],
})
export class PaymentApplicationModule {}
