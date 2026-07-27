import { Controller, Get, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AmadeusService } from '@infrastructure/external-apis/amadeus/amadeus.service';

@Controller('bookings/hotels')
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
      
      const images = await this.amadeusService.getHotelImageUrls(hotelId);
      const primaryImage = await this.amadeusService.getHotelPrimaryImageUrl(hotelId);
      
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
  
      // ✅ FIRST: Try searchHotelNames (doesn't require dates)
      try {
        const response = await this.amadeusService.searchHotelNames({
          keyword: query,
          subType: 'HOTEL',
          page: { limit: 20 }
        });
  
        if (response?.data && response.data.length > 0) {
          const destinations = response.data.map((hotel: any) => ({
            name: hotel.name || '',
            city: hotel.address?.cityName || hotel.city || '',
            country: hotel.address?.countryCode || hotel.country || '',
            cityCode: hotel.hotelId || hotel.id || '',
            image: hotel.media?.[0]?.uri || '',
          }));
  
          // Remove duplicates by city
          const uniqueDestinations = Array.from(
            new Map(destinations.map(d => [d.city, d])).values()
          );
  
          this.logger.log(`Found ${uniqueDestinations.length} destinations via searchHotelNames`);
          return {
            success: true,
            data: uniqueDestinations.slice(0, 10),
            message: 'Destinations found successfully'
          };
        }
      } catch (searchError) {
        this.logger.warn(`searchHotelNames failed: ${searchError.message}`);
      }
  
      // ✅ SECOND: Try getHotelsByCity with fallback
      const cityCode = this.getCityCodeFromQuery(query);
      
      if (cityCode) {
        try {
          const hotelsList = await this.amadeusService.getHotelsByCity({
            cityCode: cityCode,
            radius: 30,
            radiusUnit: 'KM'
          });
          
          if (hotelsList?.data && hotelsList.data.length > 0) {
            const citiesMap = new Map();
            
            for (const hotel of hotelsList.data) {
              const cityName = hotel.address?.cityName || hotel.city || cityCode;
              const countryCode = hotel.address?.countryCode || hotel.country || '';
              
              if (cityName && !citiesMap.has(cityName)) {
                citiesMap.set(cityName, {
                  name: cityName,
                  city: cityName,
                  country: countryCode,
                  cityCode: cityCode,
                  image: this.getCityImage(cityName)
                });
              }
            }
            
            const destinations = Array.from(citiesMap.values());
            this.logger.log(`Found ${destinations.length} destinations via getHotelsByCity`);
            
            return {
              success: true,
              data: destinations.slice(0, 10),
              message: 'Destinations found successfully'
            };
          }
        } catch (hotelError) {
          this.logger.warn(`getHotelsByCity failed for ${cityCode}: ${hotelError.message}`);
        }
      }
  
      // ✅ THIRD: Fallback to matching popular destinations from the local list
      const lowerQuery = query.toLowerCase().trim();
      const popularDestinations = this.getPopularDestinations();
      const matched = popularDestinations.filter(dest =>
        dest.city.toLowerCase().includes(lowerQuery) ||
        dest.name.toLowerCase().includes(lowerQuery) ||
        dest.cityCode.toLowerCase().includes(lowerQuery)
      );
  
      if (matched.length > 0) {
        this.logger.log(`Found ${matched.length} destinations via fallback`);
        return {
          success: true,
          data: matched.slice(0, 10),
          message: 'Destinations found successfully (fallback)'
        };
      }
  
      this.logger.warn(`No destinations found for query: ${query}`);
      return {
        success: true,
        data: [],
        message: 'No destinations found. Try another city name.'
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
  
  // ✅ Add this helper method
  private getPopularDestinations(): Array<{ name: string; city: string; country: string; cityCode: string; image: string }> {
    return [
      // ============ NIGERIA ============
      { name: 'Lagos', city: 'Lagos', country: 'Nigeria', cityCode: 'LOS', image: this.getCityImage('Lagos') },
      { name: 'Abuja', city: 'Abuja', country: 'Nigeria', cityCode: 'ABV', image: this.getCityImage('Abuja') },
      { name: 'Ibadan', city: 'Ibadan', country: 'Nigeria', cityCode: 'IBA', image: this.getCityImage('Lagos') },
      { name: 'Port Harcourt', city: 'Port Harcourt', country: 'Nigeria', cityCode: 'PHC', image: this.getCityImage('Port Harcourt') },
      { name: 'Enugu', city: 'Enugu', country: 'Nigeria', cityCode: 'ENU', image: this.getCityImage('Lagos') },
      { name: 'Benin City', city: 'Benin City', country: 'Nigeria', cityCode: 'BNI', image: this.getCityImage('Lagos') },
      { name: 'Calabar', city: 'Calabar', country: 'Nigeria', cityCode: 'CBQ', image: this.getCityImage('Lagos') },
      { name: 'Kano', city: 'Kano', country: 'Nigeria', cityCode: 'KAN', image: this.getCityImage('Kano') },
      
      // ============ UK ============
      { name: 'London', city: 'London', country: 'United Kingdom', cityCode: 'LON', image: this.getCityImage('London') },
      { name: 'Luton', city: 'Luton', country: 'United Kingdom', cityCode: 'LTN', image: this.getCityImage('London') },
      { name: 'Manchester', city: 'Manchester', country: 'UK', cityCode: 'MAN', image: this.getCityImage('London') },
      { name: 'Edinburgh', city: 'Edinburgh', country: 'UK', cityCode: 'EDI', image: this.getCityImage('London') },
      { name: 'Birmingham', city: 'Birmingham', country: 'UK', cityCode: 'BHX', image: this.getCityImage('London') },
      { name: 'Bristol', city: 'Bristol', country: 'UK', cityCode: 'BRS', image: this.getCityImage('London') },
      { name: 'Glasgow', city: 'Glasgow', country: 'UK', cityCode: 'GLA', image: this.getCityImage('London') },
      
      // ============ USA ============
      { name: 'New York', city: 'New York', country: 'USA', cityCode: 'NYC', image: this.getCityImage('New York') },
      { name: 'Los Angeles', city: 'Los Angeles', country: 'USA', cityCode: 'LAX', image: this.getCityImage('New York') },
      { name: 'Chicago', city: 'Chicago', country: 'USA', cityCode: 'ORD', image: this.getCityImage('New York') },
      { name: 'Miami', city: 'Miami', country: 'USA', cityCode: 'MIA', image: this.getCityImage('New York') },
      { name: 'San Francisco', city: 'San Francisco', country: 'USA', cityCode: 'SFO', image: this.getCityImage('New York') },
      { name: 'Seattle', city: 'Seattle', country: 'USA', cityCode: 'SEA', image: this.getCityImage('New York') },
      { name: 'Boston', city: 'Boston', country: 'USA', cityCode: 'BOS', image: this.getCityImage('New York') },
      { name: 'Washington DC', city: 'Washington', country: 'USA', cityCode: 'WAS', image: this.getCityImage('New York') },
      { name: 'Las Vegas', city: 'Las Vegas', country: 'USA', cityCode: 'LAS', image: this.getCityImage('New York') },
      { name: 'Orlando', city: 'Orlando', country: 'USA', cityCode: 'MCO', image: this.getCityImage('New York') },
      
      // ============ EUROPE ============
      { name: 'Paris', city: 'Paris', country: 'France', cityCode: 'PAR', image: this.getCityImage('Paris') },
      { name: 'Barcelona', city: 'Barcelona', country: 'Spain', cityCode: 'BCN', image: this.getCityImage('Barcelona') },
      { name: 'Madrid', city: 'Madrid', country: 'Spain', cityCode: 'MAD', image: this.getCityImage('Madrid') },
      { name: 'Rome', city: 'Rome', country: 'Italy', cityCode: 'ROM', image: this.getCityImage('Rome') },
      { name: 'Amsterdam', city: 'Amsterdam', country: 'Netherlands', cityCode: 'AMS', image: this.getCityImage('Amsterdam') },
      { name: 'Istanbul', city: 'Istanbul', country: 'Turkey', cityCode: 'IST', image: this.getCityImage('Istanbul') },
      { name: 'Berlin', city: 'Berlin', country: 'Germany', cityCode: 'BER', image: this.getCityImage('Berlin') },
      { name: 'Dublin', city: 'Dublin', country: 'Ireland', cityCode: 'DUB', image: this.getCityImage('London') },
      { name: 'Palma Mallorca', city: 'Palma', country: 'Spain', cityCode: 'PMI', image: this.getCityImage('Barcelona') },
      { name: 'Ibiza', city: 'Ibiza', country: 'Spain', cityCode: 'IBZ', image: this.getCityImage('Barcelona') },
      
      // ============ AFRICA ============
      { name: 'Cape Town', city: 'Cape Town', country: 'South Africa', cityCode: 'CPT', image: this.getCityImage('Cape Town') },
      { name: 'Accra', city: 'Accra', country: 'Ghana', cityCode: 'ACC', image: this.getCityImage('Accra') },
      { name: 'Nairobi', city: 'Nairobi', country: 'Kenya', cityCode: 'NBO', image: this.getCityImage('Nairobi') },
      { name: 'Cairo', city: 'Cairo', country: 'Egypt', cityCode: 'CAI', image: this.getCityImage('Cairo') },
      { name: 'Johannesburg', city: 'Johannesburg', country: 'South Africa', cityCode: 'JNB', image: this.getCityImage('Cape Town') },
      
      // ============ MIDDLE EAST ============
      { name: 'Dubai', city: 'Dubai', country: 'UAE', cityCode: 'DXB', image: this.getCityImage('Dubai') },
      { name: 'Abu Dhabi', city: 'Abu Dhabi', country: 'UAE', cityCode: 'AUH', image: this.getCityImage('Dubai') },
      { name: 'Doha', city: 'Doha', country: 'Qatar', cityCode: 'DOH', image: this.getCityImage('Dubai') },
      
      // ============ ASIA ============
      { name: 'Tokyo', city: 'Tokyo', country: 'Japan', cityCode: 'TYO', image: this.getCityImage('Tokyo') },
      { name: 'Singapore', city: 'Singapore', country: 'Singapore', cityCode: 'SIN', image: this.getCityImage('Singapore') },
      { name: 'Hong Kong', city: 'Hong Kong', country: 'China', cityCode: 'HKG', image: this.getCityImage('Hong Kong') },
      { name: 'Bangkok', city: 'Bangkok', country: 'Thailand', cityCode: 'BKK', image: this.getCityImage('Bangkok') },
      { name: 'Bali', city: 'Bali', country: 'Indonesia', cityCode: 'DPS', image: this.getCityImage('Singapore') },
      { name: 'Kuala Lumpur', city: 'Kuala Lumpur', country: 'Malaysia', cityCode: 'KUL', image: this.getCityImage('Singapore') },
      
      // ============ OCEANIA ============
      { name: 'Sydney', city: 'Sydney', country: 'Australia', cityCode: 'SYD', image: this.getCityImage('Sydney') },
      { name: 'Melbourne', city: 'Melbourne', country: 'Australia', cityCode: 'MEL', image: this.getCityImage('Melbourne') },
      { name: 'Auckland', city: 'Auckland', country: 'New Zealand', cityCode: 'AKL', image: this.getCityImage('Sydney') },
      
      // ============ CANADA ============
      { name: 'Toronto', city: 'Toronto', country: 'Canada', cityCode: 'YYZ', image: this.getCityImage('New York') },
      { name: 'Vancouver', city: 'Vancouver', country: 'Canada', cityCode: 'YVR', image: this.getCityImage('New York') },
      { name: 'Montreal', city: 'Montreal', country: 'Canada', cityCode: 'YUL', image: this.getCityImage('New York') },
      
      // ============ SOUTH AMERICA ============
      { name: 'Sao Paulo', city: 'Sao Paulo', country: 'Brazil', cityCode: 'GRU', image: this.getCityImage('New York') },
      { name: 'Rio de Janeiro', city: 'Rio de Janeiro', country: 'Brazil', cityCode: 'GIG', image: this.getCityImage('New York') },
      { name: 'Buenos Aires', city: 'Buenos Aires', country: 'Argentina', cityCode: 'EZE', image: this.getCityImage('New York') },
      { name: 'Mexico City', city: 'Mexico City', country: 'Mexico', cityCode: 'MEX', image: this.getCityImage('New York') },
      { name: 'Cancun', city: 'Cancun', country: 'Mexico', cityCode: 'CUN', image: this.getCityImage('New York') },
    ];
  }

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
    
    if (cityCodeMap[lowerQuery]) {
      return cityCodeMap[lowerQuery];
    }
    
    for (const [cityName, code] of Object.entries(cityCodeMap)) {
      if (lowerQuery.includes(cityName) || cityName.includes(lowerQuery)) {
        return code;
      }
    }
    
    if (/^[A-Z]{3}$/.test(query.toUpperCase())) {
      return query.toUpperCase();
    }
    
    return null;
  }

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

  private getFallbackPrimaryImage(hotelId: string): string {
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