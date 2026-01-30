import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CreateBookingUseCase } from '@application/booking/use-cases/create-booking.use-case';
import { CreateGuestBookingUseCase } from '@application/booking/use-cases/create-guest-booking.use-case';
import { SearchFlightsUseCase } from '@application/booking/use-cases/search-flights.use-case';
import { ListOffersUseCase } from '@application/booking/use-cases/list-offers.use-case';
import { CancelDuffelOrderUseCase } from '@application/booking/use-cases/cancel-duffel-order.use-case';
import { HandleDuffelWebhookUseCase } from '@application/booking/use-cases/handle-duffel-webhook.use-case';
import { SearchHotelsUseCase } from '@application/booking/use-cases/search-hotels.use-case';
import { FetchHotelRatesUseCase } from '@application/booking/use-cases/fetch-hotel-rates.use-case';
import { CreateHotelQuoteUseCase } from '@application/booking/use-cases/create-hotel-quote.use-case';
import { CreateHotelBookingUseCase } from '@application/booking/use-cases/create-hotel-booking.use-case';
import { GetHotelBookingUseCase } from '@application/booking/use-cases/get-hotel-booking.use-case';
import { ListHotelBookingsUseCase } from '@application/booking/use-cases/list-hotel-bookings.use-case';
import { CancelHotelBookingUseCase } from '@application/booking/use-cases/cancel-hotel-booking.use-case';
import { GetAccommodationUseCase } from '@application/booking/use-cases/get-accommodation.use-case';
import { SearchAccommodationSuggestionsUseCase } from '@application/booking/use-cases/search-accommodation-suggestions.use-case';
import { GetAccommodationReviewsUseCase } from '@application/booking/use-cases/get-accommodation-reviews.use-case';
import { SearchPlaceSuggestionsUseCase } from '@application/booking/use-cases/search-place-suggestions.use-case';
import { ListAirlinesUseCase } from '@application/booking/use-cases/list-airlines.use-case';
import { BookingService } from '@domains/booking/services/booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { SearchFlightsResponseDto } from './dto/flight-offer-response.dto';
import { PaginationQueryDto, ListOffersQueryDto } from './dto/pagination.dto';
import { SearchHotelsDto } from './dto/search-hotels.dto';
import { CreateHotelQuoteDto } from './dto/create-hotel-quote.dto';
import { CreateHotelBookingDto } from './dto/create-hotel-booking.dto';
import { AccommodationSuggestionsDto } from './dto/accommodation-suggestions.dto';
import { PlaceSuggestionsDto } from './dto/place-suggestions.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly createGuestBookingUseCase: CreateGuestBookingUseCase,
    private readonly searchFlightsUseCase: SearchFlightsUseCase,
    private readonly listOffersUseCase: ListOffersUseCase,
    private readonly cancelDuffelOrderUseCase: CancelDuffelOrderUseCase,
    private readonly handleDuffelWebhookUseCase: HandleDuffelWebhookUseCase,
    private readonly searchHotelsUseCase: SearchHotelsUseCase,
    private readonly fetchHotelRatesUseCase: FetchHotelRatesUseCase,
    private readonly createHotelQuoteUseCase: CreateHotelQuoteUseCase,
    private readonly createHotelBookingUseCase: CreateHotelBookingUseCase,
    private readonly getHotelBookingUseCase: GetHotelBookingUseCase,
    private readonly listHotelBookingsUseCase: ListHotelBookingsUseCase,
    private readonly cancelHotelBookingUseCase: CancelHotelBookingUseCase,
    private readonly getAccommodationUseCase: GetAccommodationUseCase,
    private readonly searchAccommodationSuggestionsUseCase: SearchAccommodationSuggestionsUseCase,
    private readonly getAccommodationReviewsUseCase: GetAccommodationReviewsUseCase,
    private readonly searchPlaceSuggestionsUseCase: SearchPlaceSuggestionsUseCase,
    private readonly listAirlinesUseCase: ListAirlinesUseCase,
    private readonly bookingService: BookingService,
  ) {}

  @Public()
  @Post('search/flights')
  @ApiOperation({
    summary: 'Search for flights (no authentication required)',
    description:
      'Creates an offer request and returns offer_request_id. Use /bookings/offers to paginate offers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Flight search completed - returns offer_request_id for pagination',
    type: SearchFlightsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters or unsupported currency',
  })
  @ApiResponse({
    status: 500,
    description: 'Flight search service temporarily unavailable',
  })
  async searchFlights(@Body() searchFlightsDto: SearchFlightsDto) {
    try {
      // Don't return offers immediately - use pagination endpoint instead
      const results = await this.searchFlightsUseCase.execute(searchFlightsDto, {
        returnOffers: false, // Only return offer_request_id
      });
      return {
        success: true,
        data: results,
        message: 'Flight search completed. Use /bookings/offers endpoint to paginate offers.',
      };
    } catch (error: any) {
      // Re-throw HttpException as-is (already properly formatted)
      if (error instanceof HttpException) {
        throw error;
      }

      // Convert other errors to proper HTTP exceptions
      const errorMessage = error?.message || 'An unexpected error occurred while searching for flights';
      
      // Check for common error patterns
      if (errorMessage.includes('currency') || errorMessage.includes('Currency')) {
        throw new BadRequestException({
          success: false,
          message: errorMessage,
          error: 'Invalid currency',
        });
      }

      if (errorMessage.includes('Duffel') || errorMessage.includes('API')) {
        throw new HttpException(
          {
            success: false,
            message: 'Flight search service is temporarily unavailable. Please try again in a few moments.',
            error: 'Service unavailable',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Generic error
      throw new HttpException(
        {
          success: false,
          message: 'Unable to search flights at this time. Please check your search parameters and try again.',
          error: 'Search failed',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('offers')
  @ApiOperation({
    summary: 'List flight offers with pagination (no authentication required)',
    description: 'Paginate offers for an offer request. Use cursor-based pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated flight offers',
  })
  async listOffers(@Query() query: ListOffersQueryDto) {
    const { offer_request_id, ...pagination } = query;

    if (!offer_request_id) {
      throw new NotFoundException('offer_request_id is required');
    }

    const results = await this.listOffersUseCase.execute(offer_request_id, pagination);
    return {
      success: true,
      data: results.data,
      meta: results.meta,
      message: 'Offers retrieved successfully',
    };
  }

  @Public()
  @Post('guest')
  @ApiOperation({ summary: 'Create a guest booking (no authentication required)' })
  @ApiResponse({ status: 201, description: 'Guest booking created successfully' })
  async createGuest(@Body() createGuestBookingDto: CreateGuestBookingDto) {
    const booking = await this.createGuestBookingUseCase.execute(createGuestBookingDto);
    return {
      success: true,
      data: booking,
      message: 'Guest booking created successfully',
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new booking (authenticated user)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    const booking = await this.createBookingUseCase.execute(createBookingDto, req.user.id);
    return {
      success: true,
      data: booking,
      message: 'Booking created successfully',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async findAll(@Request() req, @Query() query: any) {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (isAdmin) {
      // Admin sees all bookings
      const bookings = await this.bookingService.getUserBookings(''); // Empty to get all
      return {
        success: true,
        data: bookings,
        message: 'Bookings retrieved successfully',
      };
    } else {
      // Customer sees only their bookings
      const bookings = await this.bookingService.getUserBookings(req.user.id);
      return {
        success: true,
        data: bookings,
        message: 'Your bookings retrieved successfully',
      };
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  async findOne(@Param('id') id: string, @Request() req) {
    const booking = await this.bookingService.getBookingById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check access: Admin can see all, customer can only see their own
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isAdmin && booking.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return {
      success: true,
      data: booking,
      message: 'Booking retrieved successfully',
    };
  }

  @Get('reference/:reference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking by reference number' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  async findByReference(@Param('reference') reference: string, @Request() req) {
    const booking = await this.bookingService.getBookingByReference(reference);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check access
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    if (!isAdmin && booking.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return {
      success: true,
      data: booking,
      message: 'Booking retrieved successfully',
    };
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel a Duffel flight booking (Admin Only)',
    description:
      'Only administrators can cancel bookings. Cancellations are restricted within 24 hours of departure and for non-refundable fares.',
  })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Only administrators can cancel bookings' })
  @ApiResponse({
    status: 400,
    description: 'Cancellation not allowed (time restriction or non-refundable fare)',
  })
  async cancel(@Param('id') id: string, @Request() req) {
    const booking = await this.bookingService.getBookingById(id);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only admins can cancel - enforced by @Roles decorator above

    // Only allow cancellation of Duffel flight bookings
    if (booking.provider !== 'DUFFEL') {
      throw new BadRequestException(
        'This endpoint only supports cancellation of Duffel flight bookings.',
      );
    }

    if (
      booking.productType !== 'FLIGHT_INTERNATIONAL' &&
      booking.productType !== 'FLIGHT_DOMESTIC'
    ) {
      throw new BadRequestException('This endpoint only supports cancellation of flight bookings.');
    }

    // Only admins can cancel - pass isAdmin flag
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
    const result = await this.cancelDuffelOrderUseCase.execute(id, req.user.id, isAdmin);

    return {
      success: true,
      data: {
        bookingId: id,
        cancellationId: result.cancellationId,
        refundAmount: result.refundAmount,
        refundTo: result.refundTo,
        hasAirlineCredits: result.hasAirlineCredits,
        airlineCredits: result.airlineCredits,
        message: result.hasAirlineCredits
          ? 'Booking cancelled. The airline has issued travel credits (vouchers) instead of a cash refund. You can use these credits directly with the airline for future bookings.'
          : result.refundTo === 'balance'
            ? 'Booking cancelled. Refund will be processed to your original payment method.'
            : 'Booking cancelled successfully',
      },
      message: 'Booking cancelled successfully',
    };
  }

  // ==================== HOTEL/STAYS ENDPOINTS ====================

  @Public()
  @Post('search/hotels')
  @ApiOperation({ summary: 'Search for hotels/accommodation (no authentication required)' })
  @ApiResponse({ status: 200, description: 'Hotel search results' })
  async searchHotels(@Body() searchDto: SearchHotelsDto) {
    const results = await this.searchHotelsUseCase.execute(searchDto);
    return {
      success: true,
      data: results,
      message: 'Hotels retrieved successfully',
    };
  }

  @Public()
  @Get('hotels/rates/:searchResultId')
  @ApiOperation({ summary: 'Fetch detailed rates for a hotel search result' })
  @ApiResponse({ status: 200, description: 'Hotel rates' })
  async fetchHotelRates(
    @Param('searchResultId') searchResultId: string,
    @Query('currency') currency: string = 'GBP',
  ) {
    const rates = await this.fetchHotelRatesUseCase.execute(searchResultId, currency);
    return {
      success: true,
      data: rates,
      message: 'Hotel rates retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('hotels/quotes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a quote for a hotel rate' })
  @ApiResponse({ status: 201, description: 'Quote created successfully' })
  async createHotelQuote(@Body() quoteDto: CreateHotelQuoteDto) {
    const quote = await this.createHotelQuoteUseCase.execute(quoteDto);
    return {
      success: true,
      data: quote,
      message: 'Hotel quote created successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('hotels/bookings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a hotel booking' })
  @ApiResponse({ status: 201, description: 'Hotel booking created successfully' })
  async createHotelBooking(@Body() bookingDto: CreateHotelBookingDto, @Request() req: any) {
    const result = await this.createHotelBookingUseCase.execute(bookingDto, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Hotel booking created successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('hotels/bookings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List hotel bookings for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Hotel bookings list' })
  async listHotelBookings(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const result = await this.listHotelBookingsUseCase.execute(req.user.id, {
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
      message: 'Hotel bookings retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('hotels/bookings/:bookingId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a hotel booking by ID' })
  @ApiResponse({ status: 200, description: 'Hotel booking details' })
  async getHotelBooking(@Param('bookingId') bookingId: string, @Request() req: any) {
    const result = await this.getHotelBookingUseCase.execute(bookingId, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Hotel booking retrieved successfully',
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('hotels/bookings/:bookingId/cancel')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a hotel booking (Admin only)' })
  @ApiResponse({ status: 200, description: 'Hotel booking cancelled successfully' })
  async cancelHotelBooking(@Param('bookingId') bookingId: string) {
    const result = await this.cancelHotelBookingUseCase.execute(bookingId);
    return {
      success: true,
      data: result,
      message: 'Hotel booking cancelled successfully',
    };
  }

  @Public()
  @Get('hotels/accommodation/:accommodationId')
  @ApiOperation({ summary: 'Get accommodation details by ID' })
  @ApiResponse({ status: 200, description: 'Accommodation details' })
  async getAccommodation(@Param('accommodationId') accommodationId: string) {
    const accommodation = await this.getAccommodationUseCase.execute(accommodationId);
    return {
      success: true,
      data: accommodation,
      message: 'Accommodation retrieved successfully',
    };
  }

  @Public()
  @Post('hotels/accommodation/suggestions')
  @ApiOperation({ summary: 'Search for accommodation suggestions (autocomplete)' })
  @ApiResponse({ status: 200, description: 'Accommodation suggestions' })
  async searchAccommodationSuggestions(@Body() dto: AccommodationSuggestionsDto) {
    const suggestions = await this.searchAccommodationSuggestionsUseCase.execute(dto);
    return {
      success: true,
      data: suggestions,
      message: 'Accommodation suggestions retrieved successfully',
    };
  }

  @Public()
  @Get('hotels/accommodation/:accommodationId/reviews')
  @ApiOperation({ summary: 'Get accommodation reviews' })
  @ApiResponse({ status: 200, description: 'Accommodation reviews' })
  async getAccommodationReviews(
    @Param('accommodationId') accommodationId: string,
    @Query('limit') limit?: number,
    @Query('after') after?: string,
    @Query('before') before?: string,
  ) {
    const reviews = await this.getAccommodationReviewsUseCase.execute(accommodationId, {
      limit: limit ? Number(limit) : undefined,
      after,
      before,
    });
    return {
      success: true,
      data: reviews,
      message: 'Accommodation reviews retrieved successfully',
    };
  }

  @Public()
  @Get('flights/places/suggestions')
  @ApiOperation({
    summary: 'Search for place suggestions (airports/cities) - for flight search autocomplete',
    description:
      'Use this endpoint to provide autocomplete suggestions for origin and destination fields in flight search. Supports searching by airport/city name or IATA code, with optional location-based filtering.',
  })
  @ApiResponse({ status: 200, description: 'Place suggestions (airports and cities)' })
  async searchPlaceSuggestions(@Query() dto: PlaceSuggestionsDto) {
    const suggestions = await this.searchPlaceSuggestionsUseCase.execute(dto);
    return {
      success: true,
      data: suggestions,
      message: 'Place suggestions retrieved successfully',
    };
  }

  @Public()
  @Get('flights/airlines')
  @ApiOperation({
    summary: 'List airlines',
    description: 'Retrieve a paginated list of all airlines. Useful for displaying airline information in flight results.',
  })
  @ApiResponse({ status: 200, description: 'List of airlines' })
  async listAirlines(
    @Query('limit') limit?: number,
    @Query('after') after?: string,
    @Query('before') before?: string,
  ) {
    const result = await this.listAirlinesUseCase.execute({
      limit: limit ? Number(limit) : undefined,
      after,
      before,
    });
    return {
      success: true,
      data: result.data,
      meta: result.meta,
      message: 'Airlines retrieved successfully',
    };
  }

  @Post('duffel/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Duffel webhook endpoint (handles order updates)' })
  @ApiResponse({ status: 200, description: 'Webhook received successfully' })
  async handleDuffelWebhook(@Body() body: any) {
    // Duffel webhooks don't require signature verification like Stripe
    // but you can add verification if Duffel provides it
    await this.handleDuffelWebhookUseCase.execute(body);
    return { received: true };
  }
}
