import { Injectable, HttpException, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

export interface WakanowTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  Identifier: string;
  Name: string;
  AgentType: string;
  Market: string;
  Services: string;
  Currencies: string;
  issued: string;
  expires: string;
}

export interface WakanowAirport {
  AirportCode: string;
  AirportName: string;
  CityCountry: string;
  City: string;
  Country: string;
}

export interface WakanowItinerary {
  Departure: string;
  Destination: string;
  DepartureDate: string;   // MM/DD/YYYY format
  Ticketclass?: string;
}

export interface WakanowSearchRequest {
  FlightSearchType: 'Oneway' | 'Return' | 'Multidestination';
  Ticketclass: string;     // F, C, W, Y
  Adults: number;
  Children: number;
  Infants: number;
  Itineraries: WakanowItinerary[];
  TargetCurrency: string;
}

export interface WakanowFreeBaggage {
  BagCount: number;
  Weight: number;
  WeightUnit: string | null;
}

export interface WakanowFlightLeg {
  FlightLegNumber: string;
  DepartureCode: string;
  DepartureName: string;
  DestinationCode: string;
  DestinationName: string;
  StartTime: string;
  EndTime: string;
  Duration: string;
  IsStop: boolean;
  Layover: string | null;
  LayoverDuration: string;
  BookingClass: string;
  CabinClass: string;
  CabinClassName: string;
  OperatingCarrier: string;
  OperatingCarrierName: string;
  MarketingCarrier: string;
  FlightNumber: string;
  Aircraft: string;
  FareType: string;
  FarebasisCode: string;
  Status: string | null;
  CorporateCode: string | null;
  FlightSelectData: string | null;
  TechnicalStops: any[];
  Seats: any | null;
}

export interface WakanowFlightModel {
  Name: string;
  Airline: string;
  AirlineName: string;
  DepartureCode: string;
  DepartureName: string;
  DepartureTime: string;
  ArrivalName: string;
  ArrivalCode: string;
  ArrivalTime: string;
  Stops: number;
  StopTime: string;
  TripDuration: string;
  StopCity: string | null;
  FlightLegs: WakanowFlightLeg[];
  AirlineLogoUrl: string;
  FreeBaggage: WakanowFreeBaggage | null;
}

export interface WakanowPrice {
  Amount: number;
  CurrencyCode: string;
}

export interface WakanowPriceDetail {
  BaseFare: WakanowPrice;
  Tax: WakanowPrice;
  PassengerType: string;
}

export interface WakanowFlightCombination {
  FlightModels: WakanowFlightModel[];
  Price: WakanowPrice;
  MarketingCarrier: string;
  Adults: number;
  Children: number;
  Infants: number;
  PriceDetails: WakanowPriceDetail[];
  FareRules: string[];
  PenaltyRules: string[] | null;
  AirlineCode: string | null;
  IsRefundable: boolean;
  NonRefundableFreeText: string;
  IncludePaySmallSmall: boolean;
  DownPaymentDetailInPercentage: number;
  PaySmallSmallLockDownPrice: number;
  ConnectionCode: string;
}

export interface WakanowSearchResult {
  FlightCombination: WakanowFlightCombination;
  SelectData: string;
}

export interface WakanowSelectRequest {
  SelectData: string;
  TargetCurrency: string;
}

export interface WakanowCustomMessage {
  Title: string;
  Message: string;
  SeverityLevel: string;
}

export interface WakanowSelectResponse {
  FlightSummaryModel: {
    FlightCombination: WakanowFlightCombination;
    PriceBreakups: any | null;
  };
  IsPriceMatched: boolean;
  HasResult: boolean;
  SelectData: string;
  ProductTermsAndConditions: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  };
  BookingId: string;
  IsPassportRequired: boolean;
  CustomMessages: WakanowCustomMessage[];
}

export interface WakanowPassengerDetail {
  PassengerType: string;     // Adult, Child, Infant
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  DateOfBirth: string;      // YYYY-MM-DD
  Age?: number;
  PhoneNumber: string;      // E.164 format with +
  PassportNumber?: string;
  ExpiryDate?: string;      // YYYY-MM-DD
  PassportIssuingAuthority?: string;
  PassportIssueCountryCode?: string;
  Gender: string;           // Male, Female
  Title: string;            // Mr, Mrs, Ms, Miss, Dr, Prof
  Email: string;
  Address?: string;
  Country?: string;
  CountryCode?: string;
  City?: string;
  PostalCode?: string;
  TicketNumber?: string;
  RoomNumber?: string;
  SelectedSeats?: Array<{
    FlightLegNumber: string;
    SeatNumber: string;
    SeatStatus: string;
  }>;
  PassengerReferenceNumber?: string;
  SelectedBaggages?: Array<{
    FlightId: string;
    Weight: string;
    BookPriceData: string;
    BaggageStatus: string;
  }>;
  WakaPointId?: string;
  IsWakapointRegister?: boolean;
}

export interface WakanowBookRequest {
  PassengerDetails: WakanowPassengerDetail[];
  BookingItemModels: Array<{
    ProductType: string;
    BookingData: string;       // SelectData from select response
    BookingId: string;
    TargetCurrency: string;
  }>;
  BookingId: string;
}

export interface WakanowBookResponse {
  BookingId: string;
  CustomerId: string;
  ProductType: string;
  TargetCurrency: string;
  ProductTermsAndConditions: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  };
  FlightBookingResult: {
    FlightBookingSummaryModel: {
      PnrReferenceNumber: string;
      PnrDate: string;
      FlightSummaryModel: {
        FlightCombination: WakanowFlightCombination;
        PriceBreakups: any | null;
      };
      TravellerDetails: WakanowPassengerDetail[];
      PnrStatus: string | null;
      TicketStatus: string | null;
    };
    IsFareLow: boolean;
    IsFareHigh: boolean;
    HasResult: boolean;
  };
  SelectedPaySmallSmallPlan: any | null;
}

export interface WakanowTicketRequest {
  BookingId: string;
  PnrNumber: string;
}

export interface WakanowTicketResponse {
  BookingId: string;
  CustomerId: string;
  ProductType: string;
  FlightBookingSummary: {
    PnrReferenceNumber: string;
    PnrDate: string;
    FlightSummaryModel: {
      FlightCombination: WakanowFlightCombination;
      PriceBreakups: any | null;
    };
    TravellerDetails: WakanowPassengerDetail[];
    PnrStatus: string;
    TicketStatus: string;
  };
  ProductTermsAndConditions: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  };
  WalletBallance: {
    Balance: number;
    Currency: string;
  };
  BookingStatusDetails: {
    PnrStatus: string;
    TicketingStatus: string;
    PaymentStatus: string;
    BookingStatus: string;
    Message: string;
    GeographyCode: string;
    PaymentRemarks: string | null;
    AvailabilityMessage: string;
    CovidAlertMessage: string | null;
  };
  BookingPaymentDetails: {
    PaymentStatus: string;
    TotalPrice: WakanowPrice;
    PaymentOptionName: string;
    PaymentMethodName: string;
    PaymentReferenceCode: string;
    TotalTripPrice: WakanowPrice;
  };
}

export interface WakanowWalletBalanceResponse {
  HasResult: boolean;
  Result: {
    Balance: number;
    Currency: string;
  };
  Successful: boolean;
  ResultType: number;
  Message: string | null;
}

