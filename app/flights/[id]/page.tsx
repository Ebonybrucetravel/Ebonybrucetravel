'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import FlightDetails from '@/components/FlightDetails';
import { selectWakanowFlight } from '@/lib/wakanow-api';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

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

  const brandColors = {
    primary: '#33a8da',
    primaryDark: '#2c98c7',
    primaryLight: '#e8f4fa',
    background: '#f8fafc',
    text: '#1a1a2e',
    textSecondary: '#6b7280',
  };

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

      const savedFlightDetails = sessionStorage.getItem('selectedFlightDetails');
      if (savedFlightDetails) {
        try {
          const parsed = JSON.parse(savedFlightDetails);
          if (parsed.id === flightId) {
            console.log('✅ Found pre-fetched flight data in sessionStorage');
            
            if (isMountedRef.current) {
              setFlight(parsed);
              selectItem(parsed);
              setIsLoading(false);
            }
            hasFetchedRef.current = true;
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved flight details:', e);
        }
      }

      let foundFlight = null;
      if (flightId && searchResults.length > 0) {
        foundFlight = searchResults.find(f => f.id === flightId);
        if (foundFlight) {
          console.log('✅ Found flight in search results');
        }
      }

      if (!foundFlight) {
        const savedFlight = sessionStorage.getItem('selectedFlight');
        if (savedFlight) {
          try {
            const parsed = JSON.parse(savedFlight);
            if (parsed.id === flightId) {
              foundFlight = parsed;
              console.log('✅ Found flight in sessionStorage');
            }
          } catch (e) {
            console.error('Failed to parse saved flight:', e);
          }
        }
      }

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
        
        if (foundFlight.isWakanow && foundFlight.selectData) {
          if (!foundFlight._wakanowData && !foundFlight.fare_rules?.length) {
            await fetchWakanowData(foundFlight);
          }
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
  }, [flightId]);

  const fetchWakanowData = async (flightData: any) => {
    if (isFetchingWakanowData) return;
    
    if (flightData._wakanowData || flightData.fare_rules?.length > 0) {
      console.log('✅ Already have enriched Wakanow data');
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      sessionStorage.removeItem('selectedFlight');
      sessionStorage.removeItem('selectedFlightDetails');
      router.back();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sessionStorage.removeItem('selectedFlight');
        sessionStorage.removeItem('selectedFlightDetails');
        router.back();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [router]);


  if (isLoading || isFetchingWakanowData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="bg-white rounded-2xl p-12 shadow-2xl text-center max-w-md w-full backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-black text-gray-900">
            {isFetchingWakanowData ? 'Loading Flight Details' : 'Searching for Flight'}
          </h3>
          <p className="text-sm text-gray-500 font-medium mt-2">
            {isFetchingWakanowData ? 'Please wait while we fetch the latest information...' : 'Looking for your flight...'}
          </p>
        </div>
      </div>
    );
  }


  if (!flight) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="bg-white rounded-2xl p-12 shadow-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-yellow-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900">Flight Not Found</h3>
          <p className="text-sm text-gray-500 font-medium mb-6">The flight you're looking for doesn't exist or has expired.</p>
          <button 
            onClick={() => router.push('/search')} 
            className="px-6 py-3 text-white font-bold rounded-lg transition hover:shadow-lg active:scale-95 w-full"
            style={{ backgroundColor: brandColors.primary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = brandColors.primaryDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = brandColors.primary;
            }}
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

 
  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleOverlayClick}
    >
      
      <div className="fixed inset-0 backdrop-blur-sm pointer-events-none"></div>
    
      <div className="relative z-10 min-h-screen flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-300">
         
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
            isOverlay={true}
          />
        </div>
      </div>
    </div>
  );
}