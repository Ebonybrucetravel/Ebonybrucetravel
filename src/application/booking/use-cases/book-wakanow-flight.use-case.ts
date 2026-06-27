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
  private readonly DEFAULT_MARKUP_PERCENTAGE = 10;
  private readonly DEFAULT_SERVICE_FEE_PERCENTAGE = 5;
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly wakanowService: WakanowService,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: BookingRepository,
    private readonly markupRepository: MarkupRepository,
    private readonly markupCalculationService: MarkupCalculationService,
  ) {}

  async execute(dto: BookWakanowFlightDto, userId: string) {
    const { passengers, bookingId, selectData, targetCurrency = 'NGN', priceBreakdown } = dto;

    this.logger.log(`📝 Booking Wakanow flight. BookingId: ${bookingId}`);
    this.logger.log(`👤 UserId: ${userId}`);
    this.logger.log(`👤 Passengers: ${passengers.length}`);
    this.logger.log(`📋 SelectData length: ${selectData?.length || 0}`);


    this.validateRequiredFields(bookingId, selectData, passengers);


    this.validateSelectData(selectData);


    this.validatePriceBreakdown(priceBreakdown);

  
    const existingBooking = await this.bookingRepository.findByProviderBookingId(bookingId);
    
    if (existingBooking) {
      this.logger.log(`Booking ${bookingId} already exists, returning existing`);
      return this.buildExistingBookingResponse(existingBooking);
    }

  
    this.validatePassengers(passengers);

  
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


    const bookResponse = await this.executeWithRetry(wakanowRequest, bookingId);


    const pnr = this.extractPnr(bookResponse);
    const combo = this.extractFlightCombination(bookResponse);
    const price = combo.Price;
    const firstDep = combo.FlightModels[0]?.DepartureCode || '';
    const firstArr = combo.FlightModels[0]?.ArrivalCode || '';


    const isDomestic = this.isNigerianRoute(firstDep, firstArr);
    const productType = isDomestic ? ProductType.FLIGHT_DOMESTIC : ProductType.FLIGHT_INTERNATIONAL;


    const priceCalculation = await this.calculatePrices(
      price,
      productType,
      isDomestic,
      priceBreakdown
    );


    const booking = await this.createLocalBooking(
      bookResponse,
      pnr,
      combo,
      priceCalculation,
      passengers,
      userId,
      selectData,
      targetCurrency,
      productType
    );

    this.logger.log(`✅ Wakanow flight booked. Local booking: ${booking.id}, PNR: ${pnr}`);

    return this.buildSuccessResponse(booking, bookResponse, pnr, combo, passengers, priceCalculation, firstDep, firstArr);
  }

  private validateRequiredFields(bookingId: string, selectData: string, passengers: any[]): void {
    if (!bookingId) {
      throw new BadRequestException('BookingId is required');
    }
    if (!selectData) {
      throw new BadRequestException('SelectData is required');
    }
    if (!passengers || passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }
  }

  private validateSelectData(selectData: string): void {
    if (!selectData || selectData.trim().length === 0) {
      throw new BadRequestException('SelectData is required for booking');
    }
    
    if (selectData.trim().length < 10) {
      this.logger.warn(`SelectData too short: ${selectData.length} chars`);
      throw new BadRequestException(
        'Invalid booking data. Please search for flights again and complete the booking promptly.'
      );
    }
    
    this.logger.log(`✅ SelectData validated: ${selectData.length} chars`);
    this.logger.log(`✅ SelectData preview: ${selectData.substring(0, 50)}...`);
  }

  private validatePriceBreakdown(priceBreakdown: any): void {
    if (!priceBreakdown) {
      this.logger.warn('⚠️ No price breakdown provided! Will use Wakanow price and recalculate.');
      return;
    }

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

    if (priceBreakdown.totalAmount <= 0) {
      this.logger.warn('⚠️ Invalid price breakdown: totalAmount <= 0');
      throw new BadRequestException('Invalid price breakdown provided');
    }
    if (priceBreakdown.basePrice <= 0) {
      this.logger.warn('⚠️ Invalid price breakdown: basePrice <= 0');
      throw new BadRequestException('Invalid price breakdown provided');
    }
  }

  private validatePassengers(passengers: any[]): void {
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
  }

  // ============================================================
  // BUSINESS LOGIC METHODS
  // ============================================================

  private buildExistingBookingResponse(existingBooking: any): any {
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

  private async executeWithRetry(wakanowRequest: WakanowBookRequest, bookingId: string): Promise<any> {
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      try {
        attempt++;
        this.logger.log(`📖 Booking attempt ${attempt}/${this.MAX_RETRIES}...`);
        return await this.wakanowService.bookFlight(wakanowRequest);
      } catch (error: any) {
        const errorMsg = error?.message?.toLowerCase() || '';
        const errorString = JSON.stringify(error)?.toLowerCase() || '';
        const errorStatus = error?.status || error?.response?.status || 0;


        if (errorMsg.includes('not selected by you') || 
            errorMsg.includes('session expired') ||
            errorMsg.includes('session has expired') ||
            errorMsg.includes('expired') ||
            errorMsg.includes('no longer available') ||
            errorMsg.includes('bad request') ||
            errorString.includes('expired') ||
            errorString.includes('bad request')) {
          this.logger.error(`❌ Booking failed because flight wasn't selected by this user. BookingId: ${bookingId}`);
          throw new BadRequestException(
            'Your flight selection has expired. Please search for flights again and complete the booking promptly.'
          );
        }

   
        if ((errorStatus === 500 || errorStatus === 0 || errorStatus === 502 || errorStatus === 503) && attempt < this.MAX_RETRIES) {
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

    this.logger.error('❌ All booking retry attempts failed');
    throw new HttpException(
      'Failed to book flight after multiple attempts. Please try again.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private extractPnr(bookResponse: any): string {
    return bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrReferenceNumber || 
           bookResponse.FlightBookingResult?.PnReferenceNumber ||
           'PENDING_ISSUE';
  }

  private extractFlightCombination(bookResponse: any): any {
    const combo = bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.FlightSummaryModel?.FlightCombination;
    if (!combo) {
      throw new Error('Flight booking failed: Invalid response from Wakanow (missing FlightCombination)');
    }
    return combo;
  }

  private async calculatePrices(
    price: any,
    productType: ProductType,
    isDomestic: boolean,
    priceBreakdown: any
  ): Promise<{
    basePrice: number;
    markupAmount: number;
    markupPercentage: number;
    serviceFee: number;
    serviceFeePercentage: number;
    totalAmount: number;
    currency: string;
    breakdown: string;
    taxPercentage: number;
    taxes: number;
  }> {

    if (priceBreakdown && priceBreakdown.totalAmount > 0) {
      const markupPct = priceBreakdown.markupPercentage || this.DEFAULT_MARKUP_PERCENTAGE;
      const servicePct = priceBreakdown.serviceFeePercentage || this.DEFAULT_SERVICE_FEE_PERCENTAGE;
      
      return {
        basePrice: priceBreakdown.basePrice,
        markupAmount: priceBreakdown.markupAmount,
        markupPercentage: markupPct,
        serviceFee: priceBreakdown.serviceFee,
        serviceFeePercentage: servicePct,
        totalAmount: priceBreakdown.totalAmount,
        currency: priceBreakdown.currency || price.CurrencyCode || 'NGN',
        taxPercentage: priceBreakdown.taxPercentage || markupPct + servicePct,
        taxes: priceBreakdown.taxes || priceBreakdown.markupAmount + priceBreakdown.serviceFee,
        breakdown: `${priceBreakdown.basePrice} + ${priceBreakdown.markupAmount} (${markupPct}% markup) + ${priceBreakdown.serviceFee} (${servicePct}% service fee) = ${priceBreakdown.totalAmount}`,
      };
    }


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
        
        const markupPct = markupConfig.markupPercentage || this.DEFAULT_MARKUP_PERCENTAGE;
        const servicePct = result.serviceFeePercentage || this.DEFAULT_SERVICE_FEE_PERCENTAGE;
        
        return {
          basePrice: price.Amount,
          markupAmount: result.markupAmount,
          markupPercentage: markupPct,
          serviceFee: result.serviceFee,
          serviceFeePercentage: servicePct,
          totalAmount: result.totalAmount,
          currency: price.CurrencyCode,
          taxPercentage: markupPct + servicePct,
          taxes: result.markupAmount + result.serviceFee,
          breakdown: `${price.Amount} + ${result.markupAmount} (${markupPct}% markup) + ${result.serviceFee} (${servicePct}% service fee) = ${result.totalAmount}`,
        };
      }
    } catch (error) {
      this.logger.warn('Failed to fetch markup config, using defaults:', error);
    }


    const defaultMarkupPct = isDomestic ? 10 : 15;
    const defaultServicePct = this.DEFAULT_SERVICE_FEE_PERCENTAGE;
    const markupAmt = (price.Amount * defaultMarkupPct) / 100;
    const serviceFeeAmt = (price.Amount * defaultServicePct) / 100;
    const total = price.Amount + markupAmt + serviceFeeAmt;

    return {
      basePrice: price.Amount,
      markupAmount: markupAmt,
      markupPercentage: defaultMarkupPct,
      serviceFee: serviceFeeAmt,
      serviceFeePercentage: defaultServicePct,
      totalAmount: total,
      currency: price.CurrencyCode || 'NGN',
      taxPercentage: defaultMarkupPct + defaultServicePct,
      taxes: markupAmt + serviceFeeAmt,
      breakdown: `${price.Amount} + ${markupAmt} (${defaultMarkupPct}% markup) + ${serviceFeeAmt} (${defaultServicePct}% service fee) = ${total}`,
    };
  }

  private async createLocalBooking(
    bookResponse: any,
    pnr: string,
    combo: any,
    prices: any,
    passengers: any[],
    userId: string,
    selectData: string,
    targetCurrency: string,
    productType: ProductType
  ): Promise<any> {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    const reference = `EBT-${dateStr}-${random}`;
  
    // ✅ Ensure passengerInfo has email properly formatted
    const formattedPassengers = passengers.map((p: any) => ({
      firstName: p.firstName || p.given_name || 'Guest',
      lastName: p.lastName || p.family_name || 'User',
      email: p.email || p.Email || 'guest@example.com',
      phone: p.phoneNumber || p.phone || p.phone_number || '+2340000000000',
      title: p.title || 'Mr',
      gender: p.gender || 'Male',
      dateOfBirth: p.dateOfBirth || p.born_on || '1990-01-01',
      passengerType: p.passengerType || 'Adult',
    }));
  
    // ✅ Get the first passenger's email for bookingData
    const firstPassengerEmail = formattedPassengers[0]?.email || 'guest@example.com';
  
    const bookingData = {
      wakanowBookingId: bookResponse.BookingId,
      pnrReferenceNumber: pnr,
      selectData,
      flightSummary: combo,
      targetCurrency,
      ticketStatus: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.TicketStatus || 'PENDING',
      pnrStatus: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrStatus || 'PENDING',
      // ✅ Store email in bookingData
      passengerEmail: firstPassengerEmail,
      priceBreakdown: {
        basePrice: prices.basePrice,
        markupAmount: prices.markupAmount,
        markupPercentage: prices.markupPercentage,
        serviceFee: prices.serviceFee,
        serviceFeePercentage: prices.serviceFeePercentage,
        taxPercentage: prices.taxPercentage,
        taxes: prices.taxes,
        totalAmount: prices.totalAmount,
        currency: prices.currency,
        breakdown: prices.breakdown,
      },
    };
  
    return await this.bookingRepository.create({
      reference,
      userId,
      productType,
      status: BookingStatus.PAYMENT_PENDING,
      provider: Provider.WAKANOW,
      providerBookingId: bookResponse.BookingId,
      providerData: bookResponse as any,
      basePrice: prices.basePrice,
      markupAmount: prices.markupAmount,
      serviceFee: prices.serviceFee,
      totalAmount: prices.totalAmount,
      currency: prices.currency,
      bookingData: bookingData,
      passengerInfo: formattedPassengers, 
      paymentStatus: PaymentStatus.PENDING,
    });
  }

  private buildSuccessResponse(
    booking: any,
    bookResponse: any,
    pnr: string,
    combo: any,
    passengers: any[],
    prices: any,
    firstDep: string,
    firstArr: string
  ): any {
    return {
      ...booking,
      wakanow_booking_id: bookResponse.BookingId,
      pnr_reference: pnr,
      pnr_date: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.PnrDate,
      flight_summary: combo,
      passengers: bookResponse.FlightBookingResult?.FlightBookingSummaryModel?.TravellerDetails,
      message: 'Flight booked successfully. Please proceed to payment to issue tickets.',
      requiresPayment: true,
      paymentStatus: PaymentStatus.PENDING,
      localBookingId: booking.id,
      paymentInstructions: {
        url: `/api/v1/payments/initiate?bookingId=${booking.id}`,
        amount: prices.totalAmount,
        currency: prices.currency,
        reference: booking.reference,
        description: `Flight booking ${booking.reference} - ${firstDep} to ${firstArr}`,
        passengerCount: passengers.length,
      },
      priceBreakdown: {
        basePrice: prices.basePrice,
        markupAmount: prices.markupAmount,
        markupPercentage: prices.markupPercentage,
        serviceFee: prices.serviceFee,
        serviceFeePercentage: prices.serviceFeePercentage,
        taxes: prices.taxes,
        taxPercentage: prices.taxPercentage,
        totalAmount: prices.totalAmount,
        currency: prices.currency,
        breakdown: prices.breakdown,
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