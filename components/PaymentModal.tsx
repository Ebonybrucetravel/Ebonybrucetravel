'use client';
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface PaymentModalProps {
  bookingData: any;
  passengerInfo: any;
  isGuest: boolean;
  productType: 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL';
  onSuccess: (bookingId: string) => void;
  onCancel: () => void;
}

// Initialize Stripe with YOUR key
const stripePromise = loadStripe('pk_test_51RB7kp6Lhl4eS4f7zHUCqLbqSbp9ntJiJSbgeHdix7hLSUUcDfbbyLPZGdZgfq6onADeCNFK1ufsgiku5pZCc0Je00HRetK2Xg');

// Main Payment Component
const PaymentModalContent: React.FC<PaymentModalProps> = ({
  bookingData,
  passengerInfo,
  isGuest,
  productType,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  // Calculate amount in pence/cents
  const calculateAmount = () => {
    console.log('📊 Calculating amount from bookingData:', bookingData);
    
    let amount = bookingData.totalAmount || bookingData.price || 0;
    
    // If amount is a string (like "£85"), extract the number
    if (typeof amount === 'string') {
      const match = amount.match(/(\d+(\.\d+)?)/);
      if (match) {
        amount = parseFloat(match[0]);
      } else {
        amount = 0;
      }
    }
    
    console.log('📊 Amount after parsing:', amount);
    
    // Convert to pence (Stripe expects smallest currency unit)
    const amountInPence = Math.round(amount * 100);
    
    console.log('📊 Amount in pence:', amountInPence);
    
    // Ensure minimum amount
    return Math.max(50, amountInPence); // Minimum 50 pence
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!stripe || !elements) {
        throw new Error('Payment system is not ready. Please refresh the page.');
      }

      // Get the CardElement
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card information is required');
      }

      // Validate passenger info
      const email = passengerInfo?.email || bookingData.passengerInfo?.email || 'guest@example.com';
      if (!email) {
        throw new Error('Email is required for payment');
      }

      // Calculate amount
      const amount = calculateAmount();
      console.log('💰 Final amount for payment:', amount, 'pence');

      // 1. Create payment intent
      console.log('🔄 Creating payment intent...');
      const paymentIntentResponse = await fetch(
        'https://ebony-bruce-production.up.railway.app/api/v1/payments/stripe/create-intent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'gbp', // Always use GBP for now
            email: email,
            metadata: {
              productType,
              bookingId: bookingData.id || `temp-${Date.now()}`,
              passengerName: passengerInfo?.firstName ? 
                `${passengerInfo.firstName} ${passengerInfo.lastName}` : 
                'Guest Customer',
              isGuest: isGuest.toString()
            }
          })
        }
      );

      const paymentIntentData = await paymentIntentResponse.json();
      console.log('✅ Payment intent response:', paymentIntentData);

      if (!paymentIntentResponse.ok) {
        throw new Error(paymentIntentData.message || paymentIntentData.error || 'Failed to create payment intent');
      }

      if (!paymentIntentData.clientSecret) {
        throw new Error('No client secret received from server');
      }

      // 2. Confirm payment with Stripe
      console.log('🔄 Confirming card payment...');
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: passengerInfo?.firstName ? 
                `${passengerInfo.firstName} ${passengerInfo.lastName}` : 
                'Customer',
              email: email,
              phone: passengerInfo?.phone || '',
            },
          },
          return_url: `${window.location.origin}?payment=success`,
        }
      );

      if (stripeError) {
        console.error('❌ Stripe error:', stripeError);
        throw new Error(stripeError.message || 'Payment failed');
      }

      console.log('✅ Payment intent status:', paymentIntent?.status);

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        // 3. Create booking after successful payment
        console.log('🔄 Creating booking record...');
        
        // Get authentication token
        let authToken = '';
        if (!isGuest) {
          authToken = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') || 
                     '';
        }

        // Prepare booking payload
        const bookingPayload = {
          // Common fields
          productType,
          paymentId: paymentIntent.id,
          paymentStatus: 'paid',
          totalAmount: paymentIntent.amount / 100, // Convert back to pounds
          currency: paymentIntent.currency,
          status: 'confirmed',
          bookingReference: `BOOK-${Date.now()}`,
          
          // Passenger info
          passengerInfo: {
            firstName: passengerInfo?.firstName || 'Guest',
            lastName: passengerInfo?.lastName || 'User',
            email: email,
            phone: passengerInfo?.phone || ''
          },
          
          // Booking details
          bookingDetails: {
            ...bookingData,
            // Ensure we don't send sensitive Stripe data
            clientSecret: undefined,
            paymentMethod: undefined
          }
        };

        console.log('📦 Booking payload:', bookingPayload);

        // Determine endpoint
        let bookingEndpoint = 'https://ebony-bruce-production.up.railway.app/api/v1/bookings';
        if (isGuest) {
          bookingEndpoint = 'https://ebony-bruce-production.up.railway.app/api/v1/bookings/guest';
        }

        // Headers
        const headers: any = {
          'Content-Type': 'application/json'
        };

        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        // Create booking
        const bookingResponse = await fetch(bookingEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bookingPayload)
        });

        const bookingResult = await bookingResponse.json();
        console.log('✅ Booking response:', bookingResult);

        let bookingId = paymentIntent.id; // Fallback to payment intent ID
        
        if (bookingResponse.ok) {
          bookingId = bookingResult.data?.id || 
                     bookingResult.id || 
                     bookingResult.bookingId || 
                     paymentIntent.id;
        } else {
          console.warn('⚠️ Booking creation failed but payment succeeded:', bookingResult);
          // Payment succeeded but booking failed - we still have payment record
          bookingId = `PAY-${paymentIntent.id}`;
        }

        // Store booking info in localStorage for success page
        localStorage.setItem('lastBookingId', bookingId);
        localStorage.setItem('lastBookingAmount', (paymentIntent.amount / 100).toString());
        localStorage.setItem('lastBookingType', productType);

        // 4. Call success callback
        console.log('🎉 Payment successful! Booking ID:', bookingId);
        onSuccess(bookingId);
      } else {
        throw new Error(`Payment status: ${paymentIntent?.status}`);
      }
      
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      
      // If there's a specific error about the endpoint, show helpful message
      if (err.message.includes('Failed to create payment intent')) {
        setError('Payment service is temporarily unavailable. Please try again in a few minutes.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Display amount in pounds
  const displayAmount = () => {
    let amount = bookingData.totalAmount || bookingData.price || 0;
    
    // If amount is a string (like "£85"), extract the number
    if (typeof amount === 'string') {
      const match = amount.match(/(\d+(\.\d+)?)/);
      if (match) {
        amount = parseFloat(match[0]);
      } else {
        amount = 0;
      }
    }
    
    return amount.toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
            {isGuest && (
              <p className="text-sm text-amber-600 mt-1 font-medium">
                ⚠️ Booking as Guest
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            disabled={loading}
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Booking Summary */}
        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Booking Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Service:</span>
              <span className="font-medium text-gray-900">
                {productType === 'FLIGHT_INTERNATIONAL' ? 'Flight' : 
                 productType === 'HOTEL' ? 'Hotel Stay' : 'Car Rental'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Provider:</span>
              <span className="font-medium text-gray-900">{bookingData.provider || 'Premium Service'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Passenger:</span>
              <span className="font-medium text-gray-900">
                {passengerInfo?.firstName ? 
                  `${passengerInfo.firstName} ${passengerInfo.lastName}` : 
                  'Guest'}
              </span>
            </div>
            <div className="pt-2 border-t border-blue-200 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  £{displayAmount()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Card Details
            </label>
            <div className="p-4 border border-gray-300 rounded-lg bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1f2937',
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: '500',
                      '::placeholder': {
                        color: '#9ca3af',
                        fontWeight: '400',
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
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">💳 Test Card for Development:</p>
              <p className="text-xs text-gray-500 mt-1">
                Card: <code className="bg-gray-100 px-2 py-1 rounded">4242 4242 4242 4242</code>
              </p>
              <p className="text-xs text-gray-500">
                Expiry: Any future date | CVC: Any 3 digits
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Security Assurance */}
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Secure Payment</p>
                <p className="text-xs text-green-600 mt-1">
                  Your payment is processed securely by Stripe. We never store your card details.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={!stripe || loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay £{displayAmount()}
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition disabled:opacity-50 border border-gray-300"
            >
              Cancel Payment
            </button>
          </div>
        </form>

        {/* Accepted Cards */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-3">We accept all major cards</p>
          <div className="flex justify-center space-x-3">
            <div className="w-10 h-7 bg-gradient-to-r from-purple-500 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">VISA</span>
            </div>
            <div className="w-10 h-7 bg-gradient-to-r from-orange-500 to-red-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">MC</span>
            </div>
            <div className="w-10 h-7 bg-gradient-to-r from-blue-400 to-blue-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">Amex</span>
            </div>
            <div className="w-10 h-7 bg-gradient-to-r from-gray-800 to-gray-900 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">Discover</span>
            </div>
          </div>
          <p className="text-xs text-center text-gray-400 mt-3">
            Powered by <span className="font-semibold text-gray-600">Stripe</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Wrapper component that provides Stripe Elements context
const PaymentModalWithStripe: React.FC<PaymentModalProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentModalContent {...props} />
    </Elements>
  );
};

export default PaymentModalWithStripe;