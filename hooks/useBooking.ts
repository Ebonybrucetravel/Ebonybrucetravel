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

// Helper function to extract airport code from string like "LHR (London)" or just "LHR"
const extractAirportCode = (str: string | undefined): string => {
  if (!str) return "";
  const match = str.match(/([A-Z]{3})/);
  return match?.[1] || str.substring(0, 3).toUpperCase();
};

// Helper function to check if flight is domestic Nigerian
const isDomesticNigerianFlight = (origin: string, destination: string): boolean => {
  if (!origin || !destination) return false;
  const nigerianAirports = ['LOS', 'ABV', 'PHC', 'KAN', 'ENU', 'QOW', 'BNI', 'JOS', 'KAD', 'YOL'];
  return nigerianAirports.includes(origin.toUpperCase()) && nigerianAirports.includes(destination.toUpperCase());
};

// ✅ Helper function to check if this is a Wakanow offer
const isWakanowOffer = (item: ExtendedSearchResult): boolean => {
  // Check by provider
  if (item.provider === 'WAKANOW') return true;
  if (item.isWakanow === true) return true;
  
  // Check by ID patterns (Wakanow offers have IDs like "wakanow-46")
  const id = item.id || item.offerId || item.realData?.offerId || '';
  if (id.toString().toLowerCase().includes('wakanow')) return true;
  
  // Check by selectData (Wakanow flights have selectData from search)
  if (item.selectData) return true;
  
  // Check by title/airline (Nigerian domestic airlines)
  const title = (item.title || '').toLowerCase();
  const nigerianAirlines = ['air peace', 'valuejet', 'arik air', 'dana air', 'green africa', 'ibom air', 'united nigeria', 'overland'];
  if (nigerianAirlines.some(airline => title.includes(airline))) return true;
  
  return false;
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
        // ✅ Check if this is a Wakanow offer FIRST (before airport detection)
        const wakanowDetected = isWakanowOffer(item);
        
        // ✅ Extract origin and destination from multiple sources
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
        
        // ✅ Check if this is a domestic Nigerian flight by airports
        const isDomesticByAirports = originCode && destinationCode && isDomesticNigerianFlight(originCode, destinationCode);
        
        // ✅ FORCE domestic for Wakanow offers OR domestic airport routes
        const isDomestic = item.isDomestic || 
                          item.productTypeOverride === 'FLIGHT_DOMESTIC' ||
                          wakanowDetected ||
                          isDomesticByAirports;
        
        // ✅ Force correct product type and provider
        let productType: string;
        let provider: string;
        
        if (isDomestic) {
          productType = "FLIGHT_DOMESTIC";
          provider = "WAKANOW";
          console.log("🇳🇬 WAKANOW DOMESTIC flight detected:", { 
            originCode, 
            destinationCode, 
            wakanowDetected,
            isDomesticByAirports,
            itemId: item.id,
            itemProvider: item.provider,
            itemTitle: item.title?.substring(0, 50)
          });
        } else {
          // ✅ Keep existing logic for international flights (Duffel)
          const meta = getProductMeta(item.type || "");
          productType = meta.productType;
          provider = meta.provider || item.provider || "DUFFEL";
          console.log("🌍 International flight - using DUFFEL provider", { productType, provider });
        }
        
        const offerCurrency = (
          item.realData?.currency ??
          item.currency ??
          "NGN"
        ).toUpperCase();

        // Get base price (original amount before markup)
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

        // Calculate taxes by adding markup and service fee together
        const markupAmount = parseFloat(item.markup_amount || "0");
        const serviceFee = parseFloat((item as any).service_charge || "0");
        const taxes = markupAmount + serviceFee;

        // Final amount = basePrice + taxes
        const finalAmount = basePrice + taxes;

        console.log("💰 Price breakdown:", {
          basePrice,
          markupAmount,
          serviceFee,
          taxes,
          finalAmount,
          isDomestic,
          wakanowDetected,
          provider,
          productType,
          originCode,
          destinationCode
        });

        const body: Record<string, any> = {
          productType,
          provider: provider,
          currency: offerCurrency,
          basePrice: basePrice,
          passengerInfo: {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
          bookingData: {},
        };

        // Add flight-specific fields if this is a flight booking
        if (
          productType === "FLIGHT_INTERNATIONAL" ||
          productType === "FLIGHT_DOMESTIC"
        ) {
          // Include title, gender, and dateOfBirth for flight bookings
          body.passengerInfo = {
            ...body.passengerInfo,
            title: passenger.title,
            gender: passenger.gender,
            dateOfBirth: passenger.dateOfBirth,
          };

          // ✅ Use originCode and destinationCode with fallbacks
          const finalOrigin = originCode || "LOS";
          const finalDestination = destinationCode || "ABV";
          
          // ✅ For Wakanow, use selectData as the offerId if available
          const offerId = item.selectData || item.realData?.offerId || item.offerId || item.id;

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
            // Include pricing breakdown
            basePrice: basePrice,
            markup_amount: markupAmount,
            service_fee: serviceFee,
            taxes: taxes,
            totalAmount: finalAmount,
            original_amount: item.original_amount,
            final_amount: item.final_amount,
            markup_percentage: item.markup_percentage,
            // ✅ Add flags for backend
            is_domestic: isDomestic,
            is_wakanow: wakanowDetected,
            ...(item.selectData && { select_data: item.selectData }),
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

        const endpoint = isGuest
          ? "/api/v1/bookings/guest"
          : "/api/v1/bookings";
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
    ) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      let endpoint: string;
      let body: Record<string, any>;

      if (isGuest) {
        endpoint = "/api/v1/payments/stripe/create-intent/guest";
        body = { bookingReference: bookingReference!, email: guestEmail! };
      } else {
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

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));

        try {
          let data: any;
          if (isGuest) {
            data = await publicRequest<any>(
              `/api/v1/bookings/public/by-id/${encodeURIComponent(bookingId)}?reference=${encodeURIComponent(guestParams!.reference)}&email=${encodeURIComponent(guestParams!.email)}`,
              { method: "GET" },
            );
          } else {
            const headers: Record<string, string> = {
              Accept: "application/json",
            };
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await fetch(`${BASE}/api/v1/bookings/${bookingId}`, {
              headers,
            });
            if (!res.ok) continue;
            data = await res.json();
          }

          const b: Booking =
            data?.data?.booking ?? data?.data ?? data?.booking ?? data;
          if (b?.status === "CONFIRMED" || b?.paymentStatus === "COMPLETED") {
            setBooking(b);
            return b;
          }
        } catch { }
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