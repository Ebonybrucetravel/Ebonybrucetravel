'use client';
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { formatPrice } from '@/lib/utils';
import type { SearchResult, Booking, PassengerInfo } from '@/lib/types';
import { useBooking } from '@/hooks/useBooking';
import { config } from '@/lib/config';

const stripePromise = loadStripe(config.stripePublishableKey);

export interface AmadeusHotelPaymentModalProps {
  item: SearchResult;
  passengerInfo: PassengerInfo;
  isGuest: boolean;
  voucherCode?: string;
  onSuccess: (confirmedBooking: Booking) => void;
  onCancel: () => void;
  onSignInRequired?: () => void;
}

function AmadeusHotelPaymentForm({
  item,
  passengerInfo,
  isGuest,
  onSuccess,
  onCancel,
  onSignInRequired,
}: AmadeusHotelPaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { createAmadeusHotelBooking, chargeMarginAmadeusHotel } = useBooking();

  const [holderName, setHolderName] = useState(
    () => `${passengerInfo.firstName} ${passengerInfo.lastName}`.trim()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'securing' | 'charging'>('idle');

  const currency = (item.realData?.currency ?? 'GBP').toUpperCase();
  const totalStay =
    typeof item.realData?.finalPrice === 'number'
      ? item.realData.finalPrice
      : typeof item.realData?.price === 'number'
      ? item.realData.price
      : 0;
  const displayTotal = formatPrice(totalStay, currency);

  const statusMessage =
    status === 'securing'
      ? 'Securing your reservation…'
      : status === 'charging'
      ? 'Processing your payment…'
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe is not initialized. Please refresh the page.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('securing');

    try {
      // ✅ STEP 1: Create PaymentMethod on client side (PCI compliant)
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: holderName || `${passengerInfo.firstName} ${passengerInfo.lastName}`,
            email: passengerInfo.email,
            phone: passengerInfo.phone,
          },
        });

      if (stripeError) {
        throw new Error(stripeError.message || 'Failed to create payment method');
      }

      // ✅ STEP 2: Create booking with PaymentMethod ID (not raw card)
      const created = await createAmadeusHotelBooking(
        item,
        passengerInfo,
        {
          paymentMethodId: paymentMethod.id, // ✅ Only send the ID!
          holderName: holderName || undefined,
        },
        isGuest
      );

      setStatus('charging');

      // ✅ STEP 3: Charge margin using PaymentMethod ID
      const confirmed = await chargeMarginAmadeusHotel(created, isGuest);
      onSuccess(confirmed);
    } catch (err: any) {
      if (err?.status === 401 && onSignInRequired) {
        onSignInRequired();
        onCancel();
        return;
      }
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Complete your booking</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {isGuest && (
            <p className="w-full text-sm text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              You're booking as a guest. Save your booking reference and email to
              view or manage this booking later.
            </p>
          )}
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Your stay</h3>
          <div className="flex justify-between">
            <span className="text-gray-600">{item.title}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Total for your stay</span>
            <span className="font-medium text-gray-700">{displayTotal}</span>
          </div>
          <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-blue-200">
            Your card will be used to secure this reservation and to pay our
            service and booking fees. You enter it once; we handle the rest.
          </p>
        </div>

        {statusMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Card details
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Used to secure your stay and pay our service and booking fees.
              </p>
              {/* ✅ Stripe Elements CardElement - PCI compliant! */}
              <div className="p-4 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-[#33a8da]/30 focus-within:border-[#33a8da] transition">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#1f2937',
                        '::placeholder': {
                          color: '#9ca3af',
                        },
                      },
                      invalid: {
                        color: '#dc2626',
                      },
                    },
                    hidePostalCode: true,
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Your card details are processed securely by Stripe
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Name on card
              </label>
              <input
                type="text"
                autoComplete="cc-name"
                placeholder="As shown on card"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#33a8da]/30 focus:border-[#33a8da] outline-none transition"
              />
            </div>
          </div>

          {/* ❌ REMOVED: Test card display - no longer shown in production */}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-start gap-2">
            <svg
              className="w-5 h-5 text-green-600 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-medium">Secure</p>
              <p className="text-xs text-green-600 mt-1">
                Your card details are processed securely by Stripe. We never
                store your card number.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!stripe || loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {statusMessage || 'Processing…'}
                </>
              ) : (
                'Complete booking'
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AmadeusHotelPaymentModal(
  props: AmadeusHotelPaymentModalProps
) {
  return (
    <Elements stripe={stripePromise}>
      <AmadeusHotelPaymentForm {...props} />
    </Elements>
  );
}