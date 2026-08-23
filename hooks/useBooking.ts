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
  technicalStops?: any[];
  hasTechnicalStops?: boolean;
  totalTechnicalStops?: number;
  stopInformation?: any;
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
    offerId?: string; 
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
  hotelId?: string;
  hotelData?: any;
  offers?: any[];
  selectedRoom?: any;
  hotel?: any;
  // ✅ Also add these for hotel booking
  name?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  description?: string;
  images?: any[];
  phone?: string;
  roomType?: string;
  rooms?: number;
  boardType?: string;
  checkInTime?: string;
  checkOutTime?: string;
  check_in_date?: string;
  check_out_date?: string;
  originalPriceAmount?: number;
  originalPriceCurrency?: string;
  final_price?: string | number;
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
  
  // ❌ FAKE PATTERNS - Hotel IDs are typically 8 characters
  // Hotel ID pattern: 3 letters + 5 alphanumeric (e.g., "SILOS445", "FGLOSTAH")
  const hotelIdPattern = /^[A-Z]{3}[A-Z0-9]{5}$/;
  if (hotelIdPattern.test(idString)) {
    return false; // This is a hotel ID, not an offer ID
  }
  
  // ❌ More fake patterns
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
  
  // ✅ Valid offer ID patterns
  // Offer IDs are typically 10-12 characters with mixed alphanumeric
  const validPatterns = [
    /^[A-Z0-9]{10}$/,  // 10 characters (e.g., "MXIOA2ZAT2")
    /^[A-Z0-9]{11}$/,  // 11 characters
    /^[A-Z0-9]{12}$/,  // 12 characters (e.g., "H0X709Y88K")
  ];
  
  return validPatterns.some(pattern => pattern.test(idString));
};


const getBreakdown = (pb: any): string => {
  if (!pb) return '';
  return pb.breakdown || `${pb.basePrice || 0} + ${pb.markupAmount || 0} (${pb.markupPercentage || 10}% markup) + ${pb.serviceFee || 0} (${pb.serviceFeePercentage || 5}% service fee) = ${pb.totalAmount || 0}`;
};

const getPassportField = (
  passenger: any,
  isDomestic: boolean,
  isNorthAmerica: boolean,
  fieldType: 'number' | 'expiry' | 'authority' | 'countryCode'
): string => {

  if (isDomestic) {
    return '';
  }

  let value = '';
  switch (fieldType) {
    case 'number':
      value = passenger.PassportNumber || 
              passenger.passportNumber || 
              passenger.passport_number || 
              passenger.passportNum ||
              passenger.Passport ||
              passenger.passport ||
              '';
      break;
    case 'expiry':
      value = passenger.ExpiryDate || 
              passenger.expiryDate || 
              passenger.expiry_date ||
              passenger.PassportExpiry ||
              passenger.passportExpiry ||
              '';
      break;
    case 'authority':
      value = passenger.PassportIssuingAuthority || 
              passenger.passportIssuingAuthority || 
              passenger.issuingAuthority ||
              passenger.IssuingAuthority ||
              '';
      break;
    case 'countryCode':
      value = passenger.PassportIssueCountryCode || 
              passenger.passportIssueCountryCode || 
              passenger.issueCountryCode ||
              passenger.passportIssueCountry ||
              passenger.IssueCountryCode ||
              'NG';
      break;
  }

  if (isNorthAmerica && !value) {
    const fieldNames = {
      number: 'Passport number',
      expiry: 'Passport expiry date',
      authority: 'Passport issuing authority',
      countryCode: 'Passport issue country'
    };
    throw new Error(
      `${fieldNames[fieldType]} is required for flights to North America. ` +
      `Please provide valid passport information for all passengers.`
    );
  }

  return value;
};

// ============================================================
// ✅ FIXED: isPassportRequired - ALL international flights require passport for ALL passengers
// ============================================================
const isPassportRequired = (
  isDomestic: boolean,
  isNorthAmerica: boolean,
  destinationCode: string,
  airlineRequiresPassport: boolean = false,
  specialRoutes: string[] = []
): boolean => {
  // ✅ RULE 1: ALL international flights require passport for ALL passengers
  // This includes North America AND all other international destinations
  if (!isDomestic) {
    console.log('📍 Passport MANDATORY: International flight (ALL passengers)');
    return true;
  }
  
  // ✅ RULE 2: Domestic flights - only if airline requires it or special route
  if (isDomestic) {
    // Check special routes (like Russia, China internal flights)
    if (specialRoutes.includes(destinationCode)) {
      console.log('📍 Passport REQUIRED: Special domestic route');
      return true;
    }
    // Domestic generally doesn't require passport
    console.log('📍 Passport NOT required: Domestic flight');
    return false;
  }
  
 
  return false;
};


