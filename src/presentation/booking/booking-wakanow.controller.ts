import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  HttpException,
  BadRequestException,
  GoneException,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Throttle } from '@common/decorators/throttle.decorator';
import { SearchWakanowFlightsUseCase } from '@application/booking/use-cases/search-wakanow-flights.use-case';
import { SelectWakanowFlightUseCase } from '@application/booking/use-cases/select-wakanow-flight.use-case';
import { BookWakanowFlightUseCase } from '@application/booking/use-cases/book-wakanow-flight.use-case';
import { BookWakanowFlightGuestUseCase } from '@application/booking/use-cases/book-wakanow-flight-guest.use-case';
import { TicketWakanowFlightUseCase } from '@application/booking/use-cases/ticket-wakanow-flight.use-case';
import { ConfirmWakanowPaymentUseCase } from '@application/booking/use-cases/confirm-wakanow-payment.use-case';
import { TicketWakanowBookingUseCase } from '@application/booking/use-cases/ticket-wakanow-booking.use-case';
import { GetWakanowBookingStatusUseCase } from '@application/booking/use-cases/get-wakanow-booking-status.use-case';
import { WakanowService } from '@infrastructure/external-apis/wakanow/wakanow.service';
import {
  SearchWakanowFlightsDto,
  SelectWakanowFlightDto,
  BookWakanowFlightDto,
  TicketWakanowFlightDto,
} from './dto/wakanow-flights.dto';

@ApiTags('Wakanow Flights')
@Controller('bookings/wakanow')
export class BookingWakanowController {
  private readonly logger = new Logger(BookingWakanowController.name);
  private readonly VALID_SELECT_DATA_MAX_LENGTH = 500;
  private readonly INVALID_SELECT_DATA_PREFIXES = ['7h4AAB+LCAAAAAAABAD', 'H4sI'];

  constructor(
    private readonly searchWakanowFlightsUseCase: SearchWakanowFlightsUseCase,
    private readonly selectWakanowFlightUseCase: SelectWakanowFlightUseCase,
    private readonly bookWakanowFlightUseCase: BookWakanowFlightUseCase,
    private readonly bookWakanowFlightGuestUseCase: BookWakanowFlightGuestUseCase,
    private readonly ticketWakanowFlightUseCase: TicketWakanowFlightUseCase,
    private readonly confirmWakanowPaymentUseCase: ConfirmWakanowPaymentUseCase,
    private readonly ticketWakanowBookingUseCase: TicketWakanowBookingUseCase,
    private readonly getWakanowBookingStatusUseCase: GetWakanowBookingStatusUseCase,
    private readonly wakanowService: WakanowService,
  ) {}

  /**
   * ✅ Validate SelectData format
   */
  private validateSelectData(selectData: string): void {
    if (!selectData || selectData.length < 10) {
      throw new BadRequestException('Invalid or expired flight selection. Please search again.');
    }

    // ✅ Check if SelectData is too long (gzip compressed data)
    if (selectData.length > this.VALID_SELECT_DATA_MAX_LENGTH) {
      this.logger.warn(`⚠️ SelectData too long: ${selectData.length} chars`);
      throw new BadRequestException('Your flight selection has expired or is invalid. Please search again.');
    }

    // ✅ Check for invalid prefixes (gzip compressed data)
    const isInvalidFormat = this.INVALID_SELECT_DATA_PREFIXES.some(prefix => 
      selectData.startsWith(prefix)
    );
    if (isInvalidFormat) {
      this.logger.warn(`⚠️ SelectData appears to be in invalid format (gzip compressed)`);
      throw new BadRequestException('Your flight selection has expired or is invalid. Please search again.');
    }
  }

