// lib/types.ts

export interface SearchSegment {
  from: string;
  to: string;
  date: string;
}

export interface SearchParams {
  type: "flights" | "hotels" | "cars" | "car-rentals";
  tripType?: "round-trip" | "one-way" | "multi-city";
  segments?: SearchSegment[];
  returnDate?: string;
  passengers?:
  | number
  | {
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
  travellers?: number | { adults: number; children: number };
  provider?: string;
  pickUpDate?: string;
  dropOffDate?: string;
  maxConnections?: number;
  // Hotelbeds specific
  occupancies?: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      age: number;
    }>;
  }>;
  language?: string;
  destination?: string;
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
  type?: "flights" | "hotels" | "car-rentals";
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

  // ✅ PRICE FIELDS
  original_amount?: string;
  original_currency?: string;
  markup_percentage?: number;
  markup_amount?: string;
  service_fee?: string;
  final_amount?: string;
  currency?: string;

  // ✅ DISPLAY FIELDS (added for Wakanow/Duffel transformation)
  displayPrice?: string;
  rawPrice?: number;

  // ✅ CUSTOM CALCULATED FIELDS (FOR BOOKING PREVIEW)
  calculatedBasePrice?: number;
  calculatedMarkup?: number;
  calculatedTaxes?: number;
  calculatedTotal?: number;
  selectedRoom?: any;
  roomPrice?: number;

  // ✅ BOOKING DATA
  bookingData?: {
    roomType?: string;
    guests?: number;
    roomPrice?: number;
    serviceFee?: number;
    [key: string]: any;
  };

  // ✅ FLIGHT SPECIFIC FIELDS (Wakanow & Duffel)
  departureAirport?: string;
  arrivalAirport?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureTime?: string;
  arrivalTime?: string;
  airlineName?: string;
  airlineLogo?: string;
  stopCount?: number;
  stopText?: string;
  flightNumber?: string;
  cabin?: string;
  slices?: any[];
  
  // ✅ Wakanow specific fields
  isWakanow?: boolean;
  isWakanowDomestic?: boolean;
  selectData?: string;
  legs?: any[];
  outboundLegs?: any[];
  returnLegs?: any[];
  returnFlight?: any;
  fareRules?: string[];
  penaltyRules?: string[] | null;
  connection_code?: string;
  
  // ✅ Duffel specific fields
  offer_request_id?: string;
  offer_id?: string;
  conditions?: any;
  payment_requirements?: any;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;

  // ✅ HOTEL SPECIFIC FIELDS
  checkInDate?: string;
  checkOutDate?: string;
  rooms?: number;
  guests?: number;
  hotelAddress?: string;
  hotelAmenities?: string[];

  // ✅ CAR RENTAL SPECIFIC FIELDS
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDateTime?: string;
  dropoffDateTime?: string;
  vehicleCode?: string;
  vehicleCategory?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  
  // ✅ Round trip fields
  isRoundTrip?: boolean;
  returnFlightData?: any;
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
  role?: "user" | "admin" | "ADMIN" | "SUPER_ADMIN";
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
  paidAt:
  | {
    value: string;
  }
  | string;
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
  status: "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED";
  paymentStatus: string;
  productType:
  | "FLIGHT_INTERNATIONAL"
  | "FLIGHT_DOMESTIC"
  | "HOTEL"
  | "CAR_RENTAL";
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

  // ✅ TAXES FIELD
  taxes?: number;

  // ✅ ADD THESE MISSING PROPERTIES
  conversionFee?: number;
  conversionPercentage?: number;
  appliedPromo?: {
    code: string;
    discountAmount: number;
    valid?: boolean;
    message?: string;
  };
  formattedDiscountedTotal?: string;

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

    // ✅ PRICE FIELDS IN BOOKINGDATA
    original_amount?: string;
    markup_amount?: string;
    service_fee?: string;
    final_amount?: string;
    taxes?: number;

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
  title?: "mr" | "ms" | "mrs" | "miss" | "dr";
  gender?: "m" | "f";
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
  service: "travel" | "logistics" | "education" | "hotel" | "other" | "";
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
  category?: "general" | "travel" | "logistics" | "education";
}

