'use client';

import React, { useEffect, Suspense } from 'react';
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
    search,
  } = useSearch();

  // Debug - log search results when they arrive
  useEffect(() => {
    console.log('🔍 Search page - search type:', searchParams?.type);
    console.log('🔍 Search page - results count:', searchResults?.length);
    
    // Log first hotel result if any
    if (searchResults && searchResults.length > 0 && searchParams?.type === 'hotels') {
      console.log('🏨 SEARCH PAGE - First hotel in results:', {
        title: searchResults[0]?.title,
        final_amount: (searchResults[0] as any)?.final_amount,
        final_price: (searchResults[0] as any)?.final_price,
        original_amount: (searchResults[0] as any)?.original_amount,
        price: searchResults[0]?.price
      });
    }
  }, [searchResults, searchParams]);

  const handleSelect = (item: any) => {
    console.log('📦 ITEM SELECTED IN SEARCH PAGE:', {
      id: item.id,
      type: item.type,
      title: item.title,
      final_amount: item.final_amount,
      final_price: item.final_price,
      original_amount: item.original_amount,
      currency: item.currency
    });
    
    selectItem(item);
    
    // ✅ FOR HOTELS: Go directly to booking review
    if (item.type === 'hotels') {
      const offerPrice = parseFloat(item.final_amount || item.final_price || '0');
      console.log('🏨 Hotel selected - price check:', {
        final_amount: item.final_amount,
        final_price: item.final_price,
        parsed_offerPrice: offerPrice,
        will_send_to_booking: offerPrice
      });
      
      // Store the complete hotel data in sessionStorage
      const hotelData = {
        ...item,
        offerPrice: offerPrice,
        final_amount: item.final_amount,
        final_price: item.final_price,
        currency: item.currency || 'NGN'
      };
      
      console.log('💾 Storing in sessionStorage:', {
        final_amount: hotelData.final_amount,
        offerPrice: hotelData.offerPrice
      });
      
      sessionStorage.setItem('selectedHotel', JSON.stringify(hotelData));
      router.push('/booking/review');
      return;
    }
    
    // For Wakanow flights
    if (item.isWakanow && (item as any).selectData) {
      console.log('🚀 Wakanow flight - navigating directly to booking review');
      router.push('/booking/review');
      return;
    }
    
    // For other items (flights, cars)
    let route = '/';
    switch (item.type) {
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

  // Handle new search from the compact search box - STAY ON SEARCH PAGE
  const handleNewSearch = async (searchData: any) => {
    console.log('🔄 New search from compact box:', searchData);
    
    try {
      await search(searchData);
      const params = new URLSearchParams();
      params.set('type', searchData.type);
      
      if (searchData.type === 'flights') {
        params.set('tripType', searchData.tripType);
        params.set('origin', searchData.segments[0].from);
        params.set('destination', searchData.segments[0].to);
        params.set('departureDate', searchData.segments[0].date);
        if (searchData.returnDate) params.set('returnDate', searchData.returnDate);
        params.set('adults', searchData.passengers.adults.toString());
        params.set('children', searchData.passengers.children.toString());
        params.set('infants', searchData.passengers.infants.toString());
        if (searchData.cabinClass) params.set('cabinClass', searchData.cabinClass);
      } else if (searchData.type === 'hotels') {
        params.set('location', searchData.location);
        params.set('checkInDate', searchData.checkInDate);
        params.set('checkOutDate', searchData.checkOutDate);
        params.set('guests', searchData.travellers.adults.toString());
      } else if (searchData.type === 'car-rentals') {
        params.set('pickupLocation', searchData.pickupLocationCode);
        params.set('dropoffLocation', searchData.dropoffLocationCode);
        params.set('pickupDate', searchData.pickupDateTime.split('T')[0]);
        params.set('dropoffDate', searchData.dropoffDateTime.split('T')[0]);
      }
      
      window.history.pushState({}, '', `/search?${params.toString()}`);
    } catch (error) {
      console.error('New search failed:', error);
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

  // Show results
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResults
        results={searchResults as any}
        searchParams={searchParams}
        onClear={handleClear}
        onSelect={handleSelect}
        isLoading={isSearching || isLoadingAirlines}
        airlines={airlines}
        onNewSearch={handleNewSearch}
      />
    </Suspense>
  );
}