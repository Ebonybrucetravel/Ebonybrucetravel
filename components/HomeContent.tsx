'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import Hero from '@/components/Hero';
import Partners from '@/components/Partners';
import ExclusiveOffers from '@/components/ExclusiveOffers';
import TrendingDestinations from '@/components/TrendingDestinations';
import HomesGrid from '@/components/HomesGrid';
import CarRentals from '@/components/CarRentals';
import SpecializedServices from '@/components/SpecializedServices';
import type { SearchParams } from '@/lib/types';

interface HomeContentProps {
  activeTab: 'flights' | 'hotels' | 'cars';
}

export default function HomeContent({ activeTab }: HomeContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { search, isSearching } = useSearch();
  const [isHotelSearching, setIsHotelSearching] = useState(false);
  const [isCarSearching, setIsCarSearching] = useState(false);
  const [isTrendingSearching, setIsTrendingSearching] = useState(false);
  const [hasInitialSearch, setHasInitialSearch] = useState(false);

  // Handle search from URL parameters only ONCE when page loads
  useEffect(() => {
    // Prevent running multiple times
    if (hasInitialSearch) return;
    
    const type = searchParams.get('type');
    
    // Only auto-search if we have valid search params and we're on the home page
    if (type && !isSearching && !isHotelSearching && !isCarSearching && !isTrendingSearching) {
      console.log('🔍 Detected search parameters in URL:', Object.fromEntries(searchParams.entries()));
      
      let searchData: SearchParams | null = null;
      
      if (type === 'flights') {
        const origin = searchParams.get('origin');
        const destination = searchParams.get('destination');
        const departureDate = searchParams.get('departureDate');
        const returnDate = searchParams.get('returnDate');
        const tripType = searchParams.get('tripType') as 'round-trip' | 'one-way' || 'round-trip';
        const adults = parseInt(searchParams.get('adults') || '1');
        const children = parseInt(searchParams.get('children') || '0');
        const infants = parseInt(searchParams.get('infants') || '0');
        const cabinClass = searchParams.get('cabinClass') || 'economy';
        
        if (origin && destination && departureDate) {
          searchData = {
            type: 'flights',
            tripType,
            segments: [{ from: origin, to: destination, date: departureDate }],
            passengers: { adults, children, infants },
            cabinClass,
          };
          
          if (tripType === 'round-trip' && returnDate) {
            searchData.returnDate = returnDate;
          }
        }
      } else if (type === 'hotels') {
        const destination = searchParams.get('destination');
        const checkInDate = searchParams.get('checkInDate');
        const checkOutDate = searchParams.get('checkOutDate');
        const guests = parseInt(searchParams.get('guests') || '1');
        
        if (destination && checkInDate && checkOutDate) {
          searchData = {
            type: 'hotels',
            location: destination,
            checkInDate,
            checkOutDate,
            travellers: { adults: guests, children: 0 },
            rooms: 1,
          };
        }
      } else if (type === 'cars') {
        const pickupLocation = searchParams.get('pickupLocation');
        const dropoffLocation = searchParams.get('dropoffLocation');
        const pickupDate = searchParams.get('pickupDate');
        const dropoffDate = searchParams.get('dropoffDate');
        
        if (pickupLocation && dropoffLocation && pickupDate && dropoffDate) {
          searchData = {
            type: 'car-rentals',
            pickupLocationCode: pickupLocation,
            dropoffLocationCode: dropoffLocation,
            pickupDateTime: `${pickupDate}T10:00:00`,
            dropoffDateTime: `${dropoffDate}T10:00:00`,
            passengers: 2,
          };
        }
      }
      
      if (searchData) {
        console.log('🚀 Auto-triggering search from URL params:', searchData);
        setHasInitialSearch(true);
        // Clear the URL parameters to prevent re-triggering
        router.replace('/');
        // Perform the search
        search(searchData).catch(err => console.error('Search failed:', err));
      }
    }
  }, [searchParams, hasInitialSearch]); // Now includes hasInitialSearch dependency

  const handleSearch = async (params: SearchParams) => {
    // Navigate to search page
    router.push('/search');
    // Let the search run in the background so the UI immediately switches to the loading skeleton
    search(params).catch(err => console.error('Search failed:', err));
  };

  const handleTabChange = (tab: 'flights' | 'hotels' | 'cars') => {
    router.push(`/${tab}`);
  };

  // Handler for hotel card clicks with loading state
  const handleHotelSearch = async (searchData: any) => {
    console.log('🏨 Hotel search triggered from card:', searchData);
    setIsHotelSearching(true);
    try {
      router.push('/search');
      await search({
        type: 'hotels',
        location: searchData.location,
        cityCode: searchData.cityCode,
        checkInDate: searchData.checkInDate,
        checkOutDate: searchData.checkOutDate,
        travellers: searchData.travellers,
        rooms: searchData.rooms,
        currency: searchData.currency
      } as SearchParams);
    } catch (error) {
      console.error('Hotel search failed:', error);
    } finally {
      setIsHotelSearching(false);
    }
  };

  // Handler for car card clicks with loading state
  const handleCarSearch = async (carData: any) => {
    console.log('🚗 Car search triggered from card:', carData);
    setIsCarSearching(true);
    
    try {
      const today = new Date();
      const pickupDate = new Date(today);
      pickupDate.setDate(today.getDate() + 7);
      pickupDate.setHours(10, 0, 0, 0);
      
      const dropoffDate = new Date(pickupDate);
      dropoffDate.setHours(pickupDate.getHours() + 6);

      const searchData: SearchParams = {
        type: 'car-rentals',
        pickupLocationCode: carData.pickupLocationCode || carData.pickupCode,
        dropoffLocationCode: carData.dropoffLocationCode || carData.dropoffCode,
        pickupDateTime: pickupDate.toISOString(),
        dropoffDateTime: dropoffDate.toISOString(),
        passengers: 2,
        currency: 'GBP'
      };
      
      console.log('🚗 Sending car search data to API:', searchData);
      router.push('/search');
      await search(searchData);
    } catch (error) {
      console.error('Car search failed:', error);
    } finally {
      setIsCarSearching(false);
    }
  };

  // Handler for trending destinations with loading state
  const handleTrendingSearch = async (city: any) => {
    console.log('📍 Trending destination search triggered:', city);
    setIsTrendingSearching(true);
    try {
      router.push('/search');
      await search({
        type: 'flights',
        segments: [{ from: 'LOS', to: city.code || 'ABV', date: new Date().toISOString().split('T')[0] }],
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: 'economy',
      } as SearchParams);
    } catch (error) {
      console.error('Trending destination search failed:', error);
    } finally {
      setIsTrendingSearching(false);
    }
  };

  return (
    <>
      <Hero
        onSearch={handleSearch}
        loading={isSearching || isHotelSearching || isCarSearching || isTrendingSearching}
        activeSearchTab={activeTab}
        onTabChange={handleTabChange}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-32">
        <Partners />
        <ExclusiveOffers onTypeClick={handleTabChange} />
        <TrendingDestinations
          onCityClick={handleTrendingSearch}
        />
        <HomesGrid onSearch={handleHotelSearch} />
        <CarRentals onSearch={handleCarSearch} />
        <SpecializedServices onServiceClick={(s) => {
          const pathMap: Record<string, string> = {
            'Travel Services': '/services/travel-services',
            'DHL Logistics': '/services/dhl-logistics',
            'Admission Processing': '/services/admission-processing'
          };
          router.push(pathMap[s] || '/services');
        }} />
      </div>

      {/* Global Loading Overlay for better UX */}
      {(isHotelSearching || isCarSearching || isTrendingSearching) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 border-4 border-[#33a8da] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 font-semibold text-lg">
              {isHotelSearching && 'Searching for hotels...'}
              {isCarSearching && 'Searching for cars...'}
              {isTrendingSearching && 'Finding best flights...'}
            </p>
            <p className="text-gray-400 text-sm">Please wait while we find the best options for you</p>
          </div>
        </div>
      )}
    </>
  );
}