"use client";
import { useState, useCallback } from "react";
import { config } from "@/lib/config";
import type { SearchParams, Booking, PassengerInfo } from "@/lib/types";
import { getProductMeta } from "@/lib/utils";
import api, {
  getStoredAuthToken,
  getVendorCodeFromCardNumber,
  publicRequest,
  bookHotelHBX,
} from "@/lib/api";
import { selectWakanowFlight, bookWakanowFlight } from "@/lib/wakanow-api";

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
    [key: string]: any;
  };
  [key: string]: any;
}

// ==================== AIRPORT COUNTRY MAPPING (GLOBAL DOMESTIC DETECTION) ====================
const AIRPORT_COUNTRY_MAP: Record<string, string> = {
  // Nigeria
  'LOS': 'NG', 'ABV': 'NG', 'PHC': 'NG', 'KAN': 'NG', 'ENU': 'NG',
  'QOW': 'NG', 'BNI': 'NG', 'JOS': 'NG', 'KAD': 'NG', 'YOL': 'NG',
  'ILR': 'NG', 'MDI': 'NG', 'CBQ': 'NG', 'QRW': 'NG', 'SKO': 'NG',
  
  // USA
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US',
  'SFO': 'US', 'SEA': 'US', 'LAS': 'US', 'MCO': 'US', 'EWR': 'US',
  'MIA': 'US', 'BOS': 'US', 'ATL': 'US', 'IAH': 'US', 'PHX': 'US',
  'LGA': 'US', 'DCA': 'US', 'IAD': 'US', 'CLT': 'US', 'MSP': 'US',
  'DTW': 'US', 'FLL': 'US', 'TPA': 'US', 'SAN': 'US', 'PDX': 'US',
  
  // UK
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'EDI': 'GB', 'GLA': 'GB',
  'BHX': 'GB', 'BRS': 'GB', 'LTN': 'GB', 'STN': 'GB', 'LCY': 'GB',
  'NCL': 'GB', 'BFS': 'GB', 'ABZ': 'GB',
  
  // Canada
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA', 'YYC': 'CA', 'YOW': 'CA',
  'YEG': 'CA', 'YHZ': 'CA', 'YWG': 'CA',
  
  // UAE
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE',
  
  // India
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN',
  'HYD': 'IN', 'COK': 'IN', 'GOI': 'IN',
  
  // China
  'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN', 'SZX': 'CN', 'CTU': 'CN',
  
  // Japan
  'HND': 'JP', 'NRT': 'JP', 'KIX': 'JP', 'CTS': 'JP', 'FUK': 'JP',
  
  // Australia
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU', 'ADL': 'AU',
  
  // Germany
  'FRA': 'DE', 'MUC': 'DE', 'BER': 'DE', 'HAM': 'DE', 'CGN': 'DE',
  'DUS': 'DE', 'STR': 'DE',
  
  // France
  'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR', 'MRS': 'FR',
  
  // South Africa
  'JNB': 'ZA', 'CPT': 'ZA', 'DUR': 'ZA', 'PLZ': 'ZA',
  
  // Kenya
  'NBO': 'KE', 'MBA': 'KE',
  
  // Egypt
  'CAI': 'EG', 'HRG': 'EG', 'SSH': 'EG',
  
  // Ghana
  'ACC': 'GH',
  
  // Ethiopia
  'ADD': 'ET',
  
  // Turkey
  'IST': 'TR', 'SAW': 'TR', 'ESB': 'TR',
  
  // Singapore
  'SIN': 'SG',
  
  // Malaysia
  'KUL': 'MY', 'PEN': 'MY',
  
  // Thailand
  'BKK': 'TH', 'HKT': 'TH', 'CNX': 'TH',
  
  // Vietnam
  'HAN': 'VN', 'SGN': 'VN', 'DAD': 'VN',
  
  // Philippines
  'MNL': 'PH', 'CEB': 'PH',
  
  // Brazil
  'GRU': 'BR', 'GIG': 'BR', 'BSB': 'BR',
  
  // Mexico
  'MEX': 'MX', 'CUN': 'MX', 'GDL': 'MX',
  
  // Spain
  'MAD': 'ES', 'BCN': 'ES', 'AGP': 'ES',
  
  // Italy
  'FCO': 'IT', 'MXP': 'IT', 'VCE': 'IT',
  
  // Netherlands
  'AMS': 'NL',
  
  // Switzerland
  'ZRH': 'CH', 'GVA': 'CH',
  
  // Belgium
  'BRU': 'BE',
  
  // Austria
  'VIE': 'AT',
  
  // Sweden
  'ARN': 'SE',
  
  // Norway
  'OSL': 'NO',
  
  // Denmark
  'CPH': 'DK',
  
  // Qatar
  'DOH': 'QA',
  
  // Oman
  'MCT': 'OM',
  
  // Bahrain
  'BAH': 'BH',
  
  // Kuwait
  'KWI': 'KW',
  
  // Saudi Arabia
  'JED': 'SA', 'RUH': 'SA', 'DMM': 'SA',
  
  // Jordan
  'AMM': 'JO',
  
  // Israel
  'TLV': 'IL',
  
  // Lebanon
  'BEY': 'LB',
  
  // Pakistan
  'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK',
  
  // Bangladesh
  'DAC': 'BD',
  
  // Sri Lanka
  'CMB': 'LK',
  
  // Indonesia
  'CGK': 'ID', 'DPS': 'ID',
  
  // South Korea
  'ICN': 'KR', 'GMP': 'KR', 'PUS': 'KR',
  
  // New Zealand
  'AKL': 'NZ', 'WLG': 'NZ', 'CHC': 'NZ',
  
  // Argentina
  'EZE': 'AR', 'AEP': 'AR',
  
  // Chile
  'SCL': 'CL',
  
  // Colombia
  'BOG': 'CO',
  
  // Panama
  'PTY': 'PA',
  
  // Ireland
  'DUB': 'IE', 'SNN': 'IE',
  
  // Portugal
  'LIS': 'PT', 'OPO': 'PT',
  
  // Greece
  'ATH': 'GR', 'SKG': 'GR',
  
  // Poland
  'WAW': 'PL', 'KRK': 'PL',
  
  // Czech Republic
  'PRG': 'CZ',
  
  // Hungary
  'BUD': 'HU',
  
  // Romania
  'OTP': 'RO',
  
  // Bulgaria
  'SOF': 'BG',
  
  // Croatia
  'ZAG': 'HR',
  
  // Morocco
  'CMN': 'MA', 'RAK': 'MA',
  
  // Tunisia
  'TUN': 'TN',
  
  // Senegal
  'DSS': 'SN', 'DKR': 'SN',
  
  // Ivory Coast
  'ABJ': 'CI',
  
  // Cameroon
  'DLA': 'CM', 'NSI': 'CM',
  
  // Angola
  'LAD': 'AO',
  
  // Zimbabwe
  'HRE': 'ZW',
  
  // Zambia
  'LUN': 'ZM',
  
  // Botswana
  'GBE': 'BW',
  
  // Mauritius
  'MRU': 'MU',
  
  // Seychelles
  'SEZ': 'SC',
  
  // Maldives
  'MLE': 'MV',
  
  // Nepal
  'KTM': 'NP',
  
  // Uzbekistan
  'TAS': 'UZ',
  
  // Kazakhstan
  'ALA': 'KZ',
  
  // Azerbaijan
  'GYD': 'AZ',
  
  // Georgia
  'TBS': 'GE',
  
  // Armenia
  'EVN': 'AM',
  
  // Serbia
  'BEG': 'RS',
  
  // Finland
  'HEL': 'FI',
};

