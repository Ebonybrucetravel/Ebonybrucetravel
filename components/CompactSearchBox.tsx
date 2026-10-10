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
  image?: string;
}

// ✅ Multi-City Segment interface
interface MultiCitySegment {
  id: string;
  from: string;
  to: string;
  date: string;
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
  const quickFiltersRef = useRef<HTMLDivElement>(null); 
  const passengerDropdownRef = useRef<HTMLDivElement>(null);
  
  // Flight states
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<'round-trip' | 'one-way' | 'multi-city'>('round-trip');
  
  // ✅ Multi-City states
  const [multiCitySegments, setMultiCitySegments] = useState<MultiCitySegment[]>([
    { id: '1', from: '', to: '', date: '' },
    { id: '2', from: '', to: '', date: '' },
  ]);
  const [showSegmentFromDropdown, setShowSegmentFromDropdown] = useState<Record<string, boolean>>({});
  const [showSegmentToDropdown, setShowSegmentToDropdown] = useState<Record<string, boolean>>({});
  const [segmentFromSuggestions, setSegmentFromSuggestions] = useState<Record<string, Airport[]>>({});
  const [segmentToSuggestions, setSegmentToSuggestions] = useState<Record<string, Airport[]>>({});
  
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
  const [selectedCityCode, setSelectedCityCode] = useState<string | null>(null);
  // Car states
const [carPickup, setCarPickup] = useState('');
const [carDropoff, setCarDropoff] = useState('');
const [carPickupDate, setCarPickupDate] = useState('');
const [carPickupTime, setCarPickupTime] = useState('10:00');   
const [carDropoffDate, setCarDropoffDate] = useState('');
const [carDropoffTime, setCarDropoffTime] = useState('10:00'); 
const [showCarPickupDropdown, setShowCarPickupDropdown] = useState(false);
const [showCarDropoffDropdown, setShowCarDropoffDropdown] = useState(false);
const [carPickupSuggestions, setCarPickupSuggestions] = useState<Airport[]>([]);
const [carDropoffSuggestions, setCarDropoffSuggestions] = useState<Airport[]>([]);
const [loadingCarSuggestions, setLoadingCarSuggestions] = useState(false);
  const [dropOffDifferent, setDropOffDifferent] = useState(false);
const [driverAged3065, setDriverAged3065] = useState(true);
const [showQuickFilters, setShowQuickFilters] = useState(false);
const [seatFilter, setSeatFilter] = useState<number | null>(null);
const [transmission, setTransmission] = useState<'ANY' | 'AUTOMATIC' | 'MANUAL'>('ANY');
const [fuelType, setFuelType] = useState<'ANY' | 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID'>('ANY');
const [airConditioning, setAirConditioning] = useState(false);
const [unlimitedMileage, setUnlimitedMileage] = useState(false);
const [extras, setExtras] = useState({
  additionalDriver: false,
  infantSeat: false,
  boosterSeat: false,
  carSeat: false,
  gps: false,
  wifi: false,
});

