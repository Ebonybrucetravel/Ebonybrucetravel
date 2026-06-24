
"use client";
import { useState, useCallback } from "react";
import { getStoredAuthToken } from "@/lib/api";
import { config } from "@/lib/config";

interface CancelBookingResult {
  success: boolean;
  message: string;
  bookingId: string;
  reference: string;
  provider?: string;
  pnrNumber?: string;
  refundEligible?: boolean;
  refundAmount?: number;
  currency?: string;
  cancelledAt?: string;
}

export function useCancelBooking() {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelResult, setCancelResult] = useState<CancelBookingResult | null>(null);
  const BASE = config.apiBaseUrl;

  const cancelBooking = useCallback(
    async (bookingId: string): Promise<CancelBookingResult> => {
      setIsCancelling(true);
      setError(null);
      setCancelResult(null);

      try {
        const token = getStoredAuthToken();
        if (!token) {
          throw new Error("You must be logged in to cancel a booking");
        }

        const response = await fetch(`${BASE}/api/v1/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to cancel booking");
        }

        const result = data.data || data;
        setCancelResult(result);
        return result;
      } catch (err: any) {
        setError(err.message || "Failed to cancel booking");
        throw err;
      } finally {
        setIsCancelling(false);
      }
    },
    [BASE]
  );

  const reset = useCallback(() => {
    setError(null);
    setCancelResult(null);
  }, []);

  return {
    cancelBooking,
    isCancelling,
    error,
    cancelResult,
    reset,
  };
}