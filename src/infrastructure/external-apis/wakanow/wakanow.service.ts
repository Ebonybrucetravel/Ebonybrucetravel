import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  '.expires': string;
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
  DepartureDate: string;   
  Ticketclass?: string;
}
export interface WakanowSearchRequest {
  FlightSearchType: 'Oneway' | 'Return' | 'Multidestination';
  Ticketclass: string;     
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
  PassengerType: string;     
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  DateOfBirth: string;
  Age?: number;
  PhoneNumber: string;
  PassportNumber?: string;
  ExpiryDate?: string;
  PassportIssuingAuthority?: string;
  PassportIssueCountryCode?: string;
  Gender: string;
  Title: string;             
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
    BookingData: string;       
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

  private async fetchWithRetry(url: string, options: any, retries = 3, backoff = 1000): Promise<Response> {
    try {
      return await fetch(url, options);
    } catch (error: any) {
      if (retries > 0) {
        this.logger.warn(`Wakanow fetch dropped (retrying in ${backoff}ms): ${error.message || String(error)}`);
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
          Username: this.username,
          Password: this.password,
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
    const message = parsed?.Message || body || `Wakanow API error: ${response.status}`;
    if (message.includes('Authorization has been denied')) {
      this.accessToken = null;
      this.tokenExpiresAt = null;
      throw new HttpException(
        { message: 'Wakanow authentication expired. Please retry.', error: context },
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (message.includes('Credit limit exceeded')) {
      throw new HttpException(
        { message: 'Wakanow wallet credit limit exceeded. Please top up.', error: context },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    if (response.status === 401 || response.status === 403) httpStatus = HttpStatus.UNAUTHORIZED;
    else if (response.status === 400) httpStatus = HttpStatus.BAD_REQUEST;
    else if (response.status === 404) httpStatus = HttpStatus.NOT_FOUND;
    else if (response.status >= 500) httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
    throw new HttpException({ message, error: context }, httpStatus);
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
      if (Array.isArray(data) && data.length === 0) {
        this.logger.log('Wakanow search: No itineraries found');
        return [];
      }
      if (typeof data === 'string') {
        this.logger.log(`Wakanow search: ${data}`);
        return [];
      }
      this.logger.log(`Wakanow search: ${Array.isArray(data) ? data.length : 0} results`);
      return Array.isArray(data) ? data : [];
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
    const headers = await this.getAuthHeaders();
    try {
      const response = await this.fetchWithRetry(`${this.serviceUrl}/api/flight/select`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const errorText = await response.text();
        this.handleApiError(response, errorText, 'Flight select');
      }
      const data: WakanowSelectResponse = await response.json();
      if (!data.HasResult) {
        throw new HttpException(
          'Selected flight is no longer available. Please search again.',
          HttpStatus.GONE,
        );
      }
      this.logger.log(
        `Wakanow flight selected. BookingId: ${data.BookingId}, Price: ${data.FlightSummaryModel.FlightCombination.Price.Amount} ${data.FlightSummaryModel.FlightCombination.Price.CurrencyCode}`,
      );
      return data;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Wakanow flight select failed:', error);
      if (error.cause) {
        this.logger.error(`Wakanow fetch specific cause:`, error.cause);
      }
      
      throw new HttpException(
        'Failed to confirm flight pricing with Wakanow',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
  async bookFlight(request: WakanowBookRequest): Promise<WakanowBookResponse> {
    this.logger.log(`Wakanow flight booking. BookingId: ${request.BookingId}`);
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
      const pnr = data.FlightBookingResult.FlightBookingSummaryModel.PnrReferenceNumber;
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
        `Wakanow ticket issued. Status: ${data.FlightBookingSummary?.TicketStatus}, PNR: ${data.FlightBookingSummary?.PnrStatus}, Wallet: ${data.WalletBallance?.Balance} ${data.WalletBallance?.Currency}`,
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
}
