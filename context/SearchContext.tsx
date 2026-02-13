'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { config } from '@/lib/config';
import { extractAirportCode, getAirlineImage } from '@/lib/utils';
import type { SearchParams, SearchResult } from '@/lib/types';
import api from '@/lib/api';

// ─── Mock fallback data ─────────────────────────────
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
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const BOOKING_REVIEW_SELECTION_KEY = 'ebt_booking_review_selection';

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Restore selection after login redirect so user doesn't see "No Booking to Review"
  React.useEffect(() => {
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

  // ── Unified search across all product types ───────
  const search = useCallback(async (params: SearchParams) => {
    setSearchParams(params);
    setIsSearching(true);
    setSearchResults([]);

    // Show mock immediately for UX
    const mockKey = params.type === 'cars' ? 'car-rentals' : params.type;
    setSearchResults(MOCK[mockKey] ?? []);

    try {
      if (params.type === 'car-rentals' || params.type === 'cars') {
        await searchCars(params);
      } else if (params.type === 'hotels') {
        await searchHotels(params);
      } else {
        await searchFlights(params);
      }
    } catch (err) {
      console.error('Search error:', err);
      // Keep mock data on error
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ── Car rental search ─────────────────────────────
  const searchCars = async (params: SearchParams) => {
    try {
      const carParams = {
        pickupLocationCode: params.pickupLocationCode || 'LOS',
        dropoffLocationCode: params.dropoffLocationCode || params.pickupLocationCode || 'LOS',
        pickupDateTime: params.pickupDateTime || new Date().toISOString(),
        dropoffDateTime: params.dropoffDateTime || new Date(Date.now() + 86400000).toISOString(),
        passengers: 2,
        currency: 'GBP',
      };
      const result = await api.carApi.searchAndTransformCarRentals(
        carParams,
        params.carPickUp || 'Airport',
        params.carPickUp || 'Airport',
      );
      if (result.success && result.results.length > 0) {
        setSearchResults(result.results);
      }
    } catch {
      /* keep mock */
    }
  };

  // ── Hotel search ──────────────────────────────────
  const searchHotels = async (params: SearchParams) => {
    try {
      const hotelParams = {
        cityCode: params.cityCode || 'LOS',
        checkInDate: params.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: params.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        adults: 1,
        roomQuantity: 1,
        currency: 'GBP',
      };
      const result = await api.hotelApi.searchAndTransformHotels(hotelParams, params.location || 'Lagos');
      if (result.success && result.results.length > 0) {
        setSearchResults(result.results);
      }
    } catch {
      /* keep mock */
    }
  };

  // ── Flight search (two-step Duffel) ───────────────
  const searchFlights = async (params: SearchParams) => {
    if (!params.segments?.[0]?.from || !params.segments?.[0]?.to) return;

    const origin = extractAirportCode(params.segments[0].from);
    const destination = extractAirportCode(params.segments[0].to);
    if (!origin || !destination) return;

    const departureDate = params.segments[0].date || new Date().toISOString().split('T')[0];
    let cabinClass = (params.cabinClass ?? 'economy').toLowerCase();
    if (!['economy', 'premium_economy', 'business', 'first'].includes(cabinClass)) cabinClass = 'economy';
    const passengers = Math.max(1, Math.min(9, Number(params.passengers) || 1));

    const BASE = config.apiBaseUrl;

    // Step 1 – offer request
    const offerRes = await fetch(`${BASE}/api/v1/bookings/search/flights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, departureDate, passengers, cabinClass, currency: 'GBP' }),
    });
    if (!offerRes.ok) throw new Error('Offer request failed');
    const offerData = await offerRes.json();
    if (!offerData.success || !offerData.data?.offer_request_id) throw new Error('No offer request ID');
    const offerRequestId = offerData.data.offer_request_id;

    // Step 2 – list offers
    const offersRes = await fetch(`${BASE}/api/v1/bookings/offers?offer_request_id=${offerRequestId}`);
    if (!offersRes.ok) throw new Error('List offers failed');
    const offersData = await offersRes.json();

    let offers: any[] =
      offersData.data?.offers ?? offersData.data ?? offersData.offers ?? [];

    if (offers.length === 0) return;

    const transformed: SearchResult[] = offers.map((offer: any, i: number) => {
      const slices = offer.slices ?? offer.segments ?? [];
      const first = slices[0] ?? {};
      const last = slices[slices.length - 1] ?? {};
      const airline = offer.owner?.name ?? first.marketing_carrier?.name ?? 'Unknown Airline';
      const flightNumber = first.flight_number ?? `FL${1000 + i}`;

      let totalPrice = offer.total_amount ?? offer.total_price ?? offer.amount ?? offer.price?.total ?? 85 + Math.floor(Math.random() * 100);
      let currency = offer.total_currency ?? offer.currency ?? offer.price?.currency ?? 'GBP';

      const durMin = offer.total_duration ?? first.duration_minutes ?? 90;
      const h = Math.floor(durMin / 60);
      const m = durMin % 60;
      const stopsCount = Math.max(0, slices.length - 1);

      let timeDisplay = '08:00';
      const dep = first.departing_at ?? first.departure_time;
      if (dep) try { timeDisplay = new Date(dep).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); } catch { /* */ }

      const sym = currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : currency === 'EUR' ? '€' : '$';
      const flightOrigin = first.origin?.iata_code ?? first.origin ?? origin;
      const flightDest = last.destination?.iata_code ?? last.destination ?? destination;

      return {
        id: offer.id ?? `flight-${i}`,
        provider: airline,
        title: `${airline} ${flightNumber}`,
        subtitle: `${flightOrigin} → ${flightDest}`,
        price: `${sym}${Number(totalPrice).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
        time: timeDisplay,
        duration: `${h}h ${String(m).padStart(2, '0')}m`,
        rating: 4 + Math.random(),
        image: getAirlineImage(airline),
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [stopsCount === 0 ? 'Direct' : `${stopsCount} stop${stopsCount > 1 ? 's' : ''}`, `${h}h ${m}m`, cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)],
        type: 'flights' as const,
        realData: {
          id: offer.id,
          offerId: offer.id,
          offerRequestId,
          departureTime: dep,
          arrivalTime: last.arriving_at ?? last.arrival_time,
          airline,
          flightNumber,
          totalDuration: durMin,
          stops: stopsCount,
          price: Number(totalPrice),
          currency,
          slices,
          owner: offer.owner,
        },
      };
    });

    const valid = transformed.filter((r) => r.price && !r.price.includes('£0'));
    if (valid.length > 0) setSearchResults(valid);
  };

  const selectItem = useCallback((item: SearchResult) => setSelectedItem(item), []);
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSelectedItem(null);
    setSearchParams(null);
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
      value={{ searchParams, searchResults, selectedItem, isSearching, search, selectItem, clearSearch, persistSelectionForReturn }}
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

