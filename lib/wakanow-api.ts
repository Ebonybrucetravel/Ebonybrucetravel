// lib/wakanow-api.ts
// Wakanow API client - ROUTING THROUGH YOUR BACKEND

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

export interface WakanowSearchResponse {
  provider?: string;
  offers?: any[];
  total_offers?: number;
  selectData?: string;
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
  provider?: string;
  booking_id?: string;
  is_price_matched?: boolean;
  is_passport_required?: boolean;
  select_data?: string;
  flight_summary?: {
    slices: any[];
    price: { Amount: number; CurrencyCode: string };
    price_details: any[];
    is_refundable: boolean;
  };
  fare_rules?: string[];
  penalty_rules?: any;
  terms_and_conditions?: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  };
  custom_messages?: any[];
  message?: string;
  success?: boolean;
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
  Title: string;
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
}

// ✅ NEW: Backend passenger interface (snake_case)
export interface WakanowBackendPassenger {
  passengerType: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  passportNumber?: string;
  expiryDate?: string;
  passportIssuingAuthority?: string;
  passportIssueCountryCode?: string;
  gender: string;
  title: string;
  email: string;
  address: string;
  country: string;
  countryCode: string;
  city: string;
  postalCode: string;
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

const BACKEND_BASE_URL = 'https://ebony-bruce-production.up.railway.app/api/v1/bookings/wakanow';

// ============ HELPER FUNCTION WITH IMPROVED ERROR HANDLING ============

async function backendFetch<T>(
  endpoint: string,
  options?: { method?: string; body?: object; authToken?: string }
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (options?.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }

  console.log(`📡 Backend request: ${endpoint}`);

  const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
    method: options?.method ?? 'POST',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  console.log(`📡 Backend response: ${endpoint} - ${response.status}`);

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorData: any = null;
    
    try {
      errorData = await response.json();
      console.error('📦 Backend error response:', errorData);
      
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.statusCode && errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const firstError = errorData.errors[0];
        errorMessage = firstError.message || firstError.msg || firstError;
      }
      
      if (response.status === 400 && errorMessage.toLowerCase().includes('selectdata')) {
        errorMessage = 'Your flight selection has expired. Please go back and search again.';
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = 'Your session has expired. Please login again.';
      } else if (response.status === 404) {
        errorMessage = 'The requested resource was not found. Please try again.';
      }
    } catch (e) {
      console.error('Failed to parse error response:', e);
      try {
        const textError = await response.text();
        if (textError) {
          errorMessage = textError.substring(0, 200);
        }
      } catch (textErr) {
        // Use default error message
      }
    }
    
    console.error(`❌ Backend error (${response.status}): ${errorMessage}`);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (data && typeof data === 'object') {
    if (data.success === false) {
      const errorMsg = data.message || data.error || 'Backend operation failed';
      console.error('❌ Backend operation failed:', errorMsg);
      throw new Error(errorMsg);
    }
  }
  
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }
  
  return data as T;
}

// ============ HELPER FUNCTIONS (EXPORTED) ============

/**
 * Format title to match Wakanow API expectations
 * Valid titles: Mr, Mrs, Miss, Ms, Dr, Prof
 */
export function formatWakanowTitle(title: string | undefined): string {
  if (!title) return 'Mr';
  
  let formatted = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  
  const titleMap: Record<string, string> = {
    'mr': 'Mr',
    'mrs': 'Mrs',
    'miss': 'Miss',
    'ms': 'Ms',
    'dr': 'Dr',
    'prof': 'Prof',
    'mr.': 'Mr',
    'mrs.': 'Mrs',
    'miss.': 'Miss',
    'ms.': 'Ms',
    'dr.': 'Dr',
    'prof.': 'Prof',
  };
  
  const lowerTitle = formatted.toLowerCase();
  if (titleMap[lowerTitle]) {
    return titleMap[lowerTitle];
  }
  
  return 'Mr';
}

/**
 * Format gender to match Wakanow API expectations
 */
export function formatWakanowGender(gender: string | undefined): 'Male' | 'Female' {
  if (!gender) return 'Male';
  
  const lower = gender.toLowerCase();
  if (lower === 'm' || lower === 'male') return 'Male';
  if (lower === 'f' || lower === 'female') return 'Female';
  
  return 'Male';
}

/**
 * Format phone number to E.164 format with +
 */
