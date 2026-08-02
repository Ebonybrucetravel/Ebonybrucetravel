import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redactCardFromString } from '@common/utils/pci-redaction.util';
import { CurrencyService } from '@infrastructure/currency/currency.service';
import { ProductType } from '@prisma/client';
import { MarkupRepository } from '@infrastructure/database/repositories/markup.repository';

@Injectable()
export class AmadeusService {
  private readonly logger = new Logger(AmadeusService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly officeId: string;
  private readonly orgId: string;
  private readonly userId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly currencyService: CurrencyService,
    private readonly markupRepository: MarkupRepository,
  ) {
    this.apiKey = this.configService.get<string>('AMADEUS_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('AMADEUS_API_SECRET') || '';
    this.officeId = this.configService.get<string>('AMADEUS_OFFICE_ID') || 'LOSN8250A';
    this.orgId = this.configService.get<string>('AMADEUS_ORG_ID') || 'NMC-NIGERI';
    this.userId = this.configService.get<string>('AMADEUS_USER_ID') || 'USE9BAQC';
    
    const env = this.configService.get<string>('AMADEUS_ENV') || 'test';
    this.baseUrl = env === 'production' 
      ? 'https://travel.api.amadeus.com'
      : 'https://test.travel.api.amadeus.com';
    
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Amadeus API credentials not configured.');
    }
    
    this.logger.log(`AmadeusService initialized with base URL: ${this.baseUrl}`);
    this.logger.log(`Office ID: ${this.officeId}, Org ID: ${this.orgId}, User ID: ${this.userId}`);
    // ✅ ADD THESE 3 LINES AT THE END OF THE CONSTRUCTOR
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.logger.log('🔄 Amadeus token cache cleared on startup - will fetch fresh token on first request');

    
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      this.logger.debug('Using cached access token');
      return this.accessToken;
    }
  
    if (!this.apiKey || !this.apiSecret) {
      throw new HttpException(
        'Amadeus API credentials not configured.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  
    try {
      this.logger.log('Requesting Amadeus OAuth token...');
      this.logger.debug(`Token endpoint: ${this.baseUrl}/v1/security/oauth2/token`);
      
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        scope: 'amadeus:hotel:read amadeus:rating:read amadeus:transfer:read',
      });
      
      const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
  
      const responseText = await response.text();
      this.logger.log(`Token response status: ${response.status}`);
  
      if (!response.ok) {
        this.logger.error(`Token request failed: ${responseText}`);
        throw new HttpException(
          `Failed to get Amadeus access token: ${response.status} - ${responseText}`,
          HttpStatus.UNAUTHORIZED,
        );
      }
  
      const data = JSON.parse(responseText);
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
      
      this.logger.log('Amadeus OAuth token obtained successfully');
      this.logger.debug(`Token expires at: ${new Date(this.tokenExpiresAt).toISOString()}`);
      
      return this.accessToken;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to authenticate with Amadeus: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  private async makeRequest(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: any;
      params?: Record<string, string>;
      useAmadeusJson?: boolean;
    } = {},
  ): Promise<any> {
    const { method = 'GET', body, params, useAmadeusJson = false } = options;
    
    let url = `${this.baseUrl}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
  
    const token = await this.getAccessToken();
  
    const contentType = useAmadeusJson 
      ? 'application/vnd.amadeus+json' 
      : 'application/json';
  
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': contentType,
    };
  
    if (!useAmadeusJson) {
      headers['X-Office-Id'] = this.officeId;
      headers['X-Organization-Id'] = this.orgId;
      headers['X-User-Id'] = this.userId;
      this.logger.debug('Hotels API: Including X-* headers');
    } else {
      this.logger.debug('Transfers API: Skipping X-* headers');
    }
  
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      headers['Content-Type'] = contentType;
    }
  
    this.logger.debug(`Amadeus API ${method} ${url}`);
  
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Amadeus API error ${response.status} ${endpoint}: ${errorText}`);
        
        let errorMessage = `Amadeus API error: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].detail || errorJson.errors[0].title || errorMessage;
          }
        } catch { }
  
        throw new HttpException(errorMessage, response.status);
      }
  
      if (response.status === 204) {
        return { success: true };
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Amadeus API request failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  
  async searchHotelNames(params: {
    keyword: string;
    subType?: string;
    countryCode?: string;
    page?: { limit?: number; offset?: number };
  }): Promise<any> {
    const queryParams: Record<string, string> = { keyword: params.keyword };
    if (params.subType) queryParams.subType = params.subType;
    if (params.countryCode) queryParams.countryCode = params.countryCode;
    if (params.page?.limit) queryParams['page[limit]'] = params.page.limit.toString();
    if (params.page?.offset) queryParams['page[offset]'] = params.page.offset.toString();
    
    return this.makeRequest('/v1/reference-data/locations/hotel', { method: 'GET', params: queryParams });
  }

  async getHotelsByCity(params: {
    cityCode: string;
    hotelIds?: string[];
    amenities?: string[];
    ratings?: number[];
    chainCodes?: string[];
    radius?: number;
    radiusUnit?: 'KM' | 'MILE';
    hotelSource?: 'BEDBANK' | 'DIRECTCHAIN' | 'ALL';
    limit?: number; 
  }): Promise<any> {
    const queryParams: Record<string, string> = { 
      cityCode: params.cityCode 
    };
    
    // ✅ CHANGE: Default radius to 200 KM (MAX)
    if (params.radius) {
      queryParams.radius = Math.min(params.radius, 200).toString(); // Cap at 200
    } else {
      queryParams.radius = '200'; // ← CHANGE FROM '30' TO '200'
    }
    
    if (params.radiusUnit) {
      queryParams.radiusUnit = params.radiusUnit;
    } else {
      queryParams.radiusUnit = 'KM';
    }
    
    if (params.hotelSource) {
      queryParams.hotelSource = params.hotelSource;
    } else {
      queryParams.hotelSource = 'ALL';
    }
    
    if (params.hotelIds?.length) queryParams.hotelIds = params.hotelIds.join(',');
    if (params.amenities?.length) queryParams.amenities = params.amenities.join(',');
    if (params.ratings?.length) queryParams.ratings = params.ratings.join(',');
    if (params.chainCodes?.length) queryParams.chainCodes = params.chainCodes.join(',');
    
    this.logger.log(`🔍 Searching ALL hotels in ${params.cityCode} with radius ${queryParams.radius} KM`);
    
    return this.makeRequest('/v1/reference-data/locations/hotels/by-city', { 
      method: 'GET', 
      params: queryParams 
    });
  }

  async getHotelsByGeocode(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    radiusUnit?: 'KM' | 'MILE';
    chainCodes?: string[];
    limit?: number; // 👈 ADD THIS
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
    };
    
    // 👇 SET BETTER DEFAULTS
    if (params.radius) {
      queryParams.radius = params.radius.toString();
    } else {
      queryParams.radius = '30';
    }
    
    if (params.radiusUnit) {
      queryParams.radiusUnit = params.radiusUnit;
    } else {
      queryParams.radiusUnit = 'KM';
    }
    
    //if (params.limit) {
      //queryParams['page[limit]'] = params.limit.toString();
    //} else {
      //queryParams['page[limit]'] = '50';
    //}
    
    if (params.chainCodes?.length) queryParams.chainCodes = params.chainCodes.join(',');
    
    this.logger.log(`🔍 Searching hotels near (${params.latitude}, ${params.longitude}) with radius ${queryParams.radius} KM`);
    
    return this.makeRequest('/v1/reference-data/locations/hotels/by-geocode', { 
      method: 'GET', 
      params: queryParams 
    });
  }

  async getHotelsByIds(params: { hotelIds: string[] }): Promise<any> {
    return this.makeRequest('/v1/reference-data/locations/hotels/by-hotels', {
      method: 'GET',
      params: { hotelIds: params.hotelIds.join(',') },
    });
  }

  async getHotelRatings(params: { hotelIds: string[] }): Promise<any> {
    try {
      const result = await this.makeRequest('/v2/e-reputation/hotel-sentiments', {
        method: 'GET',
        params: { hotelIds: params.hotelIds.join(',') },
      });
      return result;
    } catch (error) {
      this.logger.warn(`Failed to fetch ratings for hotels: ${params.hotelIds.join(',')}`);
      return {
        success: true,
        data: params.hotelIds.map(hotelId => ({
          hotelId,
          rating: 4.0,
          totalReviews: 100,
          sentiment: 'POSITIVE',
          message: 'Ratings not available from provider, showing default'
        })),
        message: 'Hotel ratings retrieved successfully (default values)'
      };
    }
  }
  
  async getHotelContent(
    hotelId: string,
    fields?: Array<'promotions' | 'awards' | 'policies' | 'rooms' | 'facilities' | 'pointOfInterest' | 'hotel' | 'basic'>,
    view?: 'LIGHT' | 'FULL'
  ): Promise<any> {
    if (!hotelId) {
      throw new HttpException('Hotel ID is required', HttpStatus.BAD_REQUEST);
    }
    
    const queryParams: Record<string, string> = {
      hotelID: hotelId,
    };
    
    if (fields?.length) {
      queryParams.fields = fields.join(',');
    }
    
    if (view) {
      queryParams.view = view;
    }
    
    this.logger.log(`Fetching hotel content for: ${hotelId}`);
    
    return this.makeRequest('/v3/reference-data/locations/by-hotel', {
      method: 'GET',
      params: queryParams,
    });
  }

  async getHotelBasicInfo(hotelId: string): Promise<any> {
    return this.getHotelContent(hotelId, ['basic'], 'LIGHT');
  }

  async getHotelFullDetails(hotelId: string): Promise<any> {
    return this.getHotelContent(hotelId, undefined, 'FULL');
  }

  async getHotelImageUrls(hotelId: string): Promise<string[]> {
    try {
      const response = await this.getHotelContent(hotelId, undefined, 'FULL');
      const images: string[] = [];
      
      if (response?.data?.basic?.media && Array.isArray(response.data.basic.media)) {
        for (const media of response.data.basic.media) {
          if (media.mediaScales && Array.isArray(media.mediaScales) && media.mediaScales.length > 0) {
            const largestImage = media.mediaScales.sort((a: any, b: any) => {
              const aSize = (a.dimensions?.height || 0) * (a.dimensions?.width || 0);
              const bSize = (b.dimensions?.height || 0) * (b.dimensions?.width || 0);
              return bSize - aSize;
            })[0];
            
            if (largestImage?.href) {
              images.push(largestImage.href);
            }
          }
        }
      }
      
      this.logger.log(`Found ${images.length} images for hotel ${hotelId}`);
      return images;
    } catch (error) {
      this.logger.error(`Failed to fetch images for hotel ${hotelId}:`, error);
      return [];
    }
  }

  async getHotelPrimaryImageUrl(hotelId: string): Promise<string | null> {
    try {
      const response = await this.getHotelContent(hotelId, undefined, 'FULL');
      
      if (response?.data?.basic?.media && Array.isArray(response.data.basic.media)) {
        const priorityCategories = ['EXTERIOR_VIEW', 'LOBBY_VIEW', 'LOGO', 'RESTAURANT', 'BAR_OR_LOUNGE'];
        
        for (const category of priorityCategories) {
          const mediaItem = response.data.basic.media.find(
            (m: any) => m.category === category && m.mediaScales?.length > 0
          );
          
          if (mediaItem?.mediaScales?.length > 0) {
            const largest = mediaItem.mediaScales.sort((a: any, b: any) => {
              const aSize = (a.dimensions?.height || 0) * (a.dimensions?.width || 0);
              const bSize = (b.dimensions?.height || 0) * (b.dimensions?.width || 0);
              return bSize - aSize;
            })[0];
            
            if (largest?.href) {
              this.logger.log(`Primary image found for ${hotelId} in category ${category}`);
              return largest.href;
            }
          }
        }
        
        const firstMedia = response.data.basic.media.find((m: any) => m.mediaScales?.length > 0);
        if (firstMedia?.mediaScales?.[0]?.href) {
          this.logger.log(`Primary image fallback for ${hotelId}`);
          return firstMedia.mediaScales[0].href;
        }
      }
      
      this.logger.warn(`No images found for hotel ${hotelId}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch primary image for hotel ${hotelId}:`, error);
      return null;
    }
  }

  async getCompleteHotelDetails(hotelId: string): Promise<any> {
    try {
      this.logger.log(`Fetching complete hotel details for ${hotelId}`);
      
      const [contentResponse, imageUrls, primaryImage] = await Promise.all([
        this.getHotelFullDetails(hotelId),
        this.getHotelImageUrls(hotelId),
        this.getHotelPrimaryImageUrl(hotelId),
      ]);
      
      const hotelData = contentResponse?.data?.basic || contentResponse?.data || contentResponse;
      const media = hotelData?.media || [];
    
      let description = hotelData?.description?.text || null;
      if (!description) {
        const longDescription = media.find((m: any) => 
          m.tags?.includes('HOTEL_LONG_DESCRIPTION')
        );
        const shortDescription = media.find((m: any) => 
          m.tags?.includes('HOTEL_SHORT_DESCRIPTION')
        );
        const locationDescription = media.find((m: any) => 
          m.tags?.includes('LONG_LOCATION_DESCRIPTION')
        );
        
        description = longDescription?.description?.text || 
                      shortDescription?.description?.text || 
                      locationDescription?.description?.text || 
                      null;
      }
    
      const amenities = media
        .filter((m: any) => 
          m.tags?.includes('AMENITY_INFORMATION') || 
          m.tags?.includes('ONSITE_FACILITIES') ||
          m.tags?.includes('ONSITE_SERVICES')
        )
        .map((m: any) => {
          const text = m.description?.text || '';
          if (text.includes('\r') || text.includes('\n')) {
            return text.split(/\r\n|\n|\r/).filter((line: string) => line.trim());
          }
          return text;
        })
        .flat()
        .filter(Boolean);
      const policyTags = [
        'COMMISSION_POLICY_DESCRIPTION',
        'LATE_CHECKOUT_DESCRIPTION',
        'GROUP_CONDITIONS',
        'SERVICE_CHARGE_DESCRIPTION',
        'TAX_AND_FEE_DESCRIPTION',
        'CANCELLATION_POLICY',
        'GUARANTEE_POLICY',
        'GENERAL_POLICY_DECRIPTION'
      ];
      
      const policies = media
        .filter((m: any) => 
          m.tags?.some((tag: string) => policyTags.includes(tag))
        )
        .map((m: any) => ({
          type: m.tags?.find((tag: string) => policyTags.includes(tag)) || 'POLICY',
          text: m.description?.text || '',
          category: m.category || null
        }))
        .filter((p: any) => p.text);
      
      let checkIn = hotelData?.checkInOut?.checkIn || '15:00';
      let checkOut = hotelData?.checkInOut?.checkOut || '12:00';
      
      const checkInMedia = media.find((m: any) => 
        m.tags?.includes('CHECK_IN_DESCRIPTION')
      );
      const checkOutMedia = media.find((m: any) => 
        m.tags?.includes('CHECK_OUT_DESCRIPTION')
      );
      
      if (checkInMedia?.description?.text) {
        const match = checkInMedia.description.text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
        if (match) checkIn = match[1];
      }
      if (checkOutMedia?.description?.text) {
        const match = checkOutMedia.description.text.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
        if (match) checkOut = match[1];
      }
      
      return {
        success: true,
        data: {
          hotelId,
          name: hotelData?.name || null,
          chainCode: hotelData?.chainCode || null,
          chainName: hotelData?.chainName || null,
          description: description,
          address: hotelData?.contact?.[0]?.address || null,
          contact: hotelData?.contact || null,
          location: hotelData?.location || null,
          media: hotelData?.media || null,
          images: imageUrls,
          primaryImage: primaryImage,
          amenities: amenities.length > 0 ? amenities : null,
          policies: policies.length > 0 ? policies : null,
          checkInOut: {
            checkIn: checkIn,
            checkOut: checkOut,
          },
        },
        message: 'Hotel details retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get complete hotel details for ${hotelId}:`, error);
      throw new HttpException(
        {
          message: `Failed to fetch hotel details: ${error instanceof Error ? error.message : 'Unknown error'}`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  async searchHotels(params: {
    hotelIds?: string[];
    cityCode?: string;
    checkInDate: string;
    checkOutDate: string;
    adults?: number;
    roomQuantity?: number;
    currency?: string;
    bestRateOnly?: boolean;
    includeImages?: boolean; 
  }): Promise<any> {
    const hasHotelIds = params.hotelIds && params.hotelIds.length > 0;
    const hasCityCode = params.cityCode && params.cityCode.trim() !== '';
    
    if (!hasHotelIds && !hasCityCode) {
      throw new HttpException(
        'Either hotelIds or cityCode is required for hotel search.',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    const queryParams: Record<string, string> = {
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
    };
    
    if (hasHotelIds) {
      queryParams.hotelIds = params.hotelIds.join(',');
    }
    
    if (hasCityCode) {
      queryParams.cityCode = params.cityCode;
    }
    
    if (params.adults) queryParams.adults = params.adults.toString();
    if (params.roomQuantity) queryParams.roomQuantity = params.roomQuantity.toString();
    if (params.currency) queryParams.currency = params.currency;
    if (params.bestRateOnly !== undefined) queryParams.bestRateOnly = params.bestRateOnly.toString();
    
    const response = await this.makeRequest('/v3/shopping/hotel-offers', { 
      method: 'GET', 
      params: queryParams 
    });
  
    if (params.includeImages !== false && response?.data?.length > 0) {
      this.logger.log(`Enriching ${response.data.length} hotels with images...`);
      
      const hotelIds = response.data
        .map((item: any) => item.hotel?.hotelId)
        .filter((id: string) => id);
      
      if (hotelIds.length > 0) {
      
        const imagesMap = await this.fetchHotelImagesBatch(hotelIds);
      
        response.data = response.data.map((hotelOffer: any) => {
          const hotelId = hotelOffer.hotel?.hotelId;
          const images = imagesMap.get(hotelId) || [];
          const primaryImage = this.getPrimaryImageFromMedia(images);
          
          return {
            ...hotelOffer,
            hotel: {
              ...hotelOffer.hotel,
              images: images,
              primaryImage: primaryImage,
              imageCategories: this.categorizeImages(images),
            }
          };
        });
        
        this.logger.log(`✅ Successfully enriched hotels with images`);
      }
    }
    
    return response;
  }
  async getHotelOffersWithRoomTypes(params: {
    hotelIds?: string[];
    cityCode?: string;
    checkInDate: string;
    checkOutDate: string;
    adults?: number;
    roomQuantity?: number;
    currency?: string;
    bestRateOnly?: boolean;
  }): Promise<any> {
    const hasHotelIds = params.hotelIds && params.hotelIds.length > 0;
    const hasCityCode = params.cityCode && params.cityCode.trim() !== '';
    
    if (!hasHotelIds && !hasCityCode) {
      throw new HttpException(
        'Either hotelIds or cityCode is required for hotel search.',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    // Step 1: Get hotel offers
    const queryParams: Record<string, string> = {
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
    };
    
    if (hasHotelIds) {
      queryParams.hotelIds = params.hotelIds.join(',');
    }
    if (hasCityCode) {
      queryParams.cityCode = params.cityCode;
    }
    if (params.adults) queryParams.adults = params.adults.toString();
    if (params.roomQuantity) queryParams.roomQuantity = params.roomQuantity.toString();
    if (params.currency) queryParams.currency = params.currency;
    queryParams.bestRateOnly = params.bestRateOnly === undefined 
      ? 'false' 
      : params.bestRateOnly.toString();
    
    const response = await this.makeRequest('/v3/shopping/hotel-offers', { 
      method: 'GET', 
      params: queryParams 
    });
    
    if (!response?.data?.length) {
      return {
        success: true,
        data: [],
        message: 'No hotels found',
      };
    }
  
    // Step 2: Fetch hotel images and room images
    let roomImagesMap = new Map<string, Map<string, any[]>>();
    try {
      const hotelIds = response.data
        .map((item: any) => item.hotel?.hotelId)
        .filter((id: string) => id);
  
      if (hotelIds.length > 0) {
        const imagesData = await this.fetchHotelImagesWithRoomsBatch(hotelIds);
        roomImagesMap = new Map(
          Array.from(imagesData.entries()).map(([hotelId, data]) => [hotelId, data.roomImages])
        );
        this.logger.log(`✅ Fetched room images for ${roomImagesMap.size} hotels`);
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch room images, continuing without them: ${error.message}`);
    }
  
    // Step 3: Fetch markup configuration
    const targetCurrency = params.currency || 'NGN';
    let markupPercentage = 2.5;
    let serviceFeeAmount = 0;
    try {
      const markupConfig = await this.markupRepository.findActiveMarkupByProductType(
        ProductType.HOTEL,
        targetCurrency,
      );
      if (markupConfig) {
        markupPercentage = markupConfig.markupPercentage || 2.5;
        serviceFeeAmount = markupConfig.serviceFeeAmount || 0;
      }
    } catch (error) {
      this.logger.warn(`Could not fetch markup config, using default ${markupPercentage}%:`, error);
    }
  
    // Step 4: Process each hotel's offers with images and prices
    const hotelsWithRoomTypes = await Promise.all(
      response.data.map(async (hotelOffer: any) => {
        const hotel = hotelOffer.hotel || {};
        const offers = hotelOffer.offers || [];
        
        // Get room images for this hotel
        const hotelRoomImages = roomImagesMap.get(hotel.hotelId) || new Map<string, any[]>();
        
        // Process each room type with price and images
        const roomTypes = await Promise.all(
          offers.map(async (offer: any) => {
            const room = offer.room || {};
            const price = offer.price || {};
            
            // ✅ Extract original price
            let originalPrice = price.total || price.base || 0;
            const originalCurrency = price.currency || 'GBP';
            
            const parsedOriginalPrice = typeof originalPrice === 'string' 
              ? parseFloat(originalPrice) 
              : (originalPrice || 0);
            
            // ✅ Convert price to target currency
            let convertedBasePrice: number;
            let conversionFee: number = 0;
            let conversionFeePercentage: number = 0;
        
            if (originalCurrency !== targetCurrency) {
              convertedBasePrice = await this.currencyService.convert(
                parsedOriginalPrice,
                originalCurrency,
                targetCurrency,
              );
              const conversionDetails = this.currencyService.calculateConversionFee(
                convertedBasePrice,
                originalCurrency,
                targetCurrency,
              );
              conversionFee = conversionDetails.conversionFee;
              conversionFeePercentage = this.currencyService.getConversionBuffer();
            } else {
              convertedBasePrice = parsedOriginalPrice;
            }
        
                    // ✅ FIX: finalPrice is already converted. No extra markup added here.
        const finalPrice = convertedBasePrice;
        
        // ✅ Get room type
        const roomType = room.type || room.typeEstimated?.category || 'STANDARD';
            
            // ✅ Get room images
            const roomImages = this.getRoomImagesForOffer(hotelRoomImages, roomType);
            
            // ✅ Build fees array
            const fees = [];
            
            // Base price
            fees.push({
              type: 'BASE_RATE',
              amount: convertedBasePrice,
              currency: targetCurrency,
              description: 'Base room rate',
              includedInBase: true,
            });
            
            // Taxes from offer
            if (price.taxes && Array.isArray(price.taxes)) {
              for (const tax of price.taxes) {
                let taxAmount = parseFloat(tax.amount || 0);
                if (tax.currency && tax.currency !== targetCurrency) {
                  taxAmount = await this.currencyService.convert(taxAmount, tax.currency, targetCurrency);
                }
                fees.push({
                  type: 'TAX',
                  amount: taxAmount,
                  currency: targetCurrency,
                  description: tax.description || tax.type || 'Tax',
                  includedInBase: false,
                });
              }
            }
            
            // Additional fees
            if (price.additionalFees && Array.isArray(price.additionalFees)) {
              for (const fee of price.additionalFees) {
                let feeAmount = parseFloat(fee.amount || 0);
                if (fee.currency && fee.currency !== targetCurrency) {
                  feeAmount = await this.currencyService.convert(feeAmount, fee.currency, targetCurrency);
                }
                fees.push({
                  type: fee.type || 'ADDITIONAL_FEE',
                  amount: feeAmount,
                  currency: targetCurrency,
                  description: fee.description || fee.type || 'Additional fee',
                  includedInBase: false,
                });
              }
            }
            
         
            
            return {
              id: offer.id,
              roomId: room.roomId || offer.id,
              type: roomType,
              name: {
                name: room.description || room.type || 'Standard Room',
              },
              description: {
                text: room.description || null,
                lang: 'EN',
              },
              bedTypes: room.beds?.map((b: any) => ({
                type: b.type || 'UNKNOWN',
                quantity: b.quantity || 1,
              })) || [],
              occupancy: {
                maxAdults: room.maxAdultOccupancy || 2,
                maxChildren: room.maxChildOccupancy || 0,
                maxOverall: room.maxOverallOccupancy || 2,
              },
              price: {
                base: this.currencyService.formatAmount(convertedBasePrice, targetCurrency),
                total: this.currencyService.formatAmount(finalPrice, targetCurrency),
                currency: targetCurrency,
                fees: fees,
                original_base: parsedOriginalPrice,
                original_currency: originalCurrency,
                markup_percentage: 0,
                markup_amount: 0,     
                service_fee: 0,       
                conversion_fee: 0,   
              },

              rateFamily: offer.rateFamilyEstimated?.code || null,
              policies: {
                paymentType: offer.policies?.paymentType || null,
                guarantee: offer.policies?.guarantee || null,
                cancellation: offer.policies?.cancellation || null,
                deposit: offer.policies?.deposit || null,
              },
              available: offer.available || true,
              // ✅ Images from API
              images: roomImages,
              primaryImage: roomImages.length > 0 ? roomImages[0]?.uri : null,
            };
          })
        );
        
        // Get all hotel images
        const allHotelImages = Array.from(hotelRoomImages.values()).flat();
        
        return {
          hotelId: hotel.hotelId,
          name: hotel.name,
          chainCode: hotel.chainCode,
          cityCode: hotel.cityCode,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          address: hotel.address,
          roomTypes: roomTypes,
          totalRoomTypes: roomTypes.length,
          hotelImages: allHotelImages,
          primaryHotelImage: allHotelImages.length > 0 ? allHotelImages[0]?.uri : null,
        };
      })
    );
    
    return {
      success: true,
      data: hotelsWithRoomTypes,
      message: 'Hotels with room types and fees retrieved successfully',
      images_enriched: true,
      currency: targetCurrency,
      markup_percentage: markupPercentage,
      service_fee: this.currencyService.formatAmount(serviceFeeAmount, targetCurrency),
      conversion_note: `Prices converted to ${targetCurrency} with ${markupPercentage}% markup${serviceFeeAmount > 0 ? ` and ${serviceFeeAmount} ${targetCurrency} service fee` : ''}.`,
    };
  }
  
  /**
   * Get detailed pricing for a specific offer with all fees
   * This is the pricing confirmation step from the documentation
   */
  async getHotelOfferPricingWithFees(offerId: string, currency?: string): Promise<any> {
    if (!offerId) {
      throw new HttpException('Offer ID is required', HttpStatus.BAD_REQUEST);
    }
    
    const queryParams: Record<string, string> = {};
    if (currency) queryParams.currency = currency;
    
    // This is the pricing endpoint from the documentation (page 14)
    const response = await this.makeRequest(`/v3/shopping/hotel-offers/${offerId}`, {
      method: 'GET',
      params: queryParams,
    });
    
    if (!response?.data) {
      throw new HttpException('Offer not found', HttpStatus.NOT_FOUND);
    }
    
    const offer = response.data;
    const price = offer.price || {};
    const room = offer.room || {};
    
    // Extract detailed fees
    const fees = [];
    
    if (price.base) {
      fees.push({
        type: 'BASE_RATE',
        amount: parseFloat(price.base),
        currency: price.currency || 'GBP',
        description: 'Base room rate',
        includedInBase: true,
      });
    }
    
    if (price.taxes && Array.isArray(price.taxes)) {
      for (const tax of price.taxes) {
        fees.push({
          type: 'TAX',
          amount: parseFloat(tax.amount || 0),
          currency: tax.currency || price.currency || 'GBP',
          description: tax.description || tax.type || 'Tax',
          includedInBase: false,
        });
      }
    }
    
    if (price.additionalFees && Array.isArray(price.additionalFees)) {
      for (const fee of price.additionalFees) {
        fees.push({
          type: fee.type || 'ADDITIONAL_FEE',
          amount: parseFloat(fee.amount || 0),
          currency: fee.currency || price.currency || 'GBP',
          description: fee.description || fee.type || 'Additional fee',
          includedInBase: false,
        });
      }
    }
    
    return {
      success: true,
      data: {
        offerId: offer.id,
        roomType: {
          id: room.roomId,
          type: room.type,
          description: room.description,
          bedTypes: room.beds,
          maxOccupancy: room.maxAdultOccupancy,
        },
        price: {
          base: parseFloat(price.base || 0),
          total: parseFloat(price.total || 0),
          currency: price.currency || 'GBP',
          fees: fees,
          variations: price.variations || null,
        },
        policies: {
          paymentType: offer.policies?.paymentType,
          guarantee: offer.policies?.guarantee,
          cancellation: offer.policies?.cancellation,
          deposit: offer.policies?.deposit,
          checkInOut: offer.policies?.checkInOut,
        },
        available: offer.available,
      },
      message: 'Offer pricing with fees retrieved successfully',
    };
  }
  
  // ✅ EXISTING METHOD - Keep this as-is
  async getHotelOfferPricing(params: { offerId: string; lang?: string }): Promise<any> {
    const queryParams: Record<string, string> = {};
    if (params.lang) queryParams.lang = params.lang;
    return this.makeRequest(`/v3/shopping/hotel-offers/${params.offerId}`, { 
      method: 'GET', 
      params: queryParams 
    });
  }
  
  private async fetchHotelImagesWithRoomsBatch(hotelIds: string[]): Promise<Map<string, { hotelImages: any[], roomImages: Map<string, any[]> }>> {
    const resultMap = new Map<string, { hotelImages: any[], roomImages: Map<string, any[]> }>();
    
    if (!hotelIds || hotelIds.length === 0) {
      return resultMap;
    }
    
    try {
      const chunkSize = 10;
      for (let i = 0; i < hotelIds.length; i += chunkSize) {
        const chunk = hotelIds.slice(i, i + chunkSize);
      
        const promises = chunk.map(hotelId => 
          this.getHotelContent(hotelId, ['rooms', 'basic'], 'FULL')
            .then(response => ({ hotelId, response }))
            .catch(error => {
              this.logger.warn(`Failed to fetch images for hotel ${hotelId}: ${error.message}`);
              return { hotelId, response: null };
            })
        );
        
        const results = await Promise.all(promises);
        
        for (const { hotelId, response } of results) {
          const hotelImages = this.extractImagesFromResponse(response);
          const roomImages = this.extractRoomImagesFromResponse(response);
          
          resultMap.set(hotelId, {
            hotelImages,
            roomImages,
          });
          
          this.logger.log(`Hotel ${hotelId}: ${hotelImages.length} hotel images, ${roomImages.size} room types with images`);
          
          if (roomImages.size > 0) {
            this.logger.log(`  Room types with images: ${Array.from(roomImages.keys()).join(', ')}`);
          }
        }
      }
      
      this.logger.log(`✅ Fetched images for ${resultMap.size} hotels with room images`);
      return resultMap;
    } catch (error) {
      this.logger.error(`Failed to fetch hotel images batch: ${error.message}`);
      return resultMap;
    }
  }

  private extractImagesFromResponse(response: any): any[] {
    const images: any[] = [];
    
    try {
      if (!response?.data?.basic?.media) {
        return images;
      }
      
      for (const media of response.data.basic.media) {
        if (media.mediaScales && Array.isArray(media.mediaScales)) {
          const largest = media.mediaScales.sort((a: any, b: any) => {
            const aSize = (a.dimensions?.height || 0) * (a.dimensions?.width || 0);
            const bSize = (b.dimensions?.height || 0) * (b.dimensions?.width || 0);
            return bSize - aSize;
          })[0];
          
          if (largest?.href) {
            images.push({
              uri: largest.href,
              category: media.category || 'UNKNOWN',
              type: media.type || 'IMAGE',
              width: largest.dimensions?.width || null,
              height: largest.dimensions?.height || null,
              order: media.order || 0,
              description: media.description || null,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error extracting images: ${error.message}`);
    }
    
    return images;
  }


  private getPrimaryImageFromMedia(images: any[]): string | null {
    if (!images || images.length === 0) return null;
    
    const priorityCategories = [
      'EXTERIOR_VIEW',
      'LOBBY_VIEW', 
      'LOGO',
      'RESTAURANT',
      'BAR_OR_LOUNGE',
      'ROOM_VIEW',
      'ROOM_DETAIL',
      'BATHROOM'
    ];
    
    for (const category of priorityCategories) {
      const found = images.find(img => img.category === category);
      if (found) return found.uri;
    }
    
    return images[0]?.uri || null;
  }

  private categorizeImages(images: any[]): any {
    const categories: Record<string, string[]> = {
      EXTERIOR: [],
      LOBBY: [],
      ROOM: [],
      BATHROOM: [],
      RESTAURANT: [],
      BAR: [],
      AMENITIES: [],
      OTHER: [],
    };
    
    if (!images || images.length === 0) return categories;
    
    for (const image of images) {
      const category = image.category || 'OTHER';
      
      if (category.includes('EXTERIOR')) {
        categories.EXTERIOR.push(image.uri);
      } else if (category.includes('LOBBY')) {
        categories.LOBBY.push(image.uri);
      } else if (category.includes('ROOM') || category.includes('BED')) {
        categories.ROOM.push(image.uri);
      } else if (category.includes('BATHROOM')) {
        categories.BATHROOM.push(image.uri);
      } else if (category.includes('RESTAURANT') || category.includes('FOOD')) {
        categories.RESTAURANT.push(image.uri);
      } else if (category.includes('BAR')) {
        categories.BAR.push(image.uri);
      } else if (category.includes('POOL') || category.includes('GYM') || category.includes('SPA')) {
        categories.AMENITIES.push(image.uri);
      } else {
        categories.OTHER.push(image.uri);
      }
    }
    
    return categories;
  }
  /**
 * Extract room images from hotel content response
 */
private extractRoomImagesFromResponse(response: any): Map<string, any[]> {
  const roomImagesMap = new Map<string, any[]>();
  
  try {
    if (!response?.data) {
      return roomImagesMap;
    }
    
    let rooms: any[] = [];
    
    if (response.data.rooms && Array.isArray(response.data.rooms)) {
      rooms = response.data.rooms;
    } else if (response.data.roomTypes && Array.isArray(response.data.roomTypes)) {
      rooms = response.data.roomTypes;
    } else if (response.data.basic?.rooms && Array.isArray(response.data.basic.rooms)) {
      rooms = response.data.basic.rooms;
    }
    
    if (rooms.length === 0) return roomImagesMap;
    
    for (const room of rooms) {
      const roomType = room.type || room.roomType || room.category || 'STANDARD';
      const media = room.media || room.images || [];
      
      if (!Array.isArray(media) || media.length === 0) continue;
      
      const images: any[] = [];
      
      for (const mediaItem of media) {
        let href = null;
        
        if (mediaItem.mediaScales?.length > 0) {
          const largest = mediaItem.mediaScales.sort((a: any, b: any) => {
            const aSize = (a.dimensions?.height || 0) * (a.dimensions?.width || 0);
            const bSize = (b.dimensions?.height || 0) * (b.dimensions?.width || 0);
            return bSize - aSize;
          })[0];
          href = largest?.href;
        } else if (mediaItem.href) {
          href = mediaItem.href;
        } else if (mediaItem.url) {
          href = mediaItem.url;
        } else if (mediaItem.uri) {
          href = mediaItem.uri;
        }
        
        if (href) {
          images.push({
            uri: href,
            category: mediaItem.category || 'ROOM',
            type: 'IMAGE',
          });
        }
      }
      
      if (images.length > 0) {
        roomImagesMap.set(roomType, images);
      }
    }
    
    return roomImagesMap;
  } catch (error) {
    this.logger.error(`Error extracting room images: ${error.message}`);
    return roomImagesMap;
  }
}

/**
 * Extract all unique room types from the response
 */
private extractRoomTypesFromResponse(response: any): string[] {
  const roomTypes = new Set<string>();
  
  try {
    if (response?.data?.offers && Array.isArray(response.data.offers)) {
      for (const offer of response.data.offers) {
        if (offer.room?.type) {
          roomTypes.add(offer.room.type);
        }
      }
    }
    
    if (response?.data?.rooms && Array.isArray(response.data.rooms)) {
      for (const room of response.data.rooms) {
        if (room.type) {
          roomTypes.add(room.type);
        }
      }
    }
    
    roomTypes.add('STANDARD');
    
    return Array.from(roomTypes);
  } catch (error) {
    return ['STANDARD'];
  }
}

/**
 * Get room images for a specific room type
 */
private getRoomImagesForOffer(roomImagesMap: Map<string, any[]>, roomType: string): any[] {
  if (!roomImagesMap || roomImagesMap.size === 0) return [];
  if (!roomType) return [];
  
  // ✅ Clean the room type - remove special characters like *, -, etc.
  const cleanRoomType = roomType.replace(/^[*\-]/, '').trim();
  this.logger.debug(`Looking for images for room type: ${roomType} (cleaned: ${cleanRoomType})`);
  this.logger.debug(`Available room types: ${Array.from(roomImagesMap.keys()).join(', ')}`);
  
  // Try exact match with cleaned type
  if (roomImagesMap.has(cleanRoomType)) {
    this.logger.debug(`✅ Exact match found for ${cleanRoomType}`);
    return roomImagesMap.get(cleanRoomType) || [];
  }
  
  // Try exact match with original
  if (roomImagesMap.has(roomType)) {
    this.logger.debug(`✅ Exact match found for ${roomType}`);
    return roomImagesMap.get(roomType) || [];
  }
  
  // Try case-insensitive match
  const lowerRoomType = cleanRoomType.toLowerCase();
  for (const [key, images] of roomImagesMap) {
    if (key.toLowerCase() === lowerRoomType) {
      this.logger.debug(`✅ Case-insensitive match found for ${roomType} -> ${key}`);
      return images;
    }
  }
  
  // Try partial match
  for (const [key, images] of roomImagesMap) {
    if (cleanRoomType.includes(key) || key.includes(cleanRoomType)) {
      this.logger.debug(`✅ Partial match found for ${roomType} -> ${key}`);
      return images;
    }
  }
  
  // ✅ Try matching by bed type
  const bedTypeMap: Record<string, string[]> = {
    'K': ['KING', 'K', '1K', 'C1K', 'D1K', 'A1K', 'R1K', 'B1K', 'S1K', 'U1K', 'E1K', 'F1K'],
    'Q': ['QUEEN', 'Q', '1Q', 'C1Q', 'D1Q', 'T1Q', 'H1Q'],
    'D': ['DOUBLE', 'D', '1D', 'D1K', 'D1Q'],
    'B': ['TWIN', 'B', '1B', 'T1Q', 'T1K'],
    'T': ['TWIN', 'T', '1T', 'T1Q', 'T1K'],
    'S': ['SINGLE', 'S', '1S'],
    'RH': ['STANDARD', 'STD', 'RH', 'ROOM', 'HOTEL'],
    '1B': ['TWIN', 'B', '1B', 'STANDARD', 'STD'],
    '1D': ['DOUBLE', 'D', '1D', 'STANDARD', 'STD'],
    '1K': ['KING', 'K', '1K', 'STANDARD', 'STD'],
    '1Q': ['QUEEN', 'Q', '1Q', 'STANDARD', 'STD'],
  };
  
  for (const [bedType, patterns] of Object.entries(bedTypeMap)) {
    if (patterns.some(p => cleanRoomType.includes(p) || p.includes(cleanRoomType))) {
      for (const [key, images] of roomImagesMap) {
        if (patterns.some(p => key.includes(p) || p.includes(key))) {
          this.logger.debug(`✅ Bed type match found for ${roomType} -> ${key} (${bedType})`);
          return images;
        }
      }
    }
  }
  
  // ✅ If no match, use STANDARD images if available
  if (roomImagesMap.has('STANDARD')) {
    this.logger.debug(`✅ Using STANDARD images as fallback for ${roomType}`);
    return roomImagesMap.get('STANDARD') || [];
  }
  
  // If no room images found, return the first available images
  for (const [, images] of roomImagesMap) {
    if (images.length > 0) {
      this.logger.debug(`✅ Using first available images as fallback for ${roomType}`);
      return images;
    }
  }
  
  this.logger.debug(`❌ No images found for room type ${roomType}`);
  return [];
}

private async fetchHotelImagesBatch(hotelIds: string[]): Promise<Map<string, any[]>> {
  const imagesMap = new Map<string, any[]>();
  
  if (!hotelIds || hotelIds.length === 0) {
    return imagesMap;
  }
  
  try {
    const chunkSize = 10;
    for (let i = 0; i < hotelIds.length; i += chunkSize) {
      const chunk = hotelIds.slice(i, i + chunkSize);
    
      const promises = chunk.map(hotelId => 
        this.getHotelContent(hotelId, undefined, 'FULL')
          .then(response => ({ hotelId, response }))
          .catch(error => {
            this.logger.warn(`Failed to fetch images for hotel ${hotelId}: ${error.message}`);
            return { hotelId, response: null };
          })
      );
      
      const results = await Promise.all(promises);
      
      for (const { hotelId, response } of results) {
        const images = this.extractImagesFromResponse(response);
        imagesMap.set(hotelId, images);
      }
    }
    
    this.logger.log(`✅ Fetched images for ${imagesMap.size} hotels`);
    return imagesMap;
  } catch (error) {
    this.logger.error(`Failed to fetch hotel images batch: ${error.message}`);
    return imagesMap;
  }
}

  async repriceHotelOffer(offerId: string): Promise<any> {
    try {
      this.logger.log(`🔄 Re-pricing hotel offer: ${offerId}`);
      
      const response = await this.makeRequest(`/v3/shopping/hotel-offers/${offerId}`, {
        method: 'GET',
        params: {
          currency: 'GBP'
        }
      });
      
      this.logger.log(`✅ Re-pricing successful for offer: ${offerId}`);
      
      // ✅ Return in a consistent format
      return {
        data: {
          price: response?.data?.price || response?.price || response?.included?.price,
          id: response?.data?.id || response?.id || response?.included?.id,
          checkInDate: response?.data?.checkInDate || response?.checkInDate || response?.included?.checkInDate,
          checkOutDate: response?.data?.checkOutDate || response?.checkOutDate || response?.included?.checkOutDate,
        }
      };
    } catch (error) {
      this.logger.error(`❌ Failed to re-price offer: ${offerId}`, error);
      throw error;
    }
  }

  // ==================== HOTEL BOOKING API (v2) ====================

  async createHotelBooking(params: {
    hotelOfferId?: string;
    guests?: Array<{ title: string; firstName: string; lastName: string; phone: string; email: string }>;
    roomAssociations?: Array<{ hotelOfferId: string; guestReferences: Array<{ guestReference: string }> }>;
    payment?: { method: 'CREDIT_CARD'; paymentCard: { paymentCardInfo: any } };
    travelAgentEmail?: string;
    accommodationSpecialRequests?: string;
    price?: { currency: string; total: string; base: string; markups?: any; taxes?: any[] };
    data?: any;
  }): Promise<any> {
    let requestBody: any;
    
    if (params.data) {
      requestBody = params;
      this.logger.log('Using new Amadeus request format with data wrapper');
    } 
    else if (params.hotelOfferId && params.guests && params.roomAssociations && params.payment) {
      this.logger.log('Transforming legacy format to Amadeus structure');
      
      const travelAgentEmail = params.travelAgentEmail || this.configService.get<string>('AMADEUS_TRAVEL_AGENT_EMAIL');
      if (!travelAgentEmail?.trim()) {
        throw new HttpException('Travel agent email is required', HttpStatus.BAD_REQUEST);
      }
      
      requestBody = {
        data: {
          type: 'hotel-order',
          guests: params.guests.map((guest, index) => ({ 
            tid: (index + 1).toString(),
            title: guest.title,
            firstName: guest.firstName,
            lastName: guest.lastName,
            phone: guest.phone,
            email: guest.email,
          })),
          roomAssociations: params.roomAssociations,
          payment: params.payment,
          travelAgent: { 
            contact: { 
              email: travelAgentEmail.trim() 
            } 
          },
        },
      };
      
      if (params.accommodationSpecialRequests) {
        requestBody.data.accommodationSpecialRequests = params.accommodationSpecialRequests;
      }
      
      // ✅ FIX: Convert price strings to numbers
      if (params.price) {
        requestBody.data.price = {
          currency: params.price.currency,
          base: typeof params.price.base === 'string' ? parseFloat(params.price.base) : params.price.base,
          total: typeof params.price.total === 'string' ? parseFloat(params.price.total) : params.price.total,
        };
      }
    } 
    else {
      throw new HttpException(
        'Invalid parameters for createHotelBooking',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    this.logger.log(`📤 Sending to Amadeus: ${JSON.stringify(requestBody, null, 2)}`);
    return this.makeRequest('/v2/booking/hotel-orders', { method: 'POST', body: requestBody });
  }

  async getHotelBooking(orderId: string): Promise<any> {
    if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    return this.makeRequest(`/v2/booking/hotel-orders/${orderId}`, { method: 'GET' });
  }

  async getHotelBookingByReference(reference: string): Promise<any> {
    if (!reference) throw new HttpException('Reference is required', HttpStatus.BAD_REQUEST);
    return this.makeRequest('/v2/booking/hotel-orders/by-reference', {
      method: 'GET',
      params: { reference: reference.toUpperCase() },
    });
  }

  async cancelHotelBooking(orderId: string): Promise<any> {
    if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    return this.makeRequest(`/v2/booking/hotel-orders/${orderId}/cancellation`, {
      method: 'POST',
      body: { data: {} },
    });
  }

  async extractHotelBookingIds(providerData: any): Promise<{ hotelOrderId: string; hotelBookingId: string } | null> {
    try {
      const data = providerData?.data || providerData;
      const hotelOrderId = data?.id;
      const hotelBookingId = data?.hotelBookings?.[0]?.id;
      
      if (hotelOrderId && hotelBookingId) {
        this.logger.log(`Extracted hotel IDs - Order: ${hotelOrderId}, Booking: ${hotelBookingId}`);
        return { hotelOrderId, hotelBookingId };
      }
      this.logger.warn('Could not extract hotel booking IDs from provider data');
      return null;
    } catch (error) {
      this.logger.error('Failed to extract hotel booking IDs:', error);
      return null;
    }
  }

  async updateHotelBooking(
    hotelOrderId: string,
    hotelBookingId: string,
    updateData: {
      specialRequest?: string;
      checkInDate?: string;
      checkOutDate?: string;
      loyaltyId?: string;
      paymentCard?: {
        vendorCode: string;
        cardNumber: string;
        expiryDate: string;
        holderName?: string;
        securityCode?: string;
      };
    }
  ): Promise<any> {
    if (!hotelOrderId) {
      throw new HttpException('Hotel order ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!hotelBookingId) {
      throw new HttpException('Hotel booking ID is required', HttpStatus.BAD_REQUEST);
    }

    const requestBody: any = {
      data: {
        hotelBooking: {}
      }
    };

    if (updateData.specialRequest) {
      requestBody.data.hotelBooking.roomAssociation = {
        specialRequest: updateData.specialRequest
      };
    }

    if (updateData.checkInDate || updateData.checkOutDate) {
      requestBody.data.hotelBooking.hotelOffer = {
        product: {}
      };
      if (updateData.checkInDate) {
        requestBody.data.hotelBooking.hotelOffer.product.checkInDate = updateData.checkInDate;
      }
      if (updateData.checkOutDate) {
        requestBody.data.hotelBooking.hotelOffer.product.checkOutDate = updateData.checkOutDate;
      }
    }

    if (updateData.loyaltyId) {
      if (!requestBody.data.hotelBooking.roomAssociation) {
        requestBody.data.hotelBooking.roomAssociation = {};
      }
      requestBody.data.hotelBooking.roomAssociation.guestReferences = [{
        guestReference: "1",
        hotelLoyaltyId: updateData.loyaltyId
      }];
    }

    if (updateData.paymentCard) {
      requestBody.data.hotelBooking.payment = {
        paymentCard: {
          paymentCardInfo: {
            vendorCode: updateData.paymentCard.vendorCode,
            cardNumber: updateData.paymentCard.cardNumber,
            expiryDate: updateData.paymentCard.expiryDate,
            holderName: updateData.paymentCard.holderName,
          }
        }
      };
      
      if (updateData.paymentCard.securityCode) {
        requestBody.data.hotelBooking.payment.paymentCard.paymentCardInfo.securityCode = updateData.paymentCard.securityCode;
      }
    }

    this.logger.log(`Updating hotel booking: orderId=${hotelOrderId}, bookingId=${hotelBookingId}`);
    this.logger.debug(`Update payload: ${JSON.stringify(requestBody)}`);

    const endpoint = `/v2/booking/hotel-orders/${hotelOrderId}/hotel-bookings/${hotelBookingId}`;
    
    return this.makeRequest(endpoint, { method: 'PATCH', body: requestBody });
  }

  async updateHotelBookingSpecialRequest(
    hotelOrderId: string,
    hotelBookingId: string,
    specialRequest: string
  ): Promise<any> {
    return this.updateHotelBooking(hotelOrderId, hotelBookingId, { specialRequest });
  }

  async updateHotelBookingDates(
    hotelOrderId: string,
    hotelBookingId: string,
    checkInDate: string,
    checkOutDate: string
  ): Promise<any> {
    return this.updateHotelBooking(hotelOrderId, hotelBookingId, { checkInDate, checkOutDate });
  }

  async updateHotelBookingLoyaltyId(
    hotelOrderId: string,
    hotelBookingId: string,
    loyaltyId: string
  ): Promise<any> {
    return this.updateHotelBooking(hotelOrderId, hotelBookingId, { loyaltyId });
  }

  async cancelHotelBookingItem(
    hotelOrderId: string,
    hotelBookingId: string
  ): Promise<any> {
    if (!hotelOrderId) {
      throw new HttpException('Hotel order ID is required', HttpStatus.BAD_REQUEST);
    }
    if (!hotelBookingId) {
      throw new HttpException('Hotel booking ID is required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Cancelling hotel booking: orderId=${hotelOrderId}, bookingId=${hotelBookingId}`);
    
    const endpoint = `/v2/booking/hotel-orders/${hotelOrderId}/hotel-bookings/${hotelBookingId}/cancel`;
    
    return this.makeRequest(endpoint, { method: 'POST', body: { data: {} } });
  }

  // ==================== TRANSFERS / CAR RENTAL API (v1) ====================

  async searchTransfers(params: {
    startLocationCode?: string;
    endLocationCode?: string;
    startDateTime: string;
    passengers: number;
    transferType?: string;
    duration?: string;
    currency?: string;
    startAddressLine?: string;
    startCityName?: string;
    startCountryCode?: string;
    endAddressLine?: string;
    endCityName?: string;
    endCountryCode?: string;
  }): Promise<any> {
    const requestBody: any = {
      startDateTime: params.startDateTime,
      passengers: params.passengers,
    };
    
    if (params.startLocationCode) {
      requestBody.startLocationCode = params.startLocationCode;
    } else if (params.startAddressLine && params.startCityName && params.startCountryCode) {
      requestBody.startAddressLine = params.startAddressLine;
      requestBody.startCityName = params.startCityName;
      requestBody.startCountryCode = params.startCountryCode;
    } else {
      throw new HttpException(
        'Either startLocationCode or startAddressLine with startCityName and startCountryCode is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    if (params.endLocationCode) {
      requestBody.endLocationCode = params.endLocationCode;
    } else if (params.endAddressLine && params.endCityName && params.endCountryCode) {
      requestBody.endAddressLine = params.endAddressLine;
      requestBody.endCityName = params.endCityName;
      requestBody.endCountryCode = params.endCountryCode;
    } else if (params.startLocationCode) {
      requestBody.endLocationCode = params.startLocationCode;
    } else {
      throw new HttpException(
        'Either endLocationCode or endAddressLine with endCityName and endCountryCode is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    
    if (params.transferType) requestBody.transferType = params.transferType;
    if (params.duration) requestBody.duration = params.duration;
    if (params.currency) requestBody.currency = params.currency;
    
    this.logger.log(`Transfers request: ${JSON.stringify(requestBody)}`);
    
    return this.makeRequest('/v1/shopping/transfer-offers', { 
      method: 'POST', 
      body: requestBody,
      useAmadeusJson: true, 
    });
  }

  async createTransferBooking(params: {
    offerId: string;
    passengers: Array<{
      name: { title: string; firstName: string; lastName: string };
      contact: { phone: string; email: string };
    }>;
    payment?: {
      methodOfPayment: 'CREDIT_CARD' | 'INVOICE';
      creditCard?: {
        vendorCode: string;      // VI, MC, AX, etc.
        cardNumber: string;
        holderName: string;
        expiryDate: string;      // YYYY-MM
        cvv?: string;
      };
      paymentReference?: string; // For INVOICE method
    };
    billingAddress?: {
      line?: string;
      zip?: string;
      cityName?: string;
      countryCode?: string;
    };
    flightNumber?: string;
    specialRequests?: string;
  }): Promise<any> {
    // ✅ Build request with proper passenger structure
    const requestBody: any = {
      data: {
        offerId: params.offerId,
        passengers: params.passengers.map((p, index) => ({
          id: (index + 1).toString(), // ✅ Add passenger ID
          name: {
            title: p.name.title,
            firstName: p.name.firstName,
            lastName: p.name.lastName,
          },
          contact: {
            phoneNumber: p.contact.phone,
            email: p.contact.email,
          },
        })),
      },
    };
  
    // ✅ Add payment if provided
    if (params.payment) {
      const paymentData: any = {
        methodOfPayment: params.payment.methodOfPayment,
      };
  
      if (params.payment.methodOfPayment === 'CREDIT_CARD' && params.payment.creditCard) {
        paymentData.creditCard = {
          vendorCode: params.payment.creditCard.vendorCode,
          cardNumber: params.payment.creditCard.cardNumber,
          holderName: params.payment.creditCard.holderName,
          expiryDate: params.payment.creditCard.expiryDate,
        };
        if (params.payment.creditCard.cvv) {
          paymentData.creditCard.cvv = params.payment.creditCard.cvv;
        }
      }
  
      if (params.payment.methodOfPayment === 'INVOICE' && params.payment.paymentReference) {
        paymentData.paymentReference = params.payment.paymentReference;
      }
  
      requestBody.data.payment = paymentData;
    }
  
    // ✅ Add billing address if provided
    if (params.billingAddress) {
      requestBody.data.billingAddress = {};
      if (params.billingAddress.line) requestBody.data.billingAddress.line = params.billingAddress.line;
      if (params.billingAddress.zip) requestBody.data.billingAddress.zip = params.billingAddress.zip;
      if (params.billingAddress.cityName) requestBody.data.billingAddress.cityName = params.billingAddress.cityName;
      if (params.billingAddress.countryCode) requestBody.data.billingAddress.countryCode = params.billingAddress.countryCode;
    }
  
    // ✅ Add flight number if provided
    if (params.flightNumber) {
      requestBody.data.flightNumber = params.flightNumber;
    }
  
    // ✅ Add special requests if provided
    if (params.specialRequests) {
      requestBody.data.specialRequests = params.specialRequests;
    }
  
    this.logger.log(`📤 Sending transfer booking to Amadeus: ${JSON.stringify(requestBody, null, 2)}`);
  
    const response = await this.makeRequest('/v1/ordering/transfer-orders', {
      method: 'POST',
      body: requestBody,
      useAmadeusJson: true, 
    });
  
    this.logger.log(`✅ Amadeus transfer booking response: ${JSON.stringify(response, null, 2)}`);
  
    return response;
  }

  async getTransferBooking(orderId: string): Promise<any> {
    if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    return this.makeRequest(`/v1/ordering/transfer-orders/${orderId}`, { 
      method: 'GET',
      useAmadeusJson: true, 
    });
  }

  async getTransferBookingByPNR(params: { pnr: string; firstName: string; lastName: string }): Promise<any> {
    if (!params.pnr || !params.firstName || !params.lastName) {
      throw new HttpException('PNR, first name, and last name are required', HttpStatus.BAD_REQUEST);
    }
    
    return this.makeRequest('/v1/ordering/transfer-orders/retrieve', {
      method: 'POST',
      body: { pnr: params.pnr.toUpperCase(), firstName: params.firstName, lastName: params.lastName },
      useAmadeusJson: true, 
    });
  }

  async createTransferBookingOnExistingOrder(
    orderId: string,
    params: {
      offerId: string;
      passengers: Array<{
        name: { title: string; firstName: string; lastName: string };
        contact: { phone: string; email: string };
      }>;
      payment?: {
        methodOfPayment: 'CREDIT_CARD' | 'INVOICE';
        creditCard?: {
          vendorCode: string;
          cardNumber: string;
          holderName: string;
          expiryDate: string;
          cvv?: string;
        };
        paymentReference?: string;
      };
    }
  ): Promise<any> {
    if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    
    const requestBody: any = {
      data: {
        offerId: params.offerId,
        passengers: params.passengers.map((p, index) => ({
          id: (index + 1).toString(),
          name: {
            title: p.name.title,
            firstName: p.name.firstName,
            lastName: p.name.lastName,
          },
          contact: {
            phoneNumber: p.contact.phone,
            email: p.contact.email,
          },
        })),
      },
    };
  
    // ✅ Add payment if provided
    if (params.payment) {
      const paymentData: any = {
        methodOfPayment: params.payment.methodOfPayment,
      };
  
      if (params.payment.methodOfPayment === 'CREDIT_CARD' && params.payment.creditCard) {
        paymentData.creditCard = {
          vendorCode: params.payment.creditCard.vendorCode,
          cardNumber: params.payment.creditCard.cardNumber,
          holderName: params.payment.creditCard.holderName,
          expiryDate: params.payment.creditCard.expiryDate,
        };
        if (params.payment.creditCard.cvv) {
          paymentData.creditCard.cvv = params.payment.creditCard.cvv;
        }
      }
  
      if (params.payment.methodOfPayment === 'INVOICE' && params.payment.paymentReference) {
        paymentData.paymentReference = params.payment.paymentReference;
      }
  
      requestBody.data.payment = paymentData;
    }
  
    return this.makeRequest(`/v1/ordering/transfer-orders/${orderId}`, {
      method: 'POST',
      body: requestBody,
      useAmadeusJson: true, 
    });
  }


async cancelTransfer(orderId: string): Promise<any> {
  if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
  return this.makeRequest(`/v1/ordering/transfer-orders/${orderId}/transfers/cancellation`, { 
    method: 'POST',
    body: {},
    useAmadeusJson: true, 
  });
}

  async listTransferBookings(params?: { page?: number; limit?: number }): Promise<any> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    
    return this.makeRequest('/v1/ordering/transfer-orders', { 
      method: 'GET', 
      params: queryParams,
      useAmadeusJson: true, 
    });
  }
}