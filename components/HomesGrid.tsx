"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";
import api from "../lib/api";

interface HotelDisplay {
  id: string;
  name: string;
  location: string;
  code: string;
  price: number;
  discountedPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  amenities: string[];
  chainCode?: string;
  cityName?: string;
  description?: string;
  country?: string;
}

interface HomesGridProps {
  hotels?: HotelDisplay[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
  onSearch?: (data: any) => void;
}

// ─── Geo → featured cities ─────────────────────────────────────────────
const GEO_TO_CITIES: Record<string, string[]> = {
  NG: ['LOS'],              // Lagos (Abuja currently has no hotels on Amadeus)
  GB: ['LON', 'MAN'],       // London, Manchester
  US: ['NYC', 'MIA', 'LAS'],// New York, Miami, Las Vegas
  FR: ['PAR'],
  AE: ['DXB'],
  JP: ['TYO'],
  SG: ['SIN'],
  ZA: ['CPT', 'JNB'],
  KE: ['NBO'],
  GH: ['ACC'],
  EG: ['CAI'],
  IN: ['DEL', 'BOM'],
  AU: ['SYD', 'MEL'],
  CA: ['YYZ', 'YVR'],
  ES: ['MAD', 'BCN'],
  IT: ['ROM', 'MIL'],
  DE: ['BER', 'FRA'],
  NL: ['AMS'],
  TR: ['IST'],
};

// Fallback if we can't detect geo
const FALLBACK_CITIES = ['DXB', 'LON', 'PAR'];

// ─── Session-storage cache to avoid hammering Amadeus ──────────────────
const CACHE_KEY = 'homes_grid_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CachedData {
  hotels: HotelDisplay[];
  timestamp: number;
  currency: string;
}

function readCache(): CachedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedData = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: CachedData) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Detect user's geo country code ────────────────────────────────────
function getUserGeoCountry(): string | null {
  if (typeof window === 'undefined') return null;
  // Your app already sets one of these on geo detection
  const keys = ['geo_country', 'country', 'user_country', 'detected_country'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v.length === 2) return v.toUpperCase();
  }
  // Fallback: parse locale like "EN/NG" or "en-NG"
  const locale = localStorage.getItem('locale') || '';
  const m = locale.match(/([A-Z]{2})$/i);
  if (m) return m[1].toUpperCase();
  return null;
}

// ─── Detect the admin/user's display currency ──────────────────────────
function getDisplayCurrency(): string {
  if (typeof window === 'undefined') return 'NGN';
  const keys = ['selectedCurrency', 'preferredCurrency', 'currency', 'currencyCode'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && ['NGN', 'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'KES'].includes(v.toUpperCase())) {
      return v.toUpperCase();
    }
  }
  const geo = getUserGeoCountry();
  if (geo === 'NG') return 'NGN';
  if (geo === 'US') return 'USD';
  if (geo === 'GB') return 'GBP';
  if (geo === 'FR' || geo === 'DE' || geo === 'ES' || geo === 'IT' || geo === 'NL') return 'EUR';
  return 'GBP';
}

// ─── Compute check-in / check-out dates ────────────────────────────────
function getDefaultDates() {
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 7);   // today + 7 days
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3); // 3-night stay
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) };
}

