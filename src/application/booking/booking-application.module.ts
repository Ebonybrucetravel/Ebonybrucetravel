import { Module } from '@nestjs/common';
import { CreateBookingUseCase } from './use-cases/create-booking.use-case';
import { CreateGuestBookingUseCase } from './use-cases/create-guest-booking.use-case';
import { SearchFlightsUseCase } from './use-cases/search-flights.use-case';
import { ListOffersUseCase } from './use-cases/list-offers.use-case';
import { CreateDuffelOrderUseCase } from './use-cases/create-duffel-order.use-case';
import { CancelDuffelOrderUseCase } from './use-cases/cancel-duffel-order.use-case';
import { HandleDuffelWebhookUseCase } from './use-cases/handle-duffel-webhook.use-case';
import { SearchHotelsUseCase } from './use-cases/search-hotels.use-case';
import { FetchHotelRatesUseCase } from './use-cases/fetch-hotel-rates.use-case';
import { CreateHotelQuoteUseCase } from './use-cases/create-hotel-quote.use-case';
import { CreateHotelBookingUseCase } from './use-cases/create-hotel-booking.use-case';
import { CreateAmadeusHotelBookingUseCase } from './use-cases/create-amadeus-hotel-booking.use-case';
import { CreateGuestAmadeusHotelBookingUseCase } from './use-cases/create-guest-amadeus-hotel-booking.use-case';
import { GetHotelBookingUseCase } from './use-cases/get-hotel-booking.use-case';
import { ListHotelBookingsUseCase } from './use-cases/list-hotel-bookings.use-case';
import { CancelHotelBookingUseCase } from './use-cases/cancel-hotel-booking.use-case';
import { GetAccommodationUseCase } from './use-cases/get-accommodation.use-case';
import { SearchAccommodationSuggestionsUseCase } from './use-cases/search-accommodation-suggestions.use-case';
import { GetAccommodationReviewsUseCase } from './use-cases/get-accommodation-reviews.use-case';
import { SearchPlaceSuggestionsUseCase } from './use-cases/search-place-suggestions.use-case';
import { ListAirlinesUseCase } from './use-cases/list-airlines.use-case';
import { SearchAmadeusHotelsUseCase } from './use-cases/search-amadeus-hotels.use-case';
import { GetAmadeusHotelDetailsUseCase } from './use-cases/get-amadeus-hotel-details.use-case';
import { SearchCarRentalsUseCase } from './use-cases/search-car-rentals.use-case';
import { CreateCarRentalBookingUseCase } from './use-cases/create-car-rental-booking.use-case';
import { CreateGuestCarRentalBookingUseCase } from './use-cases/create-guest-car-rental-booking.use-case';
import { CancelCarRentalBookingUseCase } from './use-cases/cancel-car-rental-booking.use-case';
import { RequestHotelCancellationUseCase } from './use-cases/request-hotel-cancellation.use-case';
import { ProcessCancellationRequestUseCase } from './use-cases/process-cancellation-request.use-case';
import { BookingModule } from '@domains/booking/booking.module';
import { PaymentModule } from '@domains/payment/payment.module';
import { MarkupModule } from '@domains/markup/markup.module';
import { ExternalApisModule } from '@infrastructure/external-apis/external-apis.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { CacheModule } from '@infrastructure/cache/cache.module';
import { EmailModule } from '@infrastructure/email/email.module';
import { CurrencyModule } from '@infrastructure/currency/currency.module';
import { SecurityModule } from '@infrastructure/security/security.module';
import { HotelImagesModule } from '@application/hotel-images/hotel-images.module';
import { UsageTrackingModule } from '@infrastructure/usage-tracking/usage-tracking.module';

@Module({
  imports: [
    BookingModule,
    MarkupModule,
    ExternalApisModule,
    DatabaseModule,
    CacheModule,
    EmailModule,
    CurrencyModule,
    SecurityModule,
    HotelImagesModule,
    UsageTrackingModule,
    PaymentModule,
  ],
  providers: [
    CreateBookingUseCase,
    CreateGuestBookingUseCase,
    SearchFlightsUseCase,
    ListOffersUseCase,
    CreateDuffelOrderUseCase,
    CancelDuffelOrderUseCase,
    HandleDuffelWebhookUseCase,
    SearchHotelsUseCase,
    FetchHotelRatesUseCase,
    CreateHotelQuoteUseCase,
    CreateHotelBookingUseCase,
    CreateAmadeusHotelBookingUseCase,
    CreateGuestAmadeusHotelBookingUseCase,
    GetHotelBookingUseCase,
    ListHotelBookingsUseCase,
    CancelHotelBookingUseCase,
    GetAccommodationUseCase,
    SearchAccommodationSuggestionsUseCase,
    GetAccommodationReviewsUseCase,
    SearchPlaceSuggestionsUseCase,
    ListAirlinesUseCase,
    SearchAmadeusHotelsUseCase,
    GetAmadeusHotelDetailsUseCase,
    SearchCarRentalsUseCase,
    CreateCarRentalBookingUseCase,
    CreateGuestCarRentalBookingUseCase,
    CancelCarRentalBookingUseCase,
    RequestHotelCancellationUseCase,
    ProcessCancellationRequestUseCase,
  ],
  exports: [
    CreateBookingUseCase,
    CreateGuestBookingUseCase,
    SearchFlightsUseCase,
    ListOffersUseCase,
    CreateDuffelOrderUseCase,
    CancelDuffelOrderUseCase,
    HandleDuffelWebhookUseCase,
    SearchHotelsUseCase,
    FetchHotelRatesUseCase,
    CreateHotelQuoteUseCase,
    CreateHotelBookingUseCase,
    CreateAmadeusHotelBookingUseCase,
    CreateGuestAmadeusHotelBookingUseCase,
    GetHotelBookingUseCase,
    ListHotelBookingsUseCase,
    CancelHotelBookingUseCase,
    GetAccommodationUseCase,
    SearchAccommodationSuggestionsUseCase,
    GetAccommodationReviewsUseCase,
    SearchPlaceSuggestionsUseCase,
    ListAirlinesUseCase,
    SearchAmadeusHotelsUseCase,
    GetAmadeusHotelDetailsUseCase,
    SearchCarRentalsUseCase,
    CreateCarRentalBookingUseCase,
    CreateGuestCarRentalBookingUseCase,
    CancelCarRentalBookingUseCase,
    RequestHotelCancellationUseCase,
    ProcessCancellationRequestUseCase,
  ],
})
export class BookingApplicationModule {}
