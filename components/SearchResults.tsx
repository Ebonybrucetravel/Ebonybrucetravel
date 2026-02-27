"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import type { SearchResult as BaseSearchResult } from "../lib/types";
import { type Airline, createAirlinesMap } from "../lib/duffel-airlines";

// Define baggage type
interface Baggage {
  type: string;
  quantity: number;
}

interface ExtendedSearchResult extends BaseSearchResult {
  // ===========================================
  // HOTEL FIELDS (UNTouched)
  // ===========================================
  amenities?: string[];
  
  // ===========================================
  // CAR RENTAL FIELDS (UNTouched)
  // ===========================================
  stops?: string;
  vehicleCode?: string;
  vehicleCategory?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  distance?: string;
  cancellationPolicy?: string;
  providerLogo?: string;
  termsUrl?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupDateTime?: string;
  dropoffDateTime?: string;
  originalPrice?: string;
  originalCurrency?: string;
  conversionFee?: string;
  conversionNote?: string;
  duration?: string;
  isRefundable?: boolean;
  
  // ===========================================
  // FLIGHT FIELDS (Updated to match API)
  // ===========================================
  airlineCode?: string;
  offer_request_id?: string;
  offer_id?: string;
  
  // Price fields
  total_amount?: string;
  total_currency?: string;
  base_amount?: string;
  base_currency?: string;
  tax_amount?: string;
  tax_currency?: string;
  
  // Conversion and markup fields
  original_amount?: string;
  original_currency?: string;
  conversion_fee?: string;
  conversion_fee_percentage?: number;
  price_after_conversion?: string;
  markup_percentage?: number;
  markup_amount?: string;
  final_amount?: string;
  currency?: string;
  
  // Owner/Airline information
  owner?: {
    id?: string;
    name?: string;
    iata_code?: string;
    logo_symbol_url?: string;
    logo_lockup_url?: string;
    conditions_of_carriage_url?: string;
  };
  
  // Slices (journey segments) - Duffel format
  slices?: Array<{
    duration?: string;
    segments: Array<{
      departing_at: string;
      arriving_at: string;
      duration?: string;
      origin: {
        iata_code: string;
        name: string;
        city?: {
          name: string;
        };
        city_name?: string;
      };
      destination: {
        iata_code: string;
        name: string;
        city?: {
          name: string;
        };
        city_name?: string;
      };
      operating_carrier?: {
        name: string;
        iata_code: string;
        logo_symbol_url?: string;
      };
      marketing_carrier?: {
        name: string;
        iata_code: string;
        logo_symbol_url?: string;
      };
      flight_number?: string;
      marketing_carrier_flight_number?: string;
      passengers?: Array<{
        baggages?: Array<{
          type: string;
          quantity: number;
        }>;
        cabin_class_marketing_name?: string;
      }>;
    }>;
  }>;
  
  // Itineraries - Amadeus format (using a different name to avoid conflict)
  flightItineraries?: Array<{
    duration?: string;
    segments: Array<{
      departure?: {
        iataCode?: string;
        at?: string;
      };
      arrival?: {
        iataCode?: string;
        at?: string;
      };
      carrierCode?: string;
      number?: string;
      aircraft?: {
        code?: string;
      };
      operating?: {
        carrierCode?: string;
      };
    }>;
  }>;
  
  // Price object - Amadeus format (using a different name to avoid conflict)
  priceDetails?: {
    total?: string;
    currency?: string;
    base?: string;
    fees?: Array<{
      amount?: string;
      type?: string;
    }>;
    grandTotal?: string;
  };
  
  // Traveler pricing
  traveler_pricings?: Array<{
    traveler_id?: string;
    fare_option?: string;
    traveler_type?: string;
    price?: {
      currency?: string;
      total?: string;
      base?: string;
    };
    fare_details_by_segment?: Array<{
      segment_id?: string;
      cabin?: string;
      fare_basis?: string;
      branded_fare?: string;
      class?: string;
      included_checked_bags?: {
        quantity?: number;
      };
    }>;
  }>;
  
  // Payment requirements
  payment_requirements?: {
    requires_instant_payment: boolean;
    price_guarantee_expires_at?: string | null;
    payment_required_by?: string;
  };
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  
  // Emissions data
  total_emissions_kg?: string;
  
  // Status flags
  live_mode?: boolean;
  partial?: boolean;
  
  // Supported document types
  supported_passenger_identity_document_types?: string[];
  passenger_identity_documents_required?: boolean;
  
  // Loyalty programmes
  supported_loyalty_programmes?: string[];
  
  // Conditions
  conditions?: {
    refund_before_departure?: {
      allowed: boolean;
      penalty_amount?: string | null;
      penalty_currency?: string | null;
    };
    change_before_departure?: {
      allowed: boolean;
      penalty_amount?: string | null;
      penalty_currency?: string | null;
    };
  };
  
  // ===========================================
  // COMPUTED FIELDS (Added during processing)
  // ===========================================
  departureAirport?: string;
  arrivalAirport?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureTime?: string;
  arrivalTime?: string;
  airlineName?: string;
  airlineLogo?: string;
  stopCount?: number;
  stopText?: string;
  flightNumber?: string;
  cabin?: string;
  baggage?: string;
  
  displayPrice?: string;
  rawPrice?: number;
  
