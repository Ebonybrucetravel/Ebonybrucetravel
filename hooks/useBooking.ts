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
  bookingId?: string;
  totalAmount?: number;
  priceBreakdown?: {
    basePrice: number;
    markupAmount: number;
    markupPercentage: number;
    serviceFee: number;
    serviceFeePercentage: number;
    taxes: number;
    taxPercentage: number;
    totalAmount: number;
    currency: string;
    breakdown?: string;
  };
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

// ==================== AIRPORT COUNTRY MAPPING ====================
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


const getBreakdown = (pb: any): string => {
  if (!pb) return '';
  return pb.breakdown || `${pb.basePrice || 0} + ${pb.markupAmount || 0} (${pb.markupPercentage || 10}% markup) + ${pb.serviceFee || 0} (${pb.serviceFeePercentage || 5}% service fee) = ${pb.totalAmount || 0}`;
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
          hasBookingId: !!item.bookingId,
          hasPriceBreakdown: !!item.priceBreakdown,
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
          let offerRequestId = "";
          

// ============================================================
// WAKANOW FLOW (FIXED)
// ============================================================
if (provider === 'WAKANOW') {
  offerId = getSelectData(item);
  console.log("🔑 Wakanow selectData:", { offerId: offerId?.substring(0, 30) });
  if (!offerId) {
    throw new Error("Missing selectData for Wakanow flight. Please go back and select the flight again.");
  }
  
  // ✅ Calculate the total amount
  const wakanowTotalAmount = finalAmount;
  const wakanowCurrency = offerCurrency;
  
  // ✅ CRITICAL: Get the PNR/Wakanow Booking ID from the item
  const wakanowBookingId = item.bookingId || null;
  
  console.log("🔑 Wakanow Booking ID (PNR):", wakanowBookingId);
  
  // ✅ STORE bookingId at TOP LEVEL
  body.bookingId = wakanowBookingId;
  
  // ✅ STORE selectData at TOP LEVEL (THIS IS THE FIX)
  body.selectData = offerId;  // ← ADD THIS LINE
  
  body.bookingData = {
    offerId: offerId,
    origin: finalOrigin,
    destination: finalDestination,
    departureDate: searchParams?.segments?.[0]?.date ?? today(),
    ...(item.realData?.airline && { airline: item.realData.airline }),
    ...(item.realData?.flightNumber && {
      flightNumber: item.realData.flightNumber,
      phoneNumber: passenger.phone, 
    }),
    cabinClass: searchParams?.cabinClass ?? "economy",
    passengers: searchParams?.passengers ?? 1,
    basePrice: basePrice,
    markup_amount: markupAmount,
    service_fee: serviceFee,
    taxes: taxes,
    totalAmount: wakanowTotalAmount,
    original_amount: item.original_amount,
    final_amount: item.final_amount,
    markup_percentage: item.markup_percentage,
    is_domestic: productType === "FLIGHT_DOMESTIC",
    is_wakanow: provider === 'WAKANOW',
    select_data: offerId,  // Keep for reference
    pnrNumber: wakanowBookingId,
    wakanowBookingId: wakanowBookingId,
  };
  
  // ✅ Also keep top-level pnrNumber for webhook
  body.pnrNumber = wakanowBookingId;
  
  // ✅ WAKANOW: Add totalAmount and priceBreakdown at top level for validation
  body.totalAmount = wakanowTotalAmount;
  body.currency = wakanowCurrency;
  body.priceBreakdown = {
    basePrice: basePrice,
    markupAmount: markupAmount,
    markupPercentage: item.markupPercentage || 10,
    serviceFee: serviceFee,
    serviceFeePercentage: item.serviceFeePercentage || 5,
    taxes: taxes,
    taxPercentage: item.taxPercentage || 15,
    totalAmount: wakanowTotalAmount,
    currency: wakanowCurrency,
  };
  
  console.log("💰 Wakanow total amount:", { 
    totalAmount: body.totalAmount, 
    currency: body.currency,
    pnrNumber: wakanowBookingId,
    bookingId: body.bookingId,
    hasSelectData: !!body.selectData,  // ← Log to verify
  });
}
          // ============================================================
          // ✅ DUFFEL FLOW (FIXED)
          // ============================================================
          else {
            offerId = item.offer_request_id || item.offer_id || item.selectData || item.id;
            offerRequestId = item.offer_request_id || item.offer_id || offerId;
            
            console.log("🔑 Duffel offer ID:", { offerId, offerRequestId });
            if (!offerId) {
              throw new Error("Missing offer ID for Duffel flight. Please go back and select the flight again.");
            }

            // ✅ Calculate total amount for Duffel from multiple sources
            let totalAmount = 0;
            if (item.totalAmount) {
              totalAmount = item.totalAmount;
            } else if (item.priceBreakdown?.totalAmount) {
              totalAmount = item.priceBreakdown.totalAmount;
            } else if (item.final_amount) {
              totalAmount = parseFloat(item.final_amount);
            } else if (finalAmount) {
              totalAmount = finalAmount;
            }
            
            let currency = item.currency || offerCurrency;

            // ✅ Build the full offer data
            const offerData = {
              id: offerId,
              total_amount: totalAmount || finalAmount,
              total_currency: currency,
              passengers: item.passengers || item.slices?.[0]?.passengers || [],
              slices: item.slices || [],
              owner: item.owner || item.airline || { name: item.airlineName || 'Unknown' },
              ...(item.realData?.airline && { airline: item.realData.airline }),
              ...(item.realData?.flightNumber && { flight_number: item.realData.flightNumber }),
            };

            body.bookingData = {
              offerId: offerId,
              offerRequestId: offerRequestId,
              offerData: offerData,
              storedOfferDataAt: new Date().toISOString(),
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
              totalAmount: totalAmount || finalAmount,
              original_amount: item.original_amount,
              final_amount: item.final_amount,
              markup_percentage: item.markup_percentage,
              is_domestic: productType === "FLIGHT_DOMESTIC",
              is_wakanow: provider === 'WAKANOW',
              offer_request_id: offerRequestId,
            };

            // ✅ DUFFEL ONLY: Add totalAmount and currency at top level for validation
            body.totalAmount = totalAmount || finalAmount;
            body.currency = currency;
            
            console.log("💰 Duffel total amount:", { 
              totalAmount: body.totalAmount, 
              currency: body.currency,
              fromItem: !!item.totalAmount,
              fromPriceBreakdown: !!item.priceBreakdown?.totalAmount,
            });
          }
        } else if (productType === "HOTEL") {
          // ... existing hotel code (unchanged)
        } else if (productType === "CAR_RENTAL") {
          // ... existing car rental code (unchanged)
        }
  
        const token = getStoredAuthToken();
  
        // ============================================================
        // ✅ WAKANOW FLOW (UNCHANGED)
        // ============================================================
        if (provider === 'WAKANOW' && (productType === 'FLIGHT_DOMESTIC' || productType === 'FLIGHT_INTERNATIONAL')) {
          // ... existing Wakanow code (unchanged)
        }
        
        // ============================================================
        // ✅ DUFFEL: Clean passenger info
        // ============================================================
        let cleanedPassengerInfo = body.passengerInfo;
        
        if (provider === 'DUFFEL') {
          const duffelAllowedFields = ['firstName', 'lastName', 'email', 'phone', 'title', 'gender', 'dateOfBirth'];
          const cleaned: any = {};
          for (const field of duffelAllowedFields) {
            if (body.passengerInfo[field] !== undefined && body.passengerInfo[field] !== null && body.passengerInfo[field] !== '') {
              cleaned[field] = body.passengerInfo[field];
            }
          }
          cleanedPassengerInfo = cleaned;
          console.log('🧹 Cleaned passenger info for Duffel:', cleanedPassengerInfo);
        }
        
        body.passengerInfo = cleanedPassengerInfo;
        
        const endpoint = isGuest ? "/api/v1/bookings/guest" : "/api/v1/bookings";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
  
        if (!isGuest && token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
  
        console.log("📤 Sending booking request:", {
          endpoint,
          isGuest,
          hasToken: !!token,
          provider,
          totalAmount: body.totalAmount,
          hasPriceBreakdown: !!body.priceBreakdown,
        });
  
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

        if (created && provider === 'WAKANOW') {
          if (!created.passengerInfo?.email && passenger?.email) {
            created.passengerInfo = {
              ...(created.passengerInfo || {}),
              email: passenger.email,
            };
          }
        }
  
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
        endpoint = "/api/v1/payments/stripe/create-intent/guest";
        
        let email = guestEmail;
        
        if (!email && booking) {
          email = (booking as any)?.passengerInfo?.email;
        }
        
        if (!email) {
          throw new Error('Passenger email is required for payment. Please provide a valid email address.');
        }
        
        const ref = bookingReference || booking?.reference;
        
        if (!ref) {
          throw new Error('Booking reference is required for payment.');
        }
        
        body = { 
          bookingReference: ref,
          email: email,
        };
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
    [BASE, booking], // ✅ Add booking to dependencies
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