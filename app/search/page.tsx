'use client';

import React, { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import SearchResults from '@/components/SearchResults';

export default function SearchPage() {
  const router = useRouter();
  const { 
    searchResults, 
    searchParams, 
    isSearching, 
    selectItem, 
    clearSearch,
    airlines,
    isLoadingAirlines,
    searchError,
    searchCompleted
  } = useSearch();

  // Debug to see what's in searchResults
  useEffect(() => {
    console.log('🔍 searchResults from context:', searchResults);
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      console.log('🔍 First item structure:', {
        id: searchResults[0].id,
        type: searchResults[0].type,
        provider: searchResults[0].provider,
        price: searchResults[0].price,
        image: searchResults[0].image,
        hasRealData: !!searchResults[0].realData,
        realDataKeys: searchResults[0].realData ? Object.keys(searchResults[0].realData) : []
      });
    }
  }, [searchResults]);

  // For flights, we need to ensure the data has the right structure for FlightDetails
  // But SearchResults component already handles this, so we just pass through
  const processedResults = useMemo(() => {
    if (!searchResults || !Array.isArray(searchResults)) {
      return [];
    }

    // If it's flights, ensure we have the necessary fields
    if (searchParams?.type === 'flights') {
      return searchResults.map((item: any) => {
        // Check if the item already has the transformed fields
        if (item.departureAirport) {
          return item; // Already transformed
        }

        // If not, try to extract from realData (your context's transformation)
        const realData = item.realData || {};
        const slices = realData.slices || [];
        const firstSlice = slices[0] || {};
        const firstSegment = firstSlice.segments?.[0] || {};
        const lastSegment = firstSlice.segments?.slice(-1)[0] || firstSegment;

        return {
          ...item,
          // Add computed fields that SearchResults expects
          departureAirport: firstSegment.origin?.iata_code || item.realData?.departureAirport || '---',
          arrivalAirport: lastSegment.destination?.iata_code || item.realData?.arrivalAirport || '---',
          departureCity: firstSegment.origin?.city_name || firstSegment.origin?.city?.name || '',
          arrivalCity: lastSegment.destination?.city_name || lastSegment.destination?.city?.name || '',
          departureTime: firstSegment.departing_at || item.realData?.departureTime,
          arrivalTime: lastSegment.arriving_at || item.realData?.arrivalTime,
          airlineCode: item.airlineCode || item.realData?.airlineCode,
          airlineName: item.provider || 'Unknown Airline',
          airlineLogo: item.image,
          stopCount: item.realData?.stops || 0,
          stopText: item.realData?.stops === 0 ? 'Direct' : 
                   item.realData?.stops === 1 ? '1 Stop' : 
                   `${item.realData?.stops || 0} Stops`,
          duration: item.realData?.totalDuration ? 
                   `${Math.floor(item.realData.totalDuration / 60)}h ${item.realData.totalDuration % 60}m` : 
                   item.duration,
          displayPrice: item.price,
          rawPrice: item.realData?.price || parseFloat(item.price?.replace(/[^0-9.]/g, '') || '0'),
          flightNumber: item.realData?.flightNumber,
          cabin: searchParams?.cabinClass,
          baggage: JSON.stringify([
            { type: 'checked', quantity: 1 },
            { type: 'carry_on', quantity: 1 }
          ]),
        };
      });
    }

    // For hotels and car rentals, return as is
    return searchResults;
  }, [searchResults, searchParams?.type]);

  const handleSelect = (item: any) => {
    selectItem(item);
    const routeMap: Record<string, string> = {
      hotels: '/hotels/' + item.id,
      'car-rentals': '/cars/' + item.id,
      flights: '/flights/' + item.id,
    };
    router.push(routeMap[item.type ?? 'flights'] ?? '/flights/' + item.id);
  };

  const handleClear = () => {
    clearSearch();
    router.push('/');
  };

  // Show loading state
  if (isSearching) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#33a8da] mb-6"></div>
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">
          Searching for flights...
        </h3>
        <p className="text-sm text-gray-500 font-medium">
          This may take a few moments
        </p>
      </div>
    );
  }

  // Show error state
  if (searchError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Search Error</h3>
        <p className="text-sm text-gray-500 font-medium mb-6">{searchError}</p>
        <button 
          onClick={handleClear} 
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show no results state
  if (searchCompleted && processedResults.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-gray-900 uppercase mb-2">No Results Found</h3>
        <p className="text-sm text-gray-500 font-medium mb-6">
          We couldn't find any {searchParams?.type} matching your search criteria.
        </p>
        <button 
          onClick={handleClear} 
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
        >
          Start New Search
        </button>
      </div>
    );
  }

  // Show results
  return (
    <SearchResults
      results={processedResults}
      searchParams={searchParams}
      onClear={handleClear}
      onSelect={handleSelect}
      isLoading={isSearching || isLoadingAirlines}
      airlines={airlines}
    />
  );
}