export function formatWakanowPhone(phone: string | undefined): string {
  if (!phone) return '+2348000000000';
  
  let cleaned = phone.replace(/[\s\-()]/g, '');
  
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+234' + cleaned.slice(1);
    } else if (cleaned.startsWith('234')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatWakanowDate(date: string | undefined): string {
  if (!date) return '1990-01-01';
  
  if (date.includes('T')) {
    return date.split('T')[0];
  }
  
  try {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // If parsing fails, return as is
  }
  
  return date;
}

/**
 * Create a properly formatted Wakanow passenger from frontend passenger data
 */
export function createWakanowPassenger(p: any): WakanowPassenger {
  return {
    PassengerType: p.PassengerType || p.passengerType || 'Adult',
    FirstName: p.FirstName || p.firstName || '',
    MiddleName: p.MiddleName || p.middleName || '',
    LastName: p.LastName || p.lastName || '',
    DateOfBirth: formatWakanowDate(p.DateOfBirth || p.dateOfBirth),
    PhoneNumber: formatWakanowPhone(p.PhoneNumber || p.phone),
    PassportNumber: p.PassportNumber || p.passportNumber || '',
    ExpiryDate: formatWakanowDate(p.ExpiryDate || p.passportExpiry),
    PassportIssuingAuthority: p.PassportIssuingAuthority || p.passportIssuingAuthority || '',
    PassportIssueCountryCode: p.PassportIssueCountryCode || p.passportIssueCountry || '',
    Gender: formatWakanowGender(p.Gender || p.gender),
    Title: formatWakanowTitle(p.Title || p.title),
    Email: p.Email || p.email || '',
    Address: p.Address || p.address || '123 Fake Street',
    Country: p.Country || p.country || 'Nigeria',
    CountryCode: p.CountryCode || p.countryCode || 'NG',
    City: p.City || p.city || 'Lagos',
    PostalCode: p.PostalCode || p.postalCode || '100001',
  };
}

// ============ Public API Functions ============

let cachedAirports: WakanowAirport[] | null = null;

export async function getWakanowAirports(): Promise<WakanowAirport[]> {
  if (cachedAirports) return cachedAirports;
  
  try {
    const response = await backendFetch<any>('/airports', {
      method: 'GET'
    });
    
    let airports: WakanowAirport[] = [];
    
    if (Array.isArray(response)) {
      airports = response;
    } else if (response && Array.isArray(response.airports)) {
      airports = response.airports;
    } else if (response && response.data && Array.isArray(response.data)) {
      airports = response.data;
    } else {
      throw new Error('No airports data in response');
    }
    
    cachedAirports = airports;
    return cachedAirports;
  } catch (error) {
    console.error('Failed to fetch airports from backend, using fallback:', error);
    
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

// ✅ FIXED: searchWakanowFlights with proper date format conversion
export async function searchWakanowFlights(params: WakanowFlightSearchParams): Promise<WakanowSearchResponse> {
  console.log('🔍 Search flights via backend:', params);
  
  // ✅ Format dates to MM/DD/YYYY for Wakanow API
  const formattedItineraries = params.Itineraries.map(itin => {
    let departureDate = itin.DepartureDate;
    // If date is in YYYY-MM-DD format, convert to MM/DD/YYYY
    if (departureDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = departureDate.split('-');
      departureDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return {
      Departure: itin.Departure,
      Destination: itin.Destination,
      DepartureDate: departureDate
    };
  });
  
  const backendParams = {
    flightSearchType: params.FlightSearchType === 'Oneway' ? 'Oneway' : 
                      params.FlightSearchType === 'Return' ? 'Return' : 'Multicity',
    adults: params.Adults,
    children: params.Children,
    infants: params.Infants,
    ticketClass: params.Ticketclass,
    targetCurrency: params.TargetCurrency,
    currency: 'GBP',
    itineraries: formattedItineraries
  };
  
  const result = await backendFetch<WakanowSearchResponse>('/search', {
    method: 'POST',
    body: backendParams,
  });
  
  console.log('📦 Search response from backend:', {
    hasOffers: !!result?.offers,
    offersLength: result?.offers?.length,
    hasSelectData: !!result?.selectData
  });
  
  return result;
}

export async function selectWakanowFlight(selectData: string, targetCurrency: string = 'NGN'): Promise<WakanowSelectResponse> {
  console.log('🛫 Select flight via backend');
  console.log('📝 SelectData length:', selectData?.length);
  
  if (!selectData) {
    throw new Error('Missing selectData. Please search for flights again.');
  }
  
  if (selectData.length < 10) {
    throw new Error('Invalid selectData (too short). Please search for flights again.');
  }
  
  try {
    const result = await backendFetch<any>('/select', {
      method: 'POST',
      body: {
        selectData: selectData,
        targetCurrency: targetCurrency
      },
    });
    
    console.log('📦 Select response from backend:', {
      hasData: !!result,
      dataKeys: result ? Object.keys(result) : [],
      hasBookingId: !!result?.booking_id,
      hasSelectData: !!result?.select_data,
    });
    
    if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
      throw new Error('No data received from Wakanow. Please try searching again.');
    }
    
    if (result.success === false) {
      throw new Error(result.message || 'Wakanow selection failed. Please try again.');
    }
    
    if (!result.select_data && result.SelectData) {
      result.select_data = result.SelectData;
    }
    
    return result as WakanowSelectResponse;
  } catch (error: any) {
    console.error('❌ Wakanow select failed:', error.message);
    
    if (error.message?.includes('expired') || error.message?.includes('session')) {
      throw new Error('Your flight selection has expired. Please go back and search again.');
    }
    
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('Flight not found. Please search again.');
    }
    
    throw error;
  }
}

// ✅ UPDATED: bookWakanowFlight with proper typing
export async function bookWakanowFlight(
  bookingData: {
    BookingId: string;
    BookingData: string;
    TargetCurrency: string;
    PassengerDetails: WakanowBackendPassenger[]; // ✅ Accepts snake_case
  }, 
  authToken?: string
): Promise<WakanowBookingResponse> {
  console.log('📝 Book flight via backend:', { bookingId: bookingData.BookingId });
  
  // ✅ Passengers are already in snake_case format for the backend
  const passengers = bookingData.PassengerDetails;
  
  const result = await backendFetch<any>('/book/guest', {
    method: 'POST',
    body: {
      bookingId: bookingData.BookingId,
      selectData: bookingData.BookingData,
      passengers: passengers
    },
    authToken: authToken
  });
  
  console.log('📦 Raw book response:', JSON.stringify(result, null, 2));
  
  // ✅ Extract BookingId from multiple possible locations
  let bookingId = result?.BookingId || 
                  result?.bookingId || 
                  result?.data?.BookingId || 
                  result?.data?.bookingId ||
                  result?.id ||
                  result?.data?.id ||
                  result?.booking?.id ||
                  null;
  
  // ✅ If still no bookingId, check if the response has a data wrapper
  if (!bookingId && result?.data && typeof result.data === 'object') {
    bookingId = result.data.BookingId || result.data.bookingId || result.data.id;
  }
  
  // ✅ Extract PNR from multiple possible locations
  let pnrNumber = result?.FlightBookingResult?.FlightBookingSummaryModel?.PnReferenceNumber ||
                  result?.FlightBookingResult?.PnReferenceNumber ||
                  result?.FlightBookingResult?.FlightBookingSummaryModel?.PnrReferenceNumber ||
                  result?.pnrNumber ||
                  result?.PnrNumber ||
                  result?.data?.pnrNumber ||
                  result?.data?.PnrNumber ||
                  null;
  
  // ✅ If still no pnr, check in data wrapper
  if (!pnrNumber && result?.data && typeof result.data === 'object') {
    pnrNumber = result.data.pnrNumber || result.data.PnrNumber || result.data.PnReferenceNumber;
  }
  
  console.log('📦 Extracted booking data:', {
    bookingId,
    pnrNumber,
    hasBookingId: !!bookingId,
    hasPnr: !!pnrNumber
  });
  
  if (!bookingId) {
    console.error('❌ No booking ID found. Full response:', JSON.stringify(result, null, 2));
    throw new Error('Wakanow booking failed: No booking ID in response');
  }
  
  // ✅ Build response in the expected format
  const response: WakanowBookingResponse = {
    BookingId: bookingId,
    CustomerId: result?.CustomerId || result?.customerId || result?.data?.CustomerId || '',
    ProductType: 'Flight',
    TargetCurrency: result?.TargetCurrency || result?.targetCurrency || result?.data?.TargetCurrency || 'NGN',
    FlightBookingResult: {
      PnReferenceNumber: pnrNumber || '',
      PnDate: result?.PnDate || result?.pnrDate || result?.data?.pnrDate || new Date().toISOString(),
      FlightSummaryModel: result?.FlightSummaryModel || result?.flightSummary || result?.data?.flightSummary || {},
      PnStatus: result?.PnStatus || result?.pnrStatus || result?.data?.pnrStatus || 'PENDING',
      TicketStatus: result?.TicketStatus || result?.ticketStatus || result?.data?.ticketStatus || 'PENDING',
    },
    ProductTermsAndConditions: {
      TermsAndConditions: result?.ProductTermsAndConditions?.TermsAndConditions || result?.data?.ProductTermsAndConditions?.TermsAndConditions || [],
    },
    success: true,
    message: result?.message || result?.data?.message || 'Booking successful',
  };
  
  console.log('📦 Final book response:', {
    success: response.success,
    bookingId: response.BookingId,
    pnr: response.FlightBookingResult?.PnReferenceNumber
  });
  
  return response;
}

export async function ticketWakanowPNR(bookingId: string, pnrNumber: string): Promise<WakanowTicketResponse> {
  console.log('🎫 Get ticket via backend:', { bookingId, pnrNumber });
  
  const result = await backendFetch<WakanowTicketResponse>('/ticket', {
    method: 'POST',
    body: {
      bookingId: bookingId,
      pnrNumber: pnrNumber
    },
  });
  
  console.log('📦 Ticket response from backend:', {
    success: result?.success,
    hasBookingSummary: !!result?.FlightBookingSummary
  });
  
  return result;
}

export async function getWakanowWalletBalance(authToken?: string): Promise<{ Balance: number; Currency: string }> {
  console.log('💰 Get wallet balance via backend');
  
  const result = await backendFetch<{ balance: number; currency: string }>('/wallet-balance', {
    method: 'GET',
    authToken: authToken
  });
  
  return {
    Balance: result.balance || 0,
    Currency: result.currency || 'NGN'
  };
}

export function clearWakanowCache() {
  cachedAirports = null;
}