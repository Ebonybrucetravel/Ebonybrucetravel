'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import FlightDetails from '@/components/FlightDetails';

export default function FlightDetailPage() {
  const router = useRouter();
  const params = useParams();
  const flightId = params.id as string;
  const { selectedItem, searchParams, selectItem, searchResults } = useSearch();
  const [flight, setFlight] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findFlight = async () => {
      console.log('🔍 Looking for flight with ID:', flightId);

      // First, try to find in search results
      if (flightId && searchResults.length > 0) {
        const foundFlight = searchResults.find(f => f.id === flightId);
        if (foundFlight) {
          console.log('✅ Found flight in search results:', {
            id: foundFlight.id,
            provider: foundFlight.provider,
            isWakanow: foundFlight.isWakanow,
            departureAirport: foundFlight.departureAirport,
            arrivalAirport: foundFlight.arrivalAirport,
            departureTime: foundFlight.departureTime,
          });
          setFlight(foundFlight);
          selectItem(foundFlight);
          setIsLoading(false);
          return;
        }
      }

      // If not in search results, try sessionStorage
      const savedFlight = sessionStorage.getItem('selectedFlight');
      if (savedFlight) {
        try {
          const parsed = JSON.parse(savedFlight);
          if (parsed.id === flightId) {
            console.log('✅ Found flight in sessionStorage');
            setFlight(parsed);
            selectItem(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved flight:', e);
        }
      }

      // If we have a selected item from context, use it
      if (selectedItem) {
        console.log('✅ Using selected item from context');
        setFlight(selectedItem);
        setIsLoading(false);
        return;
      }

      // If no flight found
      console.error('❌ Flight not found:', flightId);
      setIsLoading(false);
    };

    findFlight();
  }, [flightId, searchResults, selectedItem, selectItem]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading flight details...</p>
        </div>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Flight Not Found</h1>
        <p className="text-gray-600 mb-8">The flight you're looking for doesn't exist or has expired.</p>
        <button 
          onClick={() => router.push('/search')} 
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c8cb7] transition-colors"
        >
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <FlightDetails
      item={flight}
      searchParams={searchParams}
      onBack={() => {
        sessionStorage.removeItem('selectedFlight');
        router.back();
      }}
      onBook={() => {
        sessionStorage.setItem('selectedBooking', JSON.stringify(flight));
        router.push('/booking/review');
      }}
    />
  );
}