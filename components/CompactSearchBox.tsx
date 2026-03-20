'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { airports as airportData } from '../lib/airportData';

interface CompactSearchBoxProps {
  onSearch: (data: any) => void;
  loading: boolean;
  activeTab: 'flights' | 'hotels' | 'cars';
  initialParams?: any;
}

interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  type: 'airport' | 'city';
}

interface HotelDestination {
  name: string;
  city: string;
  country: string;
  cityCode: string;
}

const CompactSearchBox: React.FC<CompactSearchBoxProps> = ({
  onSearch,
  loading,
  activeTab,
  initialParams,
}) => {
  const { t } = useLanguage();
  
  // Refs for dropdowns
  const flightFromRef = useRef<HTMLDivElement>(null);
  const flightToRef = useRef<HTMLDivElement>(null);
  const hotelLocationRef = useRef<HTMLDivElement>(null);
  const carPickupRef = useRef<HTMLDivElement>(null);
  const carDropoffRef = useRef<HTMLDivElement>(null);
  
  // Flight states
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<'round-trip' | 'one-way'>('round-trip');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<Airport[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Airport[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Hotel states
  const [hotelLocation, setHotelLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);
  const [hotelSuggestions, setHotelSuggestions] = useState<HotelDestination[]>([]);
  const [loadingHotelSuggestions, setLoadingHotelSuggestions] = useState(false);
  
  // Car states
  const [carPickup, setCarPickup] = useState('');
  const [carDropoff, setCarDropoff] = useState('');
  const [carPickupDate, setCarPickupDate] = useState('');
  const [carDropoffDate, setCarDropoffDate] = useState('');
  const [showCarPickupDropdown, setShowCarPickupDropdown] = useState(false);
  const [showCarDropoffDropdown, setShowCarDropoffDropdown] = useState(false);
  const [carPickupSuggestions, setCarPickupSuggestions] = useState<Airport[]>([]);
  const [carDropoffSuggestions, setCarDropoffSuggestions] = useState<Airport[]>([]);
  const [loadingCarSuggestions, setLoadingCarSuggestions] = useState(false);

  // Popular airports for suggestions
  const popularAirports: Airport[] = [
    { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', type: 'airport' },
    { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', type: 'airport' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', type: 'airport' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', type: 'airport' },
    { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', type: 'airport' },
    { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', type: 'airport' },
    { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', type: 'airport' },
  ];

  const popularHotelDestinations: HotelDestination[] = [
    { name: 'Lagos', city: 'Lagos', country: 'Nigeria', cityCode: 'LOS' },
    { name: 'London', city: 'London', country: 'United Kingdom', cityCode: 'LON' },
    { name: 'New York', city: 'New York', country: 'USA', cityCode: 'NYC' },
    { name: 'Dubai', city: 'Dubai', country: 'UAE', cityCode: 'DXB' },
    { name: 'Paris', city: 'Paris', country: 'France', cityCode: 'PAR' },
    { name: 'Tokyo', city: 'Tokyo', country: 'Japan', cityCode: 'TYO' },
    { name: 'Singapore', city: 'Singapore', country: 'Singapore', cityCode: 'SIN' },
  ];

  // Extract airport code from display value
  const extractCode = (displayValue: string): string => {
    if (!displayValue) return '';
    if (/^[A-Z]{3}$/.test(displayValue.trim())) {
      return displayValue.trim();
    }
    const match = displayValue.match(/^([A-Z]{3})\s*-\s*/);
    if (match) return match[1];
    const anyCode = displayValue.match(/\b([A-Z]{3})\b/);
    return anyCode ? anyCode[1] : displayValue;
  };

  // Fetch airport suggestions
  const fetchAirportSuggestions = useCallback(async (query: string): Promise<Airport[]> => {
    if (!query || query.length < 2) {
      return popularAirports.slice(0, 8);
    }

    try {
      setLoadingSuggestions(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ebony-bruce-production.up.railway.app'}/api/v1/bookings/flights/places/suggestions?query=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const suggestions: Airport[] = result.data
            .map((place: any) => ({
              code: place.iata_code || place.code || '',
              name: place.name || '',
              city: place.city_name || place.city || place.name || '',
              country: place.country_name || place.country || '',
              type: place.type === 'city' ? 'city' : 'airport'
            }))
            .filter((place: Airport) => place.code && place.name);
          return suggestions.slice(0, 10);
        }
      }
      
      const lowerQuery = query.toLowerCase();
      const filtered = popularAirports.filter(airport =>
        airport.code.toLowerCase().includes(lowerQuery) ||
        airport.city.toLowerCase().includes(lowerQuery) ||
        airport.country.toLowerCase().includes(lowerQuery)
      );
      return filtered.slice(0, 8);
    } catch (error) {
      console.error('Error fetching airport suggestions:', error);
      const lowerQuery = query.toLowerCase();
      const filtered = popularAirports.filter(airport =>
        airport.code.toLowerCase().includes(lowerQuery) ||
        airport.city.toLowerCase().includes(lowerQuery)
      );
      return filtered.slice(0, 8);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Fetch hotel suggestions
  const fetchHotelSuggestions = useCallback(async (query: string): Promise<HotelDestination[]> => {
    if (!query || query.length < 2) {
      return popularHotelDestinations.slice(0, 6);
    }

    try {
      setLoadingHotelSuggestions(true);
      const lowerQuery = query.toLowerCase();
      const filtered = popularHotelDestinations.filter(dest =>
        dest.city.toLowerCase().includes(lowerQuery) ||
        dest.country.toLowerCase().includes(lowerQuery) ||
        dest.name.toLowerCase().includes(lowerQuery)
      );
      await new Promise(resolve => setTimeout(resolve, 200));
      return filtered.slice(0, 8);
    } catch (error) {
      console.error('Error fetching hotel suggestions:', error);
      return [];
    } finally {
      setLoadingHotelSuggestions(false);
    }
  }, []);

  // Handle input changes with suggestions
  const handleFromChange = useCallback(async (value: string) => {
    setFlightFrom(value);
    if (value.length >= 1) {
      const suggestions = await fetchAirportSuggestions(value);
      setFromSuggestions(suggestions);
      setShowFromDropdown(true);
    } else {
      setFromSuggestions(popularAirports.slice(0, 8));
      setShowFromDropdown(value.length > 0);
    }
  }, [fetchAirportSuggestions]);

  const handleToChange = useCallback(async (value: string) => {
    setFlightTo(value);
    if (value.length >= 1) {
      const suggestions = await fetchAirportSuggestions(value);
      setToSuggestions(suggestions);
      setShowToDropdown(true);
    } else {
      setToSuggestions(popularAirports.slice(0, 8));
      setShowToDropdown(value.length > 0);
    }
  }, [fetchAirportSuggestions]);

  const handleHotelChange = useCallback(async (value: string) => {
    setHotelLocation(value);
    if (value.length >= 1) {
      const suggestions = await fetchHotelSuggestions(value);
      setHotelSuggestions(suggestions);
      setShowHotelDropdown(true);
    } else {
      setHotelSuggestions(popularHotelDestinations.slice(0, 6));
      setShowHotelDropdown(value.length > 0);
    }
  }, [fetchHotelSuggestions]);

  const handleCarPickupChange = useCallback(async (value: string) => {
    setCarPickup(value);
    if (value.length >= 1) {
      const suggestions = await fetchAirportSuggestions(value);
      setCarPickupSuggestions(suggestions);
      setShowCarPickupDropdown(true);
    } else {
      setShowCarPickupDropdown(false);
    }
  }, [fetchAirportSuggestions]);

  const handleCarDropoffChange = useCallback(async (value: string) => {
    setCarDropoff(value);
    if (value.length >= 1) {
      const suggestions = await fetchAirportSuggestions(value);
      setCarDropoffSuggestions(suggestions);
      setShowCarDropoffDropdown(true);
    } else {
      setShowCarDropoffDropdown(false);
    }
  }, [fetchAirportSuggestions]);

  // Handle selection from dropdown
  const handleAirportSelect = (airport: Airport, type: 'from' | 'to') => {
    const displayValue = `${airport.code} - ${airport.city}, ${airport.country}`;
    if (type === 'from') {
      setFlightFrom(displayValue);
      setShowFromDropdown(false);
    } else {
      setFlightTo(displayValue);
      setShowToDropdown(false);
    }
  };

  const handleHotelSelect = (destination: HotelDestination) => {
    setHotelLocation(`${destination.city}, ${destination.country}`);
    setShowHotelDropdown(false);
  };

  const handleCarLocationSelect = (airport: Airport, type: 'pickup' | 'dropoff') => {
    const displayValue = `${airport.code} - ${airport.city}, ${airport.country}`;
    if (type === 'pickup') {
      setCarPickup(displayValue);
      setShowCarPickupDropdown(false);
    } else {
      setCarDropoff(displayValue);
      setShowCarDropoffDropdown(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (flightFromRef.current && !flightFromRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false);
      }
      if (flightToRef.current && !flightToRef.current.contains(event.target as Node)) {
        setShowToDropdown(false);
      }
      if (hotelLocationRef.current && !hotelLocationRef.current.contains(event.target as Node)) {
        setShowHotelDropdown(false);
      }
      if (carPickupRef.current && !carPickupRef.current.contains(event.target as Node)) {
        setShowCarPickupDropdown(false);
      }
      if (carDropoffRef.current && !carDropoffRef.current.contains(event.target as Node)) {
        setShowCarDropoffDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    setFlightDate(tomorrowStr);
    setReturnDate(nextWeekStr);
    setCheckIn(tomorrowStr);
    setCheckOut(nextWeekStr);
    setCarPickupDate(tomorrowStr);
    setCarDropoffDate(nextWeekStr);
    
    // Set initial values from params if available
    if (initialParams) {
      console.log('📦 Initial params received:', initialParams);
      if (initialParams.type === 'flights') {
        if (initialParams.segments?.[0]) {
          const fromCode = initialParams.segments[0].from;
          const toCode = initialParams.segments[0].to;
          const fromAirport = popularAirports.find(a => a.code === fromCode);
          const toAirport = popularAirports.find(a => a.code === toCode);
          if (fromAirport) setFlightFrom(`${fromAirport.code} - ${fromAirport.city}, ${fromAirport.country}`);
          else setFlightFrom(fromCode);
          if (toAirport) setFlightTo(`${toAirport.code} - ${toAirport.city}, ${toAirport.country}`);
          else setFlightTo(toCode);
        }
        if (initialParams.returnDate) setReturnDate(initialParams.returnDate);
        if (initialParams.tripType) setTripType(initialParams.tripType);
      }
      if (initialParams.type === 'hotels') {
        if (initialParams.location) setHotelLocation(initialParams.location);
        if (initialParams.checkInDate) setCheckIn(initialParams.checkInDate);
        if (initialParams.checkOutDate) setCheckOut(initialParams.checkOutDate);
      }
      if (initialParams.type === 'cars') {
        if (initialParams.pickupLocationCode) setCarPickup(initialParams.pickupLocationCode);
        if (initialParams.dropoffLocationCode) setCarDropoff(initialParams.dropoffLocationCode);
        if (initialParams.pickupDateTime) setCarPickupDate(initialParams.pickupDateTime.split('T')[0]);
        if (initialParams.dropoffDateTime) setCarDropoffDate(initialParams.dropoffDateTime.split('T')[0]);
      }
    }
  }, [initialParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let searchData: any = {};
    
    if (activeTab === 'flights') {
      const fromCode = extractCode(flightFrom);
      const toCode = extractCode(flightTo);
      
      searchData = {
        type: 'flights',
        tripType,
        segments: [{ from: fromCode, to: toCode, date: flightDate }],
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: 'economy',
      };
      
      if (tripType === 'round-trip') {
        searchData.returnDate = returnDate;
      }
      
      console.log('✈️ Flight Search Data:', searchData);
      
    } else if (activeTab === 'hotels') {
      searchData = {
        type: 'hotels',
        location: hotelLocation,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        travellers: { adults: parseInt(guests), children: 0 },
        rooms: 1,
      };
      console.log('🏨 Hotel Search Data:', searchData);
      
    } else if (activeTab === 'cars') {
      const pickupCode = extractCode(carPickup);
      const dropoffCode = extractCode(carDropoff);
      
      searchData = {
        type: 'car-rentals',
        pickupLocationCode: pickupCode,
        dropoffLocationCode: dropoffCode,
        pickupDateTime: `${carPickupDate}T10:00:00`,
        dropoffDateTime: `${carDropoffDate}T10:00:00`,
        passengers: 2,
      };
      console.log('🚗 Car Search Data:', searchData);
    }
    
    // Validate and call onSearch
    onSearch(searchData);
  };

  const renderDropdown = (suggestions: Airport[], onSelect: (airport: Airport) => void, isLoading: boolean) => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50">
      {isLoading ? (
        <div className="px-4 py-3 text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="text-xs mt-2">Loading...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">No results found</div>
      ) : (
        suggestions.map((airport, idx) => (
          <button
            key={`${airport.code}-${idx}`}
            type="button"
            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
            onClick={() => onSelect(airport)}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">
                  {airport.code}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-sm truncate">{airport.city}, {airport.country}</div>
                <div className="text-[10px] text-gray-500 truncate">{airport.name}</div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );

  const renderHotelDropdown = () => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50">
      {loadingHotelSuggestions ? (
        <div className="px-4 py-3 text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="text-xs mt-2">Loading...</p>
        </div>
      ) : hotelSuggestions.length === 0 ? (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">No destinations found</div>
      ) : (
        hotelSuggestions.map((dest, idx) => (
          <button
            key={`${dest.cityCode}-${idx}`}
            type="button"
            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
            onClick={() => handleHotelSelect(dest)}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs font-bold">
                  {dest.cityCode}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 text-sm truncate">{dest.city}, {dest.country}</div>
                <div className="text-[10px] text-gray-500 truncate">{dest.name}</div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );

  const renderFlightCompact = () => (
    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
      <div className="flex-1 min-w-[100px] relative" ref={flightFromRef}>
        <input
          type="text"
          value={flightFrom}
          onChange={(e) => handleFromChange(e.target.value)}
          onFocus={() => {
            if (flightFrom.length < 2) {
              setFromSuggestions(popularAirports.slice(0, 8));
            }
            setShowFromDropdown(true);
          }}
          placeholder={t('search.from') || "From"}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
        {showFromDropdown && renderDropdown(fromSuggestions, (airport) => handleAirportSelect(airport, 'from'), loadingSuggestions)}
      </div>
      <div className="text-gray-400 text-xs">→</div>
      <div className="flex-1 min-w-[100px] relative" ref={flightToRef}>
        <input
          type="text"
          value={flightTo}
          onChange={(e) => handleToChange(e.target.value)}
          onFocus={() => {
            if (flightTo.length < 2) {
              setToSuggestions(popularAirports.slice(0, 8));
            }
            setShowToDropdown(true);
          }}
          placeholder={t('search.to') || "To"}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
        {showToDropdown && renderDropdown(toSuggestions, (airport) => handleAirportSelect(airport, 'to'), loadingSuggestions)}
      </div>
      <div className="flex-1 min-w-[110px]">
        <input
          type="date"
          value={flightDate}
          onChange={(e) => setFlightDate(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
      </div>
      {tripType === 'round-trip' && (
        <div className="flex-1 min-w-[110px]">
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => setTripType(tripType === 'round-trip' ? 'one-way' : 'round-trip')}
        className="text-[10px] font-bold text-[#33a8da] px-2 py-1 bg-blue-50 rounded-md whitespace-nowrap hover:bg-blue-100 transition"
      >
        {tripType === 'round-trip' ? 'Round trip' : 'One way'}
      </button>
      <button
        type="submit"
        disabled={loading || !flightFrom || !flightTo || !flightDate}
        className="bg-[#33a8da] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-[#2c98c7] transition disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? '...' : t('search.searchBtn')}
      </button>
    </div>
  );

  const renderHotelCompact = () => (
    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
      <div className="flex-1 min-w-[160px] relative" ref={hotelLocationRef}>
        <input
          type="text"
          value={hotelLocation}
          onChange={(e) => handleHotelChange(e.target.value)}
          onFocus={() => {
            if (hotelLocation.length < 2) {
              setHotelSuggestions(popularHotelDestinations.slice(0, 6));
            }
            setShowHotelDropdown(true);
          }}
          placeholder={t('search.destination') || "City, hotel, or area"}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
        {showHotelDropdown && renderHotelDropdown()}
      </div>
      <div className="flex-1 min-w-[110px]">
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
      </div>
      <div className="flex-1 min-w-[110px]">
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
      </div>
      <div className="w-[90px]">
        <select
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        >
          <option value="1">1 guest</option>
          <option value="2">2 guests</option>
          <option value="3">3 guests</option>
          <option value="4">4 guests</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading || !hotelLocation || !checkIn || !checkOut}
        className="bg-[#33a8da] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-[#2c98c7] transition disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? '...' : t('search.searchBtn')}
      </button>
    </div>
  );

  const renderCarCompact = () => (
    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
      <div className="flex-1 min-w-[100px] relative" ref={carPickupRef}>
        <input
          type="text"
          value={carPickup}
          onChange={(e) => handleCarPickupChange(e.target.value)}
          onFocus={() => setShowCarPickupDropdown(true)}
          placeholder={t('search.pickUp') || "Pick-up"}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
        {showCarPickupDropdown && renderDropdown(carPickupSuggestions, (airport) => handleCarLocationSelect(airport, 'pickup'), loadingCarSuggestions)}
      </div>
      <div className="text-gray-400 text-xs">→</div>
      <div className="flex-1 min-w-[100px] relative" ref={carDropoffRef}>
        <input
          type="text"
          value={carDropoff}
          onChange={(e) => handleCarDropoffChange(e.target.value)}
          onFocus={() => setShowCarDropoffDropdown(true)}
          placeholder={t('search.dropOff') || "Drop-off"}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
        {showCarDropoffDropdown && renderDropdown(carDropoffSuggestions, (airport) => handleCarLocationSelect(airport, 'dropoff'), loadingCarSuggestions)}
      </div>
      <div className="flex-1 min-w-[110px]">
        <input
          type="date"
          value={carPickupDate}
          onChange={(e) => setCarPickupDate(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
      </div>
      <div className="flex-1 min-w-[110px]">
        <input
          type="date"
          value={carDropoffDate}
          onChange={(e) => setCarDropoffDate(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] focus:ring-1 focus:ring-[#33a8da]"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !carPickup || !carDropoff || !carPickupDate || !carDropoffDate}
        className="bg-[#33a8da] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-[#2c98c7] transition disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? '...' : t('search.searchBtn')}
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      {/* Only show fields for the current active tab - NO TAB INDICATORS */}
      {activeTab === 'flights' && renderFlightCompact()}
      {activeTab === 'hotels' && renderHotelCompact()}
      {activeTab === 'cars' && renderCarCompact()}
    </form>
  );
};

export default CompactSearchBox;