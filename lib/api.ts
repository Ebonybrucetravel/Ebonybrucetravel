// api.ts - COMPLETE VERSION with Amadeus hotel booking and FIXED flight search
const API_BASE = 'https://ebony-bruce-production.up.railway.app';

// Define ApiError class with enhanced error handling
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  status?: string | number;
  error?: string;
  [key: string]: any;
}

// User interface
export interface User {
  id?: string;
  name: string;
  email: string;
  profilePicture?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  provider?: "email" | "google" | "facebook";
  role?: "user" | "admin";
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  token?: string;
  isVerified?: boolean;
}

// Hotel search interfaces
export interface HotelSearchParams {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  roomQuantity: number;
  currency?: string;
  bestRateOnly?: boolean;
  [key: string]: any;
}

export interface HotelOffer {
  type: string;
  hotel: {
    type: string;
    hotelId: string;
    chainCode?: string;
    dupeId?: string;
    name: string;
    cityCode: string;
    latitude?: number;
    longitude?: number;
    rating?: number;
    amenities?: string[];
    description?: string;
    address?: {
      cityName?: string;
      countryCode?: string;
      postalCode?: string;
      lines?: string[];
    };
  };
  available: boolean;
  offers: Array<{
    id: string;
    checkInDate: string;
    checkOutDate: string;
    rateCode?: string;
    boardType?: string;
    room: {
      type: string;
      typeEstimated?: {
        category?: string;
        beds?: number;
        bedType?: string;
      };
      description?: {
        text?: string;
        lang?: string;
      };
    };
    isLoyaltyRate?: string;
    guests: {
      adults: number;
    };
    price: {
      currency: string;
      base: string;
      total: string;
      taxes?: Array<{
        code?: string;
        percentage?: string;
        included?: boolean;
      }>;
      variations?: {
        average?: {
          base?: string;
        };
        changes?: Array<{
          startDate: string;
          endDate: string;
          base?: string;
          total?: string;
        }>;
      };
      original_total?: string;
      original_currency?: string;
    };
    policies?: {
      cancellations?: Array<{
        description?: {
          text?: string;
        };
        numberOfNights?: number;
        deadline?: string;
        amount?: string;
        policyType: string;
      }>;
      prepay?: {
        acceptedPayments?: {
          creditCards?: string[];
          methods?: string[];
          creditCardPolicies?: Array<{
            vendorCode: string;
          }>;
        };
      };
      paymentType?: string;
      refundable?: {
        cancellationRefund?: string;
      };
    };
    self?: string;
    roomInformation?: {
      description: string;
      type: string;
      typeEstimated?: {
        category?: string;
        beds?: number;
        bedType?: string;
      };
    };
    original_price?: string;
    original_currency?: string;
    base_price?: string;
    currency?: string;
    conversion_fee?: string;
    conversion_fee_percentage?: number;
    price_after_conversion?: string;
    markup_percentage?: number;
    markup_amount?: string;
    service_fee?: string;
    final_price?: string;
  }>;
  self?: string;
  currency?: string;
}

export interface HotelSearchResponse {
  success?: boolean;
  data?: {
    data: HotelOffer[];
    meta?: any;
    currency?: string;
    conversion_note?: string;
    cached?: boolean;
  };
  message?: string;
  [key: string]: any;
}

// Hotel booking interfaces
export interface HotelGuest {
  name: {
    title: string;
    firstName: string;
    lastName: string;
  };
  contact: {
    phone: string;
    email: string;
  };
}

export interface RoomAssociation {
  hotelOfferId: string;
  guestReferences: Array<{
    guestReference: string;
  }>;
}

export interface PaymentCardInfo {
  vendorCode: string;
  cardNumber: string;
  expiryDate: string; // Format: "YYYY-MM"
  holderName: string;
  securityCode: string;
}

export interface HotelBookingRequest {
  hotelOfferId: string;
  offerPrice: number;
  currency: string;
  guests: HotelGuest[];
  roomAssociations: RoomAssociation[];
  payment: {
    method: "CREDIT_CARD";
    paymentCard: {
      paymentCardInfo: PaymentCardInfo;
    };
  };
  travelAgentEmail?: string;
  accommodationSpecialRequests?: string;
}

export interface HotelBookingResponse {
  success?: boolean;
  data?: {
    bookingId: string;
    confirmationNumber?: string;
    status?: string;
    hotelName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    totalPrice?: number;
    currency?: string;
    guests?: HotelGuest[];
    roomType?: string;
    cancellationPolicy?: string;
    bookingDate?: string;
  };
  message?: string;
  [key: string]: any;
}

// Flight search interfaces
export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  currency?: string;
  maxConnections?: number;
  [key: string]: any;
}

export interface FlightSearchResponse {
  success?: boolean;
  data?: {
    offer_request_id: string;
    status: string;
    created_at: string;
    total_offers?: number;
    [key: string]: any;
  };
  message?: string;
  error?: string;
  [key: string]: any;
}

// ────────────────────────────────────────────────
// Helper: get current auth token from localStorage
// ────────────────────────────────────────────────
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = 
    localStorage.getItem('travelToken') || 
    localStorage.getItem('authToken') ||
    localStorage.getItem('travelUser') ? JSON.parse(localStorage.getItem('travelUser') || '{}').token : null;
  
  return token;
}

