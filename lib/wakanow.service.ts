// lib/wakanow.service.ts
// Business logic wrapper for Wakanow API - UPDATED FOR BACKEND ROUTING

import {
  searchWakanowFlights,
  selectWakanowFlight,
  bookWakanowFlight,
  ticketWakanowPNR,
  getWakanowAirports,
  type WakanowFlight,
  type WakanowPassenger,
  type WakanowFlightSearchParams,
  type WakanowBookingResponse,
  type WakanowTicketResponse,
} from './wakanow-api';

export interface DomesticFlightSearchParams {
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  targetCurrency?: string;
}

export interface NormalizedFlightLeg {
  number: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  airline: string;
  flightNumber: string;
  cabinClass: string;
  bookingClass: string;
}

export interface NormalizedFlight {
  id: string;
  provider: 'wakanow';
  productType: 'FLIGHT_DOMESTIC';
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  flightNumber: string;
  departure: {
    code: string;
    name: string;
    time: string;
  };
  arrival: {
    code: string;
    name: string;
    time: string;
  };
  duration: string;
  stops: number;
  stopCity: string | null;
  price: {
    amount: number;
    currency: string;
  };
  baggage: {
    count: number;
    weight: number;
    unit: string | null;
  };
  isRefundable: boolean;
  fareRules: string[];
  penaltyRules: string[] | null;
  legs: NormalizedFlightLeg[];
  isOutbound?: boolean;
  isReturn?: boolean;
  returnFlight?: NormalizedFlightLeg;
  returnFlightDetails?: NormalizedFlight;
  combinationPrice?: number;
  outboundLegs?: NormalizedFlightLeg[];
  returnLegs?: NormalizedFlightLeg[];
  selectData?: string;
}

export interface FlightDetailsResult {
  flight: WakanowFlight;
  price: { amount: number; currency: string };
  selectData: string;
  bookingId?: string;
  termsAndConditions?: string[];
}

export interface BookingConfirmationResult {
  bookingId: string;
  pnrNumber: string;
  status: string;
  ticketStatus: string;
  walletBalance: { Balance: number; Currency: string };
  bookingStatus: WakanowTicketResponse['BookingStatusDetails'];
}

export interface WakanowSearchResult {
  flights: WakanowFlight[];
  selectData: string;
  normalizedFlights: NormalizedFlight[];
  offers: any[]; // Raw offers from backend
}

export class WakanowService {
  
  async checkBackendHealth(): Promise<boolean> {
    try {
      await getWakanowAirports();
      console.log('✅ Backend connection successful');
      return true;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false;
    }
  }

  async searchDomesticFlights(params: DomesticFlightSearchParams): Promise<WakanowSearchResult> {
    console.log('🔍 Searching flights via backend...', params);
    
    const ticketClassMap = {
      economy: 'Y',
      premium_economy: 'W',
      business: 'C',
      first: 'F',
    };

    const ticketClass = ticketClassMap[params.cabinClass || 'economy'] as 'Y' | 'W' | 'C' | 'F';
    const flightSearchType = params.returnDate ? 'Return' : 'Oneway' as 'Oneway' | 'Return' | 'Multidestination';

    const searchParams: WakanowFlightSearchParams = {
      FlightSearchType: flightSearchType,
      Ticketclass: ticketClass,
      Adults: params.adults,
      Children: params.children,
      Infants: params.infants,
      TargetCurrency: params.targetCurrency || 'NGN',
      Itineraries: [
        {
          Departure: params.from.toUpperCase(),
          Destination: params.to.toUpperCase(),
          DepartureDate: params.departureDate,
        },
      ],
    };

    if (params.returnDate) {
      searchParams.Itineraries.push({
        Departure: params.to.toUpperCase(),
        Destination: params.from.toUpperCase(),
        DepartureDate: params.returnDate,
      });
    }

    const result = await searchWakanowFlights(searchParams);
    
    console.log('📦 Backend response received:', {
      hasOffers: !!(result.offers),
      offersLength: result.offers?.length || 0,
      hasSelectData: !!result.selectData
    });
    
    // Extract the offers array from the response
    const offers = result.offers || [];
    const selectData = result.selectData || '';
    
    console.log(`✅ Returning ${offers.length} raw offers to SearchContext`);
    
    // Return raw offers for SearchContext to transform
    return {
      flights: [],
      selectData: selectData,
      normalizedFlights: [],
      offers: offers,
    };
  }

