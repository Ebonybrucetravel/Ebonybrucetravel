"use client";
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { useBooking } from "@/hooks/useBooking";
import { useLanguage } from "@/context/LanguageContext";
import { config } from "@/lib/config";
import ReviewTrip from "@/components/ReviewTrip";
import PaymentModal from "@/components/payment/PaymentModal";
import AmadeusHotelPaymentModal from "@/components/payment/AmadeusHotelPaymentModal";
import type { Booking, PassengerInfo, SearchResult } from "@/lib/types";

// Extend the SearchResult type to include pricing fields
interface ExtendedSearchResult extends SearchResult {
  final_amount?: string;
  original_amount?: string;
  final_price?: string;
  original_price?: string;
  base_price?: string;
  original_currency?: string;
  markup_percentage?: number;
  markup_amount?: string;
  service_fee?: string;
  service_fee_percentage?: number;
  conversion_fee?: string;
  conversion_fee_percentage?: number;
  taxes?: string;
  currency?: string;
  originalPriceAmount?: number;
  originalPriceCurrency?: string;
  calculatedBasePrice?: number;
  calculatedMarkup?: number;
  calculatedServiceFee?: number;
  calculatedTaxes?: number;
  calculatedTotal?: number;
  realData?: {
    offerId?: string;
    finalPrice?: number;
    price?: number;
    currency?: string;
    [key: string]: any;
  };
  isDomestic?: boolean;
  isWakanow?: boolean;
  selectData?: string;
  terms_and_conditions?: {
    TermsAndConditions: string[];
    TermsAndConditionImportantNotice: string;
  } | null;
  bookingId?: string;
  offer_request_id?: string;
  offer_id?: string;
  connection_code?: string;
  token?: string;
  session_id?: string;
  booking_token?: string;
  [key: string]: any;
}

function isAmadeusHotel(item: ExtendedSearchResult): boolean {
  const rawType = (item?.type ?? "").toLowerCase();
  if (!rawType.includes("hotel")) return false;
  const hasOffer = !!item.realData?.offerId;
  const hasPrice =
    typeof item.realData?.finalPrice === "number" ||
    typeof item.realData?.price === "number";
  return hasOffer && hasPrice;
}

// ==================== AIRPORT COUNTRY MAPPING ====================
// Airport to country code mapping (expand this as needed)
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

// Helper function to get country code from airport code
const getCountryCodeFromAirport = (airportCode: string): string | null => {
  if (!airportCode) return null;
  
  // Extract 3-letter code from various formats
  const normalizedCode = airportCode.toUpperCase().trim();
  
  // Handle formats like "LOS (Lagos)" or "Lagos (LOS)"
  const match = normalizedCode.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : normalizedCode.substring(0, 3);
  
  return AIRPORT_COUNTRY_MAP[code] || null;
};

// Helper function to check if flight is domestic (same country)
const isDomesticFlight = (origin: string, destination: string): boolean => {
  const originCountry = getCountryCodeFromAirport(origin);
  const destinationCountry = getCountryCodeFromAirport(destination);
  
  console.log(`🛫 Domestic flight check:`, {
    origin,
    destination,
    originCountry,
    destinationCountry,
    isDomestic: originCountry && destinationCountry && originCountry === destinationCountry,
  });
  
  // If we can determine both countries, compare them
  if (originCountry && destinationCountry) {
    return originCountry === destinationCountry;
  }
  
  // Fallback: If we can't determine countries, check if first 3 letters are the same
  const normalizedOrigin = origin?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  const normalizedDest = destination?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  
  return !!normalizedOrigin && !!normalizedDest && normalizedOrigin === normalizedDest;
};

