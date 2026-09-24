"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";
import api from "../lib/api";

// ─── Interfaces ────────────────────────────────────────────────────────
interface HotelDisplay {
  id: string;
  name: string;
  location: string;
  code: string;
  price: number;
  originalPrice?: number;
  currency: string;
  roomCategory: string;
  bedType: string;
  beds: number;
  guests: number;
  boardType?: string;
  boardLabel?: string;
  isRefundable: boolean;
  cancellationDeadline?: string;
  freeCancellationText?: string;
  image: string;
  amenities: string[];
}

interface HomesGridProps {
  hotels?: HotelDisplay[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
  onSearch?: (data: any) => void;
}

// ─── City mixes ────────────────────────────────────────────────────────
const MIXES_BY_GEO: Record<string, string[][]> = {
  NG: [
    ['LOS', 'DXB', 'LON'],
    ['LOS', 'PAR', 'IST'],
    ['LOS', 'NYC', 'SIN'],
    ['ABV', 'DXB', 'LON'],
    ['LOS', 'TYO', 'MAD'],
    ['PHC', 'DXB', 'CPT'],
  ],
  GB: [
    ['LON', 'DXB', 'NYC'],
    ['MAN', 'PAR', 'ROM'],
    ['LON', 'SIN', 'IST'],
  ],
  US: [
    ['NYC', 'LON', 'PAR'],
    ['MIA', 'DXB', 'TYO'],
    ['LAS', 'ROM', 'MAD'],
  ],
  AE: [
    ['DXB', 'LON', 'PAR'],
    ['AUH', 'IST', 'ROM'],
  ],
  FR: [['PAR', 'LON', 'DXB']],
  DE: [['BER', 'FRA', 'PAR']],
  ES: [['MAD', 'BCN', 'PAR']],
  IT: [['ROM', 'MIL', 'PAR']],
  NL: [['AMS', 'PAR', 'LON']],
  ZA: [['CPT', 'JNB', 'DXB']],
  KE: [['NBO', 'DXB', 'LON']],
  GH: [['ACC', 'DXB', 'LON']],
  EG: [['CAI', 'DXB', 'IST']],
  IN: [['DEL', 'BOM', 'DXB']],
  AU: [['SYD', 'MEL', 'SIN']],
  CA: [['YYZ', 'YVR', 'NYC']],
  JP: [['TYO', 'SIN', 'DXB']],
  SG: [['SIN', 'TYO', 'DXB']],
  TR: [['IST', 'DXB', 'PAR']],
};

const DEFAULT_MIXES: string[][] = [
  ['DXB', 'LON', 'PAR'],
  ['TYO', 'NYC', 'SIN'],
  ['MAD', 'ROM', 'IST'],
];

// Which cities count as "domestic" for a given geo
const DOMESTIC_CITIES: Record<string, string[]> = {
  NG: ['LOS', 'ABV', 'PHC', 'KAN'],
  GB: ['LON', 'MAN', 'EDI', 'BRS'],
  US: ['NYC', 'MIA', 'LAS', 'LAX'],
  AE: ['DXB', 'AUH'],
  FR: ['PAR'],
  DE: ['BER', 'FRA'],
  ES: ['MAD', 'BCN'],
  IT: ['ROM', 'MIL'],
  NL: ['AMS'],
  ZA: ['CPT', 'JNB'],
  KE: ['NBO'],
  GH: ['ACC'],
  EG: ['CAI'],
  IN: ['DEL', 'BOM'],
  AU: ['SYD', 'MEL'],
  CA: ['YYZ', 'YVR'],
  JP: ['TYO'],
  SG: ['SIN'],
  TR: ['IST'],
};

const CACHE_TTL_MS = 30 * 60 * 1000;

interface CachedData {
  hotels: HotelDisplay[];
  timestamp: number;
  currency: string;
}

function readCache(key: string): CachedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: CachedData = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: CachedData) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// ─── Geo detection (much more thorough now) ────────────────────────────
function getUserGeoCountry(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Direct country code keys
  const directKeys = [
    'geo_country', 'geoCountry', 'country', 'user_country', 'userCountry',
    'detected_country', 'detectedCountry', 'user_country_code', 'countryCode',
  ];
  for (const k of directKeys) {
    const v = localStorage.getItem(k);
    if (v && v.length === 2 && /^[A-Z]{2}$/i.test(v)) return v.toUpperCase();
  }

  // 2. Compound locale strings: "EN/NG" or "en-NG" or "en_NG"
  const localeKeys = ['locale', 'user_locale', 'userLocale', 'app_locale', 'lang', 'language'];
  for (const k of localeKeys) {
    const v = localStorage.getItem(k);
    if (!v) continue;

    if (v.includes('/')) {
      const code = v.split('/')[1]?.toUpperCase();
      if (code && /^[A-Z]{2}$/.test(code)) return code;
    }
    const m = v.match(/[-_]([A-Z]{2})$/i);
    if (m) return m[1].toUpperCase();
  }

  // 3. Currency fallback — your app sets currency reliably
  const currencyToCountry: Record<string, string> = {
    NGN: 'NG', GBP: 'GB', USD: 'US', EUR: 'FR',
    CAD: 'CA', AUD: 'AU', JPY: 'JP', CNY: 'CN', ZAR: 'ZA', KES: 'KE',
  };
  const currencyKeys = ['selectedCurrency', 'preferredCurrency', 'currency', 'currencyCode', 'app_currency'];
  for (const k of currencyKeys) {
    const v = localStorage.getItem(k)?.toUpperCase();
    if (v && currencyToCountry[v]) return currencyToCountry[v];
  }

  return null;
}

