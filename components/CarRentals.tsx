"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";
import api from "../lib/api";

// ─── Car rental type ───────────────────────────────────────────────────
interface CarDisplay {
  id: string;
  name: string;
  provider: string;
  vehicleCategory: string;
  vehicleDescription: string;
  price: number;              // ← in user's currency after conversion
  discountedPrice?: number;   // ← in user's currency after conversion
  rating: number;
  reviews: number;
  image: string;
  providerLogo?: string;
  amenities: string[];
  seats: number;
  baggage: string;
  transmission: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  duration?: string;
  distance?: string;
  isRefundable?: boolean;
  cityName?: string;
  locationCode?: string;
  description?: string;
  vehicleCode?: string;
  location?: string;
}

interface CarRentalsProps {
  onSearch?: (data: any) => void;
}

// ─── Popular car routes per geo ────────────────────────────────────────
const CAR_ROUTES_BY_GEO: Record<
  string,
  Array<{
    from: { code: string; city: string; country: string };
    to: { code: string; city: string; country: string };
  }>
> = {
  NG: [
    { from: { code: "LOS", city: "Lagos", country: "Nigeria" }, to: { code: "LOS", city: "Lagos", country: "Nigeria" } },
    { from: { code: "ABV", city: "Abuja", country: "Nigeria" }, to: { code: "ABV", city: "Abuja", country: "Nigeria" } },
    { from: { code: "LOS", city: "Lagos", country: "Nigeria" }, to: { code: "ABV", city: "Abuja", country: "Nigeria" } },
  ],
  GB: [
    { from: { code: "LHR", city: "London", country: "United Kingdom" }, to: { code: "LHR", city: "London", country: "United Kingdom" } },
    { from: { code: "LHR", city: "London", country: "United Kingdom" }, to: { code: "CDG", city: "Paris", country: "France" } },
    { from: { code: "MAN", city: "Manchester", country: "United Kingdom" }, to: { code: "MAN", city: "Manchester", country: "United Kingdom" } },
  ],
  US: [
    { from: { code: "JFK", city: "New York", country: "USA" }, to: { code: "JFK", city: "New York", country: "USA" } },
    { from: { code: "LAX", city: "Los Angeles", country: "USA" }, to: { code: "LAX", city: "Los Angeles", country: "USA" } },
    { from: { code: "MIA", city: "Miami", country: "USA" }, to: { code: "MIA", city: "Miami", country: "USA" } },
  ],
  AE: [
    { from: { code: "DXB", city: "Dubai", country: "UAE" }, to: { code: "DXB", city: "Dubai", country: "UAE" } },
    { from: { code: "DXB", city: "Dubai", country: "UAE" }, to: { code: "AUH", city: "Abu Dhabi", country: "UAE" } },
    { from: { code: "AUH", city: "Abu Dhabi", country: "UAE" }, to: { code: "AUH", city: "Abu Dhabi", country: "UAE" } },
  ],
  FR: [
    { from: { code: "CDG", city: "Paris", country: "France" }, to: { code: "CDG", city: "Paris", country: "France" } },
    { from: { code: "ORY", city: "Paris", country: "France" }, to: { code: "ORY", city: "Paris", country: "France" } },
  ],
  DE: [
    { from: { code: "FRA", city: "Frankfurt", country: "Germany" }, to: { code: "FRA", city: "Frankfurt", country: "Germany" } },
    { from: { code: "BER", city: "Berlin", country: "Germany" }, to: { code: "BER", city: "Berlin", country: "Germany" } },
  ],
  ES: [
    { from: { code: "MAD", city: "Madrid", country: "Spain" }, to: { code: "MAD", city: "Madrid", country: "Spain" } },
    { from: { code: "BCN", city: "Barcelona", country: "Spain" }, to: { code: "BCN", city: "Barcelona", country: "Spain" } },
  ],
  IT: [
    { from: { code: "FCO", city: "Rome", country: "Italy" }, to: { code: "FCO", city: "Rome", country: "Italy" } },
    { from: { code: "MXP", city: "Milan", country: "Italy" }, to: { code: "MXP", city: "Milan", country: "Italy" } },
  ],
  ZA: [
    { from: { code: "CPT", city: "Cape Town", country: "South Africa" }, to: { code: "CPT", city: "Cape Town", country: "South Africa" } },
    { from: { code: "JNB", city: "Johannesburg", country: "South Africa" }, to: { code: "JNB", city: "Johannesburg", country: "South Africa" } },
  ],
  KE: [{ from: { code: "NBO", city: "Nairobi", country: "Kenya" }, to: { code: "NBO", city: "Nairobi", country: "Kenya" } }],
  GH: [{ from: { code: "ACC", city: "Accra", country: "Ghana" }, to: { code: "ACC", city: "Accra", country: "Ghana" } }],
  IN: [
    { from: { code: "DEL", city: "Delhi", country: "India" }, to: { code: "DEL", city: "Delhi", country: "India" } },
    { from: { code: "BOM", city: "Mumbai", country: "India" }, to: { code: "BOM", city: "Mumbai", country: "India" } },
  ],
  AU: [{ from: { code: "SYD", city: "Sydney", country: "Australia" }, to: { code: "SYD", city: "Sydney", country: "Australia" } }],
  CA: [{ from: { code: "YYZ", city: "Toronto", country: "Canada" }, to: { code: "YYZ", city: "Toronto", country: "Canada" } }],
};

