'use client';
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { config } from '@/lib/config';
import { formatPrice } from '@/lib/utils';
import type { Booking } from '@/lib/types';
import { useBooking } from '@/hooks/useBooking';

const stripePromise = loadStripe(config.stripePublishableKey);

interface PaymentModalProps {
    booking: Booking;
    isGuest: boolean;
    voucherCode?: string;
    onSuccess: (confirmedBooking: Booking) => void;
    onCancel: () => void;
}

function PaymentForm({ booking, isGuest, voucherCode, onSuccess, onCancel }: PaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { createPaymentIntent, pollBookingStatus } = useBooking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'paying' | 'confirming'>('idle');
  
  const amount = booking.finalAmount ?? booking.totalAmount;
  const displayAmt = formatPrice(amount, booking.currency);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setLoading(true);
      setError(null);

      try {
          setStatus('paying');
          
          // Create payment intent with voucher code support
          let clientSecret: string;
          
          if (isGuest) {
              // For guests: need booking reference and email
              const result = await createPaymentIntent(
                  booking.id, 
                  true, 
                  booking.passengerInfo.email, 
                  booking.reference,
                  voucherCode // Pass voucherCode for guests too!
              );
              clientSecret = result.clientSecret;
          } else {
              // For authenticated users
              const result = await createPaymentIntent(
                  booking.id, 
                  false, 
                  undefined, 
                  undefined,
                  voucherCode // Pass voucherCode for authenticated users
              );
              clientSecret = result.clientSecret;
          }

          const cardEl = elements.getElement(CardElement);
          if (!cardEl) throw new Error('Card element not found');

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
                  const guestParams = isGuest && booking.reference && booking.passengerInfo?.email
                      ? { reference: booking.reference, email: booking.passengerInfo.email }
                      : undefined;
                      
                  const confirmed = await pollBookingStatus(booking.id, 10, 3000, guestParams);
                  onSuccess(confirmed);
              } catch {
                  // ✅ FIXED: Store paymentIntentId in bookingData which accepts any type
                  const updatedBooking = { 
                      ...booking, 
                      paymentStatus: 'COMPLETED', 
                      status: 'CONFIRMED',
                      bookingData: {
                          ...booking.bookingData,
                          paymentIntentId: paymentIntent.id // Store in bookingData instead
                      }
                  };
                  
                  onSuccess(updatedBooking as Booking);
              }
          } else {
              throw new Error(`Unexpected payment status: ${paymentIntent?.status}`);
          }
      } catch (err: any) {
          console.error('Payment error:', err);
          setError(err.message ?? 'Payment failed. Please try again.');
      } finally {
          setLoading(false);
          setStatus('idle');
      }
  };

  return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between mb-6">
                  <div>
                      <h2 className="text-2xl font-bold text-gray-900">Complete payment</h2>
                      {isGuest && (
                          <p className="text-sm text-amber-700 mt-1 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              You're booking as a guest. Save your booking reference and email to view or manage this booking later.
                          </p>
                      )}
                  </div>
                  <button onClick={onCancel} disabled={loading} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                  </button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Booking summary</h3>
                  <div className="flex justify-between">
                      <span className="text-gray-600">Reference</span>
                      <span className="font-medium">{booking.reference}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-gray-600">Service</span>
                      <span className="font-medium">{booking.productType.replace('_', ' ')}</span>
                  </div>
                  {voucherCode && (
                      <div className="flex justify-between text-green-600">
                          <span>Voucher applied</span>
                          <span>{voucherCode}</span>
                      </div>
                  )}
                  <div className="pt-2 border-t border-blue-200 mt-2 flex justify-between">
                      <span className="text-lg font-semibold text-gray-800">Total</span>
                      <span className="text-2xl font-bold text-green-600">{displayAmt}</span>
                  </div>
              </div>

              {status === 'confirming' && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Confirming your booking…
                  </div>
              )}

              <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Card details</label>
                      <div className="p-4 border border-gray-300 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                          <CardElement options={{ 
                              style: { 
                                  base: { 
                                      fontSize: '16px', 
                                      color: '#1f2937', 
                                      '::placeholder': { color: '#9ca3af' } 
                                  }, 
                                  invalid: { color: '#dc2626' } 
                              }, 
                              hidePostalCode: true 
                          }}/>
                      </div>
                      {process.env.NODE_ENV === 'development' && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 font-medium">Test card (dev only)</p>
                              <p className="text-xs text-gray-500 mt-1">
                                  Card: <code className="bg-gray-100 px-2 py-1 rounded">4242 4242 4242 4242</code> · 
                                  Expiry: any future · CVC: any 3 digits
                              </p>
                          </div>
                      )}
                  </div>

                  {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                          {error}
                      </div>
                  )}

                  <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <div>
                          <p className="font-medium">Secure payment</p>
                          <p className="text-xs text-green-600 mt-1">Processed securely by Stripe. We never store your card details.</p>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <button 
                          type="submit" 
                          disabled={!stripe || loading} 
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                      >
                          {loading ? (
                              <>
                                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                  </svg>
                                  {status === 'confirming' ? 'Confirming…' : 'Processing…'}
                              </>
                          ) : (
                              <>Pay {displayAmt}</>
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

export default function PaymentModal(props: PaymentModalProps) {
    return (
        <Elements stripe={stripePromise}>
            <PaymentForm {...props}/>
        </Elements>
    );
}