'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

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
  const passengerDropdownRef = useRef<HTMLDivElement>(null);
  
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
  
  // Passenger states
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [passengers, setPassengers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [cabinClass, setCabinClass] = useState('economy');
  
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

  // Memoize popular airports to prevent recreation
  const popularAirports = useMemo<Airport[]>(() => [
    { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', type: 'airport' },
    { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', type: 'airport' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', type: 'airport' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', type: 'airport' },
    { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', type: 'airport' },
    { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', type: 'airport' },
    { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', type: 'airport' },
  ], []);

  const popularHotelDestinations = useMemo<HotelDestination[]>(() => [
    { name: 'Lagos', city: 'Lagos', country: 'Nigeria', cityCode: 'LOS' },
    { name: 'London', city: 'London', country: 'United Kingdom', cityCode: 'LON' },
    { name: 'New York', city: 'New York', country: 'USA', cityCode: 'NYC' },
    { name: 'Dubai', city: 'Dubai', country: 'UAE', cityCode: 'DXB' },
    { name: 'Paris', city: 'Paris', country: 'France', cityCode: 'PAR' },
    { name: 'Tokyo', city: 'Tokyo', country: 'Japan', cityCode: 'TYO' },
    { name: 'Singapore', city: 'Singapore', country: 'Singapore', cityCode: 'SIN' },
  ], []);

  // Debounce function
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Extract airport code
  const extractCode = useCallback((displayValue: string): string => {
    if (!displayValue) return '';
    if (/^[A-Z]{3}$/.test(displayValue.trim())) {
      return displayValue.trim();
    }
    const match = displayValue.match(/^([A-Z]{3})\s*-\s*/);
    if (match) return match[1];
    const anyCode = displayValue.match(/\b([A-Z]{3})\b/);
    return anyCode ? anyCode[1] : displayValue;
  }, []);

  // Memoize passenger display text
  const passengerDisplayText = useMemo(() => {
    const total = passengers.adults + passengers.children + passengers.infants;
    const cabinLabels: { [key: string]: string } = {
      economy: 'Economy',
      'premium-economy': 'Premium Economy',
      business: 'Business',
      first: 'First Class'
    };
    return `${total} Passenger${total !== 1 ? 's' : ''}, ${cabinLabels[cabinClass] || 'Economy'}`;
  }, [passengers.adults, passengers.children, passengers.infants, cabinClass]);

  // Fetch airport suggestions
  const fetchAirportSuggestions = useCallback(async (query: string): Promise<Airport[]> => {
    if (!query || query.length < 2) {
      return popularAirports.slice(0, 8);
    }

    const abortController = new AbortController();
    
    try {
      setLoadingSuggestions(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ebony-bruce-production.up.railway.app'}/api/v1/bookings/flights/places/suggestions?query=${encodeURIComponent(query)}`,
        { signal: abortController.signal }
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
      if ((error as any).name === 'AbortError') {
        return [];
      }
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
  }, [popularAirports]);

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
  }, [popularHotelDestinations]);

  // Debounced handlers
  const debouncedFromChange = useMemo(
    () => debounce(async (value: string) => {
      if (value.length >= 1) {
        const suggestions = await fetchAirportSuggestions(value);
        setFromSuggestions(suggestions);
        setShowFromDropdown(true);
      } else {
        setFromSuggestions(popularAirports.slice(0, 8));
        setShowFromDropdown(value.length > 0);
      }
    }, 300),
    [debounce, fetchAirportSuggestions, popularAirports]
  );

  const debouncedToChange = useMemo(
    () => debounce(async (value: string) => {
      if (value.length >= 1) {
        const suggestions = await fetchAirportSuggestions(value);
        setToSuggestions(suggestions);
        setShowToDropdown(true);
      } else {
        setToSuggestions(popularAirports.slice(0, 8));
        setShowToDropdown(value.length > 0);
      }
    }, 300),
    [debounce, fetchAirportSuggestions, popularAirports]
  );

  const debouncedHotelChange = useMemo(
    () => debounce(async (value: string) => {
      if (value.length >= 1) {
        const suggestions = await fetchHotelSuggestions(value);
        setHotelSuggestions(suggestions);
        setShowHotelDropdown(true);
      } else {
        setHotelSuggestions(popularHotelDestinations.slice(0, 6));
        setShowHotelDropdown(value.length > 0);
      }
    }, 300),
    [debounce, fetchHotelSuggestions, popularHotelDestinations]
  );

  const debouncedCarPickupChange = useMemo(
    () => debounce(async (value: string) => {
      if (value.length >= 1) {
        const suggestions = await fetchAirportSuggestions(value);
        setCarPickupSuggestions(suggestions);
        setShowCarPickupDropdown(true);
      } else {
        setShowCarPickupDropdown(false);
      }
    }, 300),
    [debounce, fetchAirportSuggestions]
  );

  const debouncedCarDropoffChange = useMemo(
    () => debounce(async (value: string) => {
      if (value.length >= 1) {
        const suggestions = await fetchAirportSuggestions(value);
        setCarDropoffSuggestions(suggestions);
        setShowCarDropoffDropdown(true);
      } else {
        setShowCarDropoffDropdown(false);
      }
    }, 300),
    [debounce, fetchAirportSuggestions]
  );

  // Handle input changes
  const handleFromChange = useCallback((value: string) => {
    setFlightFrom(value);
    debouncedFromChange(value);
  }, [debouncedFromChange]);

  const handleToChange = useCallback((value: string) => {
    setFlightTo(value);
    debouncedToChange(value);
  }, [debouncedToChange]);

  const handleHotelChange = useCallback((value: string) => {
    setHotelLocation(value);
    debouncedHotelChange(value);
  }, [debouncedHotelChange]);

  const handleCarPickupChange = useCallback((value: string) => {
    setCarPickup(value);
    debouncedCarPickupChange(value);
  }, [debouncedCarPickupChange]);

  const handleCarDropoffChange = useCallback((value: string) => {
    setCarDropoff(value);
    debouncedCarDropoffChange(value);
  }, [debouncedCarDropoffChange]);

  // Handle selections
  const handleAirportSelect = useCallback((airport: Airport, type: 'from' | 'to') => {
    const displayValue = `${airport.code} - ${airport.city}, ${airport.country}`;
    if (type === 'from') {
      setFlightFrom(displayValue);
      setShowFromDropdown(false);
    } else {
      setFlightTo(displayValue);
      setShowToDropdown(false);
    }
  }, []);

  const handleHotelSelect = useCallback((destination: HotelDestination) => {
    setHotelLocation(`${destination.city}, ${destination.country}`);
    setShowHotelDropdown(false);
  }, []);

  const handleCarLocationSelect = useCallback((airport: Airport, type: 'pickup' | 'dropoff') => {
    const displayValue = `${airport.code} - ${airport.city}, ${airport.country}`;
    if (type === 'pickup') {
      setCarPickup(displayValue);
      setShowCarPickupDropdown(false);
    } else {
      setCarDropoff(displayValue);
      setShowCarDropoffDropdown(false);
    }
  }, []);

  const updatePassengers = useCallback((type: 'adults' | 'children' | 'infants', delta: number) => {
    setPassengers(prev => {
      let newValue = prev[type] + delta;
      if (type === 'adults') {
        newValue = Math.max(1, Math.min(9, newValue));
      } else {
        newValue = Math.max(0, Math.min(9, newValue));
      }
      return { ...prev, [type]: newValue };
    });
  }, []);

  // Close dropdowns on outside click
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
      if (passengerDropdownRef.current && !passengerDropdownRef.current.contains(event.target as Node)) {
        setShowPassengerDropdown(false);
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
  }, [initialParams, popularAirports]);

  // Cleanup
  useEffect(() => {
    return () => {
      setFromSuggestions([]);
      setToSuggestions([]);
      setHotelSuggestions([]);
      setCarPickupSuggestions([]);
      setCarDropoffSuggestions([]);
    };
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    let searchData: any = {};
    
    if (activeTab === 'flights') {
      const fromCode = extractCode(flightFrom);
      const toCode = extractCode(flightTo);
      
      searchData = {
        type: 'flights',
        tripType,
        segments: [{ from: fromCode, to: toCode, date: flightDate }],
        passengers: { adults: passengers.adults, children: passengers.children, infants: passengers.infants },
        cabinClass: cabinClass,
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
    
    onSearch(searchData);
  }, [activeTab, extractCode, flightFrom, flightTo, flightDate, tripType, returnDate, passengers, cabinClass, hotelLocation, checkIn, checkOut, guests, carPickup, carDropoff, carPickupDate, carDropoffDate, onSearch]);

  const renderDropdown = useCallback((suggestions: Airport[], onSelect: (airport: Airport) => void, isLoading: boolean) => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-64 overflow-y-auto z-50">
      {isLoading ? (
        <div className="px-4 py-4 text-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="text-xs mt-2">Loading...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="px-4 py-4 text-center text-gray-500 text-sm">No results found</div>
      ) : (
        suggestions.map((airport, idx) => (
          <button
            key={`${airport.code}-${idx}`}
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
            onClick={() => onSelect(airport)}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 text-[#33a8da] rounded-xl flex items-center justify-center text-sm font-bold">
                {airport.code}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{airport.city}, {airport.country}</div>
                <div className="text-xs text-gray-400 truncate">{airport.name}</div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  ), []);

  const renderHotelDropdown = useCallback(() => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-64 overflow-y-auto z-50">
      {loadingHotelSuggestions ? (
        <div className="px-4 py-4 text-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="text-xs mt-2">Loading...</p>
        </div>
      ) : hotelSuggestions.length === 0 ? (
        <div className="px-4 py-4 text-center text-gray-500 text-sm">No destinations found</div>
      ) : (
        hotelSuggestions.map((dest, idx) => (
          <button
            key={`${dest.cityCode}-${idx}`}
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
            onClick={() => handleHotelSelect(dest)}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-sm font-bold">
                {dest.cityCode}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{dest.city}, {dest.country}</div>
                <div className="text-xs text-gray-400 truncate">{dest.name}</div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  ), [hotelSuggestions, loadingHotelSuggestions, handleHotelSelect]);

  // Memoized render functions
  const renderFlightCompact = useMemo(() => (
    <div className="flex items-start gap-3 flex-wrap lg:flex-nowrap">
      <div className="flex flex-col gap-1.5 min-w-[100px]">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TRIP TYPE</span>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="tripType"
              checked={tripType === 'round-trip'}
              onChange={() => setTripType('round-trip')}
              className="w-3.5 h-3.5 text-[#33a8da] focus:ring-[#33a8da]"
            />
            <span className="text-xs font-medium text-gray-700">Round</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="tripType"
              checked={tripType === 'one-way'}
              onChange={() => setTripType('one-way')}
              className="w-3.5 h-3.5 text-[#33a8da] focus:ring-[#33a8da]"
            />
            <span className="text-xs font-medium text-gray-700">One way</span>
          </label>
        </div>
      </div>

      <div className="flex-1 min-w-[120px] relative" ref={flightFromRef}>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">FROM</label>
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
          placeholder="Lagos"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
        />
        {showFromDropdown && renderDropdown(fromSuggestions, (airport) => handleAirportSelect(airport, 'from'), loadingSuggestions)}
      </div>

      <div className="flex-1 min-w-[120px] relative" ref={flightToRef}>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">TO</label>
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
          placeholder="London"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
        />
        {showToDropdown && renderDropdown(toSuggestions, (airport) => handleAirportSelect(airport, 'to'), loadingSuggestions)}
      </div>

      <div className="flex-1 min-w-[130px]">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">DEPARTURE</label>
        <input
          type="date"
          value={flightDate}
          onChange={(e) => setFlightDate(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
        />
      </div>

      {tripType === 'round-trip' && (
        <div className="flex-1 min-w-[130px]">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">RETURN</label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
          />
        </div>
      )}

      <div className="min-w-[160px] relative" ref={passengerDropdownRef}>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">PASSENGER</label>
        <button
          type="button"
          onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white text-left flex justify-between items-center"
        >
          <span>{passengerDisplayText}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showPassengerDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 min-w-[280px]">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <div className="font-medium text-gray-900 text-sm">Adults</div>
                <div className="text-xs text-gray-400">Age 12+</div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => updatePassengers('adults', -1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50" disabled={passengers.adults <= 1}>-</button>
                <span className="w-5 text-center text-sm font-medium">{passengers.adults}</span>
                <button type="button" onClick={() => updatePassengers('adults', 1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center">+</button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <div className="font-medium text-gray-900 text-sm">Children</div>
                <div className="text-xs text-gray-400">Age 2-11</div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => updatePassengers('children', -1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50" disabled={passengers.children <= 0}>-</button>
                <span className="w-5 text-center text-sm font-medium">{passengers.children}</span>
                <button type="button" onClick={() => updatePassengers('children', 1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center">+</button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <div className="font-medium text-gray-900 text-sm">Infants</div>
                <div className="text-xs text-gray-400">Under 2</div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => updatePassengers('infants', -1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50" disabled={passengers.infants <= 0}>-</button>
                <span className="w-5 text-center text-sm font-medium">{passengers.infants}</span>
                <button type="button" onClick={() => updatePassengers('infants', 1)} className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center">+</button>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium text-gray-900 text-sm">Cabin Class</div>
              </div>
              <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#33a8da] bg-gray-50">
                <option value="economy">Economy</option>
                <option value="premium-economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
              </select>
            </div>
            <button type="button" onClick={() => setShowPassengerDropdown(false)} className="w-full mt-3 bg-[#33a8da] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2c98c7] transition">Done</button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-transparent uppercase tracking-wider">.</span>
        <button type="submit" disabled={loading || !flightFrom || !flightTo || !flightDate} className="bg-[#33a8da] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#2c98c7] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap">
          {loading ? '...' : 'Search'}
        </button>
      </div>
    </div>
  ), [tripType, flightFrom, flightTo, flightDate, returnDate, showFromDropdown, showToDropdown, fromSuggestions, toSuggestions, loadingSuggestions, showPassengerDropdown, passengerDisplayText, passengers.adults, passengers.children, passengers.infants, cabinClass, loading, handleFromChange, handleToChange, handleAirportSelect, renderDropdown, updatePassengers, popularAirports]);

  const renderHotelCompactMemo = useMemo(() => (
    <div className="flex items-start gap-3 flex-wrap lg:flex-nowrap">
      <div className="flex-1 min-w-[180px] relative" ref={hotelLocationRef}>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">DESTINATION</label>
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
          placeholder="City, hotel, or area"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
        />
        {showHotelDropdown && renderHotelDropdown()}
      </div>

      <div className="flex-1 min-w-[130px]">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CHECK IN</label>
        <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white" />
      </div>

      <div className="flex-1 min-w-[130px]">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">CHECK OUT</label>
        <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white" />
      </div>

      <div className="min-w-[110px]">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">GUESTS</label>
        <select value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white">
          <option value="1">1 Guest</option>
          <option value="2">2 Guests</option>
          <option value="3">3 Guests</option>
          <option value="4">4 Guests</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-transparent uppercase tracking-wider">.</span>
        <button type="submit" disabled={loading || !hotelLocation || !checkIn || !checkOut} className="bg-[#33a8da] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#2c98c7] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap">
          {loading ? '...' : 'Search'}
        </button>
      </div>
    </div>
  ), [hotelLocation, checkIn, checkOut, guests, showHotelDropdown, loading, handleHotelChange, renderHotelDropdown, popularHotelDestinations]);

  const renderCarCompactMemo = useMemo(() => (
    <div className="flex items-start gap-3 flex-wrap lg:flex-nowrap">
      <div className="flex-1 min-w-[130px] relative" ref={carPickupRef}>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">PICKUP</label>
        <input type="text" value={carPickup} onChange={(e) => handleCarPickupChange(e.target.value)} onFocus={() => setShowCarPickupDropdown(true)} placeholder="City or airport" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white" />
        {showCarPickupDropdown && renderDropdown(carPickupSuggestions, (airport) => handleCarLocationSelect(airport, 'pickup'), loadingCarSuggestions)}
      </div>

      <div className="flex-1 min-w-[130px] relative" ref={carDropoffRef}>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">DROPOFF</label>
        <input type="text" value={carDropoff} onChange={(e) => handleCarDropoffChange(e.target.value)} onFocus={() => setShowCarDropoffDropdown(true)} placeholder="City or airport" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white" />
        {showCarDropoffDropdown && renderDropdown(carDropoffSuggestions, (airport) => handleCarLocationSelect(airport, 'dropoff'), loadingCarSuggestions)}
      </div>

      <div className="flex-1 min-w-[130px]">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">PICKUP DATE</label>
        <input type="date" value={carPickupDate} onChange={(e) => setCarPickupDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white" />
      </div>

      <div className="flex-1 min-w-[130px]">
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">DROPOFF DATE</label>
        <input type="date" value={carDropoffDate} onChange={(e) => setCarDropoffDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white" />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-transparent uppercase tracking-wider">.</span>
        <button type="submit" disabled={loading || !carPickup || !carDropoff || !carPickupDate || !carDropoffDate} className="bg-[#33a8da] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#2c98c7] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap">
          {loading ? '...' : 'Search'}
        </button>
      </div>
    </div>
  ), [carPickup, carDropoff, carPickupDate, carDropoffDate, showCarPickupDropdown, showCarDropoffDropdown, carPickupSuggestions, carDropoffSuggestions, loadingCarSuggestions, loading, handleCarPickupChange, handleCarDropoffChange, handleCarLocationSelect, renderDropdown]);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
      {activeTab === 'flights' && renderFlightCompact}
      {activeTab === 'hotels' && renderHotelCompactMemo}
      {activeTab === 'cars' && renderCarCompactMemo}
    </form>
  );
};

export default CompactSearchBox;