// Helper function to extract airport code
const extractAirportCode = (str: string | undefined): string => {
  if (!str) return "";
  const match = str.match(/([A-Z]{3})/);
  return match?.[1] || str.substring(0, 3).toUpperCase();
};

// Helper function to get country code from airport code
const getCountryCodeFromAirport = (airportCode: string): string | null => {
  if (!airportCode) return null;
  const normalizedCode = airportCode.toUpperCase().trim();
  const match = normalizedCode.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : normalizedCode.substring(0, 3);
  return AIRPORT_COUNTRY_MAP[code] || null;
};

// Helper function to check if flight is domestic (same country)
const isDomesticFlight = (origin: string, destination: string): boolean => {
  if (!origin || !destination) return false;
  
  const originCountry = getCountryCodeFromAirport(origin);
  const destCountry = getCountryCodeFromAirport(destination);
  
  console.log(`✈️ Domestic flight check: ${origin} (${originCountry}) → ${destination} (${destCountry})`);
  
  if (originCountry && destCountry) {
    return originCountry === destCountry;
  }
  
  // Fallback: same first 3 letters
  const normalizedOrigin = origin.toUpperCase().substring(0, 3);
  const normalizedDest = destination.toUpperCase().substring(0, 3);
  return normalizedOrigin === normalizedDest;
};

// Helper function to get selectData from item
const getSelectData = (item: ExtendedSearchResult): string => {
  return item.selectData || 
         item.token || 
         item.session_id || 
         item.booking_token || 
         item.connection_code || 
         item.id || 
         "";
};

// Helper function to check the actual provider from the item
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
        
        // ✅ Use global domestic detection (same country)
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
        
        // ✅ Determine product type and provider
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
          
          // ✅ Get the correct selectData/offer ID for the flight
          let offerId = "";
          
          if (provider === 'WAKANOW') {
            // For Wakanow flights, use selectData
            offerId = getSelectData(item);
            console.log("🔑 Wakanow selectData:", { offerId: offerId?.substring(0, 30) });
            
            if (!offerId) {
              throw new Error("Missing selectData for Wakanow flight. Please go back and select the flight again.");
            }
          } else {
            // For Duffel flights, use offer_request_id or offer_id
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
            pickupLocationCode:
              searchParams?.pickupLocationCode ??
              item.realData?.pickupLocation ??
              "LHR",
            pickupDateTime: pickupDt,
            dropoffLocationCode:
              searchParams?.dropoffLocationCode ??
              searchParams?.pickupLocationCode ??
              item.realData?.dropoffLocation ??
              "LHR",
            dropoffDateTime: dropoffDt,
            vehicleType:
              item.realData?.vehicleType ?? item.title ?? "Standard Car",
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

        console.log("📤 Sending booking request:", JSON.stringify(body, null, 2));

        const token = getStoredAuthToken();

        // ✅ SPECIALIZED WAKANOW FLOW (Both Domestic AND International)
        if (provider === 'WAKANOW' && (productType === 'FLIGHT_DOMESTIC' || productType === 'FLIGHT_INTERNATIONAL')) {
          console.log("🚀 STARTING SPECIALIZED WAKANOW FLOW");
          
          const selectData = getSelectData(item);
          console.log("🔑 Wakanow selectData for booking:", { selectData: selectData?.substring(0, 30) });
          
          if (!selectData) {
            throw new Error("Missing booking token for this flight. Please go back and select the flight again.");
          }
          
          // Step 1: Select the flight with Wakanow
          const selectResult = await selectWakanowFlight(selectData, offerCurrency);
          
          console.log("📦 Select result:", {
            hasBookingId: !!selectResult?.booking_id,
            hasTerms: !!selectResult?.terms_and_conditions,
            termsLength: selectResult?.terms_and_conditions?.TermsAndConditions?.length,
            fullResult: selectResult
          });
          
          if (!selectResult?.booking_id) {
            throw new Error(selectResult.message || "Failed to confirm flight availability with Wakanow.");
          }

          const wakanowBookingId = selectResult.booking_id;
          const wakanowSelectData = selectResult.select_data || selectData;

          // Step 2: Transform passengers to match API docs format
          const allPassengers: PassengerInfo[] = [
            passenger,
            ...(passenger.travellers || [])
          ];

          // Format according to API docs: passengers array with specific fields
          const formattedPassengers = allPassengers.map(p => ({
            passengerType: (p.type === 'child' ? 'Child' : p.type === 'infant' ? 'Infant' : 'Adult'),
            firstName: p.firstName,
            lastName: p.lastName,
            dateOfBirth: p.dateOfBirth || "1990-01-01",
            phoneNumber: p.phone || passenger.phone,
            email: p.email || passenger.email,
            gender: (p.gender === 'm' ? 'Male' : p.gender === 'f' ? 'Female' : 'Male'),
            title: (p.title || 'Mr').charAt(0).toUpperCase() + (p.title || 'Mr').slice(1).toLowerCase(),
            address: p.address || passenger.address || "123 Fake Street",
            country: p.country || passenger.country || "Nigeria",
            countryCode: p.countryCode || passenger.countryCode || "NG",
            city: p.city || passenger.city || "Lagos",
            postalCode: p.postalCode || passenger.postalCode || "100001",
          }));

          // Step 3: Create booking with Wakanow
          const bookingRequest = {
            bookingId: wakanowBookingId,
            selectData: wakanowSelectData,
            targetCurrency: offerCurrency,
            passengers: formattedPassengers
          };

          console.log("📤 Sending Wakanow booking request to:", `${BASE}/api/v1/bookings/wakanow/book`);
          console.log("📤 Request payload:", JSON.stringify(bookingRequest, null, 2));

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "application/json",
          };

          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
            console.log("🔐 Using auth token for Wakanow booking");
          }

          // Use the authenticated endpoint
          const endpoint = isGuest ? "/api/v1/bookings/wakanow/book/guest" : "/api/v1/bookings/wakanow/book";
          const response = await fetch(`${BASE}${endpoint}`, {
            method: "POST",
            headers,
            body: JSON.stringify(bookingRequest),
          });

          const result = await response.json();
          
          console.log("📦 Raw Wakanow booking response:", JSON.stringify(result, null, 2));
          
          if (!response.ok) {
            console.error("Wakanow booking failed:", result);
            throw new Error(result.message || result.error || "Wakanow booking failed");
          }
          
          // Extract booking ID from response
          let bookingId: string | undefined;
          let bookingData = result.data || result;
          
          bookingId = bookingData.id || 
                      bookingData.bookingId || 
                      result.id ||
                      result.bookingId;
          
          if (!bookingId) {
            console.error("Failed to extract booking ID from response:", result);
            throw new Error("Wakanow booking failed: No booking ID in response");
          }
          
          console.log("✅ Wakanow booking successful! Booking ID:", bookingId);

          // Create booking object with correct status type
          const created: Booking = {
            id: bookingId,
            reference: bookingData.reference || result.reference || `WAK-${bookingId}`,
            status: "PENDING",
            paymentStatus: result.paymentStatus || "PENDING",
            productType: productType,
            provider: "WAKANOW",
            basePrice: basePrice,
            totalAmount: finalAmount,
            currency: offerCurrency,
            bookingData: {
              wakanowBookingId: wakanowBookingId,
              selectData: wakanowSelectData,
              pnrNumber: result.pnrNumber || bookingData.pnrNumber,
              rawResponse: result
            },
            passengerInfo: {
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              email: passenger.email,
              phone: passenger.phone,
              address: passenger.address || "123 Fake Street",
              city: passenger.city || "Lagos",
              country: passenger.country || "Nigeria",
              countryCode: passenger.countryCode || "NG",
              postalCode: passenger.postalCode || "100001",
            },
            createdAt: new Date().toISOString(),
          };
          
          setBooking(created);
          
          // Store in sessionStorage for recovery
          sessionStorage.setItem(`booking_${bookingId}`, JSON.stringify(created));
          sessionStorage.setItem('current_booking', JSON.stringify({
            id: bookingId,
            type: 'wakanow',
            timestamp: Date.now()
          }));
          
          console.log("✅ Wakanow booking ready for payment");
          return created;
        }

        // ✅ GENERIC FLOW (DUFFEL, HOTELS, CARS)
        const endpoint = isGuest
          ? "/api/v1/bookings/guest"
          : "/api/v1/bookings";
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
          throw new Error(
            `Server returned ${res.status}: ${text.substring(0, 100)}`,
          );
        }

        if (!res.ok) {
          const msg = data.message ?? data.error ?? "Booking creation failed";
          console.error("Booking creation failed:", data);

          if (typeof msg === "string") {
            if (msg.includes("No active markup configuration found")) {
              const friendly =
                "Booking isn’t available for this currency right now. Try another currency or contact support.";
              setError(friendly);
              throw new Error(friendly);
            }

            if (msg.includes("dateOfBirth")) {
              throw new Error(
                "Date of birth is required for flight bookings. Please fill in all required fields.",
              );
            }
          }

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
        body = { bookingId };
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
  
      console.log(`Creating payment intent via ${endpoint} for booking ${bookingId}`);
      
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

        const paymentInfo = card
          ? {
            cardNumber: card.cardNumber.replace(/\s+/g, ""),
            expiryDate: `${card.expiryYear}-${card.expiryMonth.padStart(2, "0")}`,
            holderName:
              card.holderName ||
              `${passenger.firstName} ${passenger.lastName}`,
            securityCode: card.cvc,
          }
          : undefined;

        const basePrice = item.realData?.price || 0;
        const markupAmount = parseFloat(item.markup_amount || "0");
        const taxes = markupAmount;

        const response = await api.createAmadeusHotelBooking(
          offerId,
          {
            ...item,
            basePrice,
            taxes,
            totalAmount: basePrice + taxes,
          },
          {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
          paymentInfo,
          isGuest,
        );

        if (!response.success) {
          throw new Error(response.message || "Booking failed");
        }

        const raw =
          response.data?.booking ??
          response.booking ??
          response.data ??
          response;

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
          basePrice: basePrice,
          totalAmount: basePrice + taxes,
          currency:
            raw.currency || (item.realData?.currency ?? "GBP").toUpperCase(),
          bookingData: {
            ...raw,
            taxes: taxes,
            markup_amount: item.markup_amount,
            markup_percentage: item.markup_percentage,
            basePrice: basePrice,
            finalAmount: basePrice + taxes,
          },
          passengerInfo: {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
          createdAt: raw.createdAt || new Date().toISOString(),
        };

        console.log("✅ Booking created successfully:", booking);
        setBooking(booking);
        return booking;
      } catch (err: any) {
        console.error("❌ Booking creation failed:", err);
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

        if (
          typeof msg === "string" &&
          msg.includes("No active markup configuration found")
        ) {
          const friendly =
            "Booking isn’t available for this currency right now. Try another currency or contact support.";
          setError(friendly);
          throw new Error(friendly);
        }

        if (typeof msg === "string" && msg.includes("dateOfBirth")) {
          throw new Error(
            "Date of birth is required for flight bookings. Please fill in all required fields.",
          );
        }

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
  
          const b: Booking =
            data?.data?.booking ?? data?.data ?? data?.booking ?? data;
            
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

  const createHotelbedsBooking = useCallback(
    async (
      item: ExtendedSearchResult,
      passenger: PassengerInfo,
      isGuest: boolean,
      hbxMetadata?: {
        totalAmount: number;
        currency: string;
        cancellationPolicySnapshot: string;
        cancellationDeadline: string;
        policyAccepted: boolean;
      }
    ): Promise<Booking> => {
      setIsCreating(true);
      setError(null);
      try {
        const rateKey = item.realData?.rateKey;
        if (!rateKey) throw new Error("Missing rate key for Hotelbeds booking");

        let guests = [];

        if (passenger.guests && passenger.guests.length > 0) {
          guests = passenger.guests.map((g, index) => ({
            title: (g.name?.title || passenger.title || "MR").toUpperCase(),
            firstName: g.name?.firstName || passenger.firstName,
            lastName: g.name?.lastName || passenger.lastName,
            roomIdx: g.travelerId || 1,
          }));
        } else {
          guests = [
            {
              title: (passenger.title || "MR").toUpperCase(),
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              roomIdx: 1,
            },
          ];
        }

        const response = await bookHotelHBX({
          rateKey,
          totalAmount: hbxMetadata?.totalAmount || parseFloat(item.final_price || "0"),
          currency: hbxMetadata?.currency || (item.currency || "GBP").toUpperCase(),
          guests,
          policyAccepted: hbxMetadata?.policyAccepted || true,
          cancellationPolicySnapshot: hbxMetadata?.cancellationPolicySnapshot || "Standard cancellation policy applies.",
          cancellationDeadline: hbxMetadata?.cancellationDeadline || new Date().toISOString(),
        });

        if (!response.success) {
          throw new Error(response.message || "Hotelbeds booking failed");
        }

        const booking: Booking = {
          id: response.bookingId,
          reference: response.bookingId,
          status: (response.status as any) || "PENDING",
          paymentStatus: "PENDING",
          productType: "HOTEL",
          provider: "HOTELBEDS",
          basePrice: parseFloat(item.original_price || item.original_amount || "0"),
          totalAmount: parseFloat(item.final_price || item.final_amount || "0"),
          currency: (item.currency || "GBP").toUpperCase(),
          bookingData: {
            ...response,
            hotelName: item.title,
            rateKey,
          },
          passengerInfo: {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
          createdAt: new Date().toISOString(),
        };

        setBooking(booking);
        return booking;
      } catch (err: any) {
        console.error("❌ Hotelbeds booking failed:", err);
        setError(err.message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [BASE],
  );

  return {
    booking,
    isCreating,
    error,
    createBooking,
    createAmadeusHotelBooking,
    createHotelbedsBooking,
    chargeMarginAmadeusHotel,
    createPaymentIntent,
    pollBookingStatus,
    reset,
  };
}

const today = () => new Date().toISOString().split("T")[0];
const tomorrow = () =>
  new Date(Date.now() + 86400000).toISOString().split("T")[0];