// ─── Map HotelOffer → HotelDisplay ─────────────────────────────────────
function mapOfferToDisplay(offer: any, index: number, cityCode: string): HotelDisplay {
  const hotel = offer.hotel || {};
  const firstOffer = offer.offers?.[0] || {};
  const price = firstOffer.price || {};

  // Use existing transformer in api.ts if available
  let totalPrice = parseFloat(price.total || '0');
  let discountedPrice: number | undefined = undefined;
  let currency = price.currency || 'GBP';

  // Prefer final_price (post-markup) if provided
  if (price.final_price) {
    totalPrice = parseFloat(price.final_price);
  }

  // Show original vs. discounted if markup exists
  const markupAmount = parseFloat(price.markup_amount || '0');
  if (markupAmount > 0 && price.original_total) {
    discountedPrice = totalPrice;
    totalPrice = parseFloat(price.original_total);
  }

  return {
    id: hotel.hotelId || `hotel-${index}`,
    name: hotel.name || 'Hotel',
    location: hotel.address?.cityName
      ? `${hotel.address.cityName}, ${hotel.address.countryCode || ''}`
      : cityCode,
    code: cityCode,
    cityName: hotel.address?.cityName || cityCode,
    country: hotel.address?.countryCode,
    price: totalPrice,
    discountedPrice,
    rating: hotel.rating ? Math.min(5, Math.max(1, hotel.rating / 2)) : 4.0, // Amadeus rating is /10 or a star count; clamp to 1-5
    reviews: Math.floor(Math.random() * 300) + 150, // Amadeus doesn't give review counts
    image: (offer as any).primaryImageUrl || hotel.primaryImageUrl || '',
    amenities: (hotel.amenities || []).slice(0, 4),
    chainCode: hotel.chainCode,
    description: hotel.description,
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
  const { t, currency } = useLanguage();
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelDisplay[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);

  const brandBlue = "#32A6D7";
  const brandBlueLight = "#e6f4fa";

  // If parent passes its own hotels, use those
  useEffect(() => {
    if (propHotels && propHotels.length > 0) {
      setHotels(propHotels);
      setInternalLoading(false);
    }
  }, [propHotels]);

  // Otherwise, fetch real trending hotels from Amadeus
  useEffect(() => {
    if (propHotels && propHotels.length > 0) return;

    let cancelled = false;

    const loadTrending = async () => {
      setInternalLoading(true);
      setInternalError(null);

      // 1. Check cache first
      const cached = readCache();
      if (cached) {
        setHotels(cached.hotels);
        setInternalLoading(false);
        return;
      }

      try {
        // 2. Figure out which city to feature for this user
        const geo = getUserGeoCountry();
        const featuredCities = (geo && GEO_TO_CITIES[geo]) || FALLBACK_CITIES;
        const primaryCity = featuredCities[0];

        const { checkIn, checkOut } = getDefaultDates();
        const displayCurrency = getDisplayCurrency();

        // 3. Call the existing Amadeus search via your API layer
        const response = await api.searchHotelsAmadeus({
          cityCode: primaryCity,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: 2,
          roomQuantity: 1,
          currency: displayCurrency,
          bestRateOnly: true,
          page: 1,
          limit: 6,
        });

        if (cancelled) return;

        if (!response.success || !response.data?.data?.length) {
          throw new Error(
            response.message || 'No hotels available right now',
          );
        }

        // 4. Take the first 6, map to HotelDisplay
        const mapped = response.data.data
          .slice(0, 6)
          .map((offer, i) => mapOfferToDisplay(offer, i, primaryCity));

        setHotels(mapped);
        writeCache({
          hotels: mapped,
          timestamp: Date.now(),
          currency: displayCurrency,
        });
      } catch (err: any) {
        if (cancelled) return;
        console.error('Failed to load trending hotels:', err);
        setInternalError(
          err?.message || 'Could not load trending hotels right now.',
        );
      } finally {
        if (!cancelled) setInternalLoading(false);
      }
    };

    loadTrending();
    return () => {
      cancelled = true;
    };
  }, [propHotels]);

  // ─── Handlers ─────────────────────────────────────────────────────────
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
      location: `${hotel.cityName || hotel.location}`,
      cityCode: hotel.code,
      checkInDate,
      checkOutDate,
      travellers: { adults: 2, children: 0 },
      rooms: 1,
      currency: getDisplayCurrency(),
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
        currency: getDisplayCurrency(),
      });
      router.push(`/search?${params.toString()}`);
    }
  };

  const formatPrice = (price: number) =>
    `${currency.symbol || '£'}${price.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    })}`;

  const isLoading = propHotels ? propLoading : internalLoading;
  const hasError = propHotels ? propError : internalError;
  const displayHotels = propHotels || hotels;

  const displayTitle = title || t('homes.title');
  const displaySubtitle = subtitle || t('homes.subtitle');

  // ─── Rendering ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 pt-8 pb-0 -mb-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{displayTitle}</h2>
            <p className="text-gray-500 mt-1 text-sm md:text-base">{displaySubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse">
              <div className="h-64 bg-gray-200"></div>
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded-full w-20 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (hasError || displayHotels.length === 0) {
    return (
      <section className="px-4 md:px-8 lg:px-16 pt-8 pb-0 -mb-4">
        <div className="text-center py-10">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{displayTitle}</h2>
          <p className="text-gray-500 text-sm">
            {hasError || 'No featured hotels available right now.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 md:px-8 lg:px-16 pt-8 pb-0 -mb-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{displayTitle}</h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">{displaySubtitle}</p>
        </div>
        <button
          onClick={() => router.push('/search?type=hotels')}
          className="font-semibold transition-colors duration-200 flex items-center gap-2 group"
          style={{ color: brandBlue }}
        >
          {t('homes.exploreAll')}
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayHotels.map((home) => (
          <div
            key={home.id}
            onClick={() => handleHotelClick(home)}
            className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="relative h-64 overflow-hidden">
              <img
                src={home.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600'}
                alt={home.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600';
                }}
              />
              {home.discountedPrice && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {t('homes.save')}{' '}
                  {Math.round(((home.price - home.discountedPrice) / home.price) * 100)}%
                </div>
              )}
            </div>

            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#32A6D7] transition-colors duration-200 text-lg">
                {home.name}
              </h3>

              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-500">{home.location}</p>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center px-3 py-1 rounded-full" style={{ backgroundColor: brandBlueLight }}>
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3.5 h-3.5 ${i < Math.floor(home.rating) ? 'fill-current' : 'text-gray-200'}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold" style={{ color: brandBlue }}>
                    {home.rating.toFixed(1)}
                  </span>
                </div>
              </div>

              {home.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {home.amenities.slice(0, 3).map((amenity, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {amenity}
                    </span>
                  ))}
                  {home.amenities.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      +{home.amenities.length - 3} {t('homes.more')}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  {home.discountedPrice && (
                    <span className="text-sm line-through text-gray-400 mr-2">
                      {formatPrice(home.price)}
                    </span>
                  )}
                  <span className="text-xl font-bold" style={{ color: brandBlue }}>
                    {formatPrice(home.discountedPrice || home.price)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">{t('homes.perNight')}</span>
                </div>

                <button
                  className="px-4 py-2 font-semibold rounded-lg transition-colors duration-200 text-white"
                  style={{ backgroundColor: brandBlue }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a8bb5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = brandBlue)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHotelClick(home);
                  }}
                >
                  {t('homes.explore')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomesGrid;