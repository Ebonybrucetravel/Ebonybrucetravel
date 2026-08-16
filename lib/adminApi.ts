import { config } from './config';

const BASE = config.apiBaseUrl;

function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') ?? '';
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface AdminFetchOpts {
  method?: string;
  body?: object;
}

async function adminFetch<T>(
  path: string,
  opts?: AdminFetchOpts
): Promise<{ success: boolean; data?: T; message?: string; meta?: any }> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE}${cleanPath}`;

  try {
    const res = await fetch(url, {
      method: opts?.method ?? 'GET',
      headers: authHeaders(),
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const responseText = await res.text();

    let json;
    try {
      json = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      json = { message: 'Invalid JSON response' };
    }

    if (!res.ok) {
      console.error('Admin API Error:', { status: res.status, url });
      throw new Error(json.message ?? json.error ?? `Request failed: ${res.status}`);
    }

    return json;
  } catch (error) {
    console.error('Admin fetch error:', error);
    throw error;
  }
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export async function getDashboardStats(params?: {
  startDate?: string;
  endDate?: string;
}) {
  const q = new URLSearchParams();
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  const query = q.toString();
  return adminFetch<any>(`/api/v1/dashboard/stats${query ? `?${query}` : ''}`);
}

// ─── Admin users (SUPER_ADMIN only) ────────────────────────────────────────
export async function createAdminUser(body: {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  phone?: string;
}) {
  return adminFetch<any>('/api/v1/admin/users', { method: 'POST', body });
}

export async function listAdminUsers(role?: 'ADMIN' | 'SUPER_ADMIN') {
  const q = role ? `?role=${role}` : '';
  return adminFetch<any[]>(`/api/v1/admin/users${q}`);
}

export async function getAdminUser(id: string) {
  return adminFetch<any>(`/api/v1/admin/users/${id}`);
}

export async function updateAdminUser(
  id: string,
  body: Partial<{ name: string; phone: string; role: string; permissions: Record<string, boolean> }>
) {
  return adminFetch<any>(`/api/v1/admin/users/${id}`, { method: 'PUT', body });
}

export async function deleteAdminUser(id: string) {
  return adminFetch<void>(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
}

export async function assignAdminPermissions(
  id: string,
  body: { permissions: Record<string, boolean> }
) {
  return adminFetch<any>(`/api/v1/admin/users/${id}/permissions`, { method: 'POST', body });
}

// ─── Customers ─────────────────────────────────────────────────────────────
export async function listCustomers(params?: {
  status?: 'all' | 'active' | 'suspended';
  page?: number;
  limit?: number;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  const query = q.toString();
  return adminFetch<any>(`/api/v1/admin/customers${query ? `?${query}` : ''}`);
}

export async function getCustomer(id: string) {
  return adminFetch<any>(`/api/v1/admin/customers/${id}`);
}

export async function updateCustomerNotes(id: string, notes: string) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/notes`, {
    method: 'PATCH',
    body: { notes },
  });
}

export async function suspendCustomer(id: string, reason: string) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/suspend`, {
    method: 'POST',
    body: { reason },
  });
}

export async function activateCustomer(id: string) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/activate`, {
    method: 'POST'
  });
}

export async function sendCustomerPasswordReset(id: string) {
  return adminFetch<void>(`/api/v1/admin/customers/${id}/reset-password-link`, {
    method: 'POST',
  });
}

// ─── Bookings ─────────────────────────────────────────────────────────────
export async function listBookings(params?: {
  status?: string;
  productType?: string;
  provider?: string;
  userId?: string;
  customerId?: string;  // ✅ Alias for userId
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  
  // ✅ Handle both userId and customerId
  const userId = params?.customerId || params?.userId;
  
  // Add all params except customerId (handled separately)
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (k === 'customerId') return; // Skip, handled above
    if (v != null && v !== '') q.set(k, String(v));
  });
  
  // Add userId if present
  if (userId) {
    q.set('userId', userId);
  }
  
  const query = q.toString();
  console.log(`📡 listBookings URL: /api/v1/admin/bookings${query ? `?${query}` : ''}`);
  return adminFetch<any>(`/api/v1/admin/bookings${query ? `?${query}` : ''}`);
}

