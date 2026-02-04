// /lib/types.ts
export interface SearchSegment {
    from: string;
    to: string;
    date: string;
  }
  
  export interface SearchParams {
    type: "flights" | "hotels" | "car-rentals";
    tripType?: "one-way" | "round-trip" | "multi-city";
    segments?: SearchSegment[];
    travellers?: number;
    cabinClass?: string;
    returnDate?: string;
    location?: string;
    cityCode?: string;
    checkInDate?: string;
    checkOutDate?: string;
    guests?: number;
    adults?: number;
    rooms?: number;
    currency?: string;
    carPickUp?: string;
    pickUpDate?: string;
    dropOffDate?: string;
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
    baggage?: string;
    aircraft?: string;
    layoverDetails?: string;
    image?: string;
    amenities?: string[];
    features?: string[];
    type?: "flights" | "hotels" | "car-rentals";
    realData?: {
      // Flight properties
      offerId?: string;
      hotelId?: string;
      departureTime?: string;
      arrivalTime?: string;
      airline?: string;
      flightNumber?: string;
      totalDuration?: number;
      stops?: number;
      price?: number;
      basePrice?: number;
      currency?: string;
      isRoundTrip?: boolean;
      
      // Hotel properties
      guests?: number;
      rooms?: number;
      nights?: number;
      checkInDate?: string;
      checkOutDate?: string;
      roomType?: string;
      bedType?: string;
      beds?: number;
      isRefundable?: boolean;
      cancellationDeadline?: string;
      cancellationPolicy?: string;
      
      // Generic/extra properties
      slices?: any[];
      offerRequestId?: string;
    };
  }
  
  export interface Booking {
    id: string;
    type: "flight" | "hotel" | "car";
    title: string;
    provider: string;
    subtitle: string;
    date: string;
    duration?: string;
    status: "Confirmed" | "Completed" | "Cancel" | "Active";
    price: string;
    currency: string;
    iconBg: string;
    imageUrl?: string;
    bookingReference?: string;
    time?: string;
    paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
    bookingData?: {
      origin?: string;
      destination?: string;
      departureDate?: string;
      arrivalDate?: string;
      airline?: string;
      flightNumber?: string;
      hotelName?: string;
      hotelId?: string;
      carModel?: string;
      checkInDate?: string;
      checkOutDate?: string;
      pickUpDate?: string;
      dropOffDate?: string;
      guests?: number;
      rooms?: number;
      nights?: number;
    };
  }