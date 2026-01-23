import { Module } from '@nestjs/common';
import { ProcessPaymentUseCase } from './use-cases/process-payment.use-case';
import { PaymentModule } from '@domains/payment/payment.module';

@Module({
  imports: [PaymentModule],
  providers: [ProcessPaymentUseCase],
  exports: [ProcessPaymentUseCase],
})
export class PaymentApplicationModule {}
