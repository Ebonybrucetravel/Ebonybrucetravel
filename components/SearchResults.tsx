"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import type { SearchResult as BaseSearchResult } from "../lib/types";
import { type Airline, createAirlinesMap } from "../lib/duffel-airlines";

// Add this function to fetch flight offers
async function fetchFlightOffers(offerRequestId: string) {
  try {
    const response = await fetch(`/api/v1/bookings/offers?offer_request_id=${offerRequestId}`);
    if (!response.ok) throw new Error('Failed to fetch offers');
    return await response.json();
  } catch (error) {
    console.error('Error fetching flight offers:', error);
    return null;
  }
}

interface ExtendedSearchResult extends BaseSearchResult {
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
  airlineCode?: string;
  // Add offer_request_id for flight searches
  offer_request_id?: string;
  // Duffel offer structure
  offer_id?: string;
  owner?: {
    id: string;
    name: string;
    iata_code: string;
    logo_symbol_url?: string;
  };
  slices?: Array<{
    segments: Array<{
      departing_at: string;
      arriving_at: string;
      origin: {
        iata_code: string;
        name: string;
      };
      destination: {
        iata_code: string;
        name: string;
      };
      operating_carrier?: {
        name: string;
        iata_code: string;
        logo_symbol_url?: string;
      };
    }>;
  }>;
  total_amount?: string;
  total_currency?: string;
  // Add realData structure for backward compatibility
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
    [key: string]: any;
  };
}