const ensureTermsExist = async (item: ExtendedSearchResult): Promise<ExtendedSearchResult> => {
  const termsExist = !!(item.terms_and_conditions && 
                       item.terms_and_conditions.TermsAndConditions && 
                       item.terms_and_conditions.TermsAndConditions.length > 0);
  
  if (termsExist) {
    console.log('✅ Terms already present:', item.terms_and_conditions?.TermsAndConditions?.length);
    return item;
  }
  
  // Only fetch for Wakanow flights with selectData
  if (item.isWakanow && item.selectData) {
    console.log('🔄 Fetching terms for Wakanow flight...');
    try {
      const { wakanowService } = await import('@/lib/wakanow.service');
      const flightDetails = await wakanowService.getFlightDetails(item.selectData, 'NGN');
      
      const hasFetchedTerms = flightDetails.termsAndConditions && flightDetails.termsAndConditions.length > 0;
      
      return {
        ...item,
        terms_and_conditions: hasFetchedTerms ? {
          TermsAndConditions: flightDetails.termsAndConditions!,
          TermsAndConditionImportantNotice: ''
        } : null,
        bookingId: flightDetails.bookingId,
      };
    } catch (error) {
      console.error('Failed to fetch terms:', error);
      return item;
    }
  }
  
  return item;
};

