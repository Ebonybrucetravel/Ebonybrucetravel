'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BookingContextType {
  currentBooking: any | null;
  searchResults: any[];
  selectedOffer: any | null;
  hotelSearchResults: any[];
  selectedHotel: any | null;
  isLoading: boolean;
  setCurrentBooking: (booking: any) => void;
  setSearchResults: (results: any[]) => void;
  setSelectedOffer: (offer: any) => void;
  setHotelSearchResults: (results: any[]) => void;
  setSelectedHotel: (hotel: any) => void;
  setIsLoading: (loading: boolean) => void;
  searchFlights: (searchData: any) => Promise<void>;
  fetchOffers: (offerRequestId: string, params?: any) => Promise<void>;
  createBooking: (bookingData: any, isAuthenticated: boolean) => Promise<any>;
  // Hotel methods
  searchHotels: (searchData: any) => Promise<any>;
  createHotelBooking: (bookingData: any, isAuthenticated: boolean) => Promise<any>;
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
  const [hotelSearchResults, setHotelSearchResults] = useState<any[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Flight search (existing)
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

  // Hotel search - Updated with correct endpoint
  const searchHotels = async (searchData: any) => {
    setIsLoading(true);
    try {
      console.log('Searching hotels with data:', searchData);
      
      const response = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/bookings/search/hotels/amadeus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityCode: searchData.cityCode,
          checkInDate: searchData.checkInDate,
          checkOutDate: searchData.checkOutDate,
          adults: searchData.adults || 1, // Default to 1 if not provided
          roomQuantity: searchData.roomQuantity || 1,
          currency: searchData.currency || 'USD',
          bestRateOnly: searchData.bestRateOnly !== false, // Default to true
          // Optional parameters
          radius: searchData.radius,
          radiusUnit: searchData.radiusUnit,
          chainCodes: searchData.chainCodes,
          hotelIds: searchData.hotelIds,
          amenities: searchData.amenities,
          ratings: searchData.ratings,
          priceRange: searchData.priceRange,
          paymentPolicy: searchData.paymentPolicy,
          boardType: searchData.boardType,
          includedCheckOutDate: searchData.includedCheckOutDate,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Hotel search failed:', errorText);
        throw new Error(`Hotel search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Hotel search results:', data);
      setHotelSearchResults(data);
      return data;
    } catch (error) {
      console.error('Hotel search error:', error);
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

  // Flight booking (existing)
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

  // Hotel booking - Updated with correct endpoint
  const createHotelBooking = async (bookingData: any, isAuthenticated: boolean) => {
    setIsLoading(true);
    try {
      console.log('Creating hotel booking with data:', bookingData);
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (isAuthenticated) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
      }

      // Format the booking data according to your API structure
      const formattedBookingData = {
        hotelOfferId: bookingData.hotelOfferId,
        offerPrice: bookingData.offerPrice,
        currency: bookingData.currency || 'USD',
        guests: bookingData.guests || [],
        roomAssociations: bookingData.roomAssociations || [],
        payment: bookingData.payment,
        travelAgentEmail: bookingData.travelAgentEmail,
        accommodationSpecialRequests: bookingData.accommodationSpecialRequests,
      };

      const response = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/bookings/hotels/bookings/amadeus', {
        method: 'POST',
        headers,
        body: JSON.stringify(formattedBookingData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Hotel booking failed:', errorText);
        throw new Error(`Hotel booking failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Hotel booking created:', data);
      setCurrentBooking(data);
      return data;
    } catch (error) {
      console.error('Hotel booking error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentBooking,
    searchResults,
    selectedOffer,
    hotelSearchResults,
    selectedHotel,
    isLoading,
    setCurrentBooking,
    setSearchResults,
    setSelectedOffer,
    setHotelSearchResults,
    setSelectedHotel,
    setIsLoading,
    searchFlights,
    fetchOffers,
    createBooking,
    // Hotel methods
    searchHotels,
    createHotelBooking,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};