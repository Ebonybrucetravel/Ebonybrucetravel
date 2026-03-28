'use client';
import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import type { SearchResult as BaseSearchResult } from "../lib/types";
import { type Airline, createAirlinesMap } from "../lib/duffel-airlines";
import { HotelListImage } from "./HotelListImage";
import CompactSearchBox from "./CompactSearchBox";
import { useRouter } from "next/navigation";

// Define baggage type
interface Baggage {
  type: string;
  quantity: number;
}

interface ExtendedSearchResult extends Omit<BaseSearchResult, 'price'> {
  amenities?: string[];
  price?: string | number | {
    total?: string;
    base?: string;
    currency?: string;
    original_total?: string;
    original_currency?: string;
  };
  final_price?: string;
  original_price?: string;
  car_original_currency?: string;
  base_price?: string;
  start?: {
    locationCode?: string;
    dateTime?: string;
    address?: {
      countryCode?: string;
    };
  };
  end?: {
    locationCode?: string;
    dateTime?: string;
    address?: {
      countryCode?: string;
    };
  };
  quotation?: {
    monetaryAmount?: string;
    currencyCode?: string;
    base?: {
      monetaryAmount?: string;
    };
    totalTaxes?: {
      monetaryAmount?: string;
    };
  };
  vehicle?: {
    code?: string;
    category?: string;
    description?: string;
    imageURL?: string;
    baggages?: Array<{
      count?: number;
      size?: string;
    }>;
    seats?: Array<{
      count: number;
    }>;
  };
  serviceProvider?: {
    code?: string;
    name?: string;
    logoUrl?: string;
    settings?: string[];
    termsUrl?: string;
    isPreferred?: boolean;
  };
  partnerInfo?: {
    serviceProvider?: {
      code?: string;
      name?: string;
      termsUrl?: string;
      isPreferred?: boolean;
      logoUrl?: string;
    };
  };
  distance?: {
    value?: number;
    unit?: string;
  };
  converted?: {
    monetaryAmount?: string;
    currencyCode?: string;
    base?: {
      monetaryAmount?: string;
    };
    totalTaxes?: {
      monetaryAmount?: string;
    };
  };
  supportedPaymentInstruments?: Array<{
    vendorCode?: string;
    description?: string;
  }>;
  methodsOfPaymentAccepted?: string[];
  conditionSummary?: Array<{
    descriptions?: Array<{
      descriptionType?: string;
      text?: string;
    }>;
  }>;
  stops?: string;
  vehicleCode?: string;
  vehicleCategory?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
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
  offer_request_id?: string;
  offer_id?: string;
  total_amount?: string;
  total_currency?: string;
  base_amount?: string;
  base_currency?: string;
  tax_amount?: string;
  tax_currency?: string;
  original_amount?: string;
  original_currency?: string;
  conversion_fee?: string;
  conversion_fee_percentage?: number;
  price_after_conversion?: string;
  markup_percentage?: number;
  markup_amount?: string;
  final_amount?: string;
  currency?: string;
  owner?: {
    id?: string;
    name?: string;
    iata_code?: string;
    logo_symbol_url?: string;
    logo_lockup_url?: string;
    conditions_of_carriage_url?: string;
  };
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
  payment_requirements?: {
    requires_instant_payment: boolean;
    price_guarantee_expires_at?: string | null;
    payment_required_by?: string;
  };
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  total_emissions_kg?: string;
  live_mode?: boolean;
  partial?: boolean;
  supported_passenger_identity_document_types?: string[];
  passenger_identity_documents_required?: boolean;
  supported_loyalty_programmes?: string[];
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
  isRoundTrip?: boolean;
  outboundTimeOfDay?: string;
  outboundArrivalTimeOfDay?: string;
  returnFlight?: {
    departureAirport?: string;
    arrivalAirport?: string;
    departureCity?: string;
    arrivalCity?: string;
    departureTime?: string;
    arrivalTime?: string;
    flightNumber?: string;
    duration?: string;
    stopCount?: number;
    timeOfDay?: string;
    arrivalTimeOfDay?: string;
  };
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
  onNewSearch?: (searchData: any) => void;
}

