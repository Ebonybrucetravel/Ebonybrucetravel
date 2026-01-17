import { Module } from '@nestjs/common';
import { BookingService } from './services/booking.service';
import { BookingStatusService } from './services/booking-status.service';
import { BookingRepository } from './repositories/booking.repository';
import { BOOKING_REPOSITORY } from './repositories/booking.repository.token';
import { BookingRepositoryImpl } from '@infrastructure/database/repositories/booking.repository.impl';

@Module({
  providers: [
    BookingService,
    BookingStatusService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepositoryImpl,
    },
  ],
  exports: [BookingService, BookingStatusService, BOOKING_REPOSITORY],
})
export class BookingModule {}