export async function createBooking(body: {
  userId?: string;
  productType: 'FLIGHT_DOMESTIC' | 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL';
  provider: string;
  basePrice: number;
  currency: string;
  bookingData: Record<string, any>;
  passengerInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}) {
  return adminFetch<any>('/api/v1/admin/bookings', {
    method: 'POST',
    body,
  });
}

export async function getBooking(id: string) {
  return adminFetch<any>(`/api/v1/admin/bookings/${id}`);
}

export async function updateBookingStatus(id: string, status: string) {
  return adminFetch<any>(`/api/v1/admin/bookings/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function cancelBooking(id: string, reason?: string) {
  return adminFetch<any>(`/api/v1/admin/bookings/${id}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export async function processRefund(id: string, data: { refundAmount: number; refundStatus: string }) {
  return adminFetch<any>(`/api/v1/admin/bookings/${id}/refund`, {
    method: 'POST',
    body: data,
  });
}

export async function sendBookingEmail(id: string, type: 'confirmation' | 'reminder' | 'cancellation') {
  return adminFetch<any>(`/api/v1/admin/bookings/${id}/email`, {
    method: 'POST',
    body: { type },
  });
}

export async function exportBookingsCsv(params?: {
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    // Try API endpoint first
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, String(v));
    });
    const query = q.toString();
    const token = getAdminToken();

    const url = `${BASE}/api/v1/admin/bookings/export${query ? `?${query}` : ''}`;

    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.ok) {
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ??
        `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;

      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }, 100);

      return;
    }

    // If API fails, throw to fallback
    throw new Error(`API export failed with status ${res.status}`);

  } catch (error) {
    const bookingsResponse = await listBookings(params);
    if (!bookingsResponse.success) throw new Error('Failed to fetch bookings');

    const bookings = bookingsResponse.data;

    if (!bookings || bookings.length === 0) {
      throw new Error('No bookings to export');
    }

    const headers = ['ID', 'Reference', 'Type', 'Customer', 'Amount', 'Currency', 'Status', 'Date'];

    const csvRows = [
      headers.join(','),
      ...bookings.map((b: any) =>
        [
          b.id || '',
          b.reference || '',
          b.productType || '',
          b.user?.name || b.customerName || 'Guest',
          b.totalAmount || 0,
          b.currency || 'GBP',
          b.status || '',
          b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''
        ].map(value => {
          const stringValue = value?.toString() || '';
          const escaped = stringValue.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')
            ? `"${escaped}"`
            : escaped;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `bookings_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    }, 100);
  }
}

export async function getBookingDisputeEvidence(bookingId: string) {
  return adminFetch<any>(`/api/v1/admin/bookings/${bookingId}/dispute-evidence`);
}

// ─── WAKANOW ADMIN ENDPOINTS ───────────────────────────────────────────────

/**
 * Issue a ticket for a Wakanow booking
 * @param bookingId - The booking ID from your system
 * @param pnrNumber - The PNR number from the book response
 */
export async function issueWakanowTicket(bookingId: string, pnrNumber: string, authToken?: string) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('No admin token found');
    throw new Error('Authentication required. Please login again.');
  }
  
  const url = `${BASE}/api/v1/bookings/wakanow/ticket`;
  
  console.log('🎫 Issuing Wakanow ticket...');
  console.log('   Booking ID:', bookingId);
  console.log('   PNR:', pnrNumber);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
  bookingId, 
  pnrNumber,
  localBookingId: bookingId,
}),
    });

    const data = await response.json();
    console.log('📦 Ticket issuance response:', data);

    if (!response.ok) {
      console.error('❌ Wakanow ticket issuance error:', {
        status: response.status,
        data: data,
      });
      throw new Error(data.message || data.error || `Failed to issue ticket: ${response.status}`);
    }

    // ✅ Extract the ticket data
    const responseData = data.data || data;
    
    return {
      success: true,
      data: {
        ...responseData,
        pnrNumber: responseData.pnr_reference || responseData.pnrNumber || pnrNumber,
        status: responseData.status || 'SUCCESS',
        message: responseData.message || 'Ticket issued successfully',
      },
      message: 'Ticket issued successfully',
    };
  } catch (error: any) {
    console.error('❌ Issue ticket error:', error);
    throw error;
  }
}

