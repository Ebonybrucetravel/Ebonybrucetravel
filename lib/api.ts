
const API_BASE = 'https://ebony-bruce-production.up.railway.app';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Check if the response is actually JSON before parsing
    const contentType = response.headers.get("content-type");
    let data: any;
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // Fallback for non-JSON responses (like HTML error pages)
      const text = await response.text();
      data = { message: text || response.statusText };
    }

    if (!response.ok) {
      throw new ApiError(data.message || `Server error: ${response.status}`, response.status);
    }

    return data;
  } catch (error: any) {
    // Log the full error to the console for developer debugging
    console.error(`[API Request Error] ${options.method || 'GET'} ${url}:`, error);

    if (error instanceof ApiError) {
      throw error;
    }

    // Handle standard fetch errors (CORS, DNS, Network Offline)
    if (error.name === 'TypeError' && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
      throw new Error('Connection refused: Please check your internet or verify the server CORS policy.');
    }

    throw new Error(error.message || 'An unexpected error occurred during the request.');
  }
}

export const authApi = {
  login: (credentials: { email: string; password: string }) => {
    return request<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  register: (userData: { name: string; email: string; password: string }) => {
    return request<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

export const bookingApi = {
  searchFlights: (searchParams: any) => {
    return request<any>('/api/v1/bookings/search/flights', {
      method: 'POST',
      body: JSON.stringify(searchParams),
    });
  },
};