const DEFAULT_CAR_ROUTES = CAR_ROUTES_BY_GEO.GB;
const CAR_CACHE_KEY = "car_rentals_grid_v2"; // ← bumped version to invalidate old broken cache
const CAR_CACHE_TTL_MS = 30 * 60 * 1000;

// ─── Geo detection ─────────────────────────────────────────────────────
function getUserGeoCountry(): string | null {
  if (typeof window === "undefined") return null;
  const directKeys = ["geo_country", "geoCountry", "country", "user_country", "userCountry"];
  for (const k of directKeys) {
    const v = localStorage.getItem(k);
    if (v && /^[A-Z]{2}$/i.test(v)) return v.toUpperCase();
  }
  const currencyMap: Record<string, string> = {
    NGN: "NG", GBP: "GB", USD: "US", EUR: "FR", CAD: "CA", AUD: "AU", ZAR: "ZA", KES: "KE",
  };
  for (const k of ["selectedCurrency", "currency", "currencyCode"]) {
    const v = localStorage.getItem(k)?.toUpperCase();
    if (v && currencyMap[v]) return currencyMap[v];
  }
  return null;
}

function pickCarRoutes(geo: string | null) {
  if (geo && CAR_ROUTES_BY_GEO[geo]) return CAR_ROUTES_BY_GEO[geo];
  return DEFAULT_CAR_ROUTES;
}

function readCarCache(): { cars: CarDisplay[]; timestamp: number; currency: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CAR_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CAR_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCarCache(cars: CarDisplay[], currencyCode: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CAR_CACHE_KEY,
      JSON.stringify({ cars, timestamp: Date.now(), currency: currencyCode }),
    );
  } catch {}
}

function formatIsoDuration(d?: string): string {
  if (!d) return "";
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return d;
  const days = parseInt(m[1] || "0");
  const hours = parseInt(m[2] || "0");
  const mins = parseInt(m[3] || "0");
  const parts: string[] = [];
  if (days) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (mins) parts.push(`${mins} min`);
  return parts.join(" ") || "";
}

// ─── Currency helpers ──────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", GBP: "£", USD: "$", EUR: "€",
  CAD: "C$", AUD: "A$", JPY: "¥", CNY: "¥", ZAR: "R", KES: "KSh",
};

function normalizeCurrencyCode(raw?: string): string {
  if (!raw) return "GBP";
  const cleaned = String(raw).trim().toUpperCase();
  // Some Amadeus responses use 3-letter ISO; if it looks weird, default
  if (!/^[A-Z]{3}$/.test(cleaned)) return "GBP";
  return cleaned;
}

