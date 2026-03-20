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
    const returnDate = params.returnDate;

    let cabinClass = (params.cabinClass ?? 'economy').toLowerCase();
    if (!['economy', 'premium_economy', 'business', 'first'].includes(cabinClass)) cabinClass = 'economy';

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
      const requestBody: any = {
        origin,
        destination,
        departureDate,
        passengers: passengerCount,
        cabinClass,
        currency: 'GBP'
      };

      if (returnDate) {
        requestBody.returnDate = returnDate;
      }

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

      // ──────────────────────────────────────────────────────────
      // Paginated fetch of all offers
      // ──────────────────────────────────────────────────────────
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
        console.log('⚠️ No offers found');
        setSearchResults([]);
        return;
      }

      // Transform all offers
      const transformed = allOffers.map((offer: any, i: number) => {
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
          provider: airlineName,
          title: `${airlineName} ${outboundFlightNumber}`,
          subtitle: `${outboundDepartureAirport} → ${outboundArrivalAirport}`,
          price: `${sym}${totalPrice.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
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

      // Remove exact duplicates (same flight number, same departure time, same airline)
      const uniqueFlights = new Map();
      transformed.forEach((flight: any) => {
        const key = `${flight.airlineName}-${flight.flightNumber}-${flight.departureTime}`;
        if (!uniqueFlights.has(key)) {
          uniqueFlights.set(key, flight);
        } else {
          const existing = uniqueFlights.get(key);
          if (flight.rawPrice < existing.rawPrice) {
            uniqueFlights.set(key, flight);
          }
        }
      });

      let allFlights = Array.from(uniqueFlights.values());
      allFlights.sort((a, b) => a.rawPrice - b.rawPrice);

      console.log(`✅ Showing ${allFlights.length} unique flights`);
      setSearchResults(allFlights);
      
    } catch (error) {
      console.error('❌ Flight search error:', error);
      setSearchResults([]);
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