  // ============================================================
  // 1. SEARCH FLIGHTS (Public)
  // ============================================================
  @Public()
  @Post('search')
  @Throttle(20, 60000)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Search flights via Wakanow (no authentication required)',
    description:
      'Search for flights using the Wakanow API. Supports Oneway, Return, and Multidestination flights. ' +
      'Returns a list of flight offers with pricing, airline details, and SelectData needed for the next step.',
  })
  @ApiResponse({ status: 200, description: 'Flight search results from Wakanow' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 503, description: 'Wakanow API unavailable' })
  async searchFlights(@Body() searchDto: SearchWakanowFlightsDto) {
    this.logger.log(`Searching flights: ${searchDto.itineraries?.length || 0} itinerary(s)`);
    
    try {
      const results = await this.searchWakanowFlightsUseCase.execute(searchDto);
      
      this.logger.log(`Found ${results.total_offers || 0} flight offers`);
      
      return {
        success: true,
        data: results,
        message: results.total_offers > 0
          ? `Found ${results.total_offers} flight offers`
          : 'No flights found for the selected route and dates',
      };
    } catch (error: any) {
      this.logger.error(`Search failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Unable to search flights at this time. Please try again.',
          error: 'Search failed',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 2. SELECT FLIGHT (Public)
  // ============================================================
  @Public()
  @Post('select')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Select/confirm a Wakanow flight offer (no authentication required)',
    description:
      'Pass the SelectData from a search result to get confirmed pricing. ' +
      'Returns a BookingId and new SelectData (different from search) needed for booking. ' +
      'The price may differ from the search result — this is the confirmed price.',
  })
  @ApiResponse({ status: 200, description: 'Flight pricing confirmed' })
  @ApiResponse({ status: 410, description: 'Flight no longer available or expired' })
  async selectFlight(@Body() selectDto: SelectWakanowFlightDto) {
    this.logger.log('Processing flight selection');
    this.logger.log(`SelectData length: ${selectDto.selectData?.length || 0}`);
    
    try {
      // ✅ Validate selectData
      this.validateSelectData(selectDto.selectData);

      const result = await this.selectWakanowFlightUseCase.execute(selectDto);
      
      // Check if result has the expected data
      if (!result || !result.selectData) {
        throw new GoneException('Selected flight is no longer available. Please search again.');
      }

      this.logger.log(`Flight selected successfully. Booking ID: ${result.bookingId}`);
      
      // Return in the format your frontend expects with price breakdown
      return {
        success: true,
        data: {
          provider: 'WAKANOW',
          booking_id: result.bookingId || null,
          select_data: result.selectData,
          is_price_matched: result.isPriceMatched || false,
          is_passport_required: result.isPassportRequired || false,
          
          // Price breakdown from select
          priceBreakdown: result.priceBreakdown || null,
          basePrice: result.basePrice || null,
          markupAmount: result.markupAmount || null,
          markupPercentage: result.markupPercentage || null,
          serviceFee: result.serviceFee || null,
          serviceFeePercentage: result.serviceFeePercentage || null,
          taxes: result.taxes || null,
          taxPercentage: result.taxPercentage || null,
          totalAmount: result.totalAmount || null,
          currency: result.currency || 'NGN',
          
          flight_summary: result.flightSummary || null,
          fare_rules: result.fareRules || [],
          penalty_rules: result.penaltyRules || null,
          terms_and_conditions: result.termsAndConditions || {
            TermsAndConditions: [],
            TermsAndConditionImportantNotice: '',
          },
          custom_messages: result.customMessages || [],
          message: result.message || 'Flight pricing confirmed',
        },
        message: 'Flight pricing confirmed. Use the returned selectData and bookingId to book.',
      };
    } catch (error: any) {
      this.logger.error(`Selection failed: ${error.message}`);
      
      // ✅ If it's a BadRequestException with expired message, return 410 Gone
      if (error instanceof BadRequestException) {
        const msg = error.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid') || msg.includes('search again')) {
          throw new GoneException(error.message);
        }
        throw error;
      }
      
      if (error instanceof HttpException) throw error;
      
      // Check for specific error messages
      const errorMsg = error?.message?.toLowerCase() || '';
      if (
        errorMsg.includes('expired') || 
        errorMsg.includes('no longer available') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('invalid') ||
        errorMsg.includes('selection_expired')
      ) {
        throw new GoneException('Your flight selection has expired. Please search again.');
      }
      
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to confirm flight pricing. Please search again.',
          error: 'Select failed',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 3. BOOK FLIGHT (Authenticated)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Post('book')
  @ApiBearerAuth()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Book a Wakanow flight (authenticated user)',
    description:
      'Books a flight with passenger details. Requires the BookingId and SelectData from the select step. ' +
      'Creates a local booking with PAYMENT_PENDING status. After payment, call the ticket endpoint to issue tickets.',
  })
  @ApiResponse({ status: 201, description: 'Flight booked. Proceed to payment.' })
  @ApiResponse({ status: 400, description: 'Invalid booking data' })
  @ApiResponse({ status: 409, description: 'Fare no longer available' })
  async bookFlight(@Body() bookDto: BookWakanowFlightDto, @Request() req: any) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} booking flight with ${bookDto.passengers?.length || 0} passengers`);
    this.logger.log(`SelectData length: ${bookDto.selectData?.length || 0}`);
    
    try {
      // ✅ Validate required fields
      if (!bookDto.selectData) {
        throw new BadRequestException('SelectData is required');
      }
      if (!bookDto.bookingId) {
        throw new BadRequestException('BookingId is required');
      }
      if (!bookDto.passengers || bookDto.passengers.length === 0) {
        throw new BadRequestException('At least one passenger is required');
      }

      // ✅ Validate SelectData format
      this.validateSelectData(bookDto.selectData);

      // Log price breakdown if provided
      if (bookDto.priceBreakdown) {
        this.logger.log(`💰 Booking with price breakdown: ${JSON.stringify(bookDto.priceBreakdown)}`);
      } else {
        this.logger.warn('⚠️ No price breakdown provided in booking request');
      }

      const result = await this.bookWakanowFlightUseCase.execute(bookDto, userId);
      
      this.logger.log(`Booking successful for user ${userId}: ${result.id}`);
      
      return {
        success: true,
        data: result,
        message: 'Flight booked successfully. Please proceed to payment.',
      };
    } catch (error: any) {
      this.logger.error(`Booking failed for user ${userId}: ${error.message}`);
      
      // ✅ If it's a BadRequestException with expired message, return 410 Gone
      if (error instanceof BadRequestException) {
        const msg = error.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid') || msg.includes('search again')) {
          throw new GoneException(error.message);
        }
        throw error;
      }
      
      if (error instanceof HttpException) throw error;
      
      // Check for specific error messages
      const errorMsg = error?.message?.toLowerCase() || '';
      if (errorMsg.includes('expired') || errorMsg.includes('no longer available')) {
        throw new HttpException(
          {
            success: false,
            message: 'Your booking session has expired. Please search again.',
            error: 'Session expired',
          },
          HttpStatus.GONE,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to book flight',
          error: 'Booking failed',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ============================================================
  // 4. BOOK FLIGHT (Guest)
  // ============================================================
  @Public()
  @Post('book/guest')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Book a Wakanow flight (guest, no authentication)',
    description:
      'Books a flight as a guest user. A guest account is created using the lead passenger email. ' +
      'After payment, call the ticket endpoint to issue tickets.',
  })
  @ApiResponse({ status: 201, description: 'Guest flight booked. Proceed to payment.' })
  @ApiResponse({ status: 400, description: 'Invalid booking data' })
  async bookFlightGuest(@Body() bookDto: BookWakanowFlightDto) {
    this.logger.log(`Guest booking with ${bookDto.passengers?.length || 0} passengers`);
    this.logger.log(`SelectData length: ${bookDto.selectData?.length || 0}`);
    
    try {
      // ✅ Validate required fields
      if (!bookDto.selectData) {
        throw new BadRequestException('SelectData is required');
      }
      if (!bookDto.bookingId) {
        throw new BadRequestException('BookingId is required');
      }
      if (!bookDto.passengers || bookDto.passengers.length === 0) {
        throw new BadRequestException('At least one passenger is required');
      }

      // ✅ Validate SelectData format
      this.validateSelectData(bookDto.selectData);

      // Log price breakdown if provided
      if (bookDto.priceBreakdown) {
        this.logger.log(`💰 Guest booking with price breakdown: ${JSON.stringify(bookDto.priceBreakdown)}`);
      } else {
        this.logger.warn('⚠️ No price breakdown provided in guest booking request');
      }

      const result = await this.bookWakanowFlightGuestUseCase.execute(bookDto);
      
      this.logger.log(`Guest booking successful: ${result.id}`);
      
      return {
        success: true,
        data: result,
        message: 'Guest flight booked. Proceed to payment.',
      };
    } catch (error: any) {
      this.logger.error(`Guest booking failed: ${error.message}`);
      
      // ✅ If it's a BadRequestException with expired message, return 410 Gone
      if (error instanceof BadRequestException) {
        const msg = error.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid') || msg.includes('search again')) {
          throw new GoneException(error.message);
        }
        throw error;
      }
      
      if (error instanceof HttpException) throw error;
      
      const errorMsg = error?.message?.toLowerCase() || '';
      if (errorMsg.includes('expired') || errorMsg.includes('no longer available')) {
        throw new HttpException(
          {
            success: false,
            message: 'Your booking session has expired. Please search again.',
            error: 'Session expired',
          },
          HttpStatus.GONE,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to book flight',
          error: 'Booking failed',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ============================================================
  // 5. CONFIRM PAYMENT (NEW)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Post('confirm-payment')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Confirm payment for a Wakanow booking',
    description:
      'Call this endpoint after the user has completed payment. ' +
      'Updates the booking payment status to COMPLETED. ' +
      'After this, call the ticket endpoint to issue the actual airline ticket.',
  })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Invalid payment data or booking state' })
  async confirmPayment(
    @Body('bookingId') bookingId: string,
    @Body('paymentReference') paymentReference: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} confirming payment for booking: ${bookingId}`);

    if (!bookingId) {
      throw new BadRequestException('Booking ID is required');
    }
    if (!paymentReference) {
      throw new BadRequestException('Payment reference is required');
    }

    try {
      const result = await this.confirmWakanowPaymentUseCase.execute(bookingId, paymentReference);
      
      this.logger.log(`✅ Payment confirmed for booking ${bookingId} by user ${userId}`);
      
      return {
        success: true,
        data: result,
        message: 'Payment confirmed successfully. Please issue your ticket.',
        nextStep: {
          action: 'Issue Ticket',
          endpoint: `POST /api/v1/bookings/wakanow/ticket/${bookingId}`,
          description: 'Call the ticket endpoint to issue the airline ticket',
        },
      };
    } catch (error: any) {
      this.logger.error(`Payment confirmation failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to confirm payment',
          error: 'Payment confirmation failed',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ============================================================
  // 6. ISSUE TICKET (by local booking ID) (NEW)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Post('ticket/:localBookingId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue ticket for a Wakanow booking (by local booking ID)',
    description:
      'Issues the airline ticket after payment has been confirmed. ' +
      'Requires that paymentStatus is COMPLETED. ' +
      'Updates the booking status to CONFIRMED and returns ticket details.',
  })
  @ApiResponse({ status: 200, description: 'Ticket issued successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Cannot issue ticket (payment not completed or already ticketed)' })
  @ApiResponse({ status: 402, description: 'Insufficient Wakanow wallet balance' })
  async issueTicketByLocalId(
    @Param('localBookingId') localBookingId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} issuing ticket for booking: ${localBookingId}`);

    if (!localBookingId) {
      throw new BadRequestException('Booking ID is required');
    }

    try {
      const result = await this.ticketWakanowBookingUseCase.execute(localBookingId);
      
      this.logger.log(`✅ Ticket issued for booking ${localBookingId} by user ${userId}`);
      
      return {
        success: true,
        data: result,
        message: result.message || 'Ticket issued successfully',
      };
    } catch (error: any) {
      this.logger.error(`Ticket issuance failed: ${error.message}`);
      
      // Handle specific errors
      if (error.message?.includes('Payment must be completed')) {
        throw new HttpException(
          {
            success: false,
            message: 'Payment must be completed before issuing ticket.',
            error: 'Payment required',
            nextStep: {
              action: 'Complete Payment',
              endpoint: `POST /api/v1/bookings/wakanow/confirm-payment`,
              body: { bookingId: localBookingId, paymentReference: 'YOUR_PAYMENT_REF' },
            },
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      
      if (error.message?.includes('already confirmed') || error.message?.includes('already issued')) {
        throw new HttpException(
          {
            success: false,
            message: 'Ticket already issued for this booking.',
            error: 'Already ticketed',
            data: error.data || null,
          },
          HttpStatus.CONFLICT,
        );
      }
      
      if (error.message?.includes('Insufficient') || error.message?.includes('credit limit')) {
        throw new HttpException(
          {
            success: false,
            message: 'Insufficient Wakanow wallet balance to issue ticket.',
            error: 'Insufficient balance',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      
      if (error instanceof HttpException) throw error;
      
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to issue ticket',
          error: 'Ticketing failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 7. LEGACY TICKET (Admin only) - Keep for backward compatibility
  // ============================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('ticket')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Issue ticket for a Wakanow booking (Admin only)',
    description:
      'Legacy endpoint: Issues airline tickets for a booked PNR after payment confirmation. ' +
      'Only admins can trigger ticketing. Use /ticket/:localBookingId for user-facing flow.',
  })
  @ApiResponse({ status: 200, description: 'Ticket issued successfully' })
  @ApiResponse({ status: 402, description: 'Insufficient Wakanow wallet balance' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async ticketFlight(@Body() ticketDto: TicketWakanowFlightDto) {
    this.logger.log(`Processing ticket for booking: ${ticketDto.bookingId}`);
    
    try {
      // Validate required fields
      if (!ticketDto.bookingId) {
        throw new BadRequestException('bookingId is required');
      }
      if (!ticketDto.pnrNumber) {
        throw new BadRequestException('PNR number is required');
      }

      const result = await this.ticketWakanowFlightUseCase.execute(
        ticketDto, 
        ticketDto.localBookingId
      );
      
      this.logger.log(`Ticket issued successfully for booking: ${ticketDto.bookingId}`);
      
      return {
        success: true,
        data: result,
        message: 'Ticket issued successfully',
      };
    } catch (error: any) {
      this.logger.error(`Ticketing failed for booking ${ticketDto.bookingId}: ${error.message}`);
      if (error instanceof HttpException) throw error;
      
      // Check for specific error messages
      const errorMsg = error?.message?.toLowerCase() || '';
      if (errorMsg.includes('insufficient') || errorMsg.includes('credit limit')) {
        throw new HttpException(
          {
            success: false,
            message: 'Insufficient wallet balance to issue ticket.',
            error: 'Insufficient balance',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      
      if (errorMsg.includes('not found')) {
        throw new HttpException(
          {
            success: false,
            message: 'Booking not found. Please check the booking ID.',
            error: 'Booking not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to issue ticket',
          error: 'Ticketing failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 8. GET BOOKING STATUS (NEW)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Get('status/:localBookingId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Wakanow booking status with next steps',
    description:
      'Returns the current status of a Wakanow booking including payment status, ' +
      'ticket status, and suggested next actions (pay, ticket, view ticket).',
  })
  @ApiResponse({ status: 200, description: 'Booking status retrieved' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingStatus(
    @Param('localBookingId') localBookingId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} checking status for booking: ${localBookingId}`);

    if (!localBookingId) {
      throw new BadRequestException('Booking ID is required');
    }

    try {
      const result = await this.getWakanowBookingStatusUseCase.execute(localBookingId);
      
      return {
        success: true,
        data: result,
        message: 'Booking status retrieved successfully',
      };
    } catch (error: any) {
      this.logger.error(`Status check failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to get booking status',
          error: 'Status check failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 9. COMPLETE BOOKING (Pay + Ticket in one call) (NEW)
  // ============================================================
  @UseGuards(JwtAuthGuard)
  @Post('complete/:localBookingId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete a Wakanow booking (payment + ticket in one call)',
    description:
      'This is a convenience endpoint that handles both payment confirmation and ticket issuance in one call. ' +
      'Requires a payment reference. If payment is already confirmed, it will just issue the ticket.',
  })
  @ApiResponse({ status: 200, description: 'Booking completed successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 400, description: 'Cannot complete booking' })
  @ApiResponse({ status: 402, description: 'Insufficient balance' })
  async completeBooking(
    @Param('localBookingId') localBookingId: string,
    @Body('paymentReference') paymentReference: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} completing booking: ${localBookingId}`);

    if (!localBookingId) {
      throw new BadRequestException('Booking ID is required');
    }
    if (!paymentReference) {
      throw new BadRequestException('Payment reference is required');
    }

    try {
      // 1. Confirm payment first
      this.logger.log(`Step 1: Confirming payment for booking ${localBookingId}`);
      const paymentResult = await this.confirmWakanowPaymentUseCase.execute(
        localBookingId,
        paymentReference,
      );

      // 2. Then issue ticket
      this.logger.log(`Step 2: Issuing ticket for booking ${localBookingId}`);
      const ticketResult = await this.ticketWakanowBookingUseCase.execute(localBookingId);

      this.logger.log(`✅ Booking ${localBookingId} completed by user ${userId}`);

      return {
        success: true,
        data: {
          booking: ticketResult,
          payment: paymentResult,
        },
        message: 'Booking completed successfully. Tickets have been issued.',
        nextStep: {
          action: 'View E-Ticket',
          description: 'Check your email for the e-ticket or view it in your account.',
        },
      };
    } catch (error: any) {
      this.logger.error(`Booking completion failed: ${error.message}`);
      
      // If payment failed, provide guidance
      if (error.message?.includes('Payment') || error.message?.includes('payment')) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
            error: 'Payment failed',
            nextStep: {
              action: 'Retry Payment',
              description: 'Please try the payment again or use a different payment method.',
            },
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      
      if (error instanceof HttpException) throw error;
      
      throw new HttpException(
        {
          success: false,
          message: error?.message || 'Failed to complete booking',
          error: 'Completion failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 10. AIRPORTS (Public)
  // ============================================================
  @Public()
  @Get('airports')
  @ApiOperation({
    summary: 'Get Wakanow airport list (no authentication required)',
    description:
      'Returns airports from the Wakanow system. Use ?query= to filter by airport code, name, city, or country. ' +
      'Results are cached in memory. Without a query, returns the first 100 results.',
  })
  @ApiResponse({ status: 200, description: 'Airport list retrieved' })
  async getAirports(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Fetching airports with query: ${query || 'all'}`);
    
    try {
      const all = await this.wakanowService.getAirports();
      let results = all;
      
      if (query && query.trim().length > 0) {
        const q = query.trim().toLowerCase();
        results = all.filter(
          (a) =>
            a.AirportCode?.toLowerCase().includes(q) ||
            a.AirportName?.toLowerCase().includes(q) ||
            a.City?.toLowerCase().includes(q) ||
            a.CityCountry?.toLowerCase().includes(q) ||
            a.Country?.toLowerCase().includes(q),
        );
        this.logger.log(`Found ${results.length} airports matching query: ${query}`);
      } else {
        const cap = limit ? parseInt(limit, 10) : 100;
        results = all.slice(0, Number.isFinite(cap) && cap > 0 ? cap : 100);
        this.logger.log(`Returning ${results.length} airports (limit: ${cap})`);
      }
      
      return {
        success: true,
        data: results,
        total: results.length,
        message: 'Airports retrieved successfully',
      };
    } catch (error: any) {
      this.logger.error(`Airport fetch failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Unable to fetch airport list',
          error: 'Airports fetch failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ============================================================
  // 11. WALLET BALANCE (Admin only)
  // ============================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('wallet-balance')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check Wakanow wallet balance (Admin only)',
    description: 'Returns the current wallet balance for the Wakanow affiliate account.',
  })
  @ApiResponse({ status: 200, description: 'Wallet balance retrieved' })
  async getWalletBalance() {
    this.logger.log('Checking Wakanow wallet balance');
    
    try {
      const balance = await this.wakanowService.getWalletBalance();
      this.logger.log(`Wallet balance retrieved: ${balance}`);
      return {
        success: true,
        data: balance,
        message: 'Wallet balance retrieved successfully',
      };
    } catch (error: any) {
      this.logger.error(`Wallet balance check failed: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Unable to check wallet balance',
          error: 'Wallet check failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ============================================================
  // 12. HEALTH CHECK (Public)
  // ============================================================
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Check Wakanow API health',
    description: 'Verifies connectivity to the Wakanow API service.',
  })
  @ApiResponse({ status: 200, description: 'Wakanow API is healthy' })
  @ApiResponse({ status: 503, description: 'Wakanow API is unavailable' })
  async healthCheck() {
    this.logger.log('Performing Wakanow API health check');
    
    try {
      const isHealthy = await this.wakanowService.healthCheck();
      
      if (isHealthy) {
        return {
          success: true,
          data: { 
            healthy: true, 
            status: 'operational',
            timestamp: new Date().toISOString(),
          },
          message: 'Wakanow API is healthy',
        };
      } else {
        throw new HttpException(
          {
            success: false,
            data: { 
              healthy: false, 
              status: 'unavailable',
              timestamp: new Date().toISOString(),
            },
            message: 'Wakanow API is unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    } catch (error: any) {
      this.logger.error(`Health check failed: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          data: { 
            healthy: false, 
            status: 'error',
            error: error?.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          },
          message: 'Wakanow API health check failed',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}