function extractRawPrice(item: any): { amount: number; currency: string } {
  // Walk through every possible price field Amadeus might return
  // and pull out BOTH the amount AND the currency it's denominated in.
  const candidates: Array<{ amount: any; currency: any }> = [
    { amount: item?.realData?.finalPrice, currency: item?.realData?.currency },
    { amount: item?.final_amount,         currency: item?.currency },
    { amount: item?.final_price,          currency: item?.currency },
    { amount: item?.totalAmount,          currency: item?.currency },
    { amount: item?.quotation?.monetaryAmount, currency: item?.quotation?.currencyCode },
    { amount: item?.quotation?.base?.monetaryAmount, currency: item?.quotation?.currencyCode },
    { amount: item?.converted?.monetaryAmount, currency: item?.converted?.currencyCode },
    { amount: item?.converted?.base?.monetaryAmount, currency: item?.converted?.currencyCode },
    { amount: item?.original_price,       currency: item?.original_currency },
    { amount: item?.base_price,           currency: item?.currency },
    { amount: item?.price?.total,         currency: item?.price?.currency },
    { amount: item?.price?.base,          currency: item?.price?.currency },
    { amount: item?.price,                currency: item?.currency },
  ];

  for (const c of candidates) {
    if (c.amount === undefined || c.amount === null || c.amount === "") continue;
    const num = parseFloat(String(c.amount).replace(/,/g, ""));
    if (!isNaN(num) && num > 0) {
      return { amount: num, currency: normalizeCurrencyCode(c.currency) };
    }
  }
  return { amount: 0, currency: "GBP" };
}

