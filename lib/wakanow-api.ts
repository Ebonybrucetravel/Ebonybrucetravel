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

export interface PriceBreakdown {
  basePrice: number;
  markupAmount: number;
  markupPercentage: number;
  serviceFee: number;
  serviceFeePercentage: number;
  taxes: number;
  taxPercentage: number;
  totalAmount: number;
  currency: string;
  breakdown?: string;
}

export interface WakanowSearchResponse {
  success: boolean;
  data: {
    offers: any[];
    total_offers: number;
    selectData?: string;
  };
  message: string;
}

export interface WakanowSelectResponse {
  success: boolean;
  data: {
    provider: string;
    booking_id: string | null;
    select_data: string;
    is_price_matched: boolean;
    is_passport_required: boolean;
    priceBreakdown: PriceBreakdown | null;
    basePrice: number | null;
    markupAmount: number | null;
    markupPercentage: number | null;
    serviceFee: number | null;
    serviceFeePercentage: number | null;
    taxes: number | null;
    taxPercentage: number | null;
    totalAmount: number | null;
    currency: string;
    flight_summary: any | null;
    fare_rules: string[];
    penalty_rules: any | null;
    terms_and_conditions: {
      TermsAndConditions: string[];
      TermsAndConditionImportantNotice: string;
    };
    custom_messages: string[];
    message: string;
  };
  message: string;
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

export interface WakanowBookingResponse {
  success: boolean;
  data: {
    bookingId: string;
    bookingReference: string;
    status: string;
    passengerCount: number;
    totalAmount: number;
    currency: string;
    pnrNumber?: string;
  };
  message: string;
}

export interface WakanowTicketResponse {
  success: boolean;
  data: {
    bookingId: string;
    pnrNumber: string;
    ticketStatus: string;
    pnrStatus: string;
    walletBalance?: number;
    walletCurrency?: string;
  };
  message: string;
}

export interface WakanowWalletBalanceResponse {
  success: boolean;
  data: {
    Balance: number;
    Currency: string;
  };
  message: string;
}

export interface HealthCheckResponse {
  success: boolean;
  data: {
    healthy: boolean;
    status: string;
    timestamp?: string;
  };
  message: string;
}


const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ebony-bruce-production.up.railway.app/api/v1';
const WAKANOW_BASE_URL = `${BACKEND_BASE_URL}/bookings/wakanow`;


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

