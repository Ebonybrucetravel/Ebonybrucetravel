'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCityCode } from '../lib/api'; // Import the city code helper

interface Segment {
  from: string;
  to: string;
  date: string;
}

interface Travellers {
  adults: number;
  children: number;
  infants: number;
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

interface SearchBoxProps {
  onSearch: (data: any) => void;
  loading: boolean;
  activeTab?: 'flights' | 'hotels' | 'cars';
  onTabChange?: (tab: 'flights' | 'hotels' | 'cars') => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, loading, activeTab: activeTabProp, onTabChange }) => {
  const { t, currency } = useLanguage();
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'cars'>(activeTabProp || 'flights');

  // Synchronize internal activeTab with the prop from the navbar
  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);
  
  // Flight Specific State
  const [tripType, setTripType] = useState<'round-trip' | 'one-way' | 'multi-city'>('round-trip');
  const [cabinClass, setCabinClass] = useState('economy');
  const [showCabinDropdown, setShowCabinDropdown] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [stopsFilter, setStopsFilter] = useState('Any');
  const [maxPrice, setMaxPrice] = useState(2000);
  const [segments, setSegments] = useState<Segment[]>([
    { from: 'LOS - Lagos, Nigeria', to: 'ABV - Abuja, Nigeria', date: '' }
  ]);
  const [returnDate, setReturnDate] = useState('');
  
  // Autocomplete state
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<Airport[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Airport[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  
  // Hotel Specific State
  const [hotelLocation, setHotelLocation] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [rooms, setRooms] = useState(1);
  const [showHotelLocationDropdown, setShowHotelLocationDropdown] = useState(false);
  const [hotelLocationSuggestions, setHotelLocationSuggestions] = useState<HotelDestination[]>([]);
  const [loadingHotelSuggestions, setLoadingHotelSuggestions] = useState(false);

  // Car Rental State
  const [carPickUp, setCarPickUp] = useState('');
  const [carPickUpDate, setCarPickUpDate] = useState('');
  const [carPickUpTime, setCarPickUpTime] = useState('10:00');
  const [carDropOffDate, setCarDropOffDate] = useState('');
  const [carDropOffTime, setCarDropOffTime] = useState('10:00');
  const [differentLocation, setDifferentLocation] = useState(false);
  const [driverAged, setDriverAged] = useState(true);
  
  // Common State
  const [travellers, setTravellers] = useState<Travellers>({ adults: 1, children: 0, infants: 0 });
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  const travellerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const cabinRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const hotelLocationRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  // Popular hotel destinations
  const popularHotelDestinations: HotelDestination[] = [
    { name: 'Lagos', city: 'Lagos', country: 'Nigeria', cityCode: 'LOS', image: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGFnb3N8ZW58MHx8MHx8fDA%3D' },
    { name: 'London', city: 'London', country: 'United Kingdom', cityCode: 'LON', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400' },
    { name: 'New York', city: 'New York', country: 'USA', cityCode: 'NYC', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400' },
    { name: 'Dubai', city: 'Dubai', country: 'UAE', cityCode: 'DXB', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400' },
    { name: 'Paris', city: 'Paris', country: 'France', cityCode: 'PAR', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400' },
    { name: 'Tokyo', city: 'Tokyo', country: 'Japan', cityCode: 'TYO', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=400' },
    { name: 'Singapore', city: 'Singapore', country: 'Singapore', cityCode: 'SIN', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=400' },
    { name: 'Cape Town', city: 'Cape Town', country: 'South Africa', cityCode: 'CPT', image: 'https://images.unsplash.com/photo-1596394516093-9ba7b6146eba?auto=format&fit=crop&q=80&w=400' },
    { name: 'Accra', city: 'Accra', country: 'Ghana', cityCode: 'ACC', image: 'https://images.unsplash.com/photo-1587496679742-bad502958c4a?auto=format&fit=crop&q=80&w=400' },
  ];

  // Popular airports for the whole world (updated with more airports)
  const popularAirports: Airport[] = [
    // Africa
    { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', type: 'airport' },
    { code: 'ABV', name: 'Nnamdi Azikiwe International Airport', city: 'Abuja', country: 'Nigeria', type: 'airport' },
    { code: 'ACC', name: 'Kotoka International Airport', city: 'Accra', country: 'Ghana', type: 'airport' },
    { code: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya', type: 'airport' },
    { code: 'JNB', name: 'OR Tambo International Airport', city: 'Johannesburg', country: 'South Africa', type: 'airport' },
    { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa', type: 'airport' },
    { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', type: 'airport' },
    { code: 'ADD', name: 'Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia', type: 'airport' },
    { code: 'DAR', name: 'Julius Nyerere International Airport', city: 'Dar es Salaam', country: 'Tanzania', type: 'airport' },
    
    // Middle East
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', type: 'airport' },
    { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'UAE', type: 'airport' },
    { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', type: 'airport' },
    { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', type: 'airport' },
    { code: 'SAW', name: 'Sabiha Gökçen International Airport', city: 'Istanbul', country: 'Turkey', type: 'airport' },
    
    // Europe
    { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', type: 'airport' },
    { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', type: 'airport' },
    { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', type: 'airport' },
    { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', type: 'airport' },
    { code: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', type: 'airport' },
    { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', type: 'airport' },
    
    // North America
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', type: 'airport' },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', type: 'airport' },
    { code: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'USA', type: 'airport' },
    { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', type: 'airport' },
    { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', type: 'airport' },
    { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', type: 'airport' },
    
    // South America
    { code: 'GRU', name: 'Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', type: 'airport' },
    { code: 'GIG', name: 'Galeão International Airport', city: 'Rio de Janeiro', country: 'Brazil', type: 'airport' },
    { code: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina', type: 'airport' },
    { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru', type: 'airport' },
    
    // Asia
    { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan', type: 'airport' },
    { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', type: 'airport' },
    { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', type: 'airport' },
    { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', type: 'airport' },
    { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'China', type: 'airport' },
    { code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore', type: 'airport' },
    { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', type: 'airport' },
    { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India', type: 'airport' },
    { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India', type: 'airport' },
    { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', type: 'airport' },
    
    // Australia/Oceania
    { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', type: 'airport' },
    { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', type: 'airport' },
    { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', type: 'airport' },
  ];

  const fetchAirportSuggestions = useCallback(async (query: string): Promise<Airport[]> => {
    if (!query || query.length < 2) {
      return popularAirports.slice(0, 8);
    }
    
    try {
      setLoadingSuggestions(true);
      
      // Try using the real API for suggestions
      const response = await fetch(
        `https://ebony-bruce-production.up.railway.app/api/v1/bookings/flights/places/suggestions?query=${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
          // Transform API response to your Airport interface
          const suggestions: Airport[] = result.data
            .map((place: any) => ({
              code: place.iata_code || place.code || '',
              name: place.name || '',
              city: place.city_name || place.city || place.name || '',
              country: place.country_name || place.country || '',
              type: place.type === 'city' ? 'city' : 'airport'
            }))
            .filter((place: Airport) => place.code && place.name); // Filter valid results
          
          // Remove duplicates based on code + city combination
          const uniqueSuggestions = suggestions.filter(
            (airport, index, self) =>
              index === self.findIndex((a) => 
                a.code === airport.code && a.city === airport.city
              )
          );
          
          console.log('Unique API suggestions:', uniqueSuggestions.length);
          return uniqueSuggestions.slice(0, 12);
        }
      }
      
      // Fallback to local search if API fails
      console.log('Using fallback airport search');
      const lowerQuery = query.toLowerCase();
      const filtered = popularAirports.filter(airport => 
        airport.code.toLowerCase().includes(lowerQuery) ||
        airport.city.toLowerCase().includes(lowerQuery) ||
        airport.country.toLowerCase().includes(lowerQuery) ||
        airport.name.toLowerCase().includes(lowerQuery)
      );
      
      // Remove duplicates from local search too
      const uniqueFiltered = filtered.filter(
        (airport, index, self) =>
          index === self.findIndex((a) => 
            a.code === airport.code && a.city === airport.city
          )
      );
      
      return uniqueFiltered.slice(0, 10);
      
    } catch (error) {
      console.error('Error fetching airport suggestions:', error);
      // Fallback to local search
      const lowerQuery = query.toLowerCase();
      const filtered = popularAirports.filter(airport => 
        airport.code.toLowerCase().includes(lowerQuery) ||
        airport.city.toLowerCase().includes(lowerQuery) ||
        airport.country.toLowerCase().includes(lowerQuery) ||
        airport.name.toLowerCase().includes(lowerQuery)
      );
      
      // Remove duplicates
      const uniqueFiltered = filtered.filter(
        (airport, index, self) =>
          index === self.findIndex((a) => 
            a.code === airport.code && a.city === airport.city
          )
      );
      
      return uniqueFiltered.slice(0, 10);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Fetch hotel location suggestions
  const fetchHotelLocationSuggestions = useCallback(async (query: string): Promise<HotelDestination[]> => {
    if (!query || query.length < 2) {
      return popularHotelDestinations.slice(0, 6);
    }
    
    try {
      setLoadingHotelSuggestions(true);
      
      // Filter from popular destinations
      const lowerQuery = query.toLowerCase();
      const filtered = popularHotelDestinations.filter(dest => 
        dest.city.toLowerCase().includes(lowerQuery) ||
        dest.country.toLowerCase().includes(lowerQuery) ||
        dest.name.toLowerCase().includes(lowerQuery) ||
        dest.cityCode.toLowerCase().includes(lowerQuery)
      );
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      return filtered.length > 0 ? filtered.slice(0, 8) : [];
      
    } catch (error) {
      console.error('Error fetching hotel suggestions:', error);
      return [];
    } finally {
      setLoadingHotelSuggestions(false);
    }
  }, []);

  // Handle From input changes
  const handleFromInputChange = useCallback(async (value: string, index: number = 0) => {
    const newSegments = [...segments];
    newSegments[index].from = value;
    setSegments(newSegments);
    setActiveSegmentIndex(index);
    
    if (value.length >= 1) {
      const suggestions = await fetchAirportSuggestions(value);
      setFromSuggestions(suggestions);
      setShowFromDropdown(true);
    } else {
      setFromSuggestions(popularAirports.slice(0, 8));
      setShowFromDropdown(value.length > 0);
    }
  }, [segments, fetchAirportSuggestions]);

  // Handle To input changes
  const handleToInputChange = useCallback(async (value: string, index: number = 0) => {
    const newSegments = [...segments];
    newSegments[index].to = value;
    setSegments(newSegments);
    setActiveSegmentIndex(index);
    
    if (value.length >= 1) {
      const suggestions = await fetchAirportSuggestions(value);
      setToSuggestions(suggestions);
      setShowToDropdown(true);
    } else {
      setToSuggestions(popularAirports.slice(0, 8));
      setShowToDropdown(value.length > 0);
    }
  }, [segments, fetchAirportSuggestions]);

  // Handle hotel location input changes
  const handleHotelLocationChange = useCallback(async (value: string) => {
    setHotelLocation(value);
    
    if (value.length >= 1) {
      const suggestions = await fetchHotelLocationSuggestions(value);
      setHotelLocationSuggestions(suggestions);
      setShowHotelLocationDropdown(true);
    } else {
      setHotelLocationSuggestions(popularHotelDestinations.slice(0, 6));
      setShowHotelLocationDropdown(value.length > 0);
    }
  }, [fetchHotelLocationSuggestions]);

// Update the handleAirportSelect function to handle duplicates
const handleAirportSelect = useCallback((airport: Airport, type: 'from' | 'to', index: number = 0) => {
  const newSegments = [...segments];
  const displayValue = `${airport.code} - ${airport.city}, ${airport.country}`;
  
  if (type === 'from') {
    newSegments[index].from = displayValue;
    setShowFromDropdown(false);
  } else {
    newSegments[index].to = displayValue;
    setShowToDropdown(false);
  }
  
  setSegments(newSegments);
  
  // Clear suggestions to avoid duplicates
  if (type === 'from') {
    setFromSuggestions([]);
  } else {
    setToSuggestions([]);
  }
}, [segments]);

  // Handle hotel destination selection
  const handleHotelDestinationSelect = useCallback((destination: HotelDestination) => {
    setHotelLocation(`${destination.city}, ${destination.country}`);
    setShowHotelLocationDropdown(false);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (travellerRef.current && !travellerRef.current.contains(event.target as Node)) {
        setShowTravellerDropdown(false);
      }
      if (roomRef.current && !roomRef.current.contains(event.target as Node)) {
        setShowRoomDropdown(false);
      }
      if (cabinRef.current && !cabinRef.current.contains(event.target as Node)) {
        setShowCabinDropdown(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFiltersDropdown(false);
      }
      if (fromRef.current && !fromRef.current.contains(event.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toRef.current && !toRef.current.contains(event.target as Node)) {
        setShowToDropdown(false);
      }
      if (hotelLocationRef.current && !hotelLocationRef.current.contains(event.target as Node)) {
        setShowHotelLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize dates
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 4);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    setSegments(prev => {
      const newSegments = [...prev];
      newSegments[0].date = tomorrowStr;
      return newSegments;
    });
    setReturnDate(nextWeekStr);
    setCheckInDate(tomorrowStr);
    setCheckOutDate(nextWeekStr);
    setCarPickUpDate(tomorrowStr);
    setCarDropOffDate(nextWeekStr);
  }, []);

  useEffect(() => {
    if (segments[0].date && returnDate && segments[0].date > returnDate) {
      setReturnDate(segments[0].date);
    }
  }, [segments[0].date, returnDate]);

  useEffect(() => {
    if (checkInDate && checkOutDate && checkInDate > checkOutDate) {
      setCheckOutDate(checkInDate);
    }
  }, [checkInDate, checkOutDate]);

  const handleTripTypeChange = (type: 'round-trip' | 'one-way' | 'multi-city') => {
    setTripType(type);
    if (type === 'multi-city') {
      if (segments.length === 1) {
        const newSegmentDate = new Date(segments[0].date);
        newSegmentDate.setDate(newSegmentDate.getDate() + 1);
        setSegments([
          ...segments,
          { from: '', to: '', date: newSegmentDate.toISOString().split('T')[0] }
        ]);
      }
    } else {
      setSegments([segments[0]]);
    }
  };

  const handleLocalTabChange = (tab: 'flights' | 'hotels' | 'cars') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const addSegment = () => {
    if (segments.length < 4) {
      const lastSegmentDate = new Date(segments[segments.length - 1].date);
      lastSegmentDate.setDate(lastSegmentDate.getDate() + 1);
      setSegments([
        ...segments,
        { from: '', to: '', date: lastSegmentDate.toISOString().split('T')[0] }
      ]);
    }
  };

  const removeSegment = (index: number) => {
    if (segments.length > 1) {
      setSegments(segments.filter((_, i) => i !== index));
    }
  };

  const handleSegmentChange = (index: number, field: keyof Segment, value: string) => {
    const newSegments = [...segments];
    newSegments[index][field] = value;
    setSegments(newSegments);
  };

  const handleSwap = (index: number) => {
    const newSegments = [...segments];
    const temp = newSegments[index].from;
    newSegments[index].from = newSegments[index].to;
    newSegments[index].to = temp;
    setSegments(newSegments);
  };

  const updateTraveller = (type: keyof Travellers, increment: boolean) => {
    setTravellers(prev => {
      const newValue = increment ? prev[type] + 1 : Math.max(0, prev[type] - 1);
      if (type === 'adults' && newValue < 1) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  const updateRooms = (increment: boolean) => {
    setRooms(prev => increment ? Math.min(5, prev + 1) : Math.max(1, prev - 1));
  };

  const getTravellerSummary = () => {
    const parts = [];
    if (travellers.adults > 0) parts.push(`${travellers.adults} Adult${travellers.adults > 1 ? 's' : ''}`);
    if (travellers.children > 0) parts.push(`${travellers.children} Child${travellers.children > 1 ? 'ren' : ''}`);
    if (travellers.infants > 0) parts.push(`${travellers.infants} Infant${travellers.infants > 1 ? 's' : ''}`);
    const total = travellers.adults + travellers.children + travellers.infants;
    return `${total} Passenger${total > 1 ? 's' : ''} (${parts.join(', ')})`;
  };

  const getHotelGuestSummary = () => {
    const totalGuests = travellers.adults + travellers.children;
    return `${totalGuests} Guest${totalGuests > 1 ? 's' : ''}, ${rooms} Room${rooms > 1 ? 's' : ''}`;
  };

// Replace the extractAirportCode function with this more robust version:
const extractAirportCode = (displayValue: string): string => {
  if (!displayValue) return '';
  
  console.log('Extracting code from:', displayValue);
  
  // Handle multiple formats:
  // 1. "LOS - Lagos, Nigeria" → Extract "LOS"
  // 2. "LOS" → Return "LOS"
  // 3. "Lagos" → Try to find matching airport code
  
  // Try to extract IATA code (3 uppercase letters at start)
  const iataMatch = displayValue.match(/^([A-Z]{3})\b/);
  if (iataMatch) {
    console.log('Found IATA code:', iataMatch[1]);
    return iataMatch[1];
  }
  
  // Try to find IATA code anywhere in the string
  const anyIataMatch = displayValue.match(/\b([A-Z]{3})\b/);
  if (anyIataMatch) {
    console.log('Found IATA code in string:', anyIataMatch[1]);
    return anyIataMatch[1];
  }
  
  // If no IATA code found, try to match with popular airports
  const lowerValue = displayValue.toLowerCase();
  const matchedAirport = popularAirports.find(airport => 
    airport.city.toLowerCase().includes(lowerValue) ||
    airport.name.toLowerCase().includes(lowerValue)
  );
  
  if (matchedAirport) {
    console.log('Matched airport:', matchedAirport.code);
    return matchedAirport.code;
  }
  
  // Last resort: return first word
  const firstWord = displayValue.split(' ')[0];
  console.log('Using first word:', firstWord);
  return firstWord;
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (activeTab === 'flights') {
    // Extract airport codes with better logging
    const origin = extractAirportCode(segments[0].from);
    const destination = extractAirportCode(segments[0].to);
    
    console.log('🔍 Flight Search Details:');
    console.log('From (raw):', segments[0].from);
    console.log('To (raw):', segments[0].to);
    console.log('Origin (extracted):', origin);
    console.log('Destination (extracted):', destination);
    console.log('Departure Date:', segments[0].date);
    console.log('Return Date:', returnDate);
    console.log('Trip Type:', tripType);
    
    // Calculate total passengers
    const totalPassengers = travellers.adults + travellers.children + travellers.infants;
    
    // Convert stops filter to maxConnections
    let maxConnections: number | undefined;
    switch (stopsFilter) {
      case 'Non-stop':
        maxConnections = 0;
        break;
      case '1 Stop':
        maxConnections = 1;
        break;
      case '2+ Stops':
        maxConnections = 2;
        break;
      default:
        maxConnections = undefined; // Any = no filter
    }
    
    // Prepare the data in EXACT format the API expects
    const data: any = {
      origin: origin,
      destination: destination,
      departureDate: segments[0].date || today,
      passengers: totalPassengers,
      cabinClass: cabinClass.toLowerCase(),
      currency: currency.code || 'NGN',
    };
    
    // Add returnDate only for round-trip
    if (tripType === 'round-trip' && returnDate) {
      data.returnDate = returnDate;
    }
    
    // Add maxConnections only if specified
    if (maxConnections !== undefined) {
      data.maxConnections = maxConnections;
    }
    
    // Add maxPrice only if it's meaningful
    if (maxPrice > 0 && maxPrice < 10000) {
      data.maxPrice = maxPrice;
    }
    
    console.log('📦 Final API Payload:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    const errors = [];
    
    // Validate airport codes (should be 3-letter IATA codes)
    if (!origin || !/^[A-Z]{3}$/.test(origin)) {
      errors.push(`Invalid origin airport code: "${origin}". Please select from the suggestions.`);
    }
    
    if (!destination || !/^[A-Z]{3}$/.test(destination)) {
      errors.push(`Invalid destination airport code: "${destination}". Please select from the suggestions.`);
    }
    
    if (origin === destination) {
      errors.push('Origin and destination cannot be the same');
    }
    
    if (!segments[0].date) {
      errors.push('Please select a departure date');
    }
    
    if (tripType === 'round-trip' && !returnDate) {
      errors.push('Please select a return date for round-trip');
    }
    
    if (segments[0].date && returnDate && segments[0].date > returnDate) {
      errors.push('Return date cannot be before departure date');
    }
    
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }
    
    // For multi-city trips, need special handling
    if (tripType === 'multi-city') {
      alert('Multi-city search requires a different API endpoint or format. Using first segment for now.');
    }
    
    onSearch(data);
    
  } else if (activeTab === 'hotels') {
    // ... hotel code remains the same ...
  } else {
    // ... car rental code remains the same ...
  }
};

  const triggerPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try { 
      if ('showPicker' in HTMLInputElement.prototype) {
        (e.target as HTMLInputElement).showPicker(); 
      }
    } catch (err) { 
      (e.target as HTMLInputElement).focus(); 
    }
  };

  const renderTravellerDropdown = () => (
    showTravellerDropdown && (
      <div className="absolute top-full right-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">Adults</span><span className="text-[10px] text-gray-400 font-bold uppercase">12+</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateTraveller('adults', false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{travellers.adults}</span>
              <button type="button" onClick={() => updateTraveller('adults', true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">Children</span><span className="text-[10px] text-gray-400 font-bold uppercase">2-12</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateTraveller('children', false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{travellers.children}</span>
              <button type="button" onClick={() => updateTraveller('children', true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">Infants</span><span className="text-[10px] text-gray-400 font-bold uppercase">Under 2</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateTraveller('infants', false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{travellers.infants}</span>
              <button type="button" onClick={() => updateTraveller('infants', true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <button type="button" onClick={() => setShowTravellerDropdown(false)} className="w-full py-2.5 bg-[#33a8da] text-white rounded-lg font-bold text-sm hover:bg-[#2c98c7] transition-colors">Done</button>
        </div>
      </div>
    )
  );

  const renderRoomDropdown = () => (
    showRoomDropdown && (
      <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">Rooms</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateRooms(false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{rooms}</span>
              <button type="button" onClick={() => updateRooms(true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <button type="button" onClick={() => setShowRoomDropdown(false)} className="w-full py-2.5 bg-[#33a8da] text-white rounded-lg font-bold text-sm hover:bg-[#2c98c7] transition-colors">Done</button>
        </div>
      </div>
    )
  );

  const renderAirportDropdown = (suggestions: Airport[], type: 'from' | 'to', index: number = 0) => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50">
      {loadingSuggestions ? (
        <div className="px-4 py-3 text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="text-xs mt-2">Searching airports...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">
          No airports found. Try searching by city name or airport code.
        </div>
      ) : (
        <>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="text-xs font-bold text-gray-500">
              {suggestions.length} AIRPORT{suggestions.length !== 1 ? 'S' : ''} FOUND
            </div>
          </div>
          {suggestions.map((airport, idx) => (
            <button
              key={`${type}-${airport.code}-${index}-${airport.city}-${idx}-${airport.name}`}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 group"
              onClick={() => handleAirportSelect(airport, type, index)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold group-hover:bg-blue-200 transition-colors">
                    {airport.code}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{airport.city}, {airport.country}</div>
                  <div className="text-xs text-gray-500 truncate">{airport.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase">
                    {airport.type === 'city' ? 'CITY' : 'AIRPORT'}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="text-xs text-center text-gray-500">
              Select an airport or type more to search
            </div>
          </div>
        </>
      )}
    </div>
  );
  const renderHotelLocationDropdown = () => (
    showHotelLocationDropdown && (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50">
        {loadingHotelSuggestions ? (
          <div className="px-4 py-3 text-center text-gray-500">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da] mx-auto"></div>
            <p className="text-xs mt-2">Searching destinations...</p>
          </div>
        ) : hotelLocationSuggestions.length === 0 ? (
          <div className="px-4 py-3 text-center text-gray-500 text-sm">No destinations found. Try a different search.</div>
        ) : (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <div className="text-xs font-bold text-gray-500">POPULAR DESTINATIONS</div>
            </div>
            {hotelLocationSuggestions.map((dest) => (
              <button
                key={`hotel-${dest.cityCode}`}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                onClick={() => handleHotelDestinationSelect(dest)}
              >
                <div className="flex items-start gap-3">
                  {dest.image && (
                    <div className="flex-shrink-0">
                      <img 
                        src={dest.image} 
                        alt={dest.city}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">{dest.city}, {dest.country}</div>
                    <div className="text-xs text-gray-500 truncate">{dest.name}</div>
                  </div>
                  <div className="text-xs font-bold text-gray-400 px-2 py-1 bg-gray-100 rounded">
                    {dest.cityCode}
                  </div>
                </div>
              </button>
            ))}
            {hotelLocationSuggestions.length >= 6 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <div className="text-xs text-center text-gray-500">
                  Type more characters to search all destinations
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  );

  const renderFlightSegmentRow = (segment: Segment, index: number) => {
    const isFirst = index === 0;
    const isMultiCity = tripType === 'multi-city';
    const isRangeSelected = tripType === 'round-trip' && index === 0 && segment.date && returnDate;

    return (
      <div key={index} className="bg-[#33a8da] rounded-[12px] p-1 flex flex-col lg:flex-row items-stretch gap-1 mb-2 shadow-sm animate-in slide-in-from-left duration-200">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-1">
          {/* From / To Section with Autocomplete */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {/* From Input with Autocomplete */}
            <div className="relative" ref={index === activeSegmentIndex ? fromRef : null}>
              <div className="bg-white p-3 md:p-4 flex items-center gap-3 relative rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
                <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <div className="flex-1 relative">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none">From</label>
                  <input 
                    type="text" 
                    value={segment.from}
                    onChange={(e) => handleFromInputChange(e.target.value, index)}
                    onFocus={() => {
                      setActiveSegmentIndex(index);
                      if (segment.from.length < 2) {
                        setFromSuggestions(popularAirports.slice(0, 8));
                      }
                      setShowFromDropdown(true);
                      setShowToDropdown(false);
                    }}
                    className="w-full font-bold text-gray-900 focus:outline-none text-base bg-transparent p-0 pr-6" 
                    placeholder="City or airport code" 
                  />
                  {segment.from && (
                    <button 
                      type="button"
                      onClick={() => {
                        const newSegments = [...segments];
                        newSegments[index].from = '';
                        setSegments(newSegments);
                        setShowFromDropdown(false);
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => handleSwap(index)} className="absolute right-[-10px] sm:right-[-18px] top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-100 rounded-full p-1.5 shadow-sm hover:bg-gray-50 transition hidden sm:block">
                  <svg className="w-3 h-3 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L13 16M17 20L21 16" />
                  </svg>
                </button>
              </div>
              {showFromDropdown && activeSegmentIndex === index && renderAirportDropdown(fromSuggestions, 'from', index)}
            </div>

            {/* To Input with Autocomplete */}
            <div className="relative" ref={index === activeSegmentIndex ? toRef : null}>
              <div className="bg-white p-3 md:p-4 flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-gray-100 rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none">
                <svg className="w-6 h-6 text-[#33a8da] rotate-180 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <div className="flex-1 relative">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none">To</label>
                  <input 
                    type="text" 
                    value={segment.to}
                    onChange={(e) => handleToInputChange(e.target.value, index)}
                    onFocus={() => {
                      setActiveSegmentIndex(index);
                      if (segment.to.length < 2) {
                        setToSuggestions(popularAirports.slice(0, 8));
                      }
                      setShowToDropdown(true);
                      setShowFromDropdown(false);
                    }}
                    className="w-full font-bold text-gray-900 focus:outline-none text-base bg-transparent p-0 pr-6" 
                    placeholder="City or airport code" 
                  />
                  {segment.to && (
                    <button 
                      type="button"
                      onClick={() => {
                        const newSegments = [...segments];
                        newSegments[index].to = '';
                        setSegments(newSegments);
                        setShowToDropdown(false);
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              {showToDropdown && activeSegmentIndex === index && renderAirportDropdown(toSuggestions, 'to', index)}
            </div>
          </div>

          {/* Dates / Travellers Section */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div className={`p-3 md:p-4 flex items-center gap-3 relative cursor-pointer group hover:bg-gray-50 transition border-t sm:border-t-0 lg:border-l border-gray-100 ${isRangeSelected ? 'bg-blue-50/50' : 'bg-white'}`}>
              <svg className="w-6 h-6 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 flex gap-2 min-w-0">
                <div className="flex-1 min-w-0 relative h-10 flex flex-col justify-center">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none truncate">Depart</label>
                  <span className={`block font-bold text-xs md:text-sm leading-tight truncate ${segment.date ? 'text-gray-900' : 'text-gray-400'}`}>
                    {segment.date ? new Date(segment.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Select date'}
                  </span>
                  <input 
                    type="date" 
                    min={today} 
                    value={segment.date} 
                    onClick={triggerPicker} 
                    onChange={(e) => handleSegmentChange(index, 'date', e.target.value)} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20" 
                  />
                </div>
                {tripType === 'round-trip' && index === 0 && (
                  <div className="flex-1 min-w-0 border-l border-gray-100 pl-2 relative h-10 flex flex-col justify-center">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none truncate">Return</label>
                    <span className={`block font-bold text-xs md:text-sm leading-tight truncate ${returnDate ? 'text-gray-900' : 'text-gray-400'}`}>
                      {returnDate ? new Date(returnDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Select date'}
                    </span>
                    <input 
                      type="date" 
                      min={segment.date || today} 
                      value={returnDate} 
                      onClick={triggerPicker} 
                      onChange={(e) => setReturnDate(e.target.value)} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20" 
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white p-3 md:p-4 flex items-center gap-3 relative cursor-pointer group hover:bg-gray-50 transition border-t sm:border-t-0 sm:border-l border-gray-100 rounded-b-lg lg:rounded-r-lg" 
                 ref={isFirst ? travellerRef : null} 
                 onClick={() => isFirst && setShowTravellerDropdown(!showTravellerDropdown)}>
              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5 leading-none">Travellers</label>
                <span className="block font-bold text-gray-900 text-xs md:text-sm leading-tight truncate">{getTravellerSummary()}</span>
              </div>
              {isFirst && renderTravellerDropdown()}
              {isMultiCity && index > 0 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); removeSegment(index); }} className="absolute -right-3 -top-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-md z-30">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {isFirst && (
          <button type="submit" disabled={loading || !segment.from || !segment.to || !segment.date} className="w-full lg:w-auto bg-black text-white px-8 py-4 lg:py-5 font-bold text-lg rounded-xl lg:rounded-lg hover:bg-gray-900 transition active:scale-95 lg:ml-1 min-w-[140px] shadow-lg flex items-center justify-center mt-2 lg:mt-0 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Searching...
              </>
            ) : 'Search'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 md:px-4">
      <div className="bg-white rounded-2xl md:rounded-[24px] shadow-2xl overflow-visible">
        
        {/* Navigation Tabs - Optimized for Mobile */}
        <div className="flex items-center gap-4 md:gap-10 px-4 md:px-8 pt-4 md:pt-6 border-b border-gray-100 overflow-x-auto hide-scrollbar">
          {[
            { id: 'flights' as const, label: 'Flights', icon: <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /> },
            { id: 'hotels' as const, label: 'Hotels', icon: <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2z" /> },
            { id: 'cars' as const, label: 'Cars', icon: <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" /> }
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => handleLocalTabChange(tab.id)} className={`flex items-center gap-2 pb-3 md:pb-5 transition-all relative shrink-0 ${activeTab === tab.id ? 'text-[#33a8da]' : 'text-gray-400 hover:text-blue-500 font-bold'}`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
              <span className="text-sm md:text-lg font-bold tracking-tight">{tab.label}</span>
              {activeTab === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-[#33a8da] rounded-full"></div>}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8">
          {activeTab === 'flights' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  {(['round-trip', 'one-way', 'multi-city'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => handleTripTypeChange(opt)} className="flex items-center gap-2 group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${tripType === opt ? 'border-[#33a8da]' : 'border-gray-200 group-hover:border-gray-300'}`}>
                        {tripType === opt && <div className="w-2.5 h-2.5 bg-[#33a8da] rounded-full" />}
                      </div>
                      <span className={`text-xs md:text-sm font-bold capitalize transition-colors ${tripType === opt ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {opt.replace('-', ' ')}
                      </span>
                    </button>
                  ))}
                  <div className="flex items-center gap-2 md:gap-4 border-l border-gray-100 pl-4 h-8">
                    <div className="relative" ref={cabinRef}>
                      <button type="button" onClick={() => setShowCabinDropdown(!showCabinDropdown)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300 text-[10px] md:text-xs font-bold">
                        {cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1).replace('_', ' ')} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={3}/></svg>
                      </button>
                      {showCabinDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          {[
                            { label: 'Economy', value: 'economy' },
                            { label: 'Premium Economy', value: 'premium_economy' },
                            { label: 'Business', value: 'business' },
                            { label: 'First Class', value: 'first' }
                          ].map((cls) => (
                            <button 
                              key={cls.value} 
                              type="button" 
                              onClick={() => { 
                                setCabinClass(cls.value); 
                                setShowCabinDropdown(false); 
                              }} 
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              {cls.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="relative" ref={filtersRef}>
                      <button 
                        type="button" 
                        onClick={() => setShowFiltersDropdown(!showFiltersDropdown)} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] md:text-xs font-bold transition-all ${showFiltersDropdown ? 'border-[#33a8da] bg-blue-50 text-[#33a8da]' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        Filters
                      </button>
                      {showFiltersDropdown && (
                        <div className="absolute top-full right-0 lg:left-0 mt-2 w-64 md:w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Stops</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {['Any', 'Non-stop', '1 Stop', '2+ Stops'].map((stop) => (
                                  <button 
                                    key={stop} 
                                    type="button" 
                                    onClick={() => setStopsFilter(stop)} 
                                    className={`py-2 px-3 rounded-lg text-[10px] md:text-xs font-bold border transition-all ${stopsFilter === stop ? 'bg-[#33a8da] text-white border-[#33a8da]' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-200'}`}
                                  >
                                    {stop}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-end mb-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Price</h4>
                                <span className="text-xs font-black text-[#33a8da]">{currency.symbol}{maxPrice.toLocaleString()}</span>
                              </div>
                              <input 
                                type="range" 
                                min="100" 
                                max="10000" 
                                step="100"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#33a8da]"
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setShowFiltersDropdown(false)}
                              className="w-full py-2.5 bg-gray-900 text-white text-[10px] md:text-xs font-bold rounded-xl hover:bg-black transition-colors uppercase tracking-widest"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {segments.map((seg, idx) => renderFlightSegmentRow(seg, idx))}
                {tripType === 'multi-city' && segments.length < 4 && (
                  <button type="button" onClick={addSegment} className="flex items-center gap-2 text-[#33a8da] font-bold text-xs bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition shadow-sm border border-blue-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add Flight
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'hotels' && (
            <div className="flex flex-col lg:flex-row items-stretch gap-1 bg-[#33a8da] rounded-xl p-1">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-1">
                {/* Hotel Location with Autocomplete */}
                <div className="md:col-span-4 relative" ref={hotelLocationRef}>
                  <div className="bg-white p-3 md:p-4 flex items-center gap-3 rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
                    <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2z" /></svg>
                    <div className="flex-1 relative">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Destination</label>
                      <input 
                        type="text" 
                        value={hotelLocation} 
                        onChange={(e) => handleHotelLocationChange(e.target.value)}
                        onFocus={() => {
                          if (hotelLocation.length < 2) {
                            setHotelLocationSuggestions(popularHotelDestinations.slice(0, 6));
                          }
                          setShowHotelLocationDropdown(true);
                        }}
                        className="w-full font-bold text-gray-900 focus:outline-none text-sm md:text-base bg-transparent p-0 pr-6" 
                        placeholder="City, country, or landmark" 
                      />
                      {hotelLocation && (
                        <button 
                          type="button"
                          onClick={() => {
                            setHotelLocation('');
                            setShowHotelLocationDropdown(false);
                          }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  {showHotelLocationDropdown && renderHotelLocationDropdown()}
                </div>

                {/* Check-in Date */}
                <div className="md:col-span-3 bg-white p-3 md:p-4 flex items-center gap-3 relative border-t md:border-t-0 md:border-l border-gray-100">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <div className="flex-1 relative h-9 flex flex-col justify-center">
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">Check-in</label>
                    <span className={`block font-bold text-xs md:text-sm truncate ${checkInDate ? 'text-gray-900' : 'text-gray-400'}`}>
                      {checkInDate ? new Date(checkInDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Select date'}
                    </span>
                    <input 
                      type="date" 
                      min={today} 
                      value={checkInDate} 
                      onChange={(e) => setCheckInDate(e.target.value)} 
                      onClick={triggerPicker}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20" 
                    />
                  </div>
                </div>

                {/* Check-out Date */}
                <div className="md:col-span-3 bg-white p-3 md:p-4 flex items-center gap-3 relative border-t md:border-t-0 md:border-l border-gray-100">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <div className="flex-1 relative h-9 flex flex-col justify-center">
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">Check-out</label>
                    <span className={`block font-bold text-xs md:text-sm truncate ${checkOutDate ? 'text-gray-900' : 'text-gray-400'}`}>
                      {checkOutDate ? new Date(checkOutDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Select date'}
                    </span>
                    <input 
                      type="date" 
                      min={checkInDate || today} 
                      value={checkOutDate} 
                      onChange={(e) => setCheckOutDate(e.target.value)} 
                      onClick={triggerPicker}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20" 
                    />
                  </div>
                </div>

                {/* Guests & Rooms */}
                <div className="md:col-span-2 grid grid-cols-2 gap-1">
                  <div ref={travellerRef} onClick={() => setShowTravellerDropdown(!showTravellerDropdown)} className="bg-white p-3 md:p-4 flex items-center gap-3 relative border-t md:border-t-0 md:border-l border-gray-100 rounded-bl-lg md:rounded-bl-none">
                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <div className="flex-1 truncate">
                      <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Guests</label>
                      <span className="block font-bold text-gray-900 text-xs md:text-sm truncate">{travellers.adults + travellers.children}</span>
                    </div>
                    {renderTravellerDropdown()}
                  </div>
                  
                  <div ref={roomRef} onClick={() => setShowRoomDropdown(!showRoomDropdown)} className="bg-white p-3 md:p-4 flex items-center gap-3 relative border-t md:border-t-0 md:border-l border-gray-100 rounded-br-lg md:rounded-r-lg md:rounded-bl-none">
                    <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                    <div className="flex-1 truncate">
                      <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Rooms</label>
                      <span className="block font-bold text-gray-900 text-xs md:text-sm truncate">{rooms}</span>
                    </div>
                    {renderRoomDropdown()}
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || !hotelLocation || !checkInDate || !checkOutDate} 
                className="w-full lg:w-auto bg-black text-white px-8 py-4 lg:py-5 font-bold text-lg rounded-xl lg:rounded-lg hover:bg-gray-900 transition shadow-xl mt-2 lg:mt-0 lg:ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Searching...
                  </>
                ) : 'Search'}
              </button>
            </div>
          )}

          {activeTab === 'cars' && (
            <div className="flex flex-col lg:flex-row items-stretch gap-1 bg-[#33a8da] rounded-xl p-1">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-1">
                <div className="md:col-span-6 bg-white p-3 md:p-4 flex items-center gap-3 rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
                  <svg className="w-6 h-6 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Pick-up</label>
                    <input type="text" value={carPickUp} onChange={(e) => setCarPickUp(e.target.value)} className="w-full font-bold text-gray-900 focus:outline-none text-sm md:text-base bg-transparent p-0" placeholder="City or Airport" />
                  </div>
                </div>
                <div className="md:col-span-6 bg-white p-3 md:p-4 flex items-center gap-3 relative border-t md:border-t-0 md:border-l border-gray-100 rounded-b-lg md:rounded-r-lg md:rounded-bl-none">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <div className="flex-1 relative h-9 flex flex-col justify-center">
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">Rental Window</label>
                    <span className="text-gray-900 font-bold text-xs md:text-sm">
                      {carPickUpDate ? `${new Date(carPickUpDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} — ${carDropOffDate ? new Date(carDropOffDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '...'}` : 'Dates'}
                    </span>
                    <div className="absolute inset-0 flex opacity-0 cursor-pointer">
                       <input type="date" min={today} className="flex-1" onChange={(e) => setCarPickUpDate(e.target.value)} onClick={triggerPicker} />
                       <input type="date" min={carPickUpDate || today} className="flex-1" onChange={(e) => setCarDropOffDate(e.target.value)} onClick={triggerPicker} />
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full lg:w-auto bg-black text-white px-8 py-4 lg:py-5 font-bold text-lg rounded-xl lg:rounded-lg hover:bg-gray-900 transition shadow-xl mt-2 lg:mt-0 lg:ml-1">
                {loading ? '...' : 'Search'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SearchBox;