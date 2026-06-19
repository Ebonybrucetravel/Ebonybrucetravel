"use client";
import { useState, useCallback } from "react";
import { config } from "@/lib/config";
import type { SearchParams, Booking, PassengerInfo } from "@/lib/types";
import { getProductMeta } from "@/lib/utils";
import api, {
  getStoredAuthToken,
  getVendorCodeFromCardNumber,
  publicRequest,
} from "@/lib/api";
import { 
  selectWakanowFlight, 
  bookWakanowFlight,
  createWakanowPassenger,
  formatWakanowTitle,
  formatWakanowGender,
  formatWakanowPhone,
  formatWakanowDate
} from "@/lib/wakanow-api";

// Extend the SearchResult type locally to include pricing fields
interface ExtendedSearchResult {
  id: string;
  type?: string;
  price?: string;
  title?: string;
  subtitle?: string;
  provider?: string;
  image?: string;
  rating?: number;
  duration?: string;
  time?: string;
  features?: string[];
  amenities?: string[];
  original_amount?: string;
  final_amount?: string;
  markup_percentage?: number;
  markup_amount?: string;
  currency?: string;
  origin?: string;
  destination?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureCity?: string;
  arrivalCity?: string;
  isDomestic?: boolean;
  productTypeOverride?: string;
  offerId?: string;
  selectData?: string;
  isWakanow?: boolean;
  slices?: any[];
  offer_request_id?: string;
  offer_id?: string;
  connection_code?: string;
  token?: string;
  session_id?: string;
  booking_token?: string;
  original_price?: string | number;
  original_currency?: string;
  checkInDate?: string;
  checkOutDate?: string;
  airlineName?: string;
  airlineCode?: string;
  realData?: {
    offerId?: string;
    finalPrice?: number;
    price?: number;
    currency?: string;
    airline?: string;
    flightNumber?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    pickupDateTime?: string;
    dropoffDateTime?: string;
    vehicleType?: string;
    original_price?: number;
    original_currency?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// ==================== AIRPORT COUNTRY MAPPING (GLOBAL DOMESTIC DETECTION) ====================
const AIRPORT_COUNTRY_MAP: Record<string, string> = {
  'LOS': 'NG', 'ABV': 'NG', 'PHC': 'NG', 'KAN': 'NG', 'ENU': 'NG',
  'QOW': 'NG', 'BNI': 'NG', 'JOS': 'NG', 'KAD': 'NG', 'YOL': 'NG',
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US',
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'EDI': 'GB', 'GLA': 'GB',
  'DXB': 'AE', 'AUH': 'AE', 'CDG': 'FR', 'FRA': 'DE', 'AMS': 'NL',
  'SYD': 'AU', 'MEL': 'AU', 'SIN': 'SG', 'NRT': 'JP', 'HND': 'JP',
  'YYZ': 'CA', 'YVR': 'CA', 'DEL': 'IN', 'BOM': 'IN', 'PEK': 'CN',
  'PVG': 'CN', 'JNB': 'ZA', 'CPT': 'ZA', 'NBO': 'KE', 'CAI': 'EG',
  'ACC': 'GH', 'ADD': 'ET', 'IST': 'TR', 'MAD': 'ES', 'BCN': 'ES',
  'FCO': 'IT', 'MXP': 'IT', 'SCL': 'CL', 'EZE': 'AR', 'MEX': 'MX',
  'DUB': 'IE', 'LIS': 'PT', 'ATH': 'GR', 'WAW': 'PL', 'PRG': 'CZ',
  'BUD': 'HU', 'OTP': 'RO', 'SOF': 'BG', 'ZAG': 'HR', 'CMN': 'MA',
  'TUN': 'TN', 'DSS': 'SN', 'DKR': 'SN', 'ABJ': 'CI', 'DLA': 'CM',
  'LAD': 'AO', 'HRE': 'ZW', 'LUN': 'ZM', 'GBE': 'BW', 'MRU': 'MU',
  'SEZ': 'SC', 'MLE': 'MV', 'KTM': 'NP', 'TAS': 'UZ', 'ALA': 'KZ',
  'GYD': 'AZ', 'TBS': 'GE', 'EVN': 'AM', 'BEG': 'RS', 'HEL': 'FI',
  'KEF': 'IS', 'LUX': 'LU', 'MLA': 'MT', 'LCA': 'CY', 'TLL': 'EE',
  'RIX': 'LV', 'VNO': 'LT', 'LJU': 'SI', 'BTS': 'SK', 'MSQ': 'BY',
  'KBP': 'UA', 'LWO': 'UA', 'SVO': 'RU', 'DME': 'RU', 'LED': 'RU',
};

const extractAirportCode = (str: string | undefined): string => {
  if (!str) return "";
  const match = str.match(/([A-Z]{3})/);
  return match?.[1] || str.substring(0, 3).toUpperCase();
};

const getCountryCodeFromAirport = (airportCode: string): string | null => {
  if (!airportCode) return null;
  const normalizedCode = airportCode.toUpperCase().trim();
  const match = normalizedCode.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : normalizedCode.substring(0, 3);
  return AIRPORT_COUNTRY_MAP[code] || null;
};

const isDomesticFlight = (origin: string, destination: string): boolean => {
  if (!origin || !destination) return false;
  const originCountry = getCountryCodeFromAirport(origin);
  const destCountry = getCountryCodeFromAirport(destination);
  if (originCountry && destCountry) {
    return originCountry === destCountry;
  }
  const normalizedOrigin = origin.toUpperCase().substring(0, 3);
  const normalizedDest = destination.toUpperCase().substring(0, 3);
  return normalizedOrigin === normalizedDest;
};

const getSelectData = (item: ExtendedSearchResult): string => {
  return item.selectData || 
         item.token || 
         item.session_id || 
         item.booking_token || 
         item.connection_code || 
         item.id || 
         "";
};

const getActualProvider = (item: ExtendedSearchResult): string => {
  if (item.provider === 'WAKANOW') return 'WAKANOW';
  if (item.provider === 'DUFFEL') return 'DUFFEL';
  if (item.isWakanow === true) return 'WAKANOW';
  const id = item.id || item.offerId || item.realData?.offerId || '';
  if (id.toString().toLowerCase().includes('wakanow')) return 'WAKANOW';
  if (id.toString().startsWith('off_')) return 'DUFFEL';
  const selectData = getSelectData(item);
  if (selectData) {
    if (selectData.startsWith('off_')) return 'DUFFEL';
    return 'WAKANOW';
  }
  return 'DUFFEL';
};

// Helper function to validate if an offer ID is real or fake
const isValidAmadeusOfferId = (offerId: string | number): boolean => {
  if (!offerId) return false;
  
  const idString = offerId.toString();
  
  const fakePatterns = [
    /^UXNYC\d{3}$/i,
    /^YRPARRAF$/i,
    /^SBLONSOF$/i,
    /^[A-Z]{3,8}\d{3}$/i,
    /^hotel-\d+$/i,
  ];
  
  for (const pattern of fakePatterns) {
    if (pattern.test(idString)) {
      return false;
    }
  }
  
  return idString.length >= 8 && /^[A-Z0-9]{8,}$/i.test(idString);
};

export function useBooking() {
  const [isCreating, setIsCreating] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const BASE = config.apiBaseUrl;

  const createBooking = useCallback(
    async (
      item: ExtendedSearchResult,
      searchParams: SearchParams | null,
      passenger: PassengerInfo,
      isGuest: boolean,
      options?: { taxes?: number; basePrice?: number; finalAmount?: number },
    ): Promise<Booking> => {
      setIsCreating(true);
      setError(null);
      try {
        const originRaw = item.origin || 
                         item.departureAirport || 
                         item.departureCity ||
                         item.realData?.origin ||
                         searchParams?.segments?.[0]?.from;
                         
        const destinationRaw = item.destination || 
                              item.arrivalAirport || 
                              item.arrivalCity ||
                              item.realData?.destination ||
                              searchParams?.segments?.[0]?.to;
        
        const originCode = extractAirportCode(originRaw);
        const destinationCode = extractAirportCode(destinationRaw);
        
        const isFlight = 
          item.type === 'flights' || 
          searchParams?.type === 'flights' ||
          !!item.selectData ||
          !!item.isWakanow ||
          !!item.slices ||
          !!(item.airlineName || item.airlineCode);
        
        const isDomestic = isFlight && !!(originCode && destinationCode && isDomesticFlight(originCode, destinationCode));
        
        let productType: string;
        let provider: string;
        
        console.log("🔍 Booking creation - Item analysis:", {
          itemType: item.type,
          searchParamsType: searchParams?.type,
          isFlight,
          isDomestic,
          hasSelectData: !!item.selectData,
          isWakanow: item.isWakanow,
          hasSlices: !!item.slices,
          originCode,
          destinationCode,
          providerFromItem: item.provider,
          offer_request_id: item.offer_request_id,
          offer_id: item.offer_id,
        });
        
        if (isDomestic) {
          productType = "FLIGHT_DOMESTIC";
          provider = "WAKANOW";
          console.log("🏠 DOMESTIC FLIGHT - Using WAKANOW", { originCode, destinationCode });
        }
        else if (isFlight) {
          productType = "FLIGHT_INTERNATIONAL";
          provider = getActualProvider(item);
          console.log("🌍 INTERNATIONAL FLIGHT - Using provider:", provider);
        }
        else if (item.type === 'hotels' || searchParams?.type === 'hotels') {
          productType = "HOTEL";
          provider = item.provider || "AMADEUS";
          console.log("🏨 HOTEL booking");
        }
        else if (item.type === 'car-rentals' || searchParams?.type === 'car-rentals') {
          productType = "CAR_RENTAL";
          provider = item.provider || "AMADEUS";
          console.log("🚗 CAR RENTAL booking");
        }
        else if (item.selectData || item.isWakanow || item.slices || item.airlineName) {
          productType = "FLIGHT_INTERNATIONAL";
          provider = getActualProvider(item);
          console.log("✈️ FALLBACK - Flight detected by properties");
        }
        else {
          throw new Error(`Cannot determine product type. Item type: ${item.type}, Search type: ${searchParams?.type}`);
        }
        
        console.log("📦 Final determination:", { productType, provider });
        
        const offerCurrency = (
          item.realData?.currency ??
          item.currency ??
          "NGN"
        ).toUpperCase();

        const basePrice =
          options?.basePrice ??
          (typeof item.original_amount === "string"
            ? parseFloat(item.original_amount)
            : (() => {
              const priceMatch = item.price?.match(/[\d,.]+/);
              return priceMatch
                ? parseFloat(priceMatch[0].replace(/,/g, ""))
                : 100;
            })());

        const markupAmount = parseFloat(item.markup_amount || "0");
        const serviceFee = parseFloat(item.service_fee || (item as any).service_charge || "0");
        const taxes = markupAmount + serviceFee;
        const finalAmount = basePrice + taxes;

        console.log("💰 Price breakdown:", {
          basePrice,
          markupAmount,
          serviceFee,
          taxes,
          finalAmount,
          productType,
          provider,
          originCode,
          destinationCode
        });

        const body: Record<string, any> = {
          productType,
          provider: provider,
          currency: offerCurrency,
          basePrice: basePrice,
          passengerInfo: {
            ...passenger,
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
          bookingData: {},
        };

        if (productType === "FLIGHT_INTERNATIONAL" || productType === "FLIGHT_DOMESTIC") {
          body.passengerInfo = {
            ...body.passengerInfo,
            title: passenger.title,
            gender: passenger.gender,
            dateOfBirth: passenger.dateOfBirth,
          };

          const finalOrigin = originCode || "LOS";
          const finalDestination = destinationCode || "ABV";
          
          let offerId = "";
          
          if (provider === 'WAKANOW') {
            offerId = getSelectData(item);
            console.log("🔑 Wakanow selectData:", { offerId: offerId?.substring(0, 30) });
            if (!offerId) {
              throw new Error("Missing selectData for Wakanow flight. Please go back and select the flight again.");
            }
          } else {
            offerId = item.offer_request_id || item.offer_id || item.selectData || item.id;
            console.log("🔑 Duffel offer ID:", { offerId });
            if (!offerId) {
              throw new Error("Missing offer ID for Duffel flight. Please go back and select the flight again.");
            }
          }

          body.bookingData = {
            offerId: offerId,
            origin: finalOrigin,
            destination: finalDestination,
            departureDate: searchParams?.segments?.[0]?.date ?? today(),
            ...(item.realData?.airline && { airline: item.realData.airline }),
            ...(item.realData?.flightNumber && {
              flightNumber: item.realData.flightNumber,
            }),
            cabinClass: searchParams?.cabinClass ?? "economy",
            passengers: searchParams?.passengers ?? 1,
            basePrice: basePrice,
            markup_amount: markupAmount,
            service_fee: serviceFee,
            taxes: taxes,
            totalAmount: finalAmount,
            original_amount: item.original_amount,
            final_amount: item.final_amount,
            markup_percentage: item.markup_percentage,
            is_domestic: productType === "FLIGHT_DOMESTIC",
            is_wakanow: provider === 'WAKANOW',
            select_data: provider === 'WAKANOW' ? offerId : undefined,
            offer_request_id: provider === 'DUFFEL' ? offerId : undefined,
          };
        } else if (productType === "HOTEL") {
          body.bookingData = {
            hotelId: item.id,
            offerId: item.realData?.offerId ?? item.id,
            hotelName: item.title || "Unknown Hotel",
            checkInDate: searchParams?.checkInDate ?? today(),
            checkOutDate: searchParams?.checkOutDate ?? tomorrow(),
            guests: searchParams?.adults ?? 1,
            rooms: searchParams?.rooms ?? 1,
            location: item.subtitle ?? searchParams?.location ?? "Lagos",
            basePrice: basePrice,
            markup_amount: markupAmount,
            service_fee: serviceFee,
            taxes: taxes,
            totalAmount: finalAmount,
            original_amount: item.original_amount,
            final_amount: item.final_amount,
            markup_percentage: item.markup_percentage,
          };
        } else if (productType === "CAR_RENTAL") {
          const pickupDt =
            searchParams?.pickupDateTime ??
            item.realData?.pickupDateTime ??
            new Date().toISOString().slice(0, 19);
          const dropoffDt =
            searchParams?.dropoffDateTime ??
            item.realData?.dropoffDateTime ??
            new Date(Date.now() + 86400000).toISOString().slice(0, 19);
          body.bookingData = {
            offerId: item.realData?.offerId ?? item.id,
            pickupLocationCode: searchParams?.pickupLocationCode ?? item.realData?.pickupLocation ?? "LHR",
            pickupDateTime: pickupDt,
            dropoffLocationCode: searchParams?.dropoffLocationCode ?? searchParams?.pickupLocationCode ?? item.realData?.dropoffLocation ?? "LHR",
            dropoffDateTime: dropoffDt,
            vehicleType: item.realData?.vehicleType ?? item.title ?? "Standard Car",
            basePrice: basePrice,
            markup_amount: markupAmount,
            service_fee: serviceFee,
            taxes: taxes,
            totalAmount: finalAmount,
            original_amount: item.original_amount,
            final_amount: item.final_amount,
            markup_percentage: item.markup_percentage,
          };
        }

        const token = getStoredAuthToken();



// ✅ WAKANOW FLOW - FIXED
if (provider === 'WAKANOW' && (productType === 'FLIGHT_DOMESTIC' || productType === 'FLIGHT_INTERNATIONAL')) {
  console.log("🚀 STARTING WAKANOW FLOW");

  // STEP 1: Get the original selectData from the search result
  const originalSelectData = getSelectData(item);
  if (!originalSelectData) {
    throw new Error("Missing booking token. Please search again.");
  }

  // STEP 2: SELECT - Confirm pricing and get NEW selectData
  console.log("📤 Step 1: Selecting flight...");
  const selectResult = await selectWakanowFlight(originalSelectData, offerCurrency);
  
  const wakanowBookingId = selectResult?.booking_id;
  const newSelectData = selectResult?.select_data;
  
  if (!wakanowBookingId || !newSelectData) {
    throw new Error("Failed to confirm flight pricing");
  }

  // ✅ Extract the ACTUAL price from the select result
  const wakanowPrice = selectResult?.flight_summary?.price?.Amount || 0;
  const wakanowCurrency = selectResult?.flight_summary?.price?.CurrencyCode || offerCurrency;
  
  console.log("💰 Wakanow price from select:", {
    wakanowPrice,
    wakanowCurrency,
    originalBasePrice: basePrice,
  });

  // ✅ Calculate markup and service fees
  let markupPercentage = 10; // Default 10% markup
  let serviceFeePercentage = 5; // ✅ Fixed at 5% service fee
  let serviceFee = 0;
  
  // Try to get markup from the item first
  if (item.markup_percentage) {
    markupPercentage = item.markup_percentage;
  }

  // Calculate the correct amounts
  const markupAmount = (wakanowPrice * markupPercentage) / 100;
  // ✅ Calculate service fee as 5% of base price
  serviceFee = (wakanowPrice * serviceFeePercentage) / 100;
  const totalAmount = wakanowPrice + markupAmount + serviceFee;
  
  console.log("💰 Price breakdown after markup:", {
    wakanowPrice,
    markupPercentage,
    markupAmount,
    serviceFeePercentage,
    serviceFee,
    totalAmount,
    currency: wakanowCurrency,
  });

  // STEP 3: Prepare passengers
  const allPassengers: PassengerInfo[] = [
    passenger,
    ...(passenger.travellers || [])
  ];

  const formattedPassengers = allPassengers.map((p) => {
    let passengerType = 'Adult';
    if (p.type === 'child') passengerType = 'Child';
    else if (p.type === 'infant') passengerType = 'Infant';
    
    return {
      passengerType: passengerType,
      firstName: p.firstName || '',
      middleName: (p as any).middleName || '',
      lastName: p.lastName || '',
      dateOfBirth: formatWakanowDate(p.dateOfBirth),
      phoneNumber: formatWakanowPhone(p.phone || passenger.phone),
      passportNumber: (p as any).passportNumber || '',
      expiryDate: formatWakanowDate((p as any).passportExpiry),
      passportIssuingAuthority: (p as any).passportIssuingAuthority || '',
      passportIssueCountryCode: (p as any).passportIssueCountry || '',
      gender: formatWakanowGender(p.gender),
      title: formatWakanowTitle(p.title || 'Mr'),
      email: p.email || passenger.email || '',
      address: p.address || passenger.address || '123 Fake Street',
      country: p.country || passenger.country || 'Nigeria',
      countryCode: p.countryCode || passenger.countryCode || 'NG',
      city: p.city || passenger.city || 'Lagos',
      postalCode: p.postalCode || passenger.postalCode || '100001',
    };
  });

  // STEP 4: BOOK - Create booking with Wakanow (NO PAYMENT YET)
  console.log("📖 Step 2: Booking flight with Wakanow...");
  const bookResponse = await bookWakanowFlight({
    BookingId: wakanowBookingId,
    BookingData: newSelectData,
    TargetCurrency: offerCurrency,
    PassengerDetails: formattedPassengers,
  });

  if (!bookResponse?.BookingId) {
    throw new Error("Wakanow booking failed");
  }

  const pnrNumber = bookResponse.FlightBookingResult?.PnReferenceNumber || 'PENDING';

  // STEP 5: Create booking in YOUR system (PAYMENT_PENDING status)
  console.log("💾 Step 3: Saving booking in our system...");
  
  const bookingHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (!isGuest && token) {
    bookingHeaders["Authorization"] = `Bearer ${token}`;
  }

  // ✅ ONLY send the fields the backend expects
  const bookingPayload = {
    bookingId: wakanowBookingId,
    selectData: newSelectData,
    passengers: formattedPassengers,
    targetCurrency: offerCurrency,
  };

  console.log("📤 Booking payload:", JSON.stringify(bookingPayload, null, 2));

  const response = await fetch(`${BASE}/api/v1/bookings/wakanow/book${isGuest ? '/guest' : ''}`, {
    method: "POST",
    headers: bookingHeaders,
    body: JSON.stringify(bookingPayload),
  });

  const result = await response.json();
  if (!response.ok) {
    console.error("❌ Booking creation failed:", result);
    throw new Error(result.message || "Failed to create booking");
  }

  const createdBooking = result.data || result;

  // STEP 6: SHOW PAYMENT MODAL with CORRECT price
console.log("💳 Step 4: Payment required!");

// ✅ Use the prices from the backend response or fallback to calculated values
const finalBasePrice = createdBooking.basePrice || createdBooking.base_price || wakanowPrice;
const finalMarkupAmount = createdBooking.markupAmount || createdBooking.markup_amount || markupAmount;
const finalServiceFee = createdBooking.serviceFee || createdBooking.service_fee || serviceFee;
const finalTotalAmount = createdBooking.totalAmount || createdBooking.total_amount || totalAmount;
const finalCurrency = createdBooking.currency || wakanowCurrency;

console.log("💰 Final booking prices:", {
  basePrice: finalBasePrice,
  markupAmount: finalMarkupAmount,
  serviceFee: finalServiceFee,
  totalAmount: finalTotalAmount,
  currency: finalCurrency,
  markupPercentage: markupPercentage,
  serviceFeePercentage: serviceFeePercentage,
});

// ✅ Create the booking object with ALL price fields - MUST match what PaymentModal expects
const bookingWithPaymentInfo = {
  id: createdBooking.id,
  reference: createdBooking.reference,
  status: createdBooking.status || "PENDING",
  paymentStatus: createdBooking.paymentStatus || "PENDING",
  productType: productType as any,
  provider: "WAKANOW",
  // ✅ CRITICAL: These are the fields PaymentModal reads
  basePrice: finalBasePrice,
  markupAmount: finalMarkupAmount,
  serviceFee: finalServiceFee,
  totalAmount: finalTotalAmount,
  amount: finalTotalAmount, // ✅ Add this for payment modal
  currency: finalCurrency,
  bookingData: {
    wakanowBookingId: bookResponse.BookingId,
    pnrNumber: pnrNumber,
    selectData: newSelectData,
    rawResponse: bookResponse,
    passengers: formattedPassengers,
    priceBreakdown: {
      basePrice: finalBasePrice,
      markupAmount: finalMarkupAmount,
      serviceFee: finalServiceFee,
      totalAmount: finalTotalAmount,
      currency: finalCurrency,
      markupPercentage: markupPercentage,
      serviceFeePercentage: serviceFeePercentage,
    },
  },
  passengerInfo: {
    firstName: passenger.firstName,
    lastName: passenger.lastName,
    email: passenger.email,
    phone: passenger.phone,
  },
  createdAt: createdBooking.createdAt || new Date().toISOString(),
};

// ✅ Store booking with payment flag and correct price in session
sessionStorage.setItem('current_booking', JSON.stringify({
  id: createdBooking.id,
  wakanowBookingId: wakanowBookingId,
  pnrNumber: pnrNumber,
  type: 'wakanow',
  requiresPayment: true,
  price: {
    basePrice: finalBasePrice,
    markupAmount: finalMarkupAmount,
    serviceFee: finalServiceFee,
    totalAmount: finalTotalAmount,
    currency: finalCurrency,
    markupPercentage: markupPercentage,
    serviceFeePercentage: serviceFeePercentage,
  },
  timestamp: Date.now()
}));

// ✅ Store the price breakdown separately for the payment modal
sessionStorage.setItem('booking_price_breakdown', JSON.stringify({
  basePrice: finalBasePrice,
  markupAmount: finalMarkupAmount,
  serviceFee: finalServiceFee,
  totalAmount: finalTotalAmount,
  currency: finalCurrency,
  markupPercentage: markupPercentage,
  serviceFeePercentage: serviceFeePercentage,
}));

// ✅ Also store in session for the payment modal to read
sessionStorage.setItem('payment_booking_data', JSON.stringify({
  id: createdBooking.id,
  amount: finalTotalAmount,
  currency: finalCurrency,
  basePrice: finalBasePrice,
  serviceFee: finalServiceFee,
  markupAmount: finalMarkupAmount,
}));

setBooking(bookingWithPaymentInfo as Booking);
return bookingWithPaymentInfo as Booking;
}
        // ✅ GENERIC FLOW (DUFFEL, HOTELS, CARS)
        const endpoint = isGuest ? "/api/v1/bookings/guest" : "/api/v1/bookings";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (!isGuest && token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${BASE}${endpoint}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        let data: any;
        try {
          data = await res.json();
        } catch (e) {
          const text = await res.text();
          console.error("Non-JSON response:", text);
          throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
        }

        if (!res.ok) {
          const msg = data.message ?? data.error ?? "Booking creation failed";
          console.error("Booking creation failed:", data);
          throw new Error(msg);
        }

        const created: Booking = data.data ?? data;

        if (!created?.id) {
          console.error("Invalid booking response:", data);
          throw new Error("Invalid response from server - missing booking ID");
        }

        setBooking(created);
        return created;
      } catch (err: any) {
        const message = err?.message ?? "Booking failed";
        console.error("Booking creation error:", err);
        setError(message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [BASE],
  );

  // ============ REST OF THE FUNCTIONS (UNCHANGED) ============
  
  const createPaymentIntent = useCallback(
    async (
      bookingId: string,
      isGuest: boolean,
      guestEmail?: string,
      bookingReference?: string,
      voucherCode?: string,
      provider?: string,
    ) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      
      let endpoint: string;
      let body: Record<string, any>;
  
      if (provider === 'WAKANOW') {
        endpoint = "/api/v1/payments/stripe/create-intent/wakanow";
        
        // ✅ Get the price breakdown from session if available
        let priceBreakdown = null;
        try {
          const stored = sessionStorage.getItem('booking_price_breakdown');
          if (stored) {
            priceBreakdown = JSON.parse(stored);
          }
        } catch (e) {
          console.warn('Could not parse price breakdown from session');
        }
        
        body = { 
          bookingId,
          // ✅ Send the total amount to ensure correct payment
          amount: priceBreakdown?.totalAmount || undefined,
          currency: priceBreakdown?.currency || 'NGN',
        };
        
        const token = getStoredAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } 
      else if (isGuest) {
        endpoint = "/api/v1/payments/stripe/create-intent/guest";
        body = { bookingReference: bookingReference!, email: guestEmail! };
      } 
      else {
        endpoint = "/api/v1/payments/stripe/create-intent";
        body = {
          bookingId,
          ...(voucherCode && { voucherCode }),
        };
        const token = getStoredAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
  
      console.log(`💰 Creating payment intent via ${endpoint} for booking ${bookingId}`);
      console.log('💰 Payment body:', body);
      
      const res = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
  
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? "Failed to create payment intent");
      }
      if (!data.clientSecret) {
        throw new Error("No client secret received");
      }
      return data as {
        clientSecret: string;
        paymentIntentId: string;
        voucherApplied?: any;
      };
    },
    [BASE],
  );

  const createAmadeusHotelBooking = useCallback(
    async (
      item: ExtendedSearchResult,
      passenger: PassengerInfo,
      card:
        | {
            cardNumber: string;
            expiryMonth: string;
            expiryYear: string;
            cvc: string;
            holderName?: string;
          }
        | undefined,
      isGuest: boolean,
    ): Promise<Booking> => {
      setIsCreating(true);
      setError(null);
  
      try {
        const offerId = item.realData?.offerId ?? item.id;
        if (!offerId) throw new Error("Missing offer ID");
  
        if (!isValidAmadeusOfferId(offerId)) {
          console.error("❌ Invalid/Fake offer ID detected:", offerId);
          throw new Error(
            "Invalid hotel offer. Please go back and search for hotels again. " +
            "Hotel offers expire quickly and cannot be reused from previous searches."
          );
        }
  
        const realData = item.realData || item;
        
        const originalCurrency = item.original_currency || item.originalPriceCurrency || realData.original_currency || 'GBP';
        let originalPrice: number = 0;
        
        if (item.original_price && typeof item.original_price === 'string') {
          originalPrice = parseFloat(item.original_price);
        } else if (item.original_price && typeof item.original_price === 'number') {
          originalPrice = item.original_price;
        } else if (item.originalPriceAmount && typeof item.originalPriceAmount === 'number') {
          originalPrice = item.originalPriceAmount;
        } else if (realData.original_price) {
          originalPrice = typeof realData.original_price === 'number' ? realData.original_price : parseFloat(realData.original_price);
        }
        
        let customerPrice: number = 0;
        if (item.final_amount && typeof item.final_amount === 'string') {
          customerPrice = parseFloat(item.final_amount);
        } else if (item.final_amount && typeof item.final_amount === 'number') {
          customerPrice = item.final_amount;
        } else if (item.final_price && typeof item.final_price === 'string') {
          customerPrice = parseFloat(item.final_price);
        } else if (item.final_price && typeof item.final_price === 'number') {
          customerPrice = item.final_price;
        }
        
        const checkInDate = item.checkInDate || item.check_in_date || realData.checkInDate;
        const checkOutDate = item.checkOutDate || item.check_out_date || realData.checkOutDate;
        
        const hotelName = item.title || realData.title || item.name || realData.name || 'Hotel';
        const hotelAddress = item.address || realData.address || item.subtitle || '';
        const hotelCity = item.city || realData.city || item.location || '';
        const hotelCountry = item.country || realData.country || item.countryCode || '';
        const hotelRating = item.rating || realData.rating || item.starRating || null;
        const hotelDescription = item.description || realData.description || '';
        const hotelCheckInTime = item.checkInTime || realData.checkInTime || '15:00';
        const hotelCheckOutTime = item.checkOutTime || realData.checkOutTime || '12:00';
        const hotelPhone = item.phone || realData.phone || '';
        const hotelAmenities = item.amenities || realData.amenities || [];
        const hotelImages = item.images || realData.images || [];
        const roomType = item.roomType || realData.roomType || 'Standard Room';
        const numberOfRooms = item.rooms || realData.rooms || 1;
        const boardType = item.boardType || realData.boardType || 'Room Only';
        
        console.log("🏨 Hotel details being sent:", {
          hotelName,
          hotelAddress,
          hotelCity,
          hotelCountry,
          hotelRating,
          roomType,
          checkInDate,
          checkOutDate
        });
        
        if (originalPrice <= 0) {
          console.error("❌ Missing original price! This offer may be expired.");
          throw new Error(
            "Hotel offer has expired or is missing pricing information. " +
            "Please search for hotels again to get current offers."
          );
        }
  
        const token = getStoredAuthToken();
  
        const bookingPayload: any = {
          hotelOfferId: offerId.toString(),
          offerPrice: originalPrice,
          currency: originalCurrency,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          guests: [
            {
              name: {
                title: passenger.title?.toUpperCase() || "MR",
                firstName: passenger.firstName,
                lastName: passenger.lastName,
              },
              contact: {
                phone: passenger.phone,
                email: passenger.email,
              },
            },
          ],
          roomAssociations: [
            {
              hotelOfferId: offerId.toString(),
              guestReferences: [{ guestReference: "1" }],
            },
          ],
          cancellationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          cancellationPolicySnapshot: "Free cancellation until 24 hours before check-in.",
          policyAccepted: true,
          
          hotelId: item.id || realData.id || '',
          hotelName: hotelName,
          hotelAddress: hotelAddress,
          hotelCity: hotelCity,
          hotelCountry: hotelCountry,
          hotelRating: hotelRating,
          hotelDescription: hotelDescription,
          hotelCheckInTime: hotelCheckInTime,
          hotelCheckOutTime: hotelCheckOutTime,
          hotelPhone: hotelPhone,
          hotelAmenities: hotelAmenities,
          hotelImages: hotelImages,
          roomType: roomType,
          numberOfRooms: numberOfRooms,
          boardType: boardType,
        };
  
        if (card) {
          bookingPayload.payment = {
            method: "CREDIT_CARD",
            paymentCard: {
              paymentCardInfo: {
                vendorCode: getVendorCodeFromCardNumber(card.cardNumber) || "VI",
                cardNumber: card.cardNumber.replace(/\s+/g, ""),
                expiryDate: `${card.expiryYear}-${card.expiryMonth.padStart(2, "0")}`,
                holderName: card.holderName || `${passenger.firstName} ${passenger.lastName}`,
                securityCode: card.cvc,
              },
            },
          };
        }
  
        const endpoint = isGuest 
          ? "/api/v1/bookings/hotels/bookings/amadeus/guest"
          : "/api/v1/bookings/hotels/bookings/amadeus";
  
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
  
        if (!isGuest && token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
  
        const response = await fetch(`${BASE}${endpoint}`, {
          method: "POST",
          headers,
          body: JSON.stringify(bookingPayload),
        });
  
        let data: any;
        try {
          data = await response.json();
        } catch (e) {
          const text = await response.text();
          console.error("Non-JSON response:", text);
          throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`);
        }
  
        if (!response.ok) {
          const msg = data.message || data.error || "Booking creation failed";
          console.error("Booking creation failed:", data);
          
          if (msg.includes("INVALID OFFER ID") || msg.includes("offer id") || msg.includes("expired")) {
            throw new Error(
              "Hotel offer has expired. Please go back and search for hotels again to get current offers."
            );
          }
          throw new Error(msg);
        }
  
        const raw = data.data?.booking ?? data.booking ?? data.data ?? data;
  
        if (!raw?.id) {
          throw new Error("Invalid response from server - missing booking ID");
        }
  
        const booking: Booking = {
          id: raw.id,
          reference: raw.reference,
          status: raw.status || "PENDING",
          paymentStatus: raw.paymentStatus || "PENDING",
          productType: "HOTEL",
          provider: "AMADEUS",
          basePrice: customerPrice,
          totalAmount: customerPrice,
          currency: item.currency || "NGN",
          bookingData: {
            ...raw,
            hotelId: item.id,
            hotelName: hotelName,
            hotelAddress: hotelAddress,
            hotelCity: hotelCity,
            hotelCountry: hotelCountry,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            guests: realData.guests || 1,
            rooms: realData.rooms || 1,
            original_price_sent: originalPrice,
            original_currency_sent: originalCurrency,
            customer_price: customerPrice,
            customer_currency: item.currency,
          },
          passengerInfo: {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
          createdAt: raw.createdAt || new Date().toISOString(),
        };
  
        console.log("✅ Amadeus hotel booking created successfully with hotel name:", hotelName);
        setBooking(booking);
        return booking;
      } catch (err: any) {
        console.error("❌ Amadeus hotel booking creation failed:", err);
        setError(err.message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [BASE],
  );

  const chargeMarginAmadeusHotel = useCallback(
    async (booking: Booking, isGuest: boolean): Promise<Booking> => {
      setError(null);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      if (!isGuest) {
        const token = getStoredAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const url = isGuest
        ? `${BASE}/api/v1/payments/amadeus-hotel/charge-margin/guest`
        : `${BASE}/api/v1/payments/amadeus-hotel/charge-margin`;

      const body = isGuest
        ? {
            bookingReference: booking.reference,
            email: booking.passengerInfo.email,
          }
        : { bookingId: booking.id };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message ?? "Booking creation failed";
        console.error("Booking creation failed:", data);
        throw new Error(msg);
      }

      const updated = data.booking ?? data.data?.booking ?? data.data;
      if (updated) {
        setBooking(updated);
        return updated as Booking;
      }
      return { ...booking, status: "CONFIRMED", paymentStatus: "COMPLETED" };
    },
    [BASE],
  );

  const pollBookingStatus = useCallback(
    async (
      bookingId: string,
      maxAttempts = 10,
      intervalMs = 3000,
      guestParams?: {
        reference: string;
        email: string;
      },
    ): Promise<Booking> => {
      const token = getStoredAuthToken();
      const isGuest = !token && guestParams?.reference && guestParams?.email;
      
      console.log("🔍 Polling booking status:", {
        bookingId,
        isGuest,
        hasToken: !!token,
        maxAttempts,
        intervalMs
      });
  
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        
        console.log(`📡 Polling attempt ${i + 1}/${maxAttempts}`);
  
        try {
          let data: any;
          
          if (isGuest) {
            data = await publicRequest<any>(
              `/api/v1/bookings/public/by-id/${encodeURIComponent(bookingId)}?reference=${encodeURIComponent(guestParams!.reference)}&email=${encodeURIComponent(guestParams!.email)}`,
              { method: "GET" },
            );
          } else {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              "Accept": "application/json",
            };
            
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
            
            const res = await fetch(`${BASE}/api/v1/bookings/${bookingId}`, {
              method: "GET",
              headers,
            });
            
            if (!res.ok) continue;
            data = await res.json();
          }
  
          const b: Booking = data?.data?.booking ?? data?.data ?? data?.booking ?? data;
            
          if (b?.status === "CONFIRMED" || b?.paymentStatus === "COMPLETED") {
            console.log("✅ Booking confirmed via polling!");
            setBooking(b);
            return b;
          }
          
          if (b?.id) {
            console.log(`⏳ Booking status: ${b?.status || 'unknown'}, continuing to poll...`);
          }
        } catch (error) {
          console.error(`❌ Polling error on attempt ${i + 1}:`, error);
          if (i === maxAttempts - 1) {
            throw new Error(`Failed to confirm booking after ${maxAttempts} attempts`);
          }
        }
      }
      
      throw new Error("Booking confirmation timed out");
    },
    [BASE],
  );

  const reset = useCallback(() => {
    setBooking(null);
    setError(null);
  }, []);

  return {
    booking,
    isCreating,
    error,
    createBooking,
    createAmadeusHotelBooking,
    chargeMarginAmadeusHotel,
    createPaymentIntent,
    pollBookingStatus,
    reset,
  };
}

const today = () => new Date().toISOString().split("T")[0];
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split("T")[0];