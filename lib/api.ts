// api.ts (or lib/api.ts)

const API_BASE = 'https://ebony-bruce-production.up.railway.app';

// Define ApiError class
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
}

// ────────────────────────────────────────────────
// Helper: get current auth token from localStorage
// ────────────────────────────────────────────────
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('travelToken') || localStorage.getItem('authToken') || null;
}

// ────────────────────────────────────────────────
// Core request function with timeout + auth + better errors
// ────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const token = getAuthToken();

  // Use Record<string, string> type for headers
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

  // Add timeout using AbortController instead of AbortSignal.timeout (which might not be available)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  config.signal = controller.signal;

  try {
    const response = await fetch(url, config);

    let data: ApiResponse<T>;

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text || response.statusText, status: response.status };
    }

    // Handle common auth errors
    if (response.status === 401) {
      // Clear token and redirect to login
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('auth-expired'));
      throw new ApiError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');
    }

    if (response.status === 403) {
      throw new ApiError('You do not have permission to perform this action.', 403, 'FORBIDDEN');
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`;

      throw new ApiError(
        errorMessage,
        response.status,
        data?.code || data?.errorCode,
        data
      );
    }

    // Most APIs return { data: {...} } — try to normalize
    return (data.data ?? data) as T;

  } catch (err: any) {
    console.error(`API Error → ${options.method || 'GET'} ${url}:`, err);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Server is slow or unreachable.', 504, 'TIMEOUT');
    }

    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new ApiError(
        'Cannot connect to server. Check your internet or try again later.',
        0,
        'NETWORK_ERROR'
      );
    }

    throw new ApiError(
      err.message || 'An unexpected error occurred',
      0,
      'UNKNOWN_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// ────────────────────────────────────────────────
// Auth API
// ────────────────────────────────────────────────
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    request<ApiResponse<{ token: string; user: User }>>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: { name: string; email: string; password: string }) =>
    request<ApiResponse<{ token: string; user: User }>>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Optional: if your backend has logout / revoke token endpoint
  logout: () =>
    request('/api/v1/auth/logout', {
      method: 'POST',
    }).catch(() => {
      // even if it fails, we clear locally
    }),

  // Verify token
  verifyToken: () =>
    request<ApiResponse<{ valid: boolean; user: User }>>('/api/v1/auth/verify', {
      method: 'GET',
    }),
};

// ────────────────────────────────────────────────
// User Profile API
// ────────────────────────────────────────────────
export const userApi = {
  // GET /api/v1/users/me - Get current user profile
  getProfile: () =>
    request<User>('/api/v1/users/me', {
      method: 'GET',
    }),

  // PUT /api/v1/users/me - Update user profile
  updateProfile: (profileData: Partial<User>) =>
    request<User>('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  // PUT /api/v1/users/me/avatar - Upload profile image
  uploadProfileImage: (file: File) => {
    const formData = new FormData();
    
    // ✅ CORRECT: Server expects field name "image"
    formData.append('image', file);
    
    console.log('📤 Uploading profile image with field "image":', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    return request<{ avatar: string; url: string; imageUrl: string; profilePicture: string }>('/api/v1/users/me/avatar', {
      method: 'PUT',
      body: formData,
    });
  },

  // Change password
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/v1/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete account
  deleteAccount: () =>
    request<{ message: string }>('/api/v1/users/me', {
      method: 'DELETE',
    }),
};

// ────────────────────────────────────────────────
// Booking / Search API
// ────────────────────────────────────────────────
export const bookingApi = {
  // Search flights
  searchFlights: (searchParams: any) =>
    request<any>('/api/v1/bookings/search/flights', {
      method: 'POST',
      body: JSON.stringify(searchParams),
    }),

  // Create booking (authenticated)
  createBooking: (bookingData: any) =>
    request<{ bookingReference: string; status: string; id: string }>(
      '/api/v1/bookings',
      {
        method: 'POST',
        body: JSON.stringify(bookingData),
      }
    ),

  // Create guest booking (no authentication required)
  createGuestBooking: (bookingData: any) =>
    request<{ bookingReference: string; status: string; id: string }>(
      '/api/v1/bookings/guest',
      {
        method: 'POST',
        body: JSON.stringify(bookingData),
      }
    ),

  // Get user bookings
  getUserBookings: () =>
    request<any[]>('/api/v1/bookings', {
      method: 'GET',
    }),

  // Get booking by ID
  getBooking: (id: string) =>
    request<any>(`/api/v1/bookings/${id}`, {
      method: 'GET',
    }),

  // Cancel booking
  cancelBooking: (id: string) =>
    request<{ message: string }>(`/api/v1/bookings/${id}/cancel`, {
      method: 'PUT',
    }),

  // Get flight offers
  getFlightOffers: (offerRequestId: string, cursor?: string, limit: number = 20) => {
    const params = new URLSearchParams({
      offer_request_id: offerRequestId,
      limit: limit.toString(),
      ...(cursor && { cursor }),
    });
    
    return request<any>(`/api/v1/bookings/offers?${params.toString()}`, {
      method: 'GET',
    });
  },
};

// ────────────────────────────────────────────────
// Hotels API (if available)
// ────────────────────────────────────────────────
export const hotelApi = {
  searchHotels: (params: any) =>
    request<any>('/api/v1/hotels/search', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getHotelDetails: (id: string) =>
    request<any>(`/api/v1/hotels/${id}`, {
      method: 'GET',
    }),
};

// ────────────────────────────────────────────────
// Car Rentals API (if available)
// ────────────────────────────────────────────────
export const carApi = {
  searchCars: (params: any) =>
    request<any>('/api/v1/cars/search', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};

// ────────────────────────────────────────────────
// Token management helpers
// ────────────────────────────────────────────────
export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('travelToken', token);
    // Also set in session storage for immediate access
    sessionStorage.setItem('authToken', token);
    window.dispatchEvent(new CustomEvent('auth-token-set', { detail: { token } }));
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('travelToken');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.dispatchEvent(new CustomEvent('auth-token-cleared'));
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('travelToken') || localStorage.getItem('authToken');
}

// ────────────────────────────────────────────────
// Auth event listeners for handling session expiration
// ────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('auth-expired', () => {
    clearAuthToken();
    // You can redirect to login page here if needed
    // window.location.href = '/login';
  });
}

// ────────────────────────────────────────────────
// Example usage function for components
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
    if (!token) throw new Error('Not authenticated');

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
    if (!token) throw new Error('Not authenticated');

    const response = await userApi.uploadProfileImage(file);
    return response?.avatar || response?.url || response?.imageUrl || response?.profilePicture || null;
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    throw error;
  }
}

// ────────────────────────────────────────────────
// Export everything
// ────────────────────────────────────────────────
export default {
  authApi,
  userApi,
  bookingApi,
  hotelApi,
  carApi,
  setAuthToken,
  clearAuthToken,
  getStoredAuthToken,
  fetchUserProfile,
  updateUserProfile,
  uploadUserAvatar,
};