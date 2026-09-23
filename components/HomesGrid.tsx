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
  NG: ['LOS'],
  GB: ['LON', 'MAN'],
  US: ['NYC', 'MIA', 'LAS'],
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

// Curated pool to rotate through when geo is unknown
const FEATURED_CITIES = ['DXB', 'LON', 'PAR', 'TYO', 'SIN', 'NYC', 'MAD', 'ROM', 'CPT', 'IST'];

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

interface CachedData {
  hotels: HotelDisplay[];
  timestamp: number;
  currency: string;
}

// ─── Cache (per-city) ──────────────────────────────────────────────────
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

// ─── Geo detection ─────────────────────────────────────────────────────
function getUserGeoCountry(): string | null {
  if (typeof window === 'undefined') return null;

  const keys = [
    'geo_country', 'country', 'user_country', 'detected_country',
    'userCountry', 'detectedCountry', 'user_country_code',
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v.length === 2 && /^[A-Z]{2}$/i.test(v)) {
      return v.toUpperCase();
    }
  }

  // Parse compound locale: "EN/NG" or "en-NG"
  const locale = localStorage.getItem('locale') || '';
  if (locale.includes('/')) {
    const code = locale.split('/')[1]?.toUpperCase();
    if (code && /^[A-Z]{2}$/.test(code)) return code;
  }
  const m = locale.match(/[-_]([A-Z]{2})$/i);
  if (m) return m[1].toUpperCase();

  return null;
}

// ─── Currency detection (aligned with your app) ────────────────────────
function getDisplayCurrency(): string {
  if (typeof window === 'undefined') return 'NGN';

  const keys = ['selectedCurrency', 'preferredCurrency', 'currency', 'currencyCode', 'app_currency'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && ['NGN', 'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'KES'].includes(v.toUpperCase())) {
      return v.toUpperCase();
    }
  }

  // Locale fallback: "EN/NGN" → "NGN"
  const locale = localStorage.getItem('locale') || '';
  if (locale.includes('/')) {
    const code = locale.split('/')[1]?.toUpperCase();
    if (code && ['NGN', 'GBP', 'USD', 'EUR'].includes(code)) return code;
  }

  // Geo fallback
  const geo = getUserGeoCountry();
  if (geo === 'NG') return 'NGN';
  if (geo === 'US') return 'USD';
  if (geo === 'GB') return 'GBP';
  if (['FR', 'DE', 'ES', 'IT', 'NL'].includes(geo || '')) return 'EUR';

  return 'NGN';
}

// ─── Rotation: pick a city for this visit ──────────────────────────────
function pickCityForThisVisit(userGeo: string | null): string {
  const hourSlot = Math.floor(Date.now() / (60 * 60 * 1000)); // changes hourly

  // Prefer the user's geo city (rotates if their country has multiple)
  if (userGeo && GEO_TO_CITIES[userGeo]?.length) {
    const cities = GEO_TO_CITIES[userGeo];
    return cities[hourSlot % cities.length];
  }

  // Otherwise rotate through featured cities
  return FEATURED_CITIES[hourSlot % FEATURED_CITIES.length];
}

// ─── Dates ─────────────────────────────────────────────────────────────
function getDefaultDates() {
  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(today.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkIn.getDate() + 3);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) };
}

// ─── Map HotelOffer → HotelDisplay ─────────────────────────────────────
function mapOfferToDisplay(
  offer: any,
  index: number,
  cityCode: string,
  imageUrl?: string,
): HotelDisplay {
  const hotel = offer.hotel || {};
  const firstOffer = offer.offers?.[0] || {};
  const price = firstOffer.price || {};

  let totalPrice = parseFloat(price.total || '0');
  let discountedPrice: number | undefined = undefined;

  if (price.final_price) {
    totalPrice = parseFloat(price.final_price);
  }

  const markupAmount = parseFloat(price.markup_amount || '0');
  if (markupAmount > 0 && price.original_total) {
    discountedPrice = totalPrice;
    totalPrice = parseFloat(price.original_total);
  }

  // Amadeus rating: sometimes 1-5 stars, sometimes numeric score. Normalize to 3-5.
  let normalizedRating = 4.0;
  const rawRating = hotel.rating;
  if (typeof rawRating === 'number') {
    if (rawRating <= 5) {
      normalizedRating = rawRating;         // already star scale
    } else if (rawRating <= 100) {
      normalizedRating = rawRating / 20;     // 0-100 → 0-5
    } else {
      normalizedRating = rawRating / 2;      // legacy fallback
    }
  }
  normalizedRating = Math.min(5, Math.max(3, normalizedRating));

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
    rating: normalizedRating,
    reviews: Math.floor(Math.random() * 300) + 150,
    image: imageUrl || '',
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

  // Parent-provided hotels take priority
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

      // 1. Pick city FIRST (rotation depends on time)
      const geo = getUserGeoCountry();
      const primaryCity = pickCityForThisVisit(geo);
      const cacheKey = `homes_grid_cache_v2_${primaryCity}`;

      // 2. Cache check
      const cached = readCache(cacheKey);
      if (cached) {
        setHotels(cached.hotels);
        setInternalLoading(false);
        return;
      }

      try {
        const { checkIn, checkOut } = getDefaultDates();
        const displayCurrency = getDisplayCurrency();

        // 3. Search Amadeus
        const response = await api.searchHotelsAmadeus({
          cityCode: primaryCity,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: 2,
          roomQuantity: 1,
          currency: displayCurrency,
          bestRateOnly: true,
          page: 1,
          limit: 24,   // Ask for more to compensate for dedupe
        });

        if (cancelled) return;

        if (!response.success || !response.data?.data?.length) {
          throw new Error(response.message || 'No hotels available right now');
        }

        // 4. Dedupe by hotelId, take first 6 unique hotels
        const seen = new Set<string>();
        const uniqueOffers: any[] = [];
        for (const offer of response.data.data) {
          const id = offer.hotel?.hotelId;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          uniqueOffers.push(offer);
          if (uniqueOffers.length >= 6) break;
        }

        if (uniqueOffers.length === 0) {
          throw new Error('No unique hotels found');
        }

        // 5. Map to display (images empty for now)
        const mapped = uniqueOffers.map((offer, i) =>
          mapOfferToDisplay(offer, i, primaryCity),
        );

        setHotels(mapped);
        writeCache(cacheKey, {
          hotels: mapped,
          timestamp: Date.now(),
          currency: displayCurrency,
        });

        // 6. Fetch images in parallel — non-blocking
        Promise.all(
          uniqueOffers.map(async (offer, i) => {
            const hotelId = offer.hotel?.hotelId;
            const hotelName = offer.hotel?.name || '';
            if (!hotelId) return;

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

              if (firstImage && !cancelled) {
                setHotels((prev) =>
                  prev.map((h, idx) => (idx === i ? { ...h, image: firstImage } : h)),
                );
              }
            } catch (err) {
              console.warn(`Could not load image for ${hotelName}`, err);
            }
          }),
        );
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
    `${currency.symbol || '₦'}${price.toLocaleString(undefined, {
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
                src={home.image || `https://picsum.photos/seed/${encodeURIComponent(home.id)}/600/400`}
                alt={home.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallbackApplied) {
                    img.dataset.fallbackApplied = '1';
                    img.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600';
                  }
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