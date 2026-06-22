import { Injectable, Logger, Inject, BadRequestException, GoneException, HttpException, HttpStatus } from '@nestjs/common';
import { WakanowService, WakanowBookRequest, WakanowPassengerDetail } from '@infrastructure/external-apis/wakanow/wakanow.service';
import { BookingRepository } from '@domains/booking/repositories/booking.repository';
import { BOOKING_REPOSITORY } from '@domains/booking/repositories/booking.repository.token';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';
import { BookingStatus, PaymentStatus, ProductType, Provider } from '@prisma/client';
import { BookWakanowFlightDto } from '@presentation/booking/dto/wakanow-flights.dto';
import { MarkupCalculationService } from '@domains/markup/services/markup-calculation.service';

@Injectable()
export class BookWakanowFlightUseCase {
  private readonly logger = new Logger(BookWakanowFlightUseCase.name);

  constructor(
    private readonly wakanowService: WakanowService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly markupRepository: MarkupRepository,
    private readonly markupCalculationService: MarkupCalculationService,
  ) {}

  async execute(dto: BookWakanowFlightDto, userId: string) {
    const { passengers, bookingId, selectData, targetCurrency = 'NGN', priceBreakdown } = dto;

    this.logger.log(`📝 Booking Wakanow flight. BookingId: ${bookingId}, Type: ${typeof bookingId}, Length: ${bookingId?.length}`);
    this.logger.log(`👤 UserId: ${userId}`);
    this.logger.log(`👤 Passengers: ${passengers.length}`);
    this.logger.log(`📋 SelectData length: ${selectData?.length || 0}`);

    if (priceBreakdown) {
      this.logger.log('💰 Using price breakdown from select:', {
        basePrice: priceBreakdown.basePrice,
        markupAmount: priceBreakdown.markupAmount,
        markupPercentage: priceBreakdown.markupPercentage,
        serviceFee: priceBreakdown.serviceFee,
        serviceFeePercentage: priceBreakdown.serviceFeePercentage,
        taxes: priceBreakdown.taxes,
        taxPercentage: priceBreakdown.taxPercentage,
        totalAmount: priceBreakdown.totalAmount,
        currency: priceBreakdown.currency,
      });
    } else {
      this.logger.warn('⚠️ No price breakdown provided! Will use Wakanow price and recalculate.');
    }

    if (!bookingId) {
      throw new BadRequestException('BookingId is required');
    }
    if (!selectData) {
      throw new BadRequestException('SelectData is required');
    }
    if (!passengers || passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }

    const isWakanowId = /^\d+$/.test(bookingId);
    this.logger.log(`Is Wakanow BookingId: ${isWakanowId}`);

    if (!isWakanowId) {
      this.logger.warn(`⚠️ BookingId "${bookingId}" appears to be a local ID, not a Wakanow ID!`);
    }

    const existingBooking = await this.bookingRepository.findByProviderBookingId(bookingId);
    
    if (existingBooking) {
      this.logger.log(`Booking ${bookingId} already exists, returning existing`);
      return {
        ...existingBooking,
        wakanow_booking_id: existingBooking.providerBookingId,
        pnr_reference: existingBooking.bookingData?.pnrReferenceNumber || 'Pending',
        message: 'Booking already exists',
        requiresPayment: existingBooking.paymentStatus === PaymentStatus.PENDING,
        paymentStatus: existingBooking.paymentStatus,
        localBookingId: existingBooking.id,
      };
    }


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


    this.logger.log(`Sending booking request to Wakanow with BookingId: ${bookingId}`);


    let bookResponse;
    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      try {
        attempt++;
        this.logger.log(`📖 Booking attempt ${attempt}/${maxRetries}...`);
        bookResponse = await this.wakanowService.bookFlight(wakanowRequest);

        break;
      } catch (error: any) {
        lastError = error;
        const errorMsg = error?.message?.toLowerCase() || '';
        const errorString = JSON.stringify(error)?.toLowerCase() || '';


        const errorStatus = error?.status || 
                           error?.response?.status || 
                           error?.response?.statusCode || 
                           error?.statusCode || 
                           error?.code || 
                           0;


        if (errorMsg.includes('not selected by you') || 
            errorMsg.includes('session expired') ||
            errorMsg.includes('session has expired') ||
            errorMsg.includes('expired') ||
            errorMsg.includes('no longer available')) {
          this.logger.error(`❌ Booking failed because flight wasn't selected by this user. BookingId: ${bookingId}`);
          throw new BadRequestException(
            'Your flight selection has expired. Please search for flights again and complete the booking promptly.'
          );
        }


        if ((errorStatus === 500 || errorStatus === 0 || errorStatus === 502 || errorStatus === 503) && attempt < maxRetries) {
          this.logger.warn(`⚠️ Booking attempt ${attempt} failed with ${errorStatus}, retrying in ${1000 * attempt}ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        if (errorStatus === 400 && attempt < 2) {
          this.logger.warn(`⚠️ Booking attempt ${attempt} failed with 400, retrying once...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

   
        throw error;
      }
    }


    if (!bookResponse) {
      this.logger.error('❌ All booking retry attempts failed');
      throw new HttpException(
        'Failed to book flight after multiple attempts. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }


    const pnr = bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrReferenceNumber || 
                bookResponse.FlightBookingResult?.PnReferenceNumber ||
                'PENDING_ISSUE';


    const combo = bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.FlightSummaryModel?.FlightCombination;
    if (!combo) {
      throw new Error('Flight booking failed: Invalid response from Wakanow (missing FlightCombination)');
    }

    const price = combo.Price;
    const firstDep = combo.FlightModels[0]?.DepartureCode || '';
    const firstArr = combo.FlightModels[0]?.ArrivalCode || '';


    const isDomestic = this.isNigerianRoute(firstDep, firstArr);
    const productType = isDomestic ? ProductType.FLIGHT_DOMESTIC : ProductType.FLIGHT_INTERNATIONAL;


    let basePrice: number;
    let markupAmount: number;
    let markupPercentage: number;
    let serviceFee: number;
    let serviceFeePercentage: number;
    let totalAmount: number;
    let currency: string;
    let breakdown: string;

    if (priceBreakdown && priceBreakdown.totalAmount > 0) {

      basePrice = priceBreakdown.basePrice;
      markupAmount = priceBreakdown.markupAmount;
      markupPercentage = priceBreakdown.markupPercentage;
      serviceFee = priceBreakdown.serviceFee;
      serviceFeePercentage = priceBreakdown.serviceFeePercentage;
      totalAmount = priceBreakdown.totalAmount;
      currency = priceBreakdown.currency || price.CurrencyCode || 'NGN';
      breakdown = `${basePrice} + ${markupAmount} (${markupPercentage}% markup) + ${serviceFee} (${serviceFeePercentage}% service fee) = ${totalAmount}`;
      
      this.logger.log(`💰 Using price breakdown from select:`, {
        basePrice,
        markupAmount,
        markupPercentage,
        serviceFee,
        serviceFeePercentage,
        totalAmount,
        currency,
      });
    } else {
    
      this.logger.warn('⚠️ No price breakdown provided, calculating from Wakanow price...');
      
      try {

        const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
          productType,
          price.CurrencyCode
        );

        if (markupConfig) {

          const result = this.markupCalculationService.calculateTotal(
            price.Amount,
            productType,
            price.CurrencyCode,
            markupConfig
          );
          
          basePrice = price.Amount;
          markupAmount = result.markupAmount;
          markupPercentage = markupConfig.markupPercentage;
          serviceFee = result.serviceFee;
          serviceFeePercentage = result.serviceFeePercentage;
          totalAmount = result.totalAmount;
          currency = price.CurrencyCode;
          breakdown = `${basePrice} + ${markupAmount} (${markupPercentage}% markup) + ${serviceFee} (${serviceFeePercentage}% service fee) = ${totalAmount}`;
          
          this.logger.log(`💰 Calculated with markup config:`, {
            productType,
            currency: price.CurrencyCode,
            markupPercentage,
            serviceFeePercentage,
            totalAmount,
          });

          this.logger.warn(`No markup config found for ${productType} in ${price.CurrencyCode}, using defaults`);
          
          const defaultMarkupPercentage = isDomestic ? 10 : 15;
          const defaultServiceFeePercentage = 5;
          
          basePrice = price.Amount;
          markupPercentage = defaultMarkupPercentage;
          markupAmount = (price.Amount * defaultMarkupPercentage) / 100;
          serviceFee = (price.Amount * defaultServiceFeePercentage) / 100;
          totalAmount = price.Amount + markupAmount + serviceFee;
          serviceFeePercentage = defaultServiceFeePercentage;
          currency = price.CurrencyCode;
          breakdown = `${basePrice} + ${markupAmount} (${markupPercentage}% markup) + ${serviceFee} (${serviceFeePercentage}% service fee) = ${totalAmount}`;
        }
      } catch (error) {
        this.logger.warn('Failed to fetch markup config, using defaults:', error);
        
        const defaultMarkupPercentage = isDomestic ? 10 : 15;
        const defaultServiceFeePercentage = 5;
        
        basePrice = price.Amount;
        markupPercentage = defaultMarkupPercentage;
        markupAmount = (price.Amount * defaultMarkupPercentage) / 100;
        serviceFee = (price.Amount * defaultServiceFeePercentage) / 100;
        totalAmount = price.Amount + markupAmount + serviceFee;
        serviceFeePercentage = defaultServiceFeePercentage;
        currency = price.CurrencyCode;
        breakdown = `${basePrice} + ${markupAmount} (${markupPercentage}% markup) + ${serviceFee} (${serviceFeePercentage}% service fee) = ${totalAmount}`;
      }
    }

    this.logger.log(`💰 Final Price Breakdown:`, {
      productType,
      currency,
      basePrice,
      markupPercentage,
      markupAmount,
      serviceFeePercentage,
      serviceFee,
      totalAmount,
      breakdown,
    });


    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    const reference = `EBT-${dateStr}-${random}`;

  
    const booking = await this.bookingRepository.create({
      reference,
      userId,
      productType,
      status: BookingStatus.PAYMENT_PENDING,
      provider: Provider.WAKANOW,
      providerBookingId: bookResponse.BookingId,
      providerData: bookResponse as any,
      basePrice: basePrice,
      markupAmount: markupAmount,
      serviceFee: serviceFee,
      totalAmount: totalAmount,
      currency: currency,
      bookingData: {
        wakanowBookingId: bookResponse.BookingId,
        pnrReferenceNumber: pnr,
        selectData,
        flightSummary: combo,
        targetCurrency,
        ticketStatus: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.TicketStatus || 'PENDING',
        pnrStatus: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrStatus || 'PENDING',
   
        priceBreakdown: {
          basePrice,
          markupAmount,
          markupPercentage,
          serviceFee,
          serviceFeePercentage,
          totalAmount,
          currency,
          breakdown,
        },
      },
      passengerInfo: passengers as any,
      paymentStatus: PaymentStatus.PENDING,
    });

    this.logger.log(`✅ Wakanow flight booked. Local booking: ${booking.id}, PNR: ${pnr}`);


    return {
      ...booking,
      wakanow_booking_id: bookResponse.BookingId,
      pnr_reference: pnr,
      pnr_date: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrDate,
      flight_summary: combo,
      passengers: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.TravellerDetails,
      message: 'Flight booked successfully. Please proceed to payment.',
      requiresPayment: true,
      paymentStatus: PaymentStatus.PENDING,
      localBookingId: booking.id,
      paymentUrl: `/api/v1/payments/initiate?bookingId=${booking.id}`,
      amount: totalAmount,
      currency: currency,

      priceBreakdown: {
        basePrice,
        markupAmount,
        markupPercentage,
        serviceFee,
        serviceFeePercentage,
        totalAmount,
        currency,
        breakdown,
      },
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