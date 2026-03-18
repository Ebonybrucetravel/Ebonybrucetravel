'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { airports as airportData, airports, type Airport as AirportData } from '../lib/airportData';
import { useSearchParams } from 'next/navigation';

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

interface CarLocationSuggestion extends AirportData {
  display: string;
}

interface SearchBoxProps {
  onSearch: (data: any) => void;
  loading: boolean;
  activeTab?: 'flights' | 'hotels' | 'cars';
  onTabChange?: (tab: 'flights' | 'hotels' | 'cars') => void;
}

const airportsWithCities: AirportData[] = [
  { code: 'PAR', name: 'Paris City Center', city: 'Paris', country: 'France', type: 'city' },
  { code: 'LHR', name: 'London City Center', city: 'London', country: 'UK', type: 'city' },
  { code: 'NYC', name: 'New York City Center', city: 'New York', country: 'USA', type: 'city' },
  { code: 'LAX', name: 'Los Angeles City Center', city: 'Los Angeles', country: 'USA', type: 'city' },
  { code: 'CHI', name: 'Chicago City Center', city: 'Chicago', country: 'USA', type: 'city' },
  { code: 'MIA', name: 'Miami City Center', city: 'Miami', country: 'USA', type: 'city' },
  { code: 'LAS', name: 'Las Vegas City Center', city: 'Las Vegas', country: 'USA', type: 'city' },
  { code: 'SFO', name: 'San Francisco City Center', city: 'San Francisco', country: 'USA', type: 'city' },
  { code: 'BOS', name: 'Boston City Center', city: 'Boston', country: 'USA', type: 'city' },
  { code: 'WAS', name: 'Washington D.C. City Center', city: 'Washington', country: 'USA', type: 'city' },
  { code: 'DFW', name: 'Dallas City Center', city: 'Dallas', country: 'USA', type: 'city' },
  { code: 'IAH', name: 'Houston City Center', city: 'Houston', country: 'USA', type: 'city' },
  { code: 'PHX', name: 'Phoenix City Center', city: 'Phoenix', country: 'USA', type: 'city' },
  { code: 'SEA', name: 'Seattle City Center', city: 'Seattle', country: 'USA', type: 'city' },
  { code: 'MCO', name: 'Orlando City Center', city: 'Orlando', country: 'USA', type: 'city' },
  { code: 'ATL', name: 'Atlanta City Center', city: 'Atlanta', country: 'USA', type: 'city' },
  { code: 'LOS', name: 'Lagos City Center', city: 'Lagos', country: 'Nigeria', type: 'city' },
  { code: 'ABV', name: 'Abuja City Center', city: 'Abuja', country: 'Nigeria', type: 'city' },
  { code: 'PHC', name: 'Port Harcourt City Center', city: 'Port Harcourt', country: 'Nigeria', type: 'city' },
  { code: 'KAN', name: 'Kano City Center', city: 'Kano', country: 'Nigeria', type: 'city' },
  { code: 'DXB', name: 'Dubai City Center', city: 'Dubai', country: 'UAE', type: 'city' },
  { code: 'SIN', name: 'Singapore City Center', city: 'Singapore', country: 'Singapore', type: 'city' },
  { code: 'HKG', name: 'Hong Kong City Center', city: 'Hong Kong', country: 'China', type: 'city' },
  { code: 'TYO', name: 'Tokyo City Center', city: 'Tokyo', country: 'Japan', type: 'city' },
  { code: 'SYD', name: 'Sydney City Center', city: 'Sydney', country: 'Australia', type: 'city' },
  { code: 'ROM', name: 'Rome City Center', city: 'Rome', country: 'Italy', type: 'city' },
  { code: 'MAD', name: 'Madrid City Center', city: 'Madrid', country: 'Spain', type: 'city' },
  { code: 'BER', name: 'Berlin City Center', city: 'Berlin', country: 'Germany', type: 'city' },
  ...airportData
];

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, loading, activeTab: activeTabProp, onTabChange }) => {
  const { t, currency } = useLanguage();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'cars'>(activeTabProp || 'flights');

  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  const [tripType, setTripType] = useState<'round-trip' | 'one-way' | 'multi-city'>('round-trip');
  const [cabinClass, setCabinClass] = useState('economy');
  const [showCabinDropdown, setShowCabinDropdown] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [stopsFilter, setStopsFilter] = useState('Any');
  const [maxPrice, setMaxPrice] = useState(2000);
  const [segments, setSegments] = useState<Segment[]>([
    { from: 'LHR - London, United Kingdom', to: 'CDG - Paris, France', date: '' }
  ]);
  const [returnDate, setReturnDate] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<Airport[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Airport[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [hotelLocation, setHotelLocation] = useState('');
  const [selectedHotelCityCode, setSelectedHotelCityCode] = useState<string | null>(null);
  const [hotelLocationSuggestions, setHotelLocationSuggestions] = useState<HotelDestination[]>([]);
  const [loadingHotelSuggestions, setLoadingHotelSuggestions] = useState(false);
  const [hotelProvider, setHotelProvider] = useState<'amadeus' | 'hotelbeds'>('hotelbeds');

  // Set default dates with lead time for better search success
  const defaultDates = (() => {
    const d1 = new Date();
    d1.setDate(d1.getDate() + 4); // 4 days lead for safety
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + 3); // 3 days stay
    return {
      in: d1.toISOString().split('T')[0],
      out: d2.toISOString().split('T')[0]
    };
  })();

  const [checkInDate, setCheckInDate] = useState(defaultDates.in);
  const [checkOutDate, setCheckOutDate] = useState(defaultDates.out);
  const [rooms, setRooms] = useState(1);
  const [showHotelLocationDropdown, setShowHotelLocationDropdown] = useState(false);
  const [carPickUp, setCarPickUp] = useState('');
  const [carDropOff, setCarDropOff] = useState('');
  const [carPickUpDate, setCarPickUpDate] = useState('');
  const [carPickUpTime, setCarPickUpTime] = useState('10:00');
  const [carDropOffDate, setCarDropOffDate] = useState('');
  const [carDropOffTime, setCarDropOffTime] = useState('10:00');
  const [carTravellers, setCarTravellers] = useState(2);
  const [showCarTravellerDropdown, setShowCarTravellerDropdown] = useState(false);
  const [differentLocation, setDifferentLocation] = useState(false);
  const [driverAged, setDriverAged] = useState(true);
  const [showCarPickUpDropdown, setShowCarPickUpDropdown] = useState(false);
  const [showCarDropOffDropdown, setShowCarDropOffDropdown] = useState(false);
  const [carPickUpSuggestions, setCarPickUpSuggestions] = useState<CarLocationSuggestion[]>([]);
  const [carDropOffSuggestions, setCarDropOffSuggestions] = useState<CarLocationSuggestion[]>([]);
  const [loadingCarPickUpSuggestions, setLoadingCarPickUpSuggestions] = useState(false);
  const [loadingCarDropOffSuggestions, setLoadingCarDropOffSuggestions] = useState(false);
  const [travellers, setTravellers] = useState<Travellers>({ adults: 1, children: 0, infants: 0 });
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  const travellerRef = useRef<HTMLDivElement>(null);
  const carTravellerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const cabinRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const hotelLocationRef = useRef<HTMLDivElement>(null);
  const carPickUpRef = useRef<HTMLDivElement>(null);
  const carDropOffRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  const getCityCode = (location: string): string => {
    if (!location) return 'LOS';

    // If we have a stored city code from dropdown selection, use it
    if (selectedHotelCityCode) return selectedHotelCityCode;

    // City-name-to-code lookup (case-insensitive)
    const cityNameMap: Record<string, string> = {
      'lagos': 'LOS',
      'london': 'LON',
      'new york': 'NYC',
      'dubai': 'DXB',
      'paris': 'PAR',
      'tokyo': 'TYO',
      'singapore': 'SIN',
      'palma': 'PMI',
      'palma mallorca': 'PMI',
      'cape town': 'CPT',
      'accra': 'ACC',
      'madrid': 'MAD',
      'barcelona': 'BCN',
      'rome': 'FCO',
      'istanbul': 'IST',
      'nairobi': 'NBO',
      'johannesburg': 'JNB',
      'cairo': 'CAI',
      'amsterdam': 'AMS',
      'frankfurt': 'FRA',
    };

    // Try matching city name from the typed text
    const lowerLoc = location.toLowerCase().trim();
    for (const [cityName, code] of Object.entries(cityNameMap)) {
      if (lowerLoc.includes(cityName)) return code;
    }

    // Also check against popularHotelDestinations
    const matchedDest = popularHotelDestinations.find(d =>
      lowerLoc.includes(d.city.toLowerCase()) ||
      lowerLoc.includes(d.name.toLowerCase())
    );
    if (matchedDest) return matchedDest.cityCode;

    // Airport code extraction fallbacks
    const airportToCityMap: Record<string, string> = {
      'LHR': 'LON', 'LGW': 'LON', 'STN': 'LON', 'LTN': 'LON',
      'JFK': 'NYC', 'EWR': 'NYC', 'LGA': 'NYC',
      'ORD': 'CHI', 'MDW': 'CHI',
      'CDG': 'PAR', 'ORY': 'PAR',
      'DXB': 'DXB', 'DWC': 'DXB',
      'MAD': 'MAD', 'PMI': 'PMI',
    };

    const match = location.match(/\(([A-Z]{3})\)/);
    const codeMatch = location.match(/^([A-Z]{3})\s*-\s*/);
    const code = match ? match[1] : (codeMatch ? codeMatch[1] : null);
    const threeLetterMatch = location.match(/([A-Z]{3})/);
    const finalCode = code || (threeLetterMatch ? threeLetterMatch[1] : 'LOS');

    return airportToCityMap[finalCode] || finalCode;
  };

  const popularHotelDestinations: HotelDestination[] = [
    { name: 'Lagos', city: 'Lagos', country: 'Nigeria', cityCode: 'LOS', image: 'https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGFnb3N8ZW58MHx8MHx8fDA%3D' },
    { name: 'London', city: 'London', country: 'United Kingdom', cityCode: 'LON', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=400' },
    { name: 'New York', city: 'New York', country: 'USA', cityCode: 'NYC', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=400' },
    { name: 'Dubai', city: 'Dubai', country: 'UAE', cityCode: 'DXB', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=400' },
    { name: 'Paris', city: 'Paris', country: 'France', cityCode: 'PAR', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=400' },
    { name: 'Tokyo', city: 'Tokyo', country: 'Japan', cityCode: 'TYO', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=400' },
    { name: 'Singapore', city: 'Singapore', country: 'Singapore', cityCode: 'SIN', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=400' },
    { name: 'Palma Mallorca', city: 'Palma', country: 'Spain', cityCode: 'PMI', image: 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&q=80&w=400' },
    { name: 'Cape Town', city: 'Cape Town', country: 'South Africa', cityCode: 'CPT', image: 'https://images.unsplash.com/photo-1596394516093-9ba7b6146eba?auto=format&fit=crop&q=80&w=400' },
    { name: 'Accra', city: 'Accra', country: 'Ghana', cityCode: 'ACC', image: 'https://images.unsplash.com/photo-1587496679742-bad502958c4a?auto=format&fit=crop&q=80&w=400' },
  ];

  const popularAirports: Airport[] = [
    { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', type: 'airport' },
    { code: 'ABV', name: 'Nnamdi Azikiwe International Airport', city: 'Abuja', country: 'Nigeria', type: 'airport' },
    { code: 'ACC', name: 'Kotoka International Airport', city: 'Accra', country: 'Ghana', type: 'airport' },
    { code: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya', type: 'airport' },
    { code: 'JNB', name: 'OR Tambo International Airport', city: 'Johannesburg', country: 'South Africa', type: 'airport' },
    { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa', type: 'airport' },
    { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', type: 'airport' },
    { code: 'ADD', name: 'Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia', type: 'airport' },
    { code: 'DAR', name: 'Julius Nyerere International Airport', city: 'Dar es Salaam', country: 'Tanzania', type: 'airport' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', type: 'airport' },
    { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'UAE', type: 'airport' },
    { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', type: 'airport' },
    { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', type: 'airport' },
    { code: 'SAW', name: 'Sabiha Gökçen International Airport', city: 'Istanbul', country: 'Turkey', type: 'airport' },
    { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'UK', type: 'airport' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', type: 'airport' },
    { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', type: 'airport' },
    { code: 'AMS', name: 'Schiphol Airport', city: 'Amsterdam', country: 'Netherlands', type: 'airport' },
    { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', type: 'airport' },
    { code: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', type: 'airport' },
    { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', type: 'airport' },
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', type: 'airport' },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', type: 'airport' },
    { code: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'USA', type: 'airport' },
    { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', type: 'airport' },
    { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', type: 'airport' },
    { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', type: 'airport' },
    { code: 'GRU', name: 'Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', type: 'airport' },
    { code: 'GIG', name: 'Galeão International Airport', city: 'Rio de Janeiro', country: 'Brazil', type: 'airport' },
    { code: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', country: 'Argentina', type: 'airport' },
    { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru', type: 'airport' },
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
    { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', type: 'airport' },
    { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', type: 'airport' },
    { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', type: 'airport' },
  ];

  const fetchCarLocationSuggestions = useCallback(async (query: string): Promise<CarLocationSuggestion[]> => {
    if (!query || query.length < 1) {
      const popularCarLocations = airportsWithCities
        .filter(location => ['PAR', 'LHR', 'NYC', 'CDG', 'LOS', 'ABV', 'DXB'].includes(location.code))
        .slice(0, 8);
      return popularCarLocations.map(location => ({
        ...location,
        display: `${location.code} - ${location.name}, ${location.city}`
      }));
    }
    const queryLower = query.toLowerCase().trim();
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ebony-bruce-production.up.railway.app'}/api/v1/bookings/flights/places/suggestions?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          return result.data.map((place: any) => ({
            code: place.iata_code || place.code || '',
            name: place.name || '',
            city: place.city_name || place.city || place.name || '',
            country: place.country_name || place.country || '',
            type: place.type === 'city' ? 'city' : 'airport',
            display: `${place.iata_code || place.code} - ${place.name}, ${place.city_name || place.city}`
          })).slice(0, 10);
        }
      }
    } catch (e) { }
    const filtered = airportsWithCities.filter(location =>
      location.code.toLowerCase().includes(queryLower) ||
      location.city.toLowerCase().includes(queryLower) ||
      location.name.toLowerCase().includes(queryLower)
    ).slice(0, 10);
    return filtered.map(location => ({
      ...location,
      display: `${location.code} - ${location.name}, ${location.city}`
    }));
  }, []);

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
          const uniqueSuggestions = suggestions.filter(
            (airport, index, self) =>
              index === self.findIndex((a) =>
                a.code === airport.code && a.city === airport.city
              )
          );

          return uniqueSuggestions.slice(0, 12);
        }
      }
      const lowerQuery = query.toLowerCase();
      const filtered = popularAirports.filter(airport =>
        airport.code.toLowerCase().includes(lowerQuery) ||
        airport.city.toLowerCase().includes(lowerQuery) ||
        airport.country.toLowerCase().includes(lowerQuery) ||
        airport.name.toLowerCase().includes(lowerQuery)
      );
      const uniqueFiltered = filtered.filter(
        (airport, index, self) =>
          index === self.findIndex((a) =>
            a.code === airport.code && a.city === airport.city
          )
      );

      return uniqueFiltered.slice(0, 10);

    } catch (error) {
      console.error('Error fetching airport suggestions:', error);
      const lowerQuery = query.toLowerCase();
      const filtered = popularAirports.filter(airport =>
        airport.code.toLowerCase().includes(lowerQuery) ||
        airport.city.toLowerCase().includes(lowerQuery) ||
        airport.country.toLowerCase().includes(lowerQuery) ||
        airport.name.toLowerCase().includes(lowerQuery)
      );
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

  const fetchHotelLocationSuggestions = useCallback(async (query: string): Promise<HotelDestination[]> => {
    if (!query || query.length < 2) {
      return popularHotelDestinations.slice(0, 6);
    }

    try {
      setLoadingHotelSuggestions(true);
      const lowerQuery = query.toLowerCase();
      const filtered = popularHotelDestinations.filter(dest =>
        dest.city.toLowerCase().includes(lowerQuery) ||
        dest.country.toLowerCase().includes(lowerQuery) ||
        dest.name.toLowerCase().includes(lowerQuery) ||
        dest.cityCode.toLowerCase().includes(lowerQuery)
      );
      await new Promise(resolve => setTimeout(resolve, 200));
      return filtered.length > 0 ? filtered.slice(0, 8) : [];

    } catch (error) {
      console.error('Error fetching hotel suggestions:', error);
      return [];
    } finally {
      setLoadingHotelSuggestions(false);
    }
  }, []);

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

  const handleHotelLocationChange = useCallback(async (value: string) => {
    setHotelLocation(value);
    setSelectedHotelCityCode(null);

    if (value.length >= 1) {
      const suggestions = await fetchHotelLocationSuggestions(value);
      setHotelLocationSuggestions(suggestions);
      setShowHotelLocationDropdown(true);
    } else {
      setHotelLocationSuggestions(popularHotelDestinations.slice(0, 6));
      setShowHotelLocationDropdown(value.length > 0);
    }
  }, [fetchHotelLocationSuggestions]);

  const handleCarPickUpChange = useCallback(async (value: string) => {
    setCarPickUp(value);
    if (value.length >= 1) {
      setLoadingCarPickUpSuggestions(true);
      const suggestions = await fetchCarLocationSuggestions(value);
      setCarPickUpSuggestions(suggestions);
      setShowCarPickUpDropdown(true);
      setLoadingCarPickUpSuggestions(false);
    } else {
      setShowCarPickUpDropdown(false);
    }
  }, [fetchCarLocationSuggestions]);

  const handleCarDropOffChange = useCallback(async (value: string) => {
    setCarDropOff(value);
    if (value.length >= 1) {
      setLoadingCarDropOffSuggestions(true);
      const suggestions = await fetchCarLocationSuggestions(value);
      setCarDropOffSuggestions(suggestions);
      setShowCarDropOffDropdown(true);
      setLoadingCarDropOffSuggestions(false);
    } else {
      setShowCarDropOffDropdown(false);
    }
  }, [fetchCarLocationSuggestions]);

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

  const handleCarLocationSelect = useCallback((location: CarLocationSuggestion, type: 'pickUp' | 'dropOff') => {
    const displayValue = `${location.code} - ${location.name}, ${location.city}`;
    if (type === 'pickUp') {
      setCarPickUp(displayValue);
      setShowCarPickUpDropdown(false);
      if (!differentLocation) setCarDropOff(displayValue);
    } else {
      setCarDropOff(displayValue);
      setShowCarDropOffDropdown(false);
    }
  }, [differentLocation]);

  const handleHotelDestinationSelect = useCallback((destination: HotelDestination) => {
    setHotelLocation(`${destination.city}, ${destination.country}`);
    setSelectedHotelCityCode(destination.cityCode);
    setShowHotelLocationDropdown(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (travellerRef.current && !travellerRef.current.contains(event.target as Node)) {
        setShowTravellerDropdown(false);
      }
      if (carTravellerRef.current && !carTravellerRef.current.contains(event.target as Node)) {
        setShowCarTravellerDropdown(false);
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
      if (carPickUpRef.current && !carPickUpRef.current.contains(event.target as Node)) {
        setShowCarPickUpDropdown(false);
      }
      if (carDropOffRef.current && !carDropOffRef.current.contains(event.target as Node)) {
        setShowCarDropOffDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const updateCarTravellers = (increment: boolean) => {
    setCarTravellers(prev => increment ? Math.min(10, prev + 1) : Math.max(1, prev - 1));
  };

  const updateRooms = (increment: boolean) => {
    setRooms(prev => increment ? Math.min(5, prev + 1) : Math.max(1, prev - 1));
  };

  const getTravellerSummary = () => {
    const parts = [];
    if (travellers.adults > 0) parts.push(`${travellers.adults} ${t('search.adults')}`);
    if (travellers.children > 0) parts.push(`${travellers.children} ${t('search.children')}`);
    if (travellers.infants > 0) parts.push(`${travellers.infants} ${t('search.infants')}`);
    const total = travellers.adults + travellers.children + travellers.infants;
    return `${total} ${total === 1 ? t('search.passenger') : t('search.passengers')} (${parts.join(', ')})`;
  };

  const getHotelGuestSummary = () => {
    const totalGuests = travellers.adults + travellers.children;
    return `${totalGuests} ${totalGuests === 1 ? t('search.guest') : t('search.guests')}, ${rooms} ${rooms === 1 ? t('search.room') : t('search.rooms')}`;
  };

  const extractAirportCode = (displayValue: string): string => {
    if (!displayValue) return '';

    console.log('Extracting code from:', displayValue);

    // If it's already just a 3-letter code, return it uppercase
    if (/^[A-Z]{3}$/.test(displayValue.trim())) {
      return displayValue.trim();
    }

    // Pattern 1: "LOS - Lagos, Nigeria" or "LHR - Heathrow Airport, London"
    const pattern1 = displayValue.match(/([A-Z]{3})\s*-\s*/);
    if (pattern1) {
      console.log('Pattern 1 match:', pattern1[1]);
      return pattern1[1];
    }

    // Pattern 2: Extract from parentheses like "Lagos (LOS)"
    const pattern2 = displayValue.match(/\(([A-Z]{3})\)/);
    if (pattern2) {
      console.log('Pattern 2 match:', pattern2[1]);
      return pattern2[1];
    }

    // Pattern 3: Find any 3 uppercase letters at the beginning
    const pattern3 = displayValue.match(/^([A-Z]{3})/);
    if (pattern3) {
      console.log('Pattern 3 match:', pattern3[1]);
      return pattern3[1];
    }

    // Try to match from airports list by searching the entire string
    const lowerValue = displayValue.toLowerCase();
    const matchedAirport = airports.find(airport => {
      // Check if airport code is in the string
      if (lowerValue.includes(airport.code.toLowerCase())) {
        return true;
      }
      // Check if city name is in the string
      if (airport.city.toLowerCase().includes(lowerValue) ||
        lowerValue.includes(airport.city.toLowerCase())) {
        return true;
      }
      // Check if airport name contains the search
      if (airport.name.toLowerCase().includes(lowerValue)) {
        return true;
      }
      return false;
    });

    if (matchedAirport) {
      console.log('Matched from airports list:', matchedAirport.code);
      return matchedAirport.code;
    }

    // Try popular airports as fallback
    const popularMatch = popularAirports.find(airport =>
      airport.city.toLowerCase().includes(lowerValue) ||
      lowerValue.includes(airport.city.toLowerCase())
    );

    if (popularMatch) {
      console.log('Matched from popular airports:', popularMatch.code);
      return popularMatch.code;
    }

    // Last resort: extract any 3 consecutive uppercase letters
    const anyCode = displayValue.match(/\b([A-Z]{3})\b/);
    if (anyCode) {
      console.log('Extracted any 3 uppercase letters:', anyCode[1]);
      return anyCode[1];
    }

    // If all else fails, return empty string
    console.log('No airport code found');
    return '';
  };

  const extractLocationCode = (input: string): string => {
    if (!input) return '';
    if (/^[A-Z]{3}$/.test(input.trim())) return input.trim();
    const match = input.match(/^([A-Z]{3})\s*-\s*/);
    if (match) return match[1];
    const anyCode = input.match(/\b([A-Z]{3})\b/);
    return anyCode ? anyCode[1] : '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'cars') {
      console.log('🚗 Car rental search - Starting...');

      const pickUpCode = extractLocationCode(carPickUp);
      const dropOffCode = extractLocationCode(carDropOff);

      if (!pickUpCode || !dropOffCode || !carPickUpDate || !carDropOffDate) {
        alert(t('search.fillAllRentalDetails') || 'Please fill in all rental details including locations and dates.');
        return;
      }

      const formatDT = (d: string, t: string) => {
        const date = new Date(d);
        const [h, m] = t.split(':');
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${h}:${m}:00`;
      };

      onSearch({
        type: 'car-rentals',
        pickupLocationCode: pickUpCode,
        dropoffLocationCode: dropOffCode,
        pickupDateTime: formatDT(carPickUpDate, carPickUpTime),
        dropoffDateTime: formatDT(carDropOffDate, carDropOffTime),
        passengers: carTravellers,
        currency: 'GBP'
      });
    } else if (activeTab === 'flights') {
      console.log('✈️ Flight search - Starting...');

      // Extract airport codes and validate
      const errors = [];
      const flightSegments = segments.map((segment, index) => {
        const fromCode = extractAirportCode(segment.from);
        const toCode = extractAirportCode(segment.to);

        if (!fromCode) errors.push(`${t('search.segmentInvalidDeparture')} ${index + 1}`);
        if (!toCode) errors.push(`${t('search.segmentInvalidArrival')} ${index + 1}`);
        if (!segment.date) errors.push(`${t('search.segmentDateRequired')} ${index + 1}`);

        return {
          from: fromCode,
          to: toCode,
          date: segment.date
        };
      });

      if (tripType === 'round-trip' && !returnDate) {
        errors.push(t('search.returnDateRequired') || 'Return date is required for round-trip flights');
      }

      if (flightSegments.length === 0) {
        errors.push(t('search.minOneSegment') || 'At least one flight segment is required');
      }

      // Check for duplicate segments
      const segmentKeys = flightSegments.map(s => `${s.from}-${s.to}`);
      const uniqueSegments = new Set(segmentKeys);
      if (uniqueSegments.size !== segmentKeys.length) {
        errors.push(t('search.duplicateSegments') || 'Duplicate flight segments detected');
      }

      if (errors.length > 0) {
        alert(errors.join('\n'));
        return;
      }

      // Create flight search payload
      const data = {
        type: 'flights',
        tripType,
        segments: flightSegments,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        passengers: {
          adults: travellers.adults,
          children: travellers.children,
          infants: travellers.infants
        },
        cabinClass,
        stopsFilter,
        maxPrice,
        currency: currency.code || 'USD'
      };

      console.log('📦 FINAL Flight Payload:', JSON.stringify(data, null, 2));

      // Send to API
      onSearch(data);
    } else if (activeTab === 'hotels') {
      console.log('🏨 Hotel search - Starting...');

      // Validate hotel search
      const errors = [];

      if (!hotelLocation) {
        errors.push(t('search.hotelLocationRequired') || 'Hotel location is required');
      }

      if (!checkInDate) {
        errors.push(t('search.checkInRequired') || 'Check-in date is required');
      }

      if (!checkOutDate) {
        errors.push(t('search.checkOutRequired') || 'Check-out date is required');
      }

      if (checkInDate && checkOutDate) {
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        if (checkIn >= checkOut) {
          errors.push(t('search.checkOutAfterCheckIn') || 'Check-out date must be after check-in date');
        }
      }

      if (travellers.adults < 1) {
        errors.push(t('search.minOneAdult') || 'At least one adult is required');
      }

      if (rooms < 1) {
        errors.push(t('search.minOneRoom') || 'At least one room is required');
      }

      if (errors.length > 0) {
        alert(errors.join('\n'));
        return;
      }

      // Create hotel search payload
      const data = {
        type: 'hotels',
        location: hotelLocation,
        cityCode: getCityCode(hotelLocation),
        checkInDate,
        checkOutDate,
        travellers: {
          adults: travellers.adults,
          children: travellers.children
        },
        rooms,
        currency: currency.code || 'USD',
        provider: hotelProvider
      };

      console.log('📦 FINAL Hotel Payload:', JSON.stringify(data, null, 2));

      // Send to API
      onSearch(data);
    }
  };

  // Updated useEffect to use searchParams and handleSubmit dependency
  useEffect(() => {
    const type = searchParams.get('type');

    if (type === 'hotels') {
      setActiveTab('hotels');

      const location = searchParams.get('location');
      const cityCode = searchParams.get('cityCode');
      const checkIn = searchParams.get('checkIn');
      const checkOut = searchParams.get('checkOut');
      const guests = searchParams.get('guests');
      const rooms_param = searchParams.get('rooms');

      if (location) setHotelLocation(decodeURIComponent(location));
      if (checkIn) setCheckInDate(checkIn);
      if (checkOut) setCheckOutDate(checkOut);
      if (guests) {
        setTravellers(prev => ({ ...prev, adults: parseInt(guests) }));
      }
      if (rooms_param) setRooms(parseInt(rooms_param));

      const timer = setTimeout(() => {
        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
        handleSubmit(fakeEvent);
      }, 300);

      return () => clearTimeout(timer);
    }

    else if (type === 'car-rentals') {
      setActiveTab('cars');

      const location = searchParams.get('location');
      const pickupCode = searchParams.get('pickupCode');
      const dropoffCode = searchParams.get('dropoffCode');
      const pickupDate = searchParams.get('pickupDate');
      const dropoffDate = searchParams.get('dropoffDate');
      const pickupTime = searchParams.get('pickupTime') || '10:00';
      const dropoffTime = searchParams.get('dropoffTime') || '16:00';
      const passengers = searchParams.get('passengers');

      if (location) {
        const parts = decodeURIComponent(location).split(' to ');
        if (parts.length === 2) {
          const fromMatch = airportsWithCities.find(a =>
            a.city.toLowerCase().includes(parts[0].toLowerCase()) ||
            a.code.toLowerCase() === parts[0].toUpperCase()
          );
          const toMatch = airportsWithCities.find(a =>
            a.city.toLowerCase().includes(parts[1].toLowerCase()) ||
            a.code.toLowerCase() === parts[1].toUpperCase()
          );

          if (fromMatch) {
            setCarPickUp(`${fromMatch.code} - ${fromMatch.name}, ${fromMatch.city}`);
          }
          if (toMatch) {
            setCarDropOff(`${toMatch.code} - ${toMatch.name}, ${toMatch.city}`);
          }
        }
      }

      if (pickupCode) {
        const match = airportsWithCities.find(a => a.code === pickupCode);
        if (match) {
          setCarPickUp(`${match.code} - ${match.name}, ${match.city}`);
        }
      }

      if (dropoffCode) {
        const match = airportsWithCities.find(a => a.code === dropoffCode);
        if (match) {
          setCarDropOff(`${match.code} - ${match.name}, ${match.city}`);
        }
      }

      if (pickupDate) setCarPickUpDate(pickupDate);
      if (dropoffDate) setCarDropOffDate(dropoffDate);
      if (pickupTime) setCarPickUpTime(pickupTime);
      if (dropoffTime) setCarDropOffTime(dropoffTime);
      if (passengers) setCarTravellers(parseInt(passengers));

      const timer = setTimeout(() => {
        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
        handleSubmit(fakeEvent);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchParams, handleSubmit]);

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
            <div><span className="block font-bold text-gray-800 text-sm">{t('search.adults')}</span><span className="text-[10px] text-gray-400 font-bold uppercase">{t('search.adultsAge')}</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateTraveller('adults', false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{travellers.adults}</span>
              <button type="button" onClick={() => updateTraveller('adults', true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">{t('search.children')}</span><span className="text-[10px] text-gray-400 font-bold uppercase">{t('search.childrenAge')}</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateTraveller('children', false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{travellers.children}</span>
              <button type="button" onClick={() => updateTraveller('children', true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">{t('search.infants')}</span><span className="text-[10px] text-gray-400 font-bold uppercase">{t('search.infantsAge')}</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateTraveller('infants', false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{travellers.infants}</span>
              <button type="button" onClick={() => updateTraveller('infants', true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <button type="button" onClick={() => setShowTravellerDropdown(false)} className="w-full py-2.5 bg-[#33a8da] text-white rounded-lg font-bold text-sm hover:bg-[#2c98c7] transition-colors">{t('search.done')}</button>
        </div>
      </div>
    )
  );

  const renderCarTravellerDropdown = () => (
    showCarTravellerDropdown && (
      <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">{t('search.passengers')}</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateCarTravellers(false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{carTravellers}</span>
              <button type="button" onClick={() => updateCarTravellers(true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <button type="button" onClick={() => setShowCarTravellerDropdown(false)} className="w-full py-2.5 bg-[#33a8da] text-white rounded-lg font-bold text-sm hover:bg-[#2c98c7] transition-colors">{t('search.done')}</button>
        </div>
      </div>
    )
  );

  const renderRoomDropdown = () => (
    showRoomDropdown && (
      <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800 text-sm">{t('search.rooms')}</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => updateRooms(false)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-4 text-center text-base">{rooms}</span>
              <button type="button" onClick={() => updateRooms(true)} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <button type="button" onClick={() => setShowRoomDropdown(false)} className="w-full py-2.5 bg-[#33a8da] text-white rounded-lg font-bold text-sm hover:bg-[#2c98c7] transition-colors">{t('search.done')}</button>
        </div>
      </div>
    )
  );

  const renderAirportDropdown = (suggestions: Airport[], type: 'from' | 'to', index: number = 0) => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50">
      {loadingSuggestions ? (
        <div className="px-4 py-3 text-center text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da] mx-auto"></div>
          <p className="text-xs mt-2">{t('search.loadingAirports')}</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="px-4 py-3 text-center text-gray-500 text-sm">
          {t('search.noAirports')}
        </div>
      ) : (
        <>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="text-xs font-bold text-gray-500">
              {suggestions.length} {suggestions.length === 1 ? t('search.airport') : t('search.airports')} {t('search.found')}
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
                    {airport.type === 'city' ? t('search.cityType') : t('search.airportType')}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="text-xs text-center text-gray-500">
              {t('search.selectHint')}
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
            <p className="text-xs mt-2">{t('search.loadingDestinations')}</p>
          </div>
        ) : hotelLocationSuggestions.length === 0 ? (
          <div className="px-4 py-3 text-center text-gray-500 text-sm">{t('search.noDestinations')}</div>
        ) : (
          <>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <div className="text-xs font-bold text-gray-500">{t('search.popularDestinations')}</div>
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
                  {t('search.moreHint')}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  );

  const renderCarLocationDropdown = (suggestions: CarLocationSuggestion[], type: 'pickUp' | 'dropOff') => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto z-50">
      {suggestions.map((location, idx) => (
        <button key={`${location.code}-${idx}`} type="button" className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 group" onClick={() => handleCarLocationSelect(location, type)}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${location.type === 'city' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{location.code}</div>
            <div className="flex-1 min-w-0"><div className="font-bold text-gray-900 truncate">{location.city}, {location.country}</div><div className="text-xs text-gray-500 truncate">{location.name}</div></div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderFlightSegmentRow = (segment: Segment, index: number) => {
    const isFirst = index === 0;
    const isMultiCity = tripType === 'multi-city';
    const isRangeSelected = tripType === 'round-trip' && index === 0 && segment.date && returnDate;

    return (
      <div key={index} className="bg-[#33a8da] rounded-xl p-[2px] flex flex-col lg:flex-row items-stretch gap-[2px] mb-2 shadow-sm animate-in slide-in-from-left duration-200">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-[2px]">
          {/* From / To Section with Autocomplete */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
            {/* From Input with Autocomplete */}
            <div className="relative" ref={index === activeSegmentIndex ? fromRef : null}>
              <div className="bg-white p-2.5 md:p-3 flex items-center gap-2 relative rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none min-h-[72px]">
                <svg className="w-4 h-4 text-[#33a8da] self-center" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                <div className="flex-1 relative">
                  <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0 leading-none">{t('search.from')}</label>
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
                    className="w-full font-bold text-gray-900 focus:outline-none text-xs bg-transparent p-0 pr-5"
                    placeholder={t('search.fromPlaceholder')}
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
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => handleSwap(index)} className="absolute right-[-10px] sm:right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-100 rounded-full p-0.5 shadow-sm hover:bg-gray-50 transition hidden sm:block">
                  <svg className="w-2 h-2 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L13 16M17 20L21 16" />
                  </svg>
                </button>
              </div>
              {showFromDropdown && activeSegmentIndex === index && renderAirportDropdown(fromSuggestions, 'from', index)}
            </div>

            {/* To Input with Autocomplete */}
            <div className="relative" ref={index === activeSegmentIndex ? toRef : null}>
              <div className="bg-white p-2.5 md:p-3 flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 rounded-b-lg sm:rounded-r-lg sm:rounded-bl-none min-h-[72px]">
                <svg className="w-4 h-4 text-[#33a8da] rotate-180 shrink-0 self-center" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                <div className="flex-1 relative">
                  <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0 leading-none">{t('search.to')}</label>
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
                    className="w-full font-bold text-gray-900 focus:outline-none text-xs bg-transparent p-0 pr-5"
                    placeholder={t('search.toPlaceholder')}
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
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
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
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-[2px]">
            <div className={`p-2.5 md:p-3 flex items-center gap-2 relative cursor-pointer group hover:bg-gray-50 transition border-t sm:border-t-0 lg:border-l border-gray-100 min-h-[72px] ${isRangeSelected ? 'bg-blue-50/50' : 'bg-white'}`}>
              <svg className="w-4 h-4 text-gray-600 flex-shrink-0 self-center" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 flex gap-2 min-w-0">
                <div className="flex-1 min-w-0 relative h-auto flex flex-col justify-center">
                  <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0 leading-none truncate">{t('search.departure')}</label>
                  <span className={`block font-bold text-xs leading-tight truncate ${segment.date ? 'text-gray-900' : 'text-gray-400'}`}>
                    {segment.date ? new Date(segment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : t('search.selectDate')}
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
                  <div className="flex-1 min-w-0 border-l border-gray-100 pl-2 relative h-auto flex flex-col justify-center">
                    <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0 leading-none truncate">{t('search.return')}</label>
                    <span className={`block font-bold text-xs leading-tight truncate ${returnDate ? 'text-gray-900' : 'text-gray-400'}`}>
                      {returnDate ? new Date(returnDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : t('search.selectDate')}
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
            <div className="bg-white p-2.5 md:p-3 flex items-center gap-2 relative cursor-pointer group hover:bg-gray-50 transition border-t sm:border-t-0 sm:border-l border-gray-100 min-h-[72px]"
              ref={isFirst ? travellerRef : null}
              onClick={() => isFirst && setShowTravellerDropdown(!showTravellerDropdown)}>
              <svg className="w-4 h-4 text-gray-700 self-center" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <div className="flex-1 min-w-0">
                <label className="block text-[7px] font-bold text-gray-500 uppercase mb-0 leading-none">{t('search.travellers')}</label>
                <span className="block font-bold text-gray-900 text-xs leading-tight truncate">{getTravellerSummary()}</span>
              </div>
              {isFirst && renderTravellerDropdown()}
              {isMultiCity && index > 0 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); removeSegment(index); }} className="absolute -right-2.5 -top-2.5 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-md z-30">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {isFirst && (
          <button type="submit" disabled={loading || !segment.from || !segment.to || !segment.date} className="w-full lg:w-auto bg-black text-white px-5 py-3.5 lg:py-4 font-bold text-sm rounded-xl lg:rounded-lg hover:bg-gray-900 transition active:scale-95 min-w-[100px] shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5"></div>
                <span className="text-xs">{t('search.searchBtn')}</span>
              </>
            ) : t('search.searchBtn')}
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
            { id: 'flights' as const, label: t('nav.flights'), icon: <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /> },
            { id: 'hotels' as const, label: t('nav.hotels'), icon: <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2z" /> },
            { id: 'cars' as const, label: t('nav.cars'), icon: <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" /> }
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
                        {opt === 'round-trip' ? t('search.roundTrip') : opt === 'one-way' ? t('search.oneWay') : t('search.multiCity')}
                      </span>
                    </button>
                  ))}
                  <div className="flex items-center gap-2 md:gap-4 border-l border-gray-100 pl-4 h-8">
                    <div className="relative" ref={cabinRef}>
                      <button type="button" onClick={() => setShowCabinDropdown(!showCabinDropdown)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300 text-[10px] md:text-xs font-bold">
                        {cabinClass === 'economy' ? t('search.economy') :
                         cabinClass === 'premium_economy' ? t('search.premiumEconomy') :
                         cabinClass === 'business' ? t('search.business') :
                         t('search.first')} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={3} /></svg>
                      </button>
                      {showCabinDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          {[
                            { label: t('search.economy'), value: 'economy' },
                            { label: t('search.premiumEconomy'), value: 'premium_economy' },
                            { label: t('search.business'), value: 'business' },
                            { label: t('search.first'), value: 'first' }
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
                        {t('search.filters')}
                      </button>
                      {showFiltersDropdown && (
                        <div className="absolute top-full right-0 lg:left-0 mt-2 w-64 md:w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('search.stops')}</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { label: t('search.any'), value: 'Any' },
                                  { label: t('search.nonStop'), value: 'Non-stop' },
                                  { label: t('search.oneStop'), value: '1 Stop' },
                                  { label: t('search.twoPlusStops'), value: '2+ Stops' }
                                ].map((stop) => (
                                  <button
                                    key={stop.value}
                                    type="button"
                                    onClick={() => setStopsFilter(stop.value)}
                                    className={`py-2 px-3 rounded-lg text-[10px] md:text-xs font-bold border transition-all ${stopsFilter === stop.value ? 'bg-[#33a8da] text-white border-[#33a8da]' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-200'}`}
                                  >
                                    {stop.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-end mb-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('search.maxPrice')}</h4>
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
                              {t('search.apply')}
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
                    {t('search.addFlight')}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'hotels' && (
            <div className="space-y-3">
              {/* Provider Selector */}
              <div className="flex items-center gap-3 px-1">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{t('search.provider')}:</span>
                <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/20">
                  {[
                    { id: 'hotelbeds', label: t('search.hotelbeds'), icon: '🌍' },
                    { id: 'amadeus', label: t('search.amadeus'), icon: '✈️' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setHotelProvider(p.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${hotelProvider === p.id
                        ? 'bg-white text-[#33a8da] shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <span className="text-xs">{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row items-stretch gap-[2px] bg-[#33a8da] rounded-xl p-[2px] shadow-lg border border-white/20">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-[2px]">
                  {/* Hotel Location with Autocomplete */}
                  <div className="md:col-span-4 relative" ref={hotelLocationRef}>
                    <div className="bg-white p-2.5 md:p-3 flex items-center gap-2 md:rounded-l-lg min-h-[72px]">
                      <svg className="w-4 h-4 text-[#33a8da] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2z" />
                      </svg>
                      <div className="flex-1">
                        <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0">{t('search.destination')}</label>
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
                          className="w-full font-bold text-gray-900 focus:outline-none text-xs bg-transparent p-0"
                          placeholder={t('search.destinationPlaceholder')}
                        />
                      </div>
                      {hotelLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            setHotelLocation('');
                            setShowHotelLocationDropdown(false);
                          }}
                          className="text-gray-400 hover:text-gray-600 text-sm font-bold px-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {showHotelLocationDropdown && renderHotelLocationDropdown()}
                  </div>

                  {/* Check-in Date */}
                  <div className="md:col-span-4 bg-white p-2.5 md:p-3 flex items-center gap-2 relative border-t md:border-t-0 md:border-l border-gray-100 min-h-[72px]">
                    <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0">{t('search.checkIn')}</label>
                        <input
                          type="date"
                          min={today}
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          className="w-full font-bold outline-none text-xs bg-transparent p-0"
                        />
                      </div>
                      <div>
                        <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0">{t('search.checkOut')}</label>
                        <input
                          type="date"
                          min={checkInDate || today}
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          className="w-full font-bold outline-none text-xs bg-transparent p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guests & Search Button */}
                  <div className="md:col-span-4 bg-white p-2.5 md:p-3 flex items-center justify-between md:rounded-r-lg border-t md:border-t-0 md:border-l border-gray-100 min-h-[72px]">
                    <div className="flex items-center gap-2 flex-1">
                      <svg className="w-4 h-4 text-gray-700 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                      <div onClick={() => setShowTravellerDropdown(!showTravellerDropdown)} className="cursor-pointer">
                        <label className="block text-[7px] font-bold text-gray-400 uppercase mb-0">{t('search.guests')}</label>
                        <span className="block font-bold text-gray-900 text-xs">{getHotelGuestSummary()}</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-black text-white px-5 py-3.5 lg:py-4 font-bold text-sm rounded-xl lg:rounded-lg hover:bg-gray-900 transition active:scale-95 min-w-[100px] shadow-lg h-[42px] flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="flex items-center gap-1.5">
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                          <span className="text-xs">{t('search.searchBtn')}</span>
                        </div>
                      ) : t('search.searchBtn')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cars' && (
            <div className="flex flex-wrap items-stretch gap-[2px] bg-[#33a8da] rounded-xl p-[2px] relative">
              {/* Pick-up Location - 2 columns */}
              <div className="flex-1 lg:flex-2 relative">
                <div className="bg-white p-2 md:p-2.5 flex items-center gap-1.5 rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none min-h-[68px]">
                  <svg className="w-3.5 h-3.5 text-[#33a8da] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                  </svg>
                  <div className="flex-1 relative">
                    <label className="block text-[6px] font-bold text-gray-400 uppercase mb-0">{t('search.pickUp')}</label>
                    <input
                      type="text"
                      value={carPickUp}
                      onChange={(e) => handleCarPickUpChange(e.target.value)}
                      onFocus={() => setShowCarPickUpDropdown(true)}
                      placeholder={t('search.pickupPlaceholder')}
                      className="w-full font-bold text-gray-900 focus:outline-none text-[11px] bg-transparent p-0"
                    />
                  </div>
                  {carPickUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setCarPickUp('');
                        setShowCarPickUpDropdown(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-xs font-bold px-0.5"
                    >
                      ×
                    </button>
                  )}
                </div>
                {showCarPickUpDropdown && renderCarLocationDropdown(carPickUpSuggestions, 'pickUp')}
              </div>

              {/* Drop-off Location - 2 columns */}
              <div className="flex-1 lg:flex-2 relative">
                <div className="bg-white p-2 md:p-2.5 flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[68px]">
                  <svg className="w-3.5 h-3.5 text-[#33a8da] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                  </svg>
                  <div className="flex-1">
                    <label className="block text-[6px] font-bold text-gray-400 uppercase mb-0">{t('search.dropOff')}</label>
                    <input
                      type="text"
                      value={carDropOff}
                      onChange={(e) => handleCarDropOffChange(e.target.value)}
                      onFocus={() => setShowCarDropOffDropdown(true)}
                      placeholder={t('search.dropoffPlaceholder')}
                      className="w-full font-bold text-gray-900 focus:outline-none text-[11px] bg-transparent p-0"
                    />
                  </div>
                  {carDropOff && (
                    <button
                      type="button"
                      onClick={() => {
                        setCarDropOff('');
                        setShowCarDropOffDropdown(false);
                      }}
                      className="text-gray-400 hover:text-gray-600 text-xs font-bold px-0.5"
                    >
                      ×
                    </button>
                  )}
                </div>
                {showCarDropOffDropdown && renderCarLocationDropdown(carDropOffSuggestions, 'dropOff')}
              </div>

              {/* Pick-up Time - 1.5 columns */}
              <div className="flex-1 lg:flex-1.5 bg-white p-2 md:p-2.5 flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[68px]">
                <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <label className="block text-[6px] font-bold text-gray-400 uppercase mb-0">{t('search.pickTime')}</label>
                  <input
                    type="time"
                    value={carPickUpTime}
                    onChange={(e) => setCarPickUpTime(e.target.value)}
                    className="w-full font-bold outline-none text-[11px] bg-transparent p-0"
                  />
                </div>
              </div>

              {/* Pick-up Date - 1.5 columns */}
              <div className="flex-1 lg:flex-1.5 bg-white p-2 md:p-2.5 flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[68px]">
                <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  <label className="block text-[6px] font-bold text-gray-400 uppercase mb-0">{t('search.pickDate')}</label>
                  <input
                    type="date"
                    min={today}
                    value={carPickUpDate}
                    onChange={(e) => setCarPickUpDate(e.target.value)}
                    className="w-full font-bold outline-none text-[11px] bg-transparent p-0"
                  />
                </div>
              </div>

              {/* Drop-off Time - 1.5 columns */}
              <div className="flex-1 lg:flex-1.5 bg-white p-2 md:p-2.5 flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[68px]">
                <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <label className="block text-[6px] font-bold text-gray-400 uppercase mb-0">{t('search.dropTime')}</label>
                  <input
                    type="time"
                    value={carDropOffTime}
                    onChange={(e) => setCarDropOffTime(e.target.value)}
                    className="w-full font-bold outline-none text-[11px] bg-transparent p-0"
                  />
                </div>
              </div>

              {/* Drop-off Date - 1.5 columns */}
              <div className="flex-1 lg:flex-1.5 bg-white p-2 md:p-2.5 flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[68px]">
                <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="flex-1">
                  <label className="block text-[6px] font-bold text-gray-400 uppercase mb-0">{t('search.dropDate')}</label>
                  <input
                    type="date"
                    min={carPickUpDate || today}
                    value={carDropOffDate}
                    onChange={(e) => setCarDropOffDate(e.target.value)}
                    className="w-full font-bold outline-none text-[11px] bg-transparent p-0"
                  />
                </div>
              </div>

              {/* Passengers - 1 column */}
              <div className="flex-1 lg:flex-1 bg-white p-2 md:p-2.5 flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[68px]">
                <svg className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                <div onClick={() => setShowCarTravellerDropdown(!showCarTravellerDropdown)} className="cursor-pointer flex-1">
                  <label className="block text-[6px] font-bold text-gray-400 uppercase mb-0">{t('search.passengers')}</label>
                  <span className="block font-bold text-gray-900 text-[11px] leading-tight">{carTravellers}</span>
                </div>
              </div>

              {/* Search Button - 1 column */}
              <div className="flex-1 lg:flex-1 bg-white p-2 md:p-2.5 flex items-center justify-center md:rounded-r-lg border-t lg:border-t-0 lg:border-l border-gray-100 min-h-[68px]">
                <button
                  type="submit"
                  disabled={loading || !carPickUp || !carDropOff || !carPickUpDate || !carDropOffDate}
                  className="bg-black text-white px-3 py-2 font-bold text-xs rounded-lg hover:bg-gray-900 transition active:scale-95 w-full shadow-lg h-[36px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span className="text-[10px]">{t('search.searchBtn')}</span>
                    </div>
                  ) : t('search.searchBtn')}
                </button>
              </div>
            </div>
          )}

        </form>
      </div>

      {/* Car Traveller Dropdown (moved outside main container) */}
      {
        showCarTravellerDropdown && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setShowCarTravellerDropdown(false)}>
            <div className="bg-white p-6 rounded-2xl w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
              <h4 className="font-black text-gray-900 mb-4 uppercase text-xs tracking-widest">{t('search.passengers')}</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{t('search.passengers')}</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => updateCarTravellers(false)} className="w-8 h-8 rounded-full border border-gray-200">-</button>
                    <span className="font-bold">{carTravellers}</span>
                    <button type="button" onClick={() => updateCarTravellers(true)} className="w-8 h-8 rounded-full border border-gray-200">+</button>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowCarTravellerDropdown(false)} className="w-full bg-[#33a8da] text-white py-3 rounded-xl font-bold mt-6 text-xs uppercase tracking-widest">{t('search.done')}</button>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default SearchBox;