/**
 * Get Wakanow wallet balance
 */
export async function getWakanowWalletBalance() {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('No admin token found');
    throw new Error('Authentication required. Please login again.');
  }
  
  // ✅ Try multiple possible endpoints
  const endpoints = [
    `${BASE}/api/v1/bookings/wakanow/wallet-balance`,
    `${BASE}/api/v1/admin/wakanow/wallet-balance`,
    `${BASE}/api/v1/wakanow/wallet-balance`,
  ];

  let lastError: any = null;

  for (const url of endpoints) {
    console.log(`💰 Trying wallet balance endpoint: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Wallet balance found at: ${url}`);
        console.log('📊 Wallet balance data:', data);

        // ✅ Extract the data from the response
        const responseData = data.data || data;
        
        // ✅ Extract balance from various possible response structures
        const balance = 
          responseData.Balance || 
          responseData.balance || 
          responseData.Result?.Balance || 
          responseData.result?.Balance ||
          responseData.result?.balance ||
          0;

        const currency = 
          responseData.Currency || 
          responseData.currency || 
          responseData.Result?.Currency || 
          responseData.result?.Currency ||
          responseData.result?.currency ||
          'NGN';

        // ✅ Return normalized response for the frontend
        return {
          success: true,
          data: {
            balance: balance,
            currency: currency,
            hasResult: true,
            successful: true,
            message: responseData.Message || data.message || 'Wallet balance retrieved successfully',
          },
          message: 'Wallet balance retrieved successfully',
        };
      } else {
        console.warn(`⚠️ Wallet balance endpoint ${url} failed:`, response.status, data);
        lastError = new Error(data.message || `Failed: ${response.status}`);
      }
    } catch (error) {
      console.warn(`⚠️ Wallet balance endpoint ${url} error:`, error);
      lastError = error;
    }
  }

  // ✅ If all endpoints failed, throw the last error
  console.error('❌ All wallet balance endpoints failed');
  throw lastError || new Error('Failed to fetch wallet balance from all endpoints');
}

/**
 * Admin: Search Wakanow flights
 */
export async function adminSearchWakanowFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabinClass?: string;
}) {
  const token = localStorage.getItem('adminToken');
  const BASE_URL = (await import('./config')).config.apiBaseUrl;

  if (!token) {
    throw new Error('Authentication required. Please login again.');
  }

  const ticketClassMap: Record<string, string> = {
    economy: 'Y',
    premium_economy: 'W',
    business: 'C',
    first: 'F',
  };

  const body = {
    FlightSearchType: params.returnDate ? 'Return' : 'Oneway',
    Ticketclass: ticketClassMap[params.cabinClass ?? 'economy'] ?? 'Y',
    Adults: params.adults,
    Children: params.children ?? 0,
    Infants: params.infants ?? 0,
    TargetCurrency: 'NGN',
    Itineraries: [
      {
        Departure: params.origin.toUpperCase(),
        Destination: params.destination.toUpperCase(),
        DepartureDate: params.departureDate,
      },
      ...(params.returnDate
        ? [
            {
              Departure: params.destination.toUpperCase(),
              Destination: params.origin.toUpperCase(),
              DepartureDate: params.returnDate,
            },
          ]
        : []),
    ],
  };

  console.log('🔍 Admin searching Wakanow flights...', body);

  try {
    const res = await fetch(`${BASE_URL}/api/v1/bookings/wakanow/search`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error('❌ Wakanow search error:', data);
      throw new Error(data.message ?? `Search failed: ${res.status}`);
    }

    // ✅ Extract the search results
    const results = data.data || data;
    
    console.log('✅ Admin Wakanow search results:', {
      totalOffers: results.total_offers || results.flights?.length || 0,
      hasResults: !!results.flights || !!results.results,
    });

    return {
      success: true,
      data: results,
      message: data.message || 'Search completed successfully',
    };
  } catch (error: any) {
    console.error('❌ Admin Wakanow search error:', error);
    throw error;
  }
}

