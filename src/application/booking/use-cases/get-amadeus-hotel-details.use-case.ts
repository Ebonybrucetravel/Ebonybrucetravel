import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';
import { HotelImageCacheService } from '@application/hotel-images/hotel-image-cache.service';
import { CacheService } from '@infrastructure/cache/cache.service';

@Injectable()
export class GetAmadeusHotelDetailsUseCase {
  private readonly logger = new Logger(GetAmadeusHotelDetailsUseCase.name);

  constructor(
    private readonly amadeusService: AmadeusService,
    private readonly hotelImageCacheService: HotelImageCacheService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(params: {
    hotelId: string;
    offerId?: string; // Optional: Get specific offer pricing
    checkInDate?: string; // Optional: For getting current offers
    checkOutDate?: string; // Optional: For getting current offers
    adults?: number; // Optional: For getting current offers
    roomQuantity?: number; // Optional: For getting current offers
    includeImages?: boolean; // Default: true
    includeRatings?: boolean; // Default: true
    includeOffers?: boolean; // Default: true (if dates provided)
  }) {
    const {
      hotelId,
      offerId,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      includeImages = true,
      includeRatings = true,
      includeOffers = true,
    } = params;

    if (!hotelId) {
      throw new BadRequestException('hotelId is required');
    }

    // Validate dates if provided
    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      if (checkOut <= checkIn) {
        throw new BadRequestException('Check-out date must be after check-in date');
      }
    }

    try {
      // Step 1: Get hotel basic info (from hotel list API)
      let hotelInfo: any = null;
      try {
        const hotelListResponse = await this.amadeusService.getHotelsByIds({
          hotelIds: [hotelId],
        });
        if (hotelListResponse.data && hotelListResponse.data.length > 0) {
          hotelInfo = hotelListResponse.data[0];
        }
      } catch (error) {
        this.logger.warn(`Could not fetch hotel info for ${hotelId}:`, error);
      }

      // Step 2: Get hotel ratings (if requested)
      let ratings: any = null;
      if (includeRatings) {
        try {
          const ratingsResponse = await this.amadeusService.getHotelRatings({
            hotelIds: [hotelId],
          });
          if (ratingsResponse.data && ratingsResponse.data.length > 0) {
            ratings = ratingsResponse.data[0];
          }
        } catch (error) {
          this.logger.warn(`Could not fetch ratings for ${hotelId}:`, error);
        }
      }

      // Step 3: Get specific offer pricing (if offerId provided)
      let offerPricing: any = null;
      if (offerId) {
        try {
          offerPricing = await this.amadeusService.getHotelOfferPricing({
            offerId,
          });
        } catch (error) {
          this.logger.warn(`Could not fetch offer pricing for ${offerId}:`, error);
        }
      }

      // Step 4: Get current offers (if dates provided and includeOffers is true)
      let currentOffers: any[] = [];
      if (includeOffers && checkInDate && checkOutDate) {
        try {
          const offersResponse = await this.amadeusService.searchHotels({
            hotelIds: [hotelId],
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity,
          });
          if (offersResponse.data && offersResponse.data.length > 0) {
            currentOffers = offersResponse.data[0].offers || [];
          }
        } catch (error) {
          this.logger.warn(`Could not fetch current offers for ${hotelId}:`, error);
        }
      }

      // Step 5: Get hotel images (if requested)
      let images: any = null;
      if (includeImages && hotelInfo?.name) {
        try {
          images = await this.hotelImageCacheService.getHotelImages(
            hotelId,
            hotelInfo.name,
          );
        } catch (error) {
          this.logger.warn(`Could not fetch images for ${hotelId}:`, error);
        }
      }

      // Combine all data
      return {
        hotel: {
          hotelId: hotelInfo?.hotelId || hotelId,
          name: hotelInfo?.name || null,
          chainCode: hotelInfo?.chainCode || null,
          cityCode: hotelInfo?.cityCode || null,
          latitude: hotelInfo?.geoCode?.latitude || null,
          longitude: hotelInfo?.geoCode?.longitude || null,
          address: hotelInfo?.address || null,
          contact: hotelInfo?.contact || null,
          amenities: hotelInfo?.amenities || [],
          description: hotelInfo?.description || null,
        },
        ratings: ratings
          ? {
              hotelId: ratings.hotelId,
              overallRating: ratings.overallRating || null,
              numberOfRatings: ratings.numberOfRatings || null,
              sentiment: ratings.sentiment || null,
              categories: ratings.categories || [],
            }
          : null,
        offerPricing: offerPricing?.data || null,
        currentOffers: currentOffers.length > 0 ? currentOffers : null,
        images: images
          ? {
              images: images.images || [],
              cached: images.cached || false,
              fallbackUsed: images.fallbackUsed || false,
              message: images.message || null,
            }
          : null,
        metadata: {
          hotelId,
          offerId: offerId || null,
          checkInDate: checkInDate || null,
          checkOutDate: checkOutDate || null,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching hotel details for ${hotelId}:`, error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch hotel details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

