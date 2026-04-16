// lib/wakanow-api.ts
// Wakanow API client - NOW ROUTING THROUGH YOUR BACKEND

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

// ✅ FIXED: Updated to handle your backend's response format
export interface WakanowSearchResponse {
  // Your backend's format (from the logs)
  provider?: string;
  offers?: any[];  // Array of flight offers
  total_offers?: number;
  selectData?: string;
  // Original Wakanow formats (kept for compatibility)
  FlightCombination?: {
    FlightModels: WakanowFlight[];
    Price?: { Amount: number; CurrencyCode: string };
  };
  FlightModels?: WakanowFlight[];
  SelectData?: string;
  data?: {
    offers?: any[];
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

// ============ BACKEND CONFIGURATION ============
// ✅ NOW USING YOUR BACKEND ENDPOINTS INSTEAD OF DIRECT WAKANOW CALLS

const BACKEND_BASE_URL = 'https://ebony-bruce-production.up.railway.app/api/v1/bookings/wakanow';

// Helper function to call your backend
async function backendFetch<T>(
  endpoint: string,
  options?: { method?: string; body?: object; authToken?: string }
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if provided (for authenticated user endpoints)
  if (options?.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }

  const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
    method: options?.method ?? 'POST',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Backend API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  // Extract the actual data from your backend response format
  // Your backend returns { success: true, data: {...} } or just the data directly
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }
  
  return data as T;
}

// ============ Public API Functions (Updated to use your backend) ============

// Cache for airports (still cached locally)
let cachedAirports: WakanowAirport[] | null = null;

export async function getWakanowAirports(): Promise<WakanowAirport[]> {
  if (cachedAirports) return cachedAirports;
  
  try {
    // ✅ Call your backend endpoint instead of Wakanow directly
    const response = await backendFetch<any>('/airports', {
      method: 'GET'
    });
    
    // Handle different response formats
    let airports: WakanowAirport[] = [];
    
    if (Array.isArray(response)) {
      airports = response;
    } else if (response && Array.isArray(response.airports)) {
      airports = response.airports;
    } else if (response && response.data && Array.isArray(response.data)) {
      airports = response.data;
    } else {
      // If no airports found, use fallback
      throw new Error('No airports data in response');
    }
    
    cachedAirports = airports;
    return cachedAirports;
  } catch (error) {
    console.error('Failed to fetch airports from backend, using fallback:', error);
    
    // Fallback mock airports
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
}

export async function searchWakanowFlights(params: WakanowFlightSearchParams): Promise<WakanowSearchResponse> {
  console.log('Search flights via backend:', params);
  
  // ✅ Convert params to match your backend's expected format
  const backendParams = {
    flightSearchType: params.FlightSearchType === 'Oneway' ? 'Oneway' : 
                      params.FlightSearchType === 'Return' ? 'Return' : 'Multicity',
    adults: params.Adults,
    children: params.Children,
    infants: params.Infants,
    ticketClass: params.Ticketclass,
    targetCurrency: params.TargetCurrency,
    currency: 'GBP', // Default as per your backend example
    itineraries: params.Itineraries.map(itin => ({
      Departure: itin.Departure,
      Destination: itin.Destination,
      DepartureDate: itin.DepartureDate
    }))
  };
  
  const result = await backendFetch<WakanowSearchResponse>('/search', {
    method: 'POST',
    body: backendParams,
  });
  
  console.log('Search response from backend:', result);
  return result;
}

export async function selectWakanowFlight(selectData: string, targetCurrency: string = 'NGN'): Promise<WakanowSelectResponse> {
  console.log('Select flight via backend');
  
  // ✅ Call your backend select endpoint
  const result = await backendFetch<WakanowSelectResponse>('/select', {
    method: 'POST',
    body: {
      selectData: selectData,
      targetCurrency: targetCurrency
    },
  });
  
  console.log('Select response from backend:', result);
  return result;
}

export async function bookWakanowFlight(bookingData: WakanowBookingRequest, authToken?: string): Promise<WakanowBookingResponse> {
  console.log('Book flight via backend:', { bookingId: bookingData.BookingId });
  
  // ✅ Convert to your backend's guest booking format
  const passengers = bookingData.PassengerDetails.map(passenger => ({
    passengerType: passenger.PassengerType,
    firstName: passenger.FirstName,
    lastName: passenger.LastName,
    dateOfBirth: passenger.DateOfBirth,
    phoneNumber: passenger.PhoneNumber,
    email: passenger.Email,
    gender: passenger.Gender,
    title: passenger.Title,
    address: passenger.Address,
    country: passenger.Country,
    countryCode: passenger.CountryCode,
    city: passenger.City,
    postalCode: passenger.PostalCode
  }));
  
  // Use guest booking endpoint (as shown in your backend examples)
  const result = await backendFetch<WakanowBookingResponse>('/book/guest', {
    method: 'POST',
    body: {
      bookingId: bookingData.BookingId,
      selectData: bookingData.BookingData,
      passengers: passengers
    },
    authToken: authToken
  });
  
  console.log('Book response from backend:', result);
  return result;
}

export async function ticketWakanowPNR(bookingId: string, pnrNumber: string): Promise<WakanowTicketResponse> {
  console.log('Get ticket via backend:', { bookingId, pnrNumber });
  
  // ✅ Call your backend ticket endpoint
  const result = await backendFetch<WakanowTicketResponse>('/ticket', {
    method: 'POST',
    body: {
      bookingId: bookingId,
      pnrNumber: pnrNumber
    },
  });
  
  console.log('Ticket response from backend:', result);
  return result;
}

export async function getWakanowWalletBalance(authToken?: string): Promise<{ Balance: number; Currency: string }> {
  console.log('Get wallet balance via backend');
  
  // ✅ Call your backend wallet endpoint
  const result = await backendFetch<{ balance: number; currency: string }>('/wallet-balance', {
    method: 'GET',
    authToken: authToken
  });
  
  // Convert to the expected format
  return {
    Balance: result.balance || 0,
    Currency: result.currency || 'NGN'
  };
}

// ============ Optional: Clear cache function ============
export function clearWakanowCache() {
  cachedAirports = null;
}