/**
 * Admin: Select Wakanow flight
 */
export async function adminSelectWakanowFlight(selectData: string) {
  const token = localStorage.getItem('adminToken');
  const BASE_URL = (await import('./config')).config.apiBaseUrl;

  if (!token) {
    throw new Error('Authentication required. Please login again.');
  }

  console.log('🔍 Admin selecting Wakanow flight...');
  console.log('   SelectData length:', selectData?.length || 0);

  try {
    const res = await fetch(`${BASE_URL}/api/v1/bookings/wakanow/select`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        SelectData: selectData, 
        TargetCurrency: 'NGN' 
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error('❌ Wakanow select error:', data);
      throw new Error(data.message ?? `Select failed: ${res.status}`);
    }

    // ✅ Extract the actual data from the response
    const responseData = data.data || data;
    
    // ✅ Log the response for debugging
    console.log('✅ Wakanow select response:', {
      bookingId: responseData.booking_id,
      hasPriceBreakdown: !!responseData.priceBreakdown,
      hasSelectData: !!responseData.select_data,
      hasFlightSummary: !!responseData.flight_summary,
    });

    return {
      success: true,
      data: {
        // Wakanow booking ID (starts with 260...)
        bookingId: responseData.booking_id,
        // The selectData for the booking step
        selectData: responseData.select_data,
        // Price breakdown
        priceBreakdown: responseData.priceBreakdown,
        basePrice: responseData.basePrice,
        markupAmount: responseData.markupAmount,
        markupPercentage: responseData.markupPercentage,
        serviceFee: responseData.serviceFee,
        serviceFeePercentage: responseData.serviceFeePercentage,
        taxes: responseData.taxes,
        taxPercentage: responseData.taxPercentage,
        totalAmount: responseData.totalAmount,
        currency: responseData.currency || 'NGN',
        // Flight summary
        flightSummary: responseData.flight_summary,
        // Terms and conditions
        termsAndConditions: responseData.terms_and_conditions,
        customMessages: responseData.custom_messages || [],
        // Passport requirement
        isPassportRequired: responseData.is_passport_required || false,
        isPriceMatched: responseData.is_price_matched || false,
        // Message
        message: responseData.message || 'Flight pricing confirmed',
      }
    };
  } catch (error: any) {
    console.error('❌ Admin Wakanow select error:', error);
    throw error;
  }
}