// ────────────────────────────────────────────────
// Core request function with enhanced error handling
// ────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;
  
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  // Add Content-Type only if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Merge custom headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (value !== undefined) {
        headers[key] = value.toString();
      }
    });
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  // Add timeout using AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type");
    let data: any;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text || response.statusText };
    }

    // Handle common auth errors
    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('auth-expired'));
      throw new ApiError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new ApiError('You do not have permission to perform this action.', 403, 'FORBIDDEN');
    }

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Server error: ${response.status}`;
      throw new ApiError(errorMessage, response.status, data?.code, data);
    }

    // Return the full response
    return data as T;

  } catch (error: any) {
    console.error(`[API Request Error] ${options.method || 'GET'} ${url}:`, error);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Server is slow or unreachable.', 504, 'TIMEOUT');
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new ApiError(
        'Cannot connect to server. Check your internet or try again later.',
        0,
        'NETWORK_ERROR'
      );
    }

    throw new ApiError(
      error.message || 'An unexpected error occurred',
      error.status || 0,
      'UNKNOWN_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ────────────────────────────────────────────────
// Token management helpers
// ────────────────────────────────────────────────
export function setAuthToken(token: string, user?: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('travelToken', token);
    sessionStorage.setItem('authToken', token);
    
    if (user) {
      localStorage.setItem('travelUser', JSON.stringify({ ...user, token }));
    }
    
    window.dispatchEvent(new CustomEvent('auth-token-set', { detail: { token, user } }));
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('travelToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('travelUser');
    sessionStorage.removeItem('authToken');
    window.dispatchEvent(new CustomEvent('auth-token-cleared'));
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('travelToken') || localStorage.getItem('authToken');
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('travelUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

// ────────────────────────────────────────────────
// City code helper function
// ────────────────────────────────────────────────
export const getCityCode = (cityName: string): string => {
  const cityMap: Record<string, string> = {
    // Nigeria - Only Lagos for now (Abuja has no hotels in API)
    'lagos': 'LOS',
    
    // International destinations with available hotels
    'london': 'LON',
    'new york': 'NYC',
    'paris': 'PAR',
    'dubai': 'DXB',
    'sydney': 'SYD',
    'toronto': 'YYZ',
    'los angeles': 'LAX',
    'miami': 'MIA',
    'chicago': 'ORD',
    'san francisco': 'SFO',
    'seattle': 'SEA',
    'amsterdam': 'AMS',
    'berlin': 'BER',
    'frankfurt': 'FRA',
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'rome': 'ROM',
    'milan': 'MIL',
    'singapore': 'SIN',
    'tokyo': 'TYO',
    'hong kong': 'HKG',
    'lagos, nigeria': 'LOS',
  };

  const normalizedCity = cityName.toLowerCase().trim();
  
  // Try exact match first
  if (cityMap[normalizedCity]) {
    return cityMap[normalizedCity];
  }
  
  // Try partial match
  for (const [key, code] of Object.entries(cityMap)) {
    if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
      return code;
    }
  }
  
  // If no match, try to extract IATA code from parentheses (e.g., "Lagos (LOS)")
  const match = cityName.match(/\(([A-Z]{3})\)/);
  if (match) {
    return match[1];
  }
  
  // Return first 3 uppercase letters as fallback
  return cityName.slice(0, 3).toUpperCase();
};

// ────────────────────────────────────────────────
// Hotel Search API - Amadeus Endpoint
// ────────────────────────────────────────────────
export const searchHotelsAmadeus = async (
  searchParams: HotelSearchParams
): Promise<HotelSearchResponse> => {
  try {
    console.log('🏨 Starting hotel search with params:', searchParams);
    
    const response = await request<HotelSearchResponse>(
      '/api/v1/bookings/search/hotels/amadeus',
      {
        method: 'POST',
        body: JSON.stringify({
          cityCode: searchParams.cityCode,
          checkInDate: searchParams.checkInDate,
          checkOutDate: searchParams.checkOutDate,
          adults: searchParams.adults,
          roomQuantity: searchParams.roomQuantity,
          currency: searchParams.currency || 'GBP',
          bestRateOnly: searchParams.bestRateOnly ?? true,
        }),
      }
    );

    console.log('✅ Hotel search response structure:', {
      success: response.success,
      message: response.message,
      hasData: !!response.data,
      hotelCount: response.data?.data?.length || 0,
    });
    
    return response;
    
  } catch (error: any) {
    console.error('❌ Hotel search failed:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('cityCode')) {
      throw new ApiError('Invalid city code. Please check the location.', 400, 'INVALID_CITY_CODE');
    }
    
    if (error.message?.includes('date')) {
      throw new ApiError('Invalid date format. Please use YYYY-MM-DD format.', 400, 'INVALID_DATE_FORMAT');
    }
    
    throw error;
  }
};

// ────────────────────────────────────────────────
// Hotel search with pagination and filtering
// ────────────────────────────────────────────────
export async function searchHotelsWithPagination(
  params: HotelSearchParams & {
    minPrice?: number;
    maxPrice?: number;
    ratings?: number[];
    amenities?: string[];
    sortBy?: 'price' | 'rating' | 'name';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  },
  maxPages: number = 2
): Promise<{
  success: boolean;
  data: HotelOffer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}> {
  try {
    console.log('🔍 Starting hotel search with pagination:', params);
    
    // Step 1: Initial search
    const response = await searchHotelsAmadeus({
      cityCode: params.cityCode,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults: params.adults,
      roomQuantity: params.roomQuantity,
      currency: params.currency,
      bestRateOnly: params.bestRateOnly,
    });
    
    if (!response.success) {
      throw new ApiError(response.message || 'Hotel search failed', 400, 'HOTEL_SEARCH_FAILED');
    }
    
    let allHotels = response.data?.data || [];
    
    console.log(`✅ Initial hotel results: ${allHotels.length} hotels`);
    
    // Step 2: Apply filters locally
    if (allHotels.length > 0) {
      // Filter by price range
      if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        allHotels = allHotels.filter(hotel => {
          const offerPrice = parseFloat(hotel.offers?.[0]?.price?.total || '0');
          const minPrice = params.minPrice || 0;
          const maxPrice = params.maxPrice || Number.MAX_SAFE_INTEGER;
          return offerPrice >= minPrice && offerPrice <= maxPrice;
        });
      }
      
      // Filter by rating (if available in response)
      if (params.ratings && params.ratings.length > 0 && allHotels[0].hotel.rating) {
        allHotels = allHotels.filter(hotel => {
          const rating = hotel.hotel.rating || 0;
          return params.ratings!.some(minRating => rating >= minRating);
        });
      }
      
      // Sort results
      if (params.sortBy) {
        allHotels.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (params.sortBy) {
            case 'price':
              aValue = parseFloat(a.offers?.[0]?.price?.total || '0');
              bValue = parseFloat(b.offers?.[0]?.price?.total || '0');
              break;
            case 'rating':
              aValue = a.hotel.rating || 0;
              bValue = b.hotel.rating || 0;
              break;
            case 'name':
              aValue = a.hotel.name || '';
              bValue = b.hotel.name || '';
              break;
            default:
              return 0;
          }
          
          const order = params.sortOrder === 'desc' ? -1 : 1;
          
          if (aValue < bValue) return -1 * order;
          if (aValue > bValue) return 1 * order;
          return 0;
        });
      }
      
      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedHotels = allHotels.slice(startIndex, endIndex);
      
      return {
        success: true,
        data: paginatedHotels,
        total: allHotels.length,
        page,
        limit,
        totalPages: Math.ceil(allHotels.length / limit),
        hasMore: endIndex < allHotels.length,
      };
    }
    
    return {
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: params.limit || 10,
      totalPages: 0,
      hasMore: false,
    };
    
  } catch (error: any) {
    console.error('❌ Hotel search with pagination failed:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      error.message || 'Hotel search failed',
      error.status || 500,
      'HOTEL_SEARCH_ERROR'
    );
  }
}

// ────────────────────────────────────────────────
// Transform hotel API data to SearchResult format for your frontend
// ────────────────────────────────────────────────
export function transformHotelToSearchResult(
  hotel: HotelOffer, 
  location: string,
  checkInDate: string,
  checkOutDate: string,
  index: number
): any {
  const hotelInfo = hotel.hotel;
  const offer = hotel.offers?.[0];
  
  if (!offer) {
    // Return a fallback result if no offer
    return {
      id: hotelInfo.hotelId || `hotel-${index}`,
      provider: hotelInfo.chainCode ? `${hotelInfo.chainCode} Hotels` : "Premium Hotels",
      title: hotelInfo.name || "Hotel",
      subtitle: `${location} • Standard Hotel`,
      price: "₦0/night",
      totalPrice: "₦0 total",
      rating: 4.0,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400",
      amenities: ["Free WiFi", "Air Conditioning", "TV", "Private Bathroom"],
      features: ["Standard Room", "2 guests", "1 night"],
      type: "hotels" as const,
      realData: {
        hotelId: hotelInfo.hotelId,
        hotelName: hotelInfo.name,
        checkInDate,
        checkOutDate,
        price: 0,
        currency: 'NGN',
        guests: 2,
        rooms: 1,
        roomType: "Standard Room",
        nights: 1,
      },
    };
  }
  
  // Calculate price
  const price = offer.price;
  const totalPrice = parseFloat(price?.total || '0');
  const basePrice = parseFloat(price?.base || '0');
  const currency = price?.currency || 'GBP';
  
  // Convert currency symbols
  const getCurrencySymbol = (curr: string): string => {
    const symbols: Record<string, string> = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'NGN': '₦',
    };
    return symbols[curr.toUpperCase()] || curr;
  };
  
  const priceSymbol = getCurrencySymbol(currency);
  
  // Calculate nights
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const pricePerNight = nights > 0 ? totalPrice / nights : totalPrice;
  
  // Extract room info
  const roomType = offer.room?.typeEstimated?.category || offer.room?.type || "Standard Room";
  const bedType = offer.room?.typeEstimated?.bedType || "King/Queen";
  const beds = offer.room?.typeEstimated?.beds || 1;
  
  // Generate amenities based on room description and hotel chain
  const description = offer.room?.description?.text || '';
  const amenities = extractAmenitiesFromDescription(description, hotelInfo.chainCode);
  
  // Determine hotel rating (if not provided, generate based on chain and price)
  const rating = calculateHotelRating(hotelInfo.chainCode, totalPrice);
  
  // Determine hotel star rating
  const starRating = determineStarRating(rating, hotelInfo.chainCode);
  
  return {
    id: hotelInfo.hotelId || `hotel-${index}`,
    provider: getHotelProviderName(hotelInfo.chainCode),
    title: hotelInfo.name || "Hotel",
    subtitle: `${location} • ${starRating} • ${roomType}`,
    price: `${priceSymbol}${Math.round(pricePerNight).toLocaleString()}/night`,
    totalPrice: `${priceSymbol}${Math.round(totalPrice).toLocaleString()} total`,
    rating: parseFloat(rating.toFixed(1)),
    image: getHotelImage(hotelInfo.chainCode, index),
    amenities: amenities.slice(0, 6),
    features: [
      roomType,
      `${beds} ${bedType.toLowerCase()} bed${beds > 1 ? 's' : ''}`,
      `${offer.guests.adults} guest${offer.guests.adults > 1 ? 's' : ''}`,
      `${nights} night${nights !== 1 ? 's' : ''}`,
      offer.rateCode ? offer.rateCode.replace('_', ' ') : "Best Rate",
    ],
    type: "hotels" as const,
    realData: {
      hotelId: hotelInfo.hotelId,
      offerId: offer.id,
      hotelName: hotelInfo.name,
      checkInDate,
      checkOutDate,
      price: totalPrice,
      basePrice: basePrice,
      currency,
      guests: offer.guests.adults,
      rooms: 1,
      roomType: roomType,
      bedType: bedType,
      beds: beds,
      nights: nights,
      isRefundable: offer.policies?.refundable?.cancellationRefund !== 'NON_REFUNDABLE',
      cancellationDeadline: offer.policies?.cancellations?.[0]?.deadline,
      cancellationPolicy: offer.policies?.cancellations?.[0]?.description?.text || "Standard cancellation policy applies",
      paymentType: offer.policies?.paymentType || "prepay",
      finalPrice: parseFloat(offer.final_price || price.total),
      markupAmount: parseFloat(offer.markup_amount || '0'),
      serviceFee: parseFloat(offer.service_fee || '0'),
    },
  };
}

// Helper function to extract amenities from description
function extractAmenitiesFromDescription(description: string, chainCode?: string): string[] {
  const amenities: string[] = [];
  const desc = description.toLowerCase();
  
  // Check for common amenities in description
  if (desc.includes('wifi') || desc.includes('internet')) {
    amenities.push('Free WiFi');
  }
  if (desc.includes('breakfast') || desc.includes('board')) {
    amenities.push('Breakfast Included');
  }
  if (desc.includes('parking')) {
    amenities.push('Free Parking');
  }
  if (desc.includes('pool')) {
    amenities.push('Swimming Pool');
  }
  if (desc.includes('gym') || desc.includes('fitness')) {
    amenities.push('Fitness Center');
  }
  if (desc.includes('spa')) {
    amenities.push('Spa');
  }
  if (desc.includes('restaurant')) {
    amenities.push('Restaurant');
  }
  if (desc.includes('bar')) {
    amenities.push('Bar');
  }
  if (desc.includes('room service')) {
    amenities.push('24/7 Room Service');
  }
  if (desc.includes('business center')) {
    amenities.push('Business Center');
  }
  
  // Add chain-specific amenities
  if (chainCode) {
    switch (chainCode) {
      case 'HI': // Holiday Inn
        amenities.push('Kids Stay Free', 'Family Rooms');
        break;
      case 'MC': // Marriott
        amenities.push('Luxury Bedding', 'Premium Toiletries');
        break;
      case 'HS': // Hilton
        amenities.push('Executive Lounge Access', 'Digital Key');
        break;
    }
  }
  
  // Add default amenities if not enough
  if (amenities.length < 4) {
    amenities.push(
      'Air Conditioning',
      'TV',
      'Private Bathroom',
      'Hair Dryer',
      'Coffee/Tea Maker',
      'Safe',
      'Desk'
    );
  }
  
  return Array.from(new Set(amenities)); // Remove duplicates
}

// Helper function to calculate hotel rating
function calculateHotelRating(chainCode?: string, price?: number): number {
  let baseRating = 4.0;
  
  // Adjust based on chain
  if (chainCode) {
    switch (chainCode) {
      case 'MC': // Marriott
        baseRating = 4.5;
        break;
      case 'HI': // Holiday Inn
        baseRating = 4.2;
        break;
      case 'HS': // Hilton
        baseRating = 4.4;
        break;
      case 'AC': // Accor
        baseRating = 4.3;
        break;
      default:
        baseRating = 4.0;
    }
  }
  
  // Adjust based on price (higher price = higher expected rating)
  if (price) {
    if (price > 500) baseRating += 0.3;
    else if (price > 200) baseRating += 0.1;
    else if (price < 100) baseRating -= 0.2;
  }
  
  // Add some random variation
  const variation = (Math.random() * 0.4) - 0.2; // -0.2 to +0.2
  const finalRating = Math.min(5.0, Math.max(3.0, baseRating + variation));
  
  return parseFloat(finalRating.toFixed(1));
}

// Helper function to determine star rating
function determineStarRating(rating: number, chainCode?: string): string {
  if (rating >= 4.5) return "5-star";
  if (rating >= 4.0) return "4-star";
  if (rating >= 3.5) return "3-star";
  
  // Chain-specific adjustments
  if (chainCode === 'MC' || chainCode === 'HS') {
    return "4-star"; // Marriott and Hilton are generally 4-star+
  }
  
  return "Standard";
}

// Helper function to get hotel provider name
function getHotelProviderName(chainCode?: string): string {
  const providers: Record<string, string> = {
    'HI': 'Holiday Inn',
    'MC': 'Marriott',
    'HS': 'Hilton',
    'AC': 'Accor Hotels',
    'HY': 'Hyatt',
    'SH': 'Sheraton',
    'IC': 'InterContinental',
    'CP': 'Courtyard by Marriott',
    'RI': 'Radisson',
    'BW': 'Best Western',
  };
  
  return chainCode && providers[chainCode] 
    ? `${providers[chainCode]} Hotels` 
    : "Premium Hotels";
}

// Helper function to get hotel image
function getHotelImage(chainCode?: string, index: number = 0): string {
  const hotelImages = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1564501049418-3c27787d01e8?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=400',
  ];
  
  // Chain-specific images
  if (chainCode) {
    const chainImages: Record<string, string> = {
      'MC': 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=400', // Marriott
      'HI': 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&q=80&w=400', // Holiday Inn
      'HS': 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=400', // Hilton
    };
    
    if (chainImages[chainCode]) {
      return chainImages[chainCode];
    }
  }
  
  return hotelImages[index % hotelImages.length];
}

// ────────────────────────────────────────────────
// Format hotel search parameters
// ────────────────────────────────────────────────
export async function formatHotelSearchParams(
  location: string,
  checkInDate?: string,
  checkOutDate?: string,
  guests?: number,
  rooms?: number
): Promise<HotelSearchParams> {
  // Get city code
  const cityCode = getCityCode(location);
  
  // Set default dates if not provided
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const checkIn = checkInDate || tomorrow.toISOString().split('T')[0];
  
  const checkOut = checkOutDate || (() => {
    const checkOutDate = new Date(checkIn);
    checkOutDate.setDate(checkOutDate.getDate() + 3); // Default 3-night stay
    return checkOutDate.toISOString().split('T')[0];
  })();
  
  return {
    cityCode,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    adults: Math.max(1, guests || 2),
    roomQuantity: Math.max(1, rooms || 1),
    currency: 'GBP', // Default to GBP since API returns GBP
    bestRateOnly: true,
  };
}

// ────────────────────────────────────────────────
// Search hotels and transform results for frontend
// ────────────────────────────────────────────────
export async function searchAndTransformHotels(
  searchParams: HotelSearchParams,
  location: string
): Promise<{
  success: boolean;
  results: any[];
  message?: string;
  total: number;
  isRealData: boolean;
}> {
  try {
    console.log('🔍 Searching and transforming hotels...');
    
    const response = await searchHotelsAmadeus(searchParams);
    
    // Handle case where API returns success but no data
    if (!response.data?.data || response.data.data.length === 0) {
      return {
        success: false,
        results: [],
        message: 'No hotels found for your search criteria',
        total: 0,
        isRealData: false,
      };
    }
    
    const hotels = response.data.data;
    const transformedResults = hotels.map((hotel, index) =>
      transformHotelToSearchResult(hotel, location, searchParams.checkInDate, searchParams.checkOutDate, index)
    );
    
    return {
      success: true,
      results: transformedResults,
      message: response.message,
      total: hotels.length,
      isRealData: true,
    };
    
  } catch (error: any) {
    console.error('❌ Search and transform hotels failed:', error);
    
    // Special handling for "no hotels found" error
    if (error.message?.includes('Nothing found') || 
        error.message?.includes('No hotels found') ||
        error.status === 404) {
      return {
        success: false,
        results: [],
        message: 'No hotels found for your search criteria. Please try different dates or location.',
        total: 0,
        isRealData: false,
      };
    }
    
    return {
      success: false,
      results: [],
      message: error.message || 'Failed to search hotels',
      total: 0,
      isRealData: false,
    };
  }
}

// ────────────────────────────────────────────────
// Validate hotel booking data
// ────────────────────────────────────────────────
export function validateHotelBookingData(bookingData: HotelBookingRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate hotelOfferId
  if (!bookingData.hotelOfferId || bookingData.hotelOfferId.trim() === '') {
    errors.push('Hotel offer ID is required');
  }

  // Validate price
  if (bookingData.offerPrice <= 0) {
    errors.push('Offer price must be greater than 0');
  }

  // Validate currency
  if (!bookingData.currency || bookingData.currency.trim() === '') {
    errors.push('Currency is required');
  }

  // Validate guests
  if (!bookingData.guests || bookingData.guests.length === 0) {
    errors.push('At least one guest is required');
  } else {
    bookingData.guests.forEach((guest, index) => {
      if (!guest.name.firstName || guest.name.firstName.trim() === '') {
        errors.push(`Guest ${index + 1}: First name is required`);
      }
      if (!guest.name.lastName || guest.name.lastName.trim() === '') {
        errors.push(`Guest ${index + 1}: Last name is required`);
      }
      if (!guest.contact.email || !isValidEmail(guest.contact.email)) {
        errors.push(`Guest ${index + 1}: Valid email is required`);
      }
      if (!guest.contact.phone || guest.contact.phone.trim() === '') {
        errors.push(`Guest ${index + 1}: Phone number is required`);
      }
    });
  }

  // Validate room associations
  if (!bookingData.roomAssociations || bookingData.roomAssociations.length === 0) {
    errors.push('Room associations are required');
  } else {
    bookingData.roomAssociations.forEach((room, index) => {
      if (!room.hotelOfferId || room.hotelOfferId.trim() === '') {
        errors.push(`Room association ${index + 1}: Hotel offer ID is required`);
      }
      if (!room.guestReferences || room.guestReferences.length === 0) {
        errors.push(`Room association ${index + 1}: At least one guest reference is required`);
      }
    });
  }

  // Validate payment
  if (!bookingData.payment) {
    errors.push('Payment information is required');
  } else if (bookingData.payment.method === 'CREDIT_CARD') {
    const cardInfo = bookingData.payment.paymentCard?.paymentCardInfo;
    if (!cardInfo) {
      errors.push('Credit card information is required');
    } else {
      if (!isValidCreditCardNumber(cardInfo.cardNumber)) {
        errors.push('Invalid credit card number');
      }
      if (!isValidExpiryDate(cardInfo.expiryDate)) {
        errors.push('Invalid expiry date. Use YYYY-MM format');
      }
      if (!cardInfo.holderName || cardInfo.holderName.trim() === '') {
        errors.push('Card holder name is required');
      }
      if (!cardInfo.securityCode || cardInfo.securityCode.length < 3) {
        errors.push('Security code must be at least 3 digits');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate credit card number
function isValidCreditCardNumber(cardNumber: string): boolean {
  // Remove spaces and dashes
  const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
  
  // Check if it's all digits and has valid length
  if (!/^\d+$/.test(cleanNumber)) return false;
  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
  
  // Luhn algorithm check
  return luhnCheck(cleanNumber);
}

// Luhn algorithm implementation
function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Helper function to validate expiry date
function isValidExpiryDate(expiryDate: string): boolean {
  if (!expiryDate || !/^\d{4}-\d{2}$/.test(expiryDate)) return false;
  
  const [year, month] = expiryDate.split('-').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // January is 0
  
  // Check if year is in the future or current year with future month
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  if (month < 1 || month > 12) return false;
  
  return true;
}

// ────────────────────────────────────────────────
// FIXED: Flight Search API with correct parameters
// ────────────────────────────────────────────────
export const searchFlightsFixed = async (
  params: FlightSearchParams
): Promise<FlightSearchResponse> => {
  try {
    console.log('✈️ Starting flight search with params:', params);
    
    // Format parameters exactly as your API expects
    const requestBody: any = {
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      departureDate: params.departureDate,
      passengers: params.passengers,
      cabinClass: params.cabinClass.toLowerCase(),
    };
    
    // Add optional parameters only if they exist
    if (params.returnDate && params.returnDate.trim() !== '' && params.returnDate !== params.departureDate) {
      requestBody.returnDate = params.returnDate;
    }
    
    if (params.currency) {
      requestBody.currency = params.currency.toUpperCase();
    }
    
    if (params.maxConnections !== undefined) {
      requestBody.maxConnections = params.maxConnections;
    }
    
    console.log('📤 Sending flight search request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await request<FlightSearchResponse>('/api/v1/bookings/search/flights', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    console.log('✅ Flight search response:', {
      success: response.success,
      message: response.message,
      error: response.error,
      hasData: !!response.data,
      offerRequestId: response.data?.offer_request_id,
    });
    
    return response;
    
  } catch (error: any) {
    console.error('❌ Flight search failed:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Provide more specific error messages
    if (error.message?.includes('origin') || error.message?.includes('destination')) {
      throw new ApiError('Invalid origin or destination airport code', 400, 'INVALID_AIRPORT_CODE');
    }
    
    if (error.message?.includes('date')) {
      throw new ApiError('Invalid date format. Please use YYYY-MM-DD format.', 400, 'INVALID_DATE_FORMAT');
    }
    
    if (error.message?.includes('returnDate') && error.message?.includes('before')) {
      throw new ApiError('Return date must be after departure date', 400, 'INVALID_RETURN_DATE');
    }
    
    throw new ApiError(
      error.message || 'Failed to search for flights',
      error.status || 500,
      'FLIGHT_SEARCH_ERROR'
    );
  }
};

// ────────────────────────────────────────────────
// Enhanced flight search with pagination
// ────────────────────────────────────────────────
export async function searchFlightsWithPagination(
  params: FlightSearchParams,
  maxPages: number = 3
): Promise<{
  success: boolean;
  offerRequestId?: string;
  offers: any[];
  total: number;
  message?: string;
  isRoundTrip: boolean;
}> {
  try {
    console.log('🔍 Starting flight search with pagination:', params);
    
    // Step 1: Create search request
    const searchResult = await searchFlightsFixed(params);
    
    if (!searchResult.success) {
      throw new ApiError(
        searchResult.message || 'Flight search failed',
        400,
        'SEARCH_FAILED',
        searchResult
      );
    }
    
    const offerRequestId = searchResult.data?.offer_request_id;
    
    if (!offerRequestId) {
      console.warn('⚠️ No offer_request_id received:', searchResult);
      
      // Try alternative field names
      const altId = searchResult.data?.id || searchResult.data?.requestId || searchResult.id;
      if (altId) {
        console.log(`📋 Using alternative ID: ${altId}`);
      } else {
        throw new ApiError(
          'Flight search completed but no request ID returned. Please try again.',
          500,
          'NO_REQUEST_ID'
        );
      }
    }
    
    console.log('📋 Offer Request ID:', offerRequestId);
    
    // Step 2: Fetch offers with pagination
    let allOffers: any[] = [];
    let nextCursor: string | null = null;
    let page = 1;
    const isRoundTrip = !!(params.returnDate && params.returnDate !== params.departureDate);
    
    // If we have an offer request ID, fetch offers
    if (offerRequestId) {
      do {
        console.log(`📄 Fetching flight offers page ${page}...`);
        
        try {
          const offersResult = await bookingApi.getOffers(
            offerRequestId,
            nextCursor || undefined,
            20,
            page === 1 ? 'total_amount' : undefined,
            'asc'
          );
          
          console.log(`📦 Page ${page} response:`, {
            hasData: !!offersResult.data,
            dataType: typeof offersResult.data,
            isArray: Array.isArray(offersResult.data),
          });
          
          // Extract offers from response
          let offers: any[] = [];
          
          if (Array.isArray(offersResult.data)) {
            offers = offersResult.data;
          } else if (Array.isArray(offersResult.offers)) {
            offers = offersResult.offers;
          } else if (Array.isArray(offersResult.results)) {
            offers = offersResult.results;
          } else if (Array.isArray(offersResult)) {
            offers = offersResult;
          } else if (offersResult.data && typeof offersResult.data === 'object') {
            // Check if data contains an array
            const dataObj = offersResult.data;
            for (const key in dataObj) {
              if (Array.isArray(dataObj[key])) {
                offers = dataObj[key];
                break;
              }
            }
          }
          
          console.log(`📦 Extracted ${offers.length} offers from page ${page}`);
          
          if (offers.length > 0) {
            allOffers = [...allOffers, ...offers];
          }
          
          // Update cursor for next page
          nextCursor = offersResult?.next_cursor || 
                      offersResult?.pagination?.next || 
                      offersResult?.meta?.next_cursor || 
                      offersResult?.data?.next_cursor || 
                      null;
          
          console.log(`📄 Next cursor for page ${page}:`, nextCursor);
          
          page++;
          
          // Safety limit
          if (page > maxPages) {
            console.log(`⚠️ Reached maximum pages (${maxPages})`);
            break;
          }
          
          // Small delay between requests
          if (nextCursor) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.error(`❌ Error fetching page ${page}:`, error);
          break;
        }
        
      } while (nextCursor && allOffers.length < 50);
    }
    
    console.log(`✅ Total offers fetched: ${allOffers.length}`);
    
    return {
      success: true,
      offerRequestId,
      offers: allOffers,
      total: allOffers.length,
      message: searchResult.message,
      isRoundTrip,
    };
    
  } catch (error: any) {
    console.error('❌ Flight search with pagination error:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      error.message || 'Flight search failed',
      error.status || 500,
      'FLIGHT_SEARCH_ERROR'
    );
  }
}

// ────────────────────────────────────────────────
// Auth API
// ────────────────────────────────────────────────
export const authApi = {
  login: (credentials: { email: string; password: string }) => {
    return request<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }).then(response => {
      if (response.token && response.user) {
        setAuthToken(response.token, response.user);
      } else if (response.data?.token && response.data?.user) {
        setAuthToken(response.data.token, response.data.user);
      }
      return response;
    });
  },

  register: (userData: { name: string; email: string; password: string }) => {
    return request<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }).then(response => {
      if (response.token && response.user) {
        setAuthToken(response.token, response.user);
      } else if (response.data?.token && response.data?.user) {
        setAuthToken(response.data.token, response.data.user);
      }
      return response;
    });
  },

  logout: () => {
    return request('/api/v1/auth/logout', {
      method: 'POST',
    }).then(() => {
      clearAuthToken();
      return { message: 'Logged out successfully' };
    }).catch(() => {
      clearAuthToken();
      return { message: 'Logged out locally' };
    });
  },

  verifyToken: () => {
    return request<ApiResponse<{ valid: boolean; user: User }>>('/api/v1/auth/verify', {
      method: 'GET',
    });
  },

  // Forgot password endpoint
  forgotPassword: (email: string) => {
    return request<ApiResponse<{ message: string }>>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password endpoint
  resetPassword: (token: string, password: string) => {
    return request<ApiResponse<{ message: string; user?: User }>>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  // Verify email endpoint
  verifyEmail: (token: string) => {
    return request<ApiResponse<{ message: string; user?: User; verified: boolean }>>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // Resend verification email
  resendVerificationEmail: (email: string) => {
    return request<ApiResponse<{ message: string }>>('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Social login endpoints (if supported)
  googleLogin: (accessToken: string) => {
    return request<any>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }).then(response => {
      if (response.token && response.user) {
        setAuthToken(response.token, response.user);
      } else if (response.data?.token && response.data?.user) {
        setAuthToken(response.data.token, response.data.user);
      }
      return response;
    });
  },

  facebookLogin: (accessToken: string) => {
    return request<any>('/api/v1/auth/facebook', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }).then(response => {
      if (response.token && response.user) {
        setAuthToken(response.token, response.user);
      } else if (response.data?.token && response.data?.user) {
        setAuthToken(response.data.token, response.data.user);
      }
      return response;
    });
  },

  // Check if email exists
  checkEmailExists: (email: string) => {
    return request<ApiResponse<{ exists: boolean }>>('/api/v1/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

// ────────────────────────────────────────────────
// User Profile API
// ────────────────────────────────────────────────
export const userApi = {
  getProfile: () => {
    return request<User>('/api/v1/users/me', {
      method: 'GET',
    });
  },

  updateProfile: (profileData: Partial<User>) => {
    return request<User>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    
    return request<{ avatar: string; url: string; imageUrl: string; profilePicture: string }>('/api/v1/users/me/avatar', {
      method: 'PUT',
      body: formData,
    });
  },

  changePassword: (data: { currentPassword: string; newPassword: string }) => {
    return request<{ message: string }>('/api/v1/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAccount: () => {
    return request<{ message: string }>('/api/v1/users/me', {
      method: 'DELETE',
    });
  },

  // Update email address (may require re-verification)
  updateEmail: (email: string, password: string) => {
    return request<{ message: string; requiresVerification: boolean }>('/api/v1/users/me/email', {
      method: 'PUT',
      body: JSON.stringify({ email, password }),
    });
  },

  // Get user's bookings
  getMyBookings: () => {
    return request<any[]>('/api/v1/users/me/bookings', {
      method: 'GET',
    });
  },
};

// ────────────────────────────────────────────────
// FIXED: Booking API with corrected flight search
// ────────────────────────────────────────────────
export const bookingApi = {
  // Flight search - FIXED version with all parameters
  searchFlights: searchFlightsFixed,
  
  // Flight search with pagination
  searchFlightsWithPagination: searchFlightsWithPagination,
  
  // Get flight offers with pagination and sorting options
  getOffers: (
    offerRequestId: string, 
    cursor?: string, 
    limit: number = 20,
    sort?: 'total_amount' | 'total_duration',
    sortOrder: 'asc' | 'desc' = 'asc'
  ) => {
    const params = new URLSearchParams({
      offer_request_id: offerRequestId,
      limit: limit.toString(),
      ...(cursor && { cursor }),
      ...(sort && { sort }),
      ...(sort && { sortOrder }),
    });
    
    return request<any>(`/api/v1/bookings/offers?${params.toString()}`, {
      method: 'GET',
    });
  },
  
  // Create hotel booking via Amadeus endpoint
  createHotelBookingAmadeus: (bookingData: HotelBookingRequest): Promise<HotelBookingResponse> => {
    return request<HotelBookingResponse>('/api/v1/bookings/hotels/bookings/amadeus', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Create authenticated booking
  createBooking: (bookingData: {
    productType: string;
    provider: string;
    basePrice: number;
    currency: string;
    bookingData: {
      offerId: string;
      origin: string;
      destination: string;
      departureDate?: string;
      airline?: string;
      [key: string]: any;
    };
    passengerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }) => {
    return request<any>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },
  
  // Create guest booking
  createGuestBooking: (bookingData: {
    productType: string;
    provider: string;
    basePrice: number;
    currency: string;
    bookingData: {
      offerId: string;
      origin: string;
      destination: string;
      departureDate?: string;
      airline?: string;
      [key: string]: any;
    };
    passengerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }) => {
    return request<any>('/api/v1/bookings/guest', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },
  
  // List bookings
  listBookings: () => {
    return request<any[]>('/api/v1/bookings', { 
      method: 'GET' 
    });
  },
  
  // Get booking by ID
  getBookingById: (id: string) => {
    return request<any>(`/api/v1/bookings/${id}`, { 
      method: 'GET' 
    });
  },
  
  // Public/guest endpoint for accessing bookings
  getPublicBooking: (id: string) => {
    return request<any>(`/api/v1/bookings/public/${id}`, { 
      method: 'GET' 
    });
  },
  
  // Cancel booking
  cancelBooking: (id: string) => {
    return request<any>(`/api/v1/bookings/${id}/cancel`, { 
      method: 'POST' 
    });
  },
  
  // Hotel booking (generic)
  createHotelBooking: (hotelBookingData: {
    productType: string;
    provider: string;
    basePrice: number;
    currency: string;
    bookingData: {
      hotelId: string;
      offerId: string;
      hotelName: string;
      checkInDate: string;
      checkOutDate: string;
      guests: number;
      rooms: number;
      location: string;
      roomType: string;
      [key: string]: any;
    };
    passengerInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      [key: string]: any;
    };
    [key: string]: any;
  }) => {
    return request<any>('/api/v1/bookings', {
      method: 'POST',
      body: JSON.stringify({
        ...hotelBookingData,
        productType: 'HOTEL',
        provider: 'BOOKING_COM',
      }),
    });
  },
};

// ────────────────────────────────────────────────
// Payment API - FIXED VERSION
// ────────────────────────────────────────────────
export const paymentApi = {
  // Create Stripe intent for authenticated users
  createStripeIntent: (bookingId: string) => {
    // Amount and currency are derived from the booking on the backend
    return request<any>('/api/v1/payments/stripe/create-intent', {
      method: 'POST',
      body: JSON.stringify({ bookingId }), // Only send bookingId
    });
  },
  
  // Create Stripe intent for guests
  createGuestStripeIntent: (bookingReference: string, email: string) => {
    // Amount and currency are derived from the booking on the backend
    return request<any>('/api/v1/payments/stripe/create-intent/guest', {
      method: 'POST',
      body: JSON.stringify({ bookingReference, email }), // Only send bookingReference and email
    });
  },
  
  // Send booking confirmation email
  sendConfirmation: (bookingId: string, email: string) => {
    return request<any>('/api/v1/bookings/send-confirmation', {
      method: 'POST',
      body: JSON.stringify({ bookingId, email }),
    });
  },
  
  // Get payment status
  getPaymentStatus: (paymentId: string) => {
    return request<any>(`/api/v1/payments/${paymentId}/status`, {
      method: 'GET',
    });
  },
  
  // Refund payment
  refundPayment: (paymentId: string, amount?: number) => {
    const body: any = { paymentId };
    if (amount !== undefined) body.amount = amount;
    
    return request<any>(`/api/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  
  // Additional payment methods if needed
  createPaypalPayment: (bookingId: string) => {
    return request<any>('/api/v1/payments/paypal/create', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  },
  
  createFlutterwavePayment: (bookingId: string) => {
    return request<any>('/api/v1/payments/flutterwave/create', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  },
};
// ────────────────────────────────────────────────
// Hotels API with Amadeus endpoint
// ────────────────────────────────────────────────
export const hotelApi = {
  // Amadeus hotel search
  searchHotelsAmadeus: searchHotelsAmadeus,
  
  // Hotel search with pagination and filtering
  searchHotelsWithPagination: searchHotelsWithPagination,
  
  // Search and transform hotels for frontend
  searchAndTransformHotels: searchAndTransformHotels,
  
  // Format hotel search parameters
  formatHotelSearchParams: formatHotelSearchParams,
  
  // Transform hotel to search result
  transformHotelToSearchResult: transformHotelToSearchResult,
  
  // Validate hotel booking data
  validateHotelBookingData: validateHotelBookingData,
  
  // Get city code
  getCityCode: getCityCode,
  
  // Book hotel via Amadeus
  bookHotelAmadeus: (bookingData: HotelBookingRequest): Promise<HotelBookingResponse> => {
    return request<HotelBookingResponse>('/api/v1/bookings/hotels/bookings/amadeus', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },
  
  // Get hotel details
  getHotelDetails: async (hotelId: string) => {
    try {
      console.log(`🏨 Fetching details for hotel: ${hotelId}`);
      
      const response = await request<any>(`/api/v1/hotels/${hotelId}/details`, {
        method: 'GET',
      });
      
      console.log('✅ Hotel details response:', response);
      return response;
      
    } catch (error: any) {
      console.error('❌ Failed to fetch hotel details:', error);
      throw error;
    }
  },
  
  // Get hotel photos
  getHotelPhotos: async (hotelId: string, limit: number = 5) => {
    try {
      console.log(`📸 Fetching photos for hotel: ${hotelId}`);
      
      const response = await request<any>(`/api/v1/hotels/${hotelId}/photos?limit=${limit}`, {
        method: 'GET',
      });
      
      return response;
      
    } catch (error: any) {
      console.error('❌ Failed to fetch hotel photos:', error);
      // Return fallback images
      return {
        data: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400',
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400',
          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=400',
          'https://images.unsplash.com/photo-1564501049418-3c27787d01e8?auto=format&fit=crop&q=80&w=400',
        ].slice(0, limit),
      };
    }
  },
  
  // Get hotel reviews
  getHotelReviews: async (hotelId: string, limit: number = 10) => {
    try {
      console.log(`📝 Fetching reviews for hotel: ${hotelId}`);
      
      const response = await request<any>(`/api/v1/hotels/${hotelId}/reviews?limit=${limit}`, {
        method: 'GET',
      });
      
      return response;
      
    } catch (error: any) {
      console.error('❌ Failed to fetch hotel reviews:', error);
      // Return mock reviews
      return {
        data: [
          {
            id: '1',
            author: 'John D.',
            rating: 5,
            date: '2024-01-15',
            title: 'Excellent stay!',
            text: 'Great location, clean rooms, and friendly staff.',
            helpful: 12,
          },
          {
            id: '2',
            author: 'Sarah M.',
            rating: 4,
            date: '2024-01-10',
            title: 'Very good',
            text: 'Comfortable beds and good amenities.',
            helpful: 8,
          },
        ],
      };
    }
  },
  
  // Validate hotel booking
  validateHotelBooking: async (
    hotelId: string,
    offerId: string,
    checkInDate: string,
    checkOutDate: string,
    guests: number,
    rooms: number
  ) => {
    try {
      console.log(`✅ Validating hotel booking for: ${hotelId}`);
      
      const response = await request<any>('/api/v1/hotels/validate-booking', {
        method: 'POST',
        body: JSON.stringify({
          hotelId,
          offerId,
          checkInDate,
          checkOutDate,
          guests,
          rooms,
        }),
      });
      
      return response;
      
    } catch (error: any) {
      console.error('❌ Hotel booking validation failed:', error);
      throw error;
    }
  },
  
  // Hotel booking (generic)
  bookHotel: (hotelId: string, bookingData: any) => {
    return request<any>(`/api/v1/hotels/${hotelId}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },
  
  // Get available hotel amenities
  getAvailableAmenities: () => {
    return request<string[]>('/api/v1/hotels/amenities', {
      method: 'GET',
    }).catch(() => {
      // Return default amenities if API fails
      return [
        'Free WiFi',
        'Swimming Pool',
        'Spa',
        'Restaurant',
        'Fitness Center',
        'Room Service',
        'Airport Shuttle',
        'Parking',
        'Breakfast Included',
        'Bar',
        'Business Center',
        'Concierge',
        'Laundry Service',
        'Pet Friendly',
        'Family Rooms',
      ];
    });
  },
  
  // Get popular hotel destinations
  getPopularDestinations: () => {
    return request<any[]>('/api/v1/hotels/popular-destinations', {
      method: 'GET',
    }).catch(() => {
      // Return default destinations if API fails
      return [
        { cityCode: 'LOS', cityName: 'Lagos', country: 'Nigeria', image: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGFnb3N8ZW58MHx8MHx8fDA%3D' },
        { cityCode: 'LON', cityName: 'London', country: 'UK', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400' },
        { cityCode: 'NYC', cityName: 'New York', country: 'USA', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400' },
        { cityCode: 'PAR', cityName: 'Paris', country: 'France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400' },
        { cityCode: 'DXB', cityName: 'Dubai', country: 'UAE', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400' },
        { cityCode: 'SYD', cityName: 'Sydney', country: 'Australia', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=400' },
      ];
    });
  },
};

// ────────────────────────────────────────────────
// Car Rentals API
// ────────────────────────────────────────────────
export const carApi = {
  searchCars: (params: any) => {
    return request<any>('/api/v1/cars/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
  
  // Car rental booking
  bookCar: (carId: string, bookingData: any) => {
    return request<any>(`/api/v1/cars/${carId}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },
};

// ────────────────────────────────────────────────
// Notification API
// ────────────────────────────────────────────────
export const notificationApi = {
  getNotifications: () => {
    return request<any[]>('/api/v1/notifications', {
      method: 'GET',
    });
  },
  
  markAsRead: (notificationId: string) => {
    return request<any>(`/api/v1/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },
  
  markAllAsRead: () => {
    return request<any>('/api/v1/notifications/read-all', {
      method: 'PUT',
    });
  },
  
  deleteNotification: (notificationId: string) => {
    return request<any>(`/api/v1/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};

// ────────────────────────────────────────────────
// Support/Contact API
// ────────────────────────────────────────────────
export const supportApi = {
  contactUs: (data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    phone?: string;
  }) => {
    return request<any>('/api/v1/support/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  submitFeedback: (data: {
    rating: number;
    comment: string;
    bookingId?: string;
    category?: string;
  }) => {
    return request<any>('/api/v1/support/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  reportIssue: (data: {
    title: string;
    description: string;
    category: string;
    priority?: 'low' | 'medium' | 'high';
    screenshot?: string;
  }) => {
    return request<any>('/api/v1/support/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ────────────────────────────────────────────────
// Utility functions
// ────────────────────────────────────────────────
export async function fetchUserProfile(): Promise<User | null> {
  try {
    const token = getAuthToken();
    if (!token) return null;

    const response = await userApi.getProfile();
    return response as User;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

export async function updateUserProfile(updates: Partial<User>): Promise<User | null> {
  try {
    const token = getAuthToken();
    if (!token) throw new ApiError('Not authenticated', 401);

    const response = await userApi.updateProfile(updates);
    return response as User;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    throw error;
  }
}

export async function uploadUserAvatar(file: File): Promise<string | null> {
  try {
    const token = getAuthToken();
    if (!token) throw new ApiError('Not authenticated', 401);

    const response = await userApi.uploadProfileImage(file);
    return response?.avatar || response?.url || response?.imageUrl || response?.profilePicture || null;
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    throw error;
  }
}

// ────────────────────────────────────────────────
// Auth helper functions
// ────────────────────────────────────────────────
export async function handleForgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await authApi.forgotPassword(email);
    return {
      success: true,
      message: response?.message || 'Password reset instructions sent to your email.'
    };
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to send reset instructions. Please try again.'
    };
  }
}

export async function handleResetPassword(token: string, password: string): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    const response = await authApi.resetPassword(token, password);
    return {
      success: true,
      message: response?.message || 'Password reset successfully!',
      user: response?.user
    };
  } catch (error: any) {
    console.error('Reset password error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to reset password. Please try again.'
    };
  }
}

export async function handleVerifyEmail(token: string): Promise<{ success: boolean; message: string; user?: User; verified?: boolean }> {
  try {
    const response = await authApi.verifyEmail(token);
    return {
      success: true,
      message: response?.message || 'Email verified successfully!',
      user: response?.user,
      verified: response?.verified || true
    };
  } catch (error: any) {
    console.error('Verify email error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to verify email. Please try again.'
    };
  }
}

export async function checkEmailVerified(): Promise<boolean> {
  try {
    const user = await fetchUserProfile();
    return user?.isVerified || false;
  } catch (error) {
    console.error('Check email verified error:', error);
    return false;
  }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await authApi.resendVerificationEmail(email);
    return {
      success: true,
      message: response?.message || 'Verification email sent successfully!'
    };
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to resend verification email.'
    };
  }
}

// ────────────────────────────────────────────────
// Flight search helper functions
// ────────────────────────────────────────────────
export function validateFlightSearchParams(params: FlightSearchParams): {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate origin
  if (!params.origin || params.origin.trim().length < 2) {
    errors.push('Origin airport code is required (e.g., LOS, LHR)');
  } else if (params.origin.length !== 3) {
    warnings.push('Origin should be a 3-letter IATA airport code (e.g., LOS for Lagos)');
  }

  // Validate destination
  if (!params.destination || params.destination.trim().length < 2) {
    errors.push('Destination airport code is required (e.g., LOS, LHR)');
  } else if (params.destination.length !== 3) {
    warnings.push('Destination should be a 3-letter IATA airport code');
  }

  // Validate origin and destination are not the same
  if (params.origin && params.destination && 
      params.origin.toUpperCase() === params.destination.toUpperCase()) {
    errors.push('Origin and destination cannot be the same');
  }

  // Validate departure date
  if (!params.departureDate) {
    errors.push('Departure date is required');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(params.departureDate)) {
    errors.push('Departure date must be in YYYY-MM-DD format');
  } else {
    const depDate = new Date(params.departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(depDate.getTime())) {
      errors.push('Invalid departure date');
    } else if (depDate < today) {
      errors.push('Departure date cannot be in the past');
    } else if (depDate > new Date(today.getFullYear() + 2, today.getMonth(), today.getDate())) {
      warnings.push('Departure date is more than 2 years in the future, some airlines may not have schedules');
    }
  }

  // Validate return date if provided
  if (params.returnDate && params.returnDate.trim() !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.returnDate)) {
      errors.push('Return date must be in YYYY-MM-DD format');
    } else {
      const depDate = new Date(params.departureDate);
      const retDate = new Date(params.returnDate);
      
      if (isNaN(retDate.getTime())) {
        errors.push('Invalid return date');
      } else if (retDate <= depDate) {
        errors.push('Return date must be after departure date');
      } else {
        const maxReturnDays = 365;
        const diffDays = Math.ceil((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > maxReturnDays) {
          warnings.push(`Return date is more than ${maxReturnDays} days after departure`);
        }
      }
    }
  }

  // Validate passengers
  if (!params.passengers || params.passengers < 1) {
    errors.push('At least 1 passenger is required');
  } else if (params.passengers > 9) {
    errors.push('Maximum 9 passengers per booking');
  } else if (params.passengers > 6) {
    warnings.push('Large group bookings may have limited availability');
  }

  // Validate cabin class
  const validClasses = ['economy', 'premium_economy', 'business', 'first'];
  if (!params.cabinClass) {
    errors.push('Cabin class is required');
  } else if (!validClasses.includes(params.cabinClass.toLowerCase())) {
    errors.push(`Cabin class must be one of: ${validClasses.join(', ')}`);
  }

  // Validate currency
  const validCurrencies = ['GBP', 'USD', 'EUR', 'NGN'];
  if (params.currency && !validCurrencies.includes(params.currency.toUpperCase())) {
    warnings.push(`Currency ${params.currency} may not be supported. Using GBP instead.`);
  }

  // Validate max connections
  if (params.maxConnections !== undefined) {
    if (!Number.isInteger(params.maxConnections) || params.maxConnections < 0) {
      warnings.push('Max connections must be a positive integer');
    } else if (params.maxConnections > 3) {
      warnings.push('More than 3 connections may result in very long travel times');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ────────────────────────────────────────────────
// Hotel booking helper function
// ────────────────────────────────────────────────
export async function createAmadeusHotelBooking(
  offerId: string,
  hotelData: any,
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  },
  paymentInfo?: {
    cardNumber?: string;
    expiryDate?: string;
    holderName?: string;
    securityCode?: string;
  }
): Promise<HotelBookingResponse> {
  try {
    console.log('🏨 Creating Amadeus hotel booking...');
    
    // Validate hotel data
    if (!hotelData || !hotelData.realData) {
      throw new ApiError('Invalid hotel data', 400, 'INVALID_HOTEL_DATA');
    }
    
    const realData = hotelData.realData;
    
    // Prepare booking data
    const bookingData: HotelBookingRequest = {
      hotelOfferId: offerId,
      offerPrice: realData.price,
      currency: realData.currency || 'GBP',
      guests: [
        {
          name: {
            title: 'MR', // Default title
            firstName: guestInfo.firstName,
            lastName: guestInfo.lastName,
          },
          contact: {
            phone: guestInfo.phone,
            email: guestInfo.email,
          },
        },
      ],
      roomAssociations: [
        {
          hotelOfferId: offerId,
          guestReferences: [
            {
              guestReference: '1',
            },
          ],
        },
      ],
      payment: {
        method: 'CREDIT_CARD',
        paymentCard: {
          paymentCardInfo: paymentInfo ? {
            vendorCode: getVendorCodeFromCardNumber(paymentInfo.cardNumber || ''),
            cardNumber: paymentInfo.cardNumber || '',
            expiryDate: paymentInfo.expiryDate || '',
            holderName: paymentInfo.holderName || '',
            securityCode: paymentInfo.securityCode || '',
          } : {
            // Demo/test card info (use Stripe test cards in production)
            vendorCode: 'VI',
            cardNumber: '4242424242424242',
            expiryDate: '2026-12',
            holderName: 'TEST USER',
            securityCode: '123',
          },
        },
      },
      travelAgentEmail: 'support@travelopia.com',
      accommodationSpecialRequests: 'Please provide early check-in if available',
    };
    
    // Validate booking data
    const validation = validateHotelBookingData(bookingData);
    if (!validation.isValid) {
      throw new ApiError(
        `Booking validation failed: ${validation.errors.join(', ')}`,
        400,
        'BOOKING_VALIDATION_FAILED'
      );
    }
    
    // Create booking
    const response = await bookingApi.createHotelBookingAmadeus(bookingData);
    
    if (!response.success) {
      throw new ApiError(
        response.message || 'Hotel booking failed',
        response.status || 500,
        'HOTEL_BOOKING_FAILED'
      );
    }
    
    console.log('✅ Hotel booking created successfully:', response);
    return response;
    
  } catch (error: any) {
    console.error('❌ Hotel booking failed:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      error.message || 'Failed to create hotel booking',
      error.status || 500,
      'HOTEL_BOOKING_ERROR'
    );
  }
}

// Helper function to get vendor code from card number
function getVendorCodeFromCardNumber(cardNumber: string): string {
  if (!cardNumber) return 'VI'; // Default to Visa
  
  const cleanNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
  
  // Visa cards start with 4
  if (cleanNumber.startsWith('4')) return 'VI';
  
  // MasterCard starts with 51-55
  if (/^5[1-5]/.test(cleanNumber)) return 'MC';
  
  // American Express starts with 34 or 37
  if (/^3[47]/.test(cleanNumber)) return 'AX';
  
  // Discover starts with 6011, 644-649, or 65
  if (/^6(011|4[4-9]|5)/.test(cleanNumber)) return 'DS';
  
  // Diners Club starts with 300-305, 36, or 38
  if (/^3(0[0-5]|6|8)/.test(cleanNumber)) return 'DC';
  
  // JCB starts with 3528-3589
  if (/^35/.test(cleanNumber)) return 'JC';
  
  return 'VI'; // Default to Visa
}

// ────────────────────────────────────────────────
// Transform flight data for frontend
// ────────────────────────────────────────────────
export function transformFlightOfferToSearchResult(
  offer: any,
  index: number,
  isReturnFlight: boolean = false
): any {
  try {
    // Extract flight information from offer
    const itineraries = offer.itineraries || [];
    const price = offer.price || offer.total_amount || {};
    const airline = offer.validating_airline_codes?.[0] || 'Multiple';
    
    // Get first itinerary for basic info
    const firstItinerary = itineraries[0] || {};
    const segments = firstItinerary.segments || [];
    const firstSegment = segments[0] || {};
    const lastSegment = segments[segments.length - 1] || firstSegment;
    
    // Calculate duration
    const duration = firstItinerary.duration || '';
    
    // Get stops information
    const stops = Math.max(0, segments.length - 1);
    const stopsText = stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`;
    
    // Format price
    const totalPrice = price.total || price.amount || 0;
    const currency = price.currency || 'GBP';
    const currencySymbol = getCurrencySymbol(currency);
    
    // Format airline name
    const airlineName = getAirlineName(airline);
    
    // Get departure and arrival info
    const departureTime = firstSegment.departure?.at || '';
    const arrivalTime = lastSegment.arrival?.at || '';
    const departureAirport = firstSegment.departure?.iataCode || '';
    const arrivalAirport = lastSegment.arrival?.iataCode || '';
    
    // Format times
    const formatTime = (dateTime: string) => {
      if (!dateTime) return '';
      try {
        const date = new Date(dateTime);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return dateTime.split('T')[1]?.substring(0, 5) || '';
      }
    };
    
    // Create result object
    const result = {
      id: offer.id || `flight-${index}-${isReturnFlight ? 'return' : 'outbound'}`,
      provider: airlineName,
      title: `${airlineName} Flight`,
      subtitle: `${departureAirport} → ${arrivalAirport} • ${stopsText} • ${duration}`,
      price: `${currencySymbol}${Math.round(totalPrice).toLocaleString()}`,
      totalPrice: `${currencySymbol}${Math.round(totalPrice).toLocaleString()} total`,
      rating: 4.0, // Default rating
      image: getAirlineImage(airline),
      amenities: [
        'Seat Selection',
        'Cabin Baggage',
        'In-flight Entertainment',
        'Meal Service',
      ],
      features: [
        `Depart: ${formatTime(departureTime)}`,
        `Arrive: ${formatTime(arrivalTime)}`,
        `Duration: ${duration}`,
        `Class: ${offer.cabin_class || 'Economy'}`,
        stopsText,
      ],
      type: "flights" as const,
      isReturnFlight,
      realData: {
        offerId: offer.id,
        airline: airlineName,
        airlineCode: airline,
        departureTime,
        arrivalTime,
        departureAirport,
        arrivalAirport,
        stops,
        duration,
        price: totalPrice,
        currency,
        cabinClass: offer.cabin_class || 'ECONOMY',
        segments,
        itineraries,
        travelerPricings: offer.traveler_pricings,
        validatingAirlineCodes: offer.validating_airline_codes,
        numberOfBookableSeats: offer.number_of_bookable_seats,
        oneWay: offer.one_way || !isReturnFlight,
        bookingRequirements: offer.booking_requirements,
      },
    };
    
    return result;
  } catch (error) {
    console.error('Error transforming flight offer:', error, offer);
    
    // Return a fallback result
    return {
      id: `flight-error-${index}`,
      provider: 'Airline',
      title: 'Flight',
      subtitle: 'Flight details unavailable',
      price: 'Price unavailable',
      totalPrice: 'Price unavailable',
      rating: 0,
      image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400',
      amenities: ['Information unavailable'],
      features: ['Details not available'],
      type: "flights" as const,
      isReturnFlight,
      realData: {},
    };
  }
}

// Helper functions for flight transformation
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€',
    'NGN': '₦',
  };
  return symbols[currency.toUpperCase()] || currency;
}

function getAirlineName(code: string): string {
  const airlines: Record<string, string> = {
    'BA': 'British Airways',
    'LH': 'Lufthansa',
    'AF': 'Air France',
    'KL': 'KLM',
    'TK': 'Turkish Airlines',
    'EK': 'Emirates',
    'QR': 'Qatar Airways',
    'ET': 'Ethiopian Airlines',
    'VS': 'Virgin Atlantic',
    'AA': 'American Airlines',
    'DL': 'Delta Air Lines',
    'UA': 'United Airlines',
    'WN': 'Southwest Airlines',
    'FR': 'Ryanair',
    'U2': 'easyJet',
  };
  return airlines[code] || code || 'Multiple Airlines';
}

function getAirlineImage(code: string): string {
  const airlineImages: Record<string, string> = {
    'BA': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400',
    'EK': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400',
    'QR': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400',
    'LH': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=400',
  };
  return airlineImages[code] || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=400';
}

// ────────────────────────────────────────────────
// Session management helper
// ────────────────────────────────────────────────
export class SessionManager {
  static async validateSession(): Promise<boolean> {
    try {
      const token = getAuthToken();
      if (!token) return false;
      
      // Check if token is expired
      const response = await authApi.verifyToken();
      return response?.data?.valid || false;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
  
  static async refreshSession(): Promise<boolean> {
    try {
      const user = getStoredUser();
      if (!user?.email) return false;
      
      // In a real app, you'd call a refresh token endpoint
      // For now, we'll just re-validate
      return await this.validateSession();
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }
  
  static async logoutEverywhere(): Promise<void> {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout everywhere error:', error);
      clearAuthToken();
    }
  }
}

// ────────────────────────────────────────────────
// Auth event listeners
// ────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('auth-expired', () => {
    clearAuthToken();
  });
  
  // Auto-refresh session every 5 minutes
  window.addEventListener('load', () => {
    const token = getAuthToken();
    if (token) {
      setInterval(async () => {
        const isValid = await SessionManager.validateSession();
        if (!isValid) {
          clearAuthToken();
          window.dispatchEvent(new CustomEvent('session-expired'));
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  });
}

// ────────────────────────────────────────────────
// API Configuration
// ────────────────────────────────────────────────
export const apiConfig = {
  endpoints: {
    user: '/api/v1/users',
    auth: '/api/v1/auth',
    bookings: '/api/v1/bookings',
    payments: '/api/v1/payments',
    hotels: '/api/v1/hotels',
    cars: '/api/v1/cars',
    notifications: '/api/v1/notifications',
    support: '/api/v1/support',
  },
  
  defaultHeaders: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  
  timeout: 30000,
  retryAttempts: 3,
};

// ────────────────────────────────────────────────
// Type guard utilities
// ────────────────────────────────────────────────
export function isUser(obj: any): obj is User {
  return obj && typeof obj === 'object' && 'email' in obj && 'name' in obj;
}

export function isHotelSearchParams(obj: any): obj is HotelSearchParams {
  return obj && typeof obj === 'object' && 
         'cityCode' in obj && 
         'checkInDate' in obj && 
         'checkOutDate' in obj;
}

export function isHotelOffer(obj: any): obj is HotelOffer {
  return obj && typeof obj === 'object' && 
         'type' in obj && 
         'hotel' in obj && 
         'available' in obj;
}

export function isHotelSearchResponse(obj: any): obj is HotelSearchResponse {
  return obj && typeof obj === 'object' && 
         ('success' in obj || 'data' in obj || 'message' in obj);
}

export function isHotelBookingRequest(obj: any): obj is HotelBookingRequest {
  return obj && typeof obj === 'object' && 
         'hotelOfferId' in obj && 
         'guests' in obj && 
         'payment' in obj;
}

export function isHotelBookingResponse(obj: any): obj is HotelBookingResponse {
  return obj && typeof obj === 'object' && 
         ('success' in obj || 'data' in obj || 'message' in obj);
}

// ────────────────────────────────────────────────
// Export everything as an API object
// ────────────────────────────────────────────────
const api = {
  // API modules
  authApi,
  userApi,
  bookingApi,
  paymentApi,
  hotelApi,
  carApi,
  notificationApi,
  supportApi,
  
  // Hotel search functions
  searchHotelsAmadeus,
  searchHotelsWithPagination,
  searchAndTransformHotels,
  formatHotelSearchParams,
  transformHotelToSearchResult,
  validateHotelBookingData,
  getCityCode,
  
  // Flight search functions
  searchFlightsFixed,
  searchFlightsWithPagination,
  validateFlightSearchParams,
  transformFlightOfferToSearchResult,
  
  // Hotel booking functions
  createAmadeusHotelBooking,
  
  // Token management
  setAuthToken,
  clearAuthToken,
  getStoredAuthToken,
  getStoredUser,
  
  // User profile
  fetchUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  
  // Auth helper functions
  handleForgotPassword,
  handleResetPassword,
  handleVerifyEmail,
  checkEmailVerified,
  resendVerificationEmail,
  
  // Session management
  SessionManager,
  
  // API Configuration
  apiConfig,
  
  // Type guards
  isUser,
  isHotelSearchParams,
  isHotelOffer,
  isHotelSearchResponse,
  isHotelBookingRequest,
  isHotelBookingResponse,
  
  // Classes
  ApiError,
};

export default api;