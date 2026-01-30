import { Injectable } from '@nestjs/common';
import { DuffelService } from '@infrastructure/external-apis/duffel/duffel.service';
import { BookingService } from '@domains/booking/services/booking.service';
import { CreateHotelBookingDto } from '@presentation/booking/dto/create-hotel-booking.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class CreateHotelBookingUseCase {
  constructor(
    private readonly duffelService: DuffelService,
    private readonly bookingService: BookingService,
  ) {}

  async execute(dto: CreateHotelBookingDto, userId: string) {
    try {
      // Create booking in Duffel
      const duffelBooking = await this.duffelService.createHotelBooking({
        quote_id: dto.quote_id,
        email: dto.email,
        phone_number: dto.phone_number,
        guests: dto.guests,
        ...(dto.accommodation_special_requests && {
          accommodation_special_requests: dto.accommodation_special_requests,
        }),
        ...(dto.payment && { payment: dto.payment }),
        ...(dto.metadata && { metadata: dto.metadata }),
        users: [userId], // Allow user to manage their own booking
      });

      const bookingData = duffelBooking.data;

      // Extract pricing information
      const totalAmount = bookingData.total_amount
        ? parseFloat(bookingData.total_amount)
        : 0;
      const currency = bookingData.total_currency || 'GBP';

      // Create booking in our database
      const booking = await this.bookingService.createBooking({
        userId,
        productType: 'HOTEL',
        provider: 'DUFFEL',
        providerBookingId: bookingData.id,
        basePrice: totalAmount,
        markupAmount: 0, // Markup already applied during search/quote
        serviceFee: 0,
        totalAmount,
        currency,
        bookingData: {
          duffel_booking: bookingData,
          check_in_date: bookingData.check_in_date,
          check_out_date: bookingData.check_out_date,
          accommodation: bookingData.accommodation,
          guests: dto.guests,
        },
        status: BookingStatus.CONFIRMED, // Hotel bookings are confirmed immediately
        paymentStatus: bookingData.payment_status || 'COMPLETED',
      });

      return {
        booking,
        duffel_booking: bookingData,
      };
    } catch (error) {
      console.error('Error creating hotel booking:', error);
      throw error;
    }
  }
}