interface SearchResultsProps {
  results: ExtendedSearchResult[]; 
  searchParams: any;
  onClear: () => void;
  onSelect?: (item: ExtendedSearchResult) => void; 
  isLoading?: boolean;
  airlines?: Airline[];
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results: initialResults,
  searchParams,
  onClear,
  onSelect,
  isLoading = false,
  airlines = [],
}) => {
  const { currency } = useLanguage();
  const searchType = (searchParams?.type || "flights").toLowerCase() as "flights" | "hotels" | "car-rentals";

  // Shared States
  const [priceRange, setPriceRange] = useState<number>(2000000);
  const [sortBy, setSortBy] = useState<"match" | "price" | "rating">("match");
  const [visibleCount, setVisibleCount] = useState(6);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Flight Specific Filters
  const [stopsFilter, setStopsFilter] = useState<string[]>([]);
  const [airlinesFilter, setAirlinesFilter] = useState<string[]>([]);

  // Hotel Specific Filters
  const [starRatings, setStarRatings] = useState<number[]>([]);
  const [amenitiesFilter, setAmenitiesFilter] = useState<string[]>([]);

  // Car Specific Filters
  const [carTypeFilter, setCarTypeFilter] = useState<string[]>([]);
  const [transmissionFilter, setTransmissionFilter] = useState<string[]>([]);
  const [seatCapacityFilter, setSeatCapacityFilter] = useState<number[]>([]);
  const [providerFilter, setProviderFilter] = useState<string[]>([]);

  // Create airlines map from props
  const airlinesMap = useMemo(() => createAirlinesMap(airlines), [airlines]);
  
  const [flightOffers, setFlightOffers] = useState<ExtendedSearchResult[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('Airlines received:', airlines);
    console.log('Airlines Map created:', {
      size: airlinesMap.size,
      keys: Array.from(airlinesMap.keys())
    });
  }, [airlines, airlinesMap]);

  useEffect(() => {
    const loadFlightOffers = async () => {
      // Check if this is a flight search response with offer_request_id
      const flightData = initialResults.find(r => r.type === 'flights' && r.offer_request_id);
      if (flightData?.offer_request_id && searchType === 'flights') {
        setIsLoadingOffers(true);
        const offers = await fetchFlightOffers(flightData.offer_request_id);
        if (offers?.data?.offers) {
          // Transform offers to match your ExtendedSearchResult format with proper logos
          const transformedOffers = offers.data.offers.map((offer: any) => {
            // Get airline information from owner or operating carrier
            const ownerAirline = offer.owner;
            const firstSegment = offer.slices?.[0]?.segments?.[0];
            const operatingCarrier = firstSegment?.operating_carrier;
            
            // Use owner airline as primary, fallback to operating carrier
            const airline = ownerAirline || operatingCarrier;
            const airlineName = airline?.name || 'Unknown Airline';
            const airlineCode = airline?.iata_code || '';
            const airlineLogoUrl = airline?.logo_symbol_url || '';
            
            return {
              id: offer.id,
              type: 'flights',
              title: `${offer.slices?.[0]?.segments?.[0]?.origin?.iata_code || ''} → ${offer.slices?.[0]?.segments?.slice(-1)[0]?.destination?.iata_code || ''}`,
              subtitle: offer.slices?.[0]?.segments?.map((s: any) => s.operating_carrier?.name).filter(Boolean).join(', ') || 'Flight',
              price: `${offer.total_currency} ${offer.total_amount}`,
              provider: airlineName,
              // Set image to the logo URL
              image: airlineLogoUrl || `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2`,
              rating: 4,
              owner: {
                id: airline?.id,
                name: airlineName,
                iata_code: airlineCode,
                logo_symbol_url: airlineLogoUrl
              },
              airlineCode,
              slices: offer.slices,
              realData: {
                airlineCode,
                airlineLogo: airlineLogoUrl,
                departureTime: offer.slices?.[0]?.segments?.[0]?.departing_at,
                arrivalTime: offer.slices?.[0]?.segments?.slice(-1)[0]?.arriving_at,
                departureAirport: offer.slices?.[0]?.segments?.[0]?.origin?.iata_code,
                arrivalAirport: offer.slices?.[0]?.segments?.slice(-1)[0]?.destination?.iata_code,
              }
            };
          });
          
          console.log('Transformed flight offers with logos:', transformedOffers.map((o: any) => ({
            airline: o.provider,
            code: o.airlineCode,
            hasLogo: !!o.image && !o.image.includes('ui-avatars'),
            logoUrl: o.image
          })));
          
          setFlightOffers(transformedOffers);
        }
        setIsLoadingOffers(false);
      }
    };

    loadFlightOffers();
  }, [initialResults, searchType]);

  // Combine initial results with flight offers
  const allResults = useMemo(() => {
    if (searchType === 'flights' && flightOffers.length > 0) {
      return flightOffers;
    }
    return initialResults;
  }, [initialResults, flightOffers, searchType]);

  // Extract dynamic options from results
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
        .map(r => r.owner?.name || r.provider || 'Unknown')
        .filter(Boolean)
    ));
  }, [allResults, searchType]);

  const filteredResults = useMemo(() => {
    let filtered = [...allResults];

    // Basic Price Filter
    filtered = filtered.filter((item) => {
      const numericPrice = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
      return numericPrice <= priceRange;
    });

    // Flight Filtering
    if (searchType === "flights") {
      if (stopsFilter.length > 0) {
        filtered = filtered.filter(item => {
          const segmentCount = item.slices?.[0]?.segments?.length || 1;
          const stopText = segmentCount === 1 ? 'Direct' : segmentCount === 2 ? '1 Stop' : '2+ Stops';
          return stopsFilter.includes(stopText);
        });
      }
      if (airlinesFilter.length > 0) {
        filtered = filtered.filter(item => {
          const airlineName = item.owner?.name || item.provider || '';
          return airlinesFilter.includes(airlineName);
        });
      }
    } 

    // Hotel Filtering
    else if (searchType === "hotels") {
      if (starRatings.length > 0) {
        filtered = filtered.filter(item => starRatings.includes(Math.floor(item.rating || 0)));
      }
      if (amenitiesFilter.length > 0) {
        filtered = filtered.filter(item => amenitiesFilter.every(a => item.amenities?.includes(a)));
      }
    }

    // Car Rental Filtering
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

    // Sorting
    if (sortBy === "price") {
      filtered.sort((a, b) => {
        const pA = parseFloat(a.price.replace(/[^\d.]/g, '')) || 0;
        const pB = parseFloat(b.price.replace(/[^\d.]/g, '')) || 0;
        return pA - pB;
      });
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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

  // Format duration from ISO 8601 (e.g., "PT5H36M" -> "5h 36m")
  const formatDuration = (duration?: string): string => {
    if (!duration) return '';
    const hours = duration.match(/(\d+)H/);
    const minutes = duration.match(/(\d+)M/);
    return `${hours ? hours[1] + 'h ' : ''}${minutes ? minutes[1] + 'm' : ''}`;
  };

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

  const renderFlightCard = (item: ExtendedSearchResult) => {
    // Get airline code from multiple possible sources
    const airlineCode = item.airlineCode || 
                        item.owner?.iata_code || 
                        item.realData?.airlineCode || 
                        '';
    
    // Get airline name
    const airlineName = item.owner?.name || 
                        item.provider || 
                        item.realData?.airline || 
                        'Unknown Airline';
    
    // Get logo URL - prioritize item.image (set during transformation), then owner logo, then realData
    const logoUrl = item.image || 
                    item.owner?.logo_symbol_url || 
                    item.realData?.airlineLogo || 
                    (airlineCode ? airlinesMap.get(airlineCode)?.logo_symbol_url : null);
    
    // Get departure and arrival info
    const firstSegment = item.slices?.[0]?.segments?.[0];
    const lastSegment = item.slices?.[0]?.segments?.slice(-1)[0];
    
    const departureTime = firstSegment?.departing_at || item.realData?.departureTime;
    const arrivalTime = lastSegment?.arriving_at || item.realData?.arrivalTime;
    const departureAirport = firstSegment?.origin?.iata_code || item.realData?.departureAirport || 'LHR';
    const arrivalAirport = lastSegment?.destination?.iata_code || item.realData?.arrivalAirport || 'JFK';
    
    // Calculate stops
    const segmentCount = item.slices?.[0]?.segments?.length || 1;
    const stopText = segmentCount === 1 ? 'Direct' : segmentCount === 2 ? '1 Stop' : '2+ Stops';
    
    // Debug for this specific flight
    console.log('Rendering flight:', {
      id: item.id,
      airlineCode,
      airlineName,
      hasLogo: !!logoUrl,
      logoUrl,
      image: item.image,
      ownerLogo: item.owner?.logo_symbol_url
    });
    
    return (
      <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row p-8 gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  className="w-10 h-10 object-contain rounded" 
                  alt={airlineName}
                  onError={(e) => {
                    console.log('Logo failed to load:', logoUrl);
                    // Fallback to UI Avatars
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2`;
                  }}
                />
              ) : (
                <div className="w-10 h-10 bg-[#33a8da] rounded flex items-center justify-center text-white font-bold text-sm">
                  {airlineCode?.substring(0, 2) || airlineName?.substring(0, 2) || 'FL'}
                </div>
              )}
              <div>
                <h4 className="text-sm font-black text-gray-900">{airlineName}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {departureAirport} → {arrivalAirport}
                </p>
                {airlineCode && (
                  <span className="text-[9px] font-bold text-[#33a8da] bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {airlineCode}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">
                  {departureTime ? new Date(departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "08:00"}
                </p>
                <p className="text-[10px] font-black text-gray-400 uppercase">Depart</p>
                <p className="text-[9px] font-bold text-gray-400 mt-1">{departureAirport}</p>
              </div>
              <div className="flex-1 px-8">
                <div className="w-full h-[1.5px] bg-gray-100 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] text-[#33a8da]">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                  </div>
                </div>
                <p className="text-[8px] font-bold text-gray-400 text-center mt-4">
                  {stopText}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">
                  {arrivalTime ? new Date(arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "10:15"}
                </p>
                <p className="text-[10px] font-black text-gray-400 uppercase">Arrive</p>
                <p className="text-[9px] font-bold text-gray-400 mt-1">{arrivalAirport}</p>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[240px] flex flex-col items-center justify-center text-center border-l border-gray-50 pl-8">
            <p className="text-2xl font-black text-gray-900 mb-4">{item.price}</p>
            <button 
              onClick={() => onSelect?.(item)} 
              className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl transition hover:bg-[#2c98c7] uppercase text-[11px]"
            >
              Select Flight
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCarCard = (item: ExtendedSearchResult) => {
    // Parse duration if available
    const duration = formatDuration(item.duration);
    
    // Determine if it's a long-distance transfer (Amadeus) or quick transfer (Sixt)
    const isLongDistance = item.distance && item.distance.includes('MI');
    const isSixt = item.provider?.includes('Sixt');
    
    // Parse baggage count to number for comparison
    const baggageCount = item.baggage ? parseInt(item.baggage) : 0;
    
    // Get the correct image URL from the API response
    const getCarImageUrl = () => {
      // Priority 1: Direct image property (set by transform function)
      if (item.image && !item.image.includes('unsplash') && !item.image.includes('placeholder')) {
        return item.image;
      }
      
      // Priority 2: Check realData.vehicle.imageURL (API structure)
      if (item.realData?.vehicle?.imageURL) {
        return item.realData.vehicle.imageURL;
      }
      
      // Priority 3: Check if image is directly in realData
      if (item.realData?.imageURL) {
        return item.realData.imageURL;
      }
      
      // Priority 4: Use provider logo as fallback
      if (item.providerLogo) {
        return item.providerLogo;
      }
      
      // Priority 5: Fallback to Unsplash based on vehicle type
      if (item.vehicleCode?.includes('SUV')) {
        return 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=600';
      } else if (item.vehicleCode?.includes('VAN')) {
        return 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600';
      } else if (item.vehicleCode?.includes('FC') || item.vehicleCategory?.includes('Luxury')) {
        return 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&q=80&w=600';
      } else if (item.vehicleCategory?.includes('BU') || item.vehicleCategory?.includes('Business')) {
        return 'https://images.unsplash.com/photo-1563720223486-3294265d5a7c?auto=format&fit=crop&q=80&w=600';
      }
      
      // Default fallback
      return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
    };
  
    const carImageUrl = getCarImageUrl();
  
    return (
      <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row">
          {/* Vehicle Image Section - Using REAL image from API */}
          <div className="w-full md:w-[320px] h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8 relative">
            <img 
              src={carImageUrl}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-300" 
              alt={item.title}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Try provider logo first if available and not already tried
                if (item.providerLogo && target.src !== item.providerLogo) {
                  target.src = item.providerLogo;
                  return;
                }
                // Then try vehicle type specific fallback
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
            
            {/* Provider Logo Overlay (only if different from main image) */}
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
            
            {/* Vehicle Type Badge */}
            <div className="absolute top-4 right-4 bg-[#33a8da]/90 backdrop-blur-sm text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
              {item.vehicleCode || item.vehicleCategory || 'CAR'}
            </div>
          </div>
          
          {/* Vehicle Details Section */}
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
            
            {/* Vehicle Specifications */}
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
            
            {/* Trip Details */}
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
            
            {/* Price and CTA */}
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
                onClick={() => onSelect?.(item)} 
                className="bg-[#33a8da] text-white font-black px-8 py-3 rounded-xl transition hover:bg-[#2c98c7] uppercase text-[11px] shadow-lg hover:shadow-xl"
              >
                {isLongDistance ? 'Book Transfer' : 'Rent Now'}
              </button>
            </div>
            
            {/* Cancellation Policy */}
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

  const isLoading_ = isLoading || isLoadingOffers;

  if (isLoading_) {
    return (
      <div className="bg-[#f8fbfe] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#33a8da] mb-6"></div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">
              {isLoadingOffers ? 'Loading flight offers...' : 'Searching...'}
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              {isLoadingOffers ? 'Fetching the best flight options for you' : 'Finding the best options for you'}
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

            {/* FLIGHT SPECIFIC FILTERS */}
            {searchType === "flights" && (
              <>
                {renderFilterSection("Stops", (
                  <>
                    {["Direct", "1 Stop", "2+ Stops"].map(stop => 
                      renderCheckbox(stop, stopsFilter.includes(stop), () => toggleFilter(setStopsFilter, stopsFilter, stop))
                    )}
                  </>
                ))}
                {renderFilterSection("Airlines", (
                  <>
                    {uniqueAirlines.map(airline => 
                      renderCheckbox(airline, airlinesFilter.includes(airline), () => toggleFilter(setAirlinesFilter, airlinesFilter, airline))
                    )}
                  </>
                ))}
              </>
            )}

            {/* HOTEL SPECIFIC FILTERS */}
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

            {/* CAR SPECIFIC FILTERS */}
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
              {filteredResults.length} {filteredResults.length === 1 ? 'option' : 'options'} found
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)} 
                className="bg-transparent border-none text-[10px] font-black uppercase text-[#33a8da] focus:ring-0 cursor-pointer"
              >
                <option value="match">Best Match</option>
                <option value="price">Lowest Price</option>
                <option value="rating">Top Rated</option>
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