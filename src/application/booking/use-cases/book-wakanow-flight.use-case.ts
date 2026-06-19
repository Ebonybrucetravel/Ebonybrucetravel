import { Injectable, Logger, Inject, BadRequestException, GoneException, HttpException, HttpStatus } from '@nestjs/common';
import { WakanowService, WakanowBookRequest, WakanowPassengerDetail } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { BookingStatus, PaymentStatus, ProductType, Provider } from '@prisma/client';
import { BookWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';

@Injectable()
export class BookWakanowFlightUseCase {
  private readonly logger = new Logger(BookWakanowFlightUseCase.name);

  constructor(
    private readonly wakanowService: WakanowService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly markupRepository: MarkupRepository,
  ) {}

  async execute(dto: BookWakanowFlightDto, userId: string) {
    const { passengers, bookingId, selectData, targetCurrency = 'NGN' } = dto;

    this.logger.log(`Booking Wakanow flight. BookingId: ${bookingId}, Passengers: ${passengers.length}`);

    // ✅ Validate required fields
    if (!bookingId) {
      throw new BadRequestException('BookingId is required');
    }
    if (!selectData) {
      throw new BadRequestException('SelectData is required');
    }
    if (!passengers || passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }

    // ✅ Check for duplicate booking - USING THE CORRECT METHOD
    const existingBooking = await this.bookingRepository.findByProviderBookingId(bookingId);
    
    if (existingBooking) {
      this.logger.log(`Booking ${bookingId} already exists, returning existing`);
      return {
        ...existingBooking,
        wakanow_booking_id: existingBooking.providerBookingId,
        pnr_reference: existingBooking.bookingData?.pnrReferenceNumber || 'Pending',
        message: 'Booking already exists',
      };
    }

    // ✅ Validate passenger data
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.firstName) {
        throw new BadRequestException(`Passenger ${i + 1}: First name is required`);
      }
      if (!p.lastName) {
        throw new BadRequestException(`Passenger ${i + 1}: Last name is required`);
      }
      if (!p.email) {
        throw new BadRequestException(`Passenger ${i + 1}: Email is required`);
      }
      if (!p.phoneNumber) {
        throw new BadRequestException(`Passenger ${i + 1}: Phone is required`);
      }
      if (!p.dateOfBirth) {
        throw new BadRequestException(`Passenger ${i + 1}: Date of birth is required`);
      }
      if (!p.title) {
        throw new BadRequestException(`Passenger ${i + 1}: Title is required`);
      }
      if (!p.gender) {
        throw new BadRequestException(`Passenger ${i + 1}: Gender is required`);
      }
    }

    // ✅ Map passengers to Wakanow format
    const wakanowPassengers: WakanowPassengerDetail[] = passengers.map((p) => ({
      PassengerType: p.passengerType || 'Adult',
      FirstName: p.firstName,
      MiddleName: p.middleName || '',
      LastName: p.lastName,
      DateOfBirth: p.dateOfBirth,
      PhoneNumber: p.phoneNumber,
      Email: p.email,
      Gender: p.gender,
      Title: p.title,
      PassportNumber: p.passportNumber || '',
      ExpiryDate: p.expiryDate || '',
      PassportIssuingAuthority: p.passportIssuingAuthority || '',
      PassportIssueCountryCode: p.passportIssueCountryCode || '',
      Address: p.address || '123 Fake Street',
      Country: p.country || 'Nigeria',
      CountryCode: p.countryCode || 'NG',
      City: p.city || 'Lagos',
      PostalCode: p.postalCode || '100001',
      IsWakapointRegister: false,
    }));

    // ✅ Build Wakanow request
    const wakanowRequest: WakanowBookRequest = {
      PassengerDetails: wakanowPassengers,
      BookingItemModels: [
        {
          ProductType: 'Flight',
          BookingData: selectData,
          BookingId: bookingId,
          TargetCurrency: targetCurrency,
        },
      ],
      BookingId: bookingId,
    };

    // ✅ Book with Wakanow
    let bookResponse;
    try {
      bookResponse = await this.wakanowService.bookFlight(wakanowRequest);
    } catch (error: any) {
      this.logger.error('Wakanow booking failed:', error);
      
      const errorMsg = error?.message?.toLowerCase() || '';
      // ✅ Handle "not selected by you" error (session expired)
      if (errorMsg.includes('not selected by you') || 
          errorMsg.includes('session expired') ||
          errorMsg.includes('session has expired')) {
        throw new BadRequestException(
          'Your flight selection has expired. Please search for flights again and complete the booking promptly.'
        );
      }
      
      if (errorMsg.includes('expired') || errorMsg.includes('no longer available')) {
        throw new GoneException('Your booking session has expired. Please search again.');
      }
      
      throw new HttpException(
        error?.message || 'Failed to book flight with Wakanow',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ Extract PNR
    const pnr = bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrReferenceNumber || 'PENDING_ISSUE';

    // ✅ Extract flight combination
    const combo = bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.FlightSummaryModel?.FlightCombination;
    if (!combo) {
      throw new Error('Flight booking failed: Invalid response from Wakanow (missing FlightCombination)');
    }

    const price = combo.Price;
    const firstDep = combo.FlightModels[0]?.DepartureCode || '';
    const firstArr = combo.FlightModels[0]?.ArrivalCode || '';

    // ✅ Determine if domestic or international
    const isDomestic = this.isNigerianRoute(firstDep, firstArr);
    const productType = isDomestic ? ProductType.FLIGHT_DOMESTIC : ProductType.FLIGHT_INTERNATIONAL;

    // ✅ Calculate markup
    let markupPercentage = 0;
    let serviceFee = 0;
    try {
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(productType, price.CurrencyCode);
      markupPercentage = markupConfig?.markupPercentage || 0;
      serviceFee = markupConfig?.serviceFeeAmount || 0;
    } catch (error) {
      this.logger.warn('Failed to fetch markup config, using defaults:', error);
    }

    const markupAmount = (price.Amount * markupPercentage) / 100;
    const totalAmount = price.Amount + markupAmount + serviceFee;

    // ✅ Generate reference
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    const reference = `EBT-${dateStr}-${random}`;

    // ✅ Create local booking
    const booking = await this.bookingRepository.create({
      reference,
      userId,
      productType,
      status: BookingStatus.PAYMENT_PENDING,
      provider: Provider.WAKANOW,
      providerBookingId: bookResponse.BookingId,
      providerData: bookResponse as any,
      basePrice: price.Amount,
      markupAmount,
      serviceFee,
      totalAmount,
      currency: price.CurrencyCode,
      bookingData: {
        wakanowBookingId: bookResponse.BookingId,
        pnrReferenceNumber: pnr,
        selectData,
        flightSummary: combo,
        targetCurrency,
        ticketStatus: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.TicketStatus || 'PENDING',
        pnrStatus: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrStatus || 'PENDING',
      },
      passengerInfo: passengers as any,
      paymentStatus: PaymentStatus.PENDING,
    });

    this.logger.log(`✅ Wakanow flight booked. Local booking: ${booking.id}, PNR: ${pnr}`);

    // ✅ Return enriched booking
    return {
      ...booking,
      wakanow_booking_id: bookResponse.BookingId,
      pnr_reference: pnr,
      pnr_date: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrDate,
      flight_summary: combo,
      passengers: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.TravellerDetails,
      message: 'Flight booked successfully. Please proceed to payment.',
    };
  }

  private isNigerianRoute(origin: string, destination: string): boolean {
    const nigerianAirports = ['LOS', 'ABV', 'KAN', 'PHC', 'QOW', 'ENU', 'ILR', 'JOS', 'YOL', 'CBQ', 'BNI', 'AKR', 'MIU', 'QRW'];
    return (
      nigerianAirports.includes(origin.toUpperCase()) &&
      nigerianAirports.includes(destination.toUpperCase())
    );
  }
}