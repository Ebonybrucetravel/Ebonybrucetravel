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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CreateBookingUseCase } from '@application/booking/use-cases/create-booking.use-case';
import { CreateGuestBookingUseCase } from '@application/booking/use-cases/create-guest-booking.use-case';
import { SearchFlightsUseCase } from '@application/booking/use-cases/search-flights.use-case';
import { BookingService } from '@domains/booking/services/booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { SearchFlightsResponseDto } from './dto/flight-offer-response.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly createGuestBookingUseCase: CreateGuestBookingUseCase,
    private readonly searchFlightsUseCase: SearchFlightsUseCase,
    private readonly bookingService: BookingService,
  ) {}

  @Public()
  @Post('search/flights')
  @ApiOperation({ summary: 'Search for flights (no authentication required)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Flight search results',
    type: SearchFlightsResponseDto,
  })
  async searchFlights(@Body() searchFlightsDto: SearchFlightsDto) {
    const results = await this.searchFlightsUseCase.execute(searchFlightsDto);
    return {
      success: true,
      data: results,
      message: 'Flight search completed successfully',
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
}

