import { Controller, Get, Param, Logger } from '@nestjs/common';
import { AmadeusService } from './amadeus.service';

@Controller('api/v1/bookings/hotels')
export class AmadeusHotelController {
  private readonly logger = new Logger(AmadeusHotelController.name);

  constructor(private readonly amadeusService: AmadeusService) {}

  @Get(':hotelId/details')
  async getHotelDetails(@Param('hotelId') hotelId: string) {
    this.logger.log(`GET /api/v1/bookings/hotels/${hotelId}/details`);
    return this.amadeusService.getCompleteHotelDetails(hotelId);
  }

  @Get(':hotelId/content')
  async getHotelContent(@Param('hotelId') hotelId: string) {
    this.logger.log(`GET /api/v1/bookings/hotels/${hotelId}/content`);
    return this.amadeusService.getHotelFullDetails(hotelId);
  }

  @Get(':hotelId/images')
  async getHotelImages(@Param('hotelId') hotelId: string) {
    this.logger.log(`GET /api/v1/bookings/hotels/${hotelId}/images`);
    return this.amadeusService.getHotelImages([hotelId]);
  }

  @Get(':hotelId/ratings')
  async getHotelRatings(@Param('hotelId') hotelId: string) {
    this.logger.log(`GET /api/v1/bookings/hotels/${hotelId}/ratings`);
    return this.amadeusService.getHotelRatings({ hotelIds: [hotelId] });
  }
}
