'use client';

import { useState, useCallback } from 'react';
import { config } from '@/lib/config';
import type { SearchResult, SearchParams, Booking, PassengerInfo } from '@/lib/types';
import { getProductMeta } from '@/lib/utils';
import { getStoredAuthToken, getVendorCodeFromCardNumber } from '@/lib/api';

/**
 * Composable hook for creating a booking and managing the payment flow.
 *
 * Follows the correct server flow:
 * 1. Create booking → get bookingId
 * 2. Create Stripe PaymentIntent with bookingId → get clientSecret
 * 3. Confirm card payment with Stripe.js
 * 4. Poll booking status until CONFIRMED
 */
export function useBooking() {
  const [isCreating, setIsCreating] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  const BASE = config.apiBaseUrl;

  const createBooking = useCallback(
    async (
      item: SearchResult,
      searchParams: SearchParams | null,
      passenger: PassengerInfo,
      isGuest: boolean,
    ): Promise<Booking> => {
      setIsCreating(true);
      setError(null);

      try {
        const { productType, provider } = getProductMeta(item.type);

        const offerCurrency = (item.realData?.currency ?? 'GBP').toUpperCase();
        const totalAmount = typeof item.realData?.price === 'number'
          ? item.realData.price
          : (() => {
              const priceMatch = item.price?.match(/[\d,.]+/);
              return priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 100;
            })();

        // For hotels, backend adds 15% markup + service fee to basePrice; ReviewTrip shows same breakdown so Total Due matches charged amount
        const body: Record<string, any> = {
          productType,
          provider,
          currency: offerCurrency,
          basePrice: totalAmount,
          passengerInfo: {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
        };

        if (productType === 'FLIGHT_INTERNATIONAL') {
          body.bookingData = {
            offerId: item.realData?.offerId ?? item.id,
            origin: searchParams?.segments?.[0]?.from ? extractCode(searchParams.segments[0].from) : 'LOS',
            destination: searchParams?.segments?.[0]?.to ? extractCode(searchParams.segments[0].to) : 'ABV',
            departureDate: searchParams?.segments?.[0]?.date ?? today(),
            ...(item.realData?.airline && { airline: item.realData.airline }),
            ...(item.realData?.flightNumber && { flightNumber: item.realData.flightNumber }),
            cabinClass: searchParams?.cabinClass ?? 'economy',
            passengers: searchParams?.passengers ?? 1,
          };
        } else if (productType === 'HOTEL') {
          body.bookingData = {
            hotelId: item.id,
            offerId: item.realData?.offerId ?? item.id,
            hotelName: item.title,
            checkInDate: searchParams?.checkInDate ?? today(),
            checkOutDate: searchParams?.checkOutDate ?? tomorrow(),
            guests: searchParams?.adults ?? 1,
            rooms: searchParams?.rooms ?? 1,
            location: item.subtitle ?? searchParams?.location ?? 'Lagos',
          };
        } else if (productType === 'CAR_RENTAL') {
          body.bookingData = {
            offerId: item.id,
            pickupLocationCode: searchParams?.carPickUp ?? 'LOS',
            pickupDateTime: searchParams?.pickupDateTime ?? new Date().toISOString(),
            dropoffLocationCode: searchParams?.carDropOff ?? searchParams?.carPickUp ?? 'LOS',
            dropoffDateTime: searchParams?.dropoffDateTime ?? new Date(Date.now() + 86400000).toISOString(),
            vehicleType: item.realData?.vehicleType ?? item.title,
          };
        }

        const endpoint = isGuest ? '/api/v1/bookings/guest' : '/api/v1/bookings';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (!isGuest) {
          const token = getStoredAuthToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${BASE}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Booking creation failed');

        const created: Booking = data.data ?? data;
        setBooking(created);
        return created;
      } catch (err: any) {
        setError(err.message);
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      let endpoint: string;
      let body: Record<string, any>;

      if (isGuest) {
        endpoint = '/api/v1/payments/stripe/create-intent/guest';
        body = { bookingReference: bookingReference!, email: guestEmail! };
      } else {
        endpoint = '/api/v1/payments/stripe/create-intent';
        body = {
          bookingId,
          ...(voucherCode && { voucherCode }),
        };
        const token = getStoredAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create payment intent');
      if (!data.clientSecret) throw new Error('No client secret received');
      return data as { clientSecret: string; paymentIntentId: string; voucherApplied?: any };
    },
    [BASE],
  );

  /** Amadeus hotel: create booking. When card provided (guest_card model), send payment; when omitted (merchant model), backend uses agency card after Stripe payment. */
  const createAmadeusHotelBooking = useCallback(
    async (
      item: SearchResult,
      passenger: PassengerInfo,
      card: { cardNumber: string; expiryMonth: string; expiryYear: string; cvc: string; holderName?: string } | undefined,
      isGuest: boolean,
    ): Promise<Booking> => {
      setIsCreating(true);
      setError(null);
      try {
        const offerId = item.realData?.offerId ?? item.id;
        const offerPrice = typeof item.realData?.finalPrice === 'number'
          ? item.realData.finalPrice
          : (typeof item.realData?.price === 'number' ? item.realData.price : 0);
        const currency = (item.realData?.currency ?? 'GBP').toUpperCase();

        const checkInStr = item.realData?.checkInDate ?? '';
        const cancellationPolicySnapshot =
          typeof item.realData?.cancellationPolicy === 'string'
            ? item.realData.cancellationPolicy
            : 'Standard cancellation policy applies';
        let cancellationDeadline = item.realData?.cancellationDeadline;
        if (!cancellationDeadline && checkInStr) {
          try {
            const checkIn = new Date(checkInStr);
            const deadline = new Date(checkIn);
            deadline.setUTCDate(deadline.getUTCDate() - 1);
            deadline.setUTCHours(23, 59, 0, 0);
            cancellationDeadline = deadline.toISOString();
          } catch {
            cancellationDeadline = new Date(Date.now() + 86400000).toISOString();
          }
        } else if (!cancellationDeadline) {
          cancellationDeadline = new Date(Date.now() + 86400000).toISOString();
        } else if (typeof cancellationDeadline === 'string' && !/Z$|[\+\-]\d{2}:?\d{2}$/.test(cancellationDeadline)) {
          try {
            cancellationDeadline = new Date(cancellationDeadline + 'Z').toISOString();
          } catch {
            cancellationDeadline = new Date(cancellationDeadline).toISOString();
          }
        }

        const body: Record<string, unknown> = {
          hotelOfferId: offerId,
          offerPrice,
          currency,
          guests: [
            {
              name: { title: 'MR', firstName: passenger.firstName, lastName: passenger.lastName },
              contact: { phone: passenger.phone, email: passenger.email },
            },
          ],
          roomAssociations: [{ hotelOfferId: offerId, guestReferences: [{ guestReference: '1' }] }],
          cancellationDeadline: typeof cancellationDeadline === 'string' ? cancellationDeadline : (cancellationDeadline as any)?.toISOString?.() ?? new Date().toISOString(),
          cancellationPolicySnapshot,
          policyAccepted: true,
        };

        if (card) {
          const cardNumber = card.cardNumber.replace(/\s+/g, '').replace(/-/g, '');
          const expiryDate = `${card.expiryYear}-${card.expiryMonth.padStart(2, '0')}`;
          body.payment = {
            method: 'CREDIT_CARD',
            paymentCard: {
              paymentCardInfo: {
                vendorCode: getVendorCodeFromCardNumber(cardNumber),
                cardNumber,
                expiryDate,
                ...(card.holderName && { holderName: card.holderName }),
                ...(card.cvc && { securityCode: card.cvc }),
              },
            },
          };
        }

        const token = getStoredAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (!isGuest && token) headers['Authorization'] = `Bearer ${token}`;

        const endpoint = isGuest
          ? '/api/v1/bookings/hotels/bookings/amadeus/guest'
          : '/api/v1/bookings/hotels/bookings/amadeus';
        const res = await fetch(`${BASE}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          const msg = data.message ?? data.data?.message ?? 'Could not secure your reservation';
          const err = new Error(msg) as Error & { status?: number };
          err.status = res.status;
          throw err;
        }

        const raw = data.data?.booking ?? data.booking ?? data.data;
        if (!raw?.id) throw new Error('Invalid response from server');

        const booking: Booking = {
          id: raw.id,
          reference: raw.reference ?? '',
          status: raw.status ?? 'PENDING',
          paymentStatus: raw.paymentStatus ?? 'PENDING',
          productType: raw.productType ?? 'HOTEL',
          provider: raw.provider ?? 'AMADEUS',
          basePrice: raw.basePrice ?? 0,
          totalAmount: raw.totalAmount ?? offerPrice,
          currency: raw.currency ?? currency,
          bookingData: raw.bookingData ?? {},
          passengerInfo: {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            email: passenger.email,
            phone: passenger.phone,
          },
          createdAt: raw.createdAt ?? new Date().toISOString(),
        };
        if (typeof raw.finalAmount === 'number') booking.finalAmount = raw.finalAmount;
        if (typeof raw.markupAmount === 'number') booking.markupAmount = raw.markupAmount;
        if (typeof raw.serviceFee === 'number') booking.serviceFee = raw.serviceFee;
        setBooking(booking);
        return booking;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [BASE],
  );

  /** One-step payment: server charges margin (and creates Amadeus order) with the stored card. No Stripe Elements. */
  const chargeMarginAmadeusHotel = useCallback(
    async (booking: Booking, isGuest: boolean): Promise<Booking> => {
      setError(null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!isGuest) {
        const token = getStoredAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const url = isGuest
        ? `${BASE}/api/v1/payments/amadeus-hotel/charge-margin/guest`
        : `${BASE}/api/v1/payments/amadeus-hotel/charge-margin`;
      const body = isGuest
        ? { bookingReference: booking.reference, email: booking.passengerInfo.email }
        : { bookingId: booking.id };

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.message ?? data.error ?? 'Payment could not be completed';
        const err = new Error(msg) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }

      const updated = data.booking ?? data.data?.booking ?? data.data;
      if (updated) {
        setBooking(updated);
        return updated as Booking;
      }
      return { ...booking, status: 'CONFIRMED', paymentStatus: 'COMPLETED' };
    },
    [BASE],
  );

  const pollBookingStatus = useCallback(
    async (bookingId: string, maxAttempts = 10, intervalMs = 3000): Promise<Booking> => {
      const token = getStoredAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        try {
          const res = await fetch(`${BASE}/api/v1/bookings/${bookingId}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const b: Booking = data.data ?? data;
            if (b.status === 'CONFIRMED' || b.paymentStatus === 'COMPLETED') {
              setBooking(b);
              return b;
            }
          }
        } catch { /* retry */ }
      }
      throw new Error('Booking confirmation timed out');
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

function extractCode(s: string) {
  const m = s.match(/\(([A-Z]{3})\)/);
  return m?.[1] ?? s.substring(0, 3).toUpperCase();
}
const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split('T')[0];

