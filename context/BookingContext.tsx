'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BookingContextType {
  currentBooking: any | null;
  searchResults: any[];
  selectedOffer: any | null;
  isLoading: boolean;
  setCurrentBooking: (booking: any) => void;
  setSearchResults: (results: any[]) => void;
  setSelectedOffer: (offer: any) => void;
  setIsLoading: (loading: boolean) => void;
  searchFlights: (searchData: any) => Promise<void>;
  fetchOffers: (offerRequestId: string, params?: any) => Promise<void>;
  createBooking: (bookingData: any, isAuthenticated: boolean) => Promise<any>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
};

interface BookingProviderProps {
  children: ReactNode;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({ children }) => {
  const [currentBooking, setCurrentBooking] = useState<any | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const searchFlights = async (searchData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/bookings/search/flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOffers = async (offerRequestId: string, params?: any) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        offer_request_id: offerRequestId,
        limit: '20',
        ...params,
      });

      const response = await fetch(`https://ebony-bruce-production.up.railway.app/api/v1/bookings/offers?${queryParams}`);

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Fetch offers error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createBooking = async (bookingData: any, isAuthenticated: boolean) => {
    setIsLoading(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (isAuthenticated) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
      }

      const response = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error('Booking failed');
      }

      const data = await response.json();
      setCurrentBooking(data);
      return data;
    } catch (error) {
      console.error('Booking error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentBooking,
    searchResults,
    selectedOffer,
    isLoading,
    setCurrentBooking,
    setSearchResults,
    setSelectedOffer,
    setIsLoading,
    searchFlights,
    fetchOffers,
    createBooking,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};