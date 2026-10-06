// Create a new file: components/SearchFilters.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';

export type FilterType = 'flights' | 'hotels' | 'car-rentals';

interface FlightFilters {
  airlines: string[];
  maxStops: number;
  priceRange: { min: number; max: number };
  departureTime: { start: string; end: string };
  arrivalTime: { start: string; end: string };
  duration: { min: number; max: number };
  cabinClass: string[];
}

interface HotelFilters {
  priceRange: { min: number; max: number };
  popular: string[];
  propertyType: string[];
  starRating: number[];
  bedrooms: string[];
  roomPackages: string[];
  guestRating: string | null;
  propertyFacilities: string[];
  bedTypes: string[];
  roomFeatures: string[];
  roomFacilities: string[];
  propertyFeatures: string[];
  guestImpressions: string[];
  roomSize: string | null;
  payment: string | null;
  bookingPolicy: string[];
  discounts: string[];
  brands: string[];
  reviews: string[];
  accessibility: string[];
}

interface CarRentalFilters {
  priceRange: { min: number; max: number };
  vehicleType: string[];
  transmission: string[];
  seats: number[];
  fuelType: string[];
  rentalCompanies: string[];
}

export interface SearchFilters {
  flights: FlightFilters;
  hotels: HotelFilters;
  'car-rentals': CarRentalFilters;
}

interface SearchFiltersProps {
  type: FilterType;
  results: any[];
  searchParams: any;
  onApplyFilters: (filters: any) => void;
  onResetFilters: () => void;
}

/* ═══════════════════════════════════════════════════════════════════
   HOTEL HELPERS — extraction from Amadeus-shaped results
   ═══════════════════════════════════════════════════════════════════ */

const NAIRA = '\u20A6';

const parsePriceSafe = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''));
  return isNaN(n) ? null : n;
};

const tc = (s: string) =>
  s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

const AMENITY_BANK: { re: RegExp; label: string }[] = [
  { re: /\bwi[\s-]?fi|wireless|internet/i, label: 'Free WiFi' },
  { re: /\bpool|swimming/i, label: 'Swimming Pool' },
  { re: /\bspa\b/i, label: 'Spa' },
  { re: /\bgym|fitness/i, label: 'Gym' },
  { re: /\brestaurant/i, label: 'Restaurant' },
  { re: /\bbar\b|lounge/i, label: 'Bar/Lounge' },
  { re: /\bparking|garage/i, label: 'Parking available' },
  { re: /\bairport.*shuttle|shuttle|airport.*transfer/i, label: 'Airport Transfer' },
  { re: /\bair.?condition|a\/c\b/i, label: 'Air Conditioning' },
  { re: /\bpet.?friendly|pets allowed/i, label: 'Pet Friendly' },
  { re: /\b24.?hour.*front|24.?hr.*reception/i, label: '24-Hour Front Desk' },
  { re: /\bnon.?smok/i, label: 'Non-Smoking' },
  { re: /\bbreakfast\b/i, label: 'Breakfast Available' },
  { re: /\bkitchen|kitchenette/i, label: 'Kitchen' },
  { re: /\blaundry/i, label: 'Laundry Service' },
  { re: /\bbusiness.?(center|centre)/i, label: 'Business Center' },
  { re: /\bconcierge/i, label: 'Concierge' },
  { re: /\belevator|lift\b/i, label: 'Elevator' },
  { re: /\bprivate.?bathroom|en.?suite/i, label: 'Private bathroom' },
  { re: /\bprivate.?toilet/i, label: 'Private toilet' },
  { re: /\bbalcony/i, label: 'Balcony' },
  { re: /\bterrace/i, label: 'Terrace' },
];

const ACCESS_BANK: { re: RegExp; label: string }[] = [
  { re: /wheelchair|wheel.?chair/i, label: 'Wheelchairs available' },
  { re: /accessible.?room|rooms? for disabled/i, label: 'Accessible rooms available' },
  { re: /accessible.?shower/i, label: 'Accessible shower' },
  { re: /braille/i, label: 'Braille signs' },
  { re: /handrails?.*stair/i, label: 'Handrails on stairs' },
  { re: /handrails?.*hallway/i, label: 'Handrails in hallways' },
  { re: /visual.?alarm/i, label: 'Visual alarm devices in hallways' },
  { re: /assistive.?listening/i, label: 'Assistive listening devices' },
  { re: /sign.?language/i, label: 'Employees proficient with sign language' },
  { re: /stair.?free/i, label: 'Stair-free main entrance' },
  { re: /pool.?hoist|pool.?lift/i, label: 'Pool hoist available' },
  { re: /pool.?ramp/i, label: 'Pool ramp available' },
  { re: /accessible.?facilit/i, label: 'Accessible facilities' },
];

const FEATURE_BANK: { re: RegExp; label: string }[] = [
  { re: /family.?friendly|family.?room|children/i, label: 'Family-friendly' },
  { re: /great.?view|scenic|panoramic/i, label: 'Great views' },
  { re: /romantic|honeymoon|couple/i, label: 'Romantic vibes' },
  { re: /ideal.?location|central|heart of/i, label: 'Ideal location' },
  { re: /lots? to do|activities|entertainment/i, label: 'Lots to do' },
  { re: /sparkling.?clean|immaculate|spotless/i, label: 'Sparkling clean' },
];

const matchBank = (text: string, bank: { re: RegExp; label: string }[]) => {
  const hits = new Set<string>();
  for (const { re, label } of bank) if (re.test(text)) hits.add(label);
  return Array.from(hits);
};

const mapBoard = (bt: string | undefined): string | null => {
  if (!bt) return null;
  const k = bt.toUpperCase().replace(/\s+/g, '_');
  if (/ROOM_ONLY/.test(k)) return 'Room Only';
  if (/BREAKFAST/.test(k)) return 'Breakfast Included';
  if (/HALF_BOARD/.test(k)) return 'Breakfast & Dinner Included';
  if (/FULL_BOARD/.test(k)) return 'Full Board';
  if (/ALL_INCLUSIVE/.test(k)) return 'All Inclusive';
  return null;
};

interface HotelOptions {
  price: { min: number; max: number; hasData: boolean };
  popular: { label: string; count: number }[];
  propertyTypes: string[];
  starRatings: number[];
  bedrooms: string[];
  roomPackages: string[];
  guestRatings: { value: number; label: string; count: number }[];
  propertyFacilities: { label: string; count: number }[];
  bedTypes: string[];
  roomFeatures: string[];
  roomFacilities: { label: string; count: number }[];
  propertyFeatures: { label: string; count: number }[];
  guestImpressions: { label: string; count: number }[];
  roomSizes: number[];
  paymentMethods: string[];
  bookingPolicies: string[];
  discounts: string[];
  brands: string[];
  reviewBuckets: string[];
  accessibility: { label: string; count: number }[];
}

const emptyHotelOptions: HotelOptions = {
  price: { min: 0, max: 0, hasData: false },
  popular: [], propertyTypes: [], starRatings: [], bedrooms: [],
  roomPackages: [], guestRatings: [], propertyFacilities: [], bedTypes: [],
  roomFeatures: [], roomFacilities: [], propertyFeatures: [], guestImpressions: [],
  roomSizes: [], paymentMethods: [], bookingPolicies: [], discounts: [],
  brands: [], reviewBuckets: [], accessibility: [],
};

function extractHotelOptions(results: any[]): HotelOptions {
  if (!Array.isArray(results) || !results.length) {
    console.log('🔍 [extractHotelOptions] results is empty:', results);
    return emptyHotelOptions;
  }

  // 🔍 DEBUG — log the FIRST result so we can see the real shape
  console.log('🔍 [extractHotelOptions] FIRST RESULT:', results[0]);
  console.log('🔍 [extractHotelOptions] keys:', Object.keys(results[0] || {}));
  console.log('🔍 [extractHotelOptions] realData keys:',
    results[0]?.realData ? Object.keys(results[0].realData) : 'NO realData');

  const priceMin = { v: Infinity };
  const priceMax = { v: 0 };
  let hasPrice = false;

  const bump = (map: Map<string, number>, k: string) =>
    map.set(k, (map.get(k) || 0) + 1);
  const add = (set: Set<string>, v: string) => v && set.add(v);

  const popular = new Map<string, number>();
  const propertyTypes = new Set<string>();
  const starRatings = new Set<number>();
  const bedrooms = new Set<string>();
  const roomPackages = new Set<string>();
  const guestRatings = new Map<number, number>();
  const propertyFacilities = new Map<string, number>();
  const bedTypes = new Set<string>();
  const roomFeatures = new Set<string>();
  const roomFacilities = new Map<string, number>();
  const propertyFeatures = new Map<string, number>();
  const guestImpressions = new Map<string, number>();
  const roomSizes = new Set<number>();
  const paymentMethods = new Set<string>();
  const bookingPolicies = new Set<string>();
  const discounts = new Set<string>();
  const brands = new Set<string>();
  const reviewBuckets = new Set<string>();
  const accessibility = new Map<string, number>();

  for (const r of results) {
    if (!r) continue;
    const real = r.realData || r;
    const hotel = real.hotel || r.hotel || {};
    const offers: any[] = real.offers || r.offers || [];

    /* ═══ PRICE — check every field HotelDetails uses ═══ */
    const pCandidate =
      r.originalPriceAmount ??
      r.original_amount ??
      r.final_amount ??
      r.price ??
      real.originalPriceAmount ??
      real.original_amount ??
      offers[0]?.price?.total ??
      offers[0]?.price?.base;
    const p = parsePriceSafe(pCandidate);
    if (p && p > 0) {
      priceMin.v = Math.min(priceMin.v, p);
      priceMax.v = Math.max(priceMax.v, p);
      hasPrice = true;
    }

    /* ═══ STAR RATING — top-level rating (HotelDetails uses it) ═══ */
    const star =
      r.rating ??
      r.starRating ??
      r.stars ??
      hotel.rating ??
      real.hotel?.rating;
    if (star != null) {
      const n = Number(star);
      if (!isNaN(n) && n >= 1 && n <= 5) starRatings.add(Math.round(n));
    }

    /* ═══ GUEST RATING ═══ */
    const gr =
      r.guestRating ??
      r.reviewScore ??
      hotel.guestRating ??
      real.hotel?.guestRating;
    if (gr != null) {
      const n = Number(gr);
      if (!isNaN(n) && n > 0) {
        const bucket = Math.round(n * 2) / 2;
        guestRatings.set(bucket, (guestRatings.get(bucket) || 0) + 1);
      }
    }

    /* ═══ REVIEWS ═══ */
    const reviews = r.totalReviews ?? hotel.totalReviews ?? real.hotel?.totalReviews;
    if (typeof reviews === 'number') {
      if (reviews >= 500) reviewBuckets.add('500+');
      if (reviews >= 200) reviewBuckets.add('200+');
      if (reviews >= 100) reviewBuckets.add('100+');
    }

    /* ═══ BRAND — check top-level too ═══ */
    const brand =
      r.chainName ??
      r.chainCode ??
      r.brand ??
      hotel.chainName ??
      hotel.chainCode;
    if (typeof brand === 'string' && brand.trim()) add(brands, tc(brand));

    /* ═══ PROPERTY TYPE ═══ */
    const pType = r.propertyType ?? hotel.type ?? real.hotel?.type;
    if (typeof pType === 'string') add(propertyTypes, tc(pType));

    /* ═══ AMENITIES — top-level `r.amenities` is where HotelDetails reads ═══ */
    const amenSources: any[] = [
      r.amenities,
      hotel.amenities,
      real.hotel?.amenities,
    ];
    const amenStrings: string[] = [];
    for (const src of amenSources) {
      if (!Array.isArray(src)) continue;
      for (const a of src) {
        if (!a) continue;
        if (typeof a === 'string') amenStrings.push(a);
        else if (typeof a?.name === 'string') amenStrings.push(a.name);
        else if (typeof a?.description?.text === 'string') amenStrings.push(a.description.text);
        else if (typeof a?.code === 'string') amenStrings.push(a.code);
      }
    }
    const amenText = amenStrings.join(' | ');
    matchBank(amenText, AMENITY_BANK).forEach((l) => bump(propertyFacilities, l));
    matchBank(amenText, ACCESS_BANK).forEach((l) => bump(accessibility, l));

    /* ═══ DESCRIPTION scan — subtitle + description ═══ */
    const desc =
      (typeof r.subtitle === 'string' ? r.subtitle : '') ||
      (typeof r.description === 'string' ? r.description : '') ||
      (typeof hotel.description === 'string' ? hotel.description : '') ||
      hotel.description?.text ||
      real.hotel?.description?.text ||
      '';
    if (desc) {
      matchBank(desc, FEATURE_BANK).forEach((l) => bump(propertyFeatures, l));
      matchBank(desc, FEATURE_BANK).forEach((l) => bump(guestImpressions, l));
      matchBank(desc, ACCESS_BANK).forEach((l) => bump(accessibility, l));
    }

    /* ═══ PER-OFFER (Amadeus shape) ═══ */
    let hasFreeCancel = false;
    let hasBreakfast = false;

    for (const o of offers) {
      const t = o?.room?.typeEstimated || {};

      if (t?.bedType) add(bedTypes, tc(t.bedType));
      if (typeof t?.beds === 'string') add(bedTypes, tc(t.beds));
      if (t?.category) add(roomFeatures, tc(t.category));

      const size = t?.size ?? t?.roomSize;
      if (size != null) {
        const n = Number(size);
        if (!isNaN(n) && n > 0) roomSizes.add(Math.round(n));
      }

      const bedRoomCount = t?.bedrooms ?? o?.room?.bedrooms;
      if (bedRoomCount != null) {
        const n = Number(bedRoomCount);
        if (!isNaN(n) && n > 0) {
          bedrooms.add(n === 1 ? '1 bedroom/studio' : n === 2 ? '2 bedrooms' : '3+ bedrooms');
        }
      }

      const boardLabel = mapBoard(o?.boardType || o?.board);
      if (boardLabel) {
        add(roomPackages, boardLabel);
        if (/breakfast/i.test(boardLabel)) hasBreakfast = true;
      }

      const cancelDeadline = o?.policies?.cancellation?.deadline;
      const refundTag = o?.policies?.refundable?.tag;
      if (cancelDeadline || /REFUNDABLE/i.test(refundTag || '')) {
        hasFreeCancel = true;
        add(bookingPolicies, 'Free cancellation');
      }

      const payType = o?.policies?.paymentType || o?.paymentType;
      if (typeof payType === 'string') {
        if (/GUARANTEE|PAY.*HOTEL|HOTEL.*COLLECT/i.test(payType)) add(paymentMethods, 'Pay at Hotel');
        if (/DEPOSIT|PREPAY|CREDIT_CARD/i.test(payType)) add(paymentMethods, 'Prepay Online');
      }

      if (o?.instantConfirmation) add(bookingPolicies, 'Instant confirmation');
      if (o?.policies?.discount || o?.discount) add(discounts, 'Extra Trip Coin Rewards');

      const roomDesc =
        (typeof o?.room?.description === 'string' ? o.room.description : '') ||
        o?.room?.description?.text ||
        o?.description?.text ||
        '';
      if (roomDesc) {
        matchBank(roomDesc, AMENITY_BANK).forEach((l) => bump(roomFacilities, l));
      }
    }

    /* ═══ TOP-LEVEL POLICIES (flat shape) ═══ */
    if (Array.isArray(r.policies)) {
      for (const pol of r.policies) {
        const text = typeof pol === 'string' ? pol : pol?.text || '';
        if (/free.?cancel/i.test(text)) {
          hasFreeCancel = true;
          add(bookingPolicies, 'Free cancellation');
        }
        if (/instant.?confirm/i.test(text)) {
          add(bookingPolicies, 'Instant confirmation');
        }
      }
    }

    /* ═══ POPULAR FILTERS ═══ */
    if (hasFreeCancel || r.freeCancellation || r.refundable) {
      bump(popular, 'Free cancellation');
    }
    if (hasBreakfast || r.breakfastIncluded || r.breakfast) {
      bump(popular, 'Breakfast included');
    }
    if ((star || 0) >= 4) bump(popular, 'Great 9+');
    if (amenText.match(/private.?bathroom/i)) bump(popular, 'Private bathroom');
    if (amenText.match(/private.?toilet/i)) bump(popular, 'Private toilet');
    if (r.familyFriendly || /family/i.test(desc)) bump(popular, 'Family-friendly');
  }

  const out = {
    price: {
      min: hasPrice ? Math.floor(priceMin.v) : 0,
      max: hasPrice ? Math.ceil(priceMax.v) : 0,
      hasData: hasPrice,
    },
    popular: [...popular.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    propertyTypes: [...propertyTypes].sort(),
    starRatings: [...starRatings].sort((a, b) => b - a),
    bedrooms: [...bedrooms].sort(),
    roomPackages: [...roomPackages].sort(),
    guestRatings: [...guestRatings.entries()].map(([value, count]) => ({
      value,
      label:
        value >= 9 ? `Great ${value}+` :
        value >= 8 ? `Very Good ${value}+` :
        value >= 7 ? `Good ${value}+` : `${value}+`,
      count,
    })).sort((a, b) => b.value - a.value),
    propertyFacilities: [...propertyFacilities.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    bedTypes: [...bedTypes].sort(),
    roomFeatures: [...roomFeatures].sort(),
    roomFacilities: [...roomFacilities.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    propertyFeatures: [...propertyFeatures.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    guestImpressions: [...guestImpressions.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    roomSizes: [...roomSizes].sort((a, b) => a - b),
    paymentMethods: [...paymentMethods].sort(),
    bookingPolicies: [...bookingPolicies].sort(),
    discounts: [...discounts],
    brands: [...brands].sort(),
    reviewBuckets: ['500+', '200+', '100+'].filter((b) => reviewBuckets.has(b)),
    accessibility: [...accessibility.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
  };

  console.log('🔍 [extractHotelOptions] EXTRACTED:', {
    resultsCount: results.length,
    priceHasData: out.price.hasData,
    priceMin: out.price.min,
    priceMax: out.price.max,
    starRatings: out.starRatings,
    propertyFacilities: out.propertyFacilities.length,
    brands: out.brands,
    bedTypes: out.bedTypes,
    roomFeatures: out.roomFeatures,
    accessibility: out.accessibility.length,
    paymentMethods: out.paymentMethods,
    bookingPolicies: out.bookingPolicies,
    roomSizes: out.roomSizes,
    guestRatings: out.guestRatings.length,
  });

  return out;
}

/* ═══════════════════════════════════════════════════════════════════
   HOTEL UI PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

const HotelSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="py-5 border-b border-gray-100">
    <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-900 mb-3">
      {title}
    </h3>
    {children}
  </div>
);

const ShowMore: React.FC<{ initial?: number; step?: number; children: React.ReactNode[] }> = ({
  initial = 4, step = 6, children,
}) => {
  const [n, setN] = useState(initial);
  const shown = children.slice(0, n);
  return (
    <>
      {shown}
      {children.length > n && (
        <button
          type="button"
          onClick={() => setN((v) => v + step)}
          className="text-[#0071c2] hover:underline text-xs font-semibold mt-2 block"
        >
          Show More
        </button>
      )}
    </>
  );
};

const Check: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  count?: number;
}> = ({ checked, onChange, label, count }) => (
  <label className="flex items-start gap-2.5 py-1.5 cursor-pointer group">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0071c2] focus:ring-[#0071c2] cursor-pointer"
    />
    <span className="flex-1 text-[13px] text-gray-700 group-hover:text-gray-900 leading-snug">
      {label}
      {count != null && <span className="text-gray-400 text-[11px] ml-1">({count})</span>}
    </span>
  </label>
);

const RadioRow: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
}> = ({ checked, onChange, label }) => (
  <label className="flex items-start gap-2.5 py-1.5 cursor-pointer group">
    <input
      type="radio"
      checked={checked}
      onChange={onChange}
      className="mt-0.5 w-4 h-4 border-gray-300 text-[#0071c2] focus:ring-[#0071c2] cursor-pointer"
    />
    <span className="flex-1 text-[13px] text-gray-700 group-hover:text-gray-900 leading-snug">
      {label}
    </span>
  </label>
);

const Stars: React.FC<{ count: number }> = ({ count }) => (
  <span className="inline-flex items-center gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-[#febb02]">
        <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z" />
      </svg>
    ))}
  </span>
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

const SearchFilters: React.FC<SearchFiltersProps> = ({
  type,
  results,
  searchParams,
  onApplyFilters,
  onResetFilters,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [availableOptions, setAvailableOptions] = useState<any>({});

  /* Extract hotel options separately (memoized) */
  const hotelOpts = useMemo<HotelOptions>(
    () => (type === 'hotels' ? extractHotelOptions(results || []) : emptyHotelOptions),
    [results, type]
  );

  /* Extract flight/car options + init defaults */
  useEffect(() => {
    if (results.length === 0) return;
    const options: any = {};

    if (type === 'flights') {
      const airlines = new Set<string>();
      const durations: number[] = [];
      const prices: number[] = [];

      results.forEach((result) => {
        if (result.provider) airlines.add(result.provider);
        if (result.duration) {
          const match = result.duration.match(/(\d+)h\s*(\d+)?m?/);
          if (match) {
            const hours = parseInt(match[1]);
            const minutes = match[2] ? parseInt(match[2]) : 0;
            durations.push(hours * 60 + minutes);
          }
        }
        if (result.price) {
          const price = parseFloat(result.price.replace(/[^\d.]/g, ''));
          if (!isNaN(price)) prices.push(price);
        }
      });

      options.airlines = Array.from(airlines);
      options.duration = { min: Math.min(...durations), max: Math.max(...durations) };
      options.price = { min: Math.min(...prices), max: Math.max(...prices) };
      setAvailableOptions(options);
      setActiveFilters({
        airlines: [],
        maxStops: 2,
        priceRange: options.price || { min: 0, max: 100000 },
        departureTime: { start: '00:00', end: '23:59' },
        arrivalTime: { start: '00:00', end: '23:59' },
        duration: options.duration || { min: 0, max: 1440 },
        cabinClass: [],
      });
    } else if (type === 'hotels') {
      setAvailableOptions(hotelOpts);
      setActiveFilters({
        priceRange: { min: hotelOpts.price.min, max: hotelOpts.price.max },
        popular: [],
        propertyType: [],
        starRating: [],
        bedrooms: [],
        roomPackages: [],
        guestRating: null,
        propertyFacilities: [],
        bedTypes: [],
        roomFeatures: [],
        roomFacilities: [],
        propertyFeatures: [],
        guestImpressions: [],
        roomSize: null,
        payment: null,
        bookingPolicy: [],
        discounts: [],
        brands: [],
        reviews: [],
        accessibility: [],
      });
    } else if (type === 'car-rentals') {
      const prices: number[] = [];
      results.forEach((result) => {
        if (result.price) {
          const price = parseFloat(result.price.replace(/[^\d.]/g, ''));
          if (!isNaN(price)) prices.push(price);
        }
      });
      options.price = { min: Math.min(...prices), max: Math.max(...prices) };
      setAvailableOptions(options);
      setActiveFilters({
        priceRange: options.price || { min: 0, max: 100000 },
        vehicleType: [],
        transmission: [],
        seats: [],
        fuelType: [],
        rentalCompanies: [],
      });
    }
  }, [results, type, hotelOpts]);

  /* Sync hotel price range when options load */
  useEffect(() => {
    if (type !== 'hotels') return;
    setActiveFilters((prev: any) => ({
      ...prev,
      priceRange: { min: hotelOpts.price.min, max: hotelOpts.price.max },
    }));
  }, [hotelOpts.price.min, hotelOpts.price.max, type]);

  const handleFilterChange = (filterKey: string, value: any) => {
    setActiveFilters((prev: any) => ({ ...prev, [filterKey]: value }));
  };

  const toggleArray = (key: string, value: any) => {
    setActiveFilters((prev: any) => {
      const cur: any[] = prev[key] || [];
      const has = cur.includes(value);
      return { ...prev, [key]: has ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  };

  const handleApply = () => {
    onApplyFilters(activeFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    if (type === 'flights') {
      setActiveFilters({
        airlines: [],
        maxStops: 2,
        priceRange: availableOptions.price || { min: 0, max: 100000 },
        departureTime: { start: '00:00', end: '23:59' },
        arrivalTime: { start: '00:00', end: '23:59' },
        duration: availableOptions.duration || { min: 0, max: 1440 },
        cabinClass: [],
      });
    } else if (type === 'hotels') {
      setActiveFilters({
        priceRange: { min: hotelOpts.price.min, max: hotelOpts.price.max },
        popular: [],
        propertyType: [],
        starRating: [],
        bedrooms: [],
        roomPackages: [],
        guestRating: null,
        propertyFacilities: [],
        bedTypes: [],
        roomFeatures: [],
        roomFacilities: [],
        propertyFeatures: [],
        guestImpressions: [],
        roomSize: null,
        payment: null,
        bookingPolicy: [],
        discounts: [],
        brands: [],
        reviews: [],
        accessibility: [],
      });
    } else if (type === 'car-rentals') {
      setActiveFilters({
        priceRange: availableOptions.price || { min: 0, max: 100000 },
        vehicleType: [],
        transmission: [],
        seats: [],
        fuelType: [],
        rentalCompanies: [],
      });
    }
    onResetFilters();
  };

  /* ═══════════════ FLIGHT FILTERS (UNCHANGED) ═══════════════ */
  const renderFlightFilters = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Price Range</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{NAIRA}{activeFilters.priceRange?.min?.toLocaleString() || 0}</span>
            <span>{NAIRA}{activeFilters.priceRange?.max?.toLocaleString() || 100000}</span>
          </div>
          <input
            type="range"
            min={availableOptions.price?.min || 0}
            max={availableOptions.price?.max || 100000}
            value={activeFilters.priceRange?.max || 100000}
            onChange={(e) =>
              handleFilterChange('priceRange', {
                min: availableOptions.price?.min || 0,
                max: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {availableOptions.airlines && availableOptions.airlines.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Airlines</h3>
          <div className="space-y-2">
            {availableOptions.airlines.slice(0, 5).map((airline: string) => (
              <label key={airline} className="flex items-center">
                <input
                  type="checkbox"
                  checked={activeFilters.airlines?.includes(airline)}
                  onChange={(e) => {
                    const newAirlines = e.target.checked
                      ? [...(activeFilters.airlines || []), airline]
                      : activeFilters.airlines?.filter((a: string) => a !== airline);
                    handleFilterChange('airlines', newAirlines);
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{airline}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Maximum Stops</h3>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((stops) => (
            <label key={stops} className="flex items-center">
              <input
                type="radio"
                name="maxStops"
                checked={activeFilters.maxStops === stops}
                onChange={() => handleFilterChange('maxStops', stops)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-2 text-sm text-gray-700">
                {stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Cabin Class</h3>
        <div className="space-y-2">
          {['Economy', 'Premium Economy', 'Business', 'First'].map((cabin) => (
            <label key={cabin} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.cabinClass?.includes(cabin)}
                onChange={(e) => {
                  const newClasses = e.target.checked
                    ? [...(activeFilters.cabinClass || []), cabin]
                    : activeFilters.cabinClass?.filter((c: string) => c !== cabin);
                  handleFilterChange('cabinClass', newClasses);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{cabin}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  /* ═══════════════ HOTEL FILTERS — ALL SECTIONS ═══════════════ */
  const renderHotelFilters = () => {
    const o = hotelOpts;

    const hasAnything =
      o.price.hasData || o.popular.length || o.propertyTypes.length ||
      o.starRatings.length || o.bedrooms.length || o.roomPackages.length ||
      o.guestRatings.length || o.propertyFacilities.length || o.bedTypes.length ||
      o.roomFeatures.length || o.roomFacilities.length || o.propertyFeatures.length ||
      o.guestImpressions.length || o.roomSizes.length || o.paymentMethods.length ||
      o.bookingPolicies.length || o.discounts.length || o.brands.length ||
      o.reviewBuckets.length || o.accessibility.length;

    if (!hasAnything) {
      return (
        <div className="text-center py-8 text-sm text-gray-500">
          No filter options available for these results.
        </div>
      );
    }

    /* Price buckets */
    const priceBuckets = (() => {
      if (!o.price.hasData) return [] as { label: string; min: number; max: number }[];
      const { min, max } = o.price;
      if (min === max) return [{ label: `${NAIRA}${min}`, min, max }];
      const step = (max - min) / 4;
      const out: { label: string; min: number; max: number }[] = [];
      for (let i = 0; i < 4; i++) {
        const lo = Math.floor(min + step * i);
        const hi = Math.ceil(min + step * (i + 1));
        out.push({
          label: `${NAIRA}${lo.toLocaleString()} - ${NAIRA}${hi.toLocaleString()}`,
          min: lo,
          max: hi,
        });
      }
      out.push({
        label: `> ${NAIRA}${Math.ceil(max).toLocaleString()}`,
        min: Math.ceil(max),
        max: Infinity,
      });
      return out;
    })();

    return (
      <div className="space-y-2">
        {/* POPULAR */}
        {o.popular.length > 0 && (
          <HotelSection title="Popular filters">
            {o.popular.map((p) => (
              <Check
                key={p.label}
                checked={activeFilters.popular?.includes(p.label)}
                onChange={() => toggleArray('popular', p.label)}
                label={p.label}
                count={p.count}
              />
            ))}
          </HotelSection>
        )}

        {/* BUDGET */}
        {o.price.hasData && (
          <HotelSection title={`Budget (${NAIRA}${o.price.min.toLocaleString()} – ${NAIRA}${o.price.max.toLocaleString()}+)`}>
            <div className="mb-3">
              <select className="w-full text-xs border border-gray-200 rounded px-2 py-2 bg-gray-50 text-gray-700">
                <option>Price per room per night (excl. taxes and fees)</option>
              </select>
            </div>
            <input
              type="range"
              min={o.price.min}
              max={o.price.max}
              value={activeFilters.priceRange?.max ?? o.price.max}
              onChange={(e) =>
                handleFilterChange('priceRange', { min: o.price.min, max: parseInt(e.target.value) })
              }
              className="w-full accent-[#0071c2] mb-3"
            />
            <div className="grid grid-cols-2 gap-2">
              {priceBuckets.map((b) => {
                const active =
                  activeFilters.priceRange?.min === b.min &&
                  activeFilters.priceRange?.max === (b.max === Infinity ? o.price.max : b.max);
                return (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() =>
                      handleFilterChange('priceRange', {
                        min: b.min,
                        max: b.max === Infinity ? o.price.max : b.max,
                      })
                    }
                    className={`text-[11px] font-semibold py-1.5 px-2 rounded border transition ${
                      active
                        ? 'bg-[#e7f0fa] border-[#0071c2] text-[#0071c2]'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </HotelSection>
        )}

        {/* PROPERTY TYPE */}
        {o.propertyTypes.length > 0 && (
          <HotelSection title="Property Type">
            {o.propertyTypes.map((pt) => (
              <Check
                key={pt}
                checked={activeFilters.propertyType?.includes(pt)}
                onChange={() => toggleArray('propertyType', pt)}
                label={pt}
              />
            ))}
          </HotelSection>
        )}

        {/* STAR RATING */}
        {o.starRatings.length > 0 && (
          <HotelSection title="Star rating">
            {o.starRatings.map((s) => (
              <Check
                key={s}
                checked={activeFilters.starRating?.includes(s)}
                onChange={() => toggleArray('starRating', s)}
                label={<Stars count={s} />}
              />
            ))}
          </HotelSection>
        )}

        {/* BEDROOMS */}
        {o.bedrooms.length > 0 && (
          <HotelSection title="Number of bedrooms">
            {o.bedrooms.map((b) => (
              <RadioRow
                key={b}
                checked={activeFilters.bedrooms?.includes(b)}
                onChange={() => toggleArray('bedrooms', b)}
                label={b}
              />
            ))}
          </HotelSection>
        )}

        {/* ROOM PACKAGES */}
        {o.roomPackages.length > 0 && (
          <HotelSection title="Room packages">
            {o.roomPackages.map((p) => (
              <Check
                key={p}
                checked={activeFilters.roomPackages?.includes(p)}
                onChange={() => toggleArray('roomPackages', p)}
                label={p}
              />
            ))}
          </HotelSection>
        )}

        {/* GUEST RATING */}
        {o.guestRatings.length > 0 && (
          <HotelSection title="Guest rating">
            {o.guestRatings.map((g) => (
              <Check
                key={g.value}
                checked={activeFilters.guestRating === String(g.value)}
                onChange={(v) => handleFilterChange('guestRating', v ? String(g.value) : null)}
                label={g.label}
              />
            ))}
          </HotelSection>
        )}

        {/* PROPERTY FACILITIES */}
        {o.propertyFacilities.length > 0 && (
          <HotelSection title="Property facilities & services">
            <ShowMore>
              {o.propertyFacilities.map((a) => (
                <Check
                  key={a.label}
                  checked={activeFilters.propertyFacilities?.includes(a.label)}
                  onChange={() => toggleArray('propertyFacilities', a.label)}
                  label={a.label}
                  count={a.count}
                />
              ))}
            </ShowMore>
          </HotelSection>
        )}

        {/* BED TYPE */}
        {o.bedTypes.length > 0 && (
          <HotelSection title="Bed type">
            {o.bedTypes.map((b) => (
              <RadioRow
                key={b}
                checked={activeFilters.bedTypes?.includes(b)}
                onChange={() => toggleArray('bedTypes', b)}
                label={b}
              />
            ))}
          </HotelSection>
        )}

        {/* ROOM FEATURES */}
        {o.roomFeatures.length > 0 && (
          <HotelSection title="Room features">
            <ShowMore>
              {o.roomFeatures.map((f) => (
                <RadioRow
                  key={f}
                  checked={activeFilters.roomFeatures?.includes(f)}
                  onChange={() => toggleArray('roomFeatures', f)}
                  label={f}
                />
              ))}
            </ShowMore>
          </HotelSection>
        )}

        {/* ROOM FACILITIES */}
        {o.roomFacilities.length > 0 && (
          <HotelSection title="Room facilities & services">
            <ShowMore>
              {o.roomFacilities.map((a) => (
                <Check
                  key={a.label}
                  checked={activeFilters.roomFacilities?.includes(a.label)}
                  onChange={() => toggleArray('roomFacilities', a.label)}
                  label={a.label}
                  count={a.count}
                />
              ))}
            </ShowMore>
          </HotelSection>
        )}

        {/* PROPERTY FEATURES */}
        {o.propertyFeatures.length > 0 && (
          <HotelSection title="Property Features">
            <ShowMore>
              {o.propertyFeatures.map((f) => (
                <Check
                  key={f.label}
                  checked={activeFilters.propertyFeatures?.includes(f.label)}
                  onChange={() => toggleArray('propertyFeatures', f.label)}
                  label={f.label}
                  count={f.count}
                />
              ))}
            </ShowMore>
          </HotelSection>
        )}

        {/* GUEST IMPRESSIONS */}
        {o.guestImpressions.length > 0 && (
          <HotelSection title="Guest Impressions">
            <ShowMore>
              {o.guestImpressions.map((g) => (
                <Check
                  key={g.label}
                  checked={activeFilters.guestImpressions?.includes(g.label)}
                  onChange={() => toggleArray('guestImpressions', g.label)}
                  label={g.label}
                  count={g.count}
                />
              ))}
            </ShowMore>
          </HotelSection>
        )}

        {/* ROOM SIZE */}
        {o.roomSizes.length > 0 && (
          <HotelSection title="Room Size">
            {o.roomSizes.map((s) => (
              <RadioRow
                key={s}
                checked={activeFilters.roomSize === String(s)}
                onChange={() => handleFilterChange('roomSize', String(s))}
                label={`≥ ${s}m²`}
              />
            ))}
          </HotelSection>
        )}

        {/* PAYMENT */}
        {o.paymentMethods.length > 0 && (
          <HotelSection title="Payment">
            {o.paymentMethods.map((p) => (
              <RadioRow
                key={p}
                checked={activeFilters.payment === p}
                onChange={() => handleFilterChange('payment', p)}
                label={p}
              />
            ))}
          </HotelSection>
        )}

        {/* BOOKING POLICY */}
        {o.bookingPolicies.length > 0 && (
          <HotelSection title="Booking Policy">
            {o.bookingPolicies.map((p) => (
              <Check
                key={p}
                checked={activeFilters.bookingPolicy?.includes(p)}
                onChange={() => toggleArray('bookingPolicy', p)}
                label={p}
              />
            ))}
          </HotelSection>
        )}

        {/* DISCOUNTS */}
        {o.discounts.length > 0 && (
          <HotelSection title="Discounts">
            {o.discounts.map((d) => (
              <Check
                key={d}
                checked={activeFilters.discounts?.includes(d)}
                onChange={() => toggleArray('discounts', d)}
                label={d}
              />
            ))}
          </HotelSection>
        )}

        {/* BRANDS */}
        {o.brands.length > 0 && (
          <HotelSection title="Brands">
            <ShowMore>
              {o.brands.map((b) => (
                <Check
                  key={b}
                  checked={activeFilters.brands?.includes(b)}
                  onChange={() => toggleArray('brands', b)}
                  label={b}
                />
              ))}
            </ShowMore>
          </HotelSection>
        )}

        {/* REVIEWS */}
        {o.reviewBuckets.length > 0 && (
          <HotelSection title="Reviews">
            {o.reviewBuckets.map((r) => (
              <Check
                key={r}
                checked={activeFilters.reviews?.includes(r)}
                onChange={() => toggleArray('reviews', r)}
                label={r}
              />
            ))}
          </HotelSection>
        )}

        {/* ACCESSIBILITY */}
        {o.accessibility.length > 0 && (
          <HotelSection title="Accessibility">
            <ShowMore initial={6}>
              {o.accessibility.map((a) => (
                <Check
                  key={a.label}
                  checked={activeFilters.accessibility?.includes(a.label)}
                  onChange={() => toggleArray('accessibility', a.label)}
                  label={a.label}
                  count={a.count}
                />
              ))}
            </ShowMore>
          </HotelSection>
        )}
      </div>
    );
  };

  /* ═══════════════ CAR RENTAL FILTERS (UNCHANGED) ═══════════════ */
  const renderCarRentalFilters = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Price per day</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{NAIRA}{activeFilters.priceRange?.min?.toLocaleString() || 0}</span>
            <span>{NAIRA}{activeFilters.priceRange?.max?.toLocaleString() || 100000}</span>
          </div>
          <input
            type="range"
            min={availableOptions.price?.min || 0}
            max={availableOptions.price?.max || 100000}
            value={activeFilters.priceRange?.max || 100000}
            onChange={(e) =>
              handleFilterChange('priceRange', {
                min: availableOptions.price?.min || 0,
                max: parseInt(e.target.value),
              })
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Vehicle Type</h3>
        <div className="space-y-2">
          {['SUV', 'Sedan', 'Van', 'Convertible', 'Luxury', 'Economy'].map((t) => (
            <label key={t} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.vehicleType?.includes(t)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...(activeFilters.vehicleType || []), t]
                    : activeFilters.vehicleType?.filter((x: string) => x !== t);
                  handleFilterChange('vehicleType', newTypes);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Transmission</h3>
        <div className="space-y-2">
          {['Automatic', 'Manual'].map((t) => (
            <label key={t} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.transmission?.includes(t)}
                onChange={(e) => {
                  const newT = e.target.checked
                    ? [...(activeFilters.transmission || []), t]
                    : activeFilters.transmission?.filter((x: string) => x !== t);
                  handleFilterChange('transmission', newT);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{t}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Seats</h3>
        <div className="space-y-2">
          {[2, 4, 5, 7, 8].map((s) => (
            <label key={s} className="flex items-center">
              <input
                type="checkbox"
                checked={activeFilters.seats?.includes(s)}
                onChange={(e) => {
                  const newSeats = e.target.checked
                    ? [...(activeFilters.seats || []), s]
                    : activeFilters.seats?.filter((x: number) => x !== s);
                  handleFilterChange('seats', newSeats);
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{s}+ seats</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  /* ═══════════════ FILTER COUNT ═══════════════ */
  const countActiveFilters = () => {
    if (!activeFilters) return 0;
    let count = 0;

    if (type === 'flights') {
      count += activeFilters.airlines?.length || 0;
      count += activeFilters.maxStops !== undefined && activeFilters.maxStops !== 2 ? 1 : 0;
      count += activeFilters.cabinClass?.length || 0;
      if (activeFilters.priceRange?.max !== availableOptions.price?.max) count += 1;
    } else if (type === 'hotels') {
      count += activeFilters.popular?.length || 0;
      count += activeFilters.propertyType?.length || 0;
      count += activeFilters.starRating?.length || 0;
      count += activeFilters.bedrooms?.length || 0;
      count += activeFilters.roomPackages?.length || 0;
      count += activeFilters.propertyFacilities?.length || 0;
      count += activeFilters.bedTypes?.length || 0;
      count += activeFilters.roomFeatures?.length || 0;
      count += activeFilters.roomFacilities?.length || 0;
      count += activeFilters.propertyFeatures?.length || 0;
      count += activeFilters.guestImpressions?.length || 0;
      count += activeFilters.bookingPolicy?.length || 0;
      count += activeFilters.discounts?.length || 0;
      count += activeFilters.brands?.length || 0;
      count += activeFilters.reviews?.length || 0;
      count += activeFilters.accessibility?.length || 0;
      if (activeFilters.guestRating !== null && activeFilters.guestRating !== undefined) count += 1;
      if (activeFilters.roomSize !== null && activeFilters.roomSize !== undefined) count += 1;
      if (activeFilters.payment !== null && activeFilters.payment !== undefined) count += 1;
      if (
        activeFilters.priceRange?.max !== undefined &&
        activeFilters.priceRange.max !== hotelOpts.price.max
      )
        count += 1;
    } else if (type === 'car-rentals') {
      count += activeFilters.vehicleType?.length || 0;
      count += activeFilters.transmission?.length || 0;
      count += activeFilters.seats?.length || 0;
      if (activeFilters.priceRange?.max !== availableOptions.price?.max) count += 1;
    }

    return count;
  };

  const filterCount = countActiveFilters();

  return (
    <>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="font-medium text-gray-700">Filters</span>
        {filterCount > 0 && (
          <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </button>

      {/* Mobile/Desktop Filter Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
          <div
            className="fixed inset-0 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl overflow-y-auto lg:relative lg:inset-auto lg:shadow-lg lg:rounded-2xl lg:border lg:border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {type === 'flights' && renderFlightFilters()}
                {type === 'hotels' && renderHotelFilters()}
                {type === 'car-rentals' && renderCarRentalFilters()}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 space-y-3">
                <button
                  onClick={handleApply}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleReset}
                  className="w-full py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchFilters;