import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  HttpException,
  BadRequestException,
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
    try {
      const results = await this.searchWakanowFlightsUseCase.execute(searchDto);
      return {
        success: true,
        data: results,
        message: results.total_offers > 0
          ? `Found ${results.total_offers} flight offers`
          : 'No flights found for the selected route and dates',
      };
    } catch (error: any) {
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
  @ApiOperation({
    summary: 'Select/confirm a Wakanow flight offer (no authentication required)',
    description:
      'Pass the SelectData from a search result to get confirmed pricing. ' +
      'Returns a BookingId and new SelectData (different from search) needed for booking. ' +
      'The price may differ from the search result — this is the confirmed price.',
  })
  @ApiResponse({ status: 200, description: 'Flight pricing confirmed' })
  @ApiResponse({ status: 410, description: 'Flight no longer available' })
  async selectFlight(@Body() selectDto: SelectWakanowFlightDto) {
    try {
      const result = await this.selectWakanowFlightUseCase.execute(selectDto);
      return {
        success: true,
        data: result,
        message: 'Flight pricing confirmed. Use the returned selectData and bookingId to book.',
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: 'Failed to confirm flight pricing. Please search again.',
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
    try {
      const result = await this.bookWakanowFlightUseCase.execute(bookDto, req.user.id);
      return {
        success: true,
        data: result,
        message: 'Flight booked successfully. Please proceed to payment.',
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
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
  @ApiOperation({
    summary: 'Book a Wakanow flight (guest, no authentication)',
    description:
      'Books a flight as a guest user. A guest account is created using the lead passenger email. ' +
      'After payment, call the ticket endpoint to issue tickets.',
  })
  @ApiResponse({ status: 201, description: 'Guest flight booked. Proceed to payment.' })
  @ApiResponse({ status: 400, description: 'Invalid booking data' })
  async bookFlightGuest(@Body() bookDto: BookWakanowFlightDto) {
    try {
      const result = await this.bookWakanowFlightGuestUseCase.execute(bookDto);
      return {
        success: true,
        data: result,
        message: 'Guest flight booked. Proceed to payment.',
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
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
    try {
      const result = await this.ticketWakanowFlightUseCase.execute(ticketDto, ticketDto.localBookingId);
      return {
        success: true,
        data: result,
        message: 'Ticket issued successfully',
      };
    } catch (error: any) {
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
      } else {
        const cap = limit ? parseInt(limit, 10) : 100;
        results = all.slice(0, Number.isFinite(cap) && cap > 0 ? cap : 100);
      }
      return {
        success: true,
        data: results,
        total: results.length,
        message: 'Airports retrieved successfully',
      };
    } catch (error: any) {
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
    try {
      const balance = await this.wakanowService.getWalletBalance();
      return {
        success: true,
        data: balance,
        message: 'Wallet balance retrieved successfully',
      };
    } catch (error: any) {
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
}