  // ===========================================
  // BACKWARD COMPATIBILITY (Keep as is)
  // ===========================================
  realData?: {
    vehicle?: {
      imageURL?: string;
    };
    imageURL?: string;
    airlineCode?: string;
    airlineLogo?: string;
    departureTime?: string;
    arrivalTime?: string;
    departureAirport?: string;
    arrivalAirport?: string;
    slices?: Array<any>;
    [key: string]: any;
  };
  
  type?: "flights" | "hotels" | "car-rentals";
}

interface SearchResultsProps {
  results: ExtendedSearchResult[] | { data: ExtendedSearchResult[]; meta?: any; message?: string };
  searchParams: any;
  onClear: () => void;
  onSelect?: (item: ExtendedSearchResult) => void;
  isLoading?: boolean;
  airlines?: Airline[];
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchParams,
  onClear,
  onSelect,
  isLoading = false,
  airlines = [],
}) => {
  const { currency } = useLanguage();
  const searchType = (searchParams?.type || "flights").toLowerCase() as "flights" | "hotels" | "car-rentals";

  // Debug log to see what we're receiving
  useEffect(() => {
    console.log('🔍 SearchResults received:', {
      resultsType: typeof results,
      isArray: Array.isArray(results),
      hasData: results && typeof results === 'object' && 'data' in results,
      dataLength: results && typeof results === 'object' && 'data' in results && Array.isArray(results.data) ? results.data.length : 0,
      arrayLength: Array.isArray(results) ? results.length : 0
    });
  }, [results]);

  // Extract flight offers from the response
  const flightOffers = useMemo(() => {
    if (results && typeof results === 'object' && 'data' in results && Array.isArray(results.data)) {
      console.log('✅ Using results.data with', results.data.length, 'items');
      return results.data;
    }
    if (Array.isArray(results)) {
      console.log('✅ Using results array with', results.length, 'items');
      return results;
    }
    console.log('❌ No valid flight offers found');
    return [];
  }, [results]);

  // Debug log for flight offers
  useEffect(() => {
    if (flightOffers.length > 0) {
      console.log('📦 First flight offer raw data:', {
        id: flightOffers[0].id,
        hasSlices: !!flightOffers[0].slices,
        slicesLength: flightOffers[0].slices?.length,
        hasItineraries: !!flightOffers[0].flightItineraries,
        itinerariesLength: flightOffers[0].flightItineraries?.length,
        segmentsFromSlices: flightOffers[0].slices?.[0]?.segments?.length,
        segmentsFromItineraries: flightOffers[0].flightItineraries?.[0]?.segments?.length
      });
    }
  }, [flightOffers]);

  // Shared States
  const [priceRange, setPriceRange] = useState<number>(2000000);
  const [sortBy, setSortBy] = useState<"match" | "price" | "rating">("match");
  const [visibleCount, setVisibleCount] = useState(6);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Flight Specific Filters
  const [stopsFilter, setStopsFilter] = useState<string[]>([]);
  const [airlinesFilter, setAirlinesFilter] = useState<string[]>([]);

  // ===========================================
  // HOTEL FILTERS (UNTOUCHED)
  // ===========================================
  const [starRatings, setStarRatings] = useState<number[]>([]);
  const [amenitiesFilter, setAmenitiesFilter] = useState<string[]>([]);

  // ===========================================
  // CAR RENTAL FILTERS (UNTOUCHED)
  // ===========================================
  const [carTypeFilter, setCarTypeFilter] = useState<string[]>([]);
  const [transmissionFilter, setTransmissionFilter] = useState<string[]>([]);
  const [seatCapacityFilter, setSeatCapacityFilter] = useState<number[]>([]);
  const [providerFilter, setProviderFilter] = useState<string[]>([]);

  // Create airlines map from props
  const airlinesMap = useMemo(() => createAirlinesMap(airlines), [airlines]);

  // ===========================================
  // HELPER FUNCTIONS
  // ===========================================

  // Format duration from ISO 8601
  const formatDuration = (duration?: string): string => {
    if (!duration) return '';
    
    // Handle durations like "PT14H45M" or "P1DT3H5M"
    let totalHours = 0;
    let totalMinutes = 0;
    
    // Extract days if present (format: P1DT3H5M)
    const daysMatch = duration.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]) || 0;
      const hours = parseInt(daysMatch[2]) || 0;
      const minutes = parseInt(daysMatch[3]) || 0;
      
      totalHours = (days * 24) + hours;
      totalMinutes = minutes;
    } else {
      // Try simple format: PT14H45M
      const hours = duration.match(/(\d+)H/);
      const minutes = duration.match(/(\d+)M/);
      totalHours = hours ? parseInt(hours[1]) : 0;
      totalMinutes = minutes ? parseInt(minutes[1]) : 0;
    }
    
    if (totalHours === 0 && totalMinutes === 0) return '';
    
    if (totalHours > 0 && totalMinutes > 0) {
      return `${totalHours}h ${totalMinutes}m`;
    } else if (totalHours > 0) {
      return `${totalHours}h`;
    } else {
      return `${totalMinutes}m`;
    }
  };

