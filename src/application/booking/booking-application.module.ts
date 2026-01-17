import { Module } from '@nestjs/common';
import { CreateBookingUseCase } from './use-cases/create-booking.use-case';
import { CreateGuestBookingUseCase } from './use-cases/create-guest-booking.use-case';
import { SearchFlightsUseCase } from './use-cases/search-flights.use-case';
import { BookingModule } from '@domains/booking/booking.module';
import { MarkupModule } from '@domains/markup/markup.module';
import { ExternalApisModule } from '@infrastructure/external-apis/external-apis.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';

@Module({
  imports: [BookingModule, MarkupModule, ExternalApisModule, DatabaseModule],
  providers: [
    CreateBookingUseCase,
    CreateGuestBookingUseCase,
    SearchFlightsUseCase,
  ],
  exports: [CreateBookingUseCase, CreateGuestBookingUseCase, SearchFlightsUseCase],
})
export class BookingApplicationModule {}

