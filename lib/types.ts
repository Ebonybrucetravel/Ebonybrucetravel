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
  passengers?: number | {
      adults: number;
      children: number;
      infants: number;
  };
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
  totalPrice?: string;
  time?: string;
  duration?: string;
  stops?: string;
  rating?: number;
  image?: string;
  amenities?: string[];
  features?: string[];
  type?: 'flights' | 'hotels' | 'car-rentals';
  isRefundable?: boolean;
  realData?: any;
  baggage?: string;
  aircraft?: string;
  layoverDetails?: string;
  imageUrl?: string;
}
export interface User {
  id?: string;
  name: string;
  email: string;
  image?: string;
  profilePicture?: string;
  avatar?: string;
  dob?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  provider?: 'email' | 'google' | 'facebook';
  role?: 'user' | 'admin';
  token?: string;
}
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
  cancellationDeadline?: string;
  cancellationPolicySnapshot?: string;
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