  try {
    const response = await fetch(`${WAKANOW_BASE_URL}${endpoint}`, {
      method: options?.method ?? 'POST',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    console.log(`📡 Backend response: ${endpoint} - ${response.status}`);

    const responseText = await response.text();
    
    let data: any = null;
    let isJson = false;
    
    try {
      if (responseText && responseText.length > 0) {
        data = JSON.parse(responseText);
        isJson = true;
        console.log(`📦 Backend response JSON:`, JSON.stringify(data).substring(0, 500));
      } else {
        console.warn('📦 Backend response is empty');
      }
    } catch (parseError) {
      if (responseText && responseText.length > 0) {
        console.warn('📦 Response is not valid JSON:', responseText.substring(0, 200));
      } else {
        console.warn('📦 Response is empty');
      }
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let isExpired = false;
      
      if (isJson && data) {
        console.error('📦 Backend error response:', data);
        
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.statusCode && data.message) {
          errorMessage = data.message;
        } else {
          errorMessage = JSON.stringify(data);
        }
        
        const errorLower = errorMessage.toLowerCase();
        const errorString = JSON.stringify(data).toLowerCase();
        
        if (errorLower.includes('expired') || 
            errorLower.includes('selectdata') ||
            errorLower.includes('bad request') ||
            errorString.includes('expired') ||
            errorString.includes('selectdata') ||
            errorString.includes('invalid') ||
            response.status === 400 || 
            response.status === 410 ||
            response.status === 500) {
          isExpired = true;
          errorMessage = 'SELECTION_EXPIRED';
        }
        
        if (response.status === 400 && data?.Message === "Bad Request") {
          isExpired = true;
          errorMessage = 'SELECTION_EXPIRED';
        }
      } else {
        if (responseText && responseText.length > 0) {
          console.error('📦 Non-JSON error response:', responseText.substring(0, 200));
          errorMessage = responseText;
          
          if (responseText.toLowerCase().includes('expired') || 
              responseText.toLowerCase().includes('bad request') ||
              responseText.toLowerCase().includes('500') ||
              responseText.toLowerCase().includes('an error has occured')) {
            isExpired = true;
          }
        } else {
          console.error('📦 Empty error response with status:', response.status);
          // If status is 500 and no response, treat as expired
          if (response.status === 500) {
            isExpired = true;
            errorMessage = 'SELECTION_EXPIRED';
          }
        }
      }
      
      if (isExpired) {
        throw new Error('SELECTION_EXPIRED');
      }
      
      console.error(`❌ Backend error (${response.status}): ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // ✅ Handle empty success response
    if (!isJson || !data) {
      console.warn('📦 Success response is empty or not JSON');
      // If status is 200 but no data, this might be a success with empty body
      if (response.status === 200) {
        // Return a default success response
        return { success: true, data: null } as T;
      }
      throw new Error('Empty response from server');
    }

    if (data && typeof data === 'object') {
      if (data.success === false) {
        const errorMsg = data.message || data.error || 'Backend operation failed';
        console.error('❌ Backend operation failed:', errorMsg);
        throw new Error(errorMsg);
      }
    }
    
    return data as T;
    
  } catch (error: any) {
    if (error.message === 'SELECTION_EXPIRED') {
      throw error;
    }
    
    console.error('❌ Backend fetch error:', error.message);
    throw error;
  }
}

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

export function formatWakanowGender(gender: string | undefined): 'Male' | 'Female' {
  if (!gender) return 'Male';
  
  const lower = gender.toLowerCase();
  if (lower === 'm' || lower === 'male') return 'Male';
  if (lower === 'f' || lower === 'female') return 'Female';
  
  return 'Male';
}

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
let airportCacheTime: number | null = null;
const AIRPORT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getWakanowAirports(query?: string, limit?: number): Promise<WakanowAirport[]> {
  const now = Date.now();
  if (cachedAirports && airportCacheTime && (now - airportCacheTime) < AIRPORT_CACHE_TTL) {
    if (query) {
      const q = query.trim().toLowerCase();
      return cachedAirports.filter(
        (a: WakanowAirport) =>
          a.AirportCode?.toLowerCase().includes(q) ||
          a.AirportName?.toLowerCase().includes(q) ||
          a.City?.toLowerCase().includes(q) ||
          a.CityCountry?.toLowerCase().includes(q) ||
          a.Country?.toLowerCase().includes(q)
      );
    }
    return cachedAirports;
  }
  
  try {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (limit) params.append('limit', limit.toString());
    
    const response = await backendFetch<any>(`/airports?${params.toString()}`, {
      method: 'GET'
    });
    
    let airports: WakanowAirport[] = [];
    
    if (response && response.data && Array.isArray(response.data)) {
      airports = response.data;
    } else if (Array.isArray(response)) {
      airports = response;
    } else if (response && Array.isArray(response.airports)) {
      airports = response.airports;
    } else {
      throw new Error('No airports data in response');
    }
    
    cachedAirports = airports;
    airportCacheTime = now;
    
    return airports;
  } catch (error) {
    console.error('Failed to fetch airports from backend, using fallback:', error);
    
    const fallbackAirports: WakanowAirport[] = [
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
    
    if (query) {
      const q = query.trim().toLowerCase();
      return fallbackAirports.filter(
        (a: WakanowAirport) =>
          a.AirportCode?.toLowerCase().includes(q) ||
          a.AirportName?.toLowerCase().includes(q) ||
          a.City?.toLowerCase().includes(q)
      );
    }
    
    return fallbackAirports;
  }
}

// ============ SEARCH FUNCTION ============

export async function searchWakanowFlights(params: WakanowFlightSearchParams): Promise<WakanowSearchResponse> {
  console.log('🔍 Search flights via backend:', params);

  const formattedItineraries = params.Itineraries.map((itin: { Departure: string; Destination: string; DepartureDate: string; Ticketclass?: string }) => {
    let departureDate = itin.DepartureDate;
    if (departureDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = departureDate.split('-');
      departureDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return {
      Departure: itin.Departure.toUpperCase(),
      Destination: itin.Destination.toUpperCase(),
      DepartureDate: departureDate,
      Ticketclass: itin.Ticketclass
    };
  });
  
  const backendParams = {
    flightSearchType: params.FlightSearchType === 'Oneway' ? 'Oneway' : 
                      params.FlightSearchType === 'Return' ? 'Return' : 'Multidestination',
    adults: params.Adults,
    children: params.Children || 0,
    infants: params.Infants || 0,
    ticketClass: params.Ticketclass || 'Y',
    targetCurrency: params.TargetCurrency || 'NGN',
    currency: 'GBP',
    itineraries: formattedItineraries
  };
  
  const result = await backendFetch<WakanowSearchResponse>('/search', {
    method: 'POST',
    body: backendParams,
  });
  
  return result;
}

// ============ SELECT FUNCTION - FIXED ============

export async function selectWakanowFlight(selectData: string, targetCurrency: string = 'NGN'): Promise<WakanowSelectResponse> {
  console.log('🛫 Select flight via backend');
  console.log('📝 SelectData length:', selectData?.length);
  console.log('📝 SelectData type:', typeof selectData);
  console.log('📝 SelectData first 100 chars:', selectData?.substring(0, 100));
  
  if (!selectData) {
    throw new Error('Missing selectData. Please search for flights again.');
  }
  
  let cleanedSelectData = selectData.trim();
  
  if (cleanedSelectData.length < 10) {
    console.error('❌ Invalid selectData (too short):', cleanedSelectData);
    throw new Error('Invalid selectData (too short). Please search for flights again.');
  }
  
  try {
    // ✅ Don't send compressed SelectData to backend - filter it out first
    const isCompressed = cleanedSelectData.length > 500 || 
                         cleanedSelectData.startsWith('7h4AAB+LCAAAAAAABAD') ||
                         cleanedSelectData.startsWith('H4sI');
    
    if (isCompressed) {
      console.error('❌ Compressed SelectData detected - this will fail with 500');
      console.error('❌ Length:', cleanedSelectData.length);
      console.error('❌ Preview:', cleanedSelectData.substring(0, 50));
      throw new Error('SELECTION_EXPIRED');
    }
    
    console.log('✅ Valid SelectData format detected, sending to backend...');
    
    const response = await backendFetch<WakanowSelectResponse>('/select', {
      method: 'POST',
      body: {
        selectData: cleanedSelectData,
        targetCurrency: targetCurrency
      },
    });
    
    console.log('📦 Select response received:', {
      success: response?.success,
      hasData: !!response?.data,
      hasBookingId: !!response?.data?.booking_id,
      hasSelectData: !!response?.data?.select_data,
      hasPriceBreakdown: !!response?.data?.priceBreakdown,
      totalAmount: response?.data?.totalAmount,
      fullResponse: JSON.stringify(response).substring(0, 500)
    });
    
    // ✅ Check if response is valid
    if (!response || typeof response !== 'object') {
      console.error('❌ Invalid response from backend:', response);
      throw new Error('SELECTION_EXPIRED');
    }
    
    if (!response.success) {
      console.error('❌ Backend returned success: false', response.message);
      throw new Error(response.message || 'SELECTION_EXPIRED');
    }
    
    if (!response.data) {
      console.error('❌ Backend returned no data:', response);
      throw new Error('SELECTION_EXPIRED');
    }
    
    if (!response.data.booking_id) {
      console.error('❌ Backend returned no booking_id:', response.data);
      throw new Error('SELECTION_EXPIRED');
    }
    
    return response;
    
  } catch (error: any) {
    console.error('❌ Wakanow select failed:', error.message);
    console.error('❌ Error details:', error);
    
    if (error.message === 'SELECTION_EXPIRED') {
      throw error;
    }
    
    const errorLower = error.message?.toLowerCase() || '';
    if (errorLower.includes('expired') || 
        errorLower.includes('session') ||
        errorLower.includes('bad request') ||
        errorLower.includes('invalid') ||
        errorLower.includes('selectdata') ||
        errorLower.includes('500') ||
        errorLower.includes('an error has occured')) {
      throw new Error('SELECTION_EXPIRED');
    }
    
    throw error;
  }
}

export async function bookWakanowFlight(
  bookingData: {
    bookingId: string;
    selectData: string;
    targetCurrency?: string;
    passengers: WakanowBackendPassenger[];
    priceBreakdown?: PriceBreakdown;
  }, 
  authToken?: string
): Promise<WakanowBookingResponse> {
  console.log('📝 Book flight via backend:', { 
    bookingId: bookingData.bookingId,
    passengerCount: bookingData.passengers.length 
  });
  
  if (!bookingData.bookingId) {
    throw new Error('BookingId is required');
  }
  if (!bookingData.selectData) {
    throw new Error('SelectData is required');
  }
  if (!bookingData.passengers || bookingData.passengers.length === 0) {
    throw new Error('At least one passenger is required');
  }
  
  const endpoint = authToken ? '/book' : '/book/guest';
  
  const result = await backendFetch<WakanowBookingResponse>(endpoint, {
    method: 'POST',
    body: {
      bookingId: bookingData.bookingId,
      selectData: bookingData.selectData,
      passengers: bookingData.passengers,
      targetCurrency: bookingData.targetCurrency || 'NGN',
      priceBreakdown: bookingData.priceBreakdown
    },
    authToken: authToken
  });
  
  console.log('📦 Book response:', {
    success: result?.success,
    bookingId: result?.data?.bookingId,
    hasPnr: !!result?.data?.pnrNumber
  });
  
  return result;
}

export async function bookWakanowFlightGuest(
  bookingData: {
    bookingId: string;
    selectData: string;
    targetCurrency?: string;
    passengers: WakanowBackendPassenger[];
    priceBreakdown?: PriceBreakdown;
  }
): Promise<WakanowBookingResponse> {
  return bookWakanowFlight(bookingData);
}

// ============ TICKET FUNCTION ============

export async function ticketWakanowFlight(
  bookingId: string, 
  pnrNumber: string,
  localBookingId?: string,
  authToken?: string
): Promise<WakanowTicketResponse> {
  console.log('🎫 Issue ticket via backend:', { bookingId, pnrNumber, localBookingId });
  
  if (!bookingId) {
    throw new Error('BookingId is required for ticket issuance');
  }
  if (!pnrNumber) {
    throw new Error('PNR number is required for ticket issuance');
  }
  
  const result = await backendFetch<WakanowTicketResponse>('/ticket', {
    method: 'POST',
    body: {
      bookingId: bookingId,
      pnrNumber: pnrNumber,
      localBookingId: localBookingId
    },
    authToken: authToken
  });
  
  console.log('📦 Ticket response:', {
    success: result?.success,
    ticketStatus: result?.data?.ticketStatus,
    pnrStatus: result?.data?.pnrStatus
  });
  
  return result;
}

// ============ WALLET FUNCTION ============

export async function getWakanowWalletBalance(authToken?: string): Promise<WakanowWalletBalanceResponse> {
  console.log('💰 Get wallet balance via backend');
  
  const result = await backendFetch<WakanowWalletBalanceResponse>('/wallet-balance', {
    method: 'GET',
    authToken: authToken
  });
  
  return result;
}

// ============ HEALTH CHECK FUNCTION ============

export async function healthCheck(): Promise<HealthCheckResponse> {
  console.log('🏥 Health check via backend');
  
  const result = await backendFetch<HealthCheckResponse>('/health', {
    method: 'GET'
  });
  
  return result;
}

// ============ CACHE CLEAR FUNCTION ============

export function clearWakanowCache() {
  cachedAirports = null;
  airportCacheTime = null;
}

// ============ HELPER FUNCTIONS FOR SELECT RESPONSE ============

/**
 * Safely extract data from WakanowSelectResponse
 */
export function getSelectData(response: WakanowSelectResponse) {
  if (!response || !response.success) {
    return null;
  }
  return response.data;
}

/**
 * Get booking info from select response
 */
export function getBookingInfoFromSelect(response: WakanowSelectResponse) {
  const data = response?.data;
  if (!data) return null;
  
  return {
    bookingId: data.booking_id,
    selectData: data.select_data,
    priceBreakdown: data.priceBreakdown,
    totalAmount: data.totalAmount,
    basePrice: data.basePrice,
    markupAmount: data.markupAmount,
    markupPercentage: data.markupPercentage,
    serviceFee: data.serviceFee,
    serviceFeePercentage: data.serviceFeePercentage,
    taxes: data.taxes,
    taxPercentage: data.taxPercentage,
    currency: data.currency,
    termsAndConditions: data.terms_and_conditions,
    flightSummary: data.flight_summary,
    fareRules: data.fare_rules,
    isPriceMatched: data.is_price_matched,
    isPassportRequired: data.is_passport_required,
    customMessages: data.custom_messages,
    message: data.message,
    provider: data.provider
  };
}

// ============ ALIAS FOR BACKWARD COMPATIBILITY ============

// ✅ Export ticketWakanowPNR as alias for ticketWakanowFlight
export const ticketWakanowPNR = ticketWakanowFlight;

// ============ REACT HOOKS ============

import { useState, useCallback } from 'react';

// ============ USE WAKANOW SEARCH HOOK ============

export function useWakanowSearch() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WakanowSearchResponse | null>(null);
  const [selectData, setSelectData] = useState<string | null>(null);

  const search = useCallback(async (params: WakanowFlightSearchParams) => {
    setLoading(true);
    setError(null);
    setSelectData(null);
    
    try {
      const response = await searchWakanowFlights(params);
      if (response.success && response.data.offers.length > 0) {
        setResults(response);
        
        if (response.data.selectData) {
          setSelectData(response.data.selectData);
          console.log('✅ Stored selectData from search response');
        } else {
          const firstOffer = response.data.offers[0];
          if (firstOffer && firstOffer.SelectData) {
            setSelectData(firstOffer.SelectData);
            console.log('✅ Stored selectData from first offer');
          }
        }
        
        return response;
      } else {
        setError(response.message || 'No flights found');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, loading, error, results, selectData };
}

// ============ USE WAKANOW SELECT HOOK ============

export function useWakanowSelect() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<WakanowSelectResponse['data'] | null>(null);
  const [fullResponse, setFullResponse] = useState<WakanowSelectResponse | null>(null);

  const select = useCallback(async (selectDataParam: string, targetCurrency?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await selectWakanowFlight(selectDataParam, targetCurrency);
      setFullResponse(response);
      
      if (response.success) {
        setSelectedData(response.data);
        return response.data;
      } else {
        setError(response.message || 'Selection failed');
        return null;
      }
    } catch (err: any) {
      if (err.message === 'SELECTION_EXPIRED') {
        setError('Your flight selection has expired. Please search again.');
      } else {
        setError(err.message || 'An error occurred');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { select, loading, error, selectedData, fullResponse };
}

// ============ USE WAKANOW BOOKING HOOK ============

export function useWakanowBooking() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<WakanowBookingResponse['data'] | null>(null);

  const book = useCallback(async (
    bookingData: {
      bookingId: string;
      selectData: string;
      targetCurrency?: string;
      passengers: WakanowBackendPassenger[];
      priceBreakdown?: PriceBreakdown;
    },
    authToken?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = authToken 
        ? await bookWakanowFlight(bookingData, authToken)
        : await bookWakanowFlightGuest(bookingData);
      
      if (response.success) {
        setBooking(response.data);
        return response.data;
      } else {
        setError(response.message || 'Booking failed');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { book, loading, error, booking };
}

// ============ USE WAKANOW TICKET HOOK ============

export function useWakanowTicket() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<WakanowTicketResponse['data'] | null>(null);

  const issue = useCallback(async (
    bookingId: string,
    pnrNumber: string,
    localBookingId?: string,
    authToken?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await ticketWakanowFlight(bookingId, pnrNumber, localBookingId, authToken);
      if (response.success) {
        setTicket(response.data);
        return response.data;
      } else {
        setError(response.message || 'Ticket issuance failed');
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { issue, loading, error, ticket };
}

// ============ USE WAKANOW AIRPORTS HOOK ============

export function useWakanowAirports() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [airports, setAirports] = useState<WakanowAirport[]>([]);

  const fetchAirports = useCallback(async (query?: string, limit?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await getWakanowAirports(query, limit);
      setAirports(results);
      return results;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch airports');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchAirports, loading, error, airports };
}

// ============ EXPORT DEFAULT ============

export default {
  getWakanowAirports,
  searchWakanowFlights,
  selectWakanowFlight,
  bookWakanowFlight,
  bookWakanowFlightGuest,
  ticketWakanowFlight,
  ticketWakanowPNR,
  getWakanowWalletBalance,
  healthCheck,
  clearWakanowCache,
  formatWakanowTitle,
  formatWakanowGender,
  formatWakanowPhone,
  formatWakanowDate,
  createWakanowPassenger,
  getSelectData,
  getBookingInfoFromSelect,
  useWakanowSearch,
  useWakanowSelect,
  useWakanowBooking,
  useWakanowTicket,
  useWakanowAirports,
};