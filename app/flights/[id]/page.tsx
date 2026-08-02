'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import FlightDetails from '@/components/FlightDetails';
import { selectWakanowFlight } from '@/lib/wakanow-api';
import toast from 'react-hot-toast';

export default function FlightDetailPage() {
  const router = useRouter();
  const params = useParams();
  const flightId = params.id as string;
  const { selectedItem, searchParams, selectItem, searchResults } = useSearch();
  const [flight, setFlight] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingWakanowData, setIsFetchingWakanowData] = useState(false);
  
  const hasFetchedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const findFlight = async () => {
      if (hasFetchedRef.current) {
        console.log('⏭️ Already fetched, skipping');
        return;
      }
      
      console.log('🔍 Looking for flight with ID:', flightId);

      // ✅ FIRST: Check sessionStorage for pre-fetched data (from handleViewDetails)
      const savedFlightDetails = sessionStorage.getItem('selectedFlightDetails');
      if (savedFlightDetails) {
        try {
          const parsed = JSON.parse(savedFlightDetails);
          if (parsed.id === flightId) {
            console.log('✅ Found pre-fetched flight data in sessionStorage - USING THIS!');
            console.log('✅ Has slices:', !!parsed.slices, 'slices length:', parsed.slices?.length);
            console.log('✅ Has baggage:', !!parsed.freeBaggage);
            console.log('✅ Has fare_rules:', parsed.fare_rules?.length);
            
            if (isMountedRef.current) {
              setFlight(parsed);
              selectItem(parsed);
              setIsLoading(false);
            }
            hasFetchedRef.current = true;
            // ✅ Don't clear here - keep for component
            return;
          } else {
            console.log('⚠️ Saved flight ID mismatch:', parsed.id, 'vs', flightId);
          }
        } catch (e) {
          console.error('Failed to parse saved flight details:', e);
        }
      }

      // ✅ SECOND: If not in sessionStorage, try search results
      let foundFlight = null;
      if (flightId && searchResults.length > 0) {
        foundFlight = searchResults.find(f => f.id === flightId);
        if (foundFlight) {
          console.log('✅ Found flight in search results (fallback)');
        }
      }

      // ✅ THIRD: If not in search results, try sessionStorage (fallback)
      if (!foundFlight) {
        const savedFlight = sessionStorage.getItem('selectedFlight');
        if (savedFlight) {
          try {
            const parsed = JSON.parse(savedFlight);
            if (parsed.id === flightId) {
              foundFlight = parsed;
              console.log('✅ Found flight in sessionStorage (fallback)');
            }
          } catch (e) {
            console.error('Failed to parse saved flight:', e);
          }
        }
      }

      // ✅ FOURTH: If we have a selected item from context, use it
      if (!foundFlight && selectedItem) {
        foundFlight = selectedItem;
        console.log('✅ Using selected item from context');
      }

      if (foundFlight) {
        if (isMountedRef.current) {
          setFlight(foundFlight);
          selectItem(foundFlight);
          setIsLoading(false);
        }
        hasFetchedRef.current = true;
        
        // ✅ ONLY fetch Wakanow data if it's a Wakanow flight AND we don't have it already
        if (foundFlight.isWakanow && foundFlight.selectData) {
          if (foundFlight._wakanowData || foundFlight.fare_rules?.length > 0) {
            console.log('✅ Already have Wakanow data, skipping fetch');
          } else {
            await fetchWakanowData(foundFlight);
          }
        } else {
          console.log('⏭️ Not a Wakanow flight (Duffel or other), skipping fetch');
        }
        return;
      }

      console.error('❌ Flight not found:', flightId);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      hasFetchedRef.current = true;
    };

    findFlight();
  }, [flightId]); // ✅ Only depend on flightId

  const fetchWakanowData = async (flightData: any) => {
    if (isFetchingWakanowData) return;
    
    if (flightData._wakanowData || flightData.fare_rules?.length > 0) {
      console.log('✅ Already have enriched Wakanow data, skipping fetch');
      return;
    }
    
    setIsFetchingWakanowData(true);
    
    try {
      console.log('🔄 Fetching Wakanow data for flight details...');
      toast.loading('Loading flight details...', { id: 'wakanow-fetch' });
      
      const result = await selectWakanowFlight(flightData.selectData, 'NGN');
      const responseData = result?.data;
      
      if (responseData) {
        console.log('✅ Received Wakanow data');
        
        const flightSummary = responseData.flight_summary;
        
        const enrichedFlight = {
          ...flightData,
          bookingId: responseData.booking_id || flightData.id,
          selectData: responseData.select_data || flightData.selectData,
          slices: flightSummary?.slices || flightData.slices,
          flight_summary: flightSummary,
          freeBaggage: flightSummary?.slices?.[0]?.freeBaggage || 
                       flightSummary?.slices?.[0]?.segments?.[0]?.freeBaggage ||
                       flightData.freeBaggage ||
                       null,
          isRefundable: flightSummary?.isRefundable || flightData.isRefundable || false,
          fare_rules: responseData.fare_rules || [],
          penalty_rules: responseData.penalty_rules || [],
          terms_and_conditions: responseData.terms_and_conditions || null,
          _wakanowData: responseData,
          _isRealData: true,
        };
        
        if (isMountedRef.current) {
          setFlight(enrichedFlight);
          sessionStorage.setItem('selectedFlight', JSON.stringify(enrichedFlight));
          selectItem(enrichedFlight);
        }
        
        toast.success('Flight details loaded!', { id: 'wakanow-fetch' });
      } else {
        console.warn('⚠️ No response data from Wakanow API');
        toast.error('Could not load full flight details', { id: 'wakanow-fetch' });
      }
    } catch (error) {
      console.error('❌ Failed to fetch Wakanow data:', error);
      toast.error('Could not load full flight details', { id: 'wakanow-fetch' });
    } finally {
      if (isMountedRef.current) {
        setIsFetchingWakanowData(false);
      }
    }
  };

  if (isLoading || isFetchingWakanowData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">
            {isFetchingWakanowData ? 'Loading flight details...' : 'Searching for flight...'}
          </p>
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
        sessionStorage.removeItem('selectedFlightDetails');
        router.back();
      }}
      onBook={() => {
        sessionStorage.setItem('selectedBooking', JSON.stringify(flight));
        router.push('/booking/review');
      }}
    />
  );
}