  async getFlightDetails(selectData: string, targetCurrency: string = 'NGN'): Promise<FlightDetailsResult> {
    console.log('📋 Getting flight details via backend...');
    
    const result = await selectWakanowFlight(selectData, targetCurrency);
    
    let flight: WakanowFlight;
    let price = { amount: 0, currency: targetCurrency };
    let bookingId: string | undefined;
    
    if (result.FlightSummaryModel && result.FlightSummaryModel.FlightCombination) {
      flight = result.FlightSummaryModel.FlightCombination.FlightModels[0];
      price = {
        amount: result.FlightSummaryModel.Price?.Amount || 0,
        currency: result.FlightSummaryModel.Price?.CurrencyCode || targetCurrency,
      };
      bookingId = result.FlightSummaryModel.BookingId;
    } 
    else if (result.FlightModels && Array.isArray(result.FlightModels)) {
      flight = result.FlightModels[0];
      if (result.Price) {
        price = {
          amount: result.Price.Amount || 0,
          currency: result.Price.CurrencyCode || targetCurrency,
        };
      }
    }
    else {
      throw new Error('Unable to parse flight details response');
    }
    
    return {
      flight,
      price,
      selectData: result.SelectData || selectData,
      bookingId: bookingId || result.BookingId,
      termsAndConditions: result.ProductTermsAndConditions?.TermsAndConditions,
    };
  }

  async createBooking(params: {
    selectData: string;
    bookingId: string;
    passengers: Array<{
      type: 'adult' | 'child' | 'infant';
      firstName: string;
      lastName: string;
      middleName?: string;
      dateOfBirth: Date;
      gender: 'male' | 'female';
      title: string;
      email: string;
      phone: string;
      passportNumber: string;
      passportExpiry: Date;
      passportIssuingAuthority: string;
      address: string;
      city: string;
      country: string;
      countryCode: string;
      postalCode: string;
    }>;
    targetCurrency?: string;
    authToken?: string;
  }): Promise<WakanowBookingResponse> {
    
    console.log('📝 Creating booking via backend...', { bookingId: params.bookingId });
    
    const passengerDetails: WakanowPassenger[] = params.passengers.map(p => ({
      PassengerType: p.type === 'adult' ? 'Adult' : p.type === 'child' ? 'Child' : 'Infant',
      FirstName: p.firstName,
      MiddleName: p.middleName || '',
      LastName: p.lastName,
      DateOfBirth: p.dateOfBirth.toISOString(),
      PhoneNumber: p.phone,
      PassportNumber: p.passportNumber,
      ExpiryDate: p.passportExpiry.toISOString(),
      PassportIssuingAuthority: p.passportIssuingAuthority,
      Gender: p.gender === 'male' ? 'Male' : 'Female',
      Title: p.title as any,
      Email: p.email,
      Address: p.address,
      Country: p.country,
      CountryCode: p.countryCode,
      City: p.city,
      PostalCode: p.postalCode,
    }));

    return await bookWakanowFlight({
      PassengerDetails: passengerDetails,
      BookingId: params.bookingId,
      TargetCurrency: params.targetCurrency || 'NGN',
      BookingData: params.selectData,
    }, params.authToken);
  }

  async confirmTicket(bookingId: string, pnrNumber: string): Promise<BookingConfirmationResult> {
    console.log('🎫 Confirming ticket via backend...', { bookingId, pnrNumber });
    
    const result = await ticketWakanowPNR(bookingId, pnrNumber);
    
    return {
      bookingId: result.BookingId,
      pnrNumber: result.FlightBookingSummary.PnReferenceNumber,
      status: result.FlightBookingSummary.PnStatus,
      ticketStatus: result.FlightBookingSummary.TicketStatus,
      walletBalance: result.WalletBalance,
      bookingStatus: result.BookingStatusDetails,
    };
  }

  async getAirports() {
    console.log('🛫 Fetching airports via backend...');
    return await getWakanowAirports();
  }

  async getWalletBalance(authToken?: string) {
    console.log('💰 Getting wallet balance via backend...');
    const { getWakanowWalletBalance } = await import('./wakanow-api');
    return await getWakanowWalletBalance(authToken);
  }
}

export const wakanowService = new WakanowService();