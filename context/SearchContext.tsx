'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { config } from '@/lib/config';
import { extractAirportCode } from '@/lib/utils';
import type { SearchParams, SearchResult } from '@/lib/types';
import type { Airline } from '@/lib/duffel-airlines';
import api from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

// ─── Mock fallback data (only used when API fails) ─────────────────────────────
const MOCK: Record<string, SearchResult[]> = {
  flights: [
    { id: 'f-1', provider: 'Air Peace', title: 'Air Peace P47121', subtitle: 'Lagos (LOS) → Abuja (ABV)', price: '£85', time: '08:00 AM', duration: '1h 15m', type: 'flights', image: 'https://logos-world.net/wp-content/uploads/2023/03/Air-Peace-Logo.png' },
    { id: 'f-2', provider: 'Ibom Air', title: 'Ibom Air QI0320', subtitle: 'Lagos (LOS) → Abuja (ABV)', price: '£92', time: '10:30 AM', duration: '1h 10m', type: 'flights', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Ibom_Air_logo.png/1200px-Ibom_Air_logo.png' },
  ],
  hotels: [
    { id: 'h-1', provider: 'Amadeus Premium', title: 'The Wheatbaker Lagos', subtitle: 'Ikoyi, Lagos', price: '£145/night', rating: 4.9, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800', type: 'hotels', amenities: ['Free Wi-Fi', 'Swimming Pool', 'Spa'] },
  ],
  'car-rentals': [
    { id: 'c-1', provider: 'Hertz Elite', title: 'Mercedes-Benz E-Class', subtitle: 'Lagos Int. Airport', price: '£85/day', rating: 4.8, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800', type: 'car-rentals', amenities: ['Automatic', 'AC'], features: ['5 Seats', 'Luxury'] },
  ],
};

interface SearchContextType {
  searchParams: SearchParams | null;
  searchResults: SearchResult[];
  selectedItem: SearchResult | null;
  isSearching: boolean;
  search: (params: SearchParams) => Promise<void>;
  selectItem: (item: SearchResult) => void;
  clearSearch: () => void;
  persistSelectionForReturn: () => void;
  airlines: Airline[];
  isLoadingAirlines: boolean;
  fetchAirlines: () => Promise<void>;
  searchError: string | null;
  searchCompleted: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const BOOKING_REVIEW_SELECTION_KEY = 'ebt_booking_review_selection';

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoadingAirlines, setIsLoadingAirlines] = useState(false);
  const [transformingProgress, setTransformingProgress] = useState(0);

  // Get currency and conversion functions from LanguageContext
  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();

  // Cache for search results
  const searchCache = useRef<Map<string, SearchResult[]>>(new Map());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(BOOKING_REVIEW_SELECTION_KEY) : null;
      if (!raw) return;
      const data = JSON.parse(raw) as { selectedItem: SearchResult | null; searchParams: SearchParams | null };
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
      if (data.selectedItem) setSelectedItem(data.selectedItem);
      if (data.searchParams) setSearchParams(data.searchParams);
    } catch {
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
    }
  }, []);

  const fetchAirlines = useCallback(async () => {
    console.log('⚠️ Airlines endpoint not available - skipping');
    return;
  }, []);

  useEffect(() => {
    if (searchParams?.type === 'flights') {
      fetchAirlines();
    }
  }, [searchParams?.type, fetchAirlines]);

  const getSearchCacheKey = (params: SearchParams): string => {
    return JSON.stringify({
      type: params.type,
      from: params.segments?.[0]?.from,
      to: params.segments?.[0]?.to,
      date: params.segments?.[0]?.date,
      returnDate: params.returnDate,
    });
  };

  const search = useCallback(async (params: SearchParams) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      console.log('🔍 Search called with params:', params);
      
      // Check cache first
      const cacheKey = getSearchCacheKey(params);
      const cached = searchCache.current.get(cacheKey);
      if (cached && cached.length > 0) {
        console.log('📦 Returning cached search results');
        setSearchParams(params);
        setSearchResults(cached);
        setSearchCompleted(true);
        return;
      }
      
      setSearchParams(params);
      setIsSearching(true);
      setSearchResults([]);
      setSearchError(null);
      setSearchCompleted(false);
      setTransformingProgress(0);

      try {
        if (params.type === 'car-rentals' || params.type === 'cars') {
          await searchCars(params);
        } else if (params.type === 'hotels') {
          await searchHotels(params);
        } else if (params.type === 'flights') {
          await searchFlights(params);
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchError('Failed to load results. Please try again.');
        const mockKey = params.type === 'cars' ? 'car-rentals' : params.type;
        setSearchResults(MOCK[mockKey] ?? []);
      } finally {
        setIsSearching(false);
        setSearchCompleted(true);
        setTransformingProgress(100);
      }
    }, 300);
  }, []);

  // Helper function to calculate total service fee (markup + conversion fee + taxes)
  const calculateTotalServiceFee = (markupAmount: number, conversionFee: number, taxes: number): number => {
    return markupAmount + conversionFee + taxes;
  };

  // Helper function to format price in user's currency with batching
  const formatPriceInUserCurrency = useCallback(async (amount: number, fromCurrency: string = 'NGN'): Promise<string> => {
    try {
      let finalAmount = amount;
      if (fromCurrency !== currency.code) {
        finalAmount = await convertPrice(amount, fromCurrency);
      }
      return await formatPrice(finalAmount, fromCurrency);
    } catch (error) {
      console.error('Failed to format price in user currency:', error);
      const symbols: Record<string, string> = {
        'NGN': '₦',
        'GBP': '£',
        'USD': '$',
        'EUR': '€',
      };
      const symbol = symbols[fromCurrency] || fromCurrency;
      return `${symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    }
  }, [currency.code, convertPrice, formatPrice]);

  // Helper function to get display price in user's currency as number
  const getDisplayPriceInUserCurrency = useCallback(async (amount: number, fromCurrency: string = 'NGN'): Promise<number> => {
    try {
      if (fromCurrency === currency.code) return amount;
      return await convertPrice(amount, fromCurrency);
    } catch (error) {
      console.error('Failed to convert price:', error);
      return amount;
    }
  }, [currency.code, convertPrice]);

  // ==================== CAR RENTAL SEARCH WITH MERGED SERVICE FEE ====================
  const searchCars = async (params: SearchParams) => {
    try {
      if (!params.pickupLocationCode || !params.dropoffLocationCode ||
        !params.pickupDateTime || !params.dropoffDateTime) {
        console.error('❌ Missing required car rental parameters');
        setSearchResults([]);
        setSearchError('Missing location or date information. Please try again.');
        return;
      }

      let passengerCount = 2;
      if (params.passengers) {
        if (typeof params.passengers === 'number') {
          passengerCount = params.passengers;
        } else if (typeof params.passengers === 'object') {
          passengerCount = (params.passengers.adults || 0) +
            (params.passengers.children || 0) +
            (params.passengers.infants || 0);
          passengerCount = Math.max(1, passengerCount);
        }
      }

      const carParams = {
        pickupLocationCode: params.pickupLocationCode,
        dropoffLocationCode: params.dropoffLocationCode,
        pickupDateTime: params.pickupDateTime,
        dropoffDateTime: params.dropoffDateTime,
        passengers: passengerCount,
        currency: 'NGN',
      };

      const response = await api.carApi.searchCarRentals(carParams);

      if (response.success && response.data?.data) {
        const processedResults = await Promise.all(response.data.data.map(async (item: any) => {
          const startDate = new Date(item.start?.dateTime);
          const endDate = new Date(item.end?.dateTime);
          const hoursDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          let rentalType = 'transfer';
          let displayType = 'Transfer';

          if (daysDiff >= 1) {
            rentalType = 'multi-day';
            displayType = 'Multi-Day Rental';
          } else if (hoursDiff > 4) {
            rentalType = 'long-transfer';
            displayType = 'Long Transfer';
          }

          const basePrice = parseFloat(item.base_price || item.original_price || item.price?.base || '0');
          const markupAmount = parseFloat(item.markup_amount) || 0;
          const conversionFee = parseFloat(item.conversion_fee) || 0;
          const taxes = 0;
          const serviceFeeFromBackend = parseFloat(item.service_fee) || 0;
          
          const totalServiceFee = calculateTotalServiceFee(markupAmount, conversionFee, taxes);
          const finalServiceFee = serviceFeeFromBackend > 0 ? serviceFeeFromBackend : totalServiceFee;
          const finalPriceNGN = parseFloat(item.final_price || item.price?.total || item.converted?.monetaryAmount || '0');
          
          let serviceFeePercentage = 0;
          if (basePrice > 0 && finalServiceFee > 0) {
            serviceFeePercentage = (finalServiceFee / basePrice) * 100;
          }

          const displayPriceInUserCurrency = await getDisplayPriceInUserCurrency(finalPriceNGN, 'NGN');
          const formattedDisplayPrice = await formatPriceInUserCurrency(finalPriceNGN, 'NGN');

          return {
            ...item,
            type: 'car-rentals' as const,
            rentalType,
            displayType,
            rentalDays: daysDiff,
            rentalHours: hoursDiff,
            requestedDays: daysDiff,
            isMultiDay: daysDiff >= 1,
            isTransfer: daysDiff < 1,
            original_amount: basePrice.toString(),
            original_currency: 'NGN',
            markup_amount: markupAmount.toString(),
            conversion_fee: conversionFee.toString(),
            taxes: taxes.toString(),
            service_fee: finalServiceFee.toString(),
            service_fee_percentage: serviceFeePercentage,
            final_amount: finalPriceNGN.toString(),
            currency: 'NGN',
            rawPrice: finalPriceNGN,
            price: formattedDisplayPrice,
            totalPrice: formattedDisplayPrice,
            displayPriceRaw: displayPriceInUserCurrency,
          };
        }));

        setSearchResults(processedResults);
        console.log(`✅ Processed ${processedResults.length} car rentals`);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Car search failed:', error);
      setSearchResults([]);
      setSearchError('Failed to search car rentals. Please try again.');
    }
  };

  // ==================== HOTEL SEARCH WITH MERGED SERVICE FEE ====================
  const searchHotels = async (params: SearchParams) => {
    try {
      const searchParamsTravellers = (params.travellers as any);
      const hotelParams = {
        cityCode: params.cityCode || 'LOS',
        checkInDate: params.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: params.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        adults: (typeof searchParamsTravellers === 'object' && searchParamsTravellers !== null) ? searchParamsTravellers.adults : (params.adults || 1),
        children: (typeof searchParamsTravellers === 'object' && searchParamsTravellers !== null) ? searchParamsTravellers.children : 0,
        roomQuantity: params.rooms || 1,
        currency: 'NGN',
      };

      const provider = params.provider || 'hotelbeds';
      const result = await api.hotelApi.searchAndTransformHotels(hotelParams, params.location || 'Lagos', provider as any);

      if (result.success && result.results) {
        const hotelsWithMarkup = await Promise.all(result.results.map(async (hotel: any) => {
          const offers = hotel.offers || [];
          
          const processedOffers = await Promise.all(offers.map(async (offer: any) => {
            const priceData = offer.price || {};
            const basePrice = parseFloat(priceData.base || '0');
            const totalPriceNGN = parseFloat(priceData.total || '0');
            const markupAmount = parseFloat(priceData.markup_amount || '0');
            const conversionFee = parseFloat(priceData.conversionFee || '0');
            const taxes = 0;
            
            const totalServiceFee = calculateTotalServiceFee(markupAmount, conversionFee, taxes);
            
            let serviceFeePercentage = 0;
            if (basePrice > 0 && totalServiceFee > 0) {
              serviceFeePercentage = (totalServiceFee / basePrice) * 100;
            }
            
            const displayPriceInUserCurrency = await getDisplayPriceInUserCurrency(totalPriceNGN, 'NGN');
            const formattedDisplayPrice = await formatPriceInUserCurrency(totalPriceNGN, 'NGN');
            
            return {
              ...offer,
              original_amount: basePrice.toString(),
              original_currency: 'NGN',
              markup_amount: markupAmount.toString(),
              conversion_fee: conversionFee.toString(),
              taxes: taxes.toString(),
              service_fee: totalServiceFee.toString(),
              service_fee_percentage: serviceFeePercentage,
              final_amount: totalPriceNGN.toString(),
              currency: 'NGN',
              rawPrice: totalPriceNGN,
              price: formattedDisplayPrice,
              totalPriceFormatted: formattedDisplayPrice,
              displayPriceRaw: displayPriceInUserCurrency,
            };
          }));
          
          const firstOffer = processedOffers[0] || {};
          
          return {
            ...hotel,
            offers: processedOffers,
            original_amount: firstOffer.original_amount,
            original_currency: 'NGN',
            markup_amount: firstOffer.markup_amount,
            conversion_fee: firstOffer.conversion_fee,
            taxes: firstOffer.taxes,
            service_fee: firstOffer.service_fee,
            service_fee_percentage: firstOffer.service_fee_percentage,
            final_amount: firstOffer.final_amount,
            currency: 'NGN',
            rawPrice: firstOffer.rawPrice,
            price: firstOffer.price,
            totalPrice: firstOffer.totalPriceFormatted,
            displayPriceRaw: firstOffer.displayPriceRaw,
          };
        }));
        
        setSearchResults(hotelsWithMarkup);
        console.log(`✅ Processed ${hotelsWithMarkup.length} hotels`);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Hotel search failed:', err);
      setSearchResults([]);
      throw new Error('Hotel search failed');
    }
  };

  const formatDateForWakanow = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // ==================== OPTIMIZED FLIGHT TRANSFORMATION WITH BATCH PROCESSING ====================
  const transformWakanowOffers = async (offers: any[], returnDate?: string, cabinClass: string = 'economy', isDomesticRoute: boolean = false): Promise<SearchResult[]> => {
    if (!offers || offers.length === 0) return [];
    
    console.log(`🔄 Batch transforming ${offers.length} Wakanow offers...`);
    const startTime = Date.now();
    
    const SERVICE_FEE_PERCENTAGE = 10;
    
    // Step 1: Batch extract all final amounts in NGN
    const allFinalAmountsNGN = offers.map(offer => {
      const originalAmountNGN = parseFloat(offer.original_amount || '0');
      const serviceFeeNGN = originalAmountNGN * (SERVICE_FEE_PERCENTAGE / 100);
      const conversionFeeNGN = parseFloat(offer.conversion_fee) || 0;
      return originalAmountNGN + serviceFeeNGN + conversionFeeNGN;
    });
    
    // Step 2: Batch convert all prices to user currency in parallel
    console.log(`🔄 Batch converting ${allFinalAmountsNGN.length} prices...`);
    const displayPricesPromises = allFinalAmountsNGN.map(async (amountNGN, idx) => {
      try {
        const displayPrice = await getDisplayPriceInUserCurrency(amountNGN, 'NGN');
        const formattedPrice = await formatPriceInUserCurrency(amountNGN, 'NGN');
        if (idx % 50 === 0) {
          setTransformingProgress(Math.floor((idx / allFinalAmountsNGN.length) * 50));
        }
        return { displayPrice, formattedPrice };
      } catch (error) {
        console.error('Failed to convert price:', error);
        return { displayPrice: amountNGN, formattedPrice: `₦${amountNGN.toLocaleString()}` };
      }
    });
    
    const displayPrices = await Promise.all(displayPricesPromises);
    console.log(`✅ Batch conversion complete in ${Date.now() - startTime}ms`);
    
    // Step 3: Process offers with pre-converted prices
    const results: SearchResult[] = [];
    let lastLogTime = Date.now();
    
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      const { displayPrice: displayPriceInUserCurrency, formattedPrice: formattedDisplayPrice } = displayPrices[i];
      
      // Update progress every 50 items or every second
      if (i % 50 === 0 || Date.now() - lastLogTime > 1000) {
        const progress = 50 + Math.floor((i / offers.length) * 50);
        setTransformingProgress(progress);
        console.log(`🔄 Processing flight ${i + 1}/${offers.length}...`);
        lastLogTime = Date.now();
      }
      
      const slices = offer.slices || [];
      const outboundSlice = slices[0];
      const returnSlice = slices.length > 1 ? slices[1] : null;
      
      if (!outboundSlice) continue;
      
      const outboundSegments = outboundSlice.segments || [];
      const firstOutboundSegment = outboundSegments[0] || {};
      const lastOutboundSegment = outboundSegments[outboundSegments.length - 1] || firstOutboundSegment;
      
      const outboundDepartureTime = outboundSlice.departure_time || firstOutboundSegment.start_time || '';
      const outboundArrivalTime = outboundSlice.arrival_time || lastOutboundSegment.end_time || '';
      
      const outboundOrigin = outboundSlice.origin?.iata_code || outboundSlice.origin || firstOutboundSegment.departure_code || '';
      const outboundDestination = outboundSlice.destination?.iata_code || outboundSlice.destination || lastOutboundSegment.destination_code || '';
      
      const outboundDuration = outboundSlice.duration || '';
      const outboundStopCount = outboundSlice.stops !== undefined ? outboundSlice.stops : (outboundSegments.length - 1);
      
      const airline = outboundSlice.airline || offer.airline || {};
      const airlineName = airline.name || offer.marketing_carrier_name || '';
      const airlineCode = airline.code || offer.marketing_carrier || '';
      const airlineLogo = airline.logo_url || `https://images.wakanow.com/Images/flight-logos/${airlineCode}.gif`;
      
      const originalAmountNGN = parseFloat(offer.original_amount || '0');
      const serviceFeeNGN = originalAmountNGN * (SERVICE_FEE_PERCENTAGE / 100);
      const conversionFeeNGN = parseFloat(offer.conversion_fee) || 0;
      const totalServiceFeeNGN = serviceFeeNGN + conversionFeeNGN;
      const finalAmountNGN = originalAmountNGN + totalServiceFeeNGN;
      
      let durationDisplay = outboundDuration;
      if (durationDisplay && durationDisplay.includes(':')) {
        const parts = durationDisplay.split(':');
        if (parts.length === 3) {
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]);
          if (hours > 0 && minutes > 0) durationDisplay = `${hours}h ${minutes}m`;
          else if (hours > 0) durationDisplay = `${hours}h`;
          else if (minutes > 0) durationDisplay = `${minutes}m`;
        }
      }
      
      let returnFlightData = null;
      
      if (returnSlice) {
        const returnSegments = returnSlice.segments || [];
        const firstReturnSegment = returnSegments[0] || {};
        const lastReturnSegment = returnSegments[returnSegments.length - 1] || firstReturnSegment;
        
        const returnFlightNumber = firstReturnSegment.flight_number || '';
        const returnAirline = returnSlice.airline || {};
        const returnAirlineName = returnAirline.name || offer.marketing_carrier_name || airlineName;
        
        let returnDurationDisplay = returnSlice.duration || '';
        if (returnDurationDisplay && returnDurationDisplay.includes(':')) {
          const parts = returnDurationDisplay.split(':');
          if (parts.length === 3) {
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            if (hours > 0 && minutes > 0) returnDurationDisplay = `${hours}h ${minutes}m`;
            else if (hours > 0) returnDurationDisplay = `${hours}h`;
            else if (minutes > 0) returnDurationDisplay = `${minutes}m`;
          }
        }
        
        returnFlightData = {
          departureAirport: returnSlice.origin?.iata_code || returnSlice.origin || '',
          arrivalAirport: returnSlice.destination?.iata_code || returnSlice.destination || '',
          departureCity: returnSlice.origin?.name || '',
          arrivalCity: returnSlice.destination?.name || '',
          departureTime: returnSlice.departure_time || firstReturnSegment.start_time || '',
          arrivalTime: returnSlice.arrival_time || lastReturnSegment.end_time || '',
          flightNumber: returnFlightNumber,
          airlineName: returnAirlineName,
          duration: returnDurationDisplay,
          stopCount: returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1),
          stopText: (returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1)) === 0 ? 'Direct' : 
                    (returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1)) === 1 ? '1 Stop' : `${returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1)} Stops`,
        };
      }
      
      const freeBaggage = outboundSlice.free_baggage || {};
      const baggageCount = freeBaggage.BagCount || 0;
      const baggageWeight = freeBaggage.Weight || 0;
      const baggageUnit = freeBaggage.WeightUnit || 'kg';
      
      const formattedTime = outboundDepartureTime ? new Date(outboundDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
      
      const flightResult: SearchResult = {
        id: offer.id || `wakanow-${results.length}`,
        provider: 'wakanow',
        title: `${airlineName} ${firstOutboundSegment.flight_number || ''}`.trim() || 'Flight',
        subtitle: `${outboundOrigin} → ${outboundDestination}`,
        price: formattedDisplayPrice,
        totalPrice: formattedDisplayPrice,
        time: formattedTime,
        duration: durationDisplay || '--:--',
        type: 'flights',
        image: airlineLogo,
        isRefundable: offer.is_refundable || false,
        baggage: `${baggageCount} bag${baggageCount !== 1 ? 's' : ''}${baggageWeight ? ` (${baggageWeight}${baggageUnit})` : ''}`,
        airlineCode: airlineCode,
        flightNumber: firstOutboundSegment.flight_number || '',
        departureAirport: outboundOrigin,
        arrivalAirport: outboundDestination,
        departureCity: outboundSlice.origin?.name || '',
        arrivalCity: outboundSlice.destination?.name || '',
        departureTime: outboundDepartureTime,
        arrivalTime: outboundArrivalTime,
        airlineName: airlineName || 'Airline',
        airlineLogo: airlineLogo,
        stopCount: outboundStopCount,
        stopText: outboundStopCount === 0 ? 'Direct' : outboundStopCount === 1 ? '1 Stop' : `${outboundStopCount} Stops`,
        cabin: cabinClass,
        displayPrice: formattedDisplayPrice,
        rawPrice: displayPriceInUserCurrency,
        original_amount: originalAmountNGN.toString(),
        original_currency: 'NGN',
        markup_amount: serviceFeeNGN.toString(),
        markup_percentage: SERVICE_FEE_PERCENTAGE,
        conversion_fee: conversionFeeNGN.toString(),
        conversion_fee_percentage: offer.conversion_fee_percentage || 0,
        taxes: '0',
        service_fee: totalServiceFeeNGN.toString(),
        service_fee_percentage: SERVICE_FEE_PERCENTAGE,
        final_amount: finalAmountNGN.toString(),
        currency: 'NGN',
        isRoundTrip: !!returnSlice,
        rating: 4,
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [
          outboundStopCount === 0 ? 'Direct' : `${outboundStopCount} stop${outboundStopCount > 1 ? 's' : ''}`,
          durationDisplay || '--:--',
          cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
        ],
        isWakanow: true,
        isWakanowDomestic: isDomesticRoute,
        selectData: offer.select_data || '',
        slices: slices,
        returnFlight: returnFlightData,
        fareRules: offer.fare_rules || [],
        penaltyRules: offer.penalty_rules || null,
        connection_code: offer.connection_code,
      };
      
      results.push(flightResult);
    }
    
    console.log(`✅ Transformed ${results.length} Wakanow flights in ${Date.now() - startTime}ms`);
    return results;
  };

  const transformDuffelOffers = async (offers: any[], cabinClass: string, offerRequestId: string): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    
    for (const offer of offers) {
      const slices = offer.slices || [];
      const outboundSlice = slices[0] || {};
      const returnSlice = slices.length > 1 ? slices[1] : null;
      
      const outboundSegments = outboundSlice.segments || [];
      const firstOutboundSegment = outboundSegments[0] || {};
      const lastOutboundSegment = outboundSegments[outboundSegments.length - 1] || firstOutboundSegment;
      
      const ownerAirline = offer.owner || {};
      const operatingCarrier = firstOutboundSegment.operating_carrier || outboundSlice.operating_carrier || {};
      const airline = ownerAirline.id ? ownerAirline : operatingCarrier;
      const airlineName = airline.name || ownerAirline.name || operatingCarrier.name || 'Unknown Airline';
      const airlineCode = airline.iata_code || airline.iataCode || operatingCarrier.iata_code || '';
      const airlineLogo = airline.logo_symbol_url || airline.logo_url || '';
      
      const flightNumber = firstOutboundSegment.marketing_carrier_flight_number || 
                           firstOutboundSegment.flight_number || 
                           firstOutboundSegment.number || '';
      
      const outboundDepartureAirport = firstOutboundSegment.origin?.iata_code || 
                                       firstOutboundSegment.departure?.iataCode || 
                                       outboundSlice.origin?.iata_code || '';
      const outboundArrivalAirport = lastOutboundSegment.destination?.iata_code || 
                                     lastOutboundSegment.arrival?.iataCode || 
                                     outboundSlice.destination?.iata_code || '';
      
      const outboundDepartureTime = firstOutboundSegment.departing_at || 
                                    firstOutboundSegment.departure?.at || 
                                    outboundSlice.departure_time || '';
      const outboundArrivalTime = lastOutboundSegment.arriving_at || 
                                  lastOutboundSegment.arrival?.at || 
                                  outboundSlice.arrival_time || '';
      
      let totalDurMin = 0;
      if (outboundSlice.duration) {
        const match = outboundSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        const hours = match?.[1] ? parseInt(match[1]) : 0;
        const minutes = match?.[2] ? parseInt(match[2]) : 0;
        totalDurMin = hours * 60 + minutes;
      }
      const h = Math.floor(totalDurMin / 60);
      const m = totalDurMin % 60;
      const durationDisplay = `${h}h ${String(m).padStart(2, '0')}m`;
      
      const basePriceOriginal = parseFloat(offer.original_amount || offer.total_amount || '0');
      const originalCurrency = offer.original_currency || offer.total_currency || 'GBP';
      const markupAmountOriginal = parseFloat(offer.markup_amount) || 0;
      const conversionFeeOriginal = parseFloat(offer.conversion_fee) || 0;
      const taxesOriginal = parseFloat(offer.tax_amount) || 0;
      const finalPriceOriginal = parseFloat(offer.final_amount) || (basePriceOriginal + markupAmountOriginal + conversionFeeOriginal + taxesOriginal);
      
      let basePriceNGN = basePriceOriginal;
      let markupAmountNGN = markupAmountOriginal;
      let conversionFeeNGN = conversionFeeOriginal;
      let taxesNGN = taxesOriginal;
      let finalPriceNGN = finalPriceOriginal;
      
      if (originalCurrency !== 'NGN') {
        try {
          basePriceNGN = await convertPrice(basePriceOriginal, originalCurrency);
          markupAmountNGN = await convertPrice(markupAmountOriginal, originalCurrency);
          conversionFeeNGN = await convertPrice(conversionFeeOriginal, originalCurrency);
          taxesNGN = await convertPrice(taxesOriginal, originalCurrency);
          finalPriceNGN = await convertPrice(finalPriceOriginal, originalCurrency);
        } catch (error) {
          console.error('Failed to convert Duffel prices to NGN:', error);
        }
      }
      
      const totalServiceFeeNGN = markupAmountNGN + conversionFeeNGN + taxesNGN;
      
      let serviceFeePercentage = 0;
      if (basePriceNGN > 0 && totalServiceFeeNGN > 0) {
        serviceFeePercentage = (totalServiceFeeNGN / basePriceNGN) * 100;
      }
      
      const displayPriceInUserCurrency = await getDisplayPriceInUserCurrency(finalPriceNGN, 'NGN');
      const formattedDisplayPrice = await formatPriceInUserCurrency(finalPriceNGN, 'NGN');
      
      const outboundStops = Math.max(0, (outboundSegments.length || 1) - 1);
      
      const formatTimeFn = (timeStr: string): string => {
        if (!timeStr) return '--:--';
        try {
          return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
          return '--:--';
        }
      };
      
      let returnFlightData = null;
      
      if (returnSlice) {
        const returnSegments = returnSlice.segments || [];
        const firstReturnSegment = returnSegments[0] || {};
        const lastReturnSegment = returnSegments[returnSegments.length - 1] || firstReturnSegment;
        
        const returnFlightNumber = firstReturnSegment.marketing_carrier_flight_number || 
                                   firstReturnSegment.flight_number || 
                                   firstReturnSegment.number || '';
        
        const returnOperatingCarrier = firstReturnSegment.operating_carrier || returnSlice.operating_carrier || {};
        const returnAirlineName = returnOperatingCarrier.name || airlineName;
        const returnAirlineCode = returnOperatingCarrier.iata_code || airlineCode;
        
        let returnDurMin = 0;
        if (returnSlice.duration) {
          const match = returnSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const hours = match?.[1] ? parseInt(match[1]) : 0;
          const minutes = match?.[2] ? parseInt(match[2]) : 0;
          returnDurMin = hours * 60 + minutes;
        }
        const returnH = Math.floor(returnDurMin / 60);
        const returnM = returnDurMin % 60;
        
        returnFlightData = {
          departureAirport: firstReturnSegment.origin?.iata_code || firstReturnSegment.departure?.iataCode || '',
          arrivalAirport: lastReturnSegment.destination?.iata_code || lastReturnSegment.arrival?.iataCode || '',
          departureCity: firstReturnSegment.origin?.city_name || firstReturnSegment.origin?.city?.name || '',
          arrivalCity: lastReturnSegment.destination?.city_name || lastReturnSegment.destination?.city?.name || '',
          departureTime: firstReturnSegment.departing_at || firstReturnSegment.departure?.at || '',
          arrivalTime: lastReturnSegment.arriving_at || lastReturnSegment.arrival?.at || '',
          flightNumber: returnFlightNumber,
          airlineName: returnAirlineName,
          airlineCode: returnAirlineCode,
          duration: returnSlice.duration,
          durationFormatted: `${returnH}h ${String(returnM).padStart(2, '0')}m`,
          stopCount: Math.max(0, (returnSegments.length || 1) - 1),
          stopText: Math.max(0, (returnSegments.length || 1) - 1) === 0 ? 'Direct' : 
                    Math.max(0, (returnSegments.length || 1) - 1) === 1 ? '1 Stop' : `${Math.max(0, (returnSegments.length || 1) - 1)} Stops`,
        };
      }
      
      const flightResult: SearchResult = {
        id: offer.id ?? `duffel-${results.length}`,
        provider: 'duffel',
        title: `${airlineName} ${flightNumber}`.trim() || 'Flight',
        subtitle: `${outboundDepartureAirport} → ${outboundArrivalAirport}`,
        price: formattedDisplayPrice,
        totalPrice: formattedDisplayPrice,
        time: formatTimeFn(outboundDepartureTime),
        duration: durationDisplay,
        type: 'flights' as const,
        image: airlineLogo || `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2`,
        isRefundable: false,
        baggage: 'Check airline policy',
        airlineCode: airlineCode,
        flightNumber: flightNumber,
        departureAirport: outboundDepartureAirport,
        arrivalAirport: outboundArrivalAirport,
        departureCity: firstOutboundSegment.origin?.city_name || outboundSlice.origin?.city_name || '',
        arrivalCity: lastOutboundSegment.destination?.city_name || outboundSlice.destination?.city_name || '',
        departureTime: outboundDepartureTime,
        arrivalTime: outboundArrivalTime,
        airlineName: airlineName,
        airlineLogo: airlineLogo,
        stopCount: outboundStops,
        stopText: outboundStops === 0 ? 'Direct' : outboundStops === 1 ? '1 Stop' : `${outboundStops} Stops`,
        cabin: cabinClass,
        displayPrice: formattedDisplayPrice,
        rawPrice: displayPriceInUserCurrency,
        original_amount: basePriceNGN.toString(),
        original_currency: 'NGN',
        markup_amount: markupAmountNGN.toString(),
        markup_percentage: offer.markup_percentage || 0,
        conversion_fee: conversionFeeNGN.toString(),
        conversion_fee_percentage: offer.conversion_fee_percentage || 0,
        taxes: taxesNGN.toString(),
        service_fee: totalServiceFeeNGN.toString(),
        service_fee_percentage: serviceFeePercentage,
        final_amount: finalPriceNGN.toString(),
        currency: 'NGN',
        isRoundTrip: !!returnSlice,
        rating: 4,
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [
          outboundStops === 0 ? 'Direct' : `${outboundStops} stop${outboundStops > 1 ? 's' : ''}`,
          durationDisplay,
          cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
        ],
        isWakanow: false,
        isWakanowDomestic: false,
        selectData: offer.id,
        slices: slices,
        returnFlight: returnFlightData,
        fareRules: [],
        penaltyRules: null,
        connection_code: '',
        offer_request_id: offerRequestId,
        offer_id: offer.id,
        _normalizedAirline: airlineName.toLowerCase().trim(),
        _normalizedDepartureTime: outboundDepartureTime,
        _normalizedArrivalAirport: outboundArrivalAirport,
      };
      
      results.push(flightResult);
    }
    
    return results;
  };

  // ==================== OPTIMIZED FLIGHT SEARCH ====================
  const searchFlights = async (params: SearchParams) => {
    if (!params.segments?.[0]?.from || !params.segments?.[0]?.to) {
      setSearchResults([]);
      return;
    }
  
    const origin = extractAirportCode(params.segments[0].from);
    const destination = extractAirportCode(params.segments[0].to);
    if (!origin || !destination) {
      setSearchResults([]);
      return;
    }
  
    const departureDate = params.segments[0].date || new Date().toISOString().split('T')[0];
    const returnDate = params.returnDate;
  
    let cabinClass = (params.cabinClass ?? 'economy').toLowerCase();
    if (!['economy', 'premium_economy', 'business', 'first'].includes(cabinClass)) cabinClass = 'economy';
  
    let adults = 1, children = 0, infants = 0;
    if (params.passengers) {
      if (typeof params.passengers === 'number') {
        adults = params.passengers;
      } else if (typeof params.passengers === 'object') {
        adults = params.passengers.adults || 0;
        children = params.passengers.children || 0;
        infants = params.passengers.infants || 0;
      }
    }
  
    const nigerianAirports = ['LOS', 'ABV', 'PHC', 'KAN', 'ENU', 'QOW', 'BNI', 'JOS', 'KAD', 'YOL'];
    const isDomestic = nigerianAirports.includes(origin) && nigerianAirports.includes(destination);
    
    const BASE = config.apiBaseUrl;
  
    // DOMESTIC flights - Fast path
    if (isDomestic && params.tripType !== 'multi-city') {
      console.log('🇳🇬 Domestic flight detected - Using Wakanow API only');
      try {
        const { wakanowService } = await import('@/lib/wakanow.service');
        
        const wakanowParams = {
          from: origin,
          to: destination,
          departureDate: formatDateForWakanow(departureDate),
          returnDate: returnDate ? formatDateForWakanow(returnDate) : undefined,
          adults,
          children,
          infants,
          cabinClass: cabinClass as 'economy' | 'premium_economy' | 'business' | 'first',
          targetCurrency: 'NGN'
        };
        
        const result = await wakanowService.searchDomesticFlights(wakanowParams);
        const offers = result.offers || result.normalizedFlights || [];
        const transformedResults = await transformWakanowOffers(offers, returnDate, cabinClass, true);
        
        // Cache results
        const cacheKey = getSearchCacheKey(params);
        searchCache.current.set(cacheKey, transformedResults);
        
        setSearchResults(transformedResults);
        return;
      } catch (error) {
        console.error('❌ Wakanow domestic search failed:', error);
        setSearchError('Domestic flight search failed. Please try again.');
        setSearchResults([]);
        return;
      }
    }
  
    // INTERNATIONAL flights - Optimized with parallel processing and faster timeout
    console.log('🌍 International flight detected - Fetching from Wakanow (Duffel optional)');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced from 30s to 15s
    
    try {
      // Start Wakanow search immediately (primary source)
      const wakanowPromise = (async () => {
        const { wakanowService } = await import('@/lib/wakanow.service');
        const wakanowParams = {
          from: origin,
          to: destination,
          departureDate: formatDateForWakanow(departureDate),
          returnDate: returnDate ? formatDateForWakanow(returnDate) : undefined,
          adults,
          children,
          infants,
          cabinClass: cabinClass as 'economy' | 'premium_economy' | 'business' | 'first',
          targetCurrency: 'NGN'
        };
        const result = await wakanowService.searchDomesticFlights(wakanowParams);
        const offers = result.offers || result.normalizedFlights || [];
        return await transformWakanowOffers(offers, returnDate, cabinClass, false);
      })();
      
      // Start Duffel search but don't wait for it (optional, non-blocking)
      const duffelPromise = (async () => {
        try {
          const requestBody: any = {
            origin,
            destination,
            departureDate,
            passengers: adults + children + infants,
            cabinClass,
            currency: 'NGN'
          };
          if (returnDate) requestBody.returnDate = returnDate;
          
          const offerRes = await fetch(`${BASE}/api/v1/bookings/search/flights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          
          if (!offerRes.ok) throw new Error(`Offer request failed: ${offerRes.status}`);
          
          const offerData = await offerRes.json();
          if (!offerData.success || !offerData.data?.offer_request_id) {
            throw new Error('No offer request ID in response');
          }
          
          const offerRequestId = offerData.data.offer_request_id;
          
          let allOffers: any[] = [];
          let cursor: string | null = null;
          let hasMore = true;
          let page = 1;
          const MAX_PAGES = 3; // Reduced from 5 to 3 for speed
          
          while (hasMore && page <= MAX_PAGES) {
            const url = new URL(`${BASE}/api/v1/bookings/offers`);
            url.searchParams.set('offer_request_id', offerRequestId);
            if (cursor) url.searchParams.set('cursor', cursor);
            
            const offersRes = await fetch(url.toString(), { signal: controller.signal });
            if (!offersRes.ok) throw new Error('List offers failed');
            
            const offersData = await offersRes.json();
            const pageOffers: any[] = offersData.data?.offers ?? offersData.data ?? offersData.offers ?? [];
            allOffers = allOffers.concat(pageOffers);
            
            hasMore = offersData.meta?.hasMore ?? false;
            cursor = offersData.meta?.nextCursor ?? null;
            page++;
          }
          
          return await transformDuffelOffers(allOffers, cabinClass, offerRequestId);
        } catch (error) {
          console.log('⚠️ Duffel search skipped (non-critical):', error instanceof Error ? error.message : 'Unknown error');
          return [];
        }
      })();
      
      // Wait for Wakanow results (primary source)
      const wakanowResults = await wakanowPromise;
      console.log(`✅ Wakanow returned ${wakanowResults.length} international flights`);
      
      // Show Wakanow results immediately
      setSearchResults(wakanowResults);
      
      // Try to get Duffel results but don't wait more than 5 seconds
      let duffelResults: SearchResult[] = [];
      try {
        const timeoutPromise = new Promise<SearchResult[]>((_, reject) => 
          setTimeout(() => reject(new Error('Duffel timeout')), 5000)
        );
        duffelResults = await Promise.race([duffelPromise, timeoutPromise]);
        console.log(`✅ Duffel returned ${duffelResults.length} international flights (optional)`);
      } catch (error) {
        console.log('⚠️ Duffel not available in time, continuing with Wakanow only');
      }
      
      clearTimeout(timeoutId);
      
      // Merge Duffel results if available (deduplication)
      let finalResults = [...wakanowResults];
      
      if (duffelResults.length > 0) {
        console.log(`🔄 Merging ${duffelResults.length} Duffel flights with ${wakanowResults.length} Wakanow flights`);
        
        const existingKeys = new Set(wakanowResults.map(f => 
          `${f.airlineCode}-${f.departureAirport}-${f.arrivalAirport}-${f.departureTime}`
        ));
        
        const newDuffelResults = duffelResults.filter(flight => {
          const key = `${flight.airlineCode}-${flight.departureAirport}-${flight.arrivalAirport}-${flight.departureTime}`;
          return !existingKeys.has(key);
        });
        
        finalResults = [...wakanowResults, ...newDuffelResults];
        finalResults.sort((a, b) => (a.rawPrice || Infinity) - (b.rawPrice || Infinity));
        
        console.log(`✅ Merged: ${finalResults.length} unique flights`);
      }
      
      // Cache final results
      const cacheKey = getSearchCacheKey(params);
      searchCache.current.set(cacheKey, finalResults);
      
      setSearchResults(finalResults);
      
      if (finalResults.length === 0 && wakanowResults.length === 0) {
        setSearchError('No flights found. Please try different dates or destinations.');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('❌ Flight search timed out');
        setSearchError('Search is taking too long. Please try again.');
      } else {
        console.error('❌ Flight search failed:', error);
        setSearchError('Failed to search flights. Please try again.');
      }
      setSearchResults([]);
    }
  };

  const selectItem = useCallback((item: SearchResult) => {
    console.log('📦 Item selected:', {
      id: item.id,
      provider: item.provider,
      type: item.type,
      final_amount_NGN: item.final_amount,
      display_price: item.price
    });
    setSelectedItem(item);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSelectedItem(null);
    setSearchParams(null);
    setAirlines([]);
    setSearchError(null);
    setSearchCompleted(false);
    setTransformingProgress(0);
    if (typeof window !== 'undefined') sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
  }, []);

  const persistSelectionForReturn = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = { selectedItem, searchParams };
      sessionStorage.setItem(BOOKING_REVIEW_SELECTION_KEY, JSON.stringify(payload));
    } catch {
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
    }
  }, [selectedItem, searchParams]);

  return (
    <SearchContext.Provider
      value={{
        searchParams,
        searchResults,
        selectedItem,
        isSearching,
        search,
        selectItem,
        clearSearch,
        persistSelectionForReturn,
        airlines,
        isLoadingAirlines,
        fetchAirlines,
        searchError,
        searchCompleted
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>');
  return ctx;
}