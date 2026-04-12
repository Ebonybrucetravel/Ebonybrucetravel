// lib/wakanow-api.ts
// Wakanow API client for domestic flights

import { config } from './config';

// ============ Types ============

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

export interface WakanowFlightSearchParams {
  FlightSearchType: 'Oneway' | 'Return' | 'Multidestination';
  Ticketclass: 'F' | 'C' | 'W' | 'Y';
  Adults: number;
  Children: number;
  Infants: number;
  TargetCurrency: string;
  Itineraries: Array<{
    Departure: string;
    Destination: string;
    DepartureDate: string;
    Ticketclass?: string;
  }>;
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
  LayerOrder?: string | null;
  LayerDuration?: string;
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
  TechnicalStops?: any[];
  Seats?: any | null;
}

export interface WakanowFlight {
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
  FreeBaggage: {
    BagCount: number;
    Weight: number;
    WeightUnit: string | null;
  };
  Price: {
    Amount: number;
    CurrencyCode: string;
  };
  MarketingCarrier: string;
  Adults: number;
  Children: number;
  Infants: number;
  PriceDetails: Array<{
    BaseFare: { Amount: number; CurrencyCode: string };
    Tax: { Amount: number; CurrencyCode: string };
    PassengerType: string;
  }>;
  FareRules: string[];
  PenaltyRules: string[] | null;
  IsRefundable: boolean;
  IncludePaySmallSmall: boolean;
  DownPaymentDetailInPercentage: number;
  PaySmallSmallLockDownPrice: number;
  ConnectionCode: string;
}

