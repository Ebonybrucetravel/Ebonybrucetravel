// lib/wakanow.service.ts
// Business logic wrapper for Wakanow API

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
  departureDate: Date;
  returnDate?: Date;
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
  returnFlightDetails?: NormalizedFlight; // For complete return flight object
  combinationPrice?: number;
  outboundLegs?: NormalizedFlightLeg[];
  returnLegs?: NormalizedFlightLeg[];
  selectData?: string;
}

// ADD THESE MISSING INTERFACES
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

export class WakanowService {
  
  async searchDomesticFlights(params: DomesticFlightSearchParams): Promise<{
    flights: WakanowFlight[];
    selectData: string;
    normalizedFlights: NormalizedFlight[];
  }> {
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
          DepartureDate: this.formatDate(params.departureDate),
        },
      ],
    };

    if (params.returnDate) {
      searchParams.Itineraries.push({
        Departure: params.to.toUpperCase(),
        Destination: params.from.toUpperCase(),
        DepartureDate: this.formatDate(params.returnDate),
      });
    }

    const result = await searchWakanowFlights(searchParams);
    
    console.log('Raw Wakanow API response type:', Array.isArray(result) ? 'Array' : typeof result);
    
    // Handle different possible response structures
    const normalizedFlights: NormalizedFlight[] = [];
    let selectData = '';
    
    // The response is an array of combinations (each with outbound + return flights)
    if (Array.isArray(result)) {
      console.log('Response is an array with length:', result.length);
      
      for (const combination of result) {
        const flightCombination = combination.FlightCombination;
        const combinationSelectData = combination.SelectData;
        const flightModels = flightCombination?.FlightModels || [];
        const combinationPrice = flightCombination?.Price?.Amount || 0;
        const combinationCurrency = flightCombination?.Price?.CurrencyCode || 'NGN';
        
        if (flightModels.length === 0) continue;
        
        // First flight in combination is outbound
        const outboundFlight = flightModels[0];
        // Second flight (if exists) is return
        const returnFlight = flightModels[1];
        
        // Normalize outbound flight with its price from the combination
        if (outboundFlight) {
          const normalizedOutbound = this.normalizeFlight(outboundFlight);
          normalizedOutbound.price = {
            amount: combinationPrice,
            currency: combinationCurrency,
          };
          normalizedOutbound.isOutbound = true;
          normalizedOutbound.combinationPrice = combinationPrice;
          normalizedOutbound.selectData = combinationSelectData;
          normalizedOutbound.outboundLegs = normalizedOutbound.legs;
          
          // Add return flight details if it exists
          if (returnFlight) {
            const normalizedReturn = this.normalizeFlight(returnFlight);
            normalizedOutbound.isReturn = true;
            normalizedOutbound.returnFlightDetails = normalizedReturn;
            normalizedOutbound.returnLegs = normalizedReturn.legs;
            // Update departure/arrival to show round trip info
            normalizedOutbound.departure = {
              code: outboundFlight.DepartureCode || '',
              name: outboundFlight.DepartureName || '',
              time: outboundFlight.DepartureTime || '',
            };
            normalizedOutbound.arrival = {
              code: returnFlight.ArrivalCode || '',
              name: returnFlight.ArrivalName || '',
              time: returnFlight.ArrivalTime || '',
            };
            // Update duration to show total trip duration
            normalizedOutbound.duration = this.calculateTotalDuration(outboundFlight, returnFlight);
          }
          
          normalizedFlights.push(normalizedOutbound);
        }
        
        if (combinationSelectData && !selectData) selectData = combinationSelectData;
      }
    }
    
    console.log('Extracted flight combinations count:', normalizedFlights.length);
    
    // Remove duplicates based on outbound flight number + departure time + return flight number
    const uniqueFlights = new Map();
    for (const flight of normalizedFlights) {
      const returnKey = flight.returnFlightDetails?.flightNumber || 'none';
      const key = `${flight.airlineCode}-${flight.flightNumber}-${flight.departure.time}-${returnKey}`;
      if (!uniqueFlights.has(key)) {
        uniqueFlights.set(key, flight);
      }
    }
    
    const uniqueNormalizedFlights = Array.from(uniqueFlights.values());
    console.log('Unique flight combinations count:', uniqueNormalizedFlights.length);
    
    if (uniqueNormalizedFlights[0]) {
      console.log('First normalized flight price:', uniqueNormalizedFlights[0].price);
      console.log('Is return flight:', uniqueNormalizedFlights[0].isReturn);
    }
    
    return {
      flights: [],
      selectData: selectData,
      normalizedFlights: uniqueNormalizedFlights,
    };
  }

  async getFlightDetails(selectData: string, targetCurrency: string = 'NGN'): Promise<FlightDetailsResult> {
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
  }): Promise<WakanowBookingResponse> {
    
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
    });
  }

  async confirmTicket(bookingId: string, pnrNumber: string): Promise<BookingConfirmationResult> {
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
    return await getWakanowAirports();
  }

  private calculateTotalDuration(outboundFlight: WakanowFlight, returnFlight: WakanowFlight): string {
    try {
      // Parse outbound flight times
      const outboundStart = new Date(outboundFlight.DepartureTime);
      const outboundEnd = new Date(outboundFlight.ArrivalTime);
      const outboundDuration = (outboundEnd.getTime() - outboundStart.getTime()) / (1000 * 60);
      
      // Parse return flight times
      const returnStart = new Date(returnFlight.DepartureTime);
      const returnEnd = new Date(returnFlight.ArrivalTime);
      const returnDuration = (returnEnd.getTime() - returnStart.getTime()) / (1000 * 60);
      
      // Calculate days between flights
      const daysBetween = Math.floor((returnStart.getTime() - outboundEnd.getTime()) / (1000 * 60 * 60 * 24));
      
      const totalMinutes = outboundDuration + returnDuration;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      
      let durationString = `${hours}h ${minutes}m flying time`;
      if (daysBetween > 0) {
        durationString += ` (${daysBetween} day${daysBetween > 1 ? 's' : ''} between flights)`;
      }
      
      return durationString;
    } catch (error) {
      return outboundFlight.TripDuration || '';
    }
  }

  normalizeFlight(flight: WakanowFlight): NormalizedFlight {
    // Get airline logo
    let airlineLogo = flight.AirlineLogoUrl || '';
    if (!airlineLogo && flight.Airline) {
      airlineLogo = `https://images.wakanow.com/Images/flight-logos/${flight.Airline}.gif`;
    }
  
    // Format duration - convert HH:MM:SS to readable format
    let durationDisplay = flight.TripDuration || '';
    if (durationDisplay) {
      const parts = durationDisplay.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        if (hours > 0 && minutes > 0) durationDisplay = `${hours}h ${minutes}m`;
        else if (hours > 0) durationDisplay = `${hours}h`;
        else if (minutes > 0) durationDisplay = `${minutes}m`;
      }
    }
  
    // Handle missing or undefined properties
    const legs = flight.FlightLegs && Array.isArray(flight.FlightLegs) 
      ? flight.FlightLegs.map(leg => ({
          number: leg.FlightLegNumber || '',
          from: leg.DepartureCode || '',
          fromName: leg.DepartureName || '',
          to: leg.DestinationCode || '',
          toName: leg.DestinationName || '',
          departureTime: leg.StartTime || '',
          arrivalTime: leg.EndTime || '',
          duration: leg.Duration || '',
          airline: leg.OperatingCarrierName || '',
          flightNumber: leg.FlightNumber || '',
          cabinClass: leg.CabinClassName || '',
          bookingClass: leg.BookingClass || '',
        }))
      : [];
  
    // Generate a unique ID
    const uniqueId = `${flight.Airline || 'UN'}-${flight.Name || 'FLT'}-${flight.DepartureTime || Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
    return {
      id: uniqueId,
      provider: 'wakanow',
      productType: 'FLIGHT_DOMESTIC',
      airline: flight.AirlineName || flight.Airline || 'Unknown Airline',
      airlineCode: flight.Airline || '',
      airlineLogo: airlineLogo,
      flightNumber: flight.Name || '',
      departure: {
        code: flight.DepartureCode || '',
        name: flight.DepartureName || '',
        time: flight.DepartureTime || '',
      },
      arrival: {
        code: flight.ArrivalCode || '',
        name: flight.ArrivalName || '',
        time: flight.ArrivalTime || '',
      },
      duration: durationDisplay,
      stops: flight.Stops || 0,
      stopCity: flight.StopCity || null,
      price: {
        amount: flight.Price?.Amount || 0,
        currency: flight.Price?.CurrencyCode || 'NGN',
      },
      baggage: {
        count: flight.FreeBaggage?.BagCount || 0,
        weight: flight.FreeBaggage?.Weight || 0,
        unit: flight.FreeBaggage?.WeightUnit || null,
      },
      isRefundable: flight.IsRefundable || false,
      fareRules: flight.FareRules || [],
      penaltyRules: flight.PenaltyRules || null,
      legs: legs,
      // Add these optional properties with default values
      isOutbound: false,
      isReturn: false,
      outboundLegs: legs,
      returnLegs: undefined,
      returnFlightDetails: undefined,
      selectData: undefined,
      combinationPrice: undefined,
    };
  }

  private formatDate(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
}

export const wakanowService = new WakanowService();