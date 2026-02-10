
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
  // Added carDropOff to SearchParams
  carDropOff?: string;
  // Added travellers to SearchParams
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
  totalPrice?: string;
  time?: string;
  duration?: string;
  stops?: string;
  rating?: number;
  image?: string;
  amenities?: string[];
  features?: string[];
  type?: "flights" | "hotels" | "car-rentals";
  isRefundable?: boolean;
  realData?: any;
  baggage?: string;
  aircraft?: string;
  layoverDetails?: string;
  imageUrl?: string;
}

export interface Booking {
  id: string;
  type: 'flight' | 'hotel' | 'car';
  title: string;
  provider: string;
  subtitle: string;
  date: string;
  duration?: string;
  status: 'Confirmed' | 'Completed' | 'Cancel' | 'Active';
  price: string;
  currency: string;
  iconBg: string;
  imageUrl?: string;
  bookingReference?: string;
  time?: string;
  paymentStatus?: string;
  bookingData?: any;
  isGuest?: boolean;
  passengerInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    [key: string]: any;
  };
}