// Format price
const formatPrice = (amount: string, currencyCode: string): string => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return 'Price on request';
  
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (e) {
    // Fallback if currency code is invalid
    return `${currencyCode} ${numericAmount.toFixed(2)}`;
  }
};

  // Format time
  const formatTime = (dateTimeStr?: string): string => {
    if (!dateTimeStr) return '--:--';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  // Format date
  const formatDate = (dateTimeStr?: string): string => {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Helper to parse baggage JSON
  const parseBaggage = (baggageStr?: string): Array<{type: string; quantity: number}> => {
    if (!baggageStr) return [];
    try {
      return JSON.parse(baggageStr);
    } catch {
      return [];
    }
  };


  // Process flight offers - ONLY use API values, NO FALLBACKS
const processedFlightOffers = useMemo(() => {
  if (searchType !== 'flights' || flightOffers.length === 0) return [];

  console.log('Processing flight offers:', flightOffers.length);

  return flightOffers.map((offer: ExtendedSearchResult, index) => {
    // Try multiple ways to get segments
    let segments: any[] = [];
    let firstSlice: any = null;
    let firstSegment: any = null;
    let lastSegment: any = null;
    
    // Method 1: Check if offer has slices (standard Duffel format)
    if (offer.slices && offer.slices.length > 0) {
      firstSlice = offer.slices[0];
      segments = firstSlice?.segments || [];
    } 
    // Method 2: Check if offer has flightItineraries (Amadeus format)
    else if (offer.flightItineraries && offer.flightItineraries.length > 0) {
      firstSlice = offer.flightItineraries[0];
      segments = firstSlice?.segments || [];
    }
    // Method 3: Check if offer has realData with slices
    else if (offer.realData?.slices && offer.realData.slices.length > 0) {
      firstSlice = offer.realData.slices[0];
      segments = firstSlice?.segments || [];
    }
    
    if (segments.length > 0) {
      firstSegment = segments[0];
      lastSegment = segments[segments.length - 1];
    }
    
    // Get carrier information
    let airlineCode = '';
    let airlineName = 'Unknown Airline';
    let logoUrl = '';
    
    // Try to get from offer.owner first
    if (offer.owner) {
      airlineCode = offer.owner.iata_code || '';
      airlineName = offer.owner.name || 'Unknown Airline';
      logoUrl = offer.owner.logo_symbol_url || '';
    }
    
    // Try to get from first segment
    if (firstSegment) {
      const carrier = firstSegment.operating_carrier || firstSegment.marketing_carrier;
      if (carrier) {
        airlineCode = carrier.iata_code || carrier.carrierCode || airlineCode;
        airlineName = carrier.name || airlineName;
        logoUrl = carrier.logo_symbol_url || logoUrl;
      }
    }
    
    // Try to get from airlinesMap if we have airlineCode
    if (!logoUrl && airlineCode) {
      const airlineFromMap = airlinesMap.get(airlineCode);
      if (airlineFromMap) {
        logoUrl = airlineFromMap.logo_symbol_url || '';
      }
    }

    // CRITICAL: Calculate stops based on number of segments
    const segmentCount = segments.length;
    const stopCount = segmentCount > 0 ? segmentCount - 1 : 0;
    
    // Determine stop text
    let stopText = 'Direct';
    if (stopCount === 1) {
      stopText = '1 Stop';
    } else if (stopCount > 1) {
      stopText = `${stopCount} Stops`;
    }

    // Get departure and arrival information
    let departureAirport = '---';
    let departureCity = '';
    let departureTime = '';
    let arrivalAirport = '---';
    let arrivalCity = '';
    let arrivalTime = '';
    
    if (firstSegment) {
      // Try Duffel format
      if (firstSegment.origin) {
        departureAirport = firstSegment.origin.iata_code || departureAirport;
        departureCity = firstSegment.origin.city_name || firstSegment.origin.city?.name || '';
      }
      // Try Amadeus format
      if (firstSegment.departure) {
        departureAirport = firstSegment.departure.iataCode || departureAirport;
        departureTime = firstSegment.departure.at || '';
      }
      departureTime = firstSegment.departing_at || firstSegment.departure?.at || departureTime;
    }
    
    if (lastSegment) {
      // Try Duffel format
      if (lastSegment.destination) {
        arrivalAirport = lastSegment.destination.iata_code || arrivalAirport;
        arrivalCity = lastSegment.destination.city_name || lastSegment.destination.city?.name || '';
      }
      // Try Amadeus format
      if (lastSegment.arrival) {
        arrivalAirport = lastSegment.arrival.iataCode || arrivalAirport;
        arrivalTime = lastSegment.arrival.at || '';
      }
      arrivalTime = lastSegment.arriving_at || lastSegment.arrival?.at || arrivalTime;
    }

    // Get duration
    const duration = firstSlice?.duration || '';

    // ===========================================
    // PRICE FROM API - ONLY use final_amount and currency
    // ===========================================
    let priceAmount = '0';
    let priceCurrency = 'GBP';
    
    // DIRECT from API - these fields exist in your response
    if (offer.final_amount) {
      priceAmount = offer.final_amount;
      priceCurrency = offer.currency || 'GBP';
      console.log(`✅ API PRICE for ${offer.id}:`, { 
        final_amount: offer.final_amount, 
        currency: offer.currency,
        formatted: formatPrice(offer.final_amount, offer.currency || 'GBP')
      });
    } else {
      console.error(`❌ No final_amount found in API response for offer:`, offer.id);
    }
    
    const formattedPrice = formatPrice(priceAmount, priceCurrency);

    // Get baggage information
    let baggageInfo: any[] = [];
    if (firstSegment?.passengers?.[0]?.baggages) {
      baggageInfo = firstSegment.passengers[0].baggages;
    } else if (offer.traveler_pricings?.[0]?.fare_details_by_segment?.[0]?.included_checked_bags) {
      const bags = offer.traveler_pricings[0].fare_details_by_segment[0].included_checked_bags;
      if (bags?.quantity) {
        baggageInfo = [{ type: 'checked', quantity: bags.quantity }];
      }
    }
    
    const baggageString = baggageInfo.length > 0 ? JSON.stringify(baggageInfo) : undefined;

    // Get flight number
    let flightNumber = '';
    if (firstSegment?.marketing_carrier_flight_number) {
      flightNumber = firstSegment.marketing_carrier_flight_number;
    } else if (firstSegment?.flight_number) {
      flightNumber = firstSegment.flight_number;
    } else if (firstSegment?.number) {
      flightNumber = firstSegment.number;
    }

    // Get cabin class
    let cabin = 'Economy';
    if (firstSegment?.passengers?.[0]?.cabin_class_marketing_name) {
      cabin = firstSegment.passengers[0].cabin_class_marketing_name;
    } else if (offer.traveler_pricings?.[0]?.fare_details_by_segment?.[0]?.cabin) {
      cabin = offer.traveler_pricings[0].fare_details_by_segment[0].cabin;
    }

    const processedOffer: ExtendedSearchResult = {
      ...offer,
      type: 'flights',
      departureAirport,
      arrivalAirport,
      departureCity,
      arrivalCity,
      departureTime,
      arrivalTime,
      airlineCode,
      airlineName,
      airlineLogo: logoUrl,
      stopCount,
      stopText,
      duration,
      // PRICE FIELDS - DIRECT FROM API
      displayPrice: formattedPrice,
      rawPrice: parseFloat(priceAmount),
      price: formattedPrice,
      // Preserve original API values
      final_amount: offer.final_amount,
      currency: offer.currency,
      flightNumber,
      cabin,
      baggage: baggageString,
      title: `${departureAirport} → ${arrivalAirport}`,
      subtitle: airlineName,
      provider: airlineName,
      image: logoUrl,
    };
    
    return processedOffer;
  });
}, [flightOffers, searchType, airlinesMap]);



  // Debug log for processed offers
  useEffect(() => {
    if (processedFlightOffers.length > 0) {
      console.log('✅ Processed flight offers:', processedFlightOffers.map(o => ({
        id: o.id,
        stopCount: o.stopCount,
        stopText: o.stopText,
        price: o.price,
        displayPrice: o.displayPrice
      })));
    }
  }, [processedFlightOffers]);

  // Combine results
  const allResults = useMemo(() => {
    if (searchType === 'flights') {
      return processedFlightOffers;
    }
    if (Array.isArray(results)) {
      return results.map(r => ({
        ...r,
        type: r.type || searchType
      }));
    }
    if (results && typeof results === 'object' && 'data' in results) {
      return results.data.map(r => ({
        ...r,
        type: r.type || searchType
      }));
    }
    return [];
  }, [results, searchType, processedFlightOffers]);

  // ===========================================
  // CAR RENTAL EXTRACTIONS (UNTOUCHED)
  // ===========================================
  const uniqueCarTypes = useMemo(() => {
    const types = allResults
      .filter(r => r.type === 'car-rentals')
      .map(r => r.vehicleCode || '')
      .filter(Boolean);
    return Array.from(new Set(types));
  }, [allResults]);

  const uniqueSeatCapacities = useMemo(() => {
    const seats = allResults
      .filter(r => r.type === 'car-rentals')
      .map(r => r.seats || 0)
      .filter(s => s > 0);
    return Array.from(new Set(seats)).sort((a, b) => a - b);
  }, [allResults]);

  const uniqueProviders = useMemo(() => {
    const providers = allResults
      .filter(r => r.type === 'car-rentals')
      .map(r => r.provider)
      .filter(Boolean);
    return Array.from(new Set(providers));
  }, [allResults]);

  // Get unique airlines for filtering
  const uniqueAirlines = useMemo(() => {
    if (searchType !== 'flights') return [];
    return Array.from(new Set(
      allResults
        .filter(r => r.type === 'flights')
        .map(r => r.airlineName || r.provider || 'Unknown')
        .filter(Boolean)
    ));
  }, [allResults, searchType]);

  const filteredResults = useMemo(() => {
    let filtered = [...allResults];

    // Basic Price Filter
    filtered = filtered.filter((item) => {
      let numericPrice = 0;
      
      if (item.rawPrice) {
        numericPrice = item.rawPrice;
      } else if (item.price) {
        numericPrice = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
      } else if (item.total_amount) {
        numericPrice = parseFloat(item.total_amount) || 0;
      }
      
      return numericPrice <= priceRange;
    });

    // Flight Filtering (UPDATED)
    if (searchType === "flights") {
      if (stopsFilter.length > 0) {
        filtered = filtered.filter(item => {
          const stopCount = item.stopCount || 0;
          const stopType = stopCount === 0 ? 'Direct' : stopCount === 1 ? '1 Stop' : '2+ Stops';
          return stopsFilter.includes(stopType);
        });
      }
      if (airlinesFilter.length > 0) {
        filtered = filtered.filter(item => {
          const airlineName = item.airlineName || item.provider || '';
          return airlinesFilter.includes(airlineName);
        });
      }
    } 

    // ===========================================
    // HOTEL FILTERING (UNTOUCHED)
    // ===========================================
    else if (searchType === "hotels") {
      if (starRatings.length > 0) {
        filtered = filtered.filter(item => starRatings.includes(Math.floor(item.rating || 0)));
      }
      if (amenitiesFilter.length > 0) {
        filtered = filtered.filter(item => amenitiesFilter.every(a => item.amenities?.includes(a)));
      }
    }

    // ===========================================
    // CAR RENTAL FILTERING (UNTOUCHED)
    // ===========================================
    else if (searchType === "car-rentals") {
      if (carTypeFilter.length > 0) {
        filtered = filtered.filter(item => 
          item.vehicleCode && carTypeFilter.includes(item.vehicleCode)
        );
      }
      if (transmissionFilter.length > 0) {
        filtered = filtered.filter(item => 
          item.transmission && transmissionFilter.includes(item.transmission)
        );
      }
      if (seatCapacityFilter.length > 0) {
        filtered = filtered.filter(item => 
          item.seats && seatCapacityFilter.includes(item.seats)
        );
      }
      if (providerFilter.length > 0) {
        filtered = filtered.filter(item => 
          item.provider && providerFilter.includes(item.provider)
        );
      }
    }

    // Sorting (UPDATED for flights)
    if (sortBy === "price") {
      filtered.sort((a, b) => {
        const pA = a.rawPrice || parseFloat(a.price?.replace(/[^\d.]/g, '') || '0') || 0;
        const pB = b.rawPrice || parseFloat(b.price?.replace(/[^\d.]/g, '') || '0') || 0;
        return pA - pB;
      });
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "match" && searchType === 'flights') {
      filtered.sort((a, b) => {
        const timeA = a.departureTime || '';
        const timeB = b.departureTime || '';
        return timeA.localeCompare(timeB);
      });
    }

    return filtered;
  }, [allResults, searchType, priceRange, sortBy, stopsFilter, airlinesFilter, starRatings, amenitiesFilter, carTypeFilter, transmissionFilter, seatCapacityFilter, providerFilter]);

  const toggleFilter = (set: React.Dispatch<React.SetStateAction<any[]>>, current: any[], value: any) => {
    set(current.includes(value) ? current.filter(i => i !== value) : [...current, value]);
  };

  const clearAllFilters = () => {
    setPriceRange(2000000);
    setStopsFilter([]);
    setAirlinesFilter([]);
    setStarRatings([]);
    setAmenitiesFilter([]);
    setCarTypeFilter([]);
    setTransmissionFilter([]);
    setSeatCapacityFilter([]);
    setProviderFilter([]);
  };

  const renderFilterSection = (title: string, content: React.ReactNode) => (
    <div className="py-6 border-b border-gray-100 last:border-0">
      <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.15em] mb-4">{title}</h4>
      <div className="space-y-3">{content}</div>
    </div>
  );

  const renderCheckbox = (label: string, isChecked: boolean, onChange: () => void) => (
    <label key={label} className="flex items-center gap-3 cursor-pointer group">
      <div 
        onClick={onChange}
        className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${isChecked ? 'bg-[#33a8da] border-[#33a8da]' : 'border-gray-200 group-hover:border-[#33a8da]'}`}
      >
        {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-xs font-bold ${isChecked ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{label}</span>
    </label>
  );

  // ===========================================
  // HOTEL CARD (UNTOUCHED)
  // ===========================================
  const renderHotelCard = (item: ExtendedSearchResult) => {
    const starRating = Math.floor(item.rating || 4);
    return (
      <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-[320px] h-64 md:h-auto overflow-hidden relative flex-shrink-0">
            <img 
              src={item.image || `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600`} 
              className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
              alt={item.title} 
            />
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setSavedItems(p => { 
                  const n = new Set(p); 
                  n.has(item.id) ? n.delete(item.id) : n.add(item.id); 
                  return n; 
                }); 
              }} 
              className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-md ${savedItems.has(item.id) ? "bg-red-500 text-white" : "bg-white/40 text-gray-400 hover:bg-white"}`}
            >
              <svg className="w-5 h-5" fill={savedItems.has(item.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth={2}/>
              </svg>
            </button>
          </div>
          <div className="flex-1 p-8">
            <h3 className="text-xl font-black text-gray-900 group-hover:text-[#33a8da] transition">{item.title}</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">{item.subtitle}</p>
            <div className="flex items-center gap-4 mt-4 mb-6">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className={`w-3.5 h-3.5 ${i < starRating ? "fill-current" : "text-gray-200"}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <div className="flex items-end justify-between pt-6 border-t border-gray-50">
              <div>
                <p className="text-2xl font-black text-[#33a8da]">{item.price}</p>
              </div>
              <button 
                onClick={() => onSelect?.(item)} 
                className="bg-[#33a8da] text-white font-black px-8 py-3 rounded-xl transition hover:bg-[#2c98c7] uppercase text-[11px]"
              >
                Book Hotel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

// ===========================================
// FLIGHT CARD - USE ONLY PROCESSED VALUES
// ===========================================
const renderFlightCard = (item: ExtendedSearchResult) => {
  const departureAirport = item.departureAirport || '---';
  const arrivalAirport = item.arrivalAirport || '---';
  const departureTime = item.departureTime;
  const arrivalTime = item.arrivalTime;
  const airlineName = item.airlineName || item.provider || 'Unknown Airline';
  const airlineCode = item.airlineCode || '';
  const logoUrl = item.airlineLogo || item.image;
  
  // Get stop info - from processed fields
  const stopCount = item.stopCount || 0;
  const stopText = item.stopText || (stopCount === 0 ? 'Direct' : stopCount === 1 ? '1 Stop' : `${stopCount} Stops`);
  
  const duration = formatDuration(item.duration);
  
  // ===== USE ONLY THE PROCESSED DISPLAY PRICE =====
  // This comes DIRECTLY from final_amount in the API
  const displayPrice = item.displayPrice || 'Price on request';
  
  console.log(`Rendering flight ${item.id} with API price:`, {
    final_amount: item.final_amount,
    currency: item.currency,
    displayPrice: displayPrice
  });

  const showOriginal = item.original_amount && item.original_currency !== (item.currency || 'GBP');

  // Parse baggage from JSON string
  const baggageInfo = parseBaggage(item.baggage);

  // Get connection info for multi-stop flights
  const segments = item.slices?.[0]?.segments || [];
  const hasConnection = segments.length > 1;
  const connectionAirport = hasConnection ? segments[1]?.origin?.iata_code : null;

  return (
    <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col md:flex-row p-8 gap-8">
        <div className="flex-1">
          {/* Airline Info */}
          <div className="flex items-center gap-4 mb-6">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                className="w-12 h-12 object-contain rounded-lg border border-gray-100 p-1" 
                alt={airlineName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2&size=48`;
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-[#33a8da] to-[#2c98c7] rounded-lg flex items-center justify-center text-white font-black text-sm">
                {airlineCode?.substring(0, 2) || airlineName?.substring(0, 2) || 'FL'}
              </div>
            )}
            <div>
              <h4 className="text-base font-black text-gray-900">{airlineName}</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {item.flightNumber && `Flight ${item.flightNumber}`} {item.cabin && `• ${item.cabin}`}
              </p>
            </div>
          </div>

          {/* Flight Route */}
          <div className="flex items-center justify-between">
            {/* Departure */}
            <div className="text-center flex-1">
              <p className="text-3xl font-black text-gray-900">
                {formatTime(departureTime)}
              </p>
              <p className="text-[11px] font-black text-gray-400 uppercase mt-2">Depart</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{departureAirport}</p>
              {item.departureCity && (
                <p className="text-[9px] font-bold text-gray-400">{item.departureCity}</p>
              )}
              <p className="text-[8px] font-bold text-gray-300 mt-2">
                {formatDate(departureTime)}
              </p>
            </div>

            {/* Flight Path */}
            <div className="flex-1 px-6">
              <div className="relative">
                <div className="w-full h-[2px] bg-gray-100"></div>
                <div className="absolute left-1/2 -translate-x-1/2 -top-3 text-[#33a8da]">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                  </svg>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                  {stopText}
                </span>
                <span className="text-[9px] font-black text-gray-400">
                  {duration}
                </span>
              </div>
              {hasConnection && connectionAirport && (
                <p className="text-[8px] font-bold text-gray-300 text-center mt-2">
                  via {connectionAirport}
                </p>
              )}
            </div>

            {/* Arrival */}
            <div className="text-center flex-1">
              <p className="text-3xl font-black text-gray-900">
                {formatTime(arrivalTime)}
              </p>
              <p className="text-[11px] font-black text-gray-400 uppercase mt-2">Arrive</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{arrivalAirport}</p>
              {item.arrivalCity && (
                <p className="text-[9px] font-bold text-gray-400">{item.arrivalCity}</p>
              )}
              <p className="text-[8px] font-bold text-gray-300 mt-2">
                {formatDate(arrivalTime)}
              </p>
            </div>
          </div>

          {/* Baggage Info */}
          {baggageInfo.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-50">
              <div className="flex items-center gap-4">
                {baggageInfo.map((bag: any, idx: number) => (
                  <span key={idx} className="text-[9px] font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
                    {bag.quantity} {bag.type} bag
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Price and CTA */}
        <div className="w-full md:w-[280px] flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
          <p className="text-3xl font-black text-[#33a8da] mb-2">{displayPrice}</p>
          
          {showOriginal && (
            <p className="text-[9px] font-bold text-gray-400 mb-2">
              Original: {item.original_currency} {parseFloat(item.original_amount || '0').toFixed(2)}
              {item.conversion_fee && ` • +${item.conversion_fee} fee`}
            </p>
          )}
          
          
          
          <button 
            onClick={() => {
              console.log('Selected flight:', {
                id: item.id,
                airline: airlineName,
                from: departureAirport,
                to: arrivalAirport,
                price: displayPrice,
                stops: stopText
              });
              onSelect?.(item);
            }} 
            className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl transition hover:bg-[#2c98c7] uppercase text-xs tracking-wider shadow-lg hover:shadow-xl"
          >
            Select Flight
          </button>

          {item.payment_requirements?.requires_instant_payment && (
            <p className="text-[8px] font-bold text-orange-600 mt-2">
              Instant payment required
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

  // ===========================================
  // CAR CARD (UNTOUCHED)
  // ===========================================
  const renderCarCard = (item: ExtendedSearchResult) => {
    const duration = formatDuration(item.duration);
    const isLongDistance = item.distance && item.distance.includes('MI');
    const isSixt = item.provider?.includes('Sixt');
    
    // Parse baggage from JSON string or use original logic
    const baggageInfo = parseBaggage(item.baggage);
    const baggageCount = baggageInfo.length > 0 ? 
      baggageInfo.reduce((total, bag) => total + bag.quantity, 0) : 
      (item.baggage ? parseInt(item.baggage) : 0);
    
    const getCarImageUrl = () => {
      if (item.image && !item.image.includes('unsplash') && !item.image.includes('placeholder')) {
        return item.image;
      }
      if (item.realData?.vehicle?.imageURL) {
        return item.realData.vehicle.imageURL;
      }
      if (item.realData?.imageURL) {
        return item.realData.imageURL;
      }
      if (item.providerLogo) {
        return item.providerLogo;
      }
      if (item.vehicleCode?.includes('SUV')) {
        return 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=600';
      } else if (item.vehicleCode?.includes('VAN')) {
        return 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600';
      } else if (item.vehicleCode?.includes('FC') || item.vehicleCategory?.includes('Luxury')) {
        return 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&q=80&w=600';
      } else if (item.vehicleCategory?.includes('BU') || item.vehicleCategory?.includes('Business')) {
        return 'https://images.unsplash.com/photo-1563720223486-3294265d5a7c?auto=format&fit=crop&q=80&w=600';
      }
      return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
    };
  
    const carImageUrl = getCarImageUrl();
  
    return (
      <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-[320px] h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8 relative">
            <img 
              src={carImageUrl}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-300" 
              alt={item.title}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (item.providerLogo && target.src !== item.providerLogo) {
                  target.src = item.providerLogo;
                  return;
                }
                if (item.vehicleCode?.includes('SUV')) {
                  target.src = 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=600';
                } else if (item.vehicleCode?.includes('VAN')) {
                  target.src = 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600';
                } else if (item.vehicleCode?.includes('FC') || item.vehicleCategory?.includes('Luxury')) {
                  target.src = 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&q=80&w=600';
                } else if (item.vehicleCategory?.includes('BU') || item.vehicleCategory?.includes('Business')) {
                  target.src = 'https://images.unsplash.com/photo-1563720223486-3294265d5a7c?auto=format&fit=crop&q=80&w=600';
                } else {
                  target.src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
                }
              }}
            />
            
            {item.providerLogo && item.providerLogo !== carImageUrl && (
              <div className="absolute top-4 left-4 bg-white rounded-lg p-2 shadow-md">
                <img 
                  src={item.providerLogo} 
                  alt={item.provider} 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="absolute top-4 right-4 bg-[#33a8da]/90 backdrop-blur-sm text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
              {item.vehicleCode || item.vehicleCategory || 'CAR'}
            </div>
          </div>
          
          <div className="flex-1 p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-[#33a8da] transition">
                  {item.title}
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">
                  {item.provider} • {item.vehicleCategory || 'Standard'}
                </p>
              </div>
              {!isSixt && (
                <span className="bg-blue-50 text-[#33a8da] text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border border-blue-100">
                  Live Deal
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {item.seats && item.seats > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 4.5v15m7.5-7.5h-15" strokeWidth={1.5} />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {item.seats} Seats
                  </span>
                </div>
              )}
              
              {baggageCount > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={1.5} />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {baggageCount} Bags
                  </span>
                </div>
              )}
              
              {item.transmission && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeWidth={1.5} />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {item.transmission}
                  </span>
                </div>
              )}
              
              {duration && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={1.5} />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {duration}
                  </span>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between text-[10px]">
                <div>
                  <p className="text-gray-500 font-bold uppercase">Pick-up</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {item.pickupLocation || searchParams?.pickupLocationCode || 'LHR'}
                  </p>
                  <p className="text-gray-500 text-[9px] mt-0.5">
                    {item.pickupDateTime ? new Date(item.pickupDateTime).toLocaleDateString() : searchParams?.pickupDateTime?.split('T')[0]}
                  </p>
                </div>
                <div className="text-[#33a8da]">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth={2} stroke="currentColor" fill="none" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 font-bold uppercase">Drop-off</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {item.dropoffLocation || searchParams?.dropoffLocationCode || 'CDG'}
                  </p>
                  <p className="text-gray-500 text-[9px] mt-0.5">
                    {item.dropoffDateTime ? new Date(item.dropoffDateTime).toLocaleDateString() : searchParams?.dropoffDateTime?.split('T')[0]}
                  </p>
                </div>
              </div>
              {item.distance && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">
                    Distance: {item.distance}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-end justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="text-2xl font-black text-[#33a8da]">
                  {item.price}
                </p>
                {item.originalPrice && item.originalCurrency !== currency.code && (
                  <p className="text-[9px] font-bold text-gray-400 mt-1">
                    Original: {item.originalCurrency} {item.originalPrice}
                    {item.conversionNote && ` • ${item.conversionNote}`}
                  </p>
                )}
                <p className="text-[9px] font-bold text-gray-400 mt-1">
                  {isLongDistance ? 'Total for transfer' : 'Total for duration'}
                </p>
              </div>
              <button 
                onClick={() => {
                  console.log('Selected car data:', item);
                  onSelect?.(item);
                }} 
                className="bg-[#33a8da] text-white font-black px-8 py-3 rounded-xl transition hover:bg-[#2c98c7] uppercase text-[11px] shadow-lg hover:shadow-xl"
              >
                {isLongDistance ? 'Book Transfer' : 'Rent Now'}
              </button>
            </div>
            
            {item.cancellationPolicy && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" strokeWidth={3} />
                  </svg>
                  <p className="text-[9px] font-bold text-gray-500">
                    {item.cancellationPolicy}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-[#f8fbfe] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#33a8da] mb-6"></div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">
              {searchType === 'flights' ? 'Searching for flights...' : 'Searching...'}
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              {searchType === 'flights' ? 'Finding the best flight options for you' : 'Finding the best options for you'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fbfe] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-[300px] shrink-0 space-y-6">
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Filters</h4>
              <button 
                onClick={clearAllFilters} 
                className="text-[9px] font-black text-[#33a8da] uppercase tracking-widest hover:underline"
              >
                Clear all
              </button>
            </div>

            {/* Price Range - Common */}
            {renderFilterSection("Price Range", (
              <>
                <input 
                  type="range" 
                  min="0" 
                  max="2000000" 
                  step="50000" 
                  value={priceRange} 
                  onChange={(e) => setPriceRange(parseInt(e.target.value))} 
                  className="w-full h-1 bg-gray-100 rounded-full appearance-none accent-[#33a8da] cursor-pointer" 
                />
                <div className="flex justify-between mt-4">
                  <span className="text-[10px] font-bold text-gray-400">{currency.symbol}0</span>
                  <span className="text-[10px] font-black text-[#33a8da] uppercase">{currency.symbol}{priceRange.toLocaleString()}</span>
                </div>
              </>
            ))}

            {/* FLIGHT SPECIFIC FILTERS (UPDATED) */}
            {searchType === "flights" && (
              <>
                {renderFilterSection("Stops", (
                  <>
                    {["Direct", "1 Stop", "2+ Stops"].map(stop => {
                      const count = filteredResults.filter(r => {
                        const stopCount = r.stopCount || 0;
                        if (stop === 'Direct') return stopCount === 0;
                        if (stop === '1 Stop') return stopCount === 1;
                        return stopCount >= 2;
                      }).length;
                      return renderCheckbox(stop, stopsFilter.includes(stop), () => toggleFilter(setStopsFilter, stopsFilter, stop));
                    })}
                  </>
                ))}
                {renderFilterSection("Airlines", (
                  <>
                    {uniqueAirlines.map(airline => {
                      const count = filteredResults.filter(r => 
                        (r.airlineName || r.provider) === airline
                      ).length;
                      return renderCheckbox(airline, airlinesFilter.includes(airline), () => toggleFilter(setAirlinesFilter, airlinesFilter, airline));
                    })}
                  </>
                ))}
              </>
            )}

            {/* HOTEL SPECIFIC FILTERS (UNTOUCHED) */}
            {searchType === "hotels" && (
              <>
                {renderFilterSection("Star Rating", (
                  <>
                    {[5, 4, 3].map(stars => 
                      renderCheckbox(`${stars} Stars`, starRatings.includes(stars), () => toggleFilter(setStarRatings, starRatings, stars))
                    )}
                  </>
                ))}
                {renderFilterSection("Amenities", (
                  <>
                    {["Free Wi-Fi", "Swimming Pool", "Spa", "Fitness center"].map(amenity => 
                      renderCheckbox(amenity, amenitiesFilter.includes(amenity), () => toggleFilter(setAmenitiesFilter, amenitiesFilter, amenity))
                    )}
                  </>
                ))}
              </>
            )}

            {/* CAR SPECIFIC FILTERS (UNTOUCHED) */}
            {searchType === "car-rentals" && (
              <>
                {renderFilterSection("Vehicle Type", (
                  <>
                    {uniqueCarTypes.map(type => 
                      renderCheckbox(type, carTypeFilter.includes(type), () => toggleFilter(setCarTypeFilter, carTypeFilter, type))
                    )}
                  </>
                ))}
                
                {renderFilterSection("Seat Capacity", (
                  <>
                    {uniqueSeatCapacities.map(seats => 
                      renderCheckbox(`${seats} Seats`, seatCapacityFilter.includes(seats), () => toggleFilter(setSeatCapacityFilter, seatCapacityFilter, seats))
                    )}
                  </>
                ))}
                
                {renderFilterSection("Transmission", (
                  <>
                    {["Automatic", "Manual"].map(trans => 
                      renderCheckbox(trans, transmissionFilter.includes(trans), () => toggleFilter(setTransmissionFilter, transmissionFilter, trans))
                    )}
                  </>
                ))}
                
                {renderFilterSection("Provider", (
                  <>
                    {uniqueProviders.map(provider => 
                      renderCheckbox(provider, providerFilter.includes(provider), () => toggleFilter(setProviderFilter, providerFilter, provider))
                    )}
                  </>
                ))}
              </>
            )}
          </div>
        </aside>

        {/* Results Section */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
              {filteredResults.length} {filteredResults.length === 1 ? 
                (searchType === 'flights' ? 'flight' : 
                 searchType === 'hotels' ? 'hotel' : 
                 'option') : 
                (searchType === 'flights' ? 'flights' : 
                 searchType === 'hotels' ? 'hotels' : 
                 'options')} found
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)} 
                className="bg-transparent border-none text-[10px] font-black uppercase text-[#33a8da] focus:ring-0 cursor-pointer"
              >
                <option value="match">{searchType === 'flights' ? 'Departure Time' : 'Best Match'}</option>
                <option value="price">Lowest Price</option>
                {searchType !== 'flights' && <option value="rating">Top Rated</option>}
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredResults.length > 0 ? (
              filteredResults.slice(0, visibleCount).map(item => {
                if (item.type === 'car-rentals') return renderCarCard(item);
                if (item.type === 'hotels') return renderHotelCard(item);
                return renderFlightCard(item);
              })
            ) : (
              <div className="bg-white rounded-[32px] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase">No matching results</h3>
                <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">
                  Try adjusting your filters to find more options.
                </p>
              </div>
            )}
          </div>
          
          {filteredResults.length > visibleCount && (
            <div className="pt-10 flex justify-center">
              <button 
                onClick={() => setVisibleCount(p => p + 6)} 
                className="px-16 py-4 bg-[#33a8da] text-white font-black rounded-2xl shadow-xl hover:bg-[#2c98c7] transition uppercase text-xs"
              >
                Show More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 

export default SearchResults;