// Advertisement Data - Only for flights
const advertisements = [
  {
    id: 1,
    title: "Travel Smart. Travel Easy",
    description: "Unlock Your Global Dreams!",
    subText: "Your Journey, Our Expertise",
    imageUrl: "https://plus.unsplash.com/premium_photo-1661389225701-c3c2bcc4bf34?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    buttonText: "BOOK NOW",
    link: "/flights",
    type: "payment",
    isTall: true,
    brand: "Ebony Bruce Travels",
    bgColor: "from-[#33a8da] to-[#2c98c7]",
  },
  {
    id: 2,
    title: "Exclusive Hotel Deals",
    description: "Save up to 40% on luxury hotels worldwide",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    buttonText: "Book Now",
    link: "/hotels",
    type: "hotels",
    isTall: false,
    bgColor: "from-blue-500 to-blue-600",
  },
  {
    id: 3,
    title: "Travel Insurance",
    description: "Protect your journey with comprehensive coverage",
    imageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=300&fit=crop",
    buttonText: "Get Quote",
    link: "/contact",
    type: "insurance",
    isTall: false,
    bgColor: "from-green-500 to-green-600",
  },
];

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchParams,
  onClear,
  onSelect,
  isLoading = false,
  airlines = [],
  onNewSearch,
}) => {
  const router = useRouter();
  const { currency, t } = useLanguage();
  const searchType = (searchParams?.type || "flights").toLowerCase() as "flights" | "hotels" | "car-rentals";
  
  const compactTab = searchType === 'car-rentals' ? 'cars' : searchType;
  const [isSearchBoxLoading, setIsSearchBoxLoading] = useState(false);
  
  // Flight-specific states
  const [selectedStopFilter, setSelectedStopFilter] = useState<string>("all");
  const [selectedAirlineFilters, setSelectedAirlineFilters] = useState<Set<string>>(new Set());
  const [selectedOutboundDepartureTimeFilter, setSelectedOutboundDepartureTimeFilter] = useState<string>("all");
  const [selectedOutboundArrivalTimeFilter, setSelectedOutboundArrivalTimeFilter] = useState<string>("all");
  const [selectedReturnDepartureTimeFilter, setSelectedReturnDepartureTimeFilter] = useState<string>("all");
  const [selectedReturnArrivalTimeFilter, setSelectedReturnArrivalTimeFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("recommended");
  
  // Shared States for Hotels and Cars
  const [priceRange, setPriceRange] = useState<number>(2000000);
  const [sortBy, setSortBy] = useState<"match" | "price" | "rating">("match");
  const [visibleCount, setVisibleCount] = useState(6);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Hotel Filters
  const [starRatings, setStarRatings] = useState<number[]>([]);
  const [amenitiesFilter, setAmenitiesFilter] = useState<string[]>([]);

  // Car Rental Filters
  const [carTypeFilter, setCarTypeFilter] = useState<string[]>([]);
  const [transmissionFilter, setTransmissionFilter] = useState<string[]>([]);
  const [seatCapacityFilter, setSeatCapacityFilter] = useState<number[]>([]);
  const [providerFilter, setProviderFilter] = useState<string[]>([]);

  // Helper function to handle ad click navigation
  const handleAdClick = (ad: typeof advertisements[0]) => {
    if (ad.type === "hotels") {
      router.push(`${ad.link}?type=hotels&destination=${searchParams?.destination || 'London'}&checkIn=${searchParams?.departureDate || ''}&checkOut=${searchParams?.returnDate || ''}&guests=2`);
    } else if (ad.type === "insurance") {
      router.push(`${ad.link}?service=insurance&trip=${searchParams?.origin || 'Lagos'}-${searchParams?.destination || 'London'}`);
    } else if (ad.type === "payment") {
      router.push(`${ad.link}?origin=${searchParams?.origin || 'Lagos'}&destination=${searchParams?.destination || 'London'}&amount=${cheapestFlight?.rawPrice || ''}`);
    } else {
      router.push(ad.link);
    }
  };

  // Debug log
  useEffect(() => {
    console.log('🔍 SearchResults received:', {
      resultsType: typeof results,
      isArray: Array.isArray(results),
      hasData: results && typeof results === 'object' && 'data' in results,
      dataLength: results && typeof results === 'object' && 'data' in results && Array.isArray(results.data) ? results.data.length : 0,
      arrayLength: Array.isArray(results) ? results.length : 0,
      searchType,
      compactTab,
    });
  }, [results, searchParams, searchType]);

  const handleNewSearch = (searchData: any) => {
    console.log('🔄 New search from compact box:', searchData);
    setIsSearchBoxLoading(true);
    if (onNewSearch) {
      onNewSearch(searchData);
    }
    setTimeout(() => setIsSearchBoxLoading(false), 500);
  };

  const areResultsProcessed = useMemo(() => {
    if (searchType !== 'flights') return false;

    const resultsArray = Array.isArray(results) ? results :
      (results && typeof results === 'object' && 'data' in results) ? results.data : [];

    if (resultsArray.length === 0) return false;

    const firstItem = resultsArray[0];
    const hasProcessedFields = !!(firstItem.departureAirport || firstItem.displayPrice || firstItem.stopCount !== undefined);

    return hasProcessedFields;
  }, [results, searchType]);

  const flightOffers = useMemo(() => {
    if (areResultsProcessed) {
      if (Array.isArray(results)) {
        return results;
      }
      if (results && typeof results === 'object' && 'data' in results) {
        return results.data;
      }
    }

    if (results && typeof results === 'object' && 'data' in results && Array.isArray(results.data)) {
      return results.data;
    }
    if (Array.isArray(results)) {
      return results;
    }
    return [];
  }, [results, areResultsProcessed]);

  const airlinesMap = useMemo(() => createAirlinesMap(airlines), [airlines]);

  // Helper Functions
  const formatDuration = (duration?: string): string => {
    if (!duration) return '';

    let totalHours = 0;
    let totalMinutes = 0;

    const daysMatch = duration.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]) || 0;
      const hours = parseInt(daysMatch[2]) || 0;
      const minutes = parseInt(daysMatch[3]) || 0;
      totalHours = (days * 24) + hours;
      totalMinutes = minutes;
    } else {
      const hours = duration.match(/(\d+)H/);
      const minutes = duration.match(/(\d+)M/);
      totalHours = hours ? parseInt(hours[1]) : 0;
      totalMinutes = minutes ? parseInt(minutes[1]) : 0;
    }

    if (totalHours === 0 && totalMinutes === 0) return '';
    if (totalHours > 0 && totalMinutes > 0) return `${totalHours}h ${totalMinutes}m`;
    if (totalHours > 0) return `${totalHours}h`;
    return `${totalMinutes}m`;
  };

  const formatPrice = (amount: string, currencyCode: string): string => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return 'Price on request';

    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numericAmount);
    } catch (e) {
      return `${currencyCode} ${numericAmount.toFixed(0)}`;
    }
  };

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

  const getTimeOfDay = (dateTimeStr?: string): string => {
    if (!dateTimeStr) return 'all';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return 'all';
      const hours = date.getHours();
      if (hours >= 0 && hours < 12) return 'morning';
      if (hours >= 12 && hours < 18) return 'afternoon';
      return 'evening';
    } catch {
      return 'all';
    }
  };

  const getArrivalTimeOfDay = (dateTimeStr?: string): string => {
    if (!dateTimeStr) return 'all';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return 'all';
      const hours = date.getHours();
      if (hours >= 0 && hours < 12) return 'morning';
      if (hours >= 12 && hours < 18) return 'afternoon';
      return 'evening';
    } catch {
      return 'all';
    }
  };

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

  const formatFullDate = (dateTimeStr?: string): string => {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
    } catch {
      return '';
    }
  };

  // Process flight offers
  const processedFlightOffers = useMemo(() => {
    if (searchType !== 'flights' || flightOffers.length === 0) return [];

    if (areResultsProcessed) {
      return flightOffers;
    }

    return flightOffers.map((offer: ExtendedSearchResult) => {
      let segments: any[] = [];
      let firstSlice: any = null;
      let firstSegment: any = null;
      let lastSegment: any = null;

      if (offer.slices && offer.slices.length > 0) {
        firstSlice = offer.slices[0];
        segments = firstSlice?.segments || [];
      } else if (offer.flightItineraries && offer.flightItineraries.length > 0) {
        firstSlice = offer.flightItineraries[0];
        segments = firstSlice?.segments || [];
      } else if (offer.realData?.slices && offer.realData.slices.length > 0) {
        firstSlice = offer.realData.slices[0];
        segments = firstSlice?.segments || [];
      }

      if (segments.length > 0) {
        firstSegment = segments[0];
        lastSegment = segments[segments.length - 1];
      }

      let airlineCode = '';
      let airlineName = 'Unknown Airline';
      let logoUrl = '';

      if (offer.owner) {
        airlineCode = offer.owner.iata_code || '';
        airlineName = offer.owner.name || 'Unknown Airline';
        logoUrl = offer.owner.logo_symbol_url || '';
      }

      if (firstSegment) {
        const carrier = firstSegment.operating_carrier || firstSegment.marketing_carrier;
        if (carrier) {
          airlineCode = carrier.iata_code || carrier.carrierCode || airlineCode;
          airlineName = carrier.name || airlineName;
          logoUrl = carrier.logo_symbol_url || logoUrl;
        }
      }

      if (!logoUrl && airlineCode) {
        const airlineFromMap = airlinesMap.get(airlineCode);
        if (airlineFromMap) {
          logoUrl = airlineFromMap.logo_symbol_url || '';
        }
      }

      const segmentCount = segments.length;
      const stopCount = segmentCount > 0 ? segmentCount - 1 : 0;

      let stopText = 'Non stop';
      if (stopCount === 1) stopText = '1 Stop';
      else if (stopCount > 1) stopText = `${stopCount} Stops`;

      let departureAirport = '---';
      let departureCity = '';
      let departureTime = '';
      let arrivalAirport = '---';
      let arrivalCity = '';
      let arrivalTime = '';
      let flightNumber = '';

      if (firstSegment) {
        if (firstSegment.origin) {
          departureAirport = firstSegment.origin.iata_code || departureAirport;
          departureCity = firstSegment.origin.city_name || firstSegment.origin.city?.name || '';
        }
        if (firstSegment.departure) {
          departureAirport = firstSegment.departure.iataCode || departureAirport;
          departureTime = firstSegment.departure.at || '';
        }
        departureTime = firstSegment.departing_at || firstSegment.departure?.at || departureTime;

        if (firstSegment.marketing_carrier_flight_number) {
          flightNumber = firstSegment.marketing_carrier_flight_number;
        } else if (firstSegment.flight_number) {
          flightNumber = firstSegment.flight_number;
        } else if (firstSegment.number) {
          flightNumber = firstSegment.number;
        }
      }

      if (lastSegment) {
        if (lastSegment.destination) {
          arrivalAirport = lastSegment.destination.iata_code || arrivalAirport;
          arrivalCity = lastSegment.destination.city_name || lastSegment.destination.city?.name || '';
        }
        if (lastSegment.arrival) {
          arrivalAirport = lastSegment.arrival.iataCode || arrivalAirport;
          arrivalTime = lastSegment.arrival.at || '';
        }
        arrivalTime = lastSegment.arriving_at || lastSegment.arrival?.at || arrivalTime;
      }

      const duration = firstSlice?.duration || '';

      let priceAmount = '0';
      let priceCurrency = 'NGN';

      if (offer.original_amount) {
        priceAmount = offer.original_amount;
        priceCurrency = offer.original_currency || 'NGN';
      } else if (offer.total_amount) {
        priceAmount = offer.total_amount;
        priceCurrency = offer.total_currency || 'NGN';
      } else if (offer.final_amount) {
        priceAmount = offer.final_amount;
        priceCurrency = offer.currency || 'NGN';
      }

      const formattedPrice = formatPrice(priceAmount, priceCurrency);

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
        displayPrice: formattedPrice,
        rawPrice: parseFloat(priceAmount),
        price: formattedPrice,
        original_amount: offer.original_amount,
        original_currency: offer.original_currency,
        final_amount: offer.final_amount,
        currency: offer.currency,
        markup_percentage: offer.markup_percentage,
        markup_amount: offer.markup_amount,
        flightNumber: flightNumber,
        cabin,
        baggage: baggageString,
        title: `${departureAirport} → ${arrivalAirport}`,
        subtitle: airlineName,
        provider: airlineName,
        image: logoUrl,
        isRoundTrip: (offer.slices?.length || 0) > 1,
        outboundTimeOfDay: getTimeOfDay(departureTime),
        outboundArrivalTimeOfDay: getArrivalTimeOfDay(arrivalTime),
        returnFlight: (offer.slices?.length || 0) > 1 ? {
          departureAirport: offer.slices?.[1]?.segments?.[0]?.origin?.iata_code,
          arrivalAirport: offer.slices?.[1]?.segments?.[offer.slices[1].segments.length - 1]?.destination?.iata_code,
          departureCity: offer.slices?.[1]?.segments?.[0]?.origin?.city_name,
          arrivalCity: offer.slices?.[1]?.segments?.[offer.slices[1].segments.length - 1]?.destination?.city_name,
          departureTime: offer.slices?.[1]?.segments?.[0]?.departing_at,
          arrivalTime: offer.slices?.[1]?.segments?.[offer.slices[1].segments.length - 1]?.arriving_at,
          flightNumber: offer.slices?.[1]?.segments?.[0]?.marketing_carrier_flight_number,
          duration: offer.slices?.[1]?.duration,
          stopCount: Math.max(0, (offer.slices?.[1]?.segments?.length || 1) - 1),
          timeOfDay: getTimeOfDay(offer.slices?.[1]?.segments?.[0]?.departing_at),
          arrivalTimeOfDay: getArrivalTimeOfDay(offer.slices?.[1]?.segments?.[offer.slices[1].segments.length - 1]?.arriving_at)
        } : undefined,
      };

      return processedOffer;
    });
  }, [flightOffers, searchType, airlinesMap, areResultsProcessed]);

  // Get stop counts and cheapest prices for outbound
  const outboundStopStats = useMemo(() => {
    const stops = {
      'Non stop': { count: 0, cheapestPrice: Infinity, cheapestFlight: null as ExtendedSearchResult | null },
      '1 Stop': { count: 0, cheapestPrice: Infinity, cheapestFlight: null as ExtendedSearchResult | null },
      '1+ Stops': { count: 0, cheapestPrice: Infinity, cheapestFlight: null as ExtendedSearchResult | null },
    };
    
    processedFlightOffers.forEach(flight => {
      const stopCount = flight.stopCount || 0;
      let category = '';
      if (stopCount === 0) category = 'Non stop';
      else if (stopCount === 1) category = '1 Stop';
      else category = '1+ Stops';
      
      stops[category as keyof typeof stops].count++;
      
      const price = flight.rawPrice || Infinity;
      if (price < stops[category as keyof typeof stops].cheapestPrice) {
        stops[category as keyof typeof stops].cheapestPrice = price;
        stops[category as keyof typeof stops].cheapestFlight = flight;
      }
    });
    
    return stops;
  }, [processedFlightOffers]);

  // Get stop counts and cheapest prices for return
  const returnStopStats = useMemo(() => {
    const stops = {
      'Non stop': { count: 0, cheapestPrice: Infinity, cheapestFlight: null as ExtendedSearchResult | null },
      '1 Stop': { count: 0, cheapestPrice: Infinity, cheapestFlight: null as ExtendedSearchResult | null },
      '1+ Stops': { count: 0, cheapestPrice: Infinity, cheapestFlight: null as ExtendedSearchResult | null },
    };
    
    processedFlightOffers.forEach(flight => {
      if (flight.returnFlight) {
        const stopCount = flight.returnFlight.stopCount || 0;
        let category = '';
        if (stopCount === 0) category = 'Non stop';
        else if (stopCount === 1) category = '1 Stop';
        else category = '1+ Stops';
        
        stops[category as keyof typeof stops].count++;
        
        const price = flight.rawPrice || Infinity;
        if (price < stops[category as keyof typeof stops].cheapestPrice) {
          stops[category as keyof typeof stops].cheapestPrice = price;
          stops[category as keyof typeof stops].cheapestFlight = flight;
        }
      }
    });
    
    return stops;
  }, [processedFlightOffers]);

  // Get time counts
  const outboundDepartureTimeCounts = useMemo(() => {
    const counts = { morning: 0, afternoon: 0, evening: 0 };
    processedFlightOffers.forEach(flight => {
      const timeOfDay = flight.outboundTimeOfDay || getTimeOfDay(flight.departureTime);
      if (timeOfDay === 'morning') counts.morning++;
      else if (timeOfDay === 'afternoon') counts.afternoon++;
      else if (timeOfDay === 'evening') counts.evening++;
    });
    return counts;
  }, [processedFlightOffers]);

  const outboundArrivalTimeCounts = useMemo(() => {
    const counts = { morning: 0, afternoon: 0, evening: 0 };
    processedFlightOffers.forEach(flight => {
      const timeOfDay = flight.outboundArrivalTimeOfDay || getArrivalTimeOfDay(flight.arrivalTime);
      if (timeOfDay === 'morning') counts.morning++;
      else if (timeOfDay === 'afternoon') counts.afternoon++;
      else if (timeOfDay === 'evening') counts.evening++;
    });
    return counts;
  }, [processedFlightOffers]);

  const returnDepartureTimeCounts = useMemo(() => {
    const counts = { morning: 0, afternoon: 0, evening: 0 };
    processedFlightOffers.forEach(flight => {
      if (flight.returnFlight) {
        const timeOfDay = flight.returnFlight.timeOfDay || getTimeOfDay(flight.returnFlight.departureTime);
        if (timeOfDay === 'morning') counts.morning++;
        else if (timeOfDay === 'afternoon') counts.afternoon++;
        else if (timeOfDay === 'evening') counts.evening++;
      }
    });
    return counts;
  }, [processedFlightOffers]);

  const returnArrivalTimeCounts = useMemo(() => {
    const counts = { morning: 0, afternoon: 0, evening: 0 };
    processedFlightOffers.forEach(flight => {
      if (flight.returnFlight) {
        const timeOfDay = flight.returnFlight.arrivalTimeOfDay || getArrivalTimeOfDay(flight.returnFlight.arrivalTime);
        if (timeOfDay === 'morning') counts.morning++;
        else if (timeOfDay === 'afternoon') counts.afternoon++;
        else if (timeOfDay === 'evening') counts.evening++;
      }
    });
    return counts;
  }, [processedFlightOffers]);

  // Get airline list for filters
  const airlineList = useMemo(() => {
    const airlinesMap = new Map<string, number>();
    processedFlightOffers.forEach(flight => {
      const airlineName = flight.airlineName || 'Unknown';
      airlinesMap.set(airlineName, (airlinesMap.get(airlineName) || 0) + 1);
    });
    return Array.from(airlinesMap.entries()).map(([name, count]) => ({ name, count }));
  }, [processedFlightOffers]);

  // Filter and sort flights
  const filteredAndSortedFlights = useMemo(() => {
    let filtered = processedFlightOffers;

    if (selectedAirlineFilters.size > 0) {
      filtered = filtered.filter(flight => 
        selectedAirlineFilters.has(flight.airlineName || 'Unknown')
      );
    }

    if (selectedStopFilter !== 'all') {
      filtered = filtered.filter(flight => {
        const stopCount = flight.stopCount || 0;
        if (selectedStopFilter === 'Non stop') return stopCount === 0;
        if (selectedStopFilter === '1 Stop') return stopCount === 1;
        if (selectedStopFilter === '1+ Stops') return stopCount > 1;
        return true;
      });
    }

    if (selectedOutboundDepartureTimeFilter !== 'all') {
      filtered = filtered.filter(flight => {
        const timeOfDay = flight.outboundTimeOfDay || getTimeOfDay(flight.departureTime);
        return timeOfDay === selectedOutboundDepartureTimeFilter;
      });
    }

    if (selectedOutboundArrivalTimeFilter !== 'all') {
      filtered = filtered.filter(flight => {
        const timeOfDay = flight.outboundArrivalTimeOfDay || getArrivalTimeOfDay(flight.arrivalTime);
        return timeOfDay === selectedOutboundArrivalTimeFilter;
      });
    }

    if (selectedReturnDepartureTimeFilter !== 'all') {
      filtered = filtered.filter(flight => {
        if (!flight.returnFlight) return false;
        const timeOfDay = flight.returnFlight.timeOfDay || getTimeOfDay(flight.returnFlight.departureTime);
        return timeOfDay === selectedReturnDepartureTimeFilter;
      });
    }

    if (selectedReturnArrivalTimeFilter !== 'all') {
      filtered = filtered.filter(flight => {
        if (!flight.returnFlight) return false;
        const timeOfDay = flight.returnFlight.arrivalTimeOfDay || getArrivalTimeOfDay(flight.returnFlight.arrivalTime);
        return timeOfDay === selectedReturnArrivalTimeFilter;
      });
    }

    if (sortOption === 'cheapest') {
      filtered.sort((a, b) => (a.rawPrice || 0) - (b.rawPrice || 0));
    } else if (sortOption === 'fastest') {
      filtered.sort((a, b) => {
        const durationA = parseInt(a.duration?.replace(/[^0-9]/g, '') || '0');
        const durationB = parseInt(b.duration?.replace(/[^0-9]/g, '') || '0');
        return durationA - durationB;
      });
    } else {
      filtered.sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''));
    }

    return filtered;
  }, [processedFlightOffers, selectedAirlineFilters, selectedStopFilter, selectedOutboundDepartureTimeFilter, selectedOutboundArrivalTimeFilter, selectedReturnDepartureTimeFilter, selectedReturnArrivalTimeFilter, sortOption]);

  // Get cheapest and fastest flights
  const cheapestFlight = useMemo(() => {
    if (filteredAndSortedFlights.length === 0) return null;
    return filteredAndSortedFlights.reduce((min, flight) => 
      (flight.rawPrice || Infinity) < (min.rawPrice || Infinity) ? flight : min
    );
  }, [filteredAndSortedFlights]);

  const fastestFlight = useMemo(() => {
    if (filteredAndSortedFlights.length === 0) return null;
    return filteredAndSortedFlights.reduce((min, flight) => {
      const durationA = parseInt(flight.duration?.replace(/[^0-9]/g, '') || '0');
      const durationB = parseInt(min.duration?.replace(/[^0-9]/g, '') || '0');
      return durationA < durationB ? flight : min;
    });
  }, [filteredAndSortedFlights]);

  const toggleAirlineFilter = (airline: string) => {
    setSelectedAirlineFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(airline)) {
        newSet.delete(airline);
      } else {
        newSet.add(airline);
      }
      return newSet;
    });
  };

  const getBaggageText = (flight: ExtendedSearchResult): string => {
    if (flight.baggage) {
      try {
        const bags = JSON.parse(flight.baggage);
        const checkedBags = bags.find((b: any) => b.type === 'checked');
        if (checkedBags) {
          return `${checkedBags.quantity} checked bag${checkedBags.quantity > 1 ? 's' : ''}`;
        }
      } catch (e) {
        return '';
      }
    }
    return '';
  };

  // Format route title
  const routeTitle = useMemo(() => {
    const origin = searchParams?.origin || '';
    const destination = searchParams?.destination || '';
    const tripType = searchParams?.tripType || 'Round Trip';
    
    if (origin && destination) {
      if (tripType === 'Round Trip') {
        return `From ${origin} to ${destination} and back`;
      }
      return `${origin} to ${destination}`;
    }
    
    if (processedFlightOffers.length > 0) {
      const firstFlight = processedFlightOffers[0];
      if (firstFlight.departureCity && firstFlight.arrivalCity) {
        const originCity = firstFlight.departureCity;
        const destinationCity = firstFlight.arrivalCity;
        
        if (firstFlight.isRoundTrip || (firstFlight.slices?.length || 0) > 1) {
          return `From ${originCity} to ${destinationCity} and back`;
        }
        return `${originCity} to ${destinationCity}`;
      }
      
      if (firstFlight.departureAirport && firstFlight.arrivalAirport) {
        const originCode = firstFlight.departureAirport;
        const destinationCode = firstFlight.arrivalAirport;
        
        if (firstFlight.isRoundTrip || (firstFlight.slices?.length || 0) > 1) {
          return `From ${originCode} to ${destinationCode} and back`;
        }
        return `${originCode} to ${destinationCode}`;
      }
    }
    
    return 'Flights';
  }, [searchParams, processedFlightOffers]);

  // Get origin and destination for display
  const origin = useMemo(() => {
    return searchParams?.origin || (processedFlightOffers[0]?.departureCity) || 'Lagos';
  }, [searchParams, processedFlightOffers]);

  const destination = useMemo(() => {
    return searchParams?.destination || (processedFlightOffers[0]?.arrivalCity) || 'London';
  }, [searchParams, processedFlightOffers]);

  // Extract hotel and car results
  const hotelAndCarResults = useMemo(() => {
    if (searchType === 'flights') return [];
    
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
  }, [results, searchType]);

  // Filter hotel and car results
  const filteredHotelAndCarResults = useMemo(() => {
    let filtered = [...hotelAndCarResults];

    // Price filter
    filtered = filtered.filter((item) => {
      let numericPrice = 0;
      if (item.rawPrice) {
        numericPrice = item.rawPrice;
      } else if (item.price) {
        if (typeof item.price === 'string') {
          numericPrice = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
        } else if (typeof item.price === 'number') {
          numericPrice = item.price;
        }
      } else if (item.total_amount) {
        numericPrice = parseFloat(item.total_amount) || 0;
      }
      return numericPrice <= priceRange;
    });

    if (searchType === "hotels") {
      if (starRatings.length > 0) {
        filtered = filtered.filter(item => starRatings.includes(Math.floor(item.rating || 0)));
      }
      if (amenitiesFilter.length > 0) {
        filtered = filtered.filter(item => amenitiesFilter.every(a => item.amenities?.includes(a)));
      }
    } else if (searchType === "car-rentals") {
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

    // Sort
    if (sortBy === "price") {
      filtered.sort((a, b) => {
        const getPrice = (item: ExtendedSearchResult): number => {
          if (item.rawPrice) return item.rawPrice;
          if (typeof item.price === 'string') return parseFloat(item.price.replace(/[^\d.]/g, '') || '0');
          if (typeof item.price === 'number') return item.price;
          return 0;
        };
        return getPrice(a) - getPrice(b);
      });
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return filtered;
  }, [hotelAndCarResults, searchType, priceRange, sortBy, starRatings, amenitiesFilter, carTypeFilter, transmissionFilter, seatCapacityFilter, providerFilter]);

  // Unique values for filters
  const uniqueCarTypes = useMemo(() => {
    const types = hotelAndCarResults
      .filter(r => r.type === 'car-rentals')
      .map(r => r.vehicleCode || '')
      .filter(Boolean);
    return Array.from(new Set(types));
  }, [hotelAndCarResults]);

  const uniqueSeatCapacities = useMemo(() => {
    const seats = hotelAndCarResults
      .filter(r => r.type === 'car-rentals')
      .map(r => r.seats || 0)
      .filter(s => s > 0);
    return Array.from(new Set(seats)).sort((a, b) => a - b);
  }, [hotelAndCarResults]);

  const uniqueProviders = useMemo(() => {
    const providers = hotelAndCarResults
      .filter(r => r.type === 'car-rentals')
      .map(r => r.provider)
      .filter(Boolean);
    return Array.from(new Set(providers));
  }, [hotelAndCarResults]);

  const toggleFilter = (set: React.Dispatch<React.SetStateAction<any[]>>, current: any[], value: any) => {
    set(current.includes(value) ? current.filter(i => i !== value) : [...current, value]);
  };

  const clearAllFilters = () => {
    setPriceRange(2000000);
    setStarRatings([]);
    setAmenitiesFilter([]);
    setCarTypeFilter([]);
    setTransmissionFilter([]);
    setSeatCapacityFilter([]);
    setProviderFilter([]);
    setSortBy("match");
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

  // Render Hotel Card
  const renderHotelCard = (item: ExtendedSearchResult) => {
    const starRating = Math.floor(item.rating || 4);
    const displayPrice = (() => {
      if (!item.price) return 'Price on request';
      if (typeof item.price === 'string') return item.price;
      if (typeof item.price === 'number') return `£${item.price.toFixed(2)}`;
      return 'Price on request';
    })();

    return (
      <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-[320px] relative flex-shrink-0 min-h-[256px]">
            <HotelListImage
              hotelId={item.id}
              hotelName={item.title}
              initialSrc={item.image}
              alt={item.title}
              className="absolute inset-0 w-full h-full overflow-hidden"
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
              className={`absolute top-4 right-4 w-10 h-10 rounded-full z-10 flex items-center justify-center transition backdrop-blur-md ${savedItems.has(item.id) ? "bg-red-500 text-white" : "bg-white/40 text-gray-400 hover:bg-white"}`}
            >
              <svg className="w-5 h-5" fill={savedItems.has(item.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth={2} />
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
                <p className="text-2xl font-black text-[#33a8da]">{displayPrice}</p>
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

  // Render Car Card
  const renderCarCard = (item: ExtendedSearchResult) => {
    const start = item.start;
    const end = item.end;
    const vehicle = item.vehicle || {};
    const serviceProvider = item.serviceProvider || item.partnerInfo?.serviceProvider || {};
    const duration = formatDuration(item.duration);
    const isLongDistance = (() => {
      if (!item.distance) return false;
      return item.distance.unit === 'MI';
    })();
    const baggageCount = vehicle.baggages?.reduce((total: number, bag: any) =>
      total + (bag.count || 0), 0) || 0;
    const seats = vehicle.seats?.[0]?.count || 0;
    const carImageUrl = vehicle.imageURL || item.image || serviceProvider.logoUrl;

    const formatDisplayPrice = () => {
      if (item.final_price) {
        const price = parseFloat(item.final_price);
        return `£${price.toFixed(2)}${duration ? '/day' : ''}`;
      }
      if (item.price && typeof item.price === 'object' && 'total' in item.price) {
        const price = parseFloat((item.price as any).total || '0');
        return `£${price.toFixed(2)}${duration ? '/day' : ''}`;
      }
      return 'Price on request';
    };

    if (!start?.locationCode || !end?.locationCode) {
      return null;
    }

    return (
      <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-[320px] h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8 relative">
            {carImageUrl ? (
              <img
                src={carImageUrl}
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-300"
                alt={vehicle.description || item.title || 'Car'}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-xs">No image</span>
              </div>
            )}

            {serviceProvider.logoUrl && serviceProvider.logoUrl !== carImageUrl && (
              <div className="absolute top-4 left-4 bg-white rounded-lg p-2 shadow-md">
                <img
                  src={serviceProvider.logoUrl}
                  alt={serviceProvider.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="absolute top-4 right-4 bg-[#33a8da]/90 backdrop-blur-sm text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
              {vehicle.code || vehicle.category || 'CAR'}
            </div>
          </div>

          <div className="flex-1 p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-[#33a8da] transition">
                  {vehicle.description || item.title || 'Vehicle'}
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">
                  {serviceProvider.name || item.provider} • {vehicle.category || 'Standard'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {seats > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 4.5v15m7.5-7.5h-15" strokeWidth={1.5} />
                  </svg>
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {seats} Seats
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
                    {start.locationCode}
                  </p>
                  {start.dateTime && (
                    <p className="text-gray-500 text-[9px] mt-0.5">
                      {new Date(start.dateTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-[#33a8da]">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth={2} stroke="currentColor" fill="none" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-500 font-bold uppercase">Drop-off</p>
                  <p className="font-bold text-gray-900 mt-1">
                    {end.locationCode}
                  </p>
                  {end.dateTime && (
                    <p className="text-gray-500 text-[9px] mt-0.5">
                      {new Date(end.dateTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="text-2xl font-black text-[#33a8da]">
                  {formatDisplayPrice()}
                </p>
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
          </div>
        </div>
      </div>
    );
  };

  // Flight Card Component
  const renderWakanowFlightCard = (flight: ExtendedSearchResult) => {
    const isRefundable = flight.conditions?.refund_before_departure?.allowed;
    const baggageText = getBaggageText(flight);
    const hasReturn = flight.isRoundTrip && flight.returnFlight?.departureTime;

    return (
      <div 
        key={flight.id} 
        className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 mb-6 overflow-hidden border border-gray-200 cursor-pointer"
        onClick={() => onSelect?.(flight)}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              {flight.airlineLogo ? (
                <img
                  src={flight.airlineLogo}
                  className="w-12 h-12 object-contain"
                  alt={flight.airlineName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${(flight.airlineName || 'Airline').substring(0, 2)}&background=33a8da&color=fff&length=2&size=48`;
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-[#33a8da] to-[#2c98c7] rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {(flight.airlineName || 'AI').substring(0, 2)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{flight.airlineName}</h4>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{flight.displayPrice}</div>
              <button 
                className="mt-2 bg-[#33a8da] text-white font-semibold px-5 py-1.5 rounded-lg text-sm hover:bg-[#2c98c7] transition"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(flight);
                }}
              >
                Book Now
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-5 transition hover:bg-gray-100">
              <p className="text-sm text-gray-500 mb-4">
                Depart {formatTime(flight.departureTime)} · {flight.airlineName}
              </p>
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-2xl font-bold text-gray-900">{formatTime(flight.departureTime)}</p>
                  <p className="text-sm font-medium text-gray-700 mt-2">{flight.departureAirport}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatFullDate(flight.departureTime)}</p>
                </div>
                
                <div className="flex-1 mx-6">
                  <div className="relative">
                    <div className="w-full h-[1px] bg-gray-300"></div>
                    <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-gray-50 px-2">
                      <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <p className="text-sm font-medium text-gray-600">{flight.duration}</p>
                    <p className="text-xs text-gray-400 mt-1">{flight.stopText}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{formatTime(flight.arrivalTime)}</p>
                  <p className="text-sm font-medium text-gray-700 mt-2">{flight.arrivalAirport}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatFullDate(flight.arrivalTime)}</p>
                </div>
              </div>
            </div>

            {hasReturn && flight.returnFlight && (
              <div className="bg-gray-50 rounded-xl p-5 transition hover:bg-gray-100">
                <p className="text-sm text-gray-500 mb-4">
                  Return {formatTime(flight.returnFlight.departureTime)} · {flight.airlineName}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">{formatTime(flight.returnFlight.departureTime)}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">{flight.returnFlight.departureAirport}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatFullDate(flight.returnFlight.departureTime)}</p>
                  </div>
                  
                  <div className="flex-1 mx-6">
                    <div className="relative">
                      <div className="w-full h-[1px] bg-gray-300"></div>
                      <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-gray-50 px-2">
                        <svg className="w-5 h-5 text-[#33a8da] rotate-180" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <p className="text-sm font-medium text-gray-600">{flight.returnFlight.duration}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {flight.returnFlight.stopCount === 0 ? 'Non stop' : 
                         flight.returnFlight.stopCount === 1 ? '1 Stop' : `${flight.returnFlight.stopCount} Stops`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{formatTime(flight.returnFlight.arrivalTime)}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">{flight.returnFlight.arrivalAirport}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatFullDate(flight.returnFlight.arrivalTime)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {baggageText && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={1.5} />
                  </svg>
                  <span className="text-sm text-gray-500">{baggageText}</span>
                </div>
              )}
              {flight.cabin && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth={1.5} />
                  </svg>
                  <span className="text-sm text-gray-500">{flight.cabin}</span>
                </div>
              )}
              {!isRefundable && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeWidth={1.5} />
                  </svg>
                  <span className="text-sm text-gray-500">Non Refundable</span>
                </div>
              )}
            </div>
            <button className="text-[#33a8da] text-sm font-medium hover:underline">
              View Flight Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Right Sidebar Ads Component - Only for flights
  const renderRightSidebarAds = () => (
    <div className="w-full lg:w-[260px] shrink-0 space-y-4">
      {advertisements.map((ad) => (
        <div
          key={ad.id}
          className={`bg-gradient-to-br ${ad.bgColor} rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group ${ad.isTall ? 'h-auto' : ''}`}
          onClick={() => handleAdClick(ad)}
        >
          {ad.isTall ? (
            <div className="relative">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-all duration-300"></div>
              </div>
              <div className="p-5 text-white text-center">
                <div className="mb-2">
                  <span className="text-xs font-semibold bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                    {ad.brand}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{ad.title}</h3>
                <p className="text-sm mb-3">{ad.description}</p>
                <p className="text-xs mb-4 opacity-80">{ad.subText}</p>
                <button className="bg-white text-gray-900 font-bold px-6 py-2 rounded-lg text-sm hover:bg-gray-100 transition w-full">
                  {ad.buttonText}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative h-32 overflow-hidden">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300"></div>
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="text-white text-[10px] font-semibold bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                    Special Offer
                  </span>
                </div>
              </div>
              <div className="p-3 text-white">
                <h4 className="font-bold text-sm mb-1">{ad.title}</h4>
                <p className="text-[11px] opacity-90 mb-2">{ad.description}</p>
                <button className="bg-white text-gray-900 font-semibold px-3 py-1.5 rounded-lg text-[11px] hover:bg-gray-100 transition w-full">
                  {ad.buttonText} →
                </button>
              </div>
            </>
          )}
        </div>
      ))}
      
      <div className="bg-gradient-to-br from-[#33a8da] to-[#2c98c7] rounded-2xl p-4 text-white text-center shadow-md">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h4 className="font-bold text-base mb-1">Need Help?</h4>
        <p className="text-xs mb-2">24/7 Customer Support</p>
        <p className="text-lg font-bold">+44 1582 340807</p>
        <p className="text-[10px] mt-1 opacity-75">Call us for exclusive deals</p>
      </div>
    </div>
  );

  // Filter Sidebar for Flights
  const renderFlightFilters = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 sticky top-24">
      {/* Airlines Section */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-900 mb-4 text-base">Airlines</h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {airlineList.map(airline => (
            <label key={airline.name} className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={selectedAirlineFilters.has(airline.name)}
                  onChange={() => toggleAirlineFilter(airline.name)}
                  className="rounded border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{airline.name}</span>
              </div>
              <span className="text-xs text-gray-400">{airline.count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Onward Journey Section */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-900 mb-4 text-base">Onward Journey</h3>
        
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3 text-sm">Stops from {origin}</h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="stopFilter"
                  checked={selectedStopFilter === 'Non stop'}
                  onChange={() => setSelectedStopFilter('Non stop')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">Non stop ({outboundStopStats['Non stop'].count})</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {outboundStopStats['Non stop'].cheapestFlight?.displayPrice || 
                 (outboundStopStats['Non stop'].cheapestPrice !== Infinity ? formatPrice(outboundStopStats['Non stop'].cheapestPrice.toString(), 'NGN') : '--')}
              </span>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="stopFilter"
                  checked={selectedStopFilter === '1 Stop'}
                  onChange={() => setSelectedStopFilter('1 Stop')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">1 Stop ({outboundStopStats['1 Stop'].count})</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {outboundStopStats['1 Stop'].cheapestFlight?.displayPrice || 
                 (outboundStopStats['1 Stop'].cheapestPrice !== Infinity ? formatPrice(outboundStopStats['1 Stop'].cheapestPrice.toString(), 'NGN') : '--')}
              </span>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="stopFilter"
                  checked={selectedStopFilter === '1+ Stops'}
                  onChange={() => setSelectedStopFilter('1+ Stops')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">1+ Stops ({outboundStopStats['1+ Stops'].count})</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {outboundStopStats['1+ Stops'].cheapestFlight?.displayPrice || 
                 (outboundStopStats['1+ Stops'].cheapestPrice !== Infinity ? formatPrice(outboundStopStats['1+ Stops'].cheapestPrice.toString(), 'NGN') : '--')}
              </span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Departure From {origin}</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="outboundDepartureTimeFilter"
                checked={selectedOutboundDepartureTimeFilter === 'morning'}
                onChange={() => setSelectedOutboundDepartureTimeFilter('morning')}
                className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span className="text-sm text-gray-700">Morning (12:00AM - 11:59AM) ({outboundDepartureTimeCounts.morning})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="outboundDepartureTimeFilter"
                checked={selectedOutboundDepartureTimeFilter === 'afternoon'}
                onChange={() => setSelectedOutboundDepartureTimeFilter('afternoon')}
                className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span className="text-sm text-gray-700">Afternoon (12:00PM - 5:59PM) ({outboundDepartureTimeCounts.afternoon})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="outboundDepartureTimeFilter"
                checked={selectedOutboundDepartureTimeFilter === 'evening'}
                onChange={() => setSelectedOutboundDepartureTimeFilter('evening')}
                className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span className="text-sm text-gray-700">Evening (6:00PM - 11:59PM) ({outboundDepartureTimeCounts.evening})</span>
            </label>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Arrival at {destination}</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="outboundArrivalTimeFilter"
                checked={selectedOutboundArrivalTimeFilter === 'morning'}
                onChange={() => setSelectedOutboundArrivalTimeFilter('morning')}
                className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span className="text-sm text-gray-700">Morning (12:00AM - 11:59AM) ({outboundArrivalTimeCounts.morning})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="outboundArrivalTimeFilter"
                checked={selectedOutboundArrivalTimeFilter === 'afternoon'}
                onChange={() => setSelectedOutboundArrivalTimeFilter('afternoon')}
                className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span className="text-sm text-gray-700">Afternoon (12:00PM - 5:59PM) ({outboundArrivalTimeCounts.afternoon})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="outboundArrivalTimeFilter"
                checked={selectedOutboundArrivalTimeFilter === 'evening'}
                onChange={() => setSelectedOutboundArrivalTimeFilter('evening')}
                className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
              />
              <span className="text-sm text-gray-700">Evening (6:00PM - 11:59PM) ({outboundArrivalTimeCounts.evening})</span>
            </label>
          </div>
        </div>
      </div>

      {/* Return Journey Section */}
      {processedFlightOffers.some(flight => flight.isRoundTrip) && (
        <div className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-base">Return Journey</h3>
          
          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3 text-sm">Stops from {destination}</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Non stop ({returnStopStats['Non stop'].count})</span>
                <span className="text-sm font-semibold text-gray-900">
                  {returnStopStats['Non stop'].cheapestFlight?.displayPrice || 
                   (returnStopStats['Non stop'].cheapestPrice !== Infinity ? formatPrice(returnStopStats['Non stop'].cheapestPrice.toString(), 'NGN') : '--')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">1 Stop ({returnStopStats['1 Stop'].count})</span>
                <span className="text-sm font-semibold text-gray-900">
                  {returnStopStats['1 Stop'].cheapestFlight?.displayPrice || 
                   (returnStopStats['1 Stop'].cheapestPrice !== Infinity ? formatPrice(returnStopStats['1 Stop'].cheapestPrice.toString(), 'NGN') : '--')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">1+ Stops ({returnStopStats['1+ Stops'].count})</span>
                <span className="text-sm font-semibold text-gray-900">
                  {returnStopStats['1+ Stops'].cheapestFlight?.displayPrice || 
                   (returnStopStats['1+ Stops'].cheapestPrice !== Infinity ? formatPrice(returnStopStats['1+ Stops'].cheapestPrice.toString(), 'NGN') : '--')}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Departure From {destination}</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="returnDepartureTimeFilter"
                  checked={selectedReturnDepartureTimeFilter === 'morning'}
                  onChange={() => setSelectedReturnDepartureTimeFilter('morning')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">Morning (12:00AM - 11:59AM) ({returnDepartureTimeCounts.morning})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="returnDepartureTimeFilter"
                  checked={selectedReturnDepartureTimeFilter === 'afternoon'}
                  onChange={() => setSelectedReturnDepartureTimeFilter('afternoon')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">Afternoon (12:00PM - 5:59PM) ({returnDepartureTimeCounts.afternoon})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="returnDepartureTimeFilter"
                  checked={selectedReturnDepartureTimeFilter === 'evening'}
                  onChange={() => setSelectedReturnDepartureTimeFilter('evening')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">Evening (6:00PM - 11:59PM) ({returnDepartureTimeCounts.evening})</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Arrival at {origin}</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="returnArrivalTimeFilter"
                  checked={selectedReturnArrivalTimeFilter === 'morning'}
                  onChange={() => setSelectedReturnArrivalTimeFilter('morning')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">Morning (12:00AM - 11:59AM) ({returnArrivalTimeCounts.morning})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="returnArrivalTimeFilter"
                  checked={selectedReturnArrivalTimeFilter === 'afternoon'}
                  onChange={() => setSelectedReturnArrivalTimeFilter('afternoon')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">Afternoon (12:00PM - 5:59PM) ({returnArrivalTimeCounts.afternoon})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="returnArrivalTimeFilter"
                  checked={selectedReturnArrivalTimeFilter === 'evening'}
                  onChange={() => setSelectedReturnArrivalTimeFilter('evening')}
                  className="rounded-full border-gray-300 text-[#33a8da] focus:ring-[#33a8da]"
                />
                <span className="text-sm text-gray-700">Evening (6:00PM - 11:59PM) ({returnArrivalTimeCounts.evening})</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      {(selectedAirlineFilters.size > 0 || selectedStopFilter !== 'all' || 
        selectedOutboundDepartureTimeFilter !== 'all' || selectedOutboundArrivalTimeFilter !== 'all' ||
        selectedReturnDepartureTimeFilter !== 'all' || selectedReturnArrivalTimeFilter !== 'all') && (
        <button
          onClick={() => {
            setSelectedAirlineFilters(new Set());
            setSelectedStopFilter('all');
            setSelectedOutboundDepartureTimeFilter('all');
            setSelectedOutboundArrivalTimeFilter('all');
            setSelectedReturnDepartureTimeFilter('all');
            setSelectedReturnArrivalTimeFilter('all');
          }}
          className="mt-8 w-full text-center text-sm text-[#33a8da] font-medium hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  // Hotel and Car Filter Sidebar
  const renderHotelCarFilters = () => (
    <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100 sticky top-24">
      <div className="flex justify-between items-center mb-8">
        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Filters</h4>
        <button
          onClick={clearAllFilters}
          className="text-[9px] font-black text-[#33a8da] uppercase tracking-widest hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* Price Range */}
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
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white shadow-sm border-b border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4">
            <CompactSearchBox
              onSearch={handleNewSearch}
              loading={isSearchBoxLoading}
              activeTab={compactTab}
              initialParams={searchParams}
            />
          </div>
        </div>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#33a8da] mb-6"></div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">
              {searchType === 'flights' ? 'Searching for flights...' : 
               searchType === 'hotels' ? 'Searching for hotels...' : 
               'Searching for car rentals...'}
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              {searchType === 'flights' ? 'Finding the best flight options for you' : 
               searchType === 'hotels' ? 'Finding the best hotel options for you' : 
               'Finding the best car rental options for you'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow-sm border-b border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <CompactSearchBox
            onSearch={handleNewSearch}
            loading={isSearchBoxLoading}
            activeTab={compactTab}
            initialParams={searchParams}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Flights View */}
        {searchType === 'flights' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{routeTitle}</h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="w-full lg:w-[280px] shrink-0">
                {renderFlightFilters()}
              </aside>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      <span className="font-bold text-gray-900">{filteredAndSortedFlights.length}</span> flights found
                    </span>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Cheapest Fare:</span>
                      <span className="font-bold text-[#33a8da]">
                        {cheapestFlight?.displayPrice || '--'}
                      </span>
                    </div>
                    {fastestFlight && (
                      <>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Fastest:</span>
                          <span className="font-bold text-[#33a8da]">
                            {fastestFlight.duration}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <select 
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#33a8da] focus:border-transparent"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="cheapest">Cheapest</option>
                    <option value="fastest">Fastest</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedStopFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      selectedStopFilter === 'all'
                        ? 'bg-[#33a8da] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    All ({filteredAndSortedFlights.length})
                  </button>
                  <button
                    onClick={() => setSelectedStopFilter('Non stop')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      selectedStopFilter === 'Non stop'
                        ? 'bg-[#33a8da] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Non stop ({outboundStopStats['Non stop'].count})
                  </button>
                  <button
                    onClick={() => setSelectedStopFilter('1 Stop')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      selectedStopFilter === '1 Stop'
                        ? 'bg-[#33a8da] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    1 Stop ({outboundStopStats['1 Stop'].count})
                  </button>
                  <button
                    onClick={() => setSelectedStopFilter('1+ Stops')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      selectedStopFilter === '1+ Stops'
                        ? 'bg-[#33a8da] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    1+ Stops ({outboundStopStats['1+ Stops'].count})
                  </button>
                </div>

                {filteredAndSortedFlights.length > 0 ? (
                  filteredAndSortedFlights.map(flight => renderWakanowFlightCard(flight))
                ) : (
                  <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No flights found</h3>
                    <p className="text-gray-500">Try adjusting your search criteria or filters</p>
                  </div>
                )}
              </div>

              {renderRightSidebarAds()}
            </div>
          </>
        )}

        {/* Hotels View */}
        {searchType === 'hotels' && (
          <div className="flex flex-col lg:flex-row gap-10">
            <aside className="w-full lg:w-[300px] shrink-0 space-y-6">
              {renderHotelCarFilters()}
            </aside>

            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
                  {filteredHotelAndCarResults.length} hotels found
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
                {filteredHotelAndCarResults.length > 0 ? (
                  filteredHotelAndCarResults.slice(0, visibleCount).map(item => renderHotelCard(item))
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

              {filteredHotelAndCarResults.length > visibleCount && (
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
        )}

        {/* Car Rentals View */}
        {searchType === 'car-rentals' && (
          <div className="flex flex-col lg:flex-row gap-10">
            <aside className="w-full lg:w-[300px] shrink-0 space-y-6">
              {renderHotelCarFilters()}
            </aside>

            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
                  {filteredHotelAndCarResults.length} cars found
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
                {filteredHotelAndCarResults.length > 0 ? (
                  filteredHotelAndCarResults.slice(0, visibleCount).map(item => renderCarCard(item))
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

              {filteredHotelAndCarResults.length > visibleCount && (
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
        )}
      </div>
    </div>
  );
};

export default SearchResults;