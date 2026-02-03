import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AmadeusService {
  private readonly logger = new Logger(AmadeusService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AMADEUS_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('AMADEUS_API_SECRET') || '';
    
    // Use test environment by default, production when AMADEUS_ENV=production
    const env = this.configService.get<string>('AMADEUS_ENV') || 'test';
    this.baseUrl = env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('Amadeus API credentials not configured. Hotel/transfer features will not work.');
    }
  }

  /**
   * Get OAuth 2.0 access token
   * Amadeus uses OAuth 2.0 for authentication
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    if (!this.apiKey || !this.apiSecret) {
      throw new HttpException(
        'Amadeus API credentials not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Failed to get Amadeus access token: ${response.status} ${errorText}`,
          HttpStatus.UNAUTHORIZED,
        );
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Token expires in data.expires_in seconds, refresh 5 minutes early
      this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;

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

  /**
   * Make authenticated request to Amadeus API
   */
  private async makeRequest(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Amadeus API error: ${response.status}`;
        let errorDetails: any[] = [];

        try {
          const errorJson = JSON.parse(errorText);
          // Amadeus Errors structure: { errors: [{ status, code, title, detail, source, documentation }] }
          if (errorJson.errors && Array.isArray(errorJson.errors) && errorJson.errors.length > 0) {
            errorDetails = errorJson.errors.map((e: any) => ({
              status: e.status || response.status,
              code: e.code,
              title: e.title,
              detail: e.detail,
              source: e.source || {},
              documentation: e.documentation,
            }));

            // Build user-friendly error message from first error
            const firstError = errorJson.errors[0];
            errorMessage = firstError.detail || firstError.title || errorMessage;
          } else {
            errorMessage += ` - ${errorText}`;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        // Map HTTP status codes based on Amadeus error codes
        let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        if (response.status === 401 || response.status === 403) {
          httpStatus = HttpStatus.UNAUTHORIZED;
        } else if (response.status === 400 || response.status === 422) {
          httpStatus = HttpStatus.BAD_REQUEST;
        } else if (response.status === 404) {
          httpStatus = HttpStatus.NOT_FOUND;
        } else if (response.status >= 500) {
          httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
        }

        // Map specific Amadeus error codes to appropriate HTTP status
        if (errorDetails.length > 0) {
          const errorCode = errorDetails[0].code;
          // Common Amadeus error codes that should be 400 Bad Request
          const badRequestCodes = [
            61, // INVALID CURRENCY CODE
            137, // INVALID ADULTS OCCUPANCY REQUESTED
            145, // DURATION PERIOD OR DATES INCORRECT
            381, // INVALID CHECK-IN DATE
            382, // INVALID CHECK-OUT DATE
            383, // INVALID CITY CODE
            392, // INVALID HOTEL CODE
            397, // INVALID NUMBER OF ADULTS
            400, // INVALID PROPERTY CODE
            404, // CHECK_OUT DATE MUST BE FURTHER IN THE FUTURE THAN CHECK-IN DATE
          ];
          if (badRequestCodes.includes(errorCode)) {
            httpStatus = HttpStatus.BAD_REQUEST;
          }
        }

        throw new HttpException(
          {
            message: errorMessage,
            error: response.status === 403 
              ? 'Feature not available' 
              : response.status === 401 
                ? 'Authentication failed'
                : 'API error',
            statusCode: httpStatus,
            errors: errorDetails.length > 0 ? errorDetails : undefined,
          },
          httpStatus,
        );
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

  // ==================== HOTEL APIs ====================

  /**
   * Search hotels by location and dates
   * GET /v3/shopping/hotel-offers
   * Note: Uses v3 API (newer version)
   */
  async searchHotels(params: {
    hotelIds: string[]; // Required - Amadeus v3 requires hotelIds (cityCode not supported)
    checkInDate: string; // YYYY-MM-DD
    checkOutDate: string; // YYYY-MM-DD
    adults?: number; // 1-9, default 1
    roomQuantity?: number; // 1-9, default 1
    countryOfResidence?: string; // ISO 3166-1
    priceRange?: string; // e.g., "200-300" or "-300" or "100"
    currency?: string; // Required if priceRange is set
    paymentPolicy?: 'GUARANTEE' | 'DEPOSIT' | 'NONE'; // default NONE
    boardType?: 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';
    includeClosed?: boolean; // Show sold out properties
    bestRateOnly?: boolean; // Only cheapest offer per hotel, default true
    lang?: string; // e.g., "EN", "fr-FR"
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
    };

    // hotelIds is required in Amadeus v3 (cityCode is not supported)
    if (!params.hotelIds || params.hotelIds.length === 0) {
      throw new HttpException(
        'hotelIds is required for Amadeus v3 hotel search. Use Hotel List API to get hotel IDs by city first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    queryParams.hotelIds = params.hotelIds.join(',');

    if (params.adults) queryParams.adults = params.adults.toString();
    if (params.roomQuantity) queryParams.roomQuantity = params.roomQuantity.toString();
    if (params.countryOfResidence) queryParams.countryOfResidence = params.countryOfResidence;
    if (params.priceRange) {
      queryParams.priceRange = params.priceRange;
      if (params.currency) queryParams.currency = params.currency;
    }
    if (params.currency && !params.priceRange) queryParams.currency = params.currency;
    if (params.paymentPolicy) queryParams.paymentPolicy = params.paymentPolicy;
    if (params.boardType) queryParams.boardType = params.boardType;
    if (params.includeClosed !== undefined) queryParams.includeClosed = params.includeClosed.toString();
    if (params.bestRateOnly !== undefined) queryParams.bestRateOnly = params.bestRateOnly.toString();
    if (params.lang) queryParams.lang = params.lang;

    return this.makeRequest('/v3/shopping/hotel-offers', {
      method: 'GET',
      params: queryParams,
    });
  }

  /**
   * Get hotel offer pricing by offer ID
   * GET /v3/shopping/hotel-offers/{offerId}
   */
  async getHotelOfferPricing(params: {
    offerId: string;
    lang?: string;
  }): Promise<any> {
    const queryParams: Record<string, string> = {};
    if (params.lang) queryParams.lang = params.lang;

    return this.makeRequest(`/v3/shopping/hotel-offers/${params.offerId}`, {
      method: 'GET',
      params: queryParams,
    });
  }

  /**
   * Create hotel booking
   * POST /v1/booking/hotel-bookings
   */
  async createHotelBooking(params: {
    offerId: string;
    guests: Array<{
      name: {
        title: string; // MR, MRS, MS, etc.
        firstName: string;
        lastName: string;
      };
      contact: {
        phone: string;
        email: string;
      };
    }>;
    payments: Array<{
      method: string; // CREDIT_CARD, etc.
      card?: {
        vendorCode: string;
        cardNumber: string;
        expiryDate: string; // YYYY-MM
      };
    }>;
    rooms: Array<{
      guests: Array<{
        lastName: string;
        firstName: string;
      }>;
    }>;
  }): Promise<any> {
    return this.makeRequest('/v1/booking/hotel-bookings', {
      method: 'POST',
      body: {
        data: {
          offerId: params.offerId,
          guests: params.guests,
          payments: params.payments,
          rooms: params.rooms,
        },
      },
    });
  }

  /**
   * Hotel name autocomplete
   * GET /v1/reference-data/locations/hotel
   */
  async searchHotelNames(params: {
    keyword: string;
    subType?: string; // HOTEL_GD, etc.
    countryCode?: string;
    page?: {
      limit?: number;
      offset?: number;
    };
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      keyword: params.keyword,
    };

    if (params.subType) queryParams.subType = params.subType;
    if (params.countryCode) queryParams.countryCode = params.countryCode;
    if (params.page?.limit) queryParams['page[limit]'] = params.page.limit.toString();
    if (params.page?.offset) queryParams['page[offset]'] = params.page.offset.toString();

    return this.makeRequest('/v1/reference-data/locations/hotel', {
      method: 'GET',
      params: queryParams,
    });
  }

  /**
   * Get hotel list by city
   * GET /v1/reference-data/locations/hotels/by-city
   */
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
    const queryParams: Record<string, string> = {
      cityCode: params.cityCode,
    };

    if (params.hotelIds && params.hotelIds.length > 0) {
      queryParams.hotelIds = params.hotelIds.join(',');
    }
    if (params.amenities && params.amenities.length > 0) {
      queryParams.amenities = params.amenities.join(',');
    }
    if (params.ratings && params.ratings.length > 0) {
      queryParams.ratings = params.ratings.join(',').toString();
    }
    if (params.chainCodes && params.chainCodes.length > 0) {
      queryParams.chainCodes = params.chainCodes.join(',');
    }
    if (params.radius) {
      queryParams.radius = params.radius.toString();
    }
    if (params.radiusUnit) {
      queryParams.radiusUnit = params.radiusUnit;
    }
    if (params.hotelSource) {
      queryParams.hotelSource = params.hotelSource;
    }

    return this.makeRequest('/v1/reference-data/locations/hotels/by-city', {
      method: 'GET',
      params: queryParams,
    });
  }

  /**
   * Get hotel list by geographic coordinates
   * GET /v1/reference-data/locations/hotels/by-geocode
   */
  async getHotelsByGeocode(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    radiusUnit?: 'KM' | 'MILE';
    chainCodes?: string[];
    amenities?: string[];
    ratings?: number[];
    hotelSource?: 'BEDBANK' | 'DIRECTCHAIN' | 'ALL';
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
    };

    if (params.radius) {
      queryParams.radius = params.radius.toString();
    }
    if (params.radiusUnit) {
      queryParams.radiusUnit = params.radiusUnit;
    }
    if (params.chainCodes && params.chainCodes.length > 0) {
      queryParams.chainCodes = params.chainCodes.join(',');
    }
    if (params.amenities && params.amenities.length > 0) {
      queryParams.amenities = params.amenities.join(',');
    }
    if (params.ratings && params.ratings.length > 0) {
      queryParams.ratings = params.ratings.join(',').toString();
    }
    if (params.hotelSource) {
      queryParams.hotelSource = params.hotelSource;
    }

    return this.makeRequest('/v1/reference-data/locations/hotels/by-geocode', {
      method: 'GET',
      params: queryParams,
    });
  }

  /**
   * Get hotel list by hotel IDs
   * GET /v1/reference-data/locations/hotels/by-hotels
   */
  async getHotelsByIds(params: {
    hotelIds: string[];
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      hotelIds: params.hotelIds.join(','),
    };

    return this.makeRequest('/v1/reference-data/locations/hotels/by-hotels', {
      method: 'GET',
      params: queryParams,
    });
  }

  /**
   * Get hotel ratings/sentiments
   * GET /v2/e-reputation/hotel-sentiments
   */
  async getHotelRatings(params: {
    hotelIds: string[];
  }): Promise<any> {
    const queryParams: Record<string, string> = {
      hotelIds: params.hotelIds.join(','),
    };

    return this.makeRequest('/v2/e-reputation/hotel-sentiments', {
      method: 'GET',
      params: queryParams,
    });
  }

  // ==================== TRANSFER APIs ====================

  /**
   * Search transfer offers
   * POST /v1/shopping/transfer-offers
   */
  async searchTransfers(params: {
    originLocationCode: string; // Airport or location code
    destinationLocationCode?: string; // Optional destination
    departureDateTime: string; // ISO 8601
    returnDateTime?: string; // ISO 8601
    passengers: number;
    vehicleTypes?: string[]; // SEDAN, SUV, VAN, etc.
    includedServices?: string[];
  }): Promise<any> {
    return this.makeRequest('/v1/shopping/transfer-offers', {
      method: 'POST',
      body: {
        data: {
          originLocationCode: params.originLocationCode,
          ...(params.destinationLocationCode && {
            destinationLocationCode: params.destinationLocationCode,
          }),
          departureDateTime: params.departureDateTime,
          ...(params.returnDateTime && { returnDateTime: params.returnDateTime }),
          passengers: params.passengers,
          ...(params.vehicleTypes && { vehicleTypes: params.vehicleTypes }),
          ...(params.includedServices && { includedServices: params.includedServices }),
        },
      },
    });
  }

  /**
   * Create transfer booking
   * POST /v1/ordering/transfer-orders
   */
  async createTransferBooking(params: {
    offerId: string;
    passengers: Array<{
      name: {
        title: string;
        firstName: string;
        lastName: string;
      };
      contact: {
        phone: string;
        email: string;
      };
    }>;
    payments: Array<{
      method: string;
      card?: {
        vendorCode: string;
        cardNumber: string;
        expiryDate: string;
      };
    }>;
  }): Promise<any> {
    return this.makeRequest('/v1/ordering/transfer-orders', {
      method: 'POST',
      body: {
        data: {
          offerId: params.offerId,
          passengers: params.passengers,
          payments: params.payments,
        },
      },
    });
  }

  /**
   * Cancel transfer booking
   * POST /v1/ordering/transfer-orders/{orderId}/transfers/cancellation
   */
  async cancelTransfer(orderId: string): Promise<any> {
    return this.makeRequest(
      `/v1/ordering/transfer-orders/${orderId}/transfers/cancellation`,
      {
        method: 'POST',
      },
    );
  }
}

