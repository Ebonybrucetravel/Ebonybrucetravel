'use client';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';

interface BookingSuccessProps {
  bookingId: string;
  onBack: () => void;
  isGuest?: boolean;

}

interface BookingData {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'payment_pending';
  productType: 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL';
  provider: string;
  basePrice: number;
  currency: string;
  totalAmount: number;
  bookingData: {
    origin: string;
    destination: string;
    departureDate: string;
    arrivalDate?: string;
    airline?: string;
    flightNumber?: string;
    hotelName?: string;
    carModel?: string;
    checkInDate?: string;
    checkOutDate?: string;
    pickUpDate?: string;
    dropOffDate?: string;
    bookingReference?: string;
  };
  passengerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  createdAt: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  bookingReference: string;
  offerId?: string;
}

interface PaymentFormProps {
  booking: BookingData;
  onSuccess: () => void;
  onCancel: () => void;
  isGuest: boolean;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const PaymentFormComponent: React.FC<PaymentFormProps> = ({ booking, onSuccess, onCancel, isGuest }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (isGuest) {
        // Guest payment
        response = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/payments/stripe/create-intent/guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingReference: booking.bookingReference,
            email: booking.passengerInfo.email,
            amount: booking.totalAmount,
            currency: booking.currency.toLowerCase()
          })
        });
      } else {
        // Authenticated user payment
        const token = localStorage.getItem('token');
        response = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/payments/stripe/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            bookingId: booking.id,
            amount: booking.totalAmount,
            currency: booking.currency.toLowerCase()
          })
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment intent');
      }

      // Confirm the payment
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${booking.passengerInfo.firstName} ${booking.passengerInfo.lastName}`,
              email: booking.passengerInfo.email,
              phone: booking.passengerInfo.phone,
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Refresh booking data after successful payment
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-900">Complete Payment</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-gray-600">Total Amount</p>
              <p className="text-xs text-gray-500">Booking #{booking.bookingReference}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-gray-900">
                {getCurrencySymbol(booking.currency)}{booking.totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Includes all taxes & fees</p>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <p className="text-sm font-bold text-gray-700 mb-3">Select Payment Method</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <span className="text-sm font-bold">Credit Card</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('bank')}
              className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              disabled
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-400">Bank Transfer</span>
              <span className="text-[10px] text-gray-400 mt-1">Coming Soon</span>
            </button>
          </div>
        </div>

        {paymentMethod === 'card' && (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Card Information
              </label>
              <div className="p-4 border-2 border-gray-200 rounded-xl bg-white">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#1f2937',
                        '::placeholder': {
                          color: '#9ca3af',
                        },
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      },
                      invalid: {
                        color: '#ef4444',
                      },
                    },
                    hidePostalCode: true,
                  }}
                />
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">Secure Payment</p>
                  <p className="text-xs text-gray-500">Your payment is encrypted and secure. We never store your card details.</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                disabled={!stripe || loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    Pay {getCurrencySymbol(booking.currency)}{booking.totalAmount.toLocaleString()}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all"
              >
                Cancel Payment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const PaymentForm = (props: PaymentFormProps) => (
  <Elements stripe={stripePromise}>
    <PaymentFormComponent {...props} />
  </Elements>
);

// Helper functions
const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'NGN': '₦',
  };
  return symbols[currency] || currency;
};

const BookingSuccess: React.FC<BookingSuccessProps> = ({ bookingId, onBack, isGuest = false }) => {
  const { currency: appCurrency } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ [key: string]: 'idle' | 'loading' | 'success' }>({
    pdf: 'idle',
    email: 'idle',
    calendar: 'idle'
  });
  
  useEffect(() => {
    loadBookingData();
  }, [bookingId]);

  const loadBookingData = async () => {
    try {
      setLoading(true);
      
      // Try authenticated route first if not guest
      if (!isGuest) {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch(`https://ebony-bruce-production.up.railway.app/api/v1/bookings/${bookingId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setBooking(data);
            setPaymentCompleted(data.paymentStatus === 'paid');
            return;
          }
        }
      }
      
      // Fallback to public endpoint or guest access
      const response = await fetch(`https://ebony-bruce-production.up.railway.app/api/v1/bookings/public/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
        setPaymentCompleted(data.paymentStatus === 'paid');
      } else {
        throw new Error('Booking not found');
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine booking type
  const isHotel = booking?.productType === 'HOTEL';
  const isCar = booking?.productType === 'CAR_RENTAL';
  const isFlight = booking?.productType === 'FLIGHT_INTERNATIONAL' || (!isHotel && !isCar);

  // Format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  // Calculate price breakdown
  const getPriceBreakdown = () => {
    if (!booking) return null;
    
    const basePrice = booking.basePrice;
    const totalAmount = booking.totalAmount;
    const currencySymbol = getCurrencySymbol(booking.currency);
    
    // Calculate taxes and fees (simplified)
    const taxesAndFees = totalAmount - basePrice;
    
    return {
      basePrice: `${currencySymbol}${basePrice.toLocaleString()}.00`,
      taxesAndFees: `${currencySymbol}${taxesAndFees.toLocaleString()}.00`,
      total: `${currencySymbol}${totalAmount.toLocaleString()}.00`,
      currency: booking.currency
    };
  };

  const priceBreakdown = getPriceBreakdown();

  // Action Handlers
  const handleDownloadPDF = () => {
    setActionStatus(prev => ({ ...prev, pdf: 'loading' }));
    setTimeout(() => {
      window.print();
      setActionStatus(prev => ({ ...prev, pdf: 'success' }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, pdf: 'idle' })), 2000);
    }, 1000);
  };

  const handleEmail = async () => {
    setActionStatus(prev => ({ ...prev, email: 'loading' }));
    try {
      // Call your email API endpoint
      const response = await fetch('https://ebony-bruce-production.up.railway.app/api/v1/bookings/send-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking?.id,
          email: booking?.passengerInfo.email
        })
      });
      
      if (response.ok) {
        setActionStatus(prev => ({ ...prev, email: 'success' }));
        setTimeout(() => setActionStatus(prev => ({ ...prev, email: 'idle' })), 3000);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      setActionStatus(prev => ({ ...prev, email: 'idle' }));
    }
  };

  const handleAddCalendar = () => {
    setActionStatus(prev => ({ ...prev, calendar: 'loading' }));
    
    if (!booking) return;
    
    // Generate .ics file content
    const startDate = booking.bookingData.departureDate ? 
      new Date(booking.bookingData.departureDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : 
      "20251226T080000Z";
    
    const endDate = booking.bookingData.arrivalDate ? 
      new Date(booking.bookingData.arrivalDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : 
      startDate;
    
    const summary = `Ebony Bruce Travels: ${booking.provider} ${isFlight ? 'Flight' : isHotel ? 'Stay' : 'Rental'}`;
    const description = `Booking Confirmation: ${booking.bookingReference}. Passenger: ${booking.passengerInfo.firstName} ${booking.passengerInfo.lastName}. Email: ${booking.passengerInfo.email}. Phone: ${booking.passengerInfo.phone}`;
    const location = isFlight ? 
      `${booking.bookingData.origin} to ${booking.bookingData.destination}` : 
      booking.bookingData.destination || 'Your Destination';

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${booking.id}@ebonybruce.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `booking-${booking.bookingReference}.ics`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    setActionStatus(prev => ({ ...prev, calendar: 'success' }));
    setTimeout(() => setActionStatus(prev => ({ ...prev, calendar: 'idle' })), 2000);
  };

  const handlePaymentSuccess = () => {
    setPaymentCompleted(true);
    setShowPayment(false);
    // Refresh booking data
    loadBookingData();
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const handleManageBooking = () => {
    router.push(`/bookings/manage/${bookingId}`);
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    if (confirm('Are you sure you want to cancel this booking?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`https://ebony-bruce-production.up.railway.app/api/v1/bookings/${bookingId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          alert('Booking cancelled successfully');
          loadBookingData();
        } else {
          throw new Error('Failed to cancel booking');
        }
      } catch (error) {
        alert('Failed to cancel booking. Please try again.');
      }
    }
  };

  // Content Renderers
  const renderFlightItinerary = () => (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-10 print:shadow-none print:border-gray-200">
      <div className="flex items-center gap-3 mb-10">
        <div className="text-[#33a8da]">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Flight Itinerary</h3>
      </div>

      <div className="relative pl-10 ml-1">
        <div className="absolute left-[3px] top-[10px] bottom-[10px] w-[1.5px] bg-gray-100"></div>
        <div className="relative mb-16">
          <div className="absolute -left-[40px] top-1 w-3 h-3 rounded-full bg-[#33a8da] border-2 border-white shadow-sm z-10"></div>
          <div className="flex flex-col md:flex-row md:items-start justify-between">
            <div>
              <p className="text-xl font-black text-gray-900">
                {booking?.bookingData.departureDate ? formatTime(booking.bookingData.departureDate) : '08:00 AM'}
              </p>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">
                {booking?.bookingData.origin || 'Lagos (LOS)'}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                {booking?.bookingData.departureDate ? formatDate(booking.bookingData.departureDate) : 'Dec 26, 2025'}
              </p>
            </div>
            <div className="mt-4 md:mt-0 md:text-right">
              <p className="text-xs font-black text-gray-900">
                {booking?.bookingData.airline || booking?.provider || 'British Airways'} 
                {booking?.bookingData.flightNumber && ` (${booking.bookingData.flightNumber})`}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-70">
                Economy Class
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-[40px] bottom-1 w-3 h-3 rounded-full border-2 border-[#33a8da] bg-white shadow-sm z-10"></div>
          <div className="flex flex-col md:flex-row md:items-start justify-between">
            <div>
              <p className="text-xl font-black text-gray-900">
                {booking?.bookingData.arrivalDate ? formatTime(booking.bookingData.arrivalDate) : '09:15 AM'}
              </p>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">
                {booking?.bookingData.destination || 'New York (JFK)'}
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase">
                {booking?.bookingData.arrivalDate ? formatDate(booking.bookingData.arrivalDate) : 'Dec 26, 2025'}
              </p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              {booking?.bookingData.departureDate && booking?.bookingData.arrivalDate && (
                <span className="text-[#5cb85c] text-[10px] font-black uppercase tracking-widest">
                  Duration: {getDuration(booking.bookingData.departureDate, booking.bookingData.arrivalDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12 pt-8 border-t border-gray-50 flex items-center gap-4 text-gray-400 print:text-black">
         <div className="flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth={2}/>
           </svg>
           <span className="text-[10px] font-black uppercase tracking-widest">2x23kg Baggage</span>
         </div>
         <div className="flex items-center gap-2">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3m0 18a10.003 10.003 0 01-8.213-4.3l-.054-.09m8.267 4.394c1.744-2.772 2.753-6.054 2.753-9.571m1.44 2.04l-.054.09A10.003 10.003 0 0112 21" strokeWidth={2}/>
           </svg>
           <span className="text-[10px] font-black uppercase tracking-widest">Global Assist</span>
         </div>
      </div>
    </div>
  );

  const renderHotelItinerary = () => (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-10 print:shadow-none print:border-gray-200">
      <div className="flex items-center gap-3 mb-12">
        <div className="text-[#33a8da]">
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
             <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
           </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Stay Details</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12 mb-12">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Check In</p>
          <p className="text-sm font-black text-gray-900">
            {booking?.bookingData.checkInDate ? formatDate(booking.bookingData.checkInDate) : 'Jan 10, 2026'}
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">10:00 AM</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Check Out</p>
          <p className="text-sm font-black text-gray-900">
            {booking?.bookingData.checkOutDate ? formatDate(booking.bookingData.checkOutDate) : 'Jan 15, 2026'}
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">10:00 AM</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-gray-400 pt-8 border-t border-gray-50 print:text-black">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest print:text-black">
          2 Adults, 0 Children
        </span>
      </div>
    </div>
  );

  const renderCarItinerary = () => (
    <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-10 print:shadow-none print:border-gray-200">
      <div className="flex items-center gap-3 mb-10">
        <div className="text-purple-600">
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
             <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
           </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Rental Details</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12 mb-10">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Pick Up</p>
          <p className="text-sm font-black text-gray-900">
            {booking?.bookingData.destination || 'International Airport'}
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            {booking?.bookingData.pickUpDate ? formatDate(booking.bookingData.pickUpDate) : 'Dec 26, 2025'} at 10:00 AM
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Drop Off</p>
          <p className="text-sm font-black text-gray-900">
            {booking?.bookingData.destination || 'International Airport'}
          </p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">
            {booking?.bookingData.dropOffDate ? formatDate(booking.bookingData.dropOffDate) : 'Dec 28, 2025'} at 10:00 AM
          </p>
        </div>
      </div>
      
      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex items-center gap-3 print:bg-white print:border-gray-200">
         <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm print:border print:border-gray-100">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
             <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
         </div>
         <p className="text-[11px] font-black text-purple-900 uppercase">
           Meet-and-Greet included. Look for the {booking?.provider || 'Car Rental'} sign.
         </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-bold">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or has been cancelled.</p>
          <button 
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
          >
            Go Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      {showPayment && booking && (
        <PaymentForm
          booking={booking}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          isGuest={isGuest}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-10 print:hidden">
          <button onClick={onBack} className="hover:text-blue-600 transition flex items-center gap-1">
            Home <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
          </button>
          <span className="hover:text-blue-600 cursor-pointer flex items-center gap-1">
            My Bookings <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
          </span>
          <span className="text-blue-600">Booking #{booking.bookingReference}</span>
        </nav>

        {/* Payment Status Banner */}
        {!paymentCompleted && (
          <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-yellow-800 text-lg">Payment Required</h3>
                  <p className="text-sm text-yellow-600">Complete payment to confirm your booking. Your booking will be cancelled if not paid within 24 hours.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelBooking}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel Booking
                </button>
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black rounded-xl hover:from-yellow-600 hover:to-orange-600 transition shadow-lg shadow-yellow-100"
                >
                  Pay Now - {priceBreakdown?.total}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {paymentCompleted && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#e7f6ed] rounded-full flex items-center justify-center text-[#5cb85c]">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-[#5cb85c] uppercase tracking-tight">Booking Confirmed!</h1>
                <p className="text-sm text-gray-600">Booking reference: <span className="font-bold">{booking.bookingReference}</span></p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 print:hidden">
              {[
                { id: 'pdf', label: 'Download PDF', onClick: handleDownloadPDF, icon: <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /> },
                { id: 'email', label: 'Email', onClick: handleEmail, icon: <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
                { id: 'calendar', label: 'Add to Calendar', onClick: handleAddCalendar, icon: <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> }
              ].map((btn) => (
                <button 
                  key={btn.id} 
                  onClick={btn.onClick}
                  disabled={actionStatus[btn.id] === 'loading'}
                  className={`flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-black transition shadow-sm active:scale-95 uppercase tracking-tight relative overflow-hidden group ${actionStatus[btn.id] === 'success' ? 'text-green-600 border-green-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {actionStatus[btn.id] === 'loading' ? (
                    <svg className="animate-spin h-4 w-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : actionStatus[btn.id] === 'success' ? (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-[#33a8da] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{btn.icon}</svg>
                  )}
                  <span>
                    {actionStatus[btn.id] === 'loading' ? 'Processing...' : 
                     actionStatus[btn.id] === 'success' ? 'Sent!' : btn.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10 items-start print:flex-col print:gap-4 print:items-stretch">
          <div className="flex-1 space-y-8 w-full">
            {isFlight && renderFlightItinerary()}
            {isHotel && renderHotelItinerary()}
            {isCar && renderCarItinerary()}

            {/* Passenger Information */}
            <div className="bg-white rounded-[16px] border border-gray-100 shadow-sm p-10 print:shadow-none print:border-gray-200">
              <div className="flex items-center gap-3 mb-8">
                <div className="text-[#33a8da]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Passenger Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</p>
                  <p className="text-lg font-black text-gray-900">
                    {booking.passengerInfo.firstName} {booking.passengerInfo.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</p>
                  <p className="text-lg font-black text-gray-900">{booking.passengerInfo.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone Number</p>
                  <p className="text-lg font-black text-gray-900">{booking.passengerInfo.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Booking Date</p>
                  <p className="text-lg font-black text-gray-900">{formatDate(booking.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* General Instructions */}
            <div className={`rounded-[16px] border p-8 flex items-start gap-4 ${isHotel ? 'bg-[#f0f7ff] border-[#dbeafe]' : isCar ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'} print:border-gray-200 print:bg-white`}>
              <div className={`mt-0.5 shrink-0 ${isHotel || isFlight ? 'text-[#33a8da]' : 'text-purple-600'} print:text-black`}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h4 className={`text-sm font-black uppercase tracking-tight ${isHotel || isFlight ? 'text-[#1e40af]' : 'text-purple-900'} print:text-black`}>
                  {isHotel ? 'Check-in Instruction' : isCar ? 'Pick-up Instruction' : 'Boarding Instruction'}
                </h4>
                <p className={`text-[13px] font-bold leading-relaxed ${isHotel || isFlight ? 'text-[#1e40af]/80' : 'text-purple-900/80'} print:text-gray-600`}>
                  {isHotel ? 'The front desk is open 24/7. Please have your confirmation ID and a Valid photo ID ready.' : 
                   isCar ? 'Please head to the rental desk at the Arrivals terminal. Have your license and credit card ready.' : 
                   'Web check-in opens 24 hours before departure. Please arrive at the airport at least 3 hours before your flight. Have your passport and booking confirmation ready.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="w-full lg:w-[460px] print:w-full print:mt-4">
            <div className="bg-white rounded-[24px] shadow-lg border border-gray-100 overflow-hidden print:shadow-none print:border-gray-200">
              {/* Header */}
              {!isFlight ? (
                <>
                  <div className="relative h-60 print:hidden">
                    <img 
                      src={isHotel 
                        ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600" 
                        : "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600"
                      } 
                      className="w-full h-full object-cover" 
                      alt="Item" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-white font-black text-xl leading-tight tracking-tight">
                        {booking.bookingData.hotelName || booking.bookingData.carModel || booking.provider}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-white font-black text-xs">5.0</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Print Header */}
                  <div className="hidden print:block p-10 border-b border-gray-50">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                      {booking.bookingData.hotelName || booking.bookingData.carModel || booking.provider}
                    </h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-70">
                      Booking Confirmation #{booking.bookingReference}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-10 border-b border-gray-50">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                    {booking.bookingData.airline || booking.provider}
                  </h3>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-70">
                    Booking Receipt #{booking.bookingReference}
                  </p>
                </div>
              )}

              {/* Booking Details */}
              <div className="p-10 border-b border-gray-50">
                <div className="space-y-5">
                  <div className="flex items-center gap-4 text-gray-400 print:text-black">
                    <div className="shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-gray-500 print:text-black">
                      {isHotel 
                        ? `${formatDate(booking.bookingData.checkInDate || '')} - ${formatDate(booking.bookingData.checkOutDate || '')}`
                        : isCar
                        ? `${formatDate(booking.bookingData.pickUpDate || '')} - ${formatDate(booking.bookingData.dropOffDate || '')}`
                        : `${formatDate(booking.bookingData.departureDate)}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 print:text-black">
                    <div className="shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-gray-500 print:text-black">
                      {booking.passengerInfo.firstName} {booking.passengerInfo.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 print:text-black">
                    <div className="shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-gray-500 print:text-black">
                      {booking.passengerInfo.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-10 space-y-8">
                <h4 className="text-lg font-black text-gray-900 tracking-tight">Price Breakdown</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-600 font-bold print:text-black">Base Price</span>
                    <span className="font-black text-[#33a8da] print:text-black">
                      {priceBreakdown?.basePrice}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-base">
                    <span className="text-gray-600 font-bold print:text-black">Taxes & Fees</span>
                    <span className="font-black text-[#33a8da] print:text-black">
                      {priceBreakdown?.taxesAndFees}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-base border-b border-gray-50 pb-8 print:border-gray-100">
                    <span className="text-gray-600 font-bold print:text-black">Service fee</span>
                    <span className="font-black uppercase text-[#33a8da] print:text-black">Free</span>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-2xl font-black text-gray-900 tracking-tighter">Total</span>
                    <span className="text-2xl font-black tracking-tighter text-[#33a8da] print:text-black">
                      {priceBreakdown?.total}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Payment Status</span>
                      <span className={`font-black uppercase ${paymentCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                        {paymentCompleted ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-gray-500">Booking Status</span>
                      <span className={`font-black uppercase ${
                        booking.status === 'confirmed' ? 'text-green-600' :
                        booking.status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {paymentCompleted ? (
                  <button 
                    onClick={handleManageBooking}
                    className={`w-full text-white font-black py-6 rounded-2xl shadow-2xl transition transform active:scale-95 text-lg mt-6 print:hidden ${isCar ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-100' : 'bg-[#33a8da] hover:bg-[#2c98c7] shadow-blue-100'}`}
                  >
                    Manage Booking
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black py-6 rounded-2xl shadow-2xl hover:from-yellow-600 hover:to-orange-600 transition transform active:scale-95 text-lg mt-6 print:hidden"
                  >
                    Complete Payment
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Cross Promotion Banner */}
        {paymentCompleted && (
          <div className="mt-16 bg-white rounded-[24px] p-10 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm print:hidden">
            <div className="flex items-center gap-8">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl shrink-0 ${isHotel ? 'bg-[#33a8da] shadow-blue-100' : isCar ? 'bg-[#33a8da] shadow-blue-100' : 'bg-yellow-500 shadow-yellow-100'}`}>
                {isFlight ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2zm3-8h4c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM3 21h18v-2H3v2zM3 8c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10H3V8z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                )}
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900 tracking-tight leading-tight mb-1">
                  {isFlight ? 'Need a Hotel for your stay?' : 'Need a Flight for your trip?'}
                </h4>
                <p className="text-sm font-bold text-gray-400">Experience the perfect blend of comfort and affordability</p>
              </div>
            </div>
            <button 
              onClick={() => router.push(isFlight ? '/hotels' : '/flights')}
              className="px-10 py-4 bg-[#33a8da] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#2c98c7] transition active:scale-95 shadow-lg shadow-blue-100"
            >
              {isFlight ? 'Browse Hotels' : 'Browse Flights'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSuccess;