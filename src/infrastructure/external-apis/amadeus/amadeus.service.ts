import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { redactCardFromString } from '@common/utils/pci-redaction.util';

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

  constructor(private readonly configService: ConfigService) {
    // Enterprise credentials
    this.apiKey = this.configService.get<string>('AMADEUS_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('AMADEUS_API_SECRET') || '';
    
    // Enterprise Office credentials (from TestSAP)
    this.officeId = this.configService.get<string>('AMADEUS_OFFICE_ID') || 'LOSN8250A';
    this.orgId = this.configService.get<string>('AMADEUS_ORG_ID') || 'NMC-NIGERI';
    this.userId = this.configService.get<string>('AMADEUS_USER_ID') || 'USE9BAQC';
    
    // Enterprise base URL (includes "travel." for Enterprise APIs)
    const env = this.configService.get<string>('AMADEUS_ENV') || 'test';
    this.baseUrl = env === 'production' 
      ? 'https://travel.api.amadeus.com'       // Enterprise production
      : 'https://test.travel.api.amadeus.com';  // Enterprise test
    
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Amadeus API credentials not configured. Features will not work.');
    }
    
    this.logger.log(`AmadeusService initialized with base URL: ${this.baseUrl}`);
    this.logger.log(`Office ID: ${this.officeId}, Org ID: ${this.orgId}, User ID: ${this.userId}`);
  }

  // ==================== AUTHENTICATION ====================
  
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      this.logger.debug('Using cached access token');
      return this.accessToken;
    }

    if (!this.apiKey || !this.apiSecret) {
      throw new HttpException(
        'Amadeus API credentials not configured. Set AMADEUS_API_KEY and AMADEUS_API_SECRET.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      this.logger.log('Requesting Amadeus OAuth token...');
      this.logger.debug(`Token endpoint: ${this.baseUrl}/v1/security/oauth2/token`);
      
      const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OAuth failed: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Invalid Amadeus credentials. Please check your AMADEUS_API_KEY and AMADEUS_API_SECRET.',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Failed to get Amadeus access token: ${response.status} - ${errorText}`,
          HttpStatus.UNAUTHORIZED,
        );
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
      
      this.logger.log('Amadeus OAuth token obtained successfully');
      return this.accessToken;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to authenticate with Amadeus: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    } = {},
  ): Promise<any> {
    const token = await this.getAccessToken();
    const { method = 'GET', body, params } = options;
    
    let url = `${this.baseUrl}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'X-Office-Id': this.officeId,
      'X-Organization-Id': this.orgId,
      'X-User-Id': this.userId,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      headers['Content-Type'] = 'application/json';
    }

    this.logger.debug(`Amadeus API ${method} ${endpoint}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Amadeus API error ${response.status} ${endpoint}: ${redactCardFromString(errorText, 500)}`);
        
        let errorMessage = `Amadeus API error: ${response.status}`;
        let errorDetails: any[] = [];
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
            errorDetails = errorJson.errors;
            const firstError = errorJson.errors[0];
            errorMessage = firstError.detail || firstError.title || errorMessage;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // Use default error message
        }

        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401 || response.status === 403) {
          httpStatus = HttpStatus.UNAUTHORIZED;
          this.accessToken = null;
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        }

        throw new HttpException(
          {
            message: errorMessage,
            statusCode: httpStatus,
            errors: errorDetails,
          },
          httpStatus,
        );
      }

      if (response.status === 204) {
        return { success: true };
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Amadeus API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== HOTEL LIST API (v1) ====================
  
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
  }): Promise<any> {
    const queryParams: Record<string, string> = { cityCode: params.cityCode };
    if (params.hotelIds?.length) queryParams.hotelIds = params.hotelIds.join(',');
    if (params.amenities?.length) queryParams.amenities = params.amenities.join(',');
    if (params.ratings?.length) queryParams.ratings = params.ratings.join(',');
    if (params.chainCodes?.length) queryParams.chainCodes = params.chainCodes.join(',');
    if (params.radius) queryParams.radius = params.radius.toString();
    if (params.radiusUnit) queryParams.radiusUnit = params.radiusUnit;
    if (params.hotelSource) queryParams.hotelSource = params.hotelSource;
    
    return this.makeRequest('/v1/reference-data/locations/hotels/by-city', { method: 'GET', params: queryParams });
  }

  async getHotelsByGeocode(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    radiusUnit?: 'KM' | 'MILE';
    chainCodes?: string[];
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
    };
    if (params.radius) queryParams.radius = params.radius.toString();
    if (params.radiusUnit) queryParams.radiusUnit = params.radiusUnit;
    if (params.chainCodes?.length) queryParams.chainCodes = params.chainCodes.join(',');
    
    return this.makeRequest('/v1/reference-data/locations/hotels/by-geocode', { method: 'GET', params: queryParams });
  }

  async getHotelsByIds(params: { hotelIds: string[] }): Promise<any> {
    return this.makeRequest('/v1/reference-data/locations/hotels/by-hotels', {
      method: 'GET',
      params: { hotelIds: params.hotelIds.join(',') },
    });
  }

  async getHotelRatings(params: { hotelIds: string[] }): Promise<any> {
    return this.makeRequest('/v2/e-reputation/hotel-sentiments', {
      method: 'GET',
      params: { hotelIds: params.hotelIds.join(',') },
    });
  }

  // ==================== HOTEL CONTENT & IMAGES API (v3) ====================
  
  /**
   * Get hotel content including images, descriptions, amenities, etc.
   * @param hotelId - The hotel ID (e.g., "WHLON464")
   * @param fields - Optional categories to retrieve
   * @param view - Either "LIGHT" or "FULL"
   */
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

  /**
   * Get hotel basic information only
   */
  async getHotelBasicInfo(hotelId: string): Promise<any> {
    return this.getHotelContent(hotelId, ['basic'], 'LIGHT');
  }

  /**
   * Get complete hotel details including all content (descriptions, amenities, etc.)
   */
  async getHotelFullDetails(hotelId: string): Promise<any> {
    return this.getHotelContent(hotelId, undefined, 'FULL');
  }

  /**
   * Extract and return all image URLs from hotel content
   * @param hotelId - The hotel ID
   * @returns Array of image URLs
   */
  async getHotelImageUrls(hotelId: string): Promise<string[]> {
    try {
      const response = await this.getHotelContent(hotelId, undefined, 'FULL');
      const images: string[] = [];
      
      if (response?.data?.basic?.media && Array.isArray(response.data.basic.media)) {
        for (const media of response.data.basic.media) {
          if (media.mediaScales && Array.isArray(media.mediaScales) && media.mediaScales.length > 0) {
            // Get the largest image from mediaScales
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

  /**
   * Get the primary image URL for a hotel (best representative image)
   * Priority: EXTERIOR_VIEW > LOBBY_VIEW > LOGO > RESTAURANT > BAR_OR_LOUNGE > any
   * @param hotelId - The hotel ID
   * @returns Primary image URL or null
   */
  async getHotelPrimaryImageUrl(hotelId: string): Promise<string | null> {
    try {
      const response = await this.getHotelContent(hotelId, undefined, 'FULL');
      
      if (response?.data?.basic?.media && Array.isArray(response.data.basic.media)) {
        // Priority order for primary image
        const priorityCategories = ['EXTERIOR_VIEW', 'LOBBY_VIEW', 'LOGO', 'RESTAURANT', 'BAR_OR_LOUNGE'];
        
        for (const category of priorityCategories) {
          const mediaItem = response.data.basic.media.find(
            (m: any) => m.category === category && m.mediaScales?.length > 0
          );
          
          if (mediaItem?.mediaScales?.length > 0) {
            // Get the largest image
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
        
        // Fallback: return first image from any category
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

  /**
   * Get complete hotel details with images (content + images combined)
   * This is the main method to use for hotel detail pages
   * @param hotelId - The hotel ID
   * @returns Complete hotel details including content and images
   */
  async getCompleteHotelDetails(hotelId: string): Promise<any> {
    try {
      this.logger.log(`Fetching complete hotel details for ${hotelId}`);
      
      // Fetch content and images in parallel
      const [contentResponse, imageUrls, primaryImage] = await Promise.all([
        this.getHotelFullDetails(hotelId),
        this.getHotelImageUrls(hotelId),
        this.getHotelPrimaryImageUrl(hotelId),
      ]);
      
      // Extract the basic hotel data
      const hotelData = contentResponse?.data?.basic || contentResponse?.data || contentResponse;
      
      return {
        success: true,
        data: {
          hotelId,
          name: hotelData?.name || null,
          chainCode: hotelData?.chainCode || null,
          chainName: hotelData?.chainName || null,
          description: hotelData?.description || null,
          address: hotelData?.contact?.[0]?.address || null,
          contact: hotelData?.contact || null,
          location: hotelData?.location || null,
          media: hotelData?.media || null,
          images: imageUrls,
          primaryImage: primaryImage,
          amenities: hotelData?.amenities || null,
          policies: hotelData?.policies || null,
          checkInOut: {
            checkIn: hotelData?.checkInOut?.checkIn || '15:00',
            checkOut: hotelData?.checkInOut?.checkOut || '12:00',
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

// ==================== HOTEL SEARCH API (v3) ====================
  
async searchHotels(params: {
  hotelIds?: string[];
  cityCode?: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  roomQuantity?: number;
  currency?: string;
  bestRateOnly?: boolean;
}): Promise<any> {
  // Validate that at least one search method is provided
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
  
  return this.makeRequest('/v3/shopping/hotel-offers', { method: 'GET', params: queryParams });
}

  // ==================== HOTEL BOOKING API (v2) ====================
  
  async createHotelBooking(params: {
    hotelOfferId: string;
    guests: Array<{ title: string; firstName: string; lastName: string; phone: string; email: string }>;
    roomAssociations: Array<{ hotelOfferId: string; guestReferences: Array<{ guestReference: string }> }>;
    payment: {
      method: 'CREDIT_CARD';
      paymentCard: { paymentCardInfo: { vendorCode: string; cardNumber: string; expiryDate: string; holderName?: string; securityCode?: string } };
    };
    travelAgentEmail?: string;
    accommodationSpecialRequests?: string;
  }): Promise<any> {
    const travelAgentEmail = params.travelAgentEmail || this.configService.get<string>('AMADEUS_TRAVEL_AGENT_EMAIL');
    if (!travelAgentEmail?.trim()) {
      throw new HttpException('Travel agent email is required', HttpStatus.BAD_REQUEST);
    }
    
    const requestBody = {
      data: {
        type: 'hotel-order',
        guests: params.guests.map((guest, index) => ({ tid: index + 1, ...guest })),
        roomAssociations: params.roomAssociations,
        payment: params.payment,
        travelAgent: { contact: { email: travelAgentEmail.trim() } },
      },
    };
    
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
    
    return this.makeRequest('/v1/shopping/transfer-offers', { method: 'POST', body: requestBody });
  }

  async createTransferBooking(params: {
    offerId: string;
    passengers: Array<{
      name: { title: string; firstName: string; lastName: string };
      contact: { phone: string; email: string };
    }>;
    payments: Array<{ method: string; card?: { vendorCode: string; cardNumber: string; expiryDate: string } }>;
  }): Promise<any> {
    return this.makeRequest('/v1/ordering/transfer-orders', {
      method: 'POST',
      body: { data: { offerId: params.offerId, passengers: params.passengers, payments: params.payments } },
    });
  }

  async getTransferBooking(orderId: string): Promise<any> {
    if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    return this.makeRequest(`/v1/ordering/transfer-orders/${orderId}`, { method: 'GET' });
  }

  async getTransferBookingByPNR(params: { pnr: string; firstName: string; lastName: string }): Promise<any> {
    if (!params.pnr || !params.firstName || !params.lastName) {
      throw new HttpException('PNR, first name, and last name are required', HttpStatus.BAD_REQUEST);
    }
    
    return this.makeRequest('/v1/ordering/transfer-orders/retrieve', {
      method: 'POST',
      body: { pnr: params.pnr.toUpperCase(), firstName: params.firstName, lastName: params.lastName },
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
      payments: Array<{ method: string; card?: { vendorCode: string; cardNumber: string; expiryDate: string } }>;
    }
  ): Promise<any> {
    if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    
    return this.makeRequest(`/v1/ordering/transfer-orders/${orderId}`, {
      method: 'POST',
      body: { data: { offerId: params.offerId, passengers: params.passengers, payments: params.payments } },
    });
  }

  async cancelTransfer(orderId: string): Promise<any> {
    if (!orderId) throw new HttpException('Order ID is required', HttpStatus.BAD_REQUEST);
    return this.makeRequest(`/v1/ordering/transfer-orders/${orderId}/transfers/cancellation`, { method: 'POST' });
  }

  async listTransferBookings(params?: { page?: number; limit?: number }): Promise<any> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    
    return this.makeRequest('/v1/ordering/transfer-orders', { method: 'GET', params: queryParams });
  }
}
