// lib/types.ts

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
  roomQuantity?: number; 
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
  // Allow any additional properties for flexibility
  [key: string]: any;
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
  airlineCode?: string;
  owner?: {
    id?: string;
    name?: string;
    iata_code?: string;
    logo_symbol_url?: string;
  };
}

export interface User {
  id?: string;
  name: string;
  email: string;
  image?: string;
  profilePicture?: string;
  avatar?: string;
  dob?: string;
  dateOfBirth?: string;  
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
  token?: string;
  isVerified?: boolean;
}



export interface HotelProviderData {
  hotelBookings?: Array<{
    hotelOffer?: {
      checkInDate?: string;
      checkOutDate?: string;
      room?: {
        type?: string;
        description?: { text?: string };
      };
      guests?: { adults?: number };
      price?: {
        base?: string;
        total?: string;
        currency?: string;
        taxes?: Array<{
          code?: string;
          amount?: string;
          currency?: string;
        }>;
      };
      policies?: {
        cancellations?: Array<{
          deadline?: string;
          amount?: string;
        }>;
      };
    };
    hotel?: {
      name?: string;
      hotelId?: string;
      chainCode?: string;
    };
    guests?: Array<{
      name?: {
        title?: string;
        firstName?: string;
        lastName?: string;
      };
      contact?: {
        email?: string;
        phone?: string;
      };
    }>;
    bookingStatus?: string;
    hotelProviderInformation?: Array<{
      confirmationNumber?: string;
    }>;
  }>;
  orderCreationError?: string;
}

export interface CarRentalProviderData {
  orderCreationError?: string;
  orderCreationFailedAt?: string;
}

export interface PaymentInfo {
  amount: number;
  paidAt: {
    value: string;
  } | string;
  status: string;
  chargeId: string;
  currency: string;
  verified: boolean;
  paymentIntentId: string;
}


export interface Booking {
  id: string;
  reference: string;
  userId?: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  paymentStatus: string;
  productType: 'FLIGHT_INTERNATIONAL' | 'FLIGHT_DOMESTIC' | 'HOTEL' | 'CAR_RENTAL';
  provider: string;
  providerBookingId?: string | null;
  providerData?: any;
  basePrice: number;
  markupAmount?: number;
  serviceFee?: number;
  totalAmount: number;
  currency: string;
  cancellationDeadline?: string | null;
  cancellationPolicySnapshot?: string | null;
  bookingData: {
    // Flight fields
    origin?: string;
    airline?: string;
    destination?: string;
    flightNumber?: string;
    departureDate?: string;
    cabinClass?: string;
    passengers?: number | { adults: number; infants: number; children: number };
    
    // Hotel fields
    guests?: number;
    rooms?: number;
    checkInDate?: string;
    checkOutDate?: string;
    location?: string;
    hotelName?: string;
    hotelId?: string;
    
    // Car rental fields
    vehicleType?: string;
    pickupDateTime?: string;
    dropoffDateTime?: string;
    pickupLocationCode?: string;
    dropoffLocationCode?: string;
    
    // Common fields
    offerId?: string;
    [key: string]: any;
  };
  passengerInfo: PassengerInfo;
  voucherId?: string;
  voucherCode?: string;
  voucherDiscount?: number;
  finalAmount?: number;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  paymentReference?: string;
  paymentInfo?: PaymentInfo;
  stripeChargeId?: string;
}

export interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title?: 'mr' | 'ms' | 'mrs' | 'miss' | 'dr';
  gender?: 'm' | 'f';
  dateOfBirth?: string;
  born_on?: string;
  guests?: Array<{
    name?: {
      title?: string;
      firstName?: string;
      lastName?: string;
    };
    contact?: {
      email?: string;
      phone?: string;
    };
    travelerId?: number;
  }>;
}


export interface ContentSection {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  highlight?: boolean;
}

export interface PageContent {
  title: string;
  subtitle: string;
  image: string;
  sections: ContentSection[];
}

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  service: 'travel' | 'logistics' | 'education' | 'hotel' | 'other' | '';
  message: string;
}

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  isClosed?: boolean;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    state: string;
    zip: string;
  };
  emergency: string;
  hours: {
    weekday: BusinessHours;
    saturday: BusinessHours;
    sunday: BusinessHours;
  };
}

export interface FAQ {
  question: string;
  answer: string;
  category?: 'general' | 'travel' | 'logistics' | 'education';
}

export interface SocialMediaLink {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin';
  url: string;
}

// Service Page Types
export interface ServiceSector {
  id: number;
  title: string;
  description: string;
  icon: string;
  image: string;
  features?: string[];
}

export interface CoreValue {
  icon: string;
  title: string;
  description: string;
}

export interface WhyChooseUsItem {
  icon: string;
  title: string;
  body: string;
  image: string;
}

export interface StatItem {
  number: string;
  label: string;
}

export interface TeamMember {
  name: string;
  position: string;
  image: string;
  bio?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
  };
}

export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
}