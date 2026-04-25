'use client';

import React, { useEffect } from 'react';
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
    searchCompleted,
    search // Add this from your context if available
  } = useSearch();

  // Debug only - remove in production
  useEffect(() => {
    console.log('🔍 Search page - search type:', searchParams?.type);
    console.log('🔍 Search page - results count:', searchResults?.length);
  }, [searchResults, searchParams]);

  const handleSelect = (item: any) => {
    selectItem(item);
    
    // Determine the route based on item type
    let route = '/';
    switch (item.type) {
      case 'hotels':
        route = `/hotels/${item.id}`;
        break;
      case 'car-rentals':
        route = `/cars/${item.id}`;
        break;
      case 'flights':
      default:
        route = `/flights/${item.id}`;
        break;
    }
    
    router.push(route);
  };

  const handleClear = () => {
    clearSearch();
    router.push('/');
  };

  // Handle new search from the compact search box
  const handleNewSearch = async (searchData: any) => {
    console.log('🔄 New search from compact box:', searchData);
    
    // If your context has a search function, use it
    if (typeof search === 'function') {
      await search(searchData);
    } else {
      // Otherwise, you need to implement the search here
      // This would typically call your API and update the context
      console.warn('Search function not available in context');
      
      // Alternative: navigate to home page with search params
      const params = new URLSearchParams();
      params.set('type', searchData.type);
      
      if (searchData.type === 'flights') {
        params.set('tripType', searchData.tripType);
        params.set('segments', JSON.stringify(searchData.segments));
        if (searchData.returnDate) params.set('returnDate', searchData.returnDate);
        params.set('passengers', JSON.stringify(searchData.passengers));
        if (searchData.cabinClass) params.set('cabinClass', searchData.cabinClass);
      } else if (searchData.type === 'hotels') {
        params.set('location', searchData.location);
        if (searchData.cityCode) params.set('cityCode', searchData.cityCode);
        params.set('checkInDate', searchData.checkInDate);
        params.set('checkOutDate', searchData.checkOutDate);
        params.set('travellers', JSON.stringify(searchData.travellers));
        params.set('rooms', searchData.rooms.toString());
      } else if (searchData.type === 'car-rentals') {
        params.set('pickupLocationCode', searchData.pickupLocationCode);
        params.set('dropoffLocationCode', searchData.dropoffLocationCode);
        params.set('pickupDateTime', searchData.pickupDateTime);
        params.set('dropoffDateTime', searchData.dropoffDateTime);
        params.set('passengers', searchData.passengers.toString());
      }
      
      router.push(`/?${params.toString()}`);
    }
  };

  // Show full page loading state only when we don't have any results yet
  if (isSearching && (!searchResults || searchResults.length === 0)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#33a8da] mb-6"></div>
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">
          Searching for {searchParams?.type?.replace('-', ' ') || 'travel options'}...
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  if (searchCompleted && (!searchResults || searchResults.length === 0)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-gray-900 uppercase mb-2">No Results Found</h3>
        <p className="text-sm text-gray-500 font-medium mb-6">
          We couldn't find any {searchParams?.type?.replace('-', ' ') || 'travel options'} matching your search criteria.
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

  // Show results - pass raw searchResults, let SearchResults handle all transformations
  return (
    <SearchResults
      results={searchResults || []}
      searchParams={searchParams}
      onClear={handleClear}
      onSelect={handleSelect}
      isLoading={isSearching || isLoadingAirlines}
      airlines={airlines}
      onNewSearch={handleNewSearch}  // ← ADD THIS LINE
    />
  );
}