@Injectable()
export class WakanowService {
  private readonly logger = new Logger(WakanowService.name);
  private readonly serviceUrl: string;
  private readonly username: string;
  private readonly password: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private airportsCache: WakanowAirport[] | null = null;
  private airportsCacheTime: Date | null = null;
  private selectDataCache: Map<string, { response: WakanowSelectResponse; timestamp: number }> = new Map();
  private readonly SELECT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private searchCache: Map<string, { results: WakanowSearchResult[]; timestamp: number }> = new Map();
  private readonly SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: ConfigService) {
    this.serviceUrl = this.configService.get<string>('WAKANOW_SERVICE_URL') || '';
    this.username = this.configService.get<string>('WAKANOW_USERNAME') || '';
    this.password = this.configService.get<string>('WAKANOW_PASSWORD') || '';

    if (!this.serviceUrl || !this.username || !this.password) {
      this.logger.warn(
        '⚠️  Wakanow credentials not fully configured. Set WAKANOW_SERVICE_URL, WAKANOW_USERNAME, WAKANOW_PASSWORD.',
      );
    }
  }

  private async fetchWithRetry(
    url: string,
    options: any,
    retries = 3,
    backoff = 1000
  ): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (error: any) {
      if (retries > 0) {
        this.logger.warn(
          `Wakanow fetch dropped (retrying in ${backoff}ms): ${error.message || String(error)}`
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw error;
    }
  }

  private async getToken(): Promise<string> {
    if (
      this.accessToken &&
      this.tokenExpiresAt &&
      new Date() < new Date(this.tokenExpiresAt.getTime() - 60_000)
    ) {
      return this.accessToken;
    }

    this.logger.log('Generating new Wakanow API token...');

    try {
      const response = await this.fetchWithRetry(`${this.serviceUrl}/token`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Connection: 'close',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: this.username,
          password: this.password,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Wakanow token generation failed: ${response.status} — ${errorText}`);
        
        let parsed: any = {};
        try {
          parsed = JSON.parse(errorText);
        } catch {}

        if (parsed.error === 'invalid_grant') {
          throw new HttpException(
            'Wakanow authentication failed: invalid credentials',
            HttpStatus.UNAUTHORIZED,
          );
        }
        if (parsed.error === 'unsupported_grant_type') {
          throw new HttpException(
            'Wakanow authentication failed: unsupported grant type',
            HttpStatus.BAD_REQUEST,
          );
        }
        throw new HttpException(
          `Wakanow authentication failed: ${response.status}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const data: WakanowTokenResponse = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      this.logger.log(
        `Wakanow token obtained. Expires at ${this.tokenExpiresAt.toISOString()}. Market: ${data.Market}, Services: ${data.Services}`,
      );

      return this.accessToken;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to generate Wakanow token:', error);
      throw new HttpException(
        'Unable to authenticate with Wakanow flight service',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Connection: 'close',
    };
  }

  private handleApiError(response: Response, body: string, context: string): never {
    let parsed: any = {};
    try {
      parsed = JSON.parse(body);
    } catch {}

    const message = parsed?.Message || parsed?.message || parsed?.error || body || `Wakanow API error: ${response.status}`;

    if (
      message.includes('Authorization has been denied') ||
      message.includes('Invalid token') ||
      message.includes('Unauthorized')
    ) {
      this.accessToken = null;
      this.tokenExpiresAt = null;
      throw new HttpException(
        { message: 'Wakanow authentication expired. Please retry.', error: context },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (message.includes('Credit limit exceeded') || message.includes('Insufficient credit')) {
      throw new HttpException(
        { message: 'Wakanow wallet credit limit exceeded. Please top up.', error: context },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('No Itinerary found')
    ) {
      throw new HttpException(
        { message: 'Your flight selection has expired. Please search again.', error: context },
        HttpStatus.GONE,
      );
    }

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    if (response.status === 400) httpStatus = HttpStatus.BAD_REQUEST;
    else if (response.status === 401 || response.status === 403) httpStatus = HttpStatus.UNAUTHORIZED;
    else if (response.status === 404) httpStatus = HttpStatus.NOT_FOUND;
    else if (response.status === 409) httpStatus = HttpStatus.CONFLICT;
    else if (response.status >= 500) httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

    throw new HttpException({ message, error: context }, httpStatus);
  }

  private getCachedSelect(selectDataHash: string): WakanowSelectResponse | null {
    const cached = this.selectDataCache.get(selectDataHash);
    if (cached && (Date.now() - cached.timestamp) < this.SELECT_CACHE_TTL) {
      this.logger.log(`✅ Returning cached select response for hash: ${selectDataHash.substring(0, 20)}...`);
      return cached.response;
    }
    return null;
  }

  private cacheSelectResponse(selectDataHash: string, response: WakanowSelectResponse): void {
    this.selectDataCache.set(selectDataHash, {
      response,
      timestamp: Date.now(),
    });
    if (this.selectDataCache.size > 100) {
      const now = Date.now();
      const toDelete: string[] = [];
      for (const [key, value] of this.selectDataCache) {
        if ((now - value.timestamp) > this.SELECT_CACHE_TTL) {
          toDelete.push(key);
        }
      }
      for (const key of toDelete) {
        this.selectDataCache.delete(key);
      }
      this.logger.log(`🧹 Cleaned up ${toDelete.length} expired cache entries`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      this.logger.debug('Performing Wakanow API health check');
      await this.getToken();
      const headers = await this.getAuthHeaders();
      
      const response = await this.fetchWithRetry(`${this.serviceUrl}/api/flight/airports`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        this.logger.warn(`Health check failed: API returned status ${response.status}`);
        return false;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        this.logger.warn('Health check failed: Invalid content type');
        return false;
      }

      const data = await response.json();
      const isValid = Array.isArray(data) || (typeof data === 'object' && data !== null);
      
      if (isValid) {
        this.logger.debug('Wakanow API health check passed ✅');
        return true;
      } else {
        this.logger.warn('Health check failed: Invalid response data');
        return false;
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.name === 'TimeoutError') {
        this.logger.error(`Wakanow API health check timed out`);
      } else {
        this.logger.error(`Wakanow API health check failed: ${error.message}`);
      }
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.getToken();
      return true;
    } catch (error) {
      this.logger.error(`Wakanow API ping failed: ${error.message}`);
      return false;
    }
  }

  async getAirports(): Promise<WakanowAirport[]> {
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

    if (
      this.airportsCache &&
      this.airportsCacheTime &&
      Date.now() - this.airportsCacheTime.getTime() < CACHE_TTL_MS
    ) {
      return this.airportsCache;
    }

    this.logger.log('Fetching Wakanow airports...');
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.fetchWithRetry(`${this.serviceUrl}/api/flight/airports`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleApiError(response, errorText, 'Fetch airports');
      }

      const contentType = response.headers.get('content-type') || '';
      let airports: WakanowAirport[];

      if (contentType.includes('application/json')) {
        airports = await response.json();
      } else {
        const text = await response.text();
        try {
          airports = JSON.parse(text);
        } catch {
          this.logger.warn('Wakanow airports response is not JSON. Raw response stored as fallback.');
          airports = [];
        }
      }

      this.airportsCache = airports;
      this.airportsCacheTime = new Date();
      this.logger.log(`Cached ${airports.length} Wakanow airports`);
      return airports;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to fetch Wakanow airports:', error);
      throw new HttpException(
        'Unable to fetch airport data from Wakanow',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async searchFlights(request: WakanowSearchRequest): Promise<WakanowSearchResult[]> {
    // 👇 ADD CACHE CHECK AT THE START
    const cacheKey = this.generateSearchCacheKey(request);
    
    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.SEARCH_CACHE_TTL) {
      this.logger.log(`✅ Returning cached search results (${cached.results.length} results)`);
      return cached.results;
    }

    // Original logging
    this.logger.log(
      `Wakanow flight search: ${request.FlightSearchType} | ${request.Itineraries.map((i) => `${i.Departure}→${i.Destination}`).join(', ')} | ${request.Adults}A ${request.Children}C ${request.Infants}I`,
    );

    const headers = await this.getAuthHeaders();

    try {
      const response = await this.fetchWithRetry(`${this.serviceUrl}/api/flight/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleApiError(response, errorText, 'Flight search');
      }

      const data = await response.json();

      let results: WakanowSearchResult[] = [];

      if (Array.isArray(data) && data.length === 0) {
        this.logger.log('Wakanow search: No itineraries found');
        results = [];
      } else if (typeof data === 'string') {
        this.logger.log(`Wakanow search: ${data}`);
        results = [];
      } else if (Array.isArray(data) && data.length > 0) {
        results = data.map((item: any) => ({
          FlightCombination: item.FlightCombination || item,
          SelectData: item.SelectData || '',
        }));
        this.logger.log(`Wakanow search: ${results.length} results`);
      } else if (data.FlightCombination) {
        this.logger.log('Wakanow search: 1 result');
        results = [{
          FlightCombination: data.FlightCombination,
          SelectData: data.SelectData || '',
        }];
      }

      // 👇 ADD CACHE STORAGE HERE
      if (results.length > 0) {
        this.searchCache.set(cacheKey, {
          results,
          timestamp: Date.now(),
        });
        this.logger.log(`📦 Cached ${results.length} search results`);
        
        // Clean up old cache entries
        this.cleanupSearchCache();
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Wakanow flight search failed:', error);
      throw new HttpException(
        'Wakanow flight search service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async selectFlight(request: WakanowSelectRequest): Promise<WakanowSelectResponse> {
    this.logger.log('Wakanow flight select...');
    this.logger.log(`SelectData length: ${request.SelectData?.length || 0}`);

    if (!request.SelectData || request.SelectData.length < 10) {
      this.logger.warn(`Invalid selectData: length ${request.SelectData?.length || 0}`);
      throw new BadRequestException('Invalid or expired flight selection. Please search again.');
    }

    this.logger.log(`SelectData preview: ${request.SelectData.substring(0, 50)}...`);

    // Generate hash for caching
    const selectDataHash = request.SelectData.substring(0, 100) + '|' + request.SelectData.length;
    
    // Check cache
    const cachedResponse = this.getCachedSelect(selectDataHash);
    if (cachedResponse) {
      return cachedResponse;
    }

    const headers = await this.getAuthHeaders();
    
    // ✅ Only use valid variants
    const variants = this.generateSelectDataVariants(request.SelectData);
    this.logger.log(`Generated ${variants.length} SelectData variants to try`);

    let lastError: any = null;

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      this.logger.log(`📤 Trying variant ${i + 1}/${variants.length}: ${variant.name} (${variant.data.length} chars)`);

      try {
        const response = await this.fetchWithRetry(`${this.serviceUrl}/api/flight/select`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            SelectData: variant.data,
            TargetCurrency: request.TargetCurrency || 'NGN',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
        
          if (response.status === 400 || response.status === 404) {
            this.logger.warn(`❌ SelectData expired/invalid: ${response.status} - ${errorText}`);
            
            if (variant.name === 'Original') {
              throw new BadRequestException(
                'Your flight selection has expired. Please search for flights again.'
              );
            }
            
            lastError = new BadRequestException(
              'Your flight selection has expired. Please search for flights again.'
            );
            continue;
          }

       
          if (response.status >= 500) {
            this.logger.error(`Server error: ${response.status} - ${errorText}`);
            throw new HttpException(
              'Wakanow flight selection service is temporarily unavailable',
              HttpStatus.SERVICE_UNAVAILABLE
            );
          }

          this.logger.warn(`${variant.name} failed: ${response.status} - ${errorText.substring(0, 200)}`);
          lastError = new BadRequestException('Unable to confirm flight pricing. Please try again.');
          continue;
        }

        const data: WakanowSelectResponse = await response.json();

        this.logger.log(`📝 Terms count from Wakanow: ${data.ProductTermsAndConditions?.TermsAndConditions?.length || 0}`);
        if (data.ProductTermsAndConditions?.TermsAndConditions?.length > 0) {
          this.logger.log(`📝 First term: ${data.ProductTermsAndConditions.TermsAndConditions[0]}`);
        } else {
          this.logger.warn(`⚠️ No terms returned by Wakanow for booking ${data.BookingId}`);
        }

        if (!data.HasResult) {
          this.logger.warn(`${variant.name} returned no results`);
          lastError = new BadRequestException('Selected flight is no longer available. Please search again.');
          continue;
        }

        this.logger.log(
          `✅ Wakanow flight selected with ${variant.name}. BookingId: ${data.BookingId}, Price: ${data.FlightSummaryModel?.FlightCombination?.Price?.Amount || 0}`,
        );

        this.cacheSelectResponse(selectDataHash, data);

        return data;
        
      } catch (error: any) {
        lastError = error;
        
        if (variant.name === 'Original' && 
            error instanceof BadRequestException && 
            error.message.includes('expired')) {
          throw error;
        }
        
        if (i === variants.length - 1) {
          this.logger.error('All SelectData variants failed');
          throw new BadRequestException('Unable to confirm flight pricing. Please search for flights again.');
        }
      }
    }

    throw new BadRequestException('Unable to confirm flight pricing. Please search for flights again.');
  }

  
  private generateSelectDataVariants(originalSelectData: string): Array<{ name: string; data: string }> {
    const variants: Array<{ name: string; data: string }> = [];

    variants.push({ name: 'Original', data: originalSelectData });


    const trimmed = originalSelectData.trim();
    if (trimmed !== originalSelectData && trimmed.length > 10) {
      variants.push({ name: 'Trimmed', data: trimmed });
    }

    this.logger.log(`Generated ${variants.length} valid SelectData variants (original + trimmed)`);
    return variants;
  }

  private generateSearchCacheKey(request: WakanowSearchRequest): string {
    const itineraryKey = request.Itineraries
      .map(i => `${i.Departure}-${i.Destination}-${i.DepartureDate}`)
      .join('|');
    return `search:${request.FlightSearchType}:${itineraryKey}:${request.Adults}:${request.Children}:${request.Infants}:${request.Ticketclass}`;
  }

  private cleanupSearchCache(): void {
    const now = Date.now();
    let deleted = 0;
    for (const [key, value] of this.searchCache) {
      if ((now - value.timestamp) > this.SEARCH_CACHE_TTL) {
        this.searchCache.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      this.logger.log(`🧹 Cleaned up ${deleted} expired search cache entries`);
    }
  }


  async bookFlight(request: WakanowBookRequest): Promise<WakanowBookResponse> {
    this.logger.log(`Wakanow flight booking. BookingId: ${request.BookingId}`);

    if (!request.BookingId) {
      throw new HttpException('BookingId is required for booking', HttpStatus.BAD_REQUEST);
    }

    if (!request.BookingItemModels || request.BookingItemModels.length === 0) {
      throw new HttpException('BookingItemModels is required for booking', HttpStatus.BAD_REQUEST);
    }

    if (!request.PassengerDetails || request.PassengerDetails.length === 0) {
      throw new HttpException('Passenger details are required for booking', HttpStatus.BAD_REQUEST);
    }

    const headers = await this.getAuthHeaders();

    try {
      const response = await this.fetchWithRetry(`${this.serviceUrl}/api/flight/book`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleApiError(response, errorText, 'Flight booking');
      }

      const data: WakanowBookResponse = await response.json();

      if (!data.FlightBookingResult?.HasResult) {
        throw new HttpException(
          'Flight booking failed. The selected fare may no longer be available.',
          HttpStatus.CONFLICT,
        );
      }

      const pnr = data.FlightBookingResult?.FlightBookingSummaryModel?.PnrReferenceNumber || 'PENDING_ISSUE';
      this.logger.log(`Wakanow flight booked. PNR: ${pnr}, BookingId: ${data.BookingId}`);

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Wakanow flight booking failed:', error);
      throw new HttpException(
        'Failed to book flight with Wakanow',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async ticketFlight(request: WakanowTicketRequest): Promise<WakanowTicketResponse> {
    this.logger.log(
      `Wakanow ticket issuance. BookingId: ${request.BookingId}, PNR: ${request.PnrNumber}`,
    );

    if (!request.BookingId) {
      throw new HttpException('BookingId is required for ticket issuance', HttpStatus.BAD_REQUEST);
    }

    if (!request.PnrNumber) {
      throw new HttpException('PNR number is required for ticket issuance', HttpStatus.BAD_REQUEST);
    }

    const headers = await this.getAuthHeaders();

    try {
      const response = await this.fetchWithRetry(`${this.serviceUrl}/api/flight/ticketpnr`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleApiError(response, errorText, 'Ticket issuance');
      }

      const data: WakanowTicketResponse = await response.json();

      this.logger.log(
        `Wakanow ticket issued. Status: ${data.FlightBookingSummary?.TicketStatus}, PNR: ${data.FlightBookingSummary?.PnrStatus}, Wallet: ${data.WalletBallance?.Balance || 0} ${data.WalletBallance?.Currency || 'NGN'}`,
      );

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Wakanow ticket issuance failed:', error);
      throw new HttpException(
        'Failed to issue ticket with Wakanow',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getWalletBalance(): Promise<WakanowWalletBalanceResponse> {
    this.logger.log('Checking Wakanow wallet balance...');
    const headers = await this.getAuthHeaders();

    try {
      const response = await this.fetchWithRetry(`${this.serviceUrl}/api/payment/walletbalance`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.handleApiError(response, errorText, 'Wallet balance');
      }

      const data: WakanowWalletBalanceResponse = await response.json();

      if (data.HasResult && data.Result) {
        this.logger.log(
          `Wakanow wallet balance: ${data.Result.Balance} ${data.Result.Currency}`,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Wakanow wallet balance check failed:', error);
      throw new HttpException(
        'Failed to check Wakanow wallet balance',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
 
extractSeatDataFromResponse(response: any): {
  outboundFlight: any;
  returnFlight?: any;
  priceBreakdown: {
    basePrice: number;
    markupAmount: number;
    markupPercentage: number;
    serviceFee: number;
    serviceFeePercentage: number;
    taxes: number;
    taxPercentage: number;
    totalAmount: number;
    currency: string;
  };
} {
  const flightSummary = response.FlightBookingSummary || 
                        response.FlightBookingResult?.FlightBookingSummaryModel ||
                        response.FlightSummaryModel ||
                        response;

  if (!flightSummary) {
    throw new BadRequestException('No flight summary found in response');
  }

  const summaryModel = flightSummary.FlightSummaryModel || flightSummary;
  const flightCombination = summaryModel.FlightCombination || flightSummary.FlightCombination || {};
  const flightModels = flightCombination.FlightModels || summaryModel.FlightModels || [];

  // Extract outbound flight (first in array)
  const outboundFlight = flightModels[0] || {};
  const outboundLegs = outboundFlight.FlightLegs || [];

  // Extract return flight (second in array) if exists
  const returnFlight = flightModels[1] || {};
  const returnLegs = returnFlight.FlightLegs || [];

  // Build the structured seat data
  const result: any = {
    outboundFlight: {
      FlightId: outboundFlight.FlightId || '1',
      Name: outboundFlight.Name || '',
      Airline: outboundFlight.Airline || '',
      AirlineName: outboundFlight.AirlineName || '',
      AirlineLogoUrl: outboundFlight.AirlineLogoUrl || '',
      DepartureCode: outboundFlight.DepartureCode || '',
      DepartureName: outboundFlight.DepartureName || '',
      DepartureTime: outboundFlight.DepartureTime || '',
      ArrivalCode: outboundFlight.ArrivalCode || '',
      ArrivalName: outboundFlight.ArrivalName || '',
      ArrivalTime: outboundFlight.ArrivalTime || '',
      Stops: outboundFlight.Stops || 0,
      TripDuration: outboundFlight.TripDuration || '',
      FlightLegs: outboundLegs.map((leg: any) => ({
        FlightLegNumber: leg.FlightLegNumber || '',
        DepartureCode: leg.DepartureCode || '',
        DepartureName: leg.DepartureName || '',
        DestinationCode: leg.DestinationCode || '',
        DestinationName: leg.DestinationName || '',
        StartTime: leg.StartTime || '',
        EndTime: leg.EndTime || '',
        Duration: leg.Duration || '',
        FlightNumber: leg.FlightNumber || '',
        Airline: leg.OperatingCarrier || leg.MarketingCarrier || '',
        AirlineName: leg.OperatingCarrierName || leg.AirlineName || '',
        Aircraft: leg.Aircraft || '',
        CabinClassName: leg.CabinClassName || 'Economy',
        BookingClass: leg.BookingClass || '',
        IsStop: leg.IsStop || false,
        Layover: leg.Layover || null,
        LayoverDuration: leg.LayoverDuration || '00:00:00',
        Seats: (leg.Seats || []).map((seat: any) => ({
          SeatName: seat.SeatName || '',
          RowNumber: seat.RowNumber || 0,
          ColumnName: seat.ColumnName || '',
          IsOccupied: seat.IsOccupied || false,
          IsValidRow: seat.IsValidRow || false,
          IsValidSeat: seat.IsValidSeat || false,
          IsInfantSeat: seat.IsInfantSeat || false,
          IsAdultWithInfantSeat: seat.IsAdultWithInfantSeat || false,
          IsChargeableSeat: seat.IsChargeableSeat || false,
          Price: seat.Price ? {
            Amount: seat.Price.Amount || 0,
            CurrencyCode: seat.Price.CurrencyCode || 'NGN',
          } : undefined,
          PriceInSourceCurrency: seat.PriceInSourceCurrency ? {
            Amount: seat.PriceInSourceCurrency.Amount || 0,
            CurrencyCode: seat.PriceInSourceCurrency.CurrencyCode || 'NGN',
          } : undefined,
          ActualPrice: seat.ActualPrice ? {
            Amount: seat.ActualPrice.Amount || 0,
            CurrencyCode: seat.ActualPrice.CurrencyCode || 'NGN',
          } : undefined,
          MarkUpPrice: seat.MarkUpPrice ? {
            Amount: seat.MarkUpPrice.Amount || 0,
            CurrencyCode: seat.MarkUpPrice.CurrencyCode || 'NGN',
          } : undefined,
          SeatTypeDescription: seat.SeatTypeDescription || {},
        })),
        FreeBaggage: leg.FreeBaggage ? {
          BagCount: leg.FreeBaggage.BagCount || 0,
          Weight: leg.FreeBaggage.Weight || 0,
          WeightUnit: leg.FreeBaggage.WeightUnit || null,
        } : null,
      })),
      FreeBaggage: outboundFlight.FreeBaggage ? {
        BagCount: outboundFlight.FreeBaggage.BagCount || 0,
        Weight: outboundFlight.FreeBaggage.Weight || 0,
        WeightUnit: outboundFlight.FreeBaggage.WeightUnit || null,
      } : null,
    },
  };

  // Add return flight if it exists
  if (returnFlight.FlightId) {
    result.returnFlight = {
      FlightId: returnFlight.FlightId || '2',
      Name: returnFlight.Name || '',
      Airline: returnFlight.Airline || '',
      AirlineName: returnFlight.AirlineName || '',
      AirlineLogoUrl: returnFlight.AirlineLogoUrl || '',
      DepartureCode: returnFlight.DepartureCode || '',
      DepartureName: returnFlight.DepartureName || '',
      DepartureTime: returnFlight.DepartureTime || '',
      ArrivalCode: returnFlight.ArrivalCode || '',
      ArrivalName: returnFlight.ArrivalName || '',
      ArrivalTime: returnFlight.ArrivalTime || '',
      Stops: returnFlight.Stops || 0,
      TripDuration: returnFlight.TripDuration || '',
      FlightLegs: returnLegs.map((leg: any) => ({
        FlightLegNumber: leg.FlightLegNumber || '',
        DepartureCode: leg.DepartureCode || '',
        DepartureName: leg.DepartureName || '',
        DestinationCode: leg.DestinationCode || '',
        DestinationName: leg.DestinationName || '',
        StartTime: leg.StartTime || '',
        EndTime: leg.EndTime || '',
        Duration: leg.Duration || '',
        FlightNumber: leg.FlightNumber || '',
        Airline: leg.OperatingCarrier || leg.MarketingCarrier || '',
        AirlineName: leg.OperatingCarrierName || leg.AirlineName || '',
        Aircraft: leg.Aircraft || '',
        CabinClassName: leg.CabinClassName || 'Economy',
        BookingClass: leg.BookingClass || '',
        IsStop: leg.IsStop || false,
        Layover: leg.Layover || null,
        LayoverDuration: leg.LayoverDuration || '00:00:00',
        Seats: (leg.Seats || []).map((seat: any) => ({
          SeatName: seat.SeatName || '',
          RowNumber: seat.RowNumber || 0,
          ColumnName: seat.ColumnName || '',
          IsOccupied: seat.IsOccupied || false,
          IsValidRow: seat.IsValidRow || false,
          IsValidSeat: seat.IsValidSeat || false,
          IsInfantSeat: seat.IsInfantSeat || false,
          IsAdultWithInfantSeat: seat.IsAdultWithInfantSeat || false,
          IsChargeableSeat: seat.IsChargeableSeat || false,
          Price: seat.Price ? {
            Amount: seat.Price.Amount || 0,
            CurrencyCode: seat.Price.CurrencyCode || 'NGN',
          } : undefined,
          PriceInSourceCurrency: seat.PriceInSourceCurrency ? {
            Amount: seat.PriceInSourceCurrency.Amount || 0,
            CurrencyCode: seat.PriceInSourceCurrency.CurrencyCode || 'NGN',
          } : undefined,
          ActualPrice: seat.ActualPrice ? {
            Amount: seat.ActualPrice.Amount || 0,
            CurrencyCode: seat.ActualPrice.CurrencyCode || 'NGN',
          } : undefined,
          MarkUpPrice: seat.MarkUpPrice ? {
            Amount: seat.MarkUpPrice.Amount || 0,
            CurrencyCode: seat.MarkUpPrice.CurrencyCode || 'NGN',
          } : undefined,
          SeatTypeDescription: seat.SeatTypeDescription || {},
        })),
        FreeBaggage: leg.FreeBaggage ? {
          BagCount: leg.FreeBaggage.BagCount || 0,
          Weight: leg.FreeBaggage.Weight || 0,
          WeightUnit: leg.FreeBaggage.WeightUnit || null,
        } : null,
      })),
      FreeBaggage: returnFlight.FreeBaggage ? {
        BagCount: returnFlight.FreeBaggage.BagCount || 0,
        Weight: returnFlight.FreeBaggage.Weight || 0,
        WeightUnit: returnFlight.FreeBaggage.WeightUnit || null,
      } : null,
    };
  }

  const price = flightCombination.Price || summaryModel.Price || {};
  const basePrice = price.Amount || 0;
  const currency = price.CurrencyCode || 'NGN';

  let markupPercentage = 10;
  let serviceFeePercentage = 5;
  let markupAmount = basePrice * (markupPercentage / 100);
  let serviceFee = basePrice * (serviceFeePercentage / 100);
  let taxes = 0;

  if (summaryModel.PriceBreakups) {
    const pb = summaryModel.PriceBreakups;
  
    if (pb.Tax?.Amount) {
      taxes = pb.Tax.Amount;
    }
  }

  const totalAmount = basePrice + markupAmount + serviceFee + taxes;

  result.priceBreakdown = {
    basePrice: basePrice,
    markupAmount: markupAmount,
    markupPercentage: markupPercentage,
    serviceFee: serviceFee,
    serviceFeePercentage: serviceFeePercentage,
    taxes: taxes,
    taxPercentage: markupPercentage + serviceFeePercentage,
    totalAmount: totalAmount,
    currency: currency,
  };

  this.logger.log(`✅ Extracted seat data: ${result.outboundFlight.FlightLegs.length} legs, ${result.outboundFlight.FlightLegs.reduce((acc: number, leg: any) => acc + leg.Seats.length, 0)} total seats`);

  return result;
}

async getSeatDataForBooking(bookingId: string, providerData: any): Promise<any> {
  this.logger.log(`Getting seat data for booking: ${bookingId}`);

  if (!providerData) {
    throw new BadRequestException('No provider data found for this booking');
  }

  const seatData = this.extractSeatDataFromResponse(providerData);

  return {
    bookingId: bookingId,
    ...seatData,
  };
}
}