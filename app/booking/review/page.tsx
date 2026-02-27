"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { useBooking } from "@/hooks/useBooking";
import { config } from "@/lib/config";
import ReviewTrip from "@/components/ReviewTrip";
import PaymentModal from "@/components/payment/PaymentModal";
import AmadeusHotelPaymentModal from "@/components/payment/AmadeusHotelPaymentModal";
import type { Booking, PassengerInfo } from "@/lib/types";

function isAmadeusHotel(item: {
  type?: string;
  realData?: {
    offerId?: string;
    finalPrice?: number;
    price?: number;
  };
}): boolean {
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
  const { createBooking, createAmadeusHotelBooking, isCreating } = useBooking();
  const isMerchantPaymentModel = config.paymentModel === "merchant";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showAmadeusPayment, setShowAmadeusPayment] = useState(false);
  const [pendingPassengerInfo, setPendingPassengerInfo] =
    useState<PassengerInfo | null>(null);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<
    string | undefined
  >(undefined);

  const redirectToLogin = () => {
    persistSelectionForReturn();
    sessionStorage.setItem("authReturnTo", "/booking/review");
    router.push("/login");
  };

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

  const useAmadeusFlow = isAmadeusHotel(selectedItem);

  const handleProceedToPayment = async (
    passengerInfo: PassengerInfo,
    voucherCode?: string,
  ) => {
    const isGuest = !isLoggedIn;

    // Block voucher for guests (prevents backend confusion)
    if (isGuest && voucherCode) {
      toast.error(
        "Vouchers are not available for guest bookings yet. Please remove the code and try again.",
      );
      return;
    }

    const isFlight =
      selectedItem?.type?.toLowerCase().includes("flight") ||
      selectedItem?.type?.toLowerCase().includes("duffel");

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

    try {
      let newBooking: Booking;

      if (useAmadeusFlow) {
        console.log("Creating pending Amadeus hotel booking...");
        newBooking = await createAmadeusHotelBooking(
          selectedItem,
          passengerInfo,
          undefined, // ← card param (keep as undefined since you're not using card here)
          isGuest,
        );
      } else {
        console.log("Creating pending normal booking...");
        newBooking = await createBooking(
          selectedItem,
          searchParams,
          passengerInfo,
          isGuest,
        );
      }

      console.log("✅ Pending booking created successfully:", newBooking);

      setBooking(newBooking);
      setAppliedVoucherCode(voucherCode); // still remember for modal

      if (useAmadeusFlow && isMerchantPaymentModel) {
        setShowPayment(true);
      } else if (useAmadeusFlow) {
        setShowAmadeusPayment(true);
      } else {
        setShowPayment(true);
      }
    } catch (err: any) {
      console.error("❌ Failed to create pending booking:", err);
      toast.error(
        err?.message ||
          "Could not prepare your booking. Please check your details and try again.",
      );
    }
  };

  const handlePaymentSuccess = (confirmed: Booking) => {
    setShowPayment(false);
    setShowAmadeusPayment(false);
    setPendingPassengerInfo(null);

    const isGuest = !confirmed.userId; // or use your isLoggedIn logic
    const query = new URLSearchParams({
      id: confirmed.id,
      ref: confirmed.reference,
      email: confirmed.passengerInfo.email, // ← critical for guest public fetch
    });

    router.push(`/booking/success?${query.toString()}`);
  };

  return (
    <>
      <ReviewTrip
        item={selectedItem}
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
