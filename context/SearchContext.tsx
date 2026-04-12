'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { config } from '@/lib/config';
import { extractAirportCode } from '@/lib/utils';
import type { SearchParams, SearchResult } from '@/lib/types';
import type { Airline } from '@/lib/duffel-airlines';
import api from '@/lib/api';

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
  /** Save current selection to sessionStorage so it survives login redirect; call before redirecting to login from review. */
  persistSelectionForReturn: () => void;
  // Airlines data
  airlines: Airline[];
  isLoadingAirlines: boolean;
  fetchAirlines: () => Promise<void>;
  // New states for better UX
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

  // Airlines state
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoadingAirlines, setIsLoadingAirlines] = useState(false);

  // Restore selection after login redirect so user doesn't see "No Booking to Review"
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

  // Fetch airlines when needed (for flight searches)
  const fetchAirlines = useCallback(async () => {
    // Don't fetch if we already have airlines
    if (airlines.length > 0) return;

    setIsLoadingAirlines(true);
    try {
      const response = await fetch('/api/v1/airlines');
      if (response.ok) {
        const data = await response.json();
        setAirlines(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching airlines:', error);
    } finally {
      setIsLoadingAirlines(false);
    }
  }, [airlines.length]);

  // Automatically fetch airlines when searching for flights
  useEffect(() => {
    if (searchParams?.type === 'flights') {
      fetchAirlines();
    }
  }, [searchParams?.type, fetchAirlines]);

  // ── Unified search across all product types ───────
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
      // Only use mock data on error
      const mockKey = params.type === 'cars' ? 'car-rentals' : params.type;
      setSearchResults(MOCK[mockKey] ?? []);
    } finally {
      setIsSearching(false);
      setSearchCompleted(true);
    }
  }, []);

  const searchCars = async (params: SearchParams) => {
    try {
      // ✅ Validate that we have all required parameters
      if (!params.pickupLocationCode || !params.dropoffLocationCode ||
        !params.pickupDateTime || !params.dropoffDateTime) {
        console.error('❌ Missing required car rental parameters:', {
          pickupLocationCode: params.pickupLocationCode,
          dropoffLocationCode: params.dropoffLocationCode,
          pickupDateTime: params.pickupDateTime,
          dropoffDateTime: params.dropoffDateTime
        });
        setSearchResults([]);
        setSearchError('Missing location or date information. Please try again.');
        return;
      }

      // ✅ Extract passenger count correctly
      let passengerCount = 2; // Default

      if (params.passengers) {
        if (typeof params.passengers === 'number') {
          passengerCount = params.passengers;
        } else if (typeof params.passengers === 'object') {
          // For flights with adults/children/infants, sum them up
          passengerCount = (params.passengers.adults || 0) +
            (params.passengers.children || 0) +
            (params.passengers.infants || 0);
          // Ensure at least 1 passenger
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

      console.log('🚗 Searching car rentals with EXACT params from form:', carParams);

      const response = await api.carApi.searchCarRentals(carParams);

      if (response.success && response.data?.data) {
        // Calculate requested duration for logging
        const requestedPickup = new Date(params.pickupDateTime);
        const requestedDropoff = new Date(params.dropoffDateTime);
        const requestedDays = Math.ceil((requestedDropoff.getTime() - requestedPickup.getTime()) / (1000 * 60 * 60 * 24));

        console.log('📅 Requested duration:', requestedDays, 'days');

        // Process each offer to determine if it's a transfer or multi-day rental
        const processedResults = response.data.data.map((item: any) => {
          const startDate = new Date(item.start?.dateTime);
          const endDate = new Date(item.end?.dateTime);
          const hoursDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          // Determine the type
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
            requestedDays,
            isMultiDay: daysDiff >= 1,
            isTransfer: daysDiff < 1
          };
        });

        console.log(`✅ Found ${processedResults.length} total offers`);
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

  // ── Hotel search ──────────────────────────────────
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

  // Helper function to transform Wakanow results with domestic flag
  const transformWakanowResults = (normalizedFlights: any[], selectData: string, returnDate?: string, cabinClass: string = 'economy', targetCurrency: string = 'GBP', isDomesticRoute: boolean = false) => {
    return normalizedFlights.map((flight, idx) => {
      const sym = targetCurrency === 'GBP' ? '£' : targetCurrency === 'NGN' ? '₦' : '$';
      
      let durationDisplay = flight.duration;
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
      
      // Get return flight details if available
      let returnFlightData = null;
      if (flight.returnFlightDetails) {
        returnFlightData = {
          departureAirport: flight.returnFlightDetails.departure.code,
          arrivalAirport: flight.returnFlightDetails.arrival.code,
          departureCity: flight.returnFlightDetails.departure.name,
          arrivalCity: flight.returnFlightDetails.arrival.name,
          departureTime: flight.returnFlightDetails.departure.time,
          arrivalTime: flight.returnFlightDetails.arrival.time,
          flightNumber: flight.returnFlightDetails.flightNumber,
          duration: flight.returnFlightDetails.duration,
          stopCount: flight.returnFlightDetails.stops,
          stopText: flight.returnFlightDetails.stops === 0 ? 'Direct' : 
                    flight.returnFlightDetails.stops === 1 ? '1 Stop' : `${flight.returnFlightDetails.stops} Stops`,
        };
      } else if (flight.returnLegs && flight.returnLegs.length > 0) {
        const firstReturnLeg = flight.returnLegs[0];
        const lastReturnLeg = flight.returnLegs[flight.returnLegs.length - 1];
        
        let returnDurationDisplay = firstReturnLeg.duration || '';
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
          departureAirport: firstReturnLeg.from || '',
          arrivalAirport: lastReturnLeg.to || '',
          departureCity: firstReturnLeg.fromName || '',
          arrivalCity: lastReturnLeg.toName || '',
          departureTime: firstReturnLeg.departureTime || '',
          arrivalTime: lastReturnLeg.arrivalTime || '',
          flightNumber: firstReturnLeg.flightNumber || '',
          duration: returnDurationDisplay,
          stopCount: (flight.returnLegs.length || 1) - 1,
          stopText: (flight.returnLegs.length || 1) - 1 === 0 ? 'Direct' : 
                    (flight.returnLegs.length || 1) - 1 === 1 ? '1 Stop' : `${(flight.returnLegs.length || 1) - 1} Stops`,
        };
      }
      
      // Get outbound leg details
      let arrivalAirportCode = flight.arrival.code;
      let arrivalAirportName = flight.arrival.name;
      let outboundDuration = durationDisplay;
      let outboundStopCount = flight.stops;
      
      if (flight.outboundLegs && flight.outboundLegs.length > 0) {
        const lastOutboundLeg = flight.outboundLegs[flight.outboundLegs.length - 1];
        arrivalAirportCode = lastOutboundLeg.to || flight.arrival.code;
        arrivalAirportName = lastOutboundLeg.toName || flight.arrival.name;
        
        let totalMinutes = 0;
        flight.outboundLegs.forEach((leg: any) => {
          const dur = leg.duration || '';
          if (dur.includes(':')) {
            const parts = dur.split(':');
            if (parts.length === 3) {
              totalMinutes += parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
          }
        });
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        outboundDuration = `${hours}h ${minutes}m`;
        outboundStopCount = (flight.outboundLegs.length || 1) - 1;
      }
      
      // Calculate price
      let priceAmount = flight.price.amount;
      let priceCurrency = flight.price.currency;
      
      if (targetCurrency === 'GBP' && priceCurrency === 'NGN') {
        priceAmount = Math.round(priceAmount / 2500);
        priceCurrency = 'GBP';
      }
      
      const formattedPrice = priceAmount.toLocaleString('en-GB', { maximumFractionDigits: 0 });
      
      return {
        id: flight.id,
        provider: 'wakanow',
        title: `${flight.airline} ${flight.flightNumber}`,
        subtitle: `${flight.departure.code} → ${arrivalAirportCode}`,
        price: targetCurrency === 'GBP' ? `£${formattedPrice}` : `₦${formattedPrice}`,
        totalPrice: targetCurrency === 'GBP' ? `£${formattedPrice}` : `₦${formattedPrice}`,
        time: new Date(flight.departure.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        duration: outboundDuration,
        type: 'flights' as const,
        image: flight.airlineLogo || `https://ui-avatars.com/api/?name=${flight.airlineCode || flight.airline}&background=33a8da&color=fff&length=2`,
        isRefundable: flight.isRefundable,
        baggage: `${flight.baggage.count} bag${flight.baggage.count !== 1 ? 's' : ''}${flight.baggage.weight ? ` (${flight.baggage.weight}${flight.baggage.unit || 'kg'})` : ''}`,
        airlineCode: flight.airlineCode,
        flightNumber: flight.flightNumber,
        departureAirport: flight.departure.code,
        arrivalAirport: arrivalAirportCode,
        departureCity: flight.departure.name,
        arrivalCity: arrivalAirportName,
        departureTime: flight.departure.time,
        arrivalTime: flight.arrival.time,
        airlineName: flight.airline,
        airlineLogo: flight.airlineLogo,
        stopCount: outboundStopCount,
        stopText: outboundStopCount === 0 ? 'Direct' : outboundStopCount === 1 ? '1 Stop' : `${outboundStopCount} Stops`,
        cabin: cabinClass,
        displayPrice: targetCurrency === 'GBP' ? `£${formattedPrice}` : `₦${formattedPrice}`,
        rawPrice: priceAmount,
        original_amount: flight.price.amount.toString(),
        original_currency: flight.price.currency,
        final_amount: priceAmount.toString(),
        currency: priceCurrency,
        isRoundTrip: !!returnDate && !!returnFlightData,
        rating: 4,
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [
          outboundStopCount === 0 ? 'Direct' : `${outboundStopCount} stop${outboundStopCount > 1 ? 's' : ''}`,
          outboundDuration,
          cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
        ],
        isWakanow: true,
        isWakanowDomestic: isDomesticRoute,
        selectData: selectData,
        legs: flight.legs,
        outboundLegs: flight.outboundLegs,
        returnLegs: flight.returnLegs,
        returnFlight: returnFlightData,
        fareRules: flight.fareRules,
        penaltyRules: flight.penaltyRules,
      };
    });
  };

  // ── Flight search (Wakanow for domestic, both for international) ──
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

    let passengerCount = 1;
    let adults = 1, children = 0, infants = 0;
    if (params.passengers) {
      if (typeof params.passengers === 'number') {
        passengerCount = params.passengers;
        adults = params.passengers;
      } else if (typeof params.passengers === 'object') {
        adults = params.passengers.adults || 0;
        children = params.passengers.children || 0;
        infants = params.passengers.infants || 0;
        passengerCount = adults + children + infants;
      }
    }
    passengerCount = Math.max(1, Math.min(9, passengerCount));

    // Check if this is a domestic Nigerian route
    const nigerianAirports = ['LOS', 'ABV', 'PHC', 'KAN', 'ENU', 'QOW', 'BNI', 'JOS', 'KAD', 'YOL'];
    const isDomestic = nigerianAirports.includes(origin) && nigerianAirports.includes(destination);
    
    const BASE = config.apiBaseUrl;

    // For DOMESTIC routes: Use ONLY Wakanow
    if (isDomestic && params.tripType !== 'multi-city') {
      console.log('🇳🇬 Domestic flight detected - Using Wakanow API only');
      try {
        const { wakanowService } = await import('@/lib/wakanow.service');
        
        const wakanowParams = {
          from: origin,
          to: destination,
          departureDate: new Date(departureDate),
          returnDate: returnDate ? new Date(returnDate) : undefined,
          adults,
          children,
          infants,
          cabinClass: cabinClass as 'economy' | 'premium_economy' | 'business' | 'first',
          targetCurrency: params.currency || 'NGN'
        };
        
        const result = await wakanowService.searchDomesticFlights(wakanowParams);
        const transformedResults = transformWakanowResults(result.normalizedFlights, result.selectData, returnDate, cabinClass, 'NGN', true);
        
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

    // For INTERNATIONAL routes: Fetch from BOTH Wakanow AND Duffel
    console.log('🌍 International flight detected - Fetching from both Wakanow and Duffel');
    
    let wakanowResults: SearchResult[] = [];
    let duffelResults: SearchResult[] = [];
    let wakanowError = null;
    let duffelError = null;

    // 1. Fetch from Wakanow (international) - use GBP currency, NOT domestic
    try {
      console.log('🌍 Fetching from Wakanow for international route...');
      const { wakanowService } = await import('@/lib/wakanow.service');
      const wakanowParams = {
        from: origin,
        to: destination,
        departureDate: new Date(departureDate),
        returnDate: returnDate ? new Date(returnDate) : undefined,
        adults,
        children,
        infants,
        cabinClass: cabinClass as 'economy' | 'premium_economy' | 'business' | 'first',
        targetCurrency: 'GBP'
      };
      const wakanowResult = await wakanowService.searchDomesticFlights(wakanowParams);
      wakanowResults = transformWakanowResults(wakanowResult.normalizedFlights, wakanowResult.selectData, returnDate, cabinClass, 'GBP', false);
      console.log(`✅ Wakanow returned ${wakanowResults.length} international flights`);
    } catch (error) {
      console.error('❌ Wakanow international search failed:', error);
      wakanowError = error;
    }

    // 2. Fetch from Duffel (existing API - UNCHANGED)
    try {
      console.log('🌍 Fetching from Duffel for international route...');
      const requestBody: any = {
        origin,
        destination,
        departureDate,
        passengers: passengerCount,
        cabinClass,
        currency: 'GBP'
      };
      if (returnDate) requestBody.returnDate = returnDate;

      console.log('📤 Sending flight search request:', JSON.stringify(requestBody, null, 2));

      const offerRes = await fetch(`${BASE}/api/v1/bookings/search/flights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', offerRes.status);
      const responseText = await offerRes.text();
      console.log('📥 Response text:', responseText);

      if (!offerRes.ok) {
        console.error('❌ Offer request failed with status:', offerRes.status);
        console.error('❌ Response body:', responseText);
        throw new Error(`Offer request failed: ${offerRes.status} ${responseText}`);
      }

      let offerData;
      try {
        offerData = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse response as JSON:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      if (!offerData.success || !offerData.data?.offer_request_id) {
        console.error('❌ Invalid response structure:', offerData);
        throw new Error('No offer request ID in response');
      }

      const offerRequestId = offerData.data.offer_request_id;

      // Paginated fetch of all offers
      console.log('📤 Fetching offers for request ID:', offerRequestId);
      let allOffers: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      let page = 1;
      const MAX_PAGES = 10;

      while (hasMore && page <= MAX_PAGES) {
        const url = new URL(`${BASE}/api/v1/bookings/offers`);
        url.searchParams.set('offer_request_id', offerRequestId);
        if (cursor) {
          url.searchParams.set('cursor', cursor);
        }

        console.log(`📤 Fetching offers page ${page}...`);
        const offersRes = await fetch(url.toString());

        if (!offersRes.ok) {
          const offersText = await offersRes.text();
          console.error(`❌ List offers failed (page ${page}):`, offersRes.status, offersText);
          throw new Error('List offers failed');
        }

        const offersData = await offersRes.json();
        console.log(`📥 Page ${page} response:`, offersData);

        const pageOffers: any[] = offersData.data?.offers ?? offersData.data ?? offersData.offers ?? [];
        allOffers = allOffers.concat(pageOffers);

        hasMore = offersData.meta?.hasMore ?? false;
        cursor = offersData.meta?.nextCursor ?? null;

        page++;
      }

      console.log(`✅ Total offers after pagination: ${allOffers.length}`);

      if (allOffers.length === 0) {
        console.log('⚠️ No offers found from Duffel');
      } else {
        // Transform all offers
        duffelResults = allOffers.map((offer: any, i: number) => {
          const slices = offer.slices ?? offer.segments ?? [];
          const isRoundTrip = slices.length > 1;
          
          const outboundSlice = slices[0] ?? {};
          const outboundSegments = outboundSlice.segments ?? [];
          
          const outboundFirstSegment = outboundSegments[0] ?? {};
          const outboundLastSegment = outboundSegments[outboundSegments.length - 1] ?? outboundFirstSegment;

          const ownerAirline = offer.owner;
          const operatingCarrier = outboundFirstSegment.operating_carrier || outboundSlice.operating_carrier;
          const airline = ownerAirline || operatingCarrier;
          const airlineName = airline?.name ?? 'Unknown Airline';
          const airlineCode = airline?.iata_code ?? airline?.iataCode ?? '';
          const airlineLogoUrl = airline?.logo_symbol_url ?? '';

          const outboundFlightNumber = outboundFirstSegment.marketing_carrier_flight_number || 
                                       outboundFirstSegment.flight_number || 
                                       outboundFirstSegment.number ||
                                       `FL${1000 + i}`;

          const outboundDepartureAirport = outboundFirstSegment.origin?.iata_code ?? 
                                          outboundFirstSegment.departure?.iataCode ?? 
                                          outboundSlice.origin?.iata_code ?? 
                                          origin;
          
          const outboundArrivalAirport = outboundLastSegment.destination?.iata_code ?? 
                                        outboundLastSegment.arrival?.iataCode ?? 
                                        outboundSlice.destination?.iata_code ?? 
                                        destination;

          const outboundDepartureCity = outboundFirstSegment.origin?.city_name || 
                                      outboundFirstSegment.origin?.city?.name || 
                                      outboundSlice.origin?.city_name || '';
          
          const outboundArrivalCity = outboundLastSegment.destination?.city_name || 
                                    outboundLastSegment.destination?.city?.name || 
                                    outboundSlice.destination?.city_name || '';

          const outboundDepartureTime = outboundFirstSegment.departing_at ?? 
                                      outboundFirstSegment.departure?.at ?? 
                                      outboundSlice.departure_time ?? '';
          
          const outboundArrivalTime = outboundLastSegment.arriving_at ?? 
                                    outboundLastSegment.arrival?.at ?? 
                                    outboundSlice.arrival_time ?? '';

          let totalPrice = parseFloat(offer.total_amount ?? offer.total_price ?? offer.amount ?? offer.price?.total ?? '85');
          let currency = offer.total_currency ?? offer.currency ?? offer.price?.currency ?? 'GBP';
          const sym = currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : currency === 'EUR' ? '€' : '$';

          let totalDurMin = 0;
          if (outboundSlice.duration) {
            const match = outboundSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            const hours = match?.[1] ? parseInt(match[1]) : 0;
            const minutes = match?.[2] ? parseInt(match[2]) : 0;
            totalDurMin = hours * 60 + minutes;
          }
          const h = Math.floor(totalDurMin / 60);
          const m = totalDurMin % 60;

          const outboundStops = Math.max(0, (outboundSegments.length || 1) - 1);

          const passengerData = outboundFirstSegment.passengers?.[0] || {};
          const baggages = passengerData.baggages || [];

          const ownerObject = airline ? {
            id: airline.id,
            name: airlineName,
            iata_code: airlineCode,
            logo_symbol_url: airlineLogoUrl
          } : undefined;

          const formatTime = (timeStr: string): string => {
            try {
              return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            } catch {
              return '--:--';
            }
          };

          return {
            id: offer.id ?? `flight-${i}`,
            provider: 'duffel',
            title: `${airlineName} ${outboundFlightNumber}`,
            subtitle: `${outboundDepartureAirport} → ${outboundArrivalAirport}`,
            price: `${sym}${totalPrice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
            totalPrice: `${sym}${totalPrice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
            time: formatTime(outboundDepartureTime),
            duration: `${h}h ${String(m).padStart(2, '0')}m`,
            rating: 4 + Math.random(),
            image: airlineLogoUrl || `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2`,
            amenities: ['Seat Selection', 'Cabin Baggage'],
            features: [
              outboundStops === 0 ? 'Direct' : `${outboundStops} stop${outboundStops > 1 ? 's' : ''}`,
              `${h}h ${m}m`,
              cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
            ],
            type: 'flights' as const,
            owner: ownerObject,
            airlineCode,
            final_amount: offer.final_amount,
            currency: offer.currency,
            original_amount: offer.original_amount,
            original_currency: offer.original_currency,
            conversion_fee: offer.conversion_fee,
            markup_percentage: offer.markup_percentage,
            markup_amount: offer.markup_amount,
            service_fee: offer.service_fee,
            base_amount: offer.base_amount,
            base_currency: offer.base_currency,
            tax_amount: offer.tax_amount,
            tax_currency: offer.tax_currency,
            total_amount: offer.total_amount,
            total_currency: offer.total_currency,
            slices: slices,
            departureAirport: outboundDepartureAirport,
            arrivalAirport: outboundArrivalAirport,
            departureCity: outboundDepartureCity,
            arrivalCity: outboundArrivalCity,
            departureTime: outboundDepartureTime,
            arrivalTime: outboundArrivalTime,
            airlineName,
            airlineLogo: airlineLogoUrl,
            flightNumber: outboundFlightNumber,
            stopCount: outboundStops,
            stopText: outboundStops === 0 ? 'Direct' : `${outboundStops} stop${outboundStops > 1 ? 's' : ''}`,
            cabin: cabinClass,
            baggage: baggages,
            displayPrice: `${sym}${totalPrice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
            rawPrice: totalPrice,
            isRoundTrip,
            returnFlight: isRoundTrip && slices[1] ? (() => {
              const returnSlice = slices[1];
              const returnSegments = returnSlice.segments ?? [];
              const returnFirstSegment = returnSegments[0] ?? {};
              const returnLastSegment = returnSegments[returnSegments.length - 1] ?? returnFirstSegment;
              
              let returnDurMin = 0;
              if (returnSlice.duration) {
                const match = returnSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                const hours = match?.[1] ? parseInt(match[1]) : 0;
                const minutes = match?.[2] ? parseInt(match[2]) : 0;
                returnDurMin = hours * 60 + minutes;
              }
              const returnH = Math.floor(returnDurMin / 60);
              const returnM = returnDurMin % 60;
              
              return {
                departureAirport: returnFirstSegment.origin?.iata_code ?? returnFirstSegment.departure?.iataCode,
                arrivalAirport: returnLastSegment.destination?.iata_code ?? returnLastSegment.arrival?.iataCode,
                departureCity: returnFirstSegment.origin?.city_name || returnFirstSegment.origin?.city?.name,
                arrivalCity: returnLastSegment.destination?.city_name || returnLastSegment.destination?.city?.name,
                departureTime: returnFirstSegment.departing_at ?? returnFirstSegment.departure?.at,
                arrivalTime: returnLastSegment.arriving_at ?? returnLastSegment.arrival?.at,
                flightNumber: returnFirstSegment.marketing_carrier_flight_number || returnFirstSegment.flight_number,
                duration: returnSlice.duration,
                durationFormatted: `${returnH}h ${String(returnM).padStart(2, '0')}m`,
                stopCount: Math.max(0, (returnSegments.length || 1) - 1)
              };
            })() : null,
            formatTime,
            offer_request_id: offerRequestId,
            offer_id: offer.id,
            payment_requirements: offer.payment_requirements,
            created_at: offer.created_at,
            updated_at: offer.updated_at,
            expires_at: offer.expires_at,
            conditions: offer.conditions,
          };
        });
        
        console.log(`✅ Duffel returned ${duffelResults.length} international flights`);
      }
    } catch (error) {
      console.error('❌ Duffel search failed:', error);
      duffelError = error;
    }

       // 3. Enhanced deduplication for combined results
       console.log(`📊 Before deduplication: Wakanow=${wakanowResults.length}, Duffel=${duffelResults.length}, Total=${wakanowResults.length + duffelResults.length}`);
    
       const combinedResults = [...wakanowResults, ...duffelResults];
       const uniqueResults = new Map();
       
       // Helper function to get cabin priority
       const getCabinPriority = (cabin?: string): number => {
         const cabinMap: Record<string, number> = {
           'first': 4,
           'business': 3,
           'premium_economy': 2,
           'economy': 1
         };
         return cabinMap[cabin?.toLowerCase() || 'economy'] || 1;
       };
       
       // Helper function to check if times are close (within 2 hours)
       const isTimeClose = (time1?: string, time2?: string): boolean => {
         if (!time1 || !time2) return false;
         try {
           const t1 = new Date(time1).getTime();
           const t2 = new Date(time2).getTime();
           const diffMinutes = Math.abs(t1 - t2) / (1000 * 60);
           return diffMinutes <= 120; // Within 2 hours
         } catch {
           return false;
         }
       };
       
       for (const flight of combinedResults) {
         // Cast to any to access extended properties
         const flightAny = flight as any;
         
         // Normalize strings for comparison
         const normalizeString = (str?: string) => (str || '').toUpperCase().trim();
         
         const airlineCode = normalizeString(flightAny.airlineCode);
         const flightNumber = normalizeString(flightAny.flightNumber);
         const departureTime = flightAny.departureTime || '';
         const arrivalTime = flightAny.arrivalTime || '';
         const departureAirport = normalizeString(flightAny.departureAirport);
         const arrivalAirport = normalizeString(flightAny.arrivalAirport);
         
         // Create multiple keys for different matching strategies
         // Primary key: Airline + Flight Number + Departure Time + Arrival Airport
         const primaryKey = `${airlineCode}-${flightNumber}-${departureTime}-${arrivalAirport}`;
         
         // Secondary key: Airline + Departure/Arrival airports + close departure time
         let secondaryKey = null;
         for (const [existingKey, existingFlight] of uniqueResults.entries()) {
           const existingAny = existingFlight as any;
           const existingDepartureTime = existingAny.departureTime || '';
           const existingArrivalAirport = normalizeString(existingAny.arrivalAirport);
           const existingAirlineCode = normalizeString(existingAny.airlineCode);
           
           // Check if this might be the same flight with different flight numbers
           if (existingAirlineCode === airlineCode &&
               existingArrivalAirport === arrivalAirport &&
               isTimeClose(existingDepartureTime, departureTime)) {
             secondaryKey = existingKey;
             break;
           }
         }
         
         // Use primary key or secondary key if found
         let key = primaryKey;
         let foundDuplicate = uniqueResults.has(primaryKey);
         
         if (!foundDuplicate && secondaryKey && uniqueResults.has(secondaryKey)) {
           key = secondaryKey;
           foundDuplicate = true;
         }
         
         if (!foundDuplicate) {
           // New unique flight
           uniqueResults.set(key, flight);
         } else {
           // Duplicate found - keep the better option
           const existing = uniqueResults.get(key);
           const existingAny = existing as any;
           const existingPrice = existingAny.rawPrice || Infinity;
           const currentPrice = flightAny.rawPrice || Infinity;
           
           const existingCabinPriority = getCabinPriority(existingAny.cabin);
           const currentCabinPriority = getCabinPriority(flightAny.cabin);
           
           const existingStops = existingAny.stopCount || 0;
           const currentStops = flightAny.stopCount || 0;
           
           let shouldReplace = false;
           let reason = '';
           
           if (currentPrice < existingPrice - 10) {
             shouldReplace = true;
             reason = `cheaper price (${existingAny.displayPrice} → ${flightAny.displayPrice})`;
           } else if (Math.abs(currentPrice - existingPrice) <= 10 && currentCabinPriority > existingCabinPriority) {
             shouldReplace = true;
             reason = `better cabin (${existingAny.cabin} → ${flightAny.cabin})`;
           } else if (Math.abs(currentPrice - existingPrice) <= 10 && 
                      currentCabinPriority === existingCabinPriority && 
                      currentStops < existingStops) {
             shouldReplace = true;
             reason = `fewer stops (${existingStops} → ${currentStops})`;
           }
           
           if (shouldReplace) {
             console.log(`🔄 Replacing duplicate flight: ${reason}`);
             uniqueResults.set(key, flight);
           } else {
             const keptProvider = existingAny.provider;
             const duplicateProvider = flightAny.provider;
             console.log(`📌 Keeping ${keptProvider} flight, discarding ${duplicateProvider} duplicate`);
           }
         }
       }
       
       const finalResults = Array.from(uniqueResults.values());
       finalResults.sort((a, b) => {
         const aAny = a as any;
         const bAny = b as any;
         return (aAny.rawPrice || Infinity) - (bAny.rawPrice || Infinity);
       });
       
       console.log(`✅ After enhanced deduplication: ${finalResults.length} unique international flights`);
       console.log(`📊 Final breakdown by provider:`, {
         wakanow: finalResults.filter(f => (f as any).isWakanow).length,
         duffel: finalResults.filter(f => !(f as any).isWakanow).length
       });
       
       if (finalResults.length === 0 && wakanowError && duffelError) {
         setSearchError('No flights found from any provider. Please try again.');
         setSearchResults([]);
       } else {
         setSearchResults(finalResults);
       }
  };

  const selectItem = useCallback((item: SearchResult) => {
    console.log('📦 Item selected:', {
      id: item.id,
      provider: item.provider,
      isWakanow: (item as any).isWakanow,
      isWakanowDomestic: (item as any).isWakanowDomestic,
      original_amount: (item as any).original_amount,
      final_amount: (item as any).final_amount,
      hasReturnFlight: !!(item as any).returnFlight
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