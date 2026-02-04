"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

interface SearchResult {
  id: string;
  provider: string;
  title: string;
  subtitle: string;
  price: string;
  totalPrice?: string;
  time?: string;
  duration?: string;
  stops?: string;
  rating?: number;
  baggage?: string;
  aircraft?: string;
  layoverDetails?: string;
  image?: string;
  amenities?: string[];
  features?: string[];
  type?: "flights" | "hotels" | "car-rentals";
  isRefundable?: boolean;
  cancellationPolicy?: string;
  bedType?: string;
  beds?: number;
  roomType?: string;
  nights?: number;
  location?: string;
  // Add flight-specific fields
  realData?: {
    origin?: string;
    destination?: string;
    isRoundTrip?: boolean;
  };
}

interface SearchResultsProps {
  results: SearchResult[];
  searchParams: any;
  onClear: () => void;
  onSelect?: (item: SearchResult) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results: initialResults,
  searchParams,
  onClear,
  onSelect,
}) => {
  const { currency } = useLanguage();
  const searchType = searchParams?.type || "flights";

  // DEBUG: Log everything on mount
  useEffect(() => {
    console.log('🔍 SEARCH RESULTS MOUNTED:', {
      searchType,
      totalResults: initialResults.length,
      searchParams,
      firstResult: initialResults[0],
      allSubtitles: initialResults.map(r => r.subtitle)
    });
  }, [initialResults, searchParams, searchType]);

  // Extract airport codes with better error handling
  const extractAirportInfo = (displayValue: string) => {
    if (!displayValue) return { code: '', city: '', full: '' };
    
    console.log('📋 Extracting from:', displayValue);
    
    // Handle multiple formats:
    // 1. "LOS - Lagos, Nigeria" → code: "LOS", city: "Lagos"
    // 2. "LOS" → code: "LOS", city: "Lagos"
    // 3. "Lagos (LOS)" → code: "LOS", city: "Lagos"
    
    // Try to match IATA code pattern (3 uppercase letters)
    const iataMatch = displayValue.match(/\b([A-Z]{3})\b/);
    const code = iataMatch ? iataMatch[1] : '';
    
    // Extract city name (everything before comma or dash)
    let city = '';
    if (displayValue.includes('-')) {
      // Format: "LOS - Lagos, Nigeria"
      const afterDash = displayValue.split('-')[1]?.trim();
      city = afterDash?.split(',')[0]?.trim() || '';
    } else if (displayValue.includes('(')) {
      // Format: "Lagos (LOS)"
      city = displayValue.split('(')[0]?.trim() || '';
    } else {
      // Just a code? Try to get city from known airports
      city = displayValue;
    }
    
    return { code, city, full: displayValue };
  };

  // Extract info from search params
  const originInfo = extractAirportInfo(searchParams?.segments?.[0]?.from || "LOS");
  const destinationInfo = extractAirportInfo(searchParams?.segments?.[0]?.to || "ABV");
  
  const originCode = originInfo.code || "LOS";
  const destinationCode = destinationInfo.code || "ABV";
  const originCity = originInfo.city || "Lagos";
  const destinationCity = destinationInfo.city || "Abuja";
  
  console.log('📍 Airport Info:', {
    fromRaw: searchParams?.segments?.[0]?.from,
    toRaw: searchParams?.segments?.[0]?.to,
    originInfo,
    destinationInfo,
    originCode,
    destinationCode
  });

  const departureDate = searchParams?.segments?.[0]?.date;
  const returnDate = searchParams?.returnDate;
  const travellers = searchParams?.travellers || searchParams?.adults || 2;
  const rooms = searchParams?.rooms || 1;
  const location = searchParams?.location || "Lagos";
  const checkInDate = searchParams?.checkInDate || searchParams?.checkIn;
  const checkOutDate = searchParams?.checkOutDate || searchParams?.checkOut;

  // Generic Filters
  const [priceRange, setPriceRange] = useState<number>(500000);
  const [sortBy, setSortBy] = useState<"match" | "price" | "time" | "rating">("match");
  const [isBooking, setIsBooking] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Flight Specific
  const [stopsFilter, setStopsFilter] = useState<string[]>([
    "Direct",
    "1 Stop",
    "2+ Stops",
  ]);

  // Hotel Specific Filters
  const [popularFilters, setPopularFilters] = useState<string[]>([
    "Free Wi-Fi",
    "Free breakfast",
  ]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>(["Hotels"]);
  const [starRatings, setStarRatings] = useState<number[]>([5, 4, 3]);

  const filteredResults = useMemo(() => {
    let filtered = [...initialResults];

    // Type specific filtering
    if (searchType === "flights") {
      filtered = filtered.filter((item) =>
        stopsFilter.includes(item.stops || "Direct")
      );
    } else if (searchType === "hotels") {
      // Filter hotels by star rating
      filtered = filtered.filter((item) => {
        const itemRating = Math.floor(item.rating || 0);
        return starRatings.includes(itemRating) || starRatings.length === 0;
      });
    }

    // Price range filtering - SAFE VERSION
    filtered = filtered.filter((item) => {
      try {
        const numericPrice = extractNumericPrice(item.price);
        return numericPrice <= priceRange;
      } catch {
        return true; // If price parsing fails, include the item
      }
    });

    // Sorting - SAFE VERSION
    if (sortBy === "price") {
      filtered.sort((a, b) => {
        try {
          const priceA = extractNumericPrice(a.price);
          const priceB = extractNumericPrice(b.price);
          return priceA - priceB;
        } catch {
          return 0;
        }
      });
    } else if (sortBy === "time" && searchType === "flights") {
      filtered.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return filtered;
  }, [initialResults, stopsFilter, priceRange, sortBy, searchType, starRatings]);

  // Helper function to safely extract numeric price
  const extractNumericPrice = (priceString: string): number => {
    if (!priceString) return 0;
    
    // Remove currency symbols and commas
    const cleanString = priceString.replace(/[^\d.]/g, '');
    const numeric = parseFloat(cleanString);
    
    // If parsing fails, try alternative methods
    if (isNaN(numeric)) {
      // Try extracting numbers using regex
      const matches = priceString.match(/\d+(\.\d+)?/);
      if (matches) {
        return parseFloat(matches[0]);
      }
      return 0;
    }
    
    return numeric;
  };

  const handleToggleSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectResult = (item: SearchResult) => {
    if (!item || !item.id) return;
    
    setIsBooking(item.id);
    setTimeout(() => {
      if (onSelect) onSelect(item);
      setIsBooking(null);
    }, 800);
  };

  const renderHotelFilters = () => (
    <div className="space-y-6">
      {/* Map Preview */}
      <div className="bg-white rounded-[24px] overflow-hidden shadow-sm border border-gray-100 p-2">
        <div className="relative h-32 rounded-[20px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=400"
            className="w-full h-full object-cover grayscale opacity-50"
            alt="Map"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="bg-[#33a8da] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-[#2c98c7] transition">
              View on map
            </button>
          </div>
        </div>
      </div>

      {/* Budget Slider */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
            Your Budget
          </h4>
          <span 
            className="text-[10px] text-blue-500 font-bold uppercase cursor-pointer hover:text-blue-600"
            onClick={() => setPriceRange(500000)}
          >
            Reset
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1000000"
          step="10000"
          value={priceRange}
          onChange={(e) => setPriceRange(parseInt(e.target.value))}
          className="w-full h-1 bg-blue-100 rounded-full appearance-none accent-[#33a8da] cursor-pointer"
        />
        <div className="flex justify-between mt-4">
          <span className="text-[10px] font-bold text-gray-400">{currency.symbol}0</span>
          <span className="text-[10px] font-black text-[#33a8da] tracking-tight">
            {currency.symbol}
            {priceRange.toLocaleString()}+
          </span>
        </div>
      </div>

      {/* Popular Section */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border-2 border-[#33a8da]">
        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">
          Popular
        </h4>
        <div className="space-y-4">
          {[
            "Free Wi-Fi",
            "Free breakfast",
            "Swimming Pool",
            "Workspace",
            "24hrs Electricity",
            "Pet-friendly",
            "Beach",
          ].map((feat) => (
            <label
              key={feat}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={popularFilters.includes(feat)}
                onChange={() =>
                  setPopularFilters((prev) =>
                    prev.includes(feat)
                      ? prev.filter((p) => p !== feat)
                      : [...prev, feat]
                  )
                }
                className="w-4 h-4 rounded border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span
                className={`text-[11px] font-bold transition ${
                  popularFilters.includes(feat)
                    ? "text-gray-900"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
                {feat}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Property Type */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">
          Property Type
        </h4>
        <div className="space-y-4">
          {[
            "Hotels",
            "Apartments",
            "Guesthouses",
            "Motels",
            "Lodges",
            "Villas",
          ].map((type) => (
            <label
              key={type}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={propertyTypes.includes(type)}
                onChange={() =>
                  setPropertyTypes((prev) =>
                    prev.includes(type)
                      ? prev.filter((p) => p !== type)
                      : [...prev, type]
                  )
                }
                className="w-4 h-4 rounded border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span
                className={`text-[11px] font-bold transition ${
                  propertyTypes.includes(type)
                    ? "text-gray-900"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
                {type}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Star Rating */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
            Star Rating
          </h4>
          <span 
            className="text-[10px] text-blue-500 font-bold uppercase cursor-pointer hover:text-blue-600"
            onClick={() => setStarRatings([5, 4, 3])}
          >
            Reset
          </span>
        </div>
        <div className="space-y-4">
          {[5, 4, 3].map((star) => (
            <label
              key={star}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={starRatings.includes(star)}
                onChange={() =>
                  setStarRatings((prev) =>
                    prev.includes(star)
                      ? prev.filter((s) => s !== star)
                      : [...prev, star]
                  )
                }
                className="w-4 h-4 rounded border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-gray-900">
                  {star} Star
                </span>
                <div className="flex text-yellow-400">
                  {[...Array(star)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-3 h-3 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFlightFilters = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
            Stops
          </h4>
          <span 
            className="text-[10px] text-blue-500 font-bold uppercase cursor-pointer hover:text-blue-600"
            onClick={() => setStopsFilter(["Direct", "1 Stop", "2+ Stops"])}
          >
            Reset
          </span>
        </div>
        <div className="space-y-4">
          {["Direct", "1 Stop", "2+ Stops"].map((stop) => (
            <label
              key={stop}
              className="flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div
                  onClick={() =>
                    setStopsFilter((prev) =>
                      prev.includes(stop)
                        ? prev.filter((s) => s !== stop)
                        : [...prev, stop]
                    )
                  }
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                    stopsFilter.includes(stop)
                      ? "bg-[#33a8da] border-[#33a8da]"
                      : "bg-white border-gray-200"
                  }`}
                >
                  {stopsFilter.includes(stop) && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={5}
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-bold text-gray-600">{stop}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
            Price range
          </h4>
          <span 
            className="text-[10px] text-blue-500 font-bold uppercase cursor-pointer hover:text-blue-600"
            onClick={() => setPriceRange(500000)}
          >
            Reset
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="5000000"
          step="50000"
          value={priceRange}
          onChange={(e) => setPriceRange(parseInt(e.target.value))}
          className="w-full h-1 bg-gray-100 rounded-full appearance-none accent-[#33a8da] cursor-pointer"
        />
        <div className="flex justify-between mt-4">
          <span className="text-[10px] font-bold text-gray-400">{currency.symbol}0</span>
          <span className="text-[10px] font-black text-[#33a8da]">
            {currency.symbol}
            {priceRange.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );

  const renderHotelCard = (item: SearchResult) => {
    const starRating = Math.floor(item.rating || 0);
    
    return (
      <div
        key={item.id}
        className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-[320px] h-64 md:h-auto overflow-hidden relative flex-shrink-0">
            <img
              src={
                item.image ||
                `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600`
              }
              className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
              alt={item.title}
            />
            <button
              onClick={(e) => handleToggleSaved(item.id, e)}
              className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-md ${
                savedItems.has(item.id)
                  ? "bg-red-500 text-white"
                  : "bg-white/40 text-gray-400 hover:bg-white hover:text-red-500"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill={savedItems.has(item.id) ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-8">
            <div className="mb-4">
              <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight group-hover:text-[#33a8da] transition">
                {item.title || "Hotel Name"}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="text-[#33a8da]">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-gray-500">
                  {item.subtitle || "Hotel Location"}
                </span>
                {item.location && (
                  <span className="text-[10px] font-black text-[#33a8da] uppercase tracking-tighter cursor-pointer hover:underline ml-2">
                    Explore on map
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < starRating ? "fill-current" : "text-gray-200"
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black bg-blue-50 text-[#33a8da] px-2 py-0.5 rounded">
                  {(item.rating || 4).toFixed(1)}/5
                </span>
                <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                  (200+ Reviews)
                </span>
              </div>
              {item.isRefundable && (
                <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                  Free Cancellation
                </span>
              )}
            </div>

            {/* Room Features */}
            {(item.bedType || item.beds || item.roomType) && (
              <div className="flex flex-wrap gap-3 mb-6">
                {item.roomType && (
                  <span className="text-[10px] font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded border border-gray-100">
                    {item.roomType}
                  </span>
                )}
                {item.beds && item.bedType && (
                  <span className="text-[10px] font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded border border-gray-100">
                    {item.beds} {item.bedType} Bed{item.beds > 1 ? 's' : ''}
                  </span>
                )}
                {item.nights && (
                  <span className="text-[10px] font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded border border-gray-100">
                    {item.nights} Night{item.nights > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Amenities */}
            <div className="flex flex-wrap gap-2 mb-8">
              {item.amenities?.slice(0, 5).map((amenity, index) => (
                <span key={index} className="text-[9px] font-black text-gray-500 bg-gray-50 px-3 py-1.5 rounded uppercase tracking-widest border border-gray-100">
                  {amenity}
                </span>
              ))}
              {item.amenities && item.amenities.length > 5 && (
                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-3 py-1.5 rounded border border-blue-100">
                  +{item.amenities.length - 5} more
                </span>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-6 border-t border-gray-50">
              <div className="space-y-1">
                <p className="text-2xl font-black text-[#33a8da] tracking-tighter">
                  {item.price || "$0"}
                </p>
                {item.totalPrice && (
                  <p className="text-[11px] font-bold text-gray-500">
                    Total: {item.totalPrice} • <span className="text-green-600">Free cancellation</span>
                  </p>
                )}
                {item.cancellationPolicy && (
                  <p className="text-[10px] text-gray-400 font-bold">
                    {item.cancellationPolicy}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleSelectResult(item)}
                disabled={isBooking === item.id}
                className="bg-[#33a8da] text-white font-black px-10 py-3 rounded-xl transition shadow-lg shadow-blue-500/10 hover:bg-[#2c98c7] active:scale-95 text-xs uppercase tracking-widest"
              >
                {isBooking === item.id ? "Loading..." : "See Availability"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFlightCard = (item: SearchResult) => {
    console.log('🛫 Flight card data:', {
      id: item.id,
      subtitle: item.subtitle,
      provider: item.provider,
      realData: item.realData
    });
    
    // Extract route from subtitle or use fallback
    let routeDisplay = `${originCode} → ${destinationCode}`;
    
    if (item.subtitle) {
      // Try to extract route from subtitle
      const subtitleParts = item.subtitle.split('•');
      if (subtitleParts.length > 1) {
        routeDisplay = subtitleParts[1]?.trim() || routeDisplay;
      }
    }
    
    return (
      <div
        key={item.id}
        className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div className="flex flex-col md:flex-row">
          <div className="flex-1 p-8">
            <div className="flex flex-wrap items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-1">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                      item.provider || "Airline"
                    )}&background=f0f9ff&color=33a8da`}
                    className="w-full h-full object-contain"
                    alt=""
                  />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 tracking-tight">
                    {item.provider || "Airline"}
                  </h4>
                  <p className="text-[10px] font-bold text-gray-400">
                    {item.subtitle || `Flight • ${routeDisplay}`}
                  </p>
                </div>
              </div>
              <div className="bg-yellow-400 text-white font-black text-[10px] px-2 py-0.5 rounded tracking-tighter">
                {(item.rating || 4.5).toFixed(1)}
              </div>
            </div>

            <div className="flex items-center gap-12 lg:gap-20">
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">
                  {item.time?.split(" - ")[0] || "08:00"}
                </p>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Depart
                </p>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <p className="text-[10px] font-bold text-gray-300 uppercase mb-2">
                  {item.duration || "1h 15m"}
                </p>
                <div className="w-full h-[1.5px] bg-gray-100 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] text-[#33a8da]">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase mt-2 tracking-widest text-blue-500">
                  {item.stops || "Direct"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">
                  {item.time?.split(" - ")[1] || (item.duration?.includes("h") ? "09:15" : "14:45")}
                </p>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Arrival
                </p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[220px] bg-[#fdfdfd] border-l border-gray-100 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-6">
              <p className="text-2xl font-black text-gray-900">{item.price || "$0"}</p>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                Per Traveler
              </p>
            </div>
            <button
              onClick={() => handleSelectResult(item)}
              disabled={isBooking === item.id}
              className="w-full bg-[#33a8da] text-white font-black py-3.5 rounded-xl transition shadow-lg active:scale-95 text-sm uppercase"
            >
              {isBooking === item.id ? "..." : "Select"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#f8fbfe] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white border-4 border-[#33a8da] rounded-[24px] p-6 flex flex-wrap items-center justify-between gap-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="text-[#33a8da]">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  {searchType === "hotels" ? (
                    <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2z" />
                  ) : (
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  )}
                </svg>
              </div>
              <div>
                <span className="font-black text-gray-900 text-lg tracking-tight block">
                  {searchType === "flights"
                    ? `${originCity} (${originCode}) → ${destinationCity} (${destinationCode})`
                    : location}
                </span>
                <span className="text-[11px] font-bold text-gray-400 block">
                  {searchType === "flights" 
                    ? `${searchParams?.segments?.[0]?.from || originCity} to ${searchParams?.segments?.[0]?.to || destinationCity}`
                    : "Hotel search"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-gray-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-gray-500 block">
                  {searchType === "flights"
                    ? departureDate || "Anytime"
                    : checkInDate || "Check-in"}
                </span>
                {searchType === "flights" && returnDate && (
                  <span className="text-[11px] font-bold text-gray-400">
                    Return: {returnDate}
                  </span>
                )}
                {searchType === "hotels" && checkOutDate && (
                  <span className="text-[11px] font-bold text-gray-400">
                    Check-out: {checkOutDate}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-gray-400">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-gray-500 block">
                  {searchType === "hotels" 
                    ? `${travellers} Adult${travellers > 1 ? 's' : ''}, ${rooms} Room${rooms > 1 ? 's' : ''}`
                    : `${travellers} Adult${travellers > 1 ? 's' : ''}`}
                </span>
                {searchType === "flights" && searchParams?.children && (
                  <span className="text-[11px] font-bold text-gray-400">
                    {searchParams.children} Child{searchParams.children > 1 ? 'ren' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="px-8 py-3.5 bg-[#f0f9ff] text-[#33a8da] font-black text-xs rounded-xl hover:bg-blue-100 transition uppercase tracking-widest border border-blue-50"
          >
            Modify Search
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        <aside className="w-full lg:w-[320px] flex-shrink-0">
          <div className="flex justify-between items-center px-4 mb-6">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
              Filters
            </h3>
            <span 
              className="text-[11px] font-black text-[#33a8da] uppercase tracking-tighter cursor-pointer hover:text-blue-600"
              onClick={() => {
                if (searchType === "flights") {
                  setStopsFilter(["Direct", "1 Stop", "2+ Stops"]);
                } else {
                  setStarRatings([5, 4, 3]);
                  setPopularFilters(["Free Wi-Fi", "Free breakfast"]);
                  setPropertyTypes(["Hotels"]);
                }
                setPriceRange(searchType === "flights" ? 500000 : 1000000);
                setSortBy("match");
              }}
            >
              Reset All
            </span>
          </div>
          {searchType === "hotels"
            ? renderHotelFilters()
            : renderFlightFilters()}
        </aside>

        <div className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 text-[#33a8da] rounded-lg flex items-center justify-center font-black text-xs">
                {filteredResults.length}
              </div>
              <h3 className="font-black text-gray-900 tracking-tight">
                {searchType === "hotels" ? "Properties Found" : "Flights Found"}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Sort by:
              </span>
              <div className="relative group">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-black text-gray-700 hover:border-[#33a8da] transition shadow-sm uppercase tracking-tight appearance-none cursor-pointer"
                >
                  <option value="match">Best Match</option>
                  <option value="price">Price (Low to High)</option>
                  <option value="time">Departure Time</option>
                  {searchType === "hotels" && <option value="rating">Rating (High to Low)</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredResults.length > 0 ? (
              filteredResults
                .slice(0, visibleCount)
                .map((item) =>
                  searchType === "hotels"
                    ? renderHotelCard(item)
                    : renderFlightCard(item)
                )
            ) : (
              <div className="bg-white rounded-[32px] p-24 text-center border-4 border-dashed border-gray-100">
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-400 font-bold">
                  Try adjusting your filters to find your perfect travel match.
                </p>
              </div>
            )}
          </div>

          {filteredResults.length > visibleCount && (
            <div className="pt-10 flex justify-center">
              <button
                onClick={() => setVisibleCount((p) => p + 6)}
                className="px-16 py-4 bg-[#33a8da] text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#2c98c7] transition transform active:scale-95 text-sm uppercase tracking-widest"
              >
                Show more {searchType === "hotels" ? "properties" : "flights"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;