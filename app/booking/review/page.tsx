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
  price_after_conversion?: string;
  priceObject?: { total?: string; amount?: string; currency?: string };
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

// ✅ IMPROVED: Better Amadeus hotel detection
function isAmadeusHotel(item: ExtendedSearchResult): boolean {
  const rawType = (item?.type ?? "").toLowerCase();
  
  // Must be a hotel type
  const isHotelType = rawType.includes("hotel");
  if (!isHotelType) return false;
  
  // Has offer ID or basic hotel ID
  const hasOfferId = !!item.realData?.offerId;
  const hasHotelId = !!item.id;
  
  return (hasOfferId || hasHotelId);
}

// ==================== AIRPORT COUNTRY MAPPING ====================
const AIRPORT_COUNTRY_MAP: Record<string, string> = {
  'LOS': 'NG', 'ABV': 'NG', 'PHC': 'NG', 'KAN': 'NG', 'ENU': 'NG',
  'QOW': 'NG', 'BNI': 'NG', 'JOS': 'NG', 'KAD': 'NG', 'YOL': 'NG',
  'ILR': 'NG', 'MDI': 'NG', 'CBQ': 'NG', 'QRW': 'NG', 'SKO': 'NG',
  'JFK': 'US', 'LAX': 'US', 'ORD': 'US', 'DFW': 'US', 'DEN': 'US',
  'SFO': 'US', 'SEA': 'US', 'LAS': 'US', 'MCO': 'US', 'EWR': 'US',
  'MIA': 'US', 'BOS': 'US', 'ATL': 'US', 'IAH': 'US', 'PHX': 'US',
  'LGA': 'US', 'DCA': 'US', 'IAD': 'US', 'CLT': 'US', 'MSP': 'US',
  'DTW': 'US', 'FLL': 'US', 'TPA': 'US', 'SAN': 'US', 'PDX': 'US',
  'LHR': 'GB', 'LGW': 'GB', 'MAN': 'GB', 'EDI': 'GB', 'GLA': 'GB',
  'BHX': 'GB', 'BRS': 'GB', 'LTN': 'GB', 'STN': 'GB', 'LCY': 'GB',
  'NCL': 'GB', 'BFS': 'GB', 'ABZ': 'GB',
  'YYZ': 'CA', 'YVR': 'CA', 'YUL': 'CA', 'YYC': 'CA', 'YOW': 'CA',
  'YEG': 'CA', 'YHZ': 'CA', 'YWG': 'CA',
  'DXB': 'AE', 'AUH': 'AE', 'SHJ': 'AE',
  'DEL': 'IN', 'BOM': 'IN', 'BLR': 'IN', 'MAA': 'IN', 'CCU': 'IN',
  'HYD': 'IN', 'COK': 'IN', 'GOI': 'IN',
  'PEK': 'CN', 'PVG': 'CN', 'CAN': 'CN', 'SZX': 'CN', 'CTU': 'CN',
  'HND': 'JP', 'NRT': 'JP', 'KIX': 'JP', 'CTS': 'JP', 'FUK': 'JP',
  'SYD': 'AU', 'MEL': 'AU', 'BNE': 'AU', 'PER': 'AU', 'ADL': 'AU',
  'FRA': 'DE', 'MUC': 'DE', 'BER': 'DE', 'HAM': 'DE', 'CGN': 'DE',
  'DUS': 'DE', 'STR': 'DE',
  'CDG': 'FR', 'ORY': 'FR', 'NCE': 'FR', 'LYS': 'FR', 'MRS': 'FR',
  'JNB': 'ZA', 'CPT': 'ZA', 'DUR': 'ZA', 'PLZ': 'ZA',
  'NBO': 'KE', 'MBA': 'KE',
  'CAI': 'EG', 'HRG': 'EG', 'SSH': 'EG',
  'ACC': 'GH',
  'ADD': 'ET',
  'IST': 'TR', 'SAW': 'TR', 'ESB': 'TR',
  'SIN': 'SG',
  'KUL': 'MY', 'PEN': 'MY',
  'BKK': 'TH', 'HKT': 'TH', 'CNX': 'TH',
  'HAN': 'VN', 'SGN': 'VN', 'DAD': 'VN',
  'MNL': 'PH', 'CEB': 'PH',
  'GRU': 'BR', 'GIG': 'BR', 'BSB': 'BR',
  'MEX': 'MX', 'CUN': 'MX', 'GDL': 'MX',
  'MAD': 'ES', 'BCN': 'ES', 'AGP': 'ES',
  'FCO': 'IT', 'MXP': 'IT', 'VCE': 'IT',
  'AMS': 'NL',
  'ZRH': 'CH', 'GVA': 'CH',
  'BRU': 'BE',
  'VIE': 'AT',
  'ARN': 'SE',
  'OSL': 'NO',
  'CPH': 'DK',
  'DOH': 'QA',
  'MCT': 'OM',
  'BAH': 'BH',
  'KWI': 'KW',
  'JED': 'SA', 'RUH': 'SA', 'DMM': 'SA',
  'AMM': 'JO',
  'TLV': 'IL',
  'BEY': 'LB',
  'KHI': 'PK', 'LHE': 'PK', 'ISB': 'PK',
  'DAC': 'BD',
  'CMB': 'LK',
  'CGK': 'ID', 'DPS': 'ID',
  'ICN': 'KR', 'GMP': 'KR', 'PUS': 'KR',
  'AKL': 'NZ', 'WLG': 'NZ', 'CHC': 'NZ',
  'EZE': 'AR', 'AEP': 'AR',
  'SCL': 'CL',
  'BOG': 'CO',
  'PTY': 'PA',
  'DUB': 'IE', 'SNN': 'IE',
  'LIS': 'PT', 'OPO': 'PT',
  'ATH': 'GR', 'SKG': 'GR',
  'WAW': 'PL', 'KRK': 'PL',
  'PRG': 'CZ',
  'BUD': 'HU',
  'OTP': 'RO',
  'SOF': 'BG',
  'ZAG': 'HR',
  'CMN': 'MA', 'RAK': 'MA',
  'TUN': 'TN',
  'DSS': 'SN', 'DKR': 'SN',
  'ABJ': 'CI',
  'DLA': 'CM', 'NSI': 'CM',
  'LAD': 'AO',
  'HRE': 'ZW',
  'LUN': 'ZM',
  'GBE': 'BW',
  'MRU': 'MU',
  'SEZ': 'SC',
  'MLE': 'MV',
  'KTM': 'NP',
  'TAS': 'UZ',
  'ALA': 'KZ',
  'GYD': 'AZ',
  'TBS': 'GE',
  'EVN': 'AM',
  'BEG': 'RS',
  'HEL': 'FI',
};

