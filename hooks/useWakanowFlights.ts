// hooks/useWakanowFlights.ts
// React hook for Wakanow domestic flight operations

import { useState, useCallback } from 'react';
import { wakanowService } from '../lib/wakanow.service';
import type { 
  DomesticFlightSearchParams, 
  NormalizedFlight, 
  FlightDetailsResult,
  BookingConfirmationResult 
} from '../lib/wakanow.service';
import type { WakanowFlight, WakanowBookingResponse } from '../lib/wakanow-api';

interface SearchFlightsResult {
  flights: WakanowFlight[];
  selectData: string;
  normalizedFlights: NormalizedFlight[];
}

interface UseWakanowFlightsReturn {
  // State
  loading: boolean;
  error: string | null;
  flights: WakanowFlight[];
  normalizedFlights: NormalizedFlight[];
  selectData: string | null;
  bookingResult: WakanowBookingResponse | null;
  
  // Actions
  searchFlights: (params: DomesticFlightSearchParams) => Promise<SearchFlightsResult>;
  getFlightDetails: (selectData: string) => Promise<FlightDetailsResult>;
  createBooking: (params: {
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
  }) => Promise<WakanowBookingResponse>;
  confirmTicket: (bookingId: string, pnrNumber: string) => Promise<BookingConfirmationResult>;
  clearError: () => void;
  reset: () => void;
}

export function useWakanowFlights(): UseWakanowFlightsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flights, setFlights] = useState<WakanowFlight[]>([]);
  const [normalizedFlights, setNormalizedFlights] = useState<NormalizedFlight[]>([]);
  const [selectData, setSelectData] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<WakanowBookingResponse | null>(null);

  const clearError = useCallback(() => setError(null), []);
  
  const reset = useCallback(() => {
    setFlights([]);
    setNormalizedFlights([]);
    setSelectData(null);
    setBookingResult(null);
    setError(null);
  }, []);

  const searchFlights = useCallback(async (params: DomesticFlightSearchParams): Promise<SearchFlightsResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await wakanowService.searchDomesticFlights(params);
      setFlights(result.flights);
      setNormalizedFlights(result.normalizedFlights);
      setSelectData(result.selectData);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Flight search failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFlightDetails = useCallback(async (selectDataParam: string): Promise<FlightDetailsResult> => {
    setLoading(true);
    setError(null);
    
    try {
      return await wakanowService.getFlightDetails(selectDataParam);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get flight details';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBooking = useCallback(async (params: {
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
  }): Promise<WakanowBookingResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await wakanowService.createBooking(params);
      setBookingResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Booking failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmTicket = useCallback(async (bookingId: string, pnrNumber: string): Promise<BookingConfirmationResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await wakanowService.confirmTicket(bookingId, pnrNumber);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ticket confirmation failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    flights,
    normalizedFlights,
    selectData,
    bookingResult,
    searchFlights,
    getFlightDetails,
    createBooking,
    confirmTicket,
    clearError,
    reset,
  };
}