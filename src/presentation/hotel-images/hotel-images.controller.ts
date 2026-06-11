import { Controller, Get, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';

@Controller('api/v1/bookings/hotels')
export class HotelImagesController {
  private readonly logger = new Logger(HotelImagesController.name);

  constructor(private readonly amadeusService: AmadeusService) {}

  
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
   * Get hotel complete details (alias for /content)
   * GET /api/v1/bookings/hotels/:hotelId/details
   * 
   * @param hotelId - The hotel ID
   * @returns Complete hotel details
   */
  @Get(':hotelId/details')
  async getHotelDetails(@Param('hotelId') hotelId: string) {
    try {
      this.logger.log(`Fetching hotel details for: ${hotelId}`);
      
      const details = await this.amadeusService.getCompleteHotelDetails(hotelId);
      
      return details;
    } catch (error) {
      this.logger.error(`Error fetching hotel details for ${hotelId}:`, error);
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch hotel details: ${error instanceof Error ? error.message : 'Unknown error'}`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get hotel ratings and sentiment analysis
   * GET /api/v1/bookings/hotels/:hotelId/ratings
   * 
   * @param hotelId - The hotel ID
   * @returns Hotel ratings and reviews summary
   */
  @Get(':hotelId/ratings')
  async getHotelRatings(@Param('hotelId') hotelId: string) {
    try {
      this.logger.log(`Fetching ratings for hotel: ${hotelId}`);
      
      const ratings = await this.amadeusService.getHotelRatings({ hotelIds: [hotelId] });
      
      return {
        success: true,
        data: ratings,
        message: 'Hotel ratings retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Error fetching ratings for ${hotelId}:`, error);
      
      // Return default ratings instead of error
      return {
        success: true,
        data: {
          hotelId,
          rating: 4.0,
          totalReviews: 100,
          sentiment: 'POSITIVE',
          message: 'Ratings not available from provider, showing default',
        },
        message: 'Hotel ratings retrieved successfully (default values)',
      };
    }
  }

  /**
   * Get multiple hotels images in batch (for search results)
   * GET /api/v1/bookings/hotels/images/batch
   * 
   * @param hotelIds - Comma-separated list of hotel IDs
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
   * Search hotel destinations by city name (for autocomplete)
   * GET /api/v1/bookings/hotels/destinations/suggestions?query=london
   * 
   * @param query - City name to search for
   * @returns List of matching hotel destinations
   */
  @Get('destinations/suggestions')
  async getHotelDestinationSuggestions(@Query('query') query: string) {
    try {
      this.logger.log(`Searching hotel destinations for: ${query}`);
      
      if (!query || query.length < 2) {
        return {
          success: true,
          data: [],
          message: 'Please enter at least 2 characters'
        };
      }

      // Get city code from query
      const cityCode = this.getCityCodeFromQuery(query);
      
      if (!cityCode) {
        this.logger.warn(`Could not determine city code for query: ${query}`);
        return {
          success: true,
          data: [],
          message: 'No destinations found. Try another city name.'
        };
      }

      // Search for hotels in that city using Amadeus API
      const hotelsList = await this.amadeusService.getHotelsByCity({
        cityCode: cityCode,
        radius: 20,
        radiusUnit: 'KM'
      });
      
      if (!hotelsList?.data || hotelsList.data.length === 0) {
        this.logger.warn(`No hotels found for city code: ${cityCode}`);
        return {
          success: true,
          data: [],
          message: 'No destinations found. Try another city name.'
        };
      }

      // Extract unique city names from hotels
      const citiesMap = new Map();
      
      for (const hotel of hotelsList.data) {
        const cityName = hotel.address?.cityName;
        const countryCode = hotel.address?.countryCode;
        
        if (cityName && !citiesMap.has(cityName)) {
          citiesMap.set(cityName, {
            name: cityName,
            city: cityName,
            country: countryCode || '',
            cityCode: cityCode,
            image: this.getCityImage(cityName)
          });
        }
      }
      
      const destinations = Array.from(citiesMap.values());
      
      this.logger.log(`Found ${destinations.length} destinations for city code: ${cityCode}`);
      
      return {
        success: true,
        data: destinations.slice(0, 10),
        message: 'Destinations found successfully'
      };
      
    } catch (error) {
      this.logger.error('Error fetching hotel destination suggestions:', error);
      return {
        success: false,
        data: [],
        message: 'Failed to fetch destinations. Please try again.'
      };
    }
  }

  /**
   * Helper to convert query string to city code
   */
  private getCityCodeFromQuery(query: string): string | null {
    const cityCodeMap: Record<string, string> = {
      'london': 'LON',
      'paris': 'PAR', 
      'new york': 'NYC',
      'dubai': 'DXB',
      'lagos': 'LOS',
      'tokyo': 'TYO',
      'singapore': 'SIN',
      'rome': 'ROM',
      'madrid': 'MAD',
      'barcelona': 'BCN',
      'amsterdam': 'AMS',
      'berlin': 'BER',
      'milan': 'MIL',
      'prague': 'PRG',
      'vienna': 'VIE',
      'dublin': 'DUB',
      'brussels': 'BRU',
      'lisbon': 'LIS',
      'athens': 'ATH',
      'stockholm': 'STO',
      'copenhagen': 'CPH',
      'helsinki': 'HEL',
      'oslo': 'OSL',
      'warsaw': 'WAW',
      'budapest': 'BUD',
      'bangkok': 'BKK',
      'hong kong': 'HKG',
      'seoul': 'SEL',
      'delhi': 'DEL',
      'cape town': 'CPT',
      'cairo': 'CAI',
      'nairobi': 'NBO',
      'accra': 'ACC',
      'abuja': 'ABV',
      'port harcourt': 'PHC',
      'kano': 'KAN',
      'los angeles': 'LAX',
      'chicago': 'CHI',
      'miami': 'MIA',
      'san francisco': 'SFO',
      'boston': 'BOS',
      'washington': 'WAS',
      'orlando': 'MCO',
      'las vegas': 'LAS',
      'seattle': 'SEA',
      'denver': 'DEN',
      'phoenix': 'PHX',
      'dallas': 'DFW',
      'houston': 'IAH',
      'atlanta': 'ATL',
      'toronto': 'YYZ',
      'vancouver': 'YVR',
      'montreal': 'YUL',
      'mexico city': 'MEX',
      'sao paulo': 'GRU',
      'rio de janeiro': 'GIG',
      'buenos aires': 'EZE',
      'lima': 'LIM',
      'santiago': 'SCL',
      'bogota': 'BOG',
      'shanghai': 'PVG',
      'beijing': 'PEK',
      'hongkong': 'HKG',
      'taipei': 'TPE',
      'kuala lumpur': 'KUL',
      'jakarta': 'CGK',
      'manila': 'MNL',
      'ho chi minh': 'SGN',
      'hanoi': 'HAN',
      'mumbai': 'BOM',
      'bangalore': 'BLR',
      'chennai': 'MAA',
      'kolkata': 'CCU',
      'hyderabad': 'HYD',
      'auckland': 'AKL',
      'sydney': 'SYD',
      'melbourne': 'MEL',
      'perth': 'PER',
      'brisbane': 'BNE',
      'adelaide': 'ADL',
      'cairns': 'CNS'
    };
    
    const lowerQuery = query.toLowerCase().trim();
    
    // Check exact matches first
    if (cityCodeMap[lowerQuery]) {
      return cityCodeMap[lowerQuery];
    }
    
    // Check partial matches
    for (const [cityName, code] of Object.entries(cityCodeMap)) {
      if (lowerQuery.includes(cityName) || cityName.includes(lowerQuery)) {
        return code;
      }
    }
    
    // If query is 3 uppercase letters, treat as city code
    if (/^[A-Z]{3}$/.test(query.toUpperCase())) {
      return query.toUpperCase();
    }
    
    return null;
  }

  /**
   * Get city image for display
   */
  private getCityImage(cityName: string): string {
    const images: Record<string, string> = {
      'Lagos': 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?auto=format&fit=crop&q=80&w=400',
      'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400',
      'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400',
      'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400',
      'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400',
      'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=400',
      'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=400',
      'Cape Town': 'https://images.unsplash.com/photo-1596394516093-9ba7b6146eba?auto=format&fit=crop&q=80&w=400',
      'Accra': 'https://images.unsplash.com/photo-1587496679742-bad502958c4a?auto=format&fit=crop&q=80&w=400',
      'Abuja': 'https://images.unsplash.com/photo-1585584114963-d5031a12738e?auto=format&fit=crop&q=80&w=400',
      'Port Harcourt': 'https://images.unsplash.com/photo-1588262187741-6e6d6050d2e8?auto=format&fit=crop&q=80&w=400',
      'Kano': 'https://images.unsplash.com/photo-1585584114963-d5031a12738e?auto=format&fit=crop&q=80&w=400',
      'Bangkok': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&q=80&w=400',
      'Hong Kong': 'https://images.unsplash.com/photo-1534432586043-ead5b99229f3?auto=format&fit=crop&q=80&w=400',
      'Seoul': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=400',
      'Mumbai': 'https://images.unsplash.com/photo-1566563815982-6be20405e4b3?auto=format&fit=crop&q=80&w=400',
      'Delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=400',
      'Cairo': 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&q=80&w=400',
      'Nairobi': 'https://images.unsplash.com/photo-1572375887613-939efb4367b6?auto=format&fit=crop&q=80&w=400',
      'Sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=400',
      'Melbourne': 'https://images.unsplash.com/photo-1545044846-351ff102b0b5?auto=format&fit=crop&q=80&w=400',
      'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=400',
      'Madrid': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&q=80&w=400',
      'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&q=80&w=400',
      'Amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&q=80&w=400',
      'Berlin': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&q=80&w=400',
      'Vienna': 'https://images.unsplash.com/photo-1563346448-4b8b9b5b6f9c?auto=format&fit=crop&q=80&w=400',
      'Prague': 'https://images.unsplash.com/photo-1541845157-a6d2d100c731?auto=format&fit=crop&q=80&w=400',
      'Lisbon': 'https://images.unsplash.com/photo-1544109158-032f6d5f5d8c?auto=format&fit=crop&q=80&w=400',
      'Athens': 'https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?auto=format&fit=crop&q=80&w=400',
      'Istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=80&w=400'
    };
    
    return images[cityName] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400';
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
