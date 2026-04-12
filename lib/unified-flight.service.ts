// lib/unified-flight.service.ts
// Unified service that combines Duffel (international) and Wakanow (domestic)

import { wakanowService, type NormalizedFlight, type DomesticFlightSearchParams, type FlightDetailsResult, type BookingConfirmationResult } from './wakanow.service';
import type { WakanowBookingResponse } from './wakanow-api';

export interface UnifiedSearchParams {
  type: 'domestic' | 'international';
  from: string;
  to: string;
  departureDate: Date;
  returnDate?: Date;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  targetCurrency?: string;
}

export interface UnifiedSearchResult {
  flights: NormalizedFlight[];
  providerData: {
    provider: 'wakanow' | 'duffel';
    selectData?: string;
    offerId?: string;
  };
  searchMetadata: {
    totalFlights: number;
    currency: string;
  };
}

export interface UnifiedBookingParams {
  provider: 'wakanow' | 'duffel';
  selectData?: string;
  bookingId?: string;
  offerId?: string;
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
}

class UnifiedFlightService {
  
  async searchFlights(params: UnifiedSearchParams): Promise<UnifiedSearchResult> {
    if (params.type === 'domestic') {
      const result = await wakanowService.searchDomesticFlights({
        from: params.from,
        to: params.to,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.passengers.adults,
        children: params.passengers.children,
        infants: params.passengers.infants,
        cabinClass: params.cabinClass,
        targetCurrency: params.targetCurrency || 'NGN',
      });
      
      return {
        flights: result.normalizedFlights,
        providerData: {
          provider: 'wakanow',
          selectData: result.selectData,
        },
        searchMetadata: {
          totalFlights: result.flights.length,
          currency: params.targetCurrency || 'NGN',
        },
      };
    } else {
      // TODO: Implement Duffel integration
      throw new Error('International flight service (Duffel) integration pending');
    }
  }
  
  async getFlightDetails(provider: 'wakanow' | 'duffel', providerData: { selectData?: string; offerId?: string }): Promise<FlightDetailsResult | any> {
    if (provider === 'wakanow' && providerData.selectData) {
      return await wakanowService.getFlightDetails(providerData.selectData);
    } else {
      throw new Error('Duffel getOffer not implemented');
    }
  }
  
  async createBooking(params: UnifiedBookingParams): Promise<WakanowBookingResponse | any> {
    if (params.provider === 'wakanow' && params.selectData && params.bookingId) {
      return await wakanowService.createBooking({
        selectData: params.selectData,
        bookingId: params.bookingId,
        passengers: params.passengers,
        targetCurrency: params.targetCurrency,
      });
    } else {
      throw new Error('Duffel createBooking not implemented');
    }
  }
  
  async confirmBooking(
    provider: 'wakanow' | 'duffel',
    bookingId: string,
    pnrNumber?: string
  ): Promise<BookingConfirmationResult | any> {
    if (provider === 'wakanow' && pnrNumber) {
      return await wakanowService.confirmTicket(bookingId, pnrNumber);
    } else {
      throw new Error('Booking confirmation not implemented for this provider');
    }
  }
  
  async getAirports(type: 'domestic' | 'international') {
    if (type === 'domestic') {
      return await wakanowService.getAirports();
    } else {
      // TODO: return await duffelService.getAirports();
      return [];
    }
  }
}

export const unifiedFlightService = new UnifiedFlightService();