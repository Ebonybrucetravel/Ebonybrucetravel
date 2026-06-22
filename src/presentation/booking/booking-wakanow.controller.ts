// src/presentation/booking/booking-wakanow.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
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

  constructor(
    private readonly searchWakanowFlightsUseCase: SearchWakanowFlightsUseCase,
    private readonly selectWakanowFlightUseCase: SelectWakanowFlightUseCase,
    private readonly bookWakanowFlightUseCase: BookWakanowFlightUseCase,
    private readonly bookWakanowFlightGuestUseCase: BookWakanowFlightGuestUseCase,
    private readonly ticketWakanowFlightUseCase: TicketWakanowFlightUseCase,
    private readonly wakanowService: WakanowService,
  ) {}

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
    
    try {
      // Validate selectData
      if (!selectDto.selectData || selectDto.selectData.length < 10) {
        throw new BadRequestException('Invalid or expired flight selection. Please search again.');
      }

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
    
    try {
      // Validate required fields
      if (!bookDto.selectData) {
        throw new BadRequestException('SelectData is required');
      }
      if (!bookDto.bookingId) {
        throw new BadRequestException('BookingId is required');
      }
      if (!bookDto.passengers || bookDto.passengers.length === 0) {
        throw new BadRequestException('At least one passenger is required');
      }

      // Log price breakdown if provided
      if (bookDto.priceBreakdown) {
        this.logger.log(`💰 Booking with price breakdown: ${JSON.stringify(bookDto.priceBreakdown)}`);
      } else {
        this.logger.warn('⚠️ No price breakdown provided in booking request');
      }

      const result = await this.bookWakanowFlightUseCase.execute(bookDto, userId);
      
      this.logger.log(`Booking successful for user ${userId}: ${result.bookingId}`);
      
      return {
        success: true,
        data: result,
        message: 'Flight booked successfully. Please proceed to payment.',
      };
    } catch (error: any) {
      this.logger.error(`Booking failed for user ${userId}: ${error.message}`);
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
    
    try {
      // Validate required fields
      if (!bookDto.selectData) {
        throw new BadRequestException('SelectData is required');
      }
      if (!bookDto.bookingId) {
        throw new BadRequestException('BookingId is required');
      }
      if (!bookDto.passengers || bookDto.passengers.length === 0) {
        throw new BadRequestException('At least one passenger is required');
      }

      // Log price breakdown if provided
      if (bookDto.priceBreakdown) {
        this.logger.log(`💰 Guest booking with price breakdown: ${JSON.stringify(bookDto.priceBreakdown)}`);
      } else {
        this.logger.warn('⚠️ No price breakdown provided in guest booking request');
      }

      const result = await this.bookWakanowFlightGuestUseCase.execute(bookDto);
      
      this.logger.log(`Guest booking successful: ${result.bookingId}`);
      
      return {
        success: true,
        data: result,
        message: 'Guest flight booked. Proceed to payment.',
      };
    } catch (error: any) {
      this.logger.error(`Guest booking failed: ${error.message}`);
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('ticket')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Issue ticket for a Wakanow booking (Admin only)',
    description:
      'Issues airline tickets for a booked PNR after payment confirmation. ' +
      'This deducts from the Wakanow wallet. Only admins can trigger ticketing.',
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

  // ✅ Health check endpoint
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