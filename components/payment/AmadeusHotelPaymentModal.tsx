'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { config } from '@/lib/config';
import { formatPrice } from '@/lib/utils';
import type { SearchResult, Booking, PassengerInfo } from '@/lib/types';
import { useBooking } from '@/hooks/useBooking';

const stripePromise = loadStripe(config.stripePublishableKey);

const cardElementOptions = {
  style: { base: { fontSize: '16px', color: '#1f2937', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#dc2626' } },
  hidePostalCode: true,
};

export interface AmadeusHotelPaymentModalProps {
  item: SearchResult;
  passengerInfo: PassengerInfo;
  voucherCode?: string;
  onSuccess: (confirmedBooking: Booking) => void;
  onCancel: () => void;
  /** Called when backend returns 401 (e.g. guest trying to use Amadeus flow); caller should persist selection and redirect to login */
  onSignInRequired?: () => void;
}

function AmadeusHotelPaymentForm({
  item,
  passengerInfo,
  voucherCode,
  onSuccess,
  onCancel,
  onSignInRequired,
}: AmadeusHotelPaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { createAmadeusHotelBooking, createPaymentIntent, pollBookingStatus } = useBooking();

  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState(
    () => `${passengerInfo.firstName} ${passengerInfo.lastName}`.trim(),
  );
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'securing' | 'paying' | 'confirming'>('idle');

  const currency = (item.realData?.currency ?? 'GBP').toUpperCase();
  const totalStay = typeof item.realData?.finalPrice === 'number'
    ? item.realData.finalPrice
    : (typeof item.realData?.price === 'number' ? item.realData.price : 0);
  const displayTotal = formatPrice(totalStay, currency);

  const phase2 = !!booking;

  const handleSecureReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
    if (rawNumber.length < 13) {
      setError('Please enter a valid card number.');
      return;
    }
    if (!expiryMonth || !expiryYear) {
      setError('Please enter card expiry date.');
      return;
    }
    if (cvc.length < 3) {
      setError('Please enter your card security code (CVC).');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('securing');
    try {
      const created = await createAmadeusHotelBooking(item, passengerInfo, {
        cardNumber: rawNumber,
        expiryMonth: expiryMonth.padStart(2, '0'),
        expiryYear: expiryYear.length === 2 ? `20${expiryYear}` : expiryYear,
        cvc,
        holderName: holderName || undefined,
      });
      setBooking(created);
    } catch (err: any) {
      if (err?.status === 401 && onSignInRequired) {
        onSignInRequired();
        onCancel();
        return;
      }
      setError(err?.message ?? 'Could not secure your reservation. Please try again.');
    } finally {
      setLoading(false);
      setStatus('idle');
    }
  };

  const handlePayFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !booking) return;

    const cardEl = elements.getElement(CardElement);
    if (!cardEl) {
      setError('Please enter your card details for the service fee.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus('paying');
    try {
      const { clientSecret } = await createPaymentIntent(
        booking.id,
        false,
        undefined,
        undefined,
        voucherCode,
      );

      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardEl,
          billing_details: {
            name: `${booking.passengerInfo.firstName} ${booking.passengerInfo.lastName}`,
            email: booking.passengerInfo.email,
            phone: booking.passengerInfo.phone,
          },
        },
      });

      if (stripeErr) throw new Error(stripeErr.message ?? 'Payment failed');

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        setStatus('confirming');
        try {
          const confirmed = await pollBookingStatus(booking.id, 10, 3000);
          onSuccess(confirmed);
        } catch {
          onSuccess({ ...booking, paymentStatus: 'COMPLETED', status: 'CONFIRMED' });
        }
      } else {
        throw new Error(`Unexpected payment status: ${paymentIntent?.status}`);
      }
    } catch (err: any) {
      setError(err.message ?? 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
      setStatus('idle');
    }
  };

  const statusMessage =
    status === 'securing'
      ? 'Securing your reservation…'
      : status === 'paying'
        ? 'Processing your payment…'
        : status === 'confirming'
          ? 'Confirming your booking…'
          : null;

  const marginAmount =
    booking && typeof booking.markupAmount === 'number' && typeof booking.serviceFee === 'number'
      ? booking.markupAmount + booking.serviceFee
      : booking?.finalAmount ?? booking?.totalAmount ?? 0;
  const displayFee = formatPrice(marginAmount, booking?.currency ?? currency);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {phase2 ? 'Pay service & booking fees' : 'Complete your booking'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {phase2 ? 'Reservation secured' : 'Your stay'}
          </h3>
          <div className="flex justify-between">
            <span className="text-gray-600">{item.title}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Total for your stay</span>
            <span className="font-medium text-gray-700">{displayTotal}</span>
          </div>
          {phase2 ? (
            <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-blue-200">
              Your reservation is secured. Pay the service and booking fees below to complete.
            </p>
          ) : (
            <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-blue-200">
              Your card will be used to secure this reservation. You will then pay our service and
              booking fees in the next step. The hotel will charge the rest when they confirm.
            </p>
          )}
        </div>

        {statusMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {statusMessage}
          </div>
        )}

        {!phase2 ? (
          <form onSubmit={handleSecureReservation}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Card to secure your reservation</label>
                <p className="text-xs text-gray-500 mb-2">Used only to hold your stay; the hotel charges this when they confirm.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Month</label>
                  <input
                    type="text"
                    placeholder="MM"
                    maxLength={2}
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                  <input
                    type="text"
                    placeholder="YY"
                    maxLength={4}
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CVC</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name on card</label>
                <input
                  type="text"
                  autoComplete="cc-name"
                  placeholder="John Smith"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p className="font-medium text-gray-700">Test card</p>
              <p className="mt-1">Card: 4242 4242 4242 4242 · Expiry: any future date · CVC: any 3 digits</p>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Secure</p>
                <p className="text-xs text-green-600 mt-1">Your card details are encrypted and only used to secure this reservation.</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Securing…</>
                ) : (
                  'Secure my reservation'
                )}
              </button>
              <button type="button" onClick={onCancel} disabled={loading} className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-300 disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePayFees}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Card for service & booking fees</label>
              <p className="text-xs text-gray-500 mb-2">You will be charged {displayFee} now.</p>
              <div className="p-4 border border-gray-300 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <CardElement options={cardElementOptions} />
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                <p className="font-medium text-gray-700">Test card: 4242 4242 4242 4242 · Any future expiry · Any 3 digits</p>
              </div>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={!stripe || loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> {statusMessage || 'Processing…'}</>
                ) : (
                  <>Pay {displayFee}</>
                )}
              </button>
              <button type="button" onClick={onCancel} disabled={loading} className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 border border-gray-300 disabled:opacity-50">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AmadeusHotelPaymentModal(props: AmadeusHotelPaymentModalProps) {
  return (
    <Elements stripe={stripePromise}>
      <AmadeusHotelPaymentForm {...props} />
    </Elements>
  );
}