export async function adminBookWakanowFlightForUser(payload: {
  userId: string;
  selectData: string;
  bookingId: string;
  passengers: Array<{
    PassengerType: 'Adult' | 'Child' | 'Infant';
    Title: string;
    FirstName: string;
    MiddleName?: string;
    LastName: string;
    DateOfBirth: string;
    Gender: 'Male' | 'Female';
    Email: string;
    PhoneNumber: string;
    PassportNumber: string;
    ExpiryDate: string;
    PassportIssuingAuthority: string;
    PassportIssueCountryCode?: string;
    Address: string;
    City: string;
    Country: string;
    CountryCode: string;
    PostalCode: string;
  }>;
  targetCurrency?: string;
}) {
  const token = localStorage.getItem('adminToken');
  const BASE_URL = (await import('./config')).config.apiBaseUrl;

  if (!token) {
    throw new Error('Authentication required. Please login again.');
  }

  try {
    // ✅ Build the request body correctly
    const requestBody = {
      BookingData: payload.selectData,
      BookingId: payload.bookingId,
      TargetCurrency: payload.targetCurrency ?? 'NGN',
      PassengerDetails: payload.passengers.map(p => ({
        PassengerType: p.PassengerType,
        Title: p.Title,
        FirstName: p.FirstName,
        MiddleName: p.MiddleName || '',
        LastName: p.LastName,
        DateOfBirth: p.DateOfBirth,
        Gender: p.Gender,
        Email: p.Email,
        PhoneNumber: p.PhoneNumber,
        PassportNumber: p.PassportNumber || '',
        ExpiryDate: p.ExpiryDate || '',
        PassportIssuingAuthority: p.PassportIssuingAuthority || '',
        PassportIssueCountryCode: p.PassportIssueCountryCode || 'NG',
        Address: p.Address || '123 Fake Street',
        City: p.City || 'Lagos',
        Country: p.Country || 'Nigeria',
        CountryCode: p.CountryCode || 'NG',
        PostalCode: p.PostalCode || '100001',
        IsWakapointRegister: false,
      })),
      userId: payload.userId,
    };

    console.log('📤 Admin booking request:', {
      bookingId: requestBody.BookingId,
      selectDataLength: requestBody.BookingData?.length || 0,
      passengerCount: requestBody.PassengerDetails.length,
      userId: requestBody.userId,
    });

    const res = await fetch(`${BASE_URL}/api/v1/bookings/wakanow/book`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error('❌ Wakanow book error:', data);
      throw new Error(data.message ?? `Booking failed: ${res.status}`);
    }

    // ✅ Extract the booking data
    const bookingData = data.data || data;
    
    // ✅ Log the response for debugging
    console.log('✅ Wakanow book response:', {
      id: bookingData.id,
      reference: bookingData.reference,
      providerBookingId: bookingData.providerBookingId,
      pnr: bookingData.bookingData?.pnrReferenceNumber,
      status: bookingData.status,
      totalAmount: bookingData.totalAmount,
    });

    return {
      success: true,
      data: {
        ...bookingData,
        // Ensure PNR is easily accessible
        pnr_reference: bookingData.bookingData?.pnrReferenceNumber || 
                       bookingData.bookingData?.pnrNumber ||
                       bookingData.pnr_reference,
        wakanow_booking_id: bookingData.providerBookingId || bookingData.wakanow_booking_id,
        paymentStatus: bookingData.paymentStatus || 'PENDING',
      },
      message: 'Flight booked successfully. Proceed to payment.',
    };
  } catch (error: any) {
    console.error('❌ Admin Wakanow booking error:', error);
    throw error;
  }
}

export async function adminSearchAmadeusHotelsWithRoomTypes(params: {
  cityCode?: string;
  hotelIds?: string[];
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  roomQuantity?: number;
  currency?: string;
  bestRateOnly?: boolean;
}) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('No admin token found');
    throw new Error('Authentication required. Please login again.');
  }

  const requestBody: any = {
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
    adults: params.adults || 2,
    roomQuantity: params.roomQuantity || 1,
    currency: params.currency || 'GBP',
    bestRateOnly: params.bestRateOnly ?? true,
  };

  if (params.hotelIds && params.hotelIds.length > 0) {
    requestBody.hotelIds = params.hotelIds;
  } else if (params.cityCode) {
    requestBody.cityCode = params.cityCode;
  } else {
    throw new Error('Either cityCode or hotelIds is required for hotel search.');
  }

  console.log('🏨 Admin searching Amadeus hotels with room types...', requestBody);

  try {
    const response = await fetch(`${BASE}/api/v1/bookings/search/hotels/amadeus/room-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Admin Amadeus room types search error:', data);
      throw new Error(data.message || data.error || `Search failed: ${response.status}`);
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Hotels with room types retrieved successfully',
    };
  } catch (error: any) {
    console.error('❌ Admin Amadeus room types search error:', error);
    throw error;
  }
}

/**
 * Admin: Get detailed pricing for a specific hotel offer with all fees
 */
export async function adminGetHotelOfferPricingWithFees(
  offerId: string,
  currency?: string
) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('No admin token found');
    throw new Error('Authentication required. Please login again.');
  }

  if (!offerId) {
    throw new Error('Offer ID is required');
  }

  const currencyParam = currency ? `?currency=${currency}` : '';
  console.log(`💰 Admin getting offer pricing with fees for: ${offerId}`);

  try {
    const response = await fetch(
      `${BASE}/api/v1/bookings/hotels/amadeus/offer-pricing/${offerId}${currencyParam}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Admin offer pricing error:', data);
      throw new Error(data.message || data.error || `Failed to get offer pricing: ${response.status}`);
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Offer pricing with fees retrieved successfully',
    };
  } catch (error: any) {
    console.error('❌ Admin offer pricing error:', error);
    throw error;
  }
}