// Async fallback via ipapi.co — only called if localStorage has no geo yet
async function detectGeoFromAPI(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const code = (data?.country_code || '').toUpperCase();
    if (code && code.length === 2) {
      try {
        localStorage.setItem('geo_country', code);
        localStorage.setItem('country', code);
      } catch {}
      return code;
    }
  } catch (err) {
    console.warn('Geo detection via ipapi.co failed:', err);
  }
  return null;
}

function getDisplayCurrency(): string {
  if (typeof window === 'undefined') return 'NGN';

  const keys = ['selectedCurrency', 'preferredCurrency', 'currency', 'currencyCode', 'app_currency'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && ['NGN', 'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'KES'].includes(v.toUpperCase())) {
      return v.toUpperCase();
    }
  }

  const locale = localStorage.getItem('locale') || '';
  if (locale.includes('/')) {
    const code = locale.split('/')[1]?.toUpperCase();
    if (code && ['NGN', 'GBP', 'USD', 'EUR'].includes(code)) return code;
  }

  const geo = getUserGeoCountry();
  if (geo === 'NG') return 'NGN';
  if (geo === 'US') return 'USD';
  if (geo === 'GB') return 'GBP';
  if (['FR', 'DE', 'ES', 'IT', 'NL'].includes(geo || '')) return 'EUR';
  return 'NGN';
}

function pickCityMix(userGeo: string | null): string[] {
  const hourSlot = Math.floor(Date.now() / (60 * 60 * 1000));
  const mixes = (userGeo && MIXES_BY_GEO[userGeo]) || DEFAULT_MIXES;
  return mixes[hourSlot % mixes.length];
}

function getDefaultDates() {
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) };
}

