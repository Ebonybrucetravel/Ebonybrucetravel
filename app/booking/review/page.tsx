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

// Helper function to check if flight is domestic
const isDomesticFlight = (origin: string, destination: string): boolean => {
  const nigerianAirports = ['LOS', 'ABV', 'PHC', 'KAN', 'ENU', 'QOW', 'BNI', 'JOS', 'KAD', 'YOL'];
  return nigerianAirports.includes(origin?.toUpperCase()) && nigerianAirports.includes(destination?.toUpperCase());
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

  // Update enhanced item - Convert ALL prices to user's currency
  useEffect(() => {
    const processItem = async () => {
      if (!selectedItem) return;
      
      setIsConverting(true);
      const item = selectedItem as ExtendedSearchResult;
      
      try {
        // Get the original values (in original currency - NGN for flights)
        const originalAmountNGN = parseFloat(item.original_amount || "0");
        const serviceFeeNGN = parseFloat(item.service_fee || "0");
        const finalAmountNGN = parseFloat(item.final_amount || "0");
        const originalCurrency = item.original_currency || "NGN";
        
        console.log(`💰 Original values (${originalCurrency}):`, {
          originalAmount: originalAmountNGN,
          serviceFee: serviceFeeNGN,
          finalAmount: finalAmountNGN
        });
        
        // Convert ALL values to user's selected currency using LanguageContext
        let convertedOriginalAmount = originalAmountNGN;
        let convertedServiceFee = serviceFeeNGN;
        let convertedFinalAmount = finalAmountNGN;
        let displayCurrency = originalCurrency;
        
        if (originalCurrency !== currency.code && originalAmountNGN > 0) {
          // Convert using LanguageContext's convertPrice (uses header exchange rates)
          convertedOriginalAmount = await convertPrice(originalAmountNGN, originalCurrency);
          convertedServiceFee = await convertPrice(serviceFeeNGN, originalCurrency);
          convertedFinalAmount = await convertPrice(finalAmountNGN, originalCurrency);
          displayCurrency = currency.code;
          
          console.log(`💰 Converted to ${displayCurrency}:`, {
            convertedOriginalAmount,
            convertedServiceFee,
            convertedFinalAmount,
            rate: convertedFinalAmount / finalAmountNGN
          });
        }
        
        // Format the display prices
        const formattedOriginalPrice = await formatPrice(convertedOriginalAmount, displayCurrency);
        const formattedFinalPrice = await formatPrice(convertedFinalAmount, displayCurrency);
        
        console.log(`💰 BookingReviewPage - Final converted values:`, {
          originalAmount: `${displayCurrency} ${convertedOriginalAmount}`,
          serviceFee: `${displayCurrency} ${convertedServiceFee}`,
          finalAmount: `${displayCurrency} ${convertedFinalAmount}`,
          displayCurrency,
          formattedOriginalPrice,
          formattedFinalPrice
        });
        
        // Create updated item with ALL converted values
        const updatedItem: ExtendedSearchResult = {
          ...item,
          // Display fields (what user sees on review page)
          price: formattedFinalPrice,
          displayPrice: formattedFinalPrice,
          totalPrice: formattedFinalPrice,
          currency: displayCurrency,
          rawPrice: convertedFinalAmount,
          
          // ✅ CRITICAL: Convert original_amount to user's currency for Base Fare display
          original_amount: convertedOriginalAmount.toString(),
          original_currency: displayCurrency,
          
          // Convert service fee fields
          service_fee: convertedServiceFee.toString(),
          final_amount: convertedFinalAmount.toString(),
          
          // Keep original values for reference
          originalPriceAmount: originalAmountNGN,
          originalPriceCurrency: originalCurrency,
          
          // Calculated values
          calculatedBasePrice: convertedOriginalAmount,
          calculatedMarkup: parseFloat(item.markup_amount || "0"),
          calculatedServiceFee: convertedServiceFee,
          calculatedTaxes: parseFloat(item.taxes || "0"),
          calculatedTotal: convertedFinalAmount,
        };
        
        setEnhancedItem(updatedItem);
      } catch (error) {
        console.error('Failed to process item:', error);
        setEnhancedItem(item);
      } finally {
        setIsConverting(false);
      }
    };
    
    processItem();
  }, [selectedItem, currency, convertPrice, formatPrice]);

  const handleProceedToPayment = async (
    passengerInfo: PassengerInfo,
    voucherCode?: string,
    hbxMetadata?: any,
  ) => {
    const isGuest = !isLoggedIn;

    const isFlight = extendedItem?.type?.toLowerCase().includes("flight") ||
      extendedItem?.type?.toLowerCase().includes("duffel") ||
      extendedItem?.type?.toLowerCase().includes("wakanow");

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
        toast.error(err?.message ?? "We couldn't create your Hotelbeds booking. Please try again.");
      }
      return;
    }

    try {
      // ✅ FIX: Detect domestic flights and override provider
      const origin = extendedItem.origin || extendedItem.departureAirport || extendedItem.bookingData?.origin;
      const destination = extendedItem.destination || extendedItem.arrivalAirport || extendedItem.bookingData?.destination;
      
      // Check if this is a domestic Nigerian flight
      const isDomestic = origin && destination && isDomesticFlight(origin, destination);
      
      // Use the converted values
      const basePrice = extendedItem.calculatedBasePrice || parseFloat(extendedItem.original_amount || "0");
      const serviceFee = extendedItem.calculatedServiceFee || parseFloat(extendedItem.service_fee || "0");
      const finalAmount = extendedItem.calculatedTotal || parseFloat(extendedItem.final_amount || "0");

      console.log(`💰 ${productType} booking creation:`, { 
        basePrice, 
        serviceFee, 
        finalAmount,
        currency: currency.code,
        origin,
        destination,
        isDomestic,
        originalProvider: extendedItem.provider,
        willUseProvider: isDomestic ? 'WAKANOW' : (extendedItem.provider || 'DUFFEL')
      });

      // ✅ Create a modified item with corrected provider and product type
      const correctedItem = {
        ...extendedItem,
        provider: isDomestic ? 'WAKANOW' : (extendedItem.provider || 'DUFFEL'),
        isDomestic: isDomestic,
        originalProvider: extendedItem.provider,
        // ✅ Add product type override
        productTypeOverride: isDomestic ? 'FLIGHT_DOMESTIC' : 'FLIGHT_INTERNATIONAL',
      };

      // ✅ Pass only the expected pricing properties (no isDomestic here)
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

      console.log("✅ Booking created:", newBooking);
      setBooking(newBooking);
      setAppliedVoucherCode(voucherCode);
      setShowPayment(true);
    } catch (err: any) {
      console.error("❌ Booking creation failed:", err);
      toast.error(err.message ?? "We couldn't create your booking. Please try again.");
    }
  };

  const handlePaymentSuccess = (confirmed: Booking) => {
    setShowPayment(false);
    setShowAmadeusPayment(false);
    setPendingPassengerInfo(null);
    router.push(`/booking/success?id=${confirmed.id}&ref=${confirmed.reference}`);
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

  const extendedItem = (enhancedItem || selectedItem) as ExtendedSearchResult;
  const useAmadeusFlow = isAmadeusHotel(extendedItem);
  const productType = getProductType(extendedItem);

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