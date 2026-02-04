import { Module } from '@nestjs/common';
import { DuffelService } from './duffel/duffel.service';
import { TripsAfricaService } from './trips-africa/trips-africa.service';
import { BookingComService } from './booking-com/booking-com.service';
import { AmadeusService } from './amadeus/amadeus.service';
import { GooglePlacesModule } from './google-places/google-places.module';

@Module({
  imports: [GooglePlacesModule],
  providers: [DuffelService, TripsAfricaService, BookingComService, AmadeusService],
  exports: [DuffelService, TripsAfricaService, BookingComService, AmadeusService, GooglePlacesModule],
})
export class ExternalApisModule {}
