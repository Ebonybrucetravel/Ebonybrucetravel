import { Module } from '@nestjs/common';
import { CreateBookingUseCase } from './use-cases/create-booking.use-case';
import { CreateGuestBookingUseCase } from './use-cases/create-guest-booking.use-case';
import { SearchFlightsUseCase } from './use-cases/search-flights.use-case';
import { ListOffersUseCase } from './use-cases/list-offers.use-case';
import { CreateDuffelOrderUseCase } from './use-cases/create-duffel-order.use-case';
import { CancelDuffelOrderUseCase } from './use-cases/cancel-duffel-order.use-case';
import { HandleDuffelWebhookUseCase } from './use-cases/handle-duffel-webhook.use-case';
import { BookingModule } from '@domains/booking/booking.module';
import { MarkupModule } from '@domains/markup/markup.module';
import { ExternalApisModule } from '@infrastructure/external-apis/external-apis.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { CacheModule } from '@infrastructure/cache/cache.module';

@Module({
  imports: [BookingModule, MarkupModule, ExternalApisModule, DatabaseModule, CacheModule],
  providers: [
    CreateBookingUseCase,
    CreateGuestBookingUseCase,
    SearchFlightsUseCase,
    ListOffersUseCase,
    CreateDuffelOrderUseCase,
    CancelDuffelOrderUseCase,
    HandleDuffelWebhookUseCase,
  ],
  exports: [
    CreateBookingUseCase,
    CreateGuestBookingUseCase,
    SearchFlightsUseCase,
    ListOffersUseCase,
    CreateDuffelOrderUseCase,
    CancelDuffelOrderUseCase,
    HandleDuffelWebhookUseCase,
  ],
})
export class BookingApplicationModule {}