/**
 * Admin: Get comprehensive hotel details (content, ratings, images)
 */
export async function adminGetHotelDetails(hotelId: string) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('No admin token found');
    throw new Error('Authentication required. Please login again.');
  }

  if (!hotelId) {
    throw new Error('Hotel ID is required');
  }

  console.log(`🏨 Admin getting hotel details for: ${hotelId}`);

  try {
    const response = await fetch(`${BASE}/api/v1/bookings/hotels/${hotelId}/details`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Admin hotel details error:', data);
      throw new Error(data.message || data.error || `Failed to get hotel details: ${response.status}`);
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Hotel details retrieved successfully',
    };
  } catch (error: any) {
    console.error('❌ Admin hotel details error:', error);
    throw error;
  }
}

/**
 * Admin: Get hotel images
 */
export async function adminGetHotelImages(
  hotelId: string,
  hotelName?: string
) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('No admin token found');
    throw new Error('Authentication required. Please login again.');
  }

  if (!hotelId) {
    throw new Error('Hotel ID is required');
  }

  const queryParams = new URLSearchParams();
  if (hotelName) queryParams.set('hotelName', hotelName);
  const queryString = queryParams.toString();
  const url = `${BASE}/api/v1/bookings/hotels/${hotelId}/images${queryString ? `?${queryString}` : ''}`;

  console.log(`📸 Admin getting hotel images for: ${hotelId}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Admin hotel images error:', data);
      throw new Error(data.message || data.error || `Failed to get hotel images: ${response.status}`);
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Hotel images retrieved successfully',
    };
  } catch (error: any) {
    console.error('❌ Admin hotel images error:', error);
    throw error;
  }
}

/**
 * Admin: Get hotel ratings
 */
export async function adminGetHotelRatings(hotelId: string) {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    console.error('No admin token found');
    throw new Error('Authentication required. Please login again.');
  }

  if (!hotelId) {
    throw new Error('Hotel ID is required');
  }

  console.log(`⭐ Admin getting hotel ratings for: ${hotelId}`);

  try {
    const response = await fetch(`${BASE}/api/v1/bookings/hotels/${hotelId}/ratings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Admin hotel ratings error:', data);
      throw new Error(data.message || data.error || `Failed to get hotel ratings: ${response.status}`);
    }

    return {
      success: true,
      data: data.data || data,
      message: data.message || 'Hotel ratings retrieved successfully',
    };
  } catch (error: any) {
    console.error('❌ Admin hotel ratings error:', error);
    throw error;
  }
}


// ─── Audit logs (SUPER_ADMIN only) ─────────────────────────────────────────
export async function listAuditLogs(params?: {
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const query = q.toString();
  return adminFetch<any>(`/api/v1/admin/audit-logs${query ? `?${query}` : ''}`);
}

// ─── Rewards ───────────────────────────────────────────────────────────────
export async function getRewardsDashboard() {
  return adminFetch<any>('/api/v1/admin/rewards/dashboard');
}

export async function listRewardRules(activeOnly?: boolean) {
  const q = activeOnly ? '?activeOnly=true' : '';
  return adminFetch<any[]>(`/api/v1/admin/rewards/rules${q}`);
}

export async function createRewardRule(body: Record<string, unknown>) {
  return adminFetch<any>('/api/v1/admin/rewards/rules', { method: 'POST', body });
}

export async function getRewardRule(id: string) {
  return adminFetch<any>(`/api/v1/admin/rewards/rules/${id}`);
}

export async function updateRewardRule(id: string, body: Record<string, unknown>) {
  return adminFetch<any>(`/api/v1/admin/rewards/rules/${id}`, { method: 'PUT', body });
}

export async function deleteRewardRule(id: string) {
  return adminFetch<void>(`/api/v1/admin/rewards/rules/${id}`, { method: 'DELETE' });
}

export async function listRewardTiers() {
  return adminFetch<any>('/api/v1/admin/rewards/tiers');
}

export async function upsertRewardTiers(body: Record<string, unknown>) {
  return adminFetch<any>('/api/v1/admin/rewards/tiers', { method: 'PUT', body });
}

export async function seedRewardTiers() {
  return adminFetch<any>('/api/v1/admin/rewards/tiers/seed-defaults', { method: 'POST' });
}

export async function listEarningRules() {
  return adminFetch<any>('/api/v1/admin/rewards/earning-rules');
}

export async function upsertEarningRule(body: Record<string, unknown>) {
  return adminFetch<any>('/api/v1/admin/rewards/earning-rules', { method: 'PUT', body });
}

export async function seedEarningRules() {
  return adminFetch<any>('/api/v1/admin/rewards/earning-rules/seed-defaults', { method: 'POST' });
}

export async function listVouchers(params?: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v != null && v !== '') q.set(k, String(v));
  });
  const query = q.toString();
  return adminFetch<any>(`/api/v1/admin/rewards/vouchers${query ? `?${query}` : ''}`);
}

export async function cancelVoucher(id: string) {
  return adminFetch<void>(`/api/v1/admin/rewards/vouchers/${id}`, { method: 'DELETE' });
}

export async function adjustUserPoints(userId: string, points: number, reason: string) {
  return adminFetch<any>(`/api/v1/admin/rewards/users/${userId}/adjust-points`, {
    method: 'POST',
    body: { points, reason },
  });
}

export async function getUserLoyalty(userId: string) {
  return adminFetch<any>(`/api/v1/admin/rewards/users/${userId}/loyalty`);
}

// ─── Cancellation requests ──────────────────────────────────────────────────
export async function listCancellationRequests() {
  return adminFetch<any>('/api/v1/admin/cancellation-requests');
}

export async function processCancellationRequest(
  id: string,
  body: {
    action: 'REJECT' | 'APPROVE_PARTIAL_REFUND' | 'APPROVE_FULL_REFUND';
    refundAmount?: number;
    adminNotes?: string;
    rejectionReason?: string;
  }
) {
  return adminFetch<any>(`/api/v1/admin/cancellation-requests/${id}/process`, {
    method: 'POST',
    body,
  });
}

// ─── Markups ─────────────────────────────────────────────────────────────
export async function listMarkups() {
  return adminFetch<any>('/api/v1/markups');
}

export async function createMarkup(body: {
  productType: 'FLIGHT_DOMESTIC' | 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL';
  markupPercentage: number;
  serviceFeeAmount: number;
  currency: string;
  description: string;
}) {
  return adminFetch<any>('/api/v1/markups', {
    method: 'POST',
    body,
  });
}

export async function updateMarkup(
  id: string,
  body: {
    markupPercentage?: number;
    serviceFeeAmount?: number;
    description?: string;
    isActive?: boolean;
  }
) {
  return adminFetch<any>(`/api/v1/markups/${id}`, {
    method: 'PATCH',
    body,
  });
}

export async function deleteMarkup(id: string) {
  return adminFetch<void>(`/api/v1/markups/${id}`, {
    method: 'DELETE',
  });
}

// ─── Admin: cancel/sync booking status ────────────────────────────────────────
export async function cancelBookingStatus(id: string, reason?: string) {
  return adminFetch<any>(`/api/v1/admin/bookings/${id}/cancel`, {
    method: 'PATCH',
    body: { reason: reason ?? 'Admin manual cancellation' },
  });
}

// ─── Admin: fetch a customer's default saved traveler ─────────────────────────
export async function getCustomerDefaultTraveler(customerId: string) {
  return adminFetch<any>(`/api/v1/admin/customers/${customerId}/travelers/default`);
}

