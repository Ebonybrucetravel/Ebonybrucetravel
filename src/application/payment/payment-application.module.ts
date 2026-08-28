import { Module } from '@nestjs/common';
import { ProcessPaymentUseCase } from './use-cases/process-payment.use-case';
import { CreatePaymentIntentUseCase } from './use-cases/create-payment-intent.use-case';
import { CreateGuestPaymentIntentUseCase } from './use-cases/create-guest-payment-intent.use-case';
import { HandleStripeWebhookUseCase } from './use-cases/handle-stripe-webhook.use-case';
import { ChargeAmadeusHotelMarginUseCase } from './use-cases/charge-amadeus-hotel-margin.use-case';
import { ChargeAmadeusCarRentalMarginUseCase } from './use-cases/charge-amadeus-car-rental-margin.use-case';
import { PaymentModule } from '@domains/payment/payment.module';
import { BookingService } from '@domains/booking/services/booking.service';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { BookingApplicationModule } from '@application/booking/booking-application.module';
import { EmailModule } from '@infrastructure/email/email.module';
import { LoyaltyModule } from '@domains/loyalty/loyalty.module';
import { SecurityModule } from '@infrastructure/security/security.module';
import { BookingRepositoryImpl } from '@infrastructure/database/repositories/booking.repository.impl';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';

@Module({
  imports: [
    PaymentModule,
    DatabaseModule,
    BookingApplicationModule,
    EmailModule,
    LoyaltyModule,
    SecurityModule,
  ],
  providers: [
    ProcessPaymentUseCase,
    CreatePaymentIntentUseCase,
    CreateGuestPaymentIntentUseCase,
    HandleStripeWebhookUseCase,
    ChargeAmadeusHotelMarginUseCase,
    ChargeAmadeusCarRentalMarginUseCase,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepositoryImpl,
    },
    
    BookingService,
  ],
  exports: [
    ProcessPaymentUseCase,
    BookingService,
    CreatePaymentIntentUseCase,
    CreateGuestPaymentIntentUseCase,
    HandleStripeWebhookUseCase,
    ChargeAmadeusHotelMarginUseCase,
    ChargeAmadeusCarRentalMarginUseCase,
  ],
})
export class PaymentApplicationModule {}