// Flexible response types to handle different API response structures
export interface WakanowSearchResponse {
  FlightCombination?: {
    FlightModels: WakanowFlight[];
  };
  FlightModels?: WakanowFlight[];
  SelectData?: string;
  data?: {
    FlightModels?: WakanowFlight[];
    SelectData?: string;
  };
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export interface WakanowSelectResponse {
  FlightSummaryModel?: {
    FlightCombination?: {
      FlightModels: WakanowFlight[];
    };
    Price?: {
      Amount: number;
      CurrencyCode: string;
    };
    BookingId?: string;
  };
  FlightModels?: WakanowFlight[];
  Price?: {
    Amount: number;
    CurrencyCode: string;
  };
  BookingId?: string;
  IsPriceMatched?: boolean;
  HasResult?: boolean;
  SelectData?: string;
  ProductTermsAndConditions?: {
    TermsAndConditions: string[];
  };
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export interface WakanowPassenger {
  PassengerType: 'Adult' | 'Child' | 'Infant';
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  DateOfBirth: string;
  Age?: number;
  PhoneNumber: string;
  PassportNumber: string;
  ExpiryDate: string;
  PassportIssuingAuthority: string;
  PassportIssueCountryCode?: string;
  Gender: 'Male' | 'Female';
  Title: 'Mr' | 'Mrs' | 'Miss' | 'Ms' | 'Dr' | 'Prof';
  Email: string;
  Address: string;
  Country: string;
  CountryCode: string;
  City: string;
  PostalCode: string;
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

export interface WakanowBookingRequest {
  PassengerDetails: WakanowPassenger[];
  BookingId: string;
  TargetCurrency: string;
  BookingData: string;
}

export interface WakanowBookingResponse {
  BookingId: string;
  CustomerId: string;
  ProductType: string;
  TargetCurrency: string;
  FlightBookingResult?: {
    PnReferenceNumber: string;
    PnDate: string;
    FlightSummaryModel: any;
    PnStatus?: string;
    TicketStatus?: string;
  };
  ProductTermsAndConditions?: {
    TermsAndConditions: string[];
  };
  success?: boolean;
  message?: string;
  [key: string]: any;
}

export interface WakanowTicketResponse {
  BookingId: string;
  CustomerId: string;
  ProductType: string;
  FlightBookingSummary: {
    PnReferenceNumber: string;
    PnDate: string;
    FlightSummaryModel: any;
    PnStatus: string;
    TicketStatus: string;
  };
  WalletBalance: {
    Balance: number;
    Currency: string;
  };
  BookingStatusDetails: {
    PnrStatus: string;
    TicketingStatus: string;
    PaymentStatus: string;
    BookingStatus: string;
    Message: string;
  };
  success?: boolean;
  message?: string;
  [key: string]: any;
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

// ============ Token Management ============

let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

async function getWakanowToken(): Promise<string> {
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 5 * 60 * 1000) {
    return cachedToken;
  }

  const response = await fetch(`${config.wakanow.baseUrl}/token`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: config.wakanow.username,
      password: config.wakanow.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Wakanow token fetch failed: ${response.status}`);
  }

  const data: WakanowTokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiryTime = Date.now() + data.expires_in * 1000;
  
  return cachedToken;
}

async function wakanowFetch<T>(
  endpoint: string,
  options?: { method?: string; body?: object }
): Promise<T> {
  const token = await getWakanowToken();
  
  const response = await fetch(`${config.wakanow.baseUrl}${endpoint}`, {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Wakanow API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.Message || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============ Public API Functions ============

// Cache for airports
let cachedAirports: WakanowAirport[] | null = null;

export async function getWakanowAirports(): Promise<WakanowAirport[]> {
  if (cachedAirports) return cachedAirports;
  
  const token = await getWakanowToken();
  const response = await fetch(`${config.wakanow.baseUrl}/api/flight/airports`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch airports');
  }
  
  const compressedData = await response.text();
  
  // Mock airports for Nigerian domestic flights
  cachedAirports = [
    { AirportCode: 'LOS', AirportName: 'Murtala Muhammed International Airport', CityCountry: 'Lagos, Nigeria', City: 'Lagos', Country: 'Nigeria' },
    { AirportCode: 'ABV', AirportName: 'Nnamdi Azikiwe International Airport', CityCountry: 'Abuja, Nigeria', City: 'Abuja', Country: 'Nigeria' },
    { AirportCode: 'PHC', AirportName: 'Port Harcourt International Airport', CityCountry: 'Port Harcourt, Nigeria', City: 'Port Harcourt', Country: 'Nigeria' },
    { AirportCode: 'KAN', AirportName: 'Mallam Aminu Kano International Airport', CityCountry: 'Kano, Nigeria', City: 'Kano', Country: 'Nigeria' },
    { AirportCode: 'ENU', AirportName: 'Akanu Ibiam International Airport', CityCountry: 'Enugu, Nigeria', City: 'Enugu', Country: 'Nigeria' },
    { AirportCode: 'QOW', AirportName: 'Sam Mbakwe Airport', CityCountry: 'Owerri, Nigeria', City: 'Owerri', Country: 'Nigeria' },
    { AirportCode: 'BNI', AirportName: 'Benin Airport', CityCountry: 'Benin, Nigeria', City: 'Benin', Country: 'Nigeria' },
    { AirportCode: 'JOS', AirportName: 'Yakubu Gowon Airport', CityCountry: 'Jos, Nigeria', City: 'Jos', Country: 'Nigeria' },
    { AirportCode: 'KAD', AirportName: 'Kaduna Airport', CityCountry: 'Kaduna, Nigeria', City: 'Kaduna', Country: 'Nigeria' },
    { AirportCode: 'YOL', AirportName: 'Yola Airport', CityCountry: 'Yola, Nigeria', City: 'Yola', Country: 'Nigeria' },
  ];
  
  return cachedAirports;
}

export async function searchWakanowFlights(params: WakanowFlightSearchParams): Promise<WakanowSearchResponse> {
  console.log('Wakanow search request:', params);
  const result = await wakanowFetch<WakanowSearchResponse>('/api/flight/search', {
    method: 'POST',
    body: params,
  });
  console.log('Wakanow search response:', result);
  return result;
}

export async function selectWakanowFlight(selectData: string, targetCurrency: string = 'NGN'): Promise<WakanowSelectResponse> {
  console.log('Wakanow select request:', { SelectData: selectData, TargetCurrency: targetCurrency });
  const result = await wakanowFetch<WakanowSelectResponse>('/api/flight/select', {
    method: 'POST',
    body: { SelectData: selectData, TargetCurrency: targetCurrency },
  });
  console.log('Wakanow select response:', result);
  return result;
}

export async function bookWakanowFlight(bookingData: WakanowBookingRequest): Promise<WakanowBookingResponse> {
  console.log('Wakanow book request:', bookingData);
  const result = await wakanowFetch<WakanowBookingResponse>('/api/flight/book', {
    method: 'POST',
    body: bookingData,
  });
  console.log('Wakanow book response:', result);
  return result;
}

export async function ticketWakanowPNR(bookingId: string, pnrNumber: string): Promise<WakanowTicketResponse> {
  console.log('Wakanow ticket request:', { BookingId: bookingId, PnrNumber: pnrNumber });
  const result = await wakanowFetch<WakanowTicketResponse>('/api/flight/ticketpnr', {
    method: 'POST',
    body: { BookingId: bookingId, PnrNumber: pnrNumber },
  });
  console.log('Wakanow ticket response:', result);
  return result;
}

export async function getWakanowWalletBalance(): Promise<{ Balance: number; Currency: string }> {
  const response = await wakanowFetch<WakanowWalletBalanceResponse>('/api/payment/walletbalance');
  return response.Result;
}