export default function BookingReviewPage() {
  const router = useRouter();
  const { selectedItem, searchParams, persistSelectionForReturn } = useSearch();
  const { isLoggedIn, user } = useAuth();
  const { createBooking, createAmadeusHotelBooking, createHotelbedsBooking, isCreating } = useBooking();
  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();
  const isMerchantPaymentModel = config.paymentModel === "merchant";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showAmadeusPayment, setShowAmadeusPayment] = useState(false);
  const [pendingPassengerInfo, setPendingPassengerInfo] = useState<PassengerInfo | null>(null);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | undefined>(undefined);
  const [enhancedItem, setEnhancedItem] = useState<ExtendedSearchResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFetchingTerms, setIsFetchingTerms] = useState(false);

  // Refs to prevent duplicate processing
  const hasProcessedRef = useRef(false);
  const hasFetchedTermsRef = useRef(false);

  const redirectToLogin = () => {
    persistSelectionForReturn();
    sessionStorage.setItem("authReturnTo", "/booking/review");
    router.push("/login");
  };

  const getProductType = (item: ExtendedSearchResult): "flight" | "hotel" | "car" => {
    const type = item.type?.toLowerCase() || "";
    if (type.includes("hotel")) return "hotel";
    if (type.includes("car")) return "car";
    return "flight";
  };

  // Fetch terms for Wakanow flights (ONCE)
  useEffect(() => {
    const loadTerms = async () => {
      if (!selectedItem || hasFetchedTermsRef.current) return;
      
      const item = selectedItem as ExtendedSearchResult;
      
      if (item.isWakanow && item.selectData && !item.terms_and_conditions) {
        setIsFetchingTerms(true);
        console.log('📋 Loading terms for Wakanow flight...');
        const itemWithTerms = await ensureTermsExist(item);
        if (itemWithTerms.terms_and_conditions) {
          setEnhancedItem(itemWithTerms);
          console.log('✅ Terms loaded and stored');
        } else {
          setEnhancedItem(item);
        }
        hasFetchedTermsRef.current = true;
        setIsFetchingTerms(false);
      } else if (!enhancedItem) {
        setEnhancedItem(item);
        hasFetchedTermsRef.current = true;
      }
    };
    
    loadTerms();
  }, [selectedItem, enhancedItem]);

  // Process currency conversion (ONCE)
  useEffect(() => {
    const processItem = async () => {
      const itemToProcess = enhancedItem || selectedItem;
      if (!itemToProcess || hasProcessedRef.current) return;
      
      setIsConverting(true);
      const item = itemToProcess as ExtendedSearchResult;
      
      try {
        const originalAmountNGN = parseFloat(item.original_amount || "0");
        const serviceFeeNGN = parseFloat(item.service_fee || "0");
        const finalAmountNGN = parseFloat(item.final_amount || "0");
        const originalCurrency = item.original_currency || "NGN";
        
        let convertedOriginalAmount = originalAmountNGN;
        let convertedServiceFee = serviceFeeNGN;
        let convertedFinalAmount = finalAmountNGN;
        let displayCurrency = originalCurrency;
        
        if (originalCurrency !== currency.code && originalAmountNGN > 0) {
          convertedOriginalAmount = await convertPrice(originalAmountNGN, originalCurrency);
          convertedServiceFee = await convertPrice(serviceFeeNGN, originalCurrency);
          convertedFinalAmount = await convertPrice(finalAmountNGN, originalCurrency);
          displayCurrency = currency.code;
        }
        
        const updatedItem: ExtendedSearchResult = {
          ...item,
          price: await formatPrice(convertedFinalAmount, displayCurrency),
          displayPrice: await formatPrice(convertedFinalAmount, displayCurrency),
          totalPrice: await formatPrice(convertedFinalAmount, displayCurrency),
          currency: displayCurrency,
          rawPrice: convertedFinalAmount,
          original_amount: convertedOriginalAmount.toString(),
          original_currency: displayCurrency,
          service_fee: convertedServiceFee.toString(),
          final_amount: convertedFinalAmount.toString(),
          originalPriceAmount: originalAmountNGN,
          originalPriceCurrency: originalCurrency,
          calculatedBasePrice: convertedOriginalAmount,
          calculatedMarkup: parseFloat(item.markup_amount || "0"),
          calculatedServiceFee: convertedServiceFee,
          calculatedTaxes: parseFloat(item.taxes || "0"),
          calculatedTotal: convertedFinalAmount,
        };
        
        setEnhancedItem(updatedItem);
        hasProcessedRef.current = true;
      } catch (error) {
        console.error('Failed to process item:', error);
        setEnhancedItem(item);
        hasProcessedRef.current = true;
      } finally {
        setIsConverting(false);
      }
    };
    
    processItem();
  }, [enhancedItem, selectedItem, currency, convertPrice, formatPrice]);

  // Define these BEFORE the handler functions
  const extendedItem = (enhancedItem || selectedItem) as ExtendedSearchResult;
  const useAmadeusFlow = isAmadeusHotel(extendedItem);
  const productType = getProductType(extendedItem);

  const handleProceedToPayment = async (
    passengerInfo: PassengerInfo,
    voucherCode?: string,
    hbxMetadata?: any,
  ) => {
    const isGuest = !isLoggedIn;
  
    const isFlight = extendedItem?.type?.toLowerCase().includes("flight") ||
      extendedItem?.type?.toLowerCase().includes("duffel") ||
      extendedItem?.type?.toLowerCase().includes("wakanow");
  
    // Flight validations
    if (isFlight) {
      if (!passengerInfo.dateOfBirth) {
        toast.error("Date of birth is required for flight bookings");
        return;
      }
      if (!passengerInfo.title) {
        toast.error("Title is required for flight bookings");
        return;
      }
      if (!passengerInfo.gender) {
        toast.error("Gender is required for flight bookings");
        return;
      }
  
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(passengerInfo.dateOfBirth)) {
        toast.error("Date of birth must be in YYYY-MM-DD format");
        return;
      }
  
      const dob = new Date(passengerInfo.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 2) {
        toast.error("Passenger must be at least 2 years old");
        return;
      }
    }
  
    // Amadeus Hotel with merchant payment model
    if (useAmadeusFlow && isMerchantPaymentModel) {
      try {
        console.log("📝 Creating Amadeus hotel booking...");
        const newBooking = await createAmadeusHotelBooking(
          extendedItem,
          passengerInfo,
          undefined,
          isGuest,
        );
        console.log("✅ Booking created:", newBooking);
        setBooking(newBooking);
        setAppliedVoucherCode(voucherCode);
        setShowPayment(true);
      } catch (err: any) {
        console.error("❌ Booking creation failed:", err);
        toast.error(err?.message ?? "We couldn't create your booking. Please try again.");
      }
      return;
    }
  
    // Amadeus Hotel with other payment model
    if (useAmadeusFlow) {
      setPendingPassengerInfo(passengerInfo);
      setAppliedVoucherCode(voucherCode);
      setShowAmadeusPayment(true);
      return;
    }
  
    // Hotelbeds flow
    const isHotelbeds = extendedItem.provider?.toLowerCase() === "hotelbeds";
    if (isHotelbeds) {
      try {
        console.log("🏨 Creating Hotelbeds booking...", { hbxMetadata });
        const newBooking = await createHotelbedsBooking(
          extendedItem,
          passengerInfo,
          isGuest,
          hbxMetadata,
        );
        console.log("✅ Hotelbeds booking created:", newBooking);
        setBooking(newBooking);
        setAppliedVoucherCode(voucherCode);
        setShowPayment(true);
      } catch (err: any) {
        console.error("❌ Hotelbeds booking failed:", err);
        toast.error(err?.message ?? "We couldn't create your Hotelbeds booking. Please try again.");
      }
      return;
    }
  
    // ==================== FLIGHT BOOKING FLOW (Wakanow or Duffel) ====================
    try {
      let bookingItem = extendedItem;
      
      // Fetch terms for Wakanow flights if needed
      if (isFlight && extendedItem.isWakanow) {
        bookingItem = await ensureTermsExist(extendedItem);
        if (bookingItem !== extendedItem) {
          setEnhancedItem(bookingItem);
        }
      }
  
      // Detect if this is a domestic flight (same country)
      const origin = bookingItem.origin || bookingItem.departureAirport || bookingItem.bookingData?.origin;
      const destination = bookingItem.destination || bookingItem.arrivalAirport || bookingItem.bookingData?.destination;
      const isDomestic = origin && destination && isDomesticFlight(origin, destination);
      
      // ✅ Determine provider correctly based on the actual flight source
      let finalProvider = bookingItem.provider || 'DUFFEL';
      
      // Normalize provider name
      if (bookingItem.isWakanow === true || bookingItem.provider?.toLowerCase() === 'wakanow') {
        finalProvider = 'WAKANOW';
      } else if (bookingItem.provider?.toLowerCase() === 'duffel') {
        finalProvider = 'DUFFEL';
      }
      
      console.log(`✈️ Flight booking details:`, {
        originalProvider: bookingItem.provider,
        isWakanowFlag: bookingItem.isWakanow,
        isDomestic,
        finalProvider,
        hasSelectData: !!bookingItem.selectData,
        hasOfferRequestId: !!bookingItem.offer_request_id,
        hasOfferId: !!bookingItem.offer_id,
        hasConnectionCode: !!bookingItem.connection_code,
        origin,
        destination,
      });
      
      // ✅ Validate required fields based on provider
      if (finalProvider === 'WAKANOW') {
        // Try to get selectData from multiple possible sources
        const selectDataValue = bookingItem.selectData || 
                               bookingItem.token || 
                               bookingItem.session_id || 
                               bookingItem.booking_token ||
                               bookingItem.connection_code;
        
        if (!selectDataValue) {
          console.error('❌ Wakanow flight missing selectData. Available fields:', {
            selectData: bookingItem.selectData,
            token: bookingItem.token,
            session_id: bookingItem.session_id,
            booking_token: bookingItem.booking_token,
            connection_code: bookingItem.connection_code,
          });
          throw new Error('Missing booking token for this flight. Please go back and select the flight again.');
        }
        
        if (!bookingItem.selectData) {
          console.log('✅ Using alternative selectData source');
          bookingItem = { ...bookingItem, selectData: selectDataValue };
        }
      }
      
      if (finalProvider === 'DUFFEL' && !bookingItem.offer_request_id) {
        console.error('❌ Duffel flight missing offer_request_id:', bookingItem);
        throw new Error('Missing offer ID for this flight. Please go back and select the flight again.');
      }
      
      const basePrice = bookingItem.calculatedBasePrice || parseFloat(bookingItem.original_amount || "0");
      const serviceFee = bookingItem.calculatedServiceFee || parseFloat(bookingItem.service_fee || "0");
      const finalAmount = bookingItem.calculatedTotal || parseFloat(bookingItem.final_amount || "0");
  
      // Create corrected item with proper provider
      const correctedItem = {
        ...bookingItem,
        provider: finalProvider,
        isDomestic: isDomestic,
        originalProvider: bookingItem.provider,
        productTypeOverride: isDomestic ? 'FLIGHT_DOMESTIC' : 'FLIGHT_INTERNATIONAL',
      };
  
      console.log('📦 Creating booking with corrected item:', {
        id: correctedItem.id,
        provider: correctedItem.provider,
        isWakanow: correctedItem.isWakanow,
        hasSelectData: !!correctedItem.selectData,
        hasOfferRequestId: !!correctedItem.offer_request_id,
        finalAmount,
      });
  
      const newBooking = await createBooking(
        correctedItem,
        searchParams,
        passengerInfo,
        isGuest,
        {
          taxes: serviceFee,
          basePrice: basePrice,
          finalAmount: finalAmount,
        },
      );
  
      console.log("✅ Booking created successfully:", newBooking);
      setBooking(newBooking);
      setAppliedVoucherCode(voucherCode);
      setShowPayment(true);
    } catch (err: any) {
      console.error("❌ Booking creation failed:", err);
      toast.error(err.message ?? "We couldn't create your booking. Please try again.");
    }
  };

  const handlePaymentSuccess = (confirmed: Booking) => {
    console.log("🎉 Payment success callback received:", {
      id: confirmed.id,
      reference: confirmed.reference,
      provider: confirmed.provider,
    });
    
    if (isNavigating) return;
    setIsNavigating(true);
    
    setShowPayment(false);
    setShowAmadeusPayment(false);
    setPendingPassengerInfo(null);
    
    // Store booking data for recovery on success page
    try {
      sessionStorage.setItem('last_booking', JSON.stringify(confirmed));
      sessionStorage.setItem('last_booking_id', confirmed.id);
      sessionStorage.setItem('last_booking_ref', confirmed.reference);
      
      if (!isLoggedIn && confirmed.passengerInfo?.email) {
        sessionStorage.setItem('guest_booking_email', confirmed.passengerInfo.email);
      }
      
      console.log("💾 Stored booking in sessionStorage");
    } catch (error) {
      console.error("Failed to store booking:", error);
    }
    
    // Navigate to success page
    const successUrl = `/booking/success?id=${confirmed.id}&ref=${confirmed.reference}&provider=${confirmed.provider}`;
    console.log("🔗 Navigating to success page:", successUrl);
    
    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      window.location.href = successUrl;
    }, 200);
  };

  // Loading and error states
  if (!selectedItem) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">No booking to review</h1>
        <p className="text-gray-600 mb-8">Please select an item from search to continue.</p>
        <button onClick={() => router.push("/search")} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg">
          Back to search
        </button>
      </div>
    );
  }

  if ((isLoadingRates || isConverting || isFetchingTerms) && !enhancedItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">
            {isFetchingTerms ? 'Loading terms & conditions...' : `Loading prices in ${currency.code}...`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReviewTrip
        item={enhancedItem || selectedItem}
        searchParams={searchParams}
        isLoggedIn={isLoggedIn}
        user={user}
        isCreating={isCreating}
        onBack={() => router.back()}
        onProceedToPayment={handleProceedToPayment}
        onSignInRequired={redirectToLogin}
        createdBooking={booking}
      />

      {showPayment && booking && (
        <PaymentModal
          booking={booking}
          isGuest={!isLoggedIn}
          voucherCode={appliedVoucherCode}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      )}

      {showAmadeusPayment && selectedItem && pendingPassengerInfo && (
        <AmadeusHotelPaymentModal
          item={selectedItem}
          passengerInfo={pendingPassengerInfo}
          isGuest={!isLoggedIn}
          voucherCode={appliedVoucherCode}
          onSuccess={handlePaymentSuccess}
          onCancel={() => {
            setShowAmadeusPayment(false);
            setPendingPassengerInfo(null);
          }}
          onSignInRequired={redirectToLogin}
        />
      )}
    </>
  );
}