const buildPassenger = (
  p: any,
  isDomestic: boolean,
  isNorthAmerica: boolean,
  defaultAddress?: any,
  airlineRequiresPassport: boolean = false,
  specialRoutes: string[] = []
) => {
  const destinationCode = p.destinationCode || p.destination || '';
  

  const requiresPassport = isPassportRequired(
    isDomestic,
    isNorthAmerica,
    destinationCode,
    airlineRequiresPassport,
    specialRoutes
  );
  
  // Get passenger type
  const passengerType = p.PassengerType || p.passengerType || 'Adult';
  const passengerName = p.FirstName || p.firstName || 'Unknown';
  
  // ✅ Get passport fields from ALL possible sources
  const passportNumber = 
    p.PassportNumber || 
    p.passportNumber || 
    p.passport_number || 
    p.passportNum ||
    p.Passport ||
    p.passport ||
    '';
                        
  const expiryDate = 
    p.ExpiryDate || 
    p.expiryDate || 
    p.expiry_date ||
    p.PassportExpiry ||
    p.passportExpiry ||
    '';
                    
  const issuingAuthority = 
    p.PassportIssuingAuthority || 
    p.passportIssuingAuthority || 
    p.issuingAuthority ||
    p.IssuingAuthority ||
    '';
                          
  const issueCountryCode = 
    p.PassportIssueCountryCode || 
    p.passportIssueCountryCode || 
    p.issueCountryCode ||
    p.passportIssueCountry ||
    p.IssueCountryCode ||
    'NG';

    let dateOfBirth = p.DateOfBirth || p.dateOfBirth || '';


    if (!dateOfBirth) {
      const passengerName = p.FirstName || p.firstName || 'Unknown';
      throw new Error(
        `Date of birth is required for ${passengerType} "${passengerName}". ` +
        `Please go back and enter the date of birth.`
      );
    }

    const formatDateForWakanow = (dateStr: string): string => {
      if (!dateStr) return '';
      
      // If already in YYYY-MM-DD format, return as is
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }

      if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = dateStr.split('/');
        const month = String(parseInt(parts[0])).padStart(2, '0');
        const day = String(parseInt(parts[1])).padStart(2, '0');
        const year = parts[2];
        const result = `${year}-${month}-${day}`;
        console.log(`📅 Converted date from MM/DD/YYYY to YYYY-MM-DD: ${result}`);
        return result;
      }

      if (dateStr.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = dateStr.split('-');
        const day = String(parseInt(parts[0])).padStart(2, '0');
        const month = String(parseInt(parts[1])).padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      
      return dateStr;
    };


  console.log('📋 buildPassenger - passenger details:', {
    requiresPassport,
    passengerType,
    passengerName,
    dateOfBirth: dateOfBirth || '(empty)',
    passportNumber: passportNumber || '(empty)',
    expiryDate: expiryDate || '(empty)',
    issuingAuthority: issuingAuthority || '(empty)',
    isDomestic,
    isNorthAmerica,
  });

  // ✅ CRITICAL: If international flight, REQUIRE passport for ALL passengers
  if (requiresPassport && !passportNumber) {
    let reason = 'international travel';
    if (isNorthAmerica) {
      reason = 'North American destination (mandatory requirement for all passengers)';
    } else if (airlineRequiresPassport) {
      reason = 'airline requirement';
    }
    throw new Error(
      `PassportNumber is required for ${passengerType} "${passengerName}" on this flight. ` +
      `This is required due to ${reason}. Please provide a valid passport number.`
    );
  }

  // ✅ Also check expiry for international flights
  if (requiresPassport && !expiryDate) {
    throw new Error(
      `Passport expiry date is required for ${passengerType} "${passengerName}" on this international flight.`
    );
  }

  
  if (requiresPassport && !issuingAuthority) {
    throw new Error(
      `Passport issuing authority is required for ${passengerType} "${passengerName}" on this international flight.`
    );
  }

 
  const passenger: any = {
    passengerType: passengerType,
    firstName: p.FirstName || p.firstName || '',
    middleName: p.MiddleName || p.middleName || '',
    lastName: p.LastName || p.lastName || '',
    dateOfBirth: dateOfBirth, 
    phoneNumber: p.PhoneNumber || p.phoneNumber || p.phone || '',
    email: p.Email || p.email || '',
    gender: p.Gender || p.gender || 'Male',
    title: p.Title || p.title || 'Mr',
    address: p.Address || p.address || defaultAddress?.address || '123 Fake Street',
    country: p.Country || p.country || defaultAddress?.country || 'Nigeria',
    countryCode: p.CountryCode || p.countryCode || defaultAddress?.countryCode || 'NG',
    city: p.City || p.city || defaultAddress?.city || 'Lagos',
    postalCode: p.PostalCode || p.postalCode || defaultAddress?.postalCode || '100001',
  };

  
  if (requiresPassport) {
    passenger.PassportNumber = passportNumber;
    passenger.ExpiryDate = expiryDate;
    passenger.PassportIssuingAuthority = issuingAuthority;
    passenger.PassportIssueCountryCode = issueCountryCode;
  }

  return passenger;
};


