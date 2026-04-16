'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
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

  // Get currency and conversion functions from LanguageContext
  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();

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

  const search = useCallback(async (params: SearchParams) => {
    console.log('🔍 Search called with params:', params);
    setSearchParams(params);
    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);
    setSearchCompleted(false);

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
    }
  }, []);

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
        currency: 'GBP',
      };

      const response = await api.carApi.searchCarRentals(carParams);

      if (response.success && response.data?.data) {
        const processedResults = response.data.data.map((item: any) => {
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

          return {
            ...item,
            type: 'car-rentals' as const,
            rentalType,
            displayType,
            rentalDays: daysDiff,
            rentalHours: hoursDiff,
            requestedDays: daysDiff,
            isMultiDay: daysDiff >= 1,
            isTransfer: daysDiff < 1
          };
        });

        setSearchResults(processedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Car search failed:', error);
      setSearchResults([]);
      setSearchError('Failed to search car rentals. Please try again.');
    }
  };

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
        currency: params.currency || 'GBP',
      };

      const provider = params.provider || 'hotelbeds';
      const result = await api.hotelApi.searchAndTransformHotels(hotelParams, params.location || 'Lagos', provider as any);

      if (result.success) {
        setSearchResults(result.results);
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

  const transformWakanowOffers = async (offers: any[], returnDate?: string, cabinClass: string = 'economy', targetCurrency: string = 'GBP', isDomesticRoute: boolean = false): Promise<SearchResult[]> => {
    if (!offers || offers.length === 0) return [];
    
    const results: SearchResult[] = [];
    
    for (const offer of offers) {
      // Debug log
      console.log('💰 Raw Wakanow offer:', {
        id: offer.id,
        total_amount: offer.total_amount,
        total_currency: offer.total_currency,
        final_amount: offer.final_amount,
        currency: offer.currency,
        original_amount: offer.original_amount,
        original_currency: offer.original_currency,
      });
      
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
      
      // ========== PRICE EXTRACTION WITH REAL-TIME CONVERSION ==========
      let priceAmount = 0;
      let priceCurrency = isDomesticRoute ? 'NGN' : currency.code;
      
      if (isDomesticRoute) {
        // Domestic flights - use NGN as is
        priceAmount = parseFloat(offer.original_amount || offer.total_amount || '0');
        priceCurrency = 'NGN';
        console.log(`🏠 Domestic flight: ${airlineName} - ${priceCurrency} ${priceAmount}`);
      } else {
        // International flights - get original amount and convert to user's currency
        let originalAmount = 0;
        let originalCurrency = 'NGN';
        
        // Get original amount from offer (Wakanow returns in NGN)
        if (offer.total_amount) {
          originalAmount = parseFloat(offer.total_amount);
          originalCurrency = offer.total_currency || 'NGN';
        } else if (offer.final_amount) {
          originalAmount = parseFloat(offer.final_amount);
          originalCurrency = offer.currency || 'NGN';
        } else if (offer.original_amount) {
          originalAmount = parseFloat(offer.original_amount);
          originalCurrency = offer.original_currency || 'NGN';
        } else if (offer.price) {
          originalAmount = parseFloat(offer.price);
          originalCurrency = 'NGN';
        }
        
        if (originalAmount > 0) {
          // Use the LanguageContext's convertPrice function for real-time conversion
          priceAmount = await convertPrice(originalAmount, originalCurrency);
          priceCurrency = currency.code;
          console.log(`💱 Converted ${originalCurrency} ${originalAmount.toFixed(2)} → ${currency.code} ${priceAmount.toFixed(2)}`);
        } else {
          console.warn('⚠️ No valid price found, using fallback:', offer.id);
          priceAmount = 500;
          priceCurrency = currency.code;
        }
      }
      
      // Ensure price is valid
      if (priceAmount === 0 || isNaN(priceAmount)) {
        console.warn('⚠️ Invalid price after processing, using fallback:', offer.id);
        priceAmount = isDomesticRoute ? 50000 : 500;
        priceCurrency = isDomesticRoute ? 'NGN' : currency.code;
      }
      
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
      
      // Format the price using LanguageContext's formatPrice
      const formattedPrice = await formatPrice(priceAmount, priceCurrency);
      const sym = currency.symbol;
      
      console.log(`💰 Final price for ${airlineName}: ${formattedPrice} (${priceCurrency})`);
      
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
      
      results.push({
        id: offer.id || `wakanow-${results.length}`,
        provider: 'wakanow',
        title: `${airlineName} ${firstOutboundSegment.flight_number || ''}`.trim() || 'Flight',
        subtitle: `${outboundOrigin} → ${outboundDestination}`,
        price: formattedPrice,
        totalPrice: formattedPrice,
        time: formattedTime,
        duration: durationDisplay || '--:--',
        type: 'flights' as const,
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
        displayPrice: formattedPrice,
        rawPrice: priceAmount,
        original_amount: offer.original_amount,
        original_currency: offer.original_currency,
        final_amount: offer.final_amount,
        currency: priceCurrency,
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
      });
    }
    
    return results;
  };

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
  
    // DOMESTIC flights - Fast, uses Wakanow only
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
        const transformedResults = await transformWakanowOffers(offers, returnDate, cabinClass, 'NGN', true);
        
        console.log('✅ Wakanow domestic results:', transformedResults.length);
        setSearchResults(transformedResults);
        return;
      } catch (error) {
        console.error('❌ Wakanow domestic search failed:', error);
        setSearchError('Domestic flight search failed. Please try again.');
        setSearchResults([]);
        return;
      }
    }
  
    // INTERNATIONAL flights - Parallel fetching with enhanced deduplication
    console.log('🌍 International flight detected - Fetching from both Wakanow and Duffel');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const [wakanowPromise, duffelPromise] = await Promise.allSettled([
        // Wakanow international - using user's preferred currency
        (async () => {
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
            targetCurrency: currency.code // Use user's preferred currency from LanguageContext
          };
          const result = await wakanowService.searchDomesticFlights(wakanowParams);
          const offers = result.offers || result.normalizedFlights || [];
          return await transformWakanowOffers(offers, returnDate, cabinClass, currency.code, false);
        })(),
        
        // Duffel international
        (async () => {
          const requestBody: any = {
            origin,
            destination,
            departureDate,
            passengers: adults + children + infants,
            cabinClass,
            currency: currency.code // Use user's preferred currency
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
          const MAX_PAGES = 5;
          
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
          
          // Transform Duffel offers
          return allOffers.map((offer: any, i: number) => {
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
                                             outboundSlice.origin?.iata_code || 
                                             origin;
            const outboundArrivalAirport = lastOutboundSegment.destination?.iata_code || 
                                           lastOutboundSegment.arrival?.iataCode || 
                                           outboundSlice.destination?.iata_code || 
                                           destination;
            
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
            
            let totalPrice = parseFloat(offer.total_amount || offer.total_price || offer.amount || offer.price?.total || '0');
            let currencyCode = offer.total_currency || offer.currency || offer.price?.currency || 'GBP';
            const sym = currency.symbol;
            
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
            
            return {
              id: offer.id ?? `duffel-${i}`,
              provider: 'duffel',
              title: `${airlineName} ${flightNumber}`.trim() || 'Flight',
              subtitle: `${outboundDepartureAirport} → ${outboundArrivalAirport}`,
              price: `${sym}${totalPrice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
              totalPrice: `${sym}${totalPrice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
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
              displayPrice: `${sym}${totalPrice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
              rawPrice: totalPrice,
              original_amount: offer.original_amount,
              original_currency: offer.original_currency,
              final_amount: offer.final_amount,
              currency: currencyCode,
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
          });
        })()
      ]);
      
      clearTimeout(timeoutId);
      
      let wakanowResults: SearchResult[] = [];
      let duffelResults: SearchResult[] = [];
      
      if (wakanowPromise.status === 'fulfilled') {
        wakanowResults = wakanowPromise.value;
        console.log(`✅ Wakanow returned ${wakanowResults.length} international flights`);
      } else {
        console.error('❌ Wakanow international search failed:', wakanowPromise.reason);
      }
      
      if (duffelPromise.status === 'fulfilled') {
        duffelResults = duffelPromise.value;
        console.log(`✅ Duffel returned ${duffelResults.length} international flights`);
      } else {
        console.error('❌ Duffel search failed:', duffelPromise.reason);
      }
      
      // Deduplication logic
      console.log(`📊 Before deduplication: Wakanow=${wakanowResults.length}, Duffel=${duffelResults.length}, Total=${wakanowResults.length + duffelResults.length}`);
      
      const combinedResults = [...wakanowResults, ...duffelResults];
      const uniqueResults = new Map();
      
      const normalizeString = (str?: string) => (str || '').toUpperCase().trim();
      
      const getDateTimeKey = (timeStr?: string): string => {
        if (!timeStr) return '';
        try {
          const date = new Date(timeStr);
          return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
        } catch {
          return '';
        }
      };
      
      const getAirlineKey = (flight: any): string => {
        const airline = normalizeString(flight.airlineName || flight.airline || '');
        const airlineMap: Record<string, string> = {
          'ROYAL AIR MAROC': 'AT',
          'EGYPTAIR': 'MS',
          'BRITISH AIRWAYS': 'BA',
          'KENYA AIRWAYS': 'KQ',
          'EMIRATES AIRLINES': 'EK',
          'RWANDAIR': 'WB',
          'QATAR AIRWAYS': 'QR',
          'ETHIOPIAN AIRLINES': 'ET',
          'KLM ROYAL DUTCH AIRLINES': 'KL',
          'AIR FRANCE': 'AF',
          'VIRGIN ATLANTIC': 'VS',
          'TURKISH AIRLINES': 'TK',
          'AIR PEACE': 'P4',
        };
        return airlineMap[airline] || airline;
      };
      
      for (const flight of combinedResults) {
        const flightAny = flight as any;
        if (!flightAny.departureAirport || !flightAny.arrivalAirport) continue;
        
        const departureAirport = normalizeString(flightAny.departureAirport);
        const arrivalAirport = normalizeString(flightAny.arrivalAirport);
        const departureTimeKey = getDateTimeKey(flightAny.departureTime);
        const airlineKey = getAirlineKey(flightAny);
        
        let key = `${airlineKey}-${departureAirport}-${arrivalAirport}-${departureTimeKey}`;
        
        if (flightAny.returnFlight) {
          const returnTimeKey = getDateTimeKey(flightAny.returnFlight.departureTime);
          key = `${key}-${returnTimeKey}`;
        }
        
        if (!uniqueResults.has(key)) {
          uniqueResults.set(key, flight);
        } else {
          const existing = uniqueResults.get(key);
          const existingProvider = (existing as any).provider;
          const currentProvider = flightAny.provider;
          
          if (currentProvider === 'wakanow' && existingProvider === 'duffel') {
            console.log(`🔄 Replacing Duffel with Wakanow`);
            uniqueResults.set(key, flight);
          } else if (currentProvider === existingProvider) {
            const existingPrice = (existing as any).rawPrice || Infinity;
            const currentPrice = flightAny.rawPrice || Infinity;
            if (currentPrice < existingPrice) {
              console.log(`🔄 Replacing with cheaper ${currentProvider} flight`);
              uniqueResults.set(key, flight);
            }
          }
        }
      }
      
      const finalResults = Array.from(uniqueResults.values());
      finalResults.sort((a, b) => ((a as any).rawPrice || Infinity) - ((b as any).rawPrice || Infinity));
      
      console.log(`✅ After deduplication: ${finalResults.length} unique international flights`);
      
      if (finalResults.length === 0 && wakanowPromise.status === 'rejected' && duffelPromise.status === 'rejected') {
        setSearchError('No flights found from any provider. Please try again.');
        setSearchResults([]);
      } else {
        setSearchResults(finalResults);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('❌ International flight search timed out');
        setSearchError('Search is taking too long. Please try again.');
      } else {
        console.error('❌ International flight search failed:', error);
        setSearchError('Failed to search international flights. Please try again.');
      }
      setSearchResults([]);
    }
  };

  const selectItem = useCallback((item: SearchResult) => {
    console.log('📦 Item selected:', item);
    setSelectedItem(item);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSelectedItem(null);
    setSearchParams(null);
    setAirlines([]);
    setSearchError(null);
    setSearchCompleted(false);
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