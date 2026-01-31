// api.ts - UPDATED to match exact endpoints from your documentation
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
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for flight searches

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

    // Return normalized data (data.data or data)
    return (data.data ?? data) as T;

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
};

// ────────────────────────────────────────────────
// UPDATED: Booking API to match your exact endpoints
// ────────────────────────────────────────────────
export const bookingApi = {
  // Step 1: Search flights - EXACT ENDPOINT
  searchFlights: (params: {
    origin: string;
    destination: string;
    departureDate: string;
    passengers: number;
    cabinClass: string;
    returnDate?: string;
  }) => {
    return request<any>('/api/v1/bookings/search/flights', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
  
  // Steps 2-5: Get flight offers with pagination and sorting options
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
  
  // Step 6: Create authenticated booking - EXACT ENDPOINT
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
  
  // Step 7: Create guest booking - EXACT ENDPOINT (FIXED - SAME ENDPOINT AS AUTHENTICATED)
  // Note: According to your documentation, both authenticated and guest use same endpoint
  // But if there's a separate guest endpoint, adjust accordingly
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
    // If your backend has separate guest endpoint, use: '/api/v1/bookings/guest'
    // For now using same endpoint as authenticated
    return request<any>('/api/v1/bookings/guest', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },
  
  // Step 8: List bookings - EXACT ENDPOINT
  listBookings: () => {
    return request<any[]>('/api/v1/bookings', { 
      method: 'GET' 
    });
  },
  
  // Step 9: Get booking by ID - EXACT ENDPOINT
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
  
  // Step 10: Cancel booking - EXACT ENDPOINT
  cancelBooking: (id: string) => {
    return request<any>(`/api/v1/bookings/${id}/cancel`, { 
      method: 'POST' 
    });
  },
};

// ────────────────────────────────────────────────
// UPDATED: Payment API to match your exact endpoints
// ────────────────────────────────────────────────
export const paymentApi = {
  // Step 12: Create Stripe intent for authenticated users - EXACT ENDPOINT
  createStripeIntent: (bookingId: string, amount?: number, currency?: string) => {
    const body: any = { bookingId };
    if (amount !== undefined) body.amount = amount;
    if (currency !== undefined) body.currency = currency;
    
    return request<any>('/api/v1/payments/stripe/create-intent', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  
  // Step 13: Create Stripe intent for guests - EXACT ENDPOINT (FIXED URL)
  createGuestStripeIntent: (bookingReference: string, email: string, amount?: number, currency?: string) => {
    const body: any = { bookingReference, email };
    if (amount !== undefined) body.amount = amount;
    if (currency !== undefined) body.currency = currency;
    
    return request<any>('/api/v1/payments/stripe/create-intent/guest', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  
  // Send booking confirmation email
  sendConfirmation: (bookingId: string, email: string) => {
    return request<any>('/api/v1/bookings/send-confirmation', {
      method: 'POST',
      body: JSON.stringify({ bookingId, email }),
    });
  },
};

// ────────────────────────────────────────────────
// Hotels API
// ────────────────────────────────────────────────
export const hotelApi = {
  searchHotels: (params: any) => {
    return request<any>('/api/v1/hotels/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  getHotelDetails: (id: string) => {
    return request<any>(`/api/v1/hotels/${id}`, {
      method: 'GET',
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
// NEW: Flight search utility function
// ────────────────────────────────────────────────
export async function searchFlightsWithPagination(
  params: {
    origin: string;
    destination: string;
    departureDate: string;
    passengers: number;
    cabinClass: string;
    returnDate?: string;
  },
  maxPages: number = 3
) {
  try {
    console.log('🔍 Starting flight search with params:', params);
    
    // Step 1: Create search request
    const searchResult = await bookingApi.searchFlights(params);
    console.log('✅ Search result:', searchResult);
    
    const offerRequestId = searchResult?.data?.offer_request_id || 
                          searchResult?.offer_request_id || 
                          searchResult?.id;
    
    if (!offerRequestId) {
      console.error('❌ No offer request ID received:', searchResult);
      throw new ApiError('Flight search failed: No offer request ID', 500, 'NO_OFFER_REQUEST_ID');
    }
    
    console.log('📋 Offer Request ID:', offerRequestId);
    
    // Step 2-5: Fetch offers with pagination
    let allOffers: any[] = [];
    let nextCursor: string | null = null;
    let page = 1;
    
    do {
      console.log(`📄 Fetching page ${page}...`);
      
      const offersResult = await bookingApi.getOffers(
        offerRequestId,
        nextCursor || undefined,
        20,
        page === 1 ? 'total_amount' : undefined,
        'asc'
      );
      
      console.log(`📦 Page ${page} offers:`, offersResult);
      
      const offers = offersResult?.data || 
                    offersResult?.offers || 
                    offersResult?.results || 
                    (Array.isArray(offersResult) ? offersResult : []);
      
      if (offers.length > 0) {
        allOffers = [...allOffers, ...offers];
      }
      
      // Update cursor for next page
      nextCursor = offersResult?.next_cursor || 
                  offersResult?.pagination?.next || 
                  offersResult?.meta?.next_cursor || 
                  null;
      
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
      
    } while (nextCursor && allOffers.length < 50); // Stop after 50 offers or no more pages
    
    console.log(`✅ Total offers fetched: ${allOffers.length}`);
    
    return {
      success: true,
      offerRequestId,
      offers: allOffers,
      total: allOffers.length,
    };
    
  } catch (error: any) {
    console.error('❌ Flight search error:', error);
    
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
// Auth event listeners
// ────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('auth-expired', () => {
    clearAuthToken();
  });
}

// ────────────────────────────────────────────────
// Export everything
// ────────────────────────────────────────────────
export default {
  authApi,
  userApi,
  bookingApi,
  paymentApi,
  hotelApi,
  carApi,
  setAuthToken,
  clearAuthToken,
  getStoredAuthToken,
  getStoredUser,
  fetchUserProfile,
  updateUserProfile,
  uploadUserAvatar,
  searchFlightsWithPagination,
  ApiError,
};