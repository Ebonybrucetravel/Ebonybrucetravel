"use client";
import React, { useState, useEffect } from "react";
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
  // Flight fields
  final_amount?: string;
  original_amount?: string;

  // Car rental & Hotel fields
  final_price?: string;
  original_price?: string;
  base_price?: string;

  // Common fields
  original_currency?: string;
  markup_percentage?: number;
  markup_amount?: string;
  service_fee?: string;
  currency?: string;
  
  // Original price info for conversion
  originalPriceAmount?: number;
  originalPriceCurrency?: string;

  realData?: {
    offerId?: string;
    finalPrice?: number;
    price?: number;
    currency?: string;
    [key: string]: any;
  };
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
  const [pendingPassengerInfo, setPendingPassengerInfo] =
    useState<PassengerInfo | null>(null);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<
    string | undefined
  >(undefined);

  // ✅ State for enhanced item with calculated taxes and converted prices
  const [enhancedItem, setEnhancedItem] = useState<ExtendedSearchResult | null>(
    null,
  );
  const [isConverting, setIsConverting] = useState(false);

  const redirectToLogin = () => {
    persistSelectionForReturn();
    sessionStorage.setItem("authReturnTo", "/booking/review");
    router.push("/login");
  };

  // ✅ Helper function to safely extract price value
  const extractPriceValue = (price: any): number => {
    if (!price) return 0;
    if (typeof price === "number") return price;
    if (typeof price === "string") {
      return parseFloat(price.replace(/[^\d.]/g, "")) || 0;
    }
    return 0;
  };

  // ✅ Determine product type
  const getProductType = (
    item: ExtendedSearchResult,
  ): "flight" | "hotel" | "car" => {
    const type = item.type?.toLowerCase() || "";
    if (type.includes("hotel")) return "hotel";
    if (type.includes("car")) return "car";
    return "flight";
  };

  // ✅ Get price fields based on product type
  const getPriceFields = (item: ExtendedSearchResult) => {
    const productType = getProductType(item);

    // For flights
    if (productType === "flight") {
      return {
        original: item.original_amount,
        final: item.final_amount,
        base: item.original_amount,
      };
    }

    // For hotels and car rentals
    return {
      original: item.original_price,
      final: item.final_price,
      base: item.base_price || item.original_price,
    };
  };

  // ✅ Get original price and currency from item - FIXED FOR HOTELS
  const getOriginalPriceInfo = (item: ExtendedSearchResult): { amount: number; currency: string } => {
    const productType = getProductType(item);
    
    // Check if we already have stored original price info
    if (item.originalPriceAmount && item.originalPriceCurrency) {
      return {
        amount: item.originalPriceAmount,
        currency: item.originalPriceCurrency
      };
    }
    
    // For flights
    if (productType === "flight") {
      // Check for Wakanow flights
      if ((item as any).isWakanow) {
        if ((item as any).isWakanowDomestic) {
          return {
            amount: parseFloat(item.original_amount || item.total_amount || "0"),
            currency: item.original_currency || item.currency || "NGN"
          };
        } else {
          return {
            amount: parseFloat(item.original_amount || item.total_amount || "0"),
            currency: item.original_currency || "NGN"
          };
        }
      }
      
      // Duffel flights - original is in GBP
      return {
        amount: item.rawPrice || parseFloat(item.original_amount || "0"),
        currency: item.original_currency || item.currency || "GBP"
      };
    }
    
    // For hotels - FIXED: Extract price from various possible locations
    if (productType === "hotel") {
      let amount = 0;
      let currencyCode = "GBP";
      
      // Check for price in realData (common for Amadeus hotels)
      if (item.realData) {
        if (item.realData.finalPrice) {
          amount = item.realData.finalPrice;
          currencyCode = item.realData.currency || currencyCode;
        } else if (item.realData.price) {
          amount = item.realData.price;
          currencyCode = item.realData.currency || currencyCode;
        }
      }
      
      // Check for original_price field
      if (amount === 0 && item.original_price) {
        amount = parseFloat(item.original_price);
        currencyCode = item.original_currency || currencyCode;
      }
      
      // Check for base_price field
      if (amount === 0 && item.base_price) {
        amount = parseFloat(item.base_price);
        currencyCode = item.original_currency || currencyCode;
      }
      
      // Check for price string (e.g., "£145/night")
      if (amount === 0 && item.price) {
        const priceStr = String(item.price);
        
        // Detect currency from symbol
        if (priceStr.includes('£')) currencyCode = 'GBP';
        else if (priceStr.includes('$')) currencyCode = 'USD';
        else if (priceStr.includes('€')) currencyCode = 'EUR';
        else if (priceStr.includes('₦')) currencyCode = 'NGN';
        
        // Extract numeric value
        const match = priceStr.match(/[\d,.]+/);
        if (match) {
          amount = parseFloat(match[0].replace(/,/g, ''));
        }
      }
      
      // Check for total_amount (sometimes used)
      if (amount === 0 && item.total_amount) {
        amount = parseFloat(item.total_amount);
        currencyCode = item.total_currency || currencyCode;
      }
      
      // Check for final_price
      if (amount === 0 && item.final_price) {
        amount = parseFloat(item.final_price);
        currencyCode = item.original_currency || currencyCode;
      }
      
      console.log(`🏨 Hotel original price: ${currencyCode} ${amount}`);
      return { amount, currency: currencyCode };
    }
    
    // For car rentals
    if (productType === "car") {
      let amount = 0;
      let currencyCode = "GBP";
      
      if (item.original_price) {
        amount = parseFloat(item.original_price);
        currencyCode = item.original_currency || currencyCode;
      } else if (item.price) {
        const priceStr = String(item.price);
        if (priceStr.includes('£')) currencyCode = 'GBP';
        else if (priceStr.includes('$')) currencyCode = 'USD';
        else if (priceStr.includes('€')) currencyCode = 'EUR';
        
        const match = priceStr.match(/[\d,.]+/);
        if (match) {
          amount = parseFloat(match[0].replace(/,/g, ''));
        }
      }
      
      return { amount, currency: currencyCode };
    }
    
    return { amount: 0, currency: "GBP" };
  };

  // ✅ Update enhanced item with currency conversion for ALL product types
  useEffect(() => {
    const processItem = async () => {
      if (!selectedItem) return;
      
      setIsConverting(true);
      let item = selectedItem as ExtendedSearchResult;
      const productType = getProductType(item);
      
      try {
        // Get original price info
        const { amount: originalAmount, currency: originalCurrency } = getOriginalPriceInfo(item);
        
        let convertedAmount = originalAmount;
        let convertedCurrency = originalCurrency;
        let convertedPriceDisplay = '';
        
        console.log(`💰 Processing ${productType} - Original: ${originalCurrency} ${originalAmount}, User currency: ${currency.code}`);
        
        // Convert if original currency is different from user's currency and we have a valid amount
        if (originalCurrency !== currency.code && originalAmount > 0) {
          // Convert using real-time rates from LanguageContext
          convertedAmount = await convertPrice(originalAmount, originalCurrency);
          convertedPriceDisplay = await formatPrice(convertedAmount);
          convertedCurrency = currency.code;
          
          console.log(`💰 BookingReviewPage - Converted ${productType}: ${originalCurrency} ${originalAmount.toFixed(2)} → ${convertedCurrency} ${convertedAmount.toFixed(2)}`);
        } else if (originalAmount > 0) {
          // Just format the price in original currency
          convertedPriceDisplay = await formatPrice(originalAmount, originalCurrency);
          console.log(`💰 BookingReviewPage - Formatted ${productType}: ${originalCurrency} ${originalAmount.toFixed(2)} → ${convertedPriceDisplay}`);
        } else {
          // Fallback to original price string
          convertedPriceDisplay = item.price || 'Price on request';
          console.log(`💰 BookingReviewPage - Using original price string: ${convertedPriceDisplay}`);
        }
        
        // Update the item with converted price
        const updatedItem = {
          ...item,
          price: convertedPriceDisplay,
          displayPrice: convertedPriceDisplay,
          totalPrice: convertedPriceDisplay,
          currency: convertedCurrency,
          rawPrice: convertedAmount,
          originalPriceAmount: originalAmount,
          originalPriceCurrency: originalCurrency,
        };
        
        // Get base price (use converted amount if available)
        let basePrice = convertedAmount > 0 ? convertedAmount : originalAmount;
        
        // Get markup and service fee (these are usually in the original currency)
        const markupAmount = parseFloat(item.markup_amount || "0");
        const serviceFee = parseFloat(item.service_fee || "0");
        
        // Convert markup and service fee if needed
        let convertedMarkup = markupAmount;
        let convertedServiceFee = serviceFee;
        if (originalCurrency !== currency.code && originalAmount > 0 && (markupAmount > 0 || serviceFee > 0)) {
          if (markupAmount > 0) convertedMarkup = await convertPrice(markupAmount, originalCurrency);
          if (serviceFee > 0) convertedServiceFee = await convertPrice(serviceFee, originalCurrency);
        }
        
        const taxes = convertedMarkup + convertedServiceFee;
        
        // Get final amount
        let finalAmount = convertedAmount + taxes;
        
        console.log(`💰 REVIEW PAGE - ${productType} final breakdown:`, {
          originalAmount,
          originalCurrency,
          convertedAmount,
          convertedCurrency,
          markupAmount: convertedMarkup,
          serviceFee: convertedServiceFee,
          taxes,
          finalAmount,
          displayPrice: convertedPriceDisplay
        });
        
        // Create enhanced item with calculated values
        const enhanced = {
          ...updatedItem,
          original_amount: item.original_amount,
          original_price: item.original_price,
          base_price: item.base_price,
          markup_amount: item.markup_amount,
          service_fee: item.service_fee,
          final_amount: item.final_amount,
          final_price: item.final_price,
          currency: convertedCurrency,
          calculatedBasePrice: basePrice,
          calculatedMarkup: convertedMarkup,
          calculatedServiceFee: convertedServiceFee,
          calculatedTaxes: taxes,
          calculatedTotal: finalAmount,
        };
        
        setEnhancedItem(enhanced);
      } catch (error) {
        console.error('Failed to convert price:', error);
        // Fallback to original item
        setEnhancedItem(item);
      } finally {
        setIsConverting(false);
      }
    };
    
    processItem();
  }, [selectedItem, currency, convertPrice, formatPrice]);

  if (!selectedItem) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          No booking to review
        </h1>
        <p className="text-gray-600 mb-8">
          Please select an item from search to continue.
        </p>
        <button
          onClick={() => router.push("/search")}
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg"
        >
          Back to search
        </button>
      </div>
    );
  }

  // Show loading while converting prices
  if ((isLoadingRates || isConverting) && !enhancedItem) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading prices in {currency.code}...</p>
        </div>
      </div>
    );
  }

  // Cast selectedItem to ExtendedSearchResult to access pricing fields
  const extendedItem = (enhancedItem || selectedItem) as ExtendedSearchResult;
  const useAmadeusFlow = isAmadeusHotel(extendedItem);
  const productType = getProductType(extendedItem);

  const handleProceedToPayment = async (
    passengerInfo: PassengerInfo,
    voucherCode?: string,
    hbxMetadata?: any,
  ) => {
    const isGuest = !isLoggedIn;

    const isFlight =
      extendedItem?.type?.toLowerCase().includes("flight") ||
      extendedItem?.type?.toLowerCase().includes("duffel");

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

    if (useAmadeusFlow && isMerchantPaymentModel) {
      try {
        console.log("📝 Creating Amadeus hotel booking...");
        const markupAmount = parseFloat(extendedItem.markup_amount || "0");
        const serviceFee = parseFloat(extendedItem.service_fee || "0");
        const combinedTaxes = markupAmount + serviceFee;

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
        toast.error(
          err?.message ??
          "We couldn’t create your booking. Please check your details and try again.",
        );
      }
      return;
    }

    if (useAmadeusFlow) {
      setPendingPassengerInfo(passengerInfo);
      setAppliedVoucherCode(voucherCode);
      setShowAmadeusPayment(true);
      return;
    }

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
        toast.error(
          err?.message ??
          "We couldn’t create your Hotelbeds booking. Please try again.",
        );
      }
      return;
    }

    try {
      // Use the calculated values from enhancedItem
      const basePrice = extendedItem.calculatedBasePrice || 0;
      const combinedTaxes = extendedItem.calculatedTaxes || 0;
      const finalAmount = extendedItem.calculatedTotal || basePrice + combinedTaxes;

      console.log(`💰 ${productType} booking creation:`, { 
        basePrice, 
        combinedTaxes, 
        finalAmount,
        currency: currency.code 
      });

      const newBooking = await createBooking(
        extendedItem,
        searchParams,
        passengerInfo,
        isGuest,
        {
          taxes: combinedTaxes,
          basePrice: basePrice,
          finalAmount: finalAmount,
        },
      );

      console.log("✅ Booking created:", newBooking);
      setBooking(newBooking);
      setAppliedVoucherCode(voucherCode);
      setShowPayment(true);
    } catch (err: any) {
      console.error("❌ Booking creation failed:", err);
      toast.error(err.message ?? "We couldn’t create your booking. Please try again.");
    }
  };

  const handlePaymentSuccess = (confirmed: Booking) => {
    setShowPayment(false);
    setShowAmadeusPayment(false);
    setPendingPassengerInfo(null);
    router.push(`/booking/success?id=${confirmed.id}&ref=${confirmed.reference}`);
  };

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