// ─── Board type → human label ──────────────────────────────────────────
function boardLabel(boardType?: string): string | undefined {
  if (!boardType) return undefined;
  const map: Record<string, string> = {
    ROOM_ONLY: 'Room only',
    RO: 'Room only',
    BREAKFAST: 'Breakfast included',
    BB: 'Breakfast included',
    HALF_BOARD: 'Half board',
    HB: 'Half board',
    FULL_BOARD: 'Full board',
    FB: 'Full board',
    ALL_INCLUSIVE: 'All inclusive',
    AI: 'All inclusive',
  };
  const key = boardType.toUpperCase().replace(/[\s-]/g, '_');
  return (
    map[key] ||
    map[boardType.toUpperCase()] ||
    boardType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatCancellationDeadline(isoDate?: string): string | undefined {
  if (!isoDate) return undefined;
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return undefined;

    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Cancellation fee applies';
    if (diffDays === 1) return 'Free cancellation today';
    if (diffDays < 7) return `Free cancellation for ${diffDays} more days`;

    return `Free cancellation until ${date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })}`;
  } catch {
    return undefined;
  }
}

// ─── Map Amadeus HotelOffer → HotelDisplay ─────────────────────────────
function mapOfferToDisplay(
  offer: any,
  index: number,
  cityCode: string,
): HotelDisplay {
  const hotel = offer.hotel || {};
  const firstOffer = offer.offers?.[0] || {};
  const price = firstOffer.price || {};
  const room = firstOffer.room?.typeEstimated || {};
  const policies = firstOffer.policies || {};

  let totalPrice = parseFloat(price.total || '0');
  let originalPrice: number | undefined;
  if (price.final_price) totalPrice = parseFloat(price.final_price);
  const markupAmount = parseFloat(price.markup_amount || '0');
  if (markupAmount > 0 && price.original_total) {
    originalPrice = parseFloat(price.original_total);
  }

  const isRefundable =
    policies.refundable?.cancellationRefund !== 'NON_REFUNDABLE' ||
    (firstOffer.cancellationPolicies?.length ?? 0) > 0 ||
    (policies.cancellations?.length ?? 0) > 0;

  const cancellationDeadline =
    policies.cancellations?.[0]?.deadline ||
    firstOffer.cancellationPolicies?.[0]?.from;

  return {
    id: hotel.hotelId || `hotel-${index}`,
    name: hotel.name || 'Hotel',
    location: hotel.address?.cityName
      ? `${hotel.address.cityName}${hotel.address.countryCode ? ', ' + hotel.address.countryCode : ''}`
      : cityCode,
    code: cityCode,
    price: totalPrice,
    originalPrice,
    currency: (price.currency || 'GBP').toUpperCase(),
    roomCategory: room.category || 'Room',
    bedType: room.bedType || 'Bed',
    beds: room.beds || 1,
    guests: firstOffer.guests?.adults || 2,
    boardType: firstOffer.boardType,
    boardLabel: boardLabel(firstOffer.boardType),
    isRefundable,
    cancellationDeadline,
    freeCancellationText: isRefundable
      ? formatCancellationDeadline(cancellationDeadline)
      : undefined,
    image: '',
    amenities: (hotel.amenities || []).slice(0, 3),
  };
}

// ─── Main component ────────────────────────────────────────────────────
const HomesGrid: React.FC<HomesGridProps> = ({
  hotels: propHotels,
  loading: propLoading = false,
  error: propError = null,
  title,
  subtitle,
  onSearch,
}) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelDisplay[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>('NGN');
  const [savedHotelIds, setSavedHotelIds] = useState<Set<string>>(new Set());
  const savedItemIdMapRef = useRef<Map<string, string>>(new Map());

  const CURRENCY_SYMBOLS: Record<string, string> = {
    NGN: '₦', GBP: '£', USD: '$', EUR: '€',
    CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥', ZAR: 'R', KES: 'KSh',
  };

  useEffect(() => {
    setCurrency(getDisplayCurrency());
  }, []);

  useEffect(() => {
    if (propHotels && propHotels.length > 0) {
      setHotels(propHotels);
      setInternalLoading(false);
    }
  }, [propHotels]);

  // Load saved hotel ids from server (falls back to sessionStorage for guests)
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const response = await api.userApi.getSavedItems('HOTEL');
        const items: any[] = Array.isArray(response) ? response : (response as any)?.data || [];

        const ids = new Set<string>();
        const map = new Map<string, string>();

        for (const item of items) {
          const hotelId = item.metadata?.hotelId || item.itemId || item.hotelId;
          const savedId = item.id;
          if (hotelId && savedId) {
            ids.add(hotelId);
            map.set(hotelId, savedId);
          }
        }

        setSavedHotelIds(ids);
        savedItemIdMapRef.current = map;
      } catch {
        try {
          const stored = sessionStorage.getItem('saved_hotel_ids');
          if (stored) setSavedHotelIds(new Set(JSON.parse(stored)));
        } catch {}
      }
    };
    loadSaved();
  }, []);

  // Load trending hotels (mix of domestic + international, rotated hourly)
  useEffect(() => {
    if (propHotels && propHotels.length > 0) return;

    let cancelled = false;

    const loadTrending = async () => {
      setInternalLoading(true);
      setInternalError(null);

      // ─── 1. Resolve geo (localStorage → API fallback) ────────
      let geo = getUserGeoCountry();
      if (!geo) {
        console.log('🌍 No geo in localStorage, trying ipapi.co...');
        geo = await detectGeoFromAPI();
      }

      const mix = pickCityMix(geo);
      const mixKey = mix.join('-');
      const cacheKey = `homes_grid_real_v4_${mixKey}`;

      console.log('🌍 Hotel mix:', {
        geo: geo || 'unknown',
        mix,
        cacheKey,
      });

      // ─── 2. Cache check ───────────────────────────────────────
      const cached = readCache(cacheKey);
      if (cached) {
        console.log('✅ Loaded from cache:', cached.hotels.length, 'hotels');
        setHotels(cached.hotels);
        setInternalLoading(false);
        return;
      }

      try {
        const { checkIn, checkOut } = getDefaultDates();
        const displayCurrency = getDisplayCurrency();

        // ─── 3. Fetch all cities in parallel ─────────────────────
        const results = await Promise.all(
          mix.map(async (cityCode) => {
            try {
              const r = await api.searchHotelsAmadeus({
                cityCode,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adults: 2,
                roomQuantity: 1,
                currency: displayCurrency,
                bestRateOnly: true,
                page: 1,
                limit: 20,
              });
              return { cityCode, response: r };
            } catch (err) {
              console.warn(`Failed to fetch hotels for ${cityCode}`, err);
              return { cityCode, response: null };
            }
          }),
        );

        if (cancelled) return;

        // ─── 4. Collect up to 6 unique hotels per city ───────────
        const collected: { offer: any; city: string; isDomestic: boolean }[] = [];
        const seen = new Set<string>();
        const domesticSet = new Set(geo ? DOMESTIC_CITIES[geo] || [] : []);

        for (const { cityCode, response } of results) {
          if (!response?.data?.data?.length) continue;
          let taken = 0;
          for (const offer of response.data.data) {
            const id = offer.hotel?.hotelId;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            collected.push({
              offer,
              city: cityCode,
              isDomestic: domesticSet.has(cityCode),
            });
            taken++;
            if (taken >= 6) break;
          }
        }

        if (collected.length === 0) {
          throw new Error('No hotels available right now');
        }

        // ─── 5. Sort domestic hotels first (if any) ──────────────
        collected.sort((a, b) => {
          if (a.isDomestic && !b.isDomestic) return -1;
          if (!a.isDomestic && b.isDomestic) return 1;
          return 0;
        });

        const mapped = collected.map(({ offer, city }, i) =>
          mapOfferToDisplay(offer, i, city),
        );

        setHotels(mapped);
        console.log('✅ Loaded', mapped.length, 'hotels:', {
          domestic: collected.filter((c) => c.isDomestic).length,
          international: collected.filter((c) => !c.isDomestic).length,
        });

        // ─── 6. Fetch real Amadeus images in parallel ────────────
        const imageResults = await Promise.all(
          collected.map(async ({ offer }) => {
            const hotelId = offer.hotel?.hotelId;
            const hotelName = offer.hotel?.name || '';
            if (!hotelId) return null;

            try {
              const imgResponse: any = await api.publicRequest(
                `/api/v1/bookings/hotels/${encodeURIComponent(hotelId)}/images?hotelName=${encodeURIComponent(hotelName)}`,
                { method: 'GET' },
              );

              const firstImage =
                imgResponse?.data?.images?.[0]?.url ||
                imgResponse?.data?.[0]?.url ||
                imgResponse?.images?.[0]?.url ||
                null;

              const looksValid =
                typeof firstImage === 'string' &&
                firstImage.startsWith('http') &&
                firstImage.length > 20;

              return looksValid ? firstImage : null;
            } catch (err) {
              console.warn(`Image fetch failed for ${hotelName}`, err);
              return null;
            }
          }),
        );

        if (cancelled) return;

        // ─── 7. Attach images + reorder (with-image first) + cache ──
        setHotels((prev) => {
          const withImages = prev.map((h, idx) => ({
            ...h,
            image: imageResults[idx] || '',
          }));

          const sorted = [
            ...withImages.filter((h) => h.image),
            ...withImages.filter((h) => !h.image),
          ];

          writeCache(cacheKey, {
            hotels: sorted,
            timestamp: Date.now(),
            currency: displayCurrency,
          });

          return sorted;
        });
      } catch (err: any) {
        if (cancelled) return;
        console.error('Failed to load trending hotels:', err);
        setInternalError(err?.message || 'Could not load trending hotels right now.');
      } finally {
        if (!cancelled) setInternalLoading(false);
      }
    };

    loadTrending();
    return () => {
      cancelled = true;
    };
  }, [propHotels]);

  // Wishlist toggle
  const toggleSaveHotel = async (hotel: HotelDisplay) => {
    const isCurrentlySaved = savedHotelIds.has(hotel.id);
    const newSet = new Set(savedHotelIds);

    if (isCurrentlySaved) {
      newSet.delete(hotel.id);
    } else {
      newSet.add(hotel.id);
    }

    setSavedHotelIds(newSet);

    try {
      sessionStorage.setItem('saved_hotel_ids', JSON.stringify([...newSet]));
    } catch {}

    try {
      if (isCurrentlySaved) {
        const savedId = savedItemIdMapRef.current.get(hotel.id);
        if (savedId) {
          await api.userApi.removeSavedItem(savedId);
          savedItemIdMapRef.current.delete(hotel.id);
        }
      } else {
        const packedTitle = [
          hotel.name || 'Hotel',
          hotel.image || '',           // ← real Amadeus image URL
          hotel.code || '',
          hotel.location || '',
          hotel.id || '',
        ].join('|||');
        
        const response: any = await api.userApi.saveItem({
          productType: 'HOTEL',
          title: packedTitle,
          price: hotel.price,
          currency: hotel.currency,
        });

        const newSavedId =
          response?.data?.id || response?.id || response?.data?.savedItemId;
        if (newSavedId) {
          savedItemIdMapRef.current.set(hotel.id, newSavedId);
        }
      }
    } catch (err) {
      console.warn('Could not sync wishlist with server:', err);
    }
  };

  const handleHotelClick = async (hotel: HotelDisplay) => {
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 7);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 3);

    const checkInDate = checkIn.toISOString().split('T')[0];
    const checkOutDate = checkOut.toISOString().split('T')[0];

    const searchData = {
      type: 'hotels',
      location: `${hotel.location}`,
      cityCode: hotel.code,
      checkInDate,
      checkOutDate,
      travellers: { adults: 2, children: 0 },
      rooms: 1,
      currency,
    };

    if (onSearch) {
      await onSearch(searchData);
    } else {
      const params = new URLSearchParams({
        type: 'hotels',
        location: searchData.location,
        cityCode: hotel.code,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: '2',
        rooms: '1',
        currency,
      });
      router.push(`/search?${params.toString()}`);
    }
  };

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatPrice = (p: number) =>
    `${symbol}${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const isLoading = propHotels ? propLoading : internalLoading;
  const hasError = propHotels ? propError : internalError;
  const displayHotels = propHotels || hotels;

  const displayTitle = title || 'Homes guests love';
  const displaySubtitle = subtitle || 'From castles and villas to boats and igloos, we have it all';

  // ─── Loading skeleton ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 pt-8 pb-0">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{displayTitle}</h2>
          <p className="text-gray-600 mt-1 text-sm">{displaySubtitle}</p>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg overflow-hidden border border-gray-200 animate-pulse flex-shrink-0"
              style={{ width: 'calc((100% - 3rem) / 4)', minWidth: '260px' }}
            >
              <div className="aspect-[16/10] bg-gray-200"></div>
              <div className="p-3">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (hasError || displayHotels.length === 0) {
    return (
      <section className="px-4 md:px-8 lg:px-16 pt-8 pb-4">
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{displayTitle}</h2>
          <p className="text-gray-500 text-sm">{hasError || 'No properties available right now.'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 md:px-8 lg:px-16 pt-8 pb-4">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{displayTitle}</h2>
          <p className="text-gray-600 mt-1 text-sm">{displaySubtitle}</p>
        </div>
        <button
          onClick={() => router.push('/search?type=hotels')}
          className="text-sm font-semibold text-[#0071c2] hover:underline flex items-center gap-1"
        >
          Explore all
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Carousel */}
      <div className="relative group/carousel">
        {/* Left arrow — always visible on desktop */}
        <button
          onClick={() => {
            const el = document.getElementById('homes-carousel');
            if (el) el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' });
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition hidden md:flex"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Track */}
        <div
          id="homes-carousel"
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-0"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {displayHotels.map((hotel) => (
            <div
              key={hotel.id}
              onClick={() => handleHotelClick(hotel)}
              className="group cursor-pointer bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200 flex flex-col snap-start flex-shrink-0"
              style={{
                width: 'calc((100% - 3rem) / 4)',
                minWidth: '260px',
              }}
            >
              {/* Image area */}
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                {hotel.image ? (
                  <img
                    src={hotel.image}
                    alt={hotel.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}

                {!hotel.image && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01M9 15h.01M15 15h.01"
                      />
                    </svg>
                  </div>
                )}

                {/* Wishlist heart */}
                <button
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 hover:bg-white flex items-center justify-center shadow-sm transition z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaveHotel(hotel);
                  }}
                  aria-label={savedHotelIds.has(hotel.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  {savedHotelIds.has(hotel.id) ? (
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="p-3 flex flex-col flex-1">
                {hotel.boardLabel && (
                  <div className="mb-1">
                    <span className="text-[11px] font-medium text-gray-700">{hotel.boardLabel}</span>
                  </div>
                )}

                <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-2 mb-1">
                  {hotel.name}
                </h3>

                <p className="text-xs text-gray-500 mb-2 line-clamp-1">{hotel.location}</p>

                <p className="text-xs text-gray-600 mb-2 line-clamp-1">
                  {hotel.roomCategory} · {hotel.beds} {hotel.bedType} bed
                  {hotel.beds > 1 ? 's' : ''} · {hotel.guests} guests
                </p>

                {hotel.isRefundable && hotel.freeCancellationText && (
                  <div className="flex items-center gap-1 mb-2 text-xs text-emerald-700">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold">{hotel.freeCancellationText}</span>
                  </div>
                )}

                <div className="flex-1" />

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-500 leading-tight">Starting from</p>
                  {hotel.originalPrice && (
                    <p className="text-xs text-red-500 line-through leading-tight">
                      {symbol} {hotel.originalPrice.toLocaleString()}
                    </p>
                  )}
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {formatPrice(hotel.price)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">per night, incl. taxes</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right arrow — always visible on desktop */}
        <button
          onClick={() => {
            const el = document.getElementById('homes-carousel');
            if (el) el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition hidden md:flex"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dots */}
      {displayHotels.length > 4 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {displayHotels.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = document.getElementById('homes-carousel');
                if (el) {
                  const cardWidth = el.scrollWidth / displayHotels.length;
                  el.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
                }
              }}
              className="w-1.5 h-1.5 rounded-full bg-gray-300 hover:bg-gray-500 transition"
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        #homes-carousel::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default HomesGrid;