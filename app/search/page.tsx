'use client';

import React from 'react';
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
          Searching...
        </h3>
        <p className="text-sm text-gray-500 font-medium">
          Finding the best options for you
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

  // Show no results state (only when search completed and no results)
  if (searchCompleted && searchResults.length === 0) {
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
      results={searchResults}
      searchParams={searchParams}
      onClear={handleClear}
      onSelect={handleSelect}
      isLoading={isSearching || isLoadingAirlines}
      airlines={airlines}
    />
  );
}