const buildPassengerSafely = (
  p: any,
  isDomestic: boolean,
  isNorthAmerica: boolean,
  defaultAddress: any,
  label: string,
  airlineRequiresPassport: boolean = false,
  specialRoutes: string[] = []
): { passenger: any | null; error: string | null } => {
  try {
    const result = buildPassenger(
      p, 
      isDomestic, 
      isNorthAmerica, 
      defaultAddress,
      airlineRequiresPassport,
      specialRoutes
    );
    return { passenger: result, error: null };
  } catch (error: any) {
    return { passenger: null, error: `${label}: ${error.message}` };
  }
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
      options?: { 
        taxes?: number; 
        basePrice?: number; 
        finalAmount?: number;
        createWithoutPayment?: boolean;
        skipPassportValidation?: boolean;
      },
    ): Promise<Booking> => {
      console.log('📥 useBooking received passenger:', {
        passenger,
        passportNumber: (passenger as any).passportNumber,
        expiryDate: (passenger as any).expiryDate,
        passportIssuingAuthority: (passenger as any).passportIssuingAuthority,
        passportIssueCountry: (passenger as any).passportIssueCountry,
        passportIssueCountryCode: (passenger as any).passportIssueCountryCode,
        fullPassenger: passenger,
      });
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
        const finalOrigin = originCode || "LOS";
        const finalDestination = destinationCode || "ABV";

        // ==================== MULTI-CITY DETECTION ====================
// Check if this is a multi-city booking
const segments = searchParams?.segments || [];
const isMultiCity = segments.length > 1 || 
                    (item as any)?.isMultiCity === true ||
                    (item as any)?.allSegments?.length > 1;

// Build all segments for multi-city
let allSegments: Array<{from: string, to: string, date: string, airline?: string, flightNumber?: string}> = [];

if (isMultiCity && segments.length > 0) {
  // Build from searchParams segments
  allSegments = segments.map((seg: any) => ({
    from: seg.from || '',
    to: seg.to || '',
    date: seg.date || '',
    airline: seg.airline || '',
    flightNumber: seg.flightNumber || '',
  }));
} else if ((item as any)?.allSegments?.length > 0) {
  // Use existing allSegments from item
  allSegments = (item as any).allSegments;
} else {
  // Single segment - use origin/destination
  allSegments = [{
    from: finalOrigin,
    to: finalDestination,
    date: searchParams?.segments?.[0]?.date ?? today(),
    airline: item.airlineName || '',
    flightNumber: item.flightNumber || '',
  }];
}

console.log('🔄 MULTI-CITY DETECTION:', {
  isMultiCity,
  segmentsCount: segments.length,
  allSegmentsCount: allSegments.length,
  allSegments,
});
        
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

// ✅ Calculate markupPercentage and serviceFeePercentage
const markupPercentage = item.markupPercentage || item.priceBreakdown?.markupPercentage || 10;
const serviceFeePercentage = item.serviceFeePercentage || item.priceBreakdown?.serviceFeePercentage || 5;
const markupAmount = (basePrice * markupPercentage) / 100;
const serviceFee = (basePrice * serviceFeePercentage) / 100;
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
  
        const isWakanowFlight = provider === 'WAKANOW' && 
        (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC');
    
const northAmericaAirports = [
  // USA - Major airports
  'JFK', 'EWR', 'LGA', 'LAX', 'SFO', 'ORD', 'DFW', 'ATL', 'IAH', 'MIA', 
  'BOS', 'SEA', 'DEN', 'PHX', 'DTW', 'MSP', 'CLT', 'PDX', 'SAN', 'LAS',
  'IAD', 'DCA', 'BWI', 'PHL', 'STL', 'MCI', 'IND', 'CMH', 'PIT', 'CLE',
  'MCO', 'TPA', 'FLL', 'PBI', 'RSW', 'JAX', 'BNA', 'MSY', 'SLC', 'ABQ',
  'OKC', 'TUL', 'SAT', 'AUS', 'ELP', 'HNL', 'OGG', 'ANC', 'FAI',
  // Canada
  'YYZ', 'YVR', 'YUL', 'YYC', 'YOW', 'YHZ', 'YEG', 'YQB', 'YWG', 'YXE',
  'YQR', 'YXY', 'YQT', 'YAM', 'YQY', 'YDF', 'YHZ',
  // ✅ Mexico - ADD THESE
  'MEX', 'CUN', 'GDL', 'MTY', 'PVR', 'SJD', 'BJX', 'QRO', 'VER', 'CZM',
  'TIJ', 'HMO', 'CJS', 'LAP', 'VSA', 'MID', 'TRC', 'CUU', 'AGU', 'MZT'
];

const northAmericaCountries = ['US', 'USA', 'CAN', 'CA', 'MX', 'MEX'];
      
      const isNorthAmerica = northAmericaAirports.some(code => 
        destinationCode?.toUpperCase() === code ||
        destinationRaw?.toUpperCase().includes(code)
      ) || northAmericaCountries.some(code => 
        destinationCode?.toUpperCase().includes(code) ||
        destinationRaw?.toUpperCase().includes(code) ||
        destinationRaw?.toUpperCase().includes('UNITED STATES') ||
        destinationRaw?.toUpperCase().includes('CANADA')
      );
      
      // ✅ LOG for debugging
      console.log('📍 North America detection:', {
        destinationCode,
        destinationRaw,
        isNorthAmerica,
        isWakanowFlight,
      });
      
      const body: Record<string, any> = {
        productType,
        provider: provider,
        currency: offerCurrency,
        basePrice: basePrice,
        bookingData: {},
    
      };



console.log('📍 Flight type and passport requirements:', {
  isDomestic,
  isNorthAmerica,
  destinationCode,
  destinationRaw,
  passportRequirement: isDomestic ? 'EMPTY' : (isNorthAmerica ? 'MANDATORY' : 'OPTIONAL')
});

// ✅ Define travellers - for ALL Wakanow flights (international or domestic)
let travellers: any[] = [];
let firstTraveller: any = {};

// ✅ Check if we have travellers from the passenger object
const existingTravellers = (passenger as any).travellers || [];
const additionalPassengersFromPassenger = (passenger as any).additionalPassengers || [];

// ✅ Add this function right here - around line 580-590
const formatDateForWakanow = (dateStr: string): string => {
  if (!dateStr) return '';
  // If already in YYYY-MM-DD format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  // If in MM/DD/YYYY format, convert to YYYY-MM-DD
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = dateStr.split('/');
    const month = String(parseInt(parts[0])).padStart(2, '0');
    const day = String(parseInt(parts[1])).padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

// ✅ DEBUG: Log what passengers are being passed
console.log('🔍 Passenger data for booking:', {
  existingTravellers: existingTravellers.length,
  additionalPassengersFromPassenger: additionalPassengersFromPassenger.length,
  hasAdditional: additionalPassengersFromPassenger.length > 0,
  passengerObject: passenger,
  searchParamsPassengers: searchParams?.passengers,
});

// ✅ Get the total passenger count from searchParams (handles both number and object formats)
let searchPassengerCount = 1;
if (searchParams?.passengers) {
  if (typeof searchParams.passengers === 'number') {
    searchPassengerCount = searchParams.passengers;
  } else if (typeof searchParams.passengers === 'object') {
    // If it's an object with adults, children, infants
    const passengersObj = searchParams.passengers as any;
    searchPassengerCount = (passengersObj.adults || 0) + 
                          (passengersObj.children || 0) + 
                          (passengersObj.infants || 0);
  }
}
console.log('📊 Total passenger count from search:', searchPassengerCount);


// Build travellers from all sources
if (existingTravellers.length > 0) {
  // Use existing travellers (including lead passenger)
  travellers = existingTravellers;
  console.log('📋 Using existing travellers:', travellers.length);
} else if (additionalPassengersFromPassenger.length > 0) {
  // ✅ CRITICAL: Only use additional passengers if the search was for more than 1 passenger
  // AND the additional passengers are NOT just duplicates of the lead passenger
  const filteredAdditional = additionalPassengersFromPassenger.filter((p: any) => {
    // Check if this passenger is the same as the lead passenger
    const isLead = p.firstName === passenger.firstName && 
                   p.lastName === passenger.lastName &&
                   p.email === passenger.email;
    // Also check if this passenger has actual data (not empty)
    const hasData = p.firstName || p.lastName || p.email;
    return !isLead && hasData;
  });
  
  console.log('🔍 Filtered additional passengers:', {
    originalCount: additionalPassengersFromPassenger.length,
    filteredCount: filteredAdditional.length,
    searchPassengerCount: searchPassengerCount,
  });
  
  // Only use additional passengers if:
  // 1. We have filtered additional passengers
  // 2. The search was for more than 1 passenger (or we have valid additional passengers)
  if (filteredAdditional.length > 0 && (searchPassengerCount > 1 || filteredAdditional.length > 0)) {
    // Convert additional passengers to travellers format
    travellers = filteredAdditional.map((p: any) => ({
      PassengerType: p.type === 'child' ? 'Child' : p.type === 'infant' ? 'Infant' : 'Adult',
      FirstName: p.firstName || '',
      LastName: p.lastName || '',
      DateOfBirth: formatDateForWakanow(p.dateOfBirth || ''),
      PhoneNumber: p.phone || passenger.phone || '',
      Email: p.email || passenger.email || '',
      Gender: p.gender === 'f' ? 'Female' : p.gender === 'm' ? 'Male' : 'Male',
      Title: p.title || 'Mr',
      PassportNumber: p.passportNumber || '',
      ExpiryDate: p.passportExpiry || '',
      PassportIssuingAuthority: p.passportIssuingAuthority || '',
      PassportIssueCountryCode: p.passportIssueCountry || 'NG',
      Address: p.address || passenger.address || '123 Fake Street',
      Country: p.country || passenger.country || 'Nigeria',
      CountryCode: p.countryCode || passenger.countryCode || 'NG',
      City: p.city || passenger.city || 'Lagos',
      PostalCode: p.postalCode || passenger.postalCode || '100001',
    }));
    console.log('📋 Built additional passengers:', travellers.length);
  } else {
    console.log('📋 No valid additional passengers to add');
  }
}

// ✅ If no travellers and we have a lead passenger, create one
if (travellers.length === 0 && passenger.firstName) {
  // Build lead passenger
  const leadPassenger = {
    PassengerType: 'Adult',
    FirstName: passenger.firstName || '',
    LastName: passenger.lastName || '',
    DateOfBirth: formatDateForWakanow(passenger.dateOfBirth || ''),
    PhoneNumber: passenger.phone || '',
    Email: passenger.email || '',
    Gender: passenger.gender === 'f' ? 'Female' : passenger.gender === 'm' ? 'Male' : 'Male',
    Title: passenger.title || 'Mr',
    PassportNumber: (passenger as any).passportNumber || '',
    ExpiryDate: (passenger as any).passportExpiry || '',
    PassportIssuingAuthority: (passenger as any).passportIssuingAuthority || '',
    PassportIssueCountryCode: (passenger as any).passportIssueCountry || 'NG',
    Address: passenger.address || '123 Fake Street',
    Country: passenger.country || 'Nigeria',
    CountryCode: passenger.countryCode || 'NG',
    City: passenger.city || 'Lagos',
    PostalCode: passenger.postalCode || '100001',
  };
  travellers = [leadPassenger];
  console.log('📋 Created lead passenger only:', travellers.length);
}

// ✅ Ensure we only have the number of passengers from the search
// If search was for 1 passenger, but we have more, log a warning
if (searchPassengerCount === 1 && travellers.length > 1) {
  console.warn('⚠️ Search was for 1 passenger but we have', travellers.length, 'passengers. This may be incorrect.');
  // Keep only the lead passenger if search was for 1
  travellers = travellers.slice(0, 1);
}

// ✅ Ensure firstTraveller is set for passport fields if needed
if (travellers.length > 0) {
  firstTraveller = travellers[0];
} else if (isWakanowFlight && !isDomestic) {
  // For international flights without travellers, create from passenger data
  firstTraveller = {
    PassportNumber: (passenger as any).PassportNumber || (passenger as any).passportNumber || '',
    ExpiryDate: (passenger as any).ExpiryDate || (passenger as any).expiryDate || '',
    PassportIssuingAuthority: (passenger as any).PassportIssuingAuthority || (passenger as any).passportIssuingAuthority || '',
    PassportIssueCountryCode: (passenger as any).PassportIssueCountryCode || (passenger as any).passportIssueCountry || '',
    Address: passenger.address || (passenger as any).Address || '',
    Country: passenger.country || (passenger as any).Country || '',
    CountryCode: passenger.countryCode || (passenger as any).CountryCode || '',
    City: passenger.city || (passenger as any).City || '',
    PostalCode: passenger.postalCode || (passenger as any).PostalCode || '',
  };
  travellers = [firstTraveller];
}

console.log('👤 FINAL travellers count:', travellers.length);
console.log('👤 Travellers after population:', {
  count: travellers.length,
  first: travellers[0]?.FirstName || travellers[0]?.firstName,
  hasPassport: !!(travellers[0]?.PassportNumber || travellers[0]?.passportNumber),
});


// ✅ Build passengerInfo based on flight type (NO passport fields here!)
let passengerInfo: any = {
  firstName: passenger.firstName || '',
  lastName: passenger.lastName || '',
  email: passenger.email || '',
  phone: passenger.phone || '',
  title: passenger.title || '',  
  gender: passenger.gender === 'm' ? 'Male' : (passenger.gender === 'f' ? 'Female' : ''),  
  dateOfBirth: passenger.dateOfBirth || '',  
};

// Add address fields
if (passenger.address) passengerInfo.address = passenger.address;
if (passenger.country) passengerInfo.country = passenger.country;
if (passenger.countryCode) passengerInfo.countryCode = passenger.countryCode;
if (passenger.city) passengerInfo.city = passenger.city;
if (passenger.postalCode) passengerInfo.postalCode = passenger.postalCode;

// ✅ DO NOT add PassportNumber, ExpiryDate, etc. to passengerInfo
// They should ONLY be in the passengers array

body.passengerInfo = passengerInfo;

console.log('📄 passengerInfo built (NO passport fields):', {
  firstName: passengerInfo.firstName,
  lastName: passengerInfo.lastName,
  hasPassportNumber: !!passengerInfo.PassportNumber, // Should be false
  isDomestic,
  isNorthAmerica,
});


if (productType === "FLIGHT_INTERNATIONAL" || productType === "FLIGHT_DOMESTIC") {
       
          
          let offerId = "";
          let offerRequestId = "";
                    

          if (provider === 'WAKANOW') {
            offerId = getSelectData(item);
            console.log("🔑 Wakanow selectData:", { offerId: offerId?.substring(0, 30) });
            if (!offerId) {
              throw new Error("Missing selectData for Wakanow flight. Please go back and select the flight again.");
            }
            
            const wakanowTotalAmount = finalAmount;
            const wakanowCurrency = offerCurrency;
            const wakanowBookingId = item.bookingId || null;
            
            console.log("🔑 Wakanow Booking ID (PNR):", wakanowBookingId);
            if (options?.createWithoutPayment) {
              console.log("📝 Creating Wakanow booking WITHOUT payment (for seat selection)");
            }
            

const passengersArray = [];

// Default address for passengers
const defaultAddress = {
  address: passenger.address || '123 Fake Street',
  country: passenger.country || 'Nigeria',
  countryCode: passenger.countryCode || 'NG',
  city: passenger.city || 'Lagos',
  postalCode: passenger.postalCode || '100001',
};

// ✅ DEBUG: Log passenger object before building
console.log('🔍🔍🔍 CRITICAL - passenger object BEFORE buildPassenger:', {
  firstName: passenger.firstName,
  lastName: passenger.lastName,
  // Check all passport field variations
  PassportNumber: (passenger as any).PassportNumber,
  passportNumber: (passenger as any).passportNumber,
  ExpiryDate: (passenger as any).ExpiryDate,
  passportExpiry: (passenger as any).passportExpiry,
  PassportIssuingAuthority: (passenger as any).PassportIssuingAuthority,
  passportIssuingAuthority: (passenger as any).passportIssuingAuthority,
  PassportIssueCountryCode: (passenger as any).PassportIssueCountryCode,
  passportIssueCountry: (passenger as any).passportIssueCountry,
  // Check if any passport field exists
  hasPassport: !!(passenger as any).PassportNumber || !!(passenger as any).passportNumber,
  // Check travellers
  travellers: (passenger as any).travellers,
  // All keys in passenger object
  allKeys: Object.keys(passenger),
});

// ✅ Build passengers with error collection using buildPassengerSafely
const passengerErrors: string[] = [];

// In useBooking.ts - createBooking function, around the Wakanow section

// ✅ Build lead passenger with DateOfBirth
const leadResult = buildPassengerSafely(
  {
    ...passenger,
    FirstName: passenger.firstName,
    LastName: passenger.lastName,
    DateOfBirth: passenger.dateOfBirth || '',  
    PhoneNumber: passenger.phone,
    Email: passenger.email,
  },
  isDomestic,
  isNorthAmerica,
  defaultAddress,
  'Lead passenger'
);

if (leadResult.error) {
  passengerErrors.push(leadResult.error);
} else if (leadResult.passenger) {
  passengersArray.push(leadResult.passenger);
}
// 2. Add additional passengers from travellers
if (travellers && travellers.length > 1) {
  for (let i = 1; i < travellers.length; i++) {
    const t = travellers[i];
    if (t.firstName || t.FirstName) {
      
      const mappedTraveller = {
        ...t,
        ExpiryDate: t.ExpiryDate || t.passportExpiry || '',
        PassportNumber: t.PassportNumber || t.passportNumber || '',
        PassportIssuingAuthority: t.PassportIssuingAuthority || t.passportIssuingAuthority || '',
        PassportIssueCountryCode: t.PassportIssueCountryCode || t.passportIssueCountry || 'NG',
        DateOfBirth: t.DateOfBirth || t.dateOfBirth || '',
        FirstName: t.FirstName || t.firstName || '',
        LastName: t.LastName || t.lastName || '',
        PhoneNumber: t.PhoneNumber || t.phone || '',
        Email: t.Email || t.email || '',
      };
      
      const result = buildPassengerSafely(
        mappedTraveller,
        isDomestic,
        isNorthAmerica,
        defaultAddress,
        `Traveller ${i + 1}`
      );
      if (result.error) {
        passengerErrors.push(result.error);
      } else if (result.passenger) {
        passengersArray.push(result.passenger);
      }
    }
  }
}

// 3. Add additional passengers from page.tsx
const additionalPassengers = (passenger as any).additionalPassengers || [];
if (Array.isArray(additionalPassengers) && additionalPassengers.length > 0) {
  for (let i = 0; i < additionalPassengers.length; i++) {
    const ap = additionalPassengers[i];
    
    // ✅ Map the fields to match what buildPassenger expects
    const mappedPassenger = {
      ...ap,
      // Map passport fields to the correct case
      ExpiryDate: ap.passportExpiry || ap.ExpiryDate || '',
      PassportNumber: ap.passportNumber || ap.PassportNumber || '',
      PassportIssuingAuthority: ap.passportIssuingAuthority || ap.PassportIssuingAuthority || '',
      PassportIssueCountryCode: ap.passportIssueCountry || ap.PassportIssueCountryCode || 'NG',
      // Ensure DateOfBirth is set
      DateOfBirth: ap.dateOfBirth || ap.DateOfBirth || '',
      // Ensure name fields are set
      FirstName: ap.firstName || ap.FirstName || '',
      LastName: ap.lastName || ap.LastName || '',
      PhoneNumber: ap.phone || ap.PhoneNumber || '',
      Email: ap.email || ap.Email || '',
    };
    
    const result = buildPassengerSafely(
      mappedPassenger,
      isDomestic,
      isNorthAmerica,
      defaultAddress,
      `Additional passenger ${i + 1}`
    );
    if (result.error) {
      passengerErrors.push(result.error);
    } else if (result.passenger) {
      passengersArray.push(result.passenger);
    }
  }
}

// ✅ If any passenger validation failed, throw combined error
if (passengerErrors.length > 0) {
  const errorMessage = passengerErrors.join('\n');
  console.error('❌ Passenger validation errors:', errorMessage);
  throw new Error(
    `Cannot complete booking. Please fix the following issues:\n${errorMessage}`
  );
}

console.log("👤 Passengers built successfully:", passengersArray.length);
            
            // ✅ STORE bookingId at TOP LEVEL
            body.bookingId = wakanowBookingId;
            
            // ✅ STORE selectData at TOP LEVEL
            body.selectData = offerId;

            const technicalStops = item.technicalStops || [];
const hasTechnicalStops = item.hasTechnicalStops || false;
const totalTechnicalStops = item.totalTechnicalStops || 0;
const stopInformation = item.stopInformation || null;

console.log('🛑 Technical stops in booking:', {
  hasTechnicalStops,
  totalTechnicalStops,
  technicalStopsCount: technicalStops.length,
  hasStopInformation: !!stopInformation,
});

            
            // ✅ ALL Wakanow-specific fields go INSIDE bookingData
            body.bookingData = {
              offerId: offerId,
              origin: finalOrigin,
              destination: finalDestination,
              departureDate: searchParams?.segments?.[0]?.date ?? today(),
              isMultiCity: isMultiCity,
              allSegments: allSegments,
              createWithoutPayment: options?.createWithoutPayment || false,
              passengers: passengersArray,
              bookingId: wakanowBookingId,
              selectData: offerId,
              targetCurrency: wakanowCurrency,
              isDomestic: isDomestic,
  isNorthAmerica: isNorthAmerica,
  passportRequirement: isDomestic ? 'EMPTY' : (isNorthAmerica ? 'MANDATORY' : 'OPTIONAL'),
              destinationCode: destinationCode,
              technicalStops: technicalStops,
              hasTechnicalStops: hasTechnicalStops,
              totalTechnicalStops: totalTechnicalStops,
              stopInformation: stopInformation,
              priceBreakdown: {
                basePrice: basePrice,
                markupAmount: markupAmount,
                markupPercentage: markupPercentage,
                serviceFee: serviceFee,
                serviceFeePercentage: serviceFeePercentage,
                taxes: taxes,
                taxPercentage: markupPercentage + serviceFeePercentage,
                totalAmount: wakanowTotalAmount,
                currency: wakanowCurrency,
              },
              ...(item.realData?.airline && { airline: item.realData.airline }),
              ...(item.realData?.flightNumber && {
                flightNumber: item.realData.flightNumber,
                phoneNumber: passenger.phone, 
              }),
              
              cabinClass: searchParams?.cabinClass ?? "economy",
              passengersCount: searchParams?.passengers ?? 1,
              basePrice: basePrice,
              markup_amount: markupAmount,
              service_fee: serviceFee,
              taxes: taxes,
              totalAmount: wakanowTotalAmount,
              original_amount: item.original_amount,
              final_amount: item.final_amount,
              markup_percentage: markupPercentage,
              is_domestic: productType === "FLIGHT_DOMESTIC",
              is_wakanow: provider === 'WAKANOW',
              select_data: offerId,
              pnrNumber: wakanowBookingId,
              wakanowBookingId: wakanowBookingId,
            };
            
            // ✅ Also keep top-level pnrNumber for webhook
            body.pnrNumber = wakanowBookingId;
            
            // ✅ Ensure totalAmount is positive (backend requires > 0)
const actualTotalAmount = wakanowTotalAmount > 0 ? wakanowTotalAmount : 100;
const actualBasePrice = basePrice > 0 ? basePrice : 100 / 1.15;

// ✅ WAKANOW: Add totalAmount and priceBreakdown at top level for validation
body.totalAmount = actualTotalAmount;
body.currency = wakanowCurrency;

// ✅ Also set top-level priceBreakdown with calculated values
body.priceBreakdown = {
  basePrice: actualBasePrice,
  markupAmount: markupAmount > 0 ? markupAmount : 10,
  markupPercentage: markupPercentage || 10,
  serviceFee: serviceFee > 0 ? serviceFee : 5,
  serviceFeePercentage: serviceFeePercentage || 5,
  taxes: taxes > 0 ? taxes : 15,
  taxPercentage: (markupPercentage || 10) + (serviceFeePercentage || 5),
  totalAmount: actualTotalAmount,
  currency: wakanowCurrency,
};

console.log("💰 Wakanow total amount (with positive check):", {
  totalAmount: body.totalAmount,
  currency: body.currency,
  markupAmount: body.priceBreakdown.markupAmount,
  serviceFee: body.priceBreakdown.serviceFee,
  taxes: body.priceBreakdown.taxes,
  markupPercentage: body.priceBreakdown.markupPercentage,
  serviceFeePercentage: body.priceBreakdown.serviceFeePercentage,
  pnrNumber: wakanowBookingId,
  bookingId: body.bookingId,
  hasSelectData: !!body.selectData,
  passengersCount: passengersArray.length,
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
              isMultiCity: isMultiCity,
              allSegments: allSegments,
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
      
        } else if (productType === "CAR_RENTAL") {
          // ✅ Handle car rental booking
          const selectedOffer = item.realData || item;
          
          // Get the offer price from the search result
          const offerPrice = selectedOffer.quotation?.monetaryAmount || 
                             selectedOffer.converted?.monetaryAmount ||
                             selectedOffer.price ||
                             selectedOffer.original_price ||
                             0;
          
          const currency = selectedOffer.quotation?.currencyCode || 
                           selectedOffer.converted?.currencyCode ||
                           selectedOffer.currency ||
                           'NGN';
          
          const offerId = item.offerId || item.id || selectedOffer.id;
          
          if (!offerId) {
            throw new Error('Missing offer ID for car rental booking');
          }
          
          if (offerPrice <= 0) {
            throw new Error('Invalid offer price for car rental booking');
          }
          
          // ✅ CRITICAL: Set offerId at TOP LEVEL
          body.offerId = offerId;
          
          // ✅ Set car rental specific fields in bookingData
          body.bookingData = {
            offerId: offerId,
            offerPrice: Number(offerPrice),
            currency: currency,
            driver: {
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              email: passenger.email,
              phone: passenger.phone,
              title: passenger.title || 'MR',
            },
            offerData: selectedOffer,
            pickupLocation: item.pickupLocation || selectedOffer.start?.locationCode || selectedOffer.pickupLocation,
            dropoffLocation: item.dropoffLocation || selectedOffer.end?.locationCode || selectedOffer.dropoffLocation,
            pickupDateTime: item.pickupDateTime || selectedOffer.start?.dateTime || selectedOffer.pickupDateTime,
            dropoffDateTime: item.dropoffDateTime || selectedOffer.end?.dateTime || selectedOffer.dropoffDateTime,
            vehicleType: item.vehicleType || selectedOffer.vehicle?.description,
            serviceProvider: selectedOffer.serviceProvider?.name,
          };
          
          // ✅ Calculate total with markup
          const carMarkupPercentage = 10;
          const carServiceFeePercentage = 5;
          const carMarkupAmount = Number(offerPrice) * (carMarkupPercentage / 100);
          const carServiceFee = Number(offerPrice) * (carServiceFeePercentage / 100);
          const carTotalAmount = Number(offerPrice) + carMarkupAmount + carServiceFee;
          
          // ✅ Set totalAmount for validation
          body.totalAmount = carTotalAmount;
          
          // ✅ Store price breakdown
          body.priceBreakdown = {
            basePrice: Number(offerPrice),
            markupAmount: carMarkupAmount,
            markupPercentage: carMarkupPercentage,
            serviceFee: carServiceFee,
            serviceFeePercentage: carServiceFeePercentage,
            taxes: carMarkupAmount + carServiceFee,
            taxPercentage: carMarkupPercentage + carServiceFeePercentage,
            totalAmount: carTotalAmount,
            currency: currency,
          };
          
          console.log("🚗 Car rental booking payload:", {
            offerId: body.offerId, // ✅ This should now be at top level
            offerPrice: body.bookingData.offerPrice,
            totalAmount: body.totalAmount,
            currency: body.currency,
            driver: body.bookingData.driver,
          });
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

      // ✅ ADD THIS - Check passport fields before sending
console.log('🔍 PASSPORT CHECK BEFORE SEND:', {
  PassportNumber: body.passengerInfo?.PassportNumber,
  bookingDataExpiry: body.bookingData?.expiryDate,
  bookingDataIssuingAuthority: body.bookingData?.passportIssuingAuthority,
  bookingDataIssueCountryCode: body.bookingData?.passportIssueCountryCode,
});
        
        // ✅ ADD THIS - Log the full request body
        console.log('🚀🚀🚀 FINAL REQUEST BODY:', JSON.stringify(body, null, 2));
        

        
        const res = await fetch(`${BASE}${endpoint}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        
        let data: any;
        try {
          data = await res.json();
          // ✅ ADD THIS
          console.log('📥 API RESPONSE:', {
            status: res.status,
            ok: res.ok,
            data: data,
          });
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

// ✅ FIX: Store email in the booking object
const bookingAny = created as any;

// If the email is in the passenger object but not in the response, add it
if (passenger.email && !bookingAny.passengerInfo?.email) {
  if (!bookingAny.passengerInfo) {
    bookingAny.passengerInfo = {};
  }
  bookingAny.passengerInfo.email = passenger.email;
  bookingAny.email = passenger.email;
  console.log('📧 Added email to booking object from passenger:', passenger.email);
}

// Also store in bookingData if it exists
if (bookingAny.bookingData && passenger.email) {
  bookingAny.bookingData.email = passenger.email;
  if (!bookingAny.bookingData.passengerInfo) {
    bookingAny.bookingData.passengerInfo = {};
  }
  bookingAny.bookingData.passengerInfo.email = passenger.email;
}

// Store in sessionStorage for guest bookings
if (isGuest && passenger.email) {
  sessionStorage.setItem('guest_booking_email', passenger.email);
  console.log('📧 Stored guest email in sessionStorage:', passenger.email);
}

        let pnrNumber = null;
        
        // 1. Check top-level fields (using type assertion)
        const createdAny = created as any;
        
        if (createdAny.reference) {
          pnrNumber = createdAny.reference;
          console.log('✅ Found reference at top level:', pnrNumber);
        } else if (createdAny.bookingReference) {
          pnrNumber = createdAny.bookingReference;
          console.log('✅ Found bookingReference at top level:', pnrNumber);
        } else if (createdAny.pnr) {
          pnrNumber = createdAny.pnr;
          console.log('✅ Found pnr at top level:', pnrNumber);
        } else if (createdAny.Pnr) {
          pnrNumber = createdAny.Pnr;
          console.log('✅ Found Pnr at top level:', pnrNumber);
        } else if (createdAny.confirmationNumber) {
          pnrNumber = createdAny.confirmationNumber;
          console.log('✅ Found confirmationNumber at top level:', pnrNumber);
        } else if (createdAny.bookingId) {
          pnrNumber = createdAny.bookingId;
          console.log('✅ Found bookingId at top level:', pnrNumber);
        }
        
        // 2. Check in data.booking (common for authenticated users)
        if (!pnrNumber && data?.data?.booking) {
          const booking = data.data.booking;
          pnrNumber = booking.reference || booking.bookingReference || booking.pnr || booking.Pnr || booking.confirmationNumber || booking.bookingId;
          if (pnrNumber) console.log('✅ Found PNR in data.booking:', pnrNumber);
        }
        
        // 3. Check in data.bookingData
        if (!pnrNumber && data?.data?.bookingData) {
          const bookingData = data.data.bookingData;
          pnrNumber = bookingData.pnrNumber || bookingData.reference || bookingData.bookingId || bookingData.pnr;
          if (pnrNumber) console.log('✅ Found PNR in data.bookingData:', pnrNumber);
        }
        
        // 4. Check in created.bookingData (using type assertion)
        if (!pnrNumber && createdAny.bookingData) {
          pnrNumber = createdAny.bookingData.pnrNumber || createdAny.bookingData.reference || createdAny.bookingData.bookingId || createdAny.bookingData.pnr;
          if (pnrNumber) console.log('✅ Found PNR in created.bookingData:', pnrNumber);
        }
        
        // 5. Check in data.booking (if it's an object)
        if (!pnrNumber && data?.booking) {
          pnrNumber = data.booking.reference || data.booking.pnr || data.booking.bookingReference || data.booking.confirmationNumber || data.booking.bookingId;
          if (pnrNumber) console.log('✅ Found PNR in data.booking:', pnrNumber);
        }
        
        // 6. Check in response root for Wakanow-specific fields
        if (!pnrNumber && data?.pnrNumber) {
          pnrNumber = data.pnrNumber;
          console.log('✅ Found PNR in response root pnrNumber:', pnrNumber);
        }
        
        // ✅ If we found a PNR, store it at the top level using type assertion
        if (pnrNumber) {
          (created as any).reference = pnrNumber;
          (created as any).pnr = pnrNumber;
          // Also store in bookingData if it exists
          if ((created as any).bookingData) {
            (created as any).bookingData.pnrNumber = pnrNumber;
            (created as any).bookingData.reference = pnrNumber;
          }
          console.log('✅ PNR extracted and stored:', pnrNumber);
        } else {
          console.warn('⚠️ No PNR found in response. Full response structure:', {
            topLevelKeys: Object.keys(created),
            dataKeys: data?.data ? Object.keys(data.data) : null,
            hasBooking: !!data?.data?.booking,
            hasBookingData: !!data?.data?.bookingData,
            responseRootKeys: Object.keys(data),
          });
        }
        
        // ✅ If we have a booking ID but no reference, use booking ID as fallback
        if (!(created as any).reference && created.id) {
          (created as any).reference = created.id;
          console.log('ℹ️ Using bookingId as reference:', created.id);
        }
        
        // Store the PNR in a separate variable for later use
        const pnrValue = pnrNumber || (created as any).reference || created.id || null;
        
        console.log('📋 Final booking object:', {
          id: created.id,
          reference: (created as any).reference,
          pnr: (created as any).pnr,
          status: created.status,
          provider: provider,
          pnrValue: pnrValue,
        });
        
                // Add the PNR to the created object for use in the response
                (created as any).pnrValue = pnrValue;
        
                console.log('📋 Final booking object:', {
                  id: created.id,
                  reference: (created as any).reference,
                  pnr: (created as any).pnr,
                  status: created.status,
                  provider: provider,
                  pnrValue: pnrValue,
                });
                
                // ✅ FIX: Set the booking state and return the created object
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
          
              // ✅ FIX: Try multiple sources for email
              let email = guestEmail;
              
              // Try to get email from booking object
              if (!email && booking) {
                const bookingAny = booking as any;
                // Try all possible locations
                email = bookingAny.passengerInfo?.email ||
                        bookingAny.email ||
                        bookingAny.bookingData?.passengerInfo?.email ||
                        bookingAny.bookingData?.email ||
                        bookingAny.passengerInfo?.email ||
                        (bookingAny.passengerInfo as any)?.email ||
                        bookingAny.bookingData?.passengerInfo?.[0]?.email ||
                        bookingAny.bookingData?.travellers?.[0]?.Email;
              }
              
              // ✅ Try to get email from sessionStorage (for guest bookings)
              if (!email && typeof window !== 'undefined') {
                // Check if we stored it during booking creation
                email = sessionStorage.getItem('guest_booking_email') || '';
                
                // Also try to get from the selectedBooking
                if (!email) {
                  const storedBooking = sessionStorage.getItem('selectedBooking');
                  if (storedBooking) {
                    try {
                      const parsed = JSON.parse(storedBooking);
                      email = parsed.passengerInfo?.email || parsed.email || '';
                    } catch (e) {}
                  }
                }
              }
              
              // ✅ Try to get email from pendingPassengerInfo (if available in the hook)
              // Note: pendingPassengerInfo is not in the current hook, but we can check booking.passengerInfo
              if (!email && booking) {
                email = (booking as any).passengerInfo?.email || '';
              }
              
              // ✅ Final check - if no email, show a better error
              if (!email) {
                console.error('❌ No email found. Booking object:', booking);
                console.error('❌ guestEmail:', guestEmail);
                console.error('❌ booking.passengerInfo:', (booking as any)?.passengerInfo);
                throw new Error(
                  'Passenger email is required for payment. Please make sure you entered your email address when booking.'
                );
              }
          
              if (provider === 'WAKANOW') {
                endpoint = "/api/v1/payments/stripe/create-intent/guest";
                
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
                body = { 
                  bookingReference: bookingReference!, 
                  email: email,  // ✅ Use the email we found, not guestEmail
                };
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
            [BASE, booking],
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
      searchParams?: SearchParams | null,
    ): Promise<Booking> => {
      setIsCreating(true);
      setError(null);
  
      // ✅ Define realData FIRST
      const realData = item.realData || item;
      
      // ✅ Extract dates using searchParams and realData
      const checkInDate = searchParams?.checkInDate || 
                        item.checkInDate || 
                        item.check_in_date || 
                        realData.checkInDate || 
                        '';
                        
      const checkOutDate = searchParams?.checkOutDate || 
                         item.checkOutDate || 
                         item.check_out_date || 
                         realData.checkOutDate || 
                         '';
      
      // ✅ Validate dates
      if (!checkInDate || !checkOutDate) {
        throw new Error('Missing check-in or check-out dates. Please go back and select dates.');
      }
  
      try {
        // ✅ Extract the offer ID
        let offerId = '';
        
        console.log('🏨 createAmadeusHotelBooking - Input item:', {
          hasOfferId: !!item.offerId,
          hasOffer_id: !!item.offer_id,
          hasRealData: !!item.realData,
          hasHotelData: !!item.hotelData,
          hasOffers: !!(item.offers?.length),
          hasSelectedRoom: !!item.selectedRoom,
          hasPriceBreakdown: !!item.priceBreakdown,
          hotelId: item.hotelId || item.id,
          itemKeys: Object.keys(item),
          checkInDate,
          checkOutDate,
        });
        
        // Priority 1: Check for offer in selectedRoom
        if (item.selectedRoom?.offerId) {
          offerId = item.selectedRoom.offerId;
          console.log('🔑 Found offerId in selectedRoom:', offerId);
        }
        // Priority 2: Check for offer in realData
        else if (item.realData?.offerId) {
          offerId = item.realData.offerId;
          console.log('🔑 Found offerId in realData:', offerId);
        }
        // Priority 3: Check for offer in offers array (first offer)
        else if (item.offers && item.offers.length > 0 && item.offers[0]?.id) {
          offerId = item.offers[0].id;
          console.log('🔑 Found offerId in offers array:', offerId);
        }
        // Priority 4: Check for offer in hotelData
        else if (item.hotelData?.offers && item.hotelData.offers.length > 0) {
          offerId = item.hotelData.offers[0]?.id || '';
          console.log('🔑 Found offerId in hotelData.offers:', offerId);
        }
        // Priority 5: Check if the item itself is an offer ID
        else if (item.offerId && item.offerId !== item.hotelId && item.offerId !== item.id) {
          offerId = item.offerId;
          console.log('🔑 Using item.offerId:', offerId);
        }
        // Priority 6: Check for offer in priceBreakdown
        else if (item.priceBreakdown?.offerId) {
          offerId = item.priceBreakdown.offerId;
          console.log('🔑 Found offerId in priceBreakdown:', offerId);
        }
        // Priority 7: Check sessionStorage
        else if (typeof window !== 'undefined') {
          const storedOfferId = sessionStorage.getItem('hotelOfferId');
          if (storedOfferId) {
            offerId = storedOfferId;
            console.log('🔑 Found offerId in sessionStorage:', offerId);
          }
        }
        
        // ✅ If still no offerId, try to find it in the item
        if (!offerId) {
          if (item.id && item.id.length >= 10 && /^[A-Z0-9]{10,}$/i.test(item.id)) {
            offerId = item.id;
            console.log('🔑 Using item.id as offerId:', offerId);
          } else if (item.hotelId && item.hotelId.length >= 10 && /^[A-Z0-9]{10,}$/i.test(item.hotelId)) {
            offerId = item.hotelId;
            console.log('🔑 Using item.hotelId as offerId:', offerId);
          }
        }
        
        console.log("🔍 Extracted offerId:", {
          offerId,
          hotelId: item.hotelId || item.id,
          hasSelectedRoom: !!item.selectedRoom,
          hasRealData: !!item.realData,
          hasOffers: item.offers?.length,
        });
        
        // ✅ Validate the offer ID
        if (!offerId) {
          console.error("❌ No offer ID found!");
          console.error("📦 Full item data:", JSON.stringify(item, null, 2));
          throw new Error(
            "Invalid hotel offer. Please go back and search for hotels again. " +
            "Hotel offers expire quickly and cannot be reused from previous searches."
          );
        }
        
        // ✅ Check if it's a hotel ID pattern (3 letters + 5 alphanumeric)
        const isHotelIdPattern = /^[A-Z]{3}[A-Z0-9]{5}$/i.test(offerId);
        if (isHotelIdPattern) {
          console.warn('⚠️ Offer ID looks like a hotel ID:', offerId);
          const betterOfferId = item.offers?.[0]?.id || 
                               item.hotelData?.offers?.[0]?.id ||
                               item.realData?.offerId;
          if (betterOfferId && betterOfferId !== offerId) {
            offerId = betterOfferId;
            console.log('✅ Found better offer ID:', offerId);
          } else {
            throw new Error(
              "Invalid hotel offer. Please go back and search for hotels again. " +
              "Hotel offers expire quickly and cannot be reused from previous searches."
            );
          }
        }
        
        // ✅ Extract prices
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
        
        // ✅ Hotel details
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
        
        // ✅ Hotel images
        let hotelImages: string[] = [];
        if (item.images) {
          if (Array.isArray(item.images)) {
            hotelImages = item.images
              .filter((img: any) => img && typeof img === 'string')
              .map((img: any) => img);
          }
        }
        if (hotelImages.length === 0 && realData.images) {
          if (Array.isArray(realData.images)) {
            hotelImages = realData.images
              .filter((img: any) => img && typeof img === 'string')
              .map((img: any) => img);
          }
        }
        if (hotelImages.length === 0 && item.hotelData?.images) {
          if (Array.isArray(item.hotelData.images)) {
            hotelImages = item.hotelData.images
              .filter((img: any) => img && typeof img === 'string')
              .map((img: any) => img);
          }
        }
        
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
          checkOutDate,
          offerId,
          originalPrice,
          customerPrice,
          hotelImagesCount: hotelImages.length,
        });
        
        if (originalPrice <= 0) {
          console.error("❌ Missing original price! This offer may be expired.");
          throw new Error(
            "Hotel offer has expired or is missing pricing information. " +
            "Please search for hotels again to get current offers."
          );
        }
  
        const token = getStoredAuthToken();
  
        // ✅ Build booking payload
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
  
        console.log("📤 Sending Amadeus hotel booking request:", {
          endpoint,
          hotelOfferId: bookingPayload.hotelOfferId,
          offerPrice: bookingPayload.offerPrice,
          currency: bookingPayload.currency,
          hotelName: bookingPayload.hotelName,
          checkInDate: bookingPayload.checkInDate,
          checkOutDate: bookingPayload.checkOutDate,
          hotelImagesCount: bookingPayload.hotelImages?.length || 0,
        });
  
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
            offerId: offerId,
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