const CarRentals: React.FC<CarRentalsProps> = ({ onSearch }) => {
  // ✅ Added convertPrice from useLanguage
  const { t, currency, convertPrice } = useLanguage();
  const router = useRouter();
  const [cars, setCars] = useState<CarDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = currency?.symbol || "£";
  const userCurrencyCode = currency?.code || "NGN";
  const brandBlue = "#32A6D7";
  const brandBlueLight = "#e6f4fa";

  const carImages = [
    { id: "1", name: "Mercedes-Benz S-Class", image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800" },
    { id: "2", name: "BMW 7 Series", image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800" },
    { id: "3", name: "Audi A8", image: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=800" },
    { id: "4", name: "Range Rover Velar", image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&q=80&w=800" },
    { id: "5", name: "Porsche Cayenne", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800" },
    { id: "6", name: "Tesla Model S", image: "https://images.unsplash.com/photo-1617788138017-80ad2915138d?auto=format&fit=crop&q=80&w=800" },
  ];

  // ─── Fetch real cars + convert prices ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const loadCars = async () => {
      setLoading(true);
      setError(null);

      // 1. Cache hit — but only if the cached currency matches current
      const cached = readCarCache();
      if (cached && cached.cars.length > 0 && cached.currency === userCurrencyCode) {
        console.log("✅ Cars loaded from cache:", cached.cars.length, cached.currency);
        if (!cancelled) {
          setCars(cached.cars);
          setLoading(false);
        }
        return;
      }

      // 2. Build search params
      const geo = getUserGeoCountry();
      const routes = pickCarRoutes(geo);
      console.log("🚗 Car grid — geo:", geo || "unknown", "routes:", routes.length);

      const today = new Date();
      const pickup = new Date(today);
      pickup.setDate(today.getDate() + 7);
      pickup.setHours(10, 0, 0, 0);

      const dropoff = new Date(pickup);
      dropoff.setDate(pickup.getDate() + 3);
      dropoff.setHours(10, 0, 0, 0);

      const pickupISO = pickup.toISOString();
      const dropoffISO = dropoff.toISOString();

      // 3. Fetch every route in parallel
      try {
        const responses = await Promise.all(
          routes.map(async (route) => {
            try {
              const r = await api.searchAndTransformCarRentals(
                {
                  pickupLocationCode: route.from.code,
                  pickupDateTime: pickupISO,
                  dropoffLocationCode: route.to.code,
                  dropoffDateTime: dropoffISO,
                  currency: "GBP",   // request GBP from backend; we convert client-side
                  passengers: 2,
                  transferType: "PRIVATE",
                },
                `${route.from.city}, ${route.from.country}`,
                `${route.to.city}, ${route.to.country}`,
              );
              return { route, response: r };
            } catch (err) {
              console.warn(`Car route ${route.from.code}→${route.to.code} failed:`, err);
              return { route, response: null };
            }
          }),
        );

        if (cancelled) return;

        const seen = new Set<string>();
        const mapped: CarDisplay[] = [];

        for (const { route, response } of responses) {
          if (!response?.success || !response.results?.length) continue;

          let taken = 0;
          for (const item of response.results as any[]) {
            const id = item.id || item.realData?.offerId;
            if (!id || seen.has(id)) continue;
            seen.add(id);

            // ✅ FIX: extract raw amount + its TRUE currency
            const { amount: rawAmount, currency: sourceCurrency } = extractRawPrice(item);

            // ✅ FIX: convert to the user's selected currency before display
            let convertedAmount = rawAmount;
            if (rawAmount > 0 && sourceCurrency !== userCurrencyCode) {
              try {
                const c = await convertPrice(rawAmount, sourceCurrency);
                if (typeof c === "number" && c > 0) convertedAmount = c;
                console.log(
                  `💱 Car ${id}: ${rawAmount} ${sourceCurrency} → ${convertedAmount.toFixed(0)} ${userCurrencyCode}`,
                );
              } catch (err) {
                console.warn(
                  `Failed to convert ${rawAmount} ${sourceCurrency} → ${userCurrencyCode}, keeping raw`,
                  err,
                );
              }
            }

            // Drop vehicles we couldn't price at all
            if (convertedAmount <= 0) {
              console.warn(`⚠️ Skipping car ${id} — no price`);
              continue;
            }

            const vehicleDesc = item.vehicle?.description || item.title || "Vehicle";
            const baggageCount =
              typeof item.baggage === "string"
                ? item.baggage
                : item.vehicle?.baggages?.reduce(
                    (s: number, b: any) => s + (b.count || 0),
                    0,
                  )?.toString() || "2";

            mapped.push({
              id,
              name: vehicleDesc,
              provider: item.provider || item.serviceProvider?.name || "Car Rental",
              vehicleCategory: item.vehicleCategory || item.vehicle?.category || "Standard",
              vehicleDescription: vehicleDesc,
              price: Math.round(convertedAmount),   // ← now in user's currency
              rating: item.rating || 4.5,
              reviews: Math.floor(Math.random() * 300) + 150,
              image: item.image || carImages[mapped.length % carImages.length].image,
              providerLogo: item.providerLogo || item.serviceProvider?.logoUrl,
              amenities: item.amenities || getDefaultAmenitiesForCar(item.provider || ""),
              seats: item.seats || item.vehicle?.seats?.[0]?.count || 4,
              baggage: baggageCount,
              transmission: item.transmission || t("cars.automatic"),
              pickupLocation: item.pickupLocation || route.from.code,
              dropoffLocation: item.dropoffLocation || route.to.code,
              pickupDateTime: item.pickupDateTime || pickupISO,
              dropoffDateTime: item.dropoffDateTime || dropoffISO,
              duration: formatIsoDuration(item.duration) || "3 days",
              distance: item.distance,
              isRefundable: item.isRefundable ?? true,
              cityName: route.from.city,
              locationCode: route.from.code,
              location: `${route.from.city} → ${route.to.city}`,
              description:
                item.subtitle ||
                `Premium ${vehicleDesc} from ${route.from.city} to ${route.to.city}`,
            });

            taken++;
            if (taken >= 3) break;
          }
        }

        if (mapped.length === 0) {
          throw new Error("No cars returned by API — using fallback");
        }

        mapped.sort((a, b) => (b.image ? 1 : 0) - (a.image ? 1 : 0));

        setCars(mapped);
        writeCarCache(mapped, userCurrencyCode);
        console.log("✅ Cars loaded from API:", mapped.length, userCurrencyCode);
      } catch (err: any) {
        if (cancelled) return;
        console.warn("API car fetch failed, using fallback:", err?.message);
        try {
          const fallback = generateFallbackCars();
          setCars(fallback);
          setError(null);
        } catch (fallbackErr: any) {
          setError(fallbackErr.message || t("cars.errorFallback"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCars();
    return () => {
      cancelled = true;
    };
  }, [t, userCurrencyCode, convertPrice]);

  // ─── Fallback: NGN-denominated prices ──────────────────────────────
  const generateFallbackCars = (): CarDisplay[] => {
    const geo = getUserGeoCountry();
    const routes = pickCarRoutes(geo);

    const today = new Date();
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + 7);
    pickupDate.setHours(10, 0, 0, 0);

    const dropoffDate = new Date(pickupDate);
    dropoffDate.setDate(pickupDate.getDate() + 3);
    dropoffDate.setHours(10, 0, 0, 0);

    const pickupDateTime = pickupDate.toISOString();
    const dropoffDateTime = dropoffDate.toISOString();

    const allCars: CarDisplay[] = [];

    routes.forEach((route, routeIndex) => {
      const car = carImages[routeIndex % carImages.length];

      const isLuxury =
        car.name.includes("Mercedes") || car.name.includes("BMW") || car.name.includes("Audi");
      const isSUV = car.name.includes("Range") || car.name.includes("Porsche");
      const isElectric = car.name.includes("Tesla");

      // ✅ FIX: realistic NGN prices for the fallback (3-day rental, Nigeria rates)
      const isNigeria = geo === "NG" || userCurrencyCode === "NGN";
      const basePrice = isNigeria
        ? isLuxury ? 650000 : isSUV ? 750000 : isElectric ? 600000 : 500000
        : isLuxury ? 360 : isSUV ? 420 : isElectric ? 330 : 285;

      const discountedPrice = isNigeria
        ? isLuxury ? 550000 : isSUV ? 650000 : isElectric ? 500000 : 420000
        : isLuxury ? 297 : isSUV ? 345 : isElectric ? 267 : 237;

      const seats = isSUV ? 5 : isElectric ? 5 : 4;
      const baggage = isSUV ? "3" : isElectric ? "2" : "2";

      const provider = routeIndex % 2 === 0 ? "GroundSpan" : "Sixt Ride";
      const rating = 4.7 + Math.random() * 0.3;
      const reviews = Math.floor(Math.random() * 400) + 200;

      allCars.push({
        id: `car-${routeIndex}-${Date.now()}`,
        name: car.name,
        provider,
        vehicleCategory: isLuxury
          ? "Luxury Sedan"
          : isSUV
          ? "Luxury SUV"
          : isElectric
          ? "Electric"
          : "Premium",
        vehicleDescription: car.name,
        location: `${route.from.city} → ${route.to.city}`,
        cityName: route.from.city,
        locationCode: route.from.code,
        price: basePrice,
        discountedPrice,
        rating: parseFloat(rating.toFixed(1)),
        reviews,
        image: car.image,
        amenities: getDefaultAmenitiesForCar(provider),
        seats,
        baggage: `${baggage} ${t("cars.bags")}`,
        transmission: t("cars.automatic"),
        pickupLocation: route.from.code,
        dropoffLocation: route.to.code,
        pickupDateTime,
        dropoffDateTime,
        duration: "3 days",
        distance: getDistanceForRoute(route.from.city, route.to.city),
        isRefundable: true,
        description: `Premium ${car.name} from ${route.from.city} to ${route.to.city}`,
      });
    });

    return allCars;
  };

  const getDistanceForRoute = (fromCity: string, toCity: string): string => {
    const distances: { [key: string]: string } = {
      "London-Paris": "294 MI",
      "Dubai-Abu Dhabi": "82 MI",
      "New York-Los Angeles": "2,789 MI",
    };
    return distances[`${fromCity}-${toCity}`] || "200 MI";
  };

  const getDefaultAmenitiesForCar = (provider: string): string[] => {
    const base = [
      t("cars.airConditioning"),
      t("cars.professionalDriver"),
      t("cars.meetGreet"),
      t("cars.flightTracking"),
    ];
    if (provider.includes("GroundSpan")) {
      return [...base, t("cars.waterBottles"), t("cars.wifi")];
    }
    return [...base, t("cars.phoneCharger"), t("cars.musicSystem")];
  };

  const handleCarClick = (car: CarDisplay) => {
    const today = new Date();
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + 7);
    pickupDate.setHours(10, 0, 0, 0);

    const dropoffDate = new Date(pickupDate);
    dropoffDate.setDate(pickupDate.getDate() + 3);
    dropoffDate.setHours(10, 0, 0, 0);

    const pickupDateStr = pickupDate.toISOString().split("T")[0];
    const dropoffDateStr = dropoffDate.toISOString().split("T")[0];
    const pickupTime = "10:00";
    const dropoffTime = "10:00";

    let pickupCity = car.cityName || "London";
    let dropoffCity = "Paris";
    if (car.location && car.location.includes("→")) {
      const parts = car.location.split("→");
      if (parts.length > 1) {
        pickupCity = parts[0].trim();
        dropoffCity = parts[1].trim();
      }
    }

    const pickupCode = car.pickupLocation || "LHR";
    const dropoffCode = car.dropoffLocation || "CDG";

    if (onSearch) {
      onSearch({
        pickupLocationCode: pickupCode,
        dropoffLocationCode: dropoffCode,
      });
    } else {
      const location = `${pickupCity} to ${dropoffCity}`;
      router.push(
        `/search?type=car-rentals&location=${encodeURIComponent(
          location,
        )}&pickupCode=${pickupCode}&dropoffCode=${dropoffCode}&pickupDate=${pickupDateStr}&dropoffDate=${dropoffDateStr}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&passengers=${
          car.seats || 2
        }&currency=${userCurrencyCode}`,
      );
    }
  };

  const handleSearchMore = () => {
    try {
      sessionStorage.removeItem(CAR_CACHE_KEY);
    } catch {}
    setLoading(true);
    setError(null);
    setTimeout(() => {
      try {
        const fresh = generateFallbackCars();
        setCars(fresh);
      } catch (e: any) {
        setError(e.message || t("cars.errorFallback"));
      }
      setLoading(false);
    }, 500);
  };

  // ─── Helpers for display ───────────────────────────────────────────
  const formatPriceDisplay = (amount: number) =>
    `${currencySymbol}${Math.round(amount).toLocaleString()}`;

  const isLoading = loading;

  // ─── Loading skeleton ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 pt-8 pb-0">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t("cars.title")}</h2>
          <p className="text-gray-600 mt-1 text-sm">{t("cars.subtitle")}</p>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse flex-shrink-0"
              style={{ width: "calc((100% - 2rem) / 3)", minWidth: "320px" }}
            >
              <div className="h-64 bg-gray-200"></div>
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-5 bg-gray-200 rounded w-4/5" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="px-4 md:px-8 lg:px-16 pt-8 pb-4">
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("cars.title")}</h2>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleSearchMore}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t("cars.tryAgain")}
          </button>
        </div>
      </section>
    );
  }

  if (cars.length === 0) {
    return (
      <section className="px-4 md:px-8 lg:px-16 pt-8 pb-4">
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("cars.title")}</h2>
          <p className="text-gray-500 text-sm">No cars available right now.</p>
        </div>
      </section>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────
  return (
    <section className="px-4 md:px-8 lg:px-16 pt-8 pb-4">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t("cars.title")}</h2>
          <p className="text-gray-600 mt-1 text-sm">{t("cars.subtitle")}</p>
        </div>
        <button
          onClick={() => router.push(`/search?type=car-rentals&currency=${userCurrencyCode}`)}
          className="text-sm font-semibold text-[#33a8da] hover:underline flex items-center gap-1"
        >
          {t("cars.seeMore")}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="relative group/carousel">
        <button
          onClick={() => {
            const el = document.getElementById("cars-carousel");
            if (el) el.scrollBy({ left: -el.clientWidth * 0.8, behavior: "smooth" });
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition hidden md:flex"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          id="cars-carousel"
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cars.map((car) => (
            <div
              key={car.id}
              onClick={() => handleCarClick(car)}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer snap-start flex-shrink-0"
              style={{ width: "calc((100% - 2rem) / 3)", minWidth: "320px" }}
            >
              <div className="absolute top-3 right-3 z-10">
                <div
                  className="text-white font-bold px-3.5 py-1.5 rounded-full text-sm shadow-md flex items-center gap-1"
                  style={{ backgroundColor: brandBlue }}
                >
                  {/* ✅ FIX: formatted with .toLocaleString() */}
                  {formatPriceDisplay(car.discountedPrice || car.price)}
                  <span className="text-[10px] font-normal opacity-90">{t("cars.perTrip")}</span>
                </div>
              </div>

              {car.discountedPrice && (
                <div className="absolute top-3 left-3 z-10 bg-red-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  {t("cars.save")}{" "}
                  {Math.round(((car.price - car.discountedPrice) / car.price) * 100)}%
                </div>
              )}

              <div className="aspect-[16/10] bg-gradient-to-br from-gray-900 to-gray-700 overflow-hidden">
                <img
                  src={car.image}
                  alt={car.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = carImages[0].image;
                  }}
                />
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-1 group-hover:text-[#33a8da] transition">
                    {car.name}
                  </h3>
                  <span className="text-[10px] font-semibold text-gray-500 ml-2">
                    {car.provider}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-2">
                  {car.vehicleCategory} • {car.seats} {t("cars.seats")} • {car.baggage}
                </p>

                <div className="flex items-center gap-1 text-[11px] text-gray-600 mb-2">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium truncate">{car.location}</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex items-center px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: brandBlueLight }}
                  >
                    <div className="flex text-yellow-400 mr-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-2.5 h-2.5 ${
                            i < Math.floor(car.rating) ? "fill-current" : "text-gray-200"
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: brandBlue }}>
                      {car.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    ({car.reviews.toLocaleString()})
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {car.amenities.slice(0, 2).map((amenity, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                  {car.amenities.length > 2 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      +{car.amenities.length - 2}
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-gray-500 leading-tight">
                      {t("cars.perTrip")}
                    </p>
                    {/* ✅ FIX: formatted with .toLocaleString() */}
                    <p className="text-lg font-bold text-gray-900 leading-tight">
                      {formatPriceDisplay(car.discountedPrice || car.price)}
                    </p>
                  </div>
                  <button
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200"
                    style={{ backgroundColor: brandBlue, color: "white" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#2a8bb5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = brandBlue;
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCarClick(car);
                    }}
                  >
                    {t("cars.bookTransfer")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const el = document.getElementById("cars-carousel");
            if (el) el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center hover:bg-gray-50 transition hidden md:flex"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {cars.length > 3 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {cars.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = document.getElementById("cars-carousel");
                if (el) {
                  const cardWidth = el.scrollWidth / cars.length;
                  el.scrollTo({ left: i * cardWidth, behavior: "smooth" });
                }
              }}
              className="w-1.5 h-1.5 rounded-full bg-gray-300 hover:bg-gray-500 transition"
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        #cars-carousel::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default CarRentals;