  // Memoize popular airports
  const popularAirports = useMemo<Airport[]>(() => [
    { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', type: 'airport' },
    { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', type: 'airport' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', type: 'airport' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', type: 'airport' },
    { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', type: 'airport' },
    { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', type: 'airport' },
    { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', type: 'airport' },
    { code: 'ABV', name: 'Nnamdi Azikiwe International Airport', city: 'Abuja', country: 'Nigeria', type: 'airport' },
    { code: 'PHC', name: 'Port Harcourt International Airport', city: 'Port Harcourt', country: 'Nigeria', type: 'airport' },
    { code: 'KAN', name: 'Mallam Aminu Kano International Airport', city: 'Kano', country: 'Nigeria', type: 'airport' },
  ], []);

  const popularHotelDestinations = useMemo<HotelDestination[]>(() => [
    { name: 'Lagos', city: 'Lagos', country: 'Nigeria', cityCode: 'LOS', image: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?auto=format&fit=crop&q=80&w=400' },
    { name: 'London', city: 'London', country: 'United Kingdom', cityCode: 'LON', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400' },
    { name: 'New York', city: 'New York', country: 'USA', cityCode: 'NYC', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400' },
    { name: 'Dubai', city: 'Dubai', country: 'UAE', cityCode: 'DXB', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400' },
    { name: 'Paris', city: 'Paris', country: 'France', cityCode: 'PAR', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400' },
    { name: 'Tokyo', city: 'Tokyo', country: 'Japan', cityCode: 'TYO', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=400' },
    { name: 'Singapore', city: 'Singapore', country: 'Singapore', cityCode: 'SIN', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=400' },
    { name: 'Accra', city: 'Accra', country: 'Ghana', cityCode: 'ACC', image: 'https://images.unsplash.com/photo-1587496679742-bad502958c4a?auto=format&fit=crop&q=80&w=400' },
    { name: 'Cape Town', city: 'Cape Town', country: 'South Africa', cityCode: 'CPT', image: 'https://images.unsplash.com/photo-1596394516093-9ba7b6146eba?auto=format&fit=crop&q=80&w=400' },
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

  // Extract city code from hotel location
  const getCityCodeFromLocation = useCallback((location: string): string => {
    if (!location) return 'LOS';
    if (selectedCityCode) return selectedCityCode;
    
    const cityCodeMap: Record<string, string> = {
      'lagos': 'LOS', 'london': 'LON', 'new york': 'NYC',
      'dubai': 'DXB', 'paris': 'PAR', 'tokyo': 'TYO',
      'singapore': 'SIN', 'accra': 'ACC', 'cape town': 'CPT',
      'madrid': 'MAD', 'barcelona': 'BCN', 'rome': 'ROM',
      'amsterdam': 'AMS', 'berlin': 'BER', 'istanbul': 'IST'
    };
    
    const lowerLoc = location.toLowerCase().trim();
    for (const [cityName, code] of Object.entries(cityCodeMap)) {
      if (lowerLoc.includes(cityName)) return code;
    }
    
    const matchedDest = popularHotelDestinations.find(d =>
      lowerLoc.includes(d.city.toLowerCase()) ||
      lowerLoc.includes(d.name.toLowerCase())
    );
    if (matchedDest) return matchedDest.cityCode;
    
    const anyCode = location.match(/\b([A-Z]{3})\b/);
    return anyCode ? anyCode[1] : 'LOS';
  }, [selectedCityCode, popularHotelDestinations]);

  // Fetch hotel suggestions from Amadeus API
  const fetchHotelSuggestions = useCallback(async (query: string): Promise<HotelDestination[]> => {
    if (!query || query.length < 2) {
      return popularHotelDestinations.slice(0, 6);
    }

    try {
      setLoadingHotelSuggestions(true);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ebony-bruce-production.up.railway.app'}/api/v1/bookings/hotels/destinations/suggestions?query=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          return result.data.slice(0, 10);
        }
      }
      
      const lowerQuery = query.toLowerCase();
      const filtered = popularHotelDestinations.filter(dest =>
        dest.city.toLowerCase().includes(lowerQuery) ||
        dest.country.toLowerCase().includes(lowerQuery) ||
        dest.name.toLowerCase().includes(lowerQuery) ||
        dest.cityCode.toLowerCase().includes(lowerQuery)
      );
      
      return filtered.length > 0 ? filtered.slice(0, 8) : [];

    } catch (error) {
      console.error('Error fetching hotel suggestions from Amadeus:', error);
      const lowerQuery = query.toLowerCase();
      const filtered = popularHotelDestinations.filter(dest =>
        dest.city.toLowerCase().includes(lowerQuery) ||
        dest.country.toLowerCase().includes(lowerQuery) ||
        dest.name.toLowerCase().includes(lowerQuery) ||
        dest.cityCode.toLowerCase().includes(lowerQuery)
      );
      return filtered.length > 0 ? filtered.slice(0, 8) : [];
    } finally {
      setLoadingHotelSuggestions(false);
    }
  }, [popularHotelDestinations]);

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

  // Debounced handlers for regular flight
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

  // ✅ Debounced handlers for Multi-City segments
  const debouncedSegmentFromChange = useMemo(
    () => debounce(async (segmentId: string, value: string) => {
      if (value.length >= 1) {
        const suggestions = await fetchAirportSuggestions(value);
        setSegmentFromSuggestions(prev => ({ ...prev, [segmentId]: suggestions }));
        setShowSegmentFromDropdown(prev => ({ ...prev, [segmentId]: true }));
      } else {
        setShowSegmentFromDropdown(prev => ({ ...prev, [segmentId]: value.length > 0 }));
      }
    }, 300),
    [debounce, fetchAirportSuggestions]
  );

  const debouncedSegmentToChange = useMemo(
    () => debounce(async (segmentId: string, value: string) => {
      if (value.length >= 1) {
        const suggestions = await fetchAirportSuggestions(value);
        setSegmentToSuggestions(prev => ({ ...prev, [segmentId]: suggestions }));
        setShowSegmentToDropdown(prev => ({ ...prev, [segmentId]: true }));
      } else {
        setShowSegmentToDropdown(prev => ({ ...prev, [segmentId]: value.length > 0 }));
      }
    }, 300),
    [debounce, fetchAirportSuggestions]
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

  // Handle input changes for regular flight
  const handleFromChange = useCallback((value: string) => {
    setFlightFrom(value);
    debouncedFromChange(value);
  }, [debouncedFromChange]);

  const handleToChange = useCallback((value: string) => {
    setFlightTo(value);
    debouncedToChange(value);
  }, [debouncedToChange]);

  // ✅ Handle input changes for Multi-City segments
  const handleSegmentFromChange = useCallback((segmentId: string, value: string) => {
    setMultiCitySegments(prev => prev.map(seg => 
      seg.id === segmentId ? { ...seg, from: value } : seg
    ));
    debouncedSegmentFromChange(segmentId, value);
  }, [debouncedSegmentFromChange]);

  const handleSegmentToChange = useCallback((segmentId: string, value: string) => {
    setMultiCitySegments(prev => prev.map(seg => 
      seg.id === segmentId ? { ...seg, to: value } : seg
    ));
    debouncedSegmentToChange(segmentId, value);
  }, [debouncedSegmentToChange]);

  const handleSegmentDateChange = useCallback((segmentId: string, value: string) => {
    setMultiCitySegments(prev => prev.map(seg => 
      seg.id === segmentId ? { ...seg, date: value } : seg
    ));
  }, []);

  const handleHotelChange = useCallback((value: string) => {
    setHotelLocation(value);
    setSelectedCityCode(null);
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

  // Handle selections for regular flight
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

  // ✅ Handle selections for Multi-City segments
  const handleSegmentAirportSelect = useCallback((segmentId: string, airport: Airport, type: 'from' | 'to') => {
    const displayValue = `${airport.code} - ${airport.city}, ${airport.country}`;
    setMultiCitySegments(prev => prev.map(seg => 
      seg.id === segmentId ? { ...seg, [type === 'from' ? 'from' : 'to']: displayValue } : seg
    ));
    if (type === 'from') {
      setShowSegmentFromDropdown(prev => ({ ...prev, [segmentId]: false }));
    } else {
      setShowSegmentToDropdown(prev => ({ ...prev, [segmentId]: false }));
    }
  }, []);

  const handleHotelSelect = useCallback((destination: HotelDestination) => {
    setHotelLocation(`${destination.city}, ${destination.country}`);
    setSelectedCityCode(destination.cityCode);
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

  // ✅ Multi-City segment management
  const addSegment = useCallback(() => {
    const newId = Date.now().toString();
    setMultiCitySegments(prev => [...prev, { id: newId, from: '', to: '', date: '' }]);
  }, []);

  const removeSegment = useCallback((segmentId: string) => {
    if (multiCitySegments.length <= 2) {
      // Don't remove below 2 segments
      return;
    }
    setMultiCitySegments(prev => prev.filter(seg => seg.id !== segmentId));
  }, [multiCitySegments.length]);

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
    
    // ✅ Set multi-city segment dates
    setMultiCitySegments(prev => prev.map((seg, index) => ({
      ...seg,
      date: new Date(tomorrow.getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })));
    
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
        if (initialParams.cityCode) setSelectedCityCode(initialParams.cityCode);
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
      if (tripType === 'multi-city') {
        // ✅ Multi-City search
        const segments = multiCitySegments.map(seg => ({
          from: extractCode(seg.from),
          to: extractCode(seg.to),
          date: seg.date,
        })).filter(seg => seg.from && seg.to && seg.date);
        
        if (segments.length < 2) {
          alert('Please add at least 2 segments for a multi-city trip.');
          return;
        }
        
        searchData = {
          type: 'flights',
          tripType: 'multi-city',
          segments: segments,
          passengers: { adults: passengers.adults, children: passengers.children, infants: passengers.infants },
          cabinClass: cabinClass,
        };
        
        console.log('🔄 Multi-City Search Data:', searchData);
        
      } else {
        // Regular round-trip or one-way
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
      }
      
    } else if (activeTab === 'hotels') {
      const cityCode = getCityCodeFromLocation(hotelLocation);
      
      searchData = {
        type: 'hotels',
        location: hotelLocation,
        cityCode: cityCode,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        travellers: {
          adults: passengers.adults,
          children: passengers.children,
        },
        rooms: 1,
        provider: 'amadeus'
      };
      console.log('🏨 Hotel Search Data (Amadeus):', searchData);
      
    } else if (activeTab === 'cars') {
      const pickupCode = extractCode(carPickup);
      const dropoffCode = extractCode(carDropoff || carPickup);
      
      if (!pickupCode || !carPickupDate || !carDropoffDate) {
        alert('Please fill in all rental details.');
        return;
      }
      
      const formatDT = (d: string, t: string) => {
        const date = new Date(d);
        const [h, m] = t.split(':');
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${h}:${m}:00`;
      };
      
      const pickupDate = new Date(`${carPickupDate}T${carPickupTime}:00`);
      const dropoffDate = new Date(`${carDropoffDate}T${carDropoffTime}:00`);
      const diffHours = (dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60);
      const hours = Math.floor(diffHours);
      const minutes = Math.round((diffHours - hours) * 60);
      const duration = `PT${hours}H${minutes > 0 ? `${minutes}M` : ''}`;
      
      searchData = {
        type: 'car-rentals',
        // ✅ New Amadeus-format fields
        startLocationCode: pickupCode,
        endLocationCode: dropoffCode,
        startDateTime: formatDT(carPickupDate, carPickupTime),
        endDateTime: formatDT(carDropoffDate, carDropoffTime),
      
        // ✅ Old-format fields — REQUIRED by SearchResults.handleNewSearch
        pickupLocationCode: pickupCode,
        dropoffLocationCode: dropoffCode,
        pickupDateTime: formatDT(carPickupDate, carPickupTime),
        dropoffDateTime: formatDT(carDropoffDate, carDropoffTime),
      
        passengers: 2,
        transferType: 'PRIVATE',
        currency: 'GBP',
        duration,
        vehicleCategory: 'BU',
        vehicleCode: 'VAN',
        seatCount: seatFilter || undefined,
        transmission: transmission !== 'ANY' ? transmission : undefined,
        fuelType: fuelType !== 'ANY' ? fuelType : undefined,
        airConditioning: airConditioning || undefined,
        unlimitedMileage: unlimitedMileage || undefined,
        extras: Object.entries(extras)
          .filter(([, v]) => v)
          .map(([k]) => k.toUpperCase()),
        driverAge: driverAged3065 ? '30-65' : 'any',
        dropOffDifferent,
      };
      console.log('🚗 Amadeus Car Rental Payload:', searchData);
    }
    
    onSearch(searchData);
  }, [
    activeTab, extractCode, getCityCodeFromLocation,
    flightFrom, flightTo, flightDate, tripType, returnDate,
    passengers, cabinClass,
    hotelLocation, checkIn, checkOut, guests,
    carPickup, carDropoff, carPickupDate, carPickupTime, carDropoffDate, carDropoffTime,
    multiCitySegments, onSearch,
    seatFilter, transmission, fuelType, airConditioning, unlimitedMileage, extras,
    driverAged3065, dropOffDifferent,
  ]);

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
          <p className="text-xs mt-2">Loading destinations...</p>
        </div>
      ) : hotelSuggestions.length === 0 ? (
        <div className="px-4 py-4 text-center text-gray-500 text-sm">No destinations found</div>
      ) : (
        hotelSuggestions.map((dest, idx) => (
          <button
            key={`${dest.cityCode}-${dest.name}-${idx}`}
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
            onClick={() => handleHotelSelect(dest)}
          >
            <div className="flex items-center gap-3">
              {dest.image && (
                <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden">
                  <img src={dest.image} alt={dest.city} className="w-full h-full object-cover" />
                </div>
              )}
              {!dest.image && (
                <div className="flex-shrink-0 w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-sm font-bold">
                  {dest.cityCode}
                </div>
              )}
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

  // ✅ Render Multi-City trip type selector
  const renderTripTypeSelector = useCallback(() => (
    <div className="flex flex-col gap-1.5 min-w-[100px]">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TRIP TYPE</span>
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 flex-wrap">
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
        {/* ✅ ADD MULTI-CITY OPTION */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="tripType"
            checked={tripType === 'multi-city'}
            onChange={() => setTripType('multi-city')}
            className="w-3.5 h-3.5 text-[#33a8da] focus:ring-[#33a8da]"
          />
          <span className="text-xs font-medium text-gray-700">Multi-City</span>
        </label>
      </div>
    </div>
  ), [tripType]);

  // ✅ Render Multi-City segments
  const renderMultiCitySegments = useCallback(() => (
    <div className="w-full space-y-3">
      {multiCitySegments.map((segment, index) => (
        <div key={segment.id} className="flex items-start gap-3 flex-wrap lg:flex-nowrap">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#33a8da]/10 text-[#33a8da] font-bold text-xs flex-shrink-0 mt-1">
            {index + 1}
          </div>
          
          <div className="flex-1 min-w-[120px] relative">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">FROM</label>
            <input
              type="text"
              value={segment.from}
              onChange={(e) => handleSegmentFromChange(segment.id, e.target.value)}
              onFocus={() => {
                setShowSegmentFromDropdown(prev => ({ ...prev, [segment.id]: true }));
              }}
              placeholder="Lagos"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
            {showSegmentFromDropdown[segment.id] && renderDropdown(
              segmentFromSuggestions[segment.id] || [],
              (airport) => handleSegmentAirportSelect(segment.id, airport, 'from'),
              loadingSuggestions
            )}
          </div>

          <div className="flex-1 min-w-[120px] relative">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">TO</label>
            <input
              type="text"
              value={segment.to}
              onChange={(e) => handleSegmentToChange(segment.id, e.target.value)}
              onFocus={() => {
                setShowSegmentToDropdown(prev => ({ ...prev, [segment.id]: true }));
              }}
              placeholder="London"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
            {showSegmentToDropdown[segment.id] && renderDropdown(
              segmentToSuggestions[segment.id] || [],
              (airport) => handleSegmentAirportSelect(segment.id, airport, 'to'),
              loadingSuggestions
            )}
          </div>

          <div className="flex-1 min-w-[130px]">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">DATE</label>
            <input
              type="date"
              value={segment.date}
              onChange={(e) => handleSegmentDateChange(segment.id, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
          </div>

          {multiCitySegments.length > 2 && (
            <div className="flex flex-col gap-1.5 pt-5">
              <button
                type="button"
                onClick={() => removeSegment(segment.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}
      
      <div className="flex justify-start">
        <button
          type="button"
          onClick={addSegment}
          className="text-[#33a8da] text-sm font-medium hover:underline flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Segment
        </button>
      </div>
    </div>
  ), [multiCitySegments, showSegmentFromDropdown, showSegmentToDropdown, segmentFromSuggestions, segmentToSuggestions, loadingSuggestions, handleSegmentFromChange, handleSegmentToChange, handleSegmentDateChange, handleSegmentAirportSelect, renderDropdown, addSegment, removeSegment]);

  // ✅ Render passenger and cabin class dropdown — supports 'flight' and 'hotel' modes
  const renderPassengerDropdown = useCallback((mode: 'flight' | 'hotel' = 'flight') => {
    const isHotel = mode === 'hotel';

    // Labels differ per mode
    const triggerLabel = isHotel ? 'GUESTS' : 'PASSENGER';
    const triggerText = isHotel
      ? `${passengers.adults} Adult${passengers.adults > 1 ? 's' : ''}` +
        (passengers.children > 0 ? `, ${passengers.children} Child${passengers.children > 1 ? 'ren' : ''}` : '') +
        (passengers.infants > 0 ? `, ${passengers.infants} Infant${passengers.infants > 1 ? 's' : ''}` : '')
      : passengerDisplayText;

    return (
      <div className="min-w-[160px] relative" ref={passengerDropdownRef}>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          {triggerLabel}
        </label>
        <button
          type="button"
          onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white text-left flex justify-between items-center"
        >
          <span>{triggerText}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showPassengerDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-4 min-w-[280px]">
            {/* Adults — always shown */}
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

            {/* Children — always shown */}
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

            {/* Infants — FLIGHTS ONLY (Amadeus hotels don't support infants in search) */}
            {!isHotel && (
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
            )}

            {/* Cabin Class — FLIGHTS ONLY */}
            {!isHotel && (
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
            )}

            <button type="button" onClick={() => setShowPassengerDropdown(false)} className="w-full mt-3 bg-[#33a8da] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2c98c7] transition">
              Done
            </button>
          </div>
        )}
      </div>
    );
  }, [showPassengerDropdown, passengerDisplayText, passengers.adults, passengers.children, passengers.infants, cabinClass, updatePassengers]);
  // ✅ Render Flight Compact with Multi-City support
  const renderFlightCompact = useMemo(() => (
    <div className="flex flex-col gap-4">
      {/* Trip Type Selector + Passenger + Search Button */}
      <div className="flex items-start gap-3 flex-wrap lg:flex-nowrap">
        {renderTripTypeSelector()}
        
        {tripType !== 'multi-city' && (
          <>
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
          </>
        )}

{renderPassengerDropdown('flight')}

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-transparent uppercase tracking-wider">.</span>
          <button type="submit" disabled={loading} className="bg-[#33a8da] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#2c98c7] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap">
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {/* ✅ Multi-City Segments (shown when tripType is multi-city) */}
      {tripType === 'multi-city' && (
        <div className="mt-2 pt-4 border-t border-gray-100">
          {renderMultiCitySegments()}
        </div>
      )}
    </div>
  ), [tripType, flightFrom, flightTo, flightDate, returnDate, showFromDropdown, showToDropdown, fromSuggestions, toSuggestions, loadingSuggestions, showPassengerDropdown, passengerDisplayText, passengers.adults, passengers.children, passengers.infants, cabinClass, loading, handleFromChange, handleToChange, handleAirportSelect, renderDropdown, renderTripTypeSelector, renderPassengerDropdown, renderMultiCitySegments, popularAirports]);

  const renderHotelCompact = useMemo(() => (
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

      {renderPassengerDropdown('hotel')}

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-transparent uppercase tracking-wider">.</span>
        <button type="submit" disabled={loading || !hotelLocation || !checkIn || !checkOut} className="bg-[#33a8da] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#2c98c7] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap">
          {loading ? '...' : 'Search'}
        </button>
      </div>
    </div>
    ), [
      hotelLocation, checkIn, checkOut, guests,
      showHotelDropdown, loading,
      handleHotelChange, renderHotelDropdown, popularHotelDestinations,
      // ✅ Required for passenger dropdown to re-render
      renderPassengerDropdown,
      showPassengerDropdown,
      passengers.adults,
      passengers.children,
      passengers.infants,
    ]);

    const renderCarCompact = useMemo(() => (
      <div className="space-y-3">
        {/* ===== MAIN SEARCH BAR ===== */}
        <div className="flex items-start gap-3 flex-wrap lg:flex-nowrap">
    
          {/* Pickup Location */}
          <div className="flex-1 min-w-[180px] relative" ref={carPickupRef}>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              PICK-UP
            </label>
            <input
              type="text"
              value={carPickup}
              onChange={(e) => handleCarPickupChange(e.target.value)}
              onFocus={() => {
                if (carPickup.length < 2) setShowCarPickupDropdown(true);
              }}
              placeholder="Airport, city, or station"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
            {showCarPickupDropdown && renderDropdown(
              carPickupSuggestions,
              (airport) => {
                const displayValue = `${airport.code} - ${airport.city}, ${airport.country}`;
                setCarPickup(displayValue);
                setShowCarPickupDropdown(false);
                if (!dropOffDifferent) setCarDropoff(displayValue);
              },
              loadingCarSuggestions
            )}
          </div>
    
          {/* Pickup Date */}
          <div className="flex-1 min-w-[130px]">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              PICK-UP DATE
            </label>
            <input
              type="date"
              value={carPickupDate}
              onChange={(e) => setCarPickupDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
          </div>
    
          {/* Pickup Time */}
          <div className="flex-1 min-w-[110px]">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              TIME
            </label>
            <input
              type="time"
              value={carPickupTime}
              onChange={(e) => setCarPickupTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
          </div>
    
          {/* Dropoff Date */}
          <div className="flex-1 min-w-[130px]">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              DROP-OFF DATE
            </label>
            <input
              type="date"
              min={carPickupDate}
              value={carDropoffDate}
              onChange={(e) => setCarDropoffDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
          </div>
    
          {/* Dropoff Time */}
          <div className="flex-1 min-w-[110px]">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              TIME
            </label>
            <input
              type="time"
              value={carDropoffTime}
              onChange={(e) => setCarDropoffTime(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33a8da] focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-gray-50 hover:bg-white"
            />
          </div>
    
          {/* Search Button */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-transparent uppercase tracking-wider">.</span>
            <button
              type="submit"
              disabled={loading || !carPickup || (dropOffDifferent && !carDropoff) || !carPickupDate || !carDropoffDate}
              className="bg-[#33a8da] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#2c98c7] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap"
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>
        </div>
    
        {/* ===== Conditional Drop-off Location (only if different) ===== */}
        {dropOffDifferent && (
          <div className="relative">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              DROP-OFF LOCATION
            </label>
            <input
              type="text"
              value={carDropoff}
              onChange={(e) => handleCarDropoffChange(e.target.value)}
              onFocus={() => {
                if (carDropoff.length < 2) setShowCarDropoffDropdown(true);
              }}
              placeholder="Airport, city, or station"
              className="w-full px-3 py-2 text-sm border border-[#33a8da] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 transition-all bg-white"
            />
            {showCarDropoffDropdown && renderDropdown(
              carDropoffSuggestions,
              (airport) => {
                setCarDropoff(`${airport.code} - ${airport.city}, ${airport.country}`);
                setShowCarDropoffDropdown(false);
              },
              loadingCarSuggestions
            )}
          </div>
        )}
    
        {/* ===== SUB BAR: Checkboxes + Quick Filters ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-5">
            {/* Drop car off at different location */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                dropOffDifferent ? 'bg-[#33a8da] border-[#33a8da]' : 'border-gray-400 group-hover:border-gray-600'
              }`}>
                {dropOffDifferent && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={dropOffDifferent}
                onChange={(e) => {
                  setDropOffDifferent(e.target.checked);
                  if (!e.target.checked) setCarDropoff(carPickup);
                }}
                className="hidden"
              />
              <span className="text-xs font-medium text-gray-600">
                Drop car off at different location
              </span>
            </label>
    
            {/* Driver aged 30-65 */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                driverAged3065 ? 'bg-[#33a8da] border-[#33a8da]' : 'border-gray-400 group-hover:border-gray-600'
              }`}>
                {driverAged3065 && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={driverAged3065}
                onChange={(e) => setDriverAged3065(e.target.checked)}
                className="hidden"
              />
              <span className="text-xs font-medium text-gray-600">
                Driver aged 30 – 65?
              </span>
            </label>
          </div>
    
          {/* Quick filters button */}
          <button
            type="button"
            onClick={() => setShowQuickFilters(true)}
            className="flex items-center gap-1.5 text-[#33a8da] hover:text-[#2c98c7] font-semibold text-xs transition group"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Quick filters</span>
            {(seatFilter || transmission !== 'ANY' || fuelType !== 'ANY' || airConditioning || unlimitedMileage || Object.values(extras).some(Boolean)) && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#33a8da] animate-pulse"></span>
            )}
          </button>
        </div>
    
        {/* ===== QUICK FILTERS MODAL ===== */}
        {showQuickFilters && (
          <div
            className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-6 overflow-y-auto bg-black/40 backdrop-blur-sm"
            onClick={() => setShowQuickFilters(false)}
          >
            <div
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-auto sm:my-8 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-white flex items-start justify-between p-6 pb-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Quick filters</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Powered by Ebony Bruce Travels · Fine-tune your results
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickFilters(false)}
                  className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
    
              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
    
                {/* Number of seats */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Number of seats
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '2–4 seats', value: 4 },
                      { label: '5 seats',   value: 5 },
                      { label: '6+ seats',  value: 7 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSeatFilter(seatFilter === opt.value ? null : opt.value)}
                        className={`py-3 px-3 rounded-full border text-xs font-semibold transition ${
                          seatFilter === opt.value
                            ? 'border-[#33a8da] bg-[#33a8da]/10 text-[#33a8da] ring-2 ring-[#33a8da]'
                            : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
    
                {/* Transmission */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Transmission
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(['ANY', 'AUTOMATIC', 'MANUAL'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTransmission(opt)}
                        className={`py-2.5 px-3 rounded-full border text-xs font-semibold transition ${
                          transmission === opt
                            ? 'border-[#33a8da] bg-[#33a8da]/10 text-[#33a8da] ring-2 ring-[#33a8da]'
                            : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {opt === 'ANY' ? 'Any' : opt.charAt(0) + opt.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
    
                {/* Fuel Type */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Fuel type
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(['ANY', 'PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFuelType(opt)}
                        className={`py-2 px-4 rounded-full border text-xs font-semibold transition ${
                          fuelType === opt
                            ? 'border-[#33a8da] bg-[#33a8da]/10 text-[#33a8da] ring-2 ring-[#33a8da]'
                            : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {opt === 'ANY' ? 'Any' : opt.charAt(0) + opt.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
    
                {/* Popular Extras */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Popular extras
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Only show rental companies with these extras available
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { key: 'additionalDriver', label: 'Additional driver', icon: '👤' },
                      { key: 'infantSeat',       label: 'Infant car seat',   icon: '👶' },
                      { key: 'boosterSeat',      label: 'Booster seat',      icon: '🧒' },
                      { key: 'carSeat',          label: 'Child car seat',    icon: '🪑' },
                      { key: 'gps',              label: 'GPS navigation',    icon: '🗺️' },
                      { key: 'wifi',             label: 'Wi-Fi hotspot',     icon: '📶' },
                    ].map((extra) => (
                      <button
                        key={extra.key}
                        type="button"
                        onClick={() => setExtras(prev => ({ ...prev, [extra.key]: !prev[extra.key as keyof typeof prev] }))}
                        className={`py-2.5 px-4 rounded-full border text-xs font-semibold transition flex items-center gap-2 ${
                          extras[extra.key as keyof typeof extras]
                            ? 'border-[#33a8da] bg-[#33a8da]/10 text-[#33a8da] ring-2 ring-[#33a8da]'
                            : 'border-gray-300 text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span>{extra.icon}</span>
                        {extra.label}
                      </button>
                    ))}
                  </div>
                </div>
    
                {/* Toggles */}
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  {[
                    { label: 'Automatic transmission only', value: transmission === 'AUTOMATIC', setter: () => setTransmission(transmission === 'AUTOMATIC' ? 'ANY' : 'AUTOMATIC') },
                    { label: 'Air conditioning',            value: airConditioning,             setter: () => setAirConditioning(!airConditioning) },
                    { label: 'Unlimited mileage',           value: unlimitedMileage,            setter: () => setUnlimitedMileage(!unlimitedMileage) },
                  ].map((toggle) => (
                    <div key={toggle.label} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {toggle.label}
                      </span>
                      <button
                        type="button"
                        onClick={toggle.setter}
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          toggle.value ? 'bg-[#33a8da]' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                          toggle.value ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
    
              {/* Footer */}
              <div className="bg-white flex items-center justify-between gap-4 p-6 pt-4 border-t border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSeatFilter(null);
                    setTransmission('ANY');
                    setFuelType('ANY');
                    setAirConditioning(false);
                    setUnlimitedMileage(false);
                    setExtras({ additionalDriver: false, infantSeat: false, boosterSeat: false, carSeat: false, gps: false, wifi: false });
                  }}
                  className="text-[#33a8da] hover:text-[#2c98c7] font-semibold text-sm px-4 py-2.5"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickFilters(false)}
                  className="flex-1 bg-[#33a8da] hover:bg-[#2c98c7] text-white font-bold text-sm py-3 px-6 rounded-lg transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    ), [
      // Deps
      carPickup, carDropoff, carPickupDate, carPickupTime, carDropoffDate, carDropoffTime,
      showCarPickupDropdown, showCarDropoffDropdown,
      carPickupSuggestions, carDropoffSuggestions, loadingCarSuggestions, loading,
      dropOffDifferent, driverAged3065, showQuickFilters,
      seatFilter, transmission, fuelType, airConditioning, unlimitedMileage, extras,
      handleCarPickupChange, handleCarDropoffChange, renderDropdown,
    ]);
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
      {activeTab === 'flights' && renderFlightCompact}
      {activeTab === 'hotels' && renderHotelCompact}
      {activeTab === 'cars' && renderCarCompact}
    </form>
  );
};

export default CompactSearchBox;