'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

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
  const [cabinClass, setCabinClass] = useState('Economy');
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

  const travellerRef = useRef<HTMLDivElement>(null);
  const cabinRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

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
    
    // West Africa Additional
    { code: 'DSS', name: 'Blaise Diagne International Airport', city: 'Dakar', country: 'Senegal', type: 'airport' },
    { code: 'ROB', name: 'Roberts International Airport', city: 'Monrovia', country: 'Liberia', type: 'airport' },
    { code: 'FNA', name: 'Lungi International Airport', city: 'Freetown', country: 'Sierra Leone', type: 'airport' },
    { code: 'BJL', name: 'Banjul International Airport', city: 'Banjul', country: 'Gambia', type: 'airport' },
    { code: 'OUA', name: 'Ouagadougou Airport', city: 'Ouagadougou', country: 'Burkina Faso', type: 'airport' },
    { code: 'NIM', name: 'Diori Hamani International Airport', city: 'Niamey', country: 'Niger', type: 'airport' },
    { code: 'LFW', name: 'Lomé–Tokoin International Airport', city: 'Lomé', country: 'Togo', type: 'airport' },
    { code: 'COO', name: 'Cadjehoun Airport', city: 'Cotonou', country: 'Benin', type: 'airport' },
  ];

  // Fetch airport suggestions from AviationStack API (or similar)
  const fetchAirportSuggestions = useCallback(async (query: string): Promise<Airport[]> => {
    if (!query || query.length < 2) {
      // Show popular airports when query is empty or too short
      return popularAirports.slice(0, 8);
    }
    
    try {
      setLoadingSuggestions(true);
      
      // First, filter from our popular airports list
      const filtered = filterAirports(query);
      if (filtered.length > 0) {
        return filtered.slice(0, 10);
      }
      
      // If no results in local list, try API
      // Note: You'll need to get an API key from AviationStack or similar service
      // For now, we'll use a mock API response structure
      return await mockApiSearch(query);
      
    } catch (error) {
      console.error('Error fetching airport suggestions:', error);
      return filterAirports(query).slice(0, 5);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Filter airports based on query
  const filterAirports = (query: string): Airport[] => {
    const lowerQuery = query.toLowerCase();
    return popularAirports.filter(airport => 
      airport.code.toLowerCase().includes(lowerQuery) ||
      airport.city.toLowerCase().includes(lowerQuery) ||
      airport.country.toLowerCase().includes(lowerQuery) ||
      airport.name.toLowerCase().includes(lowerQuery)
    );
  };

  // Mock API function - replace with real API call
  const mockApiSearch = async (query: string): Promise<Airport[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return empty array for demo - in production, call real API
    return [];
  };

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

  // Handle airport selection
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
  }, [segments]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (travellerRef.current && !travellerRef.current.contains(event.target as Node)) {
        setShowTravellerDropdown(false);
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
    nextWeek.setDate(nextWeek.getDate() + 7);
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

  const getTravellerSummary = () => {
    const parts = [];
    if (travellers.adults > 0) parts.push(`${travellers.adults} Adult${travellers.adults > 1 ? 's' : ''}`);
    if (travellers.children > 0) parts.push(`${travellers.children} Child${travellers.children > 1 ? 'ren' : ''}`);
    if (travellers.infants > 0) parts.push(`${travellers.infants} Infant${travellers.infants > 1 ? 's' : ''}`);
    return parts.join(', ') || '1 Adult';
  };

  // Extract airport code from display value
  const extractAirportCode = (displayValue: string): string => {
    const match = displayValue.match(/^([A-Z]{3})/);
    return match ? match[1] : displayValue.split(' ')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare segments with extracted airport codes
    const preparedSegments = segments.map(segment => ({
      from: extractAirportCode(segment.from),
      to: extractAirportCode(segment.to),
      date: segment.date || today
    }));

    const data = {
      type: activeTab,
      ...(activeTab === 'flights' ? { 
          tripType, 
          segments: preparedSegments,
          returnDate: tripType === 'round-trip' ? returnDate : undefined, 
          cabinClass: cabinClass.toLowerCase().replace(' ', '_'),
          stops: stopsFilter,
          maxPrice: maxPrice,
          travellers: travellers.adults + travellers.children,
          travellersDetails: travellers
        } : 
         activeTab === 'hotels' ? { 
           location: hotelLocation, 
           checkIn: checkInDate, 
           checkOut: checkOutDate, 
           travellers: travellers.adults + travellers.children,
           travellersDetails: travellers
         } :
         { 
           carPickUp, 
           carPickUpDate, 
           carPickUpTime, 
           carDropOffDate, 
           carDropOffTime, 
           differentLocation, 
           driverAged,
           travellers: travellers.adults
         })
    };
    
    console.log('Search data:', data);
    onSearch(data);
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

  const renderAirportDropdown = (suggestions: Airport[], type: 'from' | 'to', index: number = 0) => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50">
      {loadingSuggestions ? (
        <div className="px-4 py-3 text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="text-xs mt-2">Searching airports...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">No airports found. Try a different search.</div>
      ) : (
        <>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="text-xs font-bold text-gray-500">POPULAR AIRPORTS</div>
          </div>
          {suggestions.map((airport) => (
            <button
              key={`${type}-${airport.code}-${index}`}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
              onClick={() => handleAirportSelect(airport, type, index)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
                    {airport.code}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{airport.city}, {airport.country}</div>
                  <div className="text-xs text-gray-500 truncate">{airport.name}</div>
                </div>
              </div>
            </button>
          ))}
          {suggestions.length >= 8 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="text-xs text-center text-gray-500">
                Type more characters to search all airports worldwide
              </div>
            </div>
          )}
        </>
      )}
    </div>
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
                <svg className="w-6 h-6 text-[#33a8da] shrink-0" fill="currentColor" viewBox="0 0 24 24">
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
                        {cabinClass} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={3}/></svg>
                      </button>
                      {showCabinDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          {['Economy', 'Premium Economy', 'Business', 'First Class'].map((cls) => (
                            <button key={cls} type="button" onClick={() => { setCabinClass(cls); setShowCabinDropdown(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                              {cls}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* RESTORED FILTERS SECTION */}
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
                <div className="md:col-span-5 bg-white p-3 md:p-4 flex items-center gap-3 rounded-t-lg md:rounded-l-lg md:rounded-tr-none">
                  <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2z" /></svg>
                  <div className="flex-1">
                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Location</label>
                    <input type="text" value={hotelLocation} onChange={(e) => setHotelLocation(e.target.value)} className="w-full font-bold text-gray-900 focus:outline-none text-sm md:text-base bg-transparent p-0" placeholder="Destination" />
                  </div>
                </div>
                <div className="md:col-span-4 bg-white p-3 md:p-4 flex items-center gap-3 relative border-t md:border-t-0 md:border-l border-gray-100">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <div className="flex-1 relative h-9 flex flex-col justify-center">
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-0.5">Stay Window</label>
                    <span className="text-gray-900 font-bold text-xs md:text-sm truncate">
                      {checkInDate ? `${new Date(checkInDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} — ${checkOutDate ? new Date(checkOutDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '...'}` : 'Dates'}
                    </span>
                    <div className="absolute inset-0 flex opacity-0 cursor-pointer">
                       <input type="date" min={today} className="flex-1" onChange={(e) => setCheckInDate(e.target.value)} onClick={triggerPicker} />
                       <input type="date" min={checkInDate || today} className="flex-1" onChange={(e) => setCheckOutDate(e.target.value)} onClick={triggerPicker} />
                    </div>
                  </div>
                </div>
                <div ref={travellerRef} onClick={() => setShowTravellerDropdown(!showTravellerDropdown)} className="md:col-span-3 bg-white p-3 md:p-4 flex items-center gap-3 relative border-t md:border-t-0 md:border-l border-gray-100 rounded-b-lg md:rounded-r-lg md:rounded-bl-none">
                  <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <div className="flex-1 truncate">
                    <label className="block text-[8px] font-bold text-gray-500 uppercase mb-0.5">Guests</label>
                    <span className="block font-bold text-gray-900 text-xs md:text-sm">{getTravellerSummary()}</span>
                  </div>
                  {renderTravellerDropdown()}
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full lg:w-auto bg-black text-white px-8 py-4 lg:py-5 font-bold text-lg rounded-xl lg:rounded-lg hover:bg-gray-900 transition shadow-xl mt-2 lg:mt-0 lg:ml-1">
                {loading ? '...' : 'Search'}
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