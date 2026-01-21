
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
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.message || 'Something went wrong', response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Network error or server unreachable');
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
