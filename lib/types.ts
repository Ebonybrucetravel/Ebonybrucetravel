// ─── Search ─────────────────────────────────────────
export interface SearchSegment {
  from: string;
  to: string;
  date: string;
}

export interface SearchParams {
  type: 'flights' | 'hotels' | 'cars' | 'car-rentals';
  tripType?: 'round-trip' | 'one-way' | 'multi-city';
  segments?: SearchSegment[];
  returnDate?: string;
  passengers?: number | { adults: number; children: number; infants: number };
  adults?: number;
  guests?: number;
  rooms?: number;
  cabinClass?: string;
  stopsFilter?: string;
  maxPrice?: number;
  currency?: string;
  location?: string;
  cityCode?: string;
  checkInDate?: string;
  checkOutDate?: string;
  pickupLocationCode?: string;
  pickupDateTime?: string;
  dropoffLocationCode?: string;
  dropoffDateTime?: string;
  carPickUp?: string;
  carDropOff?: string;
  travellers?: number;
  pickUpDate?: string;
  dropOffDate?: string;
  maxConnections?: number;
}

export interface SearchResult {
  id: string;
  provider: string;
  title: string;
  subtitle: string;
  price: string;
  time?: string;
  duration?: string;
  rating?: number;
  image?: string;
  amenities?: string[];
  features?: string[];
  type: 'flights' | 'hotels' | 'car-rentals';
  // Add these optional properties
  airlineCode?: string;
  owner?: {
    id: string;
    name: string;
    iata_code: string;
    logo_symbol_url?: string;
  };
  slices?: any[];
  realData?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}
// ─── Hotel Offer Interface (ADD THIS) ──────────────
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
    description?: {
      text?: string;
      lang?: string;
    };
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
  // Additional fields that might be added by our API
  primaryImageUrl?: string;
}

// ─── User / Auth ────────────────────────────────────
export interface User {
  id?: string;
  name: string;
  email: string;
  image?: string;
  profilePicture?: string;
  avatar?: string;
  dob?: string;
  gender?: string;
  phone?: string;
  provider?: 'email' | 'google' | 'facebook';
  role?: 'user' | 'admin';
  token?: string;
}

// ─── Booking ────────────────────────────────────────
export interface Booking {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  productType: string;
  provider: string;
  basePrice: number;
  totalAmount: number;
  currency: string;
  bookingData: Record<string, any>;
  passengerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  createdAt: string;
  voucherId?: string;
  voucherCode?: string;
  voucherDiscount?: number;
  finalAmount?: number;
  markupAmount?: number;
  serviceFee?: number;
}

export interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}