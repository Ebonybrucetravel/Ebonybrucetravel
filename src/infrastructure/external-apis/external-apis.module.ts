import { Module } from '@nestjs/common';
import { DuffelService } from './duffel/duffel.service';
import { TripsAfricaService } from './trips-africa/trips-africa.service';
import { BookingComService } from './booking-com/booking-com.service';
import { AmadeusService } from './amadeus/amadeus.service';
import { WakanowService } from './wakanow/wakanow.service';
import { GooglePlacesModule } from './google-places/google-places.module';
import { HotelbedsModule } from './hotelbeds/hotelbeds.module';
@Module({
  imports: [GooglePlacesModule, HotelbedsModule],
  providers: [DuffelService, TripsAfricaService, BookingComService, AmadeusService, WakanowService],
  exports: [DuffelService, TripsAfricaService, BookingComService, AmadeusService, WakanowService, GooglePlacesModule, HotelbedsModule],
})
export class ExternalApisModule { }
