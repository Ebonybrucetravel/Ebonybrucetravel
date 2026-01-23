import { Module } from '@nestjs/common';
import { DuffelService } from './duffel/duffel.service';
import { TripsAfricaService } from './trips-africa/trips-africa.service';
import { BookingComService } from './booking-com/booking-com.service';

@Module({
  providers: [DuffelService, TripsAfricaService, BookingComService],
  exports: [DuffelService, TripsAfricaService, BookingComService],
})
export class ExternalApisModule {}
