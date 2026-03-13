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
        passengers: passengerCount, // ✅ Now it's definitely a number
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

        console.log(`✅ Found ${processedResults.length} total offers:`,
          processedResults.map(r => ({
            id: r.id,
            type: r.rentalType,
            start: r.start?.dateTime,
            end: r.end?.dateTime,
            days: r.rentalDays,
            hours: r.rentalHours
          }))
        );

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

      const provider = params.provider || 'hotelbeds'; // Default to hotelbeds as requested
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

  // ── Flight search (two-step Duffel) ───────────────
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
    const returnDate = params.returnDate; // Get return date from params

    let cabinClass = (params.cabinClass ?? 'economy').toLowerCase();
    if (!['economy', 'premium_economy', 'business', 'first'].includes(cabinClass)) cabinClass = 'economy';

    // Handle passengers correctly - could be number or object
    let passengerCount = 1;
    if (params.passengers) {
      if (typeof params.passengers === 'number') {
        passengerCount = params.passengers;
      } else if (typeof params.passengers === 'object') {
        passengerCount = (params.passengers.adults || 0) +
          (params.passengers.children || 0) +
          (params.passengers.infants || 0);
      }
    }
    passengerCount = Math.max(1, Math.min(9, passengerCount));

    const BASE = config.apiBaseUrl;

    try {
      // Step 1 – Create offer request
      const requestBody: any = {
        origin,
        destination,
        departureDate,
        passengers: passengerCount,
        cabinClass,
        currency: 'GBP'
      };

      // Add return date for round trips
      if (returnDate) {
        requestBody.returnDate = returnDate;
      }

      console.log('📤 Sending flight search request:', JSON.stringify(requestBody, null, 2));

      const offerRes = await fetch(`${BASE}/api/v1/bookings/search/flights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Log the response status and text for debugging
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

      // Step 2 – List offers
      console.log('📤 Fetching offers for request ID:', offerRequestId);
      const offersRes = await fetch(`${BASE}/api/v1/bookings/offers?offer_request_id=${offerRequestId}`);

      if (!offersRes.ok) {
        const offersText = await offersRes.text();
        console.error('❌ List offers failed:', offersRes.status, offersText);
        throw new Error('List offers failed');
      }

      const offersData = await offersRes.json();
      console.log('📥 Offers response:', offersData);

      let offers: any[] = offersData.data?.offers ?? offersData.data ?? offersData.offers ?? [];

      if (offers.length === 0) {
        console.log('⚠️ No offers found');
        setSearchResults([]);
        return;
      }

      console.log('✅ Received offers:', offers.length);
      console.log('Sample offer slices count:', offers[0]?.slices?.length);

      // Transform offers with proper logo handling and ALL price fields
      const transformed: SearchResult[] = offers.map((offer: any, i: number) => {
        const slices = offer.slices ?? offer.segments ?? [];
        const firstSlice = slices[0] ?? {};
        const firstSegment = firstSlice.segments?.[0] ?? {};
        const lastSlice = slices[slices.length - 1] ?? {};
        const lastSegment = lastSlice.segments?.[lastSlice.segments?.length - 1] ?? {};

        // Get airline information from the offer owner (primary airline)
        const ownerAirline = offer.owner;
        const operatingCarrier = firstSegment.operating_carrier || firstSlice.operating_carrier;

        // Use owner airline as primary, fallback to operating carrier
        const airline = ownerAirline || operatingCarrier;
        const airlineName = airline?.name ?? 'Unknown Airline';
        const airlineCode = airline?.iata_code ?? '';
        const airlineLogoUrl = airline?.logo_symbol_url ?? '';

        const flightNumber = firstSegment.flight_number ?? `FL${1000 + i}`;

        let totalPrice = offer.total_amount ?? offer.total_price ?? offer.amount ?? offer.price?.total ?? 85;
        let currency = offer.total_currency ?? offer.currency ?? offer.price?.currency ?? 'GBP';

        // Calculate total duration across all slices
        let totalDurMin = 0;
        slices.forEach((slice: any) => {
          if (slice.duration) {
            const match = slice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            const hours = match?.[1] ? parseInt(match[1]) : 0;
            const minutes = match?.[2] ? parseInt(match[2]) : 0;
            totalDurMin += hours * 60 + minutes;
          }
        });

        const h = Math.floor(totalDurMin / 60);
        const m = totalDurMin % 60;

        // Count total stops across all slices
        const totalStops = slices.reduce((acc: number, slice: any) =>
          acc + Math.max(0, (slice.segments?.length || 1) - 1), 0);

        let timeDisplay = '08:00';
        const dep = firstSegment.departing_at ?? firstSlice.departure_time;
        if (dep) {
          try {
            timeDisplay = new Date(dep).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          } catch { /* */ }
        }

        const sym = currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : currency === 'EUR' ? '€' : '$';
        const flightOrigin = firstSegment.origin?.iata_code ?? firstSlice.origin?.iata_code ?? origin;
        const flightDest = lastSegment.destination?.iata_code ?? lastSlice.destination?.iata_code ?? destination;

        // Create a complete owner object with logo
        const ownerObject = airline ? {
          id: airline.id,
          name: airlineName,
          iata_code: airlineCode,
          logo_symbol_url: airlineLogoUrl
        } : undefined;

        // Format slices properly with all required fields
        const formattedSlices = slices.map((slice: any) => ({
          ...slice,
          segments: slice.segments?.map((segment: any) => ({
            ...segment,
            origin: segment.origin || { iata_code: flightOrigin },
            destination: segment.destination || { iata_code: flightDest },
            operating_carrier: segment.operating_carrier || airline,
            flight_number: segment.flight_number || flightNumber,
            departing_at: segment.departing_at || dep,
            arriving_at: segment.arriving_at || lastSegment.arriving_at
          })) || []
        }));

        // Create the result object with all properties - NO DUPLICATES
        const result: any = {
          // Required BaseSearchResult fields
          id: offer.id ?? `flight-${i}`,
          provider: airlineName,
          title: `${airlineName} ${flightNumber}`,
          subtitle: `${flightOrigin} → ${flightDest}`,
          price: `${sym}${Number(totalPrice).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
          time: timeDisplay,
          duration: `${h}h ${String(m).padStart(2, '0')}m`,
          rating: 4 + Math.random(),
          image: airlineLogoUrl || `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2`,
          amenities: ['Seat Selection', 'Cabin Baggage'],
          features: [
            totalStops === 0 ? 'Direct' : `${totalStops} stop${totalStops > 1 ? 's' : ''}`,
            `${h}h ${m}m`,
            cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
          ],
          type: 'flights' as const,

          // ALL PRICE FIELDS at top level
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

          // Use formattedSlices ONCE at the top level
          slices: formattedSlices,

          // Also set the transformed fields that FlightDetails expects at top level
          departureAirport: flightOrigin,
          arrivalAirport: flightDest,
          departureTime: dep,
          arrivalTime: lastSegment.arriving_at ?? lastSlice.arrival_time,
          airlineName,
          airlineLogo: airlineLogoUrl,
          flightNumber,
          stopCount: totalStops,
          stopText: totalStops === 0 ? 'Direct' : `${totalStops} stop${totalStops > 1 ? 's' : ''}`,
          cabin: cabinClass,
          baggage: JSON.stringify([{ type: 'checked', quantity: 1 }, { type: 'carry_on', quantity: 1 }]),
          displayPrice: `${sym}${Number(totalPrice).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,

          // Add realData - THIS WAS THE DUPLICATE ISSUE
          // The error was happening because there was another 'realData' property somewhere
          // Now we're including it directly in the object
          realData: {
            id: offer.id,
            offerId: offer.id,
            offerRequestId,
            departureTime: dep,
            arrivalTime: lastSegment.arriving_at ?? lastSlice.arrival_time,
            airline: airlineName,
            airlineCode,
            airlineLogo: airlineLogoUrl,
            flightNumber,
            totalDuration: totalDurMin,
            stops: totalStops,
            price: Number(totalPrice),
            currency,
            slices: formattedSlices,
            owner: ownerObject,
            original_amount: offer.original_amount,
            original_currency: offer.original_currency,
            conversion_fee: offer.conversion_fee,
            markup_percentage: offer.markup_percentage,
            markup_amount: offer.markup_amount,
            service_fee: offer.service_fee,
            final_amount: offer.final_amount
          }
        };

        return result;
      });

      const valid = transformed.filter((r) => r.price && !r.price.includes('£0'));
      console.log('✅ Transformed flights:', valid.length);
      console.log('Sample transformed flight slices count:', valid[0]?.slices?.length);

      setSearchResults(valid);
    } catch (error) {
      console.error('❌ Flight search error:', error);
      setSearchResults([]);
      // Don't throw here, just return empty results
    }
  };

  const selectItem = useCallback((item: SearchResult) => {
    console.log('📦 Item selected with ALL price fields:', {
      id: item.id,
      original_amount: (item as any).original_amount,
      markup_amount: (item as any).markup_amount,
      service_fee: (item as any).service_fee,
      final_amount: (item as any).final_amount
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