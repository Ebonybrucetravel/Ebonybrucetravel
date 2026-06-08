import { Controller, Get, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';

@Controller('api/v1/bookings/hotels')
export class HotelImagesController {
  private readonly logger = new Logger(HotelImagesController.name);

  constructor(private readonly amadeusService: AmadeusService) {}

  /**
   * Get hotel images by hotel ID
   * GET /api/v1/bookings/hotels/:hotelId/images
   * 
   * @param hotelId - The hotel ID (e.g., "WHLON464")
   * @param hotelName - Optional hotel name for fallback
   * @returns Hotel images including primary image and all available images
   */
  @Get(':hotelId/images')
  async getHotelImages(
    @Param('hotelId') hotelId: string,
    @Query('hotelName') hotelName?: string,
  ) {
    try {
      this.logger.log(`Fetching images for hotel: ${hotelId}`);
      
      // Fetch images from Amadeus
      const images = await this.amadeusService.getHotelImageUrls(hotelId);
      const primaryImage = await this.amadeusService.getHotelPrimaryImageUrl(hotelId);
      
      // If no images found, return fallback images
      if (images.length === 0) {
        this.logger.warn(`No images found for hotel ${hotelId}, using fallback`);
        return {
          success: true,
          data: {
            hotelId,
            hotelName: hotelName || '',
            images: this.getFallbackImages(hotelId, hotelName),
            primaryImage: this.getFallbackImages(hotelId, hotelName)[0]?.url,
            count: 3,
            cached: false,
            fallbackUsed: true,
          },
          message: 'Hotel images retrieved successfully (fallback images used)',
        };
      }
      
      return {
        success: true,
        data: {
          hotelId,
          hotelName: hotelName || '',
          images: images.map(url => ({ url, type: 'image', source: 'amadeus' })),
          primaryImage,
          count: images.length,
          cached: false,
          fallbackUsed: false,
        },
        message: 'Hotel images retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error fetching hotel images for ${hotelId}:`, error);
      
      // Return fallback images instead of error
      return {
        success: true,
        data: {
          hotelId,
          hotelName: hotelName || '',
          images: this.getFallbackImages(hotelId, hotelName),
          primaryImage: this.getFallbackImages(hotelId, hotelName)[0]?.url,
          count: 3,
          cached: false,
          fallbackUsed: true,
        },
        message: 'Using fallback images due to service error',
      };
    }
  }

  /**
   * Get complete hotel content (images, description, amenities, policies)
   * GET /api/v1/bookings/hotels/:hotelId/content
   * 
   * @param hotelId - The hotel ID (e.g., "WHLON464")
   * @param view - Either "LIGHT" or "FULL" (default: FULL)
   * @returns Complete hotel details
   */
  @Get(':hotelId/content')
  async getHotelContent(
    @Param('hotelId') hotelId: string,
    @Query('view') view?: 'LIGHT' | 'FULL',
  ) {
    try {
      this.logger.log(`Fetching hotel content for: ${hotelId} with view: ${view || 'FULL'}`);
      
      const content = await this.amadeusService.getCompleteHotelDetails(hotelId);
      
      return content;
    } catch (error) {
      this.logger.error(`Error fetching hotel content for ${hotelId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch hotel content: ${error instanceof Error ? error.message : 'Unknown error'}`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get hotel basic information only (name, address, contact)
   * GET /api/v1/bookings/hotels/:hotelId/basic
   * 
   * @param hotelId - The hotel ID
   * @returns Basic hotel information
   */
  @Get(':hotelId/basic')
  async getHotelBasicInfo(@Param('hotelId') hotelId: string) {
    try {
      this.logger.log(`Fetching basic info for hotel: ${hotelId}`);
      
      const info = await this.amadeusService.getHotelBasicInfo(hotelId);
      
      return {
        success: true,
        data: info?.data?.basic || info?.data || info,
        message: 'Hotel basic information retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error fetching basic info for ${hotelId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch hotel basic information: ${error instanceof Error ? error.message : 'Unknown error'}`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get hotel primary image only (fast endpoint for listings)
   * GET /api/v1/bookings/hotels/:hotelId/primary-image
   * 
   * @param hotelId - The hotel ID
   * @returns Primary image URL only
   */
  @Get(':hotelId/primary-image')
  async getHotelPrimaryImage(@Param('hotelId') hotelId: string) {
    try {
      this.logger.log(`Fetching primary image for hotel: ${hotelId}`);
      
      const primaryImage = await this.amadeusService.getHotelPrimaryImageUrl(hotelId);
      
      return {
        success: true,
        data: {
          hotelId,
          primaryImage: primaryImage || this.getFallbackPrimaryImage(hotelId),
        },
        message: 'Hotel primary image retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error fetching primary image for ${hotelId}:`, error);
      return {
        success: true,
        data: {
          hotelId,
          primaryImage: this.getFallbackPrimaryImage(hotelId),
        },
        message: 'Using fallback image',
      };
    }
  }

  /**
   * Get multiple hotels images in batch (for search results)
   * POST /api/v1/bookings/hotels/images/batch
   * 
   * @param body - { hotelIds: string[], hotelNames?: Record<string, string> }
   * @returns Images for multiple hotels
   */
  @Get('images/batch')
  async getBatchHotelImages(@Query('hotelIds') hotelIds: string) {
    try {
      const ids = hotelIds ? hotelIds.split(',') : [];
      
      if (ids.length === 0) {
        return {
          success: true,
          data: {},
          message: 'No hotel IDs provided',
        };
      }
      
      this.logger.log(`Fetching images for ${ids.length} hotels in batch`);
      
      const results: Record<string, any> = {};
      
      // Process in parallel with limited concurrency
      const promises = ids.map(async (hotelId) => {
        try {
          const primaryImage = await this.amadeusService.getHotelPrimaryImageUrl(hotelId);
          results[hotelId] = {
            primaryImage: primaryImage || this.getFallbackPrimaryImage(hotelId),
            images: primaryImage ? [primaryImage] : [],
          };
        } catch (error) {
          this.logger.warn(`Failed to fetch image for ${hotelId}:`, error);
          results[hotelId] = {
            primaryImage: this.getFallbackPrimaryImage(hotelId),
            images: [],
            error: true,
          };
        }
      });
      
      await Promise.all(promises);
      
      return {
        success: true,
        data: results,
        message: 'Batch hotel images retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error fetching batch hotel images:', error);
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch batch hotel images: ${error instanceof Error ? error.message : 'Unknown error'}`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get fallback images for when Amadeus doesn't return any
   */
  private getFallbackImages(hotelId: string, hotelName?: string): Array<{ url: string; type: string; source: string }> {
    const fallbackImages = [
      {
        url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400',
        type: 'exterior',
        source: 'fallback',
      },
      {
        url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400',
        type: 'lobby',
        source: 'fallback',
      },
      {
        url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=400',
        type: 'room',
        source: 'fallback',
      },
    ];
    
    return fallbackImages;
  }

  /**
   * Get fallback primary image for a hotel
   */
  private getFallbackPrimaryImage(hotelId: string): string {
    // Use a deterministic but unique fallback based on hotel ID
    const hash = hotelId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbacks = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1564501049418-3c27787d01e8?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=400',
    ];
    
    return fallbacks[hash % fallbacks.length];
  }
}