const getCountryCodeFromAirport = (airportCode: string): string | null => {
  if (!airportCode) return null;
  const normalizedCode = airportCode.toUpperCase().trim();
  const match = normalizedCode.match(/\b([A-Z]{3})\b/);
  const code = match ? match[1] : normalizedCode.substring(0, 3);
  return AIRPORT_COUNTRY_MAP[code] || null;
};

const isDomesticFlight = (origin: string, destination: string): boolean => {
  const originCountry = getCountryCodeFromAirport(origin);
  const destinationCountry = getCountryCodeFromAirport(destination);
  
  if (originCountry && destinationCountry) {
    return originCountry === destinationCountry;
  }
  
  const normalizedOrigin = origin?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  const normalizedDest = destination?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
  
  return !!normalizedOrigin && !!normalizedDest && normalizedOrigin === normalizedDest;
};

const ensureTermsExist = async (item: ExtendedSearchResult): Promise<ExtendedSearchResult> => {
  const termsExist = !!(item.terms_and_conditions && 
                       item.terms_and_conditions.TermsAndConditions && 
                       item.terms_and_conditions.TermsAndConditions.length > 0);
  
  if (termsExist) {
    return item;
  }
  
  if (item.isWakanow && item.selectData) {
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
  const { createBooking, createAmadeusHotelBooking, isCreating } = useBooking();
  const { currency, formatPrice, isLoadingRates } = useLanguage();
  const isMerchantPaymentModel = config.paymentModel === "merchant";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showAmadeusPayment, setShowAmadeusPayment] = useState(false);
  const [pendingPassengerInfo, setPendingPassengerInfo] = useState<PassengerInfo | null>(null);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | undefined>(undefined);
  const [enhancedItem, setEnhancedItem] = useState<ExtendedSearchResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFetchingTerms, setIsFetchingTerms] = useState(false);

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
        const itemWithTerms = await ensureTermsExist(item);
        if (itemWithTerms.terms_and_conditions) {
          setEnhancedItem(itemWithTerms);
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

  // Process item - USE BACKEND DATA DIRECTLY, NO CONVERSION
  useEffect(() => {
    const processItem = async () => {
      const itemToProcess = enhancedItem || selectedItem;
      if (!itemToProcess || hasProcessedRef.current) return;
      
      setIsProcessing(true);
      const item = itemToProcess as ExtendedSearchResult;
      
      try {
        let finalPrice = 0;
        let originalPrice = 0;
        let basePrice = 0;
        let serviceFee = 0;
        let markupAmount = 0;
        let conversionFee = 0;
        let displayCurrency = item.currency || currency.code || 'NGN';
        let originalCurrency = item.original_currency || 'EUR';
        
        console.log('💰 PROCESSING ITEM - Raw price fields:', {
          final_price: item.final_price,
          final_amount: item.final_amount,
          price_after_conversion: item.price_after_conversion,
          original_amount: item.original_amount,
          item_currency: item.currency,
          item_type: item.type
        });
        
        // PRIORITY 1: Use backend's final_price (string)
        if (item.final_price && typeof item.final_price === 'string') {
          finalPrice = parseFloat(item.final_price);
        } 
        // PRIORITY 2: Use final_price as number
        else if (item.final_price && typeof item.final_price === 'number') {
          finalPrice = item.final_price;
        }
        // PRIORITY 3: Use final_amount
        else if (item.final_amount && typeof item.final_amount === 'string') {
          finalPrice = parseFloat(item.final_amount);
        }
        // PRIORITY 4: Use final_amount as number
        else if (item.final_amount && typeof item.final_amount === 'number') {
          finalPrice = item.final_amount;
        }
        // PRIORITY 5: Use price_after_conversion
        else if (item.price_after_conversion && typeof item.price_after_conversion === 'string') {
          finalPrice = parseFloat(item.price_after_conversion);
        }
        // PRIORITY 6: Handle price as object with total property
        else if (item.price && typeof item.price === 'object') {
          const priceObj = item.price as { total?: string; amount?: string; currency?: string };
          if (priceObj.total && typeof priceObj.total === 'string') {
            finalPrice = parseFloat(priceObj.total);
          } else if (priceObj.amount && typeof priceObj.amount === 'string') {
            finalPrice = parseFloat(priceObj.amount);
          }
        }
        // PRIORITY 7: If price is a string directly
        else if (item.price && typeof item.price === 'string') {
          finalPrice = parseFloat(item.price);
        }
        // PRIORITY 8: Use totalPrice
        else if (item.totalPrice && typeof item.totalPrice === 'string') {
          finalPrice = parseFloat(item.totalPrice);
        }
        // PRIORITY 9: Use original_amount as fallback
        else if (item.original_amount && typeof item.original_amount === 'string') {
          finalPrice = parseFloat(item.original_amount);
        }
        
        console.log('💰 PROCESSING ITEM - Extracted finalPrice:', finalPrice);
        
        // Get original price
        if (item.original_price && typeof item.original_price === 'string') {
          originalPrice = parseFloat(item.original_price);
          originalCurrency = item.original_currency || 'EUR';
        } else if (item.original_amount) {
          originalPrice = parseFloat(item.original_amount);
        }
        
        // Get breakdown fields from backend
        if (item.base_price) basePrice = parseFloat(item.base_price);
        if (item.service_fee) serviceFee = parseFloat(item.service_fee);
        if (item.markup_amount) markupAmount = parseFloat(item.markup_amount);
        if (item.conversion_fee) conversionFee = parseFloat(item.conversion_fee);
        
        // Get currency from backend
        if (item.currency) displayCurrency = item.currency;
        
        // Format the final price for display
        const formattedPrice = await formatPrice(finalPrice, displayCurrency);
        
        console.log('💰 PROCESSING ITEM - Setting final values:', {
          finalPrice,
          displayCurrency,
          formattedPrice
        });
        
        const updatedItem: ExtendedSearchResult = {
          ...item,
          price: formattedPrice,
          displayPrice: formattedPrice,
          totalPrice: formattedPrice,
          currency: displayCurrency,
          rawPrice: finalPrice,
          original_amount: originalPrice.toString(),
          original_currency: originalCurrency,
          final_amount: finalPrice.toString(),
          final_price: finalPrice.toString(),
          service_fee: serviceFee.toString(),
          base_price: basePrice.toString(),
          markup_amount: markupAmount.toString(),
          conversion_fee: conversionFee.toString(),
          originalPriceAmount: originalPrice,
          originalPriceCurrency: originalCurrency,
          calculatedBasePrice: basePrice,
          calculatedServiceFee: serviceFee,
          calculatedMarkup: markupAmount,
          calculatedTotal: finalPrice,
        };
        
        setEnhancedItem(updatedItem);
        hasProcessedRef.current = true;
      } catch (error) {
        console.error('Failed to process item:', error);
        setEnhancedItem(item);
        hasProcessedRef.current = true;
      } finally {
        setIsProcessing(false);
      }
    };
    
    processItem();
  }, [enhancedItem, selectedItem, currency.code, formatPrice]);

  const extendedItem = (enhancedItem || selectedItem) as ExtendedSearchResult;
  const isHotel = getProductType(extendedItem) === "hotel";
  const isCar = getProductType(extendedItem) === "car";
  const isFlight = !isHotel && !isCar;

  const handleProceedToPayment = async (
    passengerInfo: PassengerInfo,
    voucherCode?: string,
  ) => {
    const isGuest = !isLoggedIn;
  
    // ============ FLIGHT VALIDATIONS ============
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
  
    // ============ CLEAN PASSENGER INFO ============
    const cleanedPassengerInfo: PassengerInfo = {
      firstName: passengerInfo.firstName,
      lastName: passengerInfo.lastName,
      email: passengerInfo.email,
      phone: passengerInfo.phone,
    };
  
    console.log("🔍 Booking flow detection:", {
      isHotel,
      isCar,
      isFlight,
      provider: extendedItem?.provider,
      isMerchantPaymentModel,
    });
  
    // ==================== HOTEL BOOKING FLOW ====================
    if (isHotel && !isCar) {
      // Amadeus Hotel with merchant payment model
      if (isMerchantPaymentModel) {
        try {
          console.log("🏨 Creating Amadeus hotel booking with merchant payment model...");
          
          const correctPrice = parseFloat(extendedItem.final_amount || extendedItem.final_price || '0');
          console.log("💰 Amadeus hotel price check:", {
            final_amount: extendedItem.final_amount,
            final_price: extendedItem.final_price,
            correctPrice: correctPrice
          });
          
          let finalItem = extendedItem;
          if (correctPrice < 500000 && typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('selectedHotel');
            if (stored) {
              try {
                const hotelData = JSON.parse(stored);
                const storedPrice = parseFloat(hotelData.final_amount || hotelData.final_price || '0');
                if (storedPrice > correctPrice && storedPrice > 0) {
                  console.log("💰 Restoring correct price from sessionStorage:", storedPrice);
                  finalItem = {
                    ...extendedItem,
                    final_amount: hotelData.final_amount,
                    final_price: hotelData.final_price,
                  };
                }
              } catch (e) {}
            }
          }
          
          const finalPrice = parseFloat(finalItem.final_amount || finalItem.final_price || '0');
          console.log("💰 Final price being sent to createAmadeusHotelBooking:", finalPrice);
          
          const testCard = {
            cardNumber: "4242424242424242",
            expiryMonth: "12",
            expiryYear: "2026",
            cvc: "123",
            holderName: `${cleanedPassengerInfo.firstName} ${cleanedPassengerInfo.lastName}`,
          };
          
          const newBooking = await createAmadeusHotelBooking(
            finalItem,
            cleanedPassengerInfo,
            testCard,
            isGuest,
          );
          setBooking(newBooking);
          setAppliedVoucherCode(voucherCode);
          setShowPayment(true);
        } catch (err: any) {
          console.error("Amadeus hotel booking error:", err);
          toast.error(err?.message ?? "We couldn't create your booking. Please try again.");
        }
        return;
      }
      
      // Amadeus Hotel with other payment model (standard)
      console.log("🏨 Setting up Amadeus hotel payment modal...");
      setPendingPassengerInfo(cleanedPassengerInfo);
      setAppliedVoucherCode(voucherCode);
      setShowAmadeusPayment(true);
      return;
    }
  
    // ==================== CAR RENTAL BOOKING FLOW ====================
    if (isCar) {
      try {
        console.log("🚗 Creating car rental booking...");
        const correctedItem = {
          ...extendedItem,
          provider: 'AMADEUS',
          productTypeOverride: 'CAR_RENTAL',
        };
        const newBooking = await createBooking(
          correctedItem,
          searchParams,
          cleanedPassengerInfo,
          isGuest,
          {
            taxes: 0,
            basePrice: 0,
            finalAmount: 0,
          },
        );
        setBooking(newBooking);
        setAppliedVoucherCode(voucherCode);
        setShowPayment(true);
      } catch (err: any) {
        toast.error(err.message ?? "We couldn't create your car rental booking. Please try again.");
      }
      return;
    }
  
    // ==================== FLIGHT BOOKING FLOW ====================
    try {
      let bookingItem = extendedItem;
      
      if (isFlight && extendedItem.isWakanow) {
        bookingItem = await ensureTermsExist(extendedItem);
        if (bookingItem !== extendedItem) {
          setEnhancedItem(bookingItem);
        }
      }
  
      const origin = bookingItem.origin || bookingItem.departureAirport || bookingItem.bookingData?.origin;
      const destination = bookingItem.destination || bookingItem.arrivalAirport || bookingItem.bookingData?.destination;
      const isDomesticFlightResult = origin && destination && isDomesticFlight(origin, destination);
      
      let finalProvider = bookingItem.provider || 'DUFFEL';
      
      if (bookingItem.isWakanow === true || bookingItem.provider?.toLowerCase() === 'wakanow') {
        finalProvider = 'WAKANOW';
      } else if (bookingItem.provider?.toLowerCase() === 'duffel') {
        finalProvider = 'DUFFEL';
      }
      
      if (finalProvider === 'WAKANOW') {
        const selectDataValue = bookingItem.selectData || 
                               bookingItem.token || 
                               bookingItem.session_id || 
                               bookingItem.booking_token ||
                               bookingItem.connection_code;
        
        if (!selectDataValue) {
          throw new Error('Missing booking token for this flight. Please go back and select the flight again.');
        }
        
        if (!bookingItem.selectData) {
          bookingItem = { ...bookingItem, selectData: selectDataValue };
        }
      }
      
      if (finalProvider === 'DUFFEL' && !bookingItem.offer_request_id) {
        throw new Error('Missing offer ID for this flight. Please go back and select the flight again.');
      }
      
      const basePrice = bookingItem.calculatedBasePrice || parseFloat(bookingItem.original_amount || "0");
      const serviceFee = bookingItem.calculatedServiceFee || parseFloat(bookingItem.service_fee || "0");
      const finalAmount = bookingItem.calculatedTotal || parseFloat(bookingItem.final_amount || "0");
  
      const correctedItem = {
        ...bookingItem,
        provider: finalProvider,
        isDomestic: isDomesticFlightResult,
        originalProvider: bookingItem.provider,
        productTypeOverride: isDomesticFlightResult ? 'FLIGHT_DOMESTIC' : 'FLIGHT_INTERNATIONAL',
      };
  
      console.log("✈️ Creating flight booking with provider:", finalProvider);
  
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
  
      setBooking(newBooking);
      setAppliedVoucherCode(voucherCode);
      setShowPayment(true);
    } catch (err: any) {
      toast.error(err.message ?? "We couldn't create your booking. Please try again.");
    }
  };

  const handlePaymentSuccess = (confirmed: Booking) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    setShowPayment(false);
    setShowAmadeusPayment(false);
    setPendingPassengerInfo(null);
    
    try {
      sessionStorage.setItem('last_booking', JSON.stringify(confirmed));
      sessionStorage.setItem('last_booking_id', confirmed.id);
      sessionStorage.setItem('last_booking_ref', confirmed.reference);
      
      if (!isLoggedIn && confirmed.passengerInfo?.email) {
        sessionStorage.setItem('guest_booking_email', confirmed.passengerInfo.email);
      }
    } catch (error) {
      console.error("Failed to store booking:", error);
    }
    
    const successUrl = `/booking/success?id=${confirmed.id}&ref=${confirmed.reference}&provider=${confirmed.provider}`;
    
    setTimeout(() => {
      window.location.href = successUrl;
    }, 200);
  };

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

  if ((isLoadingRates || isProcessing || isFetchingTerms) && !enhancedItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">
            {isFetchingTerms ? 'Loading terms & conditions...' : 'Loading booking details...'}
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