export interface SocialMediaLink {
  platform: "facebook" | "twitter" | "instagram" | "linkedin";
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

// ✅ HOTELBEDS (HBX) SPECIFIC TYPES
export interface HBXOccupancy {
  rooms: number;
  adults: number;
  children: number;
  paxes?: Array<{
    age: number;
  }>;
}

export interface HBXSearchRequest {
  checkInDate: string;
  checkOutDate: string;
  destinationCode: string;
  occupancies: HBXOccupancy[];
  language?: string;
}

export interface HBXQuoteRequest {
  rateKey: string;
  language?: string;
}

export interface HBXBookRequest {
  rateKey: string;
  totalAmount: number;
  currency: string;
  guests: Array<{
    title: string;
    firstName: string;
    lastName: string;
    roomIdx: number;
  }>;
  policyAccepted: boolean;
  cancellationPolicySnapshot: string;
  cancellationDeadline: string;
}

export interface HBXBookingResponse {
  success: boolean;
  bookingId: string;
  status: string;
  message?: string;
}

export interface HBXQuoteResponse {
  success: boolean;
  hotel: {
    code: number;
    name: string;
    categoryName: string;
    destinationName: string;
    rooms: Array<{
      code: string;
      name: string;
      rates: Array<{
        rateKey: string;
        rateClass: string;
        rateType: string;
        net: string;
        allIncluded: boolean;
        cancellationPolicies: Array<{
          amount: string;
          from: string;
        }>;
        cancellationDeadline?: string;
      }>;
    }>;
  };
}

// ============ WAKANOW (DOMESTIC FLIGHTS) TYPES ============

export interface WakanowAirport {
  AirportCode: string;
  AirportName: string;
  CityCountry: string;
  City: string;
  Country: string;
}

export interface WakanowFlightLeg {
  FlightLegNumber: string;
  DepartureCode: string;
  DepartureName: string;
  DestinationCode: string;
  DestinationName: string;
  StartTime: string;
  EndTime: string;
  Duration: string;
  IsStop: boolean;
  LayerOrder?: string | null;
  LayerDuration?: string;
  BookingClass: string;
  CabinClass: string;
  CabinClassName: string;
  OperatingCarrier: string;
  OperatingCarrierName: string;
  MarketingCarrier: string;
  FlightNumber: string;
  Aircraft: string;
  FareType: string;
  FarebasisCode: string;
}

export interface WakanowRawFlight {
  Name: string;
  Airline: string;
  AirlineName: string;
  DepartureCode: string;
  DepartureName: string;
  DepartureTime: string;
  ArrivalName: string;
  ArrivalCode: string;
  ArrivalTime: string;
  Stops: number;
  StopTime: string;
  TripDuration: string;
  StopCity: string | null;
  FlightLegs: WakanowFlightLeg[];
  AirlineLogoUrl: string;
  FreeBaggage: {
    BagCount: number;
    Weight: number;
    WeightUnit: string | null;
  };
  Price: {
    Amount: number;
    CurrencyCode: string;
  };
  MarketingCarrier: string;
  Adults: number;
  Children: number;
  Infants: number;
  PriceDetails: Array<{
    BaseFare: { Amount: number; CurrencyCode: string };
    Tax: { Amount: number; CurrencyCode: string };
    PassengerType: string;
  }>;
  FareRules: string[];
  PenaltyRules: string[] | null;
  IsRefundable: boolean;
  IncludePaySmallSmall: boolean;
  DownPaymentDetailInPercentage: number;
  PaySmallSmallLockDownPrice: number;
  ConnectionCode: string;
}

export interface WakanowSearchResponse {
  FlightCombination: {
    FlightModels: WakanowRawFlight[];
  };
  SelectData: string;
}

export interface WakanowSelectResponse {
  FlightSummaryModel: {
    FlightCombination: {
      FlightModels: WakanowRawFlight[];
    };
    Price: {
      Amount: number;
      CurrencyCode: string;
    };
    BookingId?: string;
  };
  IsPriceMatched: boolean;
  HasResult: boolean;
  SelectData: string;
  ProductTermsAndConditions?: {
    TermsAndConditions: string[];
  };
}

export interface WakanowPassenger {
  PassengerType: 'Adult' | 'Child' | 'Infant';
  FirstName: string;
  MiddleName?: string;
  LastName: string;
  DateOfBirth: string;
  PhoneNumber: string;
  PassportNumber: string;
  ExpiryDate: string;
  PassportIssuingAuthority: string;
  PassportIssueCountryCode?: string;
  Gender: 'Male' | 'Female';
  Title: 'Mr' | 'Mrs' | 'Miss' | 'Ms' | 'Dr' | 'Prof';
  Email: string;
  Address: string;
  Country: string;
  CountryCode: string;
  City: string;
  PostalCode: string;
}

export interface WakanowBookingRequest {
  PassengerDetails: WakanowPassenger[];
  BookingId: string;
  TargetCurrency: string;
  BookingData: string;
}

export interface WakanowBookingResponse {
  BookingId: string;
  CustomerId: string;
  ProductType: string;
  TargetCurrency: string;
  FlightBookingResult?: {
    PnReferenceNumber: string;
    PnDate: string;
    FlightSummaryModel: any;
    PnStatus?: string;
    TicketStatus?: string;
  };
}

export interface WakanowTicketResponse {
  BookingId: string;
  CustomerId: string;
  ProductType: string;
  FlightBookingSummary: {
    PnReferenceNumber: string;
    PnDate: string;
    FlightSummaryModel: any;
    PnStatus: string;
    TicketStatus: string;
  };
  WalletBalance: {
    Balance: number;
    Currency: string;
  };
  BookingStatusDetails: {
    PnrStatus: string;
    TicketingStatus: string;
    PaymentStatus: string;
    BookingStatus: string;
    Message: string;
  };
}

// Domestic flight search params (simplified for your app)
export interface DomesticFlightSearchParams {
  from: string;
  to: string;
  departureDate: Date;
  returnDate?: Date;
  adults: number;
  children: number;
  infants: number;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  targetCurrency?: string;
}

// Normalized flight output (matches your existing SearchResult structure)
export interface WakanowNormalizedFlight {
  id: string;
  provider: 'wakanow';
  productType: 'FLIGHT_DOMESTIC';
  title: string;
  subtitle: string;
  price: string;
  totalPrice?: string;
  time?: string;
  duration?: string;
  stops: string;
  stopCount?: number;
  stopText: string;
  rating?: number;
  image?: string;
  amenities?: string[];
  features?: string[];
  type: "flights";
  isRefundable?: boolean;
  realData?: any;
  baggage?: string;
  aircraft?: string;
  layoverDetails?: string;
  imageUrl?: string;
  airlineCode: string;
  airlineName?: string;
  airlineLogo?: string;
  flightNumber?: string;
  cabin?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureTime?: string;
  arrivalTime?: string;
  legs: WakanowFlightLeg[];
  selectData?: string;
  original_amount?: string;
  original_currency?: string;
  markup_percentage?: number;
  markup_amount?: string;
  service_fee?: string;
  final_amount?: string;
  currency?: string;
  rawPrice?: number;
  displayPrice?: string;
}