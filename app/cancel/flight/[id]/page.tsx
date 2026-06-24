'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredAuthToken } from '@/lib/api';
import { config } from '@/lib/config';
import toast from 'react-hot-toast';

interface BookingData {
  id: string;
  reference?: string;
  provider?: string;
  status?: string;
  paymentStatus?: string;
  totalAmount?: number;
  currency?: string;
  price?: string;
  displayPrice?: string;
  airlineName?: string;
  airline?: string;
  flightNumber?: string;
  cabin?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  arrivalDate?: string;
  stops?: number;
  passengers?: number;
  bookingData?: {
    origin?: string;
    destination?: string;
    airline?: string;
    airlineName?: string;
    flightNumber?: string;
    cabinClass?: string;
    departureCity?: string;
    arrivalCity?: string;
    departureDate?: string;
    departureTime?: string;
    arrivalDate?: string;
    arrivalTime?: string;
    stops?: number;
    passengers?: { adults?: number } | number;
    segments?: any[];
    itineraries?: any[];
    pnrReferenceNumber?: string;
    pnrNumber?: string;
    ticketStatus?: string;
    cancellationFee?: number;
    cancellationFeeCurrency?: string;
    cancellationFeeUSD?: number;
    refundAmount?: number;
    email?: string;
    contact?: {
      email?: string;
    };
    leadPassenger?: {
      email?: string;
    };
  };
  providerData?: {
    itineraries?: any[];
    contact?: {
      email?: string;
    };
    passengers?: Array<{ email?: string }>;
  };
  passengerInfo?: string | {
    firstName?: string;
    name?: string;
    fullName?: string;
    full_name?: string;
    fullname?: string;
    lastName?: string;
    email?: string;
    contact?: {
      email?: string;
    };
    travellers?: Array<{ email?: string }>;
  };
  [key: string]: any;
}

interface CancelResult {
  success: boolean;
  bookingId: string;
  reference: string;
  provider: string;
  status: string;
  cancelledAt: string;
  refundEligible: boolean;
  refundAmount: number;
  cancellationFee: number;
  cancellationFeeCurrency: string;
  cancellationFeeUSD: number;
  currency: string;
  message: string;
}

export default function CancelFlightPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [cancelResult, setCancelResult] = useState<CancelResult | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const BASE = config.apiBaseUrl;

  // Format price helper
  const formatPrice = (amount: number, currency: string) => {
    if (!amount || amount === 0) return 'N/A';
    const symbols: Record<string, string> = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'NGN': '₦' };
    const symbol = symbols[currency] || '£';
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Parse price to number for calculations
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Format date and time functions
  const formatTime = (dateTime?: string) => {
    if (!dateTime) return '--:--';
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateTime?: string) => {
    if (!dateTime) return 'Date TBD';
    try {
      const date = new Date(dateTime);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateTime;
    }
  };

  // Helper functions with proper null checks
  const getAirportCode = (bookingData: BookingData | null, field: string): string => {
    if (!bookingData) return field === 'origin' ? 'LOS' : 'ABV';
    if (bookingData[field]) return bookingData[field];
    const bData = bookingData.bookingData as Record<string, any>;
    if (bData && bData[field]) return bData[field];
    return field === 'origin' ? 'LOS' : 'ABV';
  };

  const getDateTime = (bookingData: BookingData | null, field: string): string | undefined => {
    if (!bookingData) return undefined;
    if (bookingData[field]) return bookingData[field];
    const bData = bookingData.bookingData as Record<string, any>;
    if (bData && bData[field]) return bData[field];
    return undefined;
  };

  const getStopsCount = (bookingData: BookingData | null): number => {
    if (!bookingData) return 0;
    if (bookingData.stops !== undefined) return bookingData.stops;
    if (bookingData.bookingData?.stops !== undefined) return bookingData.bookingData.stops;
    const segments = bookingData.bookingData?.segments || 
                     bookingData.bookingData?.itineraries?.[0]?.segments ||
                     bookingData.providerData?.itineraries?.[0]?.segments;
    if (segments && segments.length > 0) {
      return segments.length - 1;
    }
    return 0;
  };

  const getPassengerCount = (bookingData: BookingData | null): number => {
    if (!bookingData) return 1;
    const passengers = bookingData.bookingData?.passengers;
    if (typeof passengers === 'number') return passengers;
    if (passengers && typeof passengers === 'object' && 'adults' in passengers) {
      return passengers.adults || 1;
    }
    return bookingData.passengers || 1;
  };

  const getCityFromCode = (code: string): string => {
    const cityMap: Record<string, string> = {
      'LOS': 'Lagos', 'ABV': 'Abuja', 'LHR': 'London', 'CDG': 'Paris',
      'DXB': 'Dubai', 'JFK': 'New York', 'LAX': 'Los Angeles',
      'SYD': 'Sydney', 'HND': 'Tokyo', 'SIN': 'Singapore',
    };
    return cityMap[code] || code;
  };

  // ✅ Helper to extract email from passengerInfo (handles both object and JSON string)
  const extractEmailFromPassengerInfo = (passengerInfo: any): string | null => {
    if (!passengerInfo) return null;
    
    // If it's a string, try to parse it as JSON
    if (typeof passengerInfo === 'string') {
      try {
        const parsed = JSON.parse(passengerInfo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0]?.email || null;
        }
        return parsed?.email || null;
      } catch (e) {
        return null;
      }
    }
    
    // If it's an object, get the email
    return passengerInfo?.email || null;
  };

  // ✅ Helper to extract name from passengerInfo
  const extractNameFromPassengerInfo = (passengerInfo: any): string | null => {
    if (!passengerInfo) return null;
    
    if (typeof passengerInfo === 'string') {
      try {
        const parsed = JSON.parse(passengerInfo);
        const passenger = Array.isArray(parsed) ? parsed[0] : parsed;
        if (passenger?.firstName && passenger?.lastName) {
          return `${passenger.firstName} ${passenger.lastName}`;
        }
        return passenger?.firstName || passenger?.name || passenger?.fullName || null;
      } catch (e) {
        return null;
      }
    }
    
    if (passengerInfo?.firstName && passengerInfo?.lastName) {
      return `${passengerInfo.firstName} ${passengerInfo.lastName}`;
    }
    return passengerInfo?.name || passengerInfo?.fullName || passengerInfo?.firstName || null;
  };

  // Unwrap params
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setBookingId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  // Load booking from API
  useEffect(() => {
    if (!bookingId) return;

    const loadBooking = async () => {
      try {
        const token = getStoredAuthToken();
        if (!token) {
          toast.error('Please login to continue');
          router.push('/login');
          return;
        }

        const response = await fetch(`${BASE}/api/v1/bookings/${bookingId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch booking');
        }

        const data = await response.json();
        const bookingData = data.data || data;
        setBooking(bookingData);
      } catch (error) {
        console.error('Error loading booking:', error);
        toast.error('Failed to load booking details');
      } finally {
        setIsLoading(false);
      }
    };

    loadBooking();
  }, [bookingId, BASE, router]);

  const handleBack = () => {
    router.push('/profile');
  };

  // Call the real cancellation API
  const handleConfirmCancellation = async () => {
    if (!booking || !bookingId) return;

    setIsCancelling(true);
    setError(null);

    try {
      const token = getStoredAuthToken();
      if (!token) {
        toast.error('Please login to continue');
        router.push('/login');
        return;
      }

      const response = await fetch(`${BASE}/api/v1/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel booking');
      }

      const result = data.data || data;
      setCancelResult(result);
      setIsCancelled(true);
      toast.success('Booking cancelled successfully');
      
      // Update local storage
      const updatedBooking = { ...booking, status: 'CANCELLED' };
      localStorage.setItem(`booking_${bookingId}`, JSON.stringify(updatedBooking));

    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      setError(error.message || 'Failed to cancel booking');
      toast.error(error.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

// Extract flight data with proper null checks
const flightData = {
  id: booking?.id || '',
  bookingReference: booking?.reference || booking?.id?.slice(-8) || 'FLT-8824',
  isWakanow: booking?.provider === 'WAKANOW',
  pnrNumber: booking?.bookingData?.pnrReferenceNumber || 
             booking?.bookingData?.pnrNumber || 
             null,
  airlineName: booking?.airlineName || 
               booking?.provider || 
               booking?.bookingData?.airline || 
               booking?.bookingData?.airlineName || 
               'Airline',
  flightNumber: booking?.flightNumber || 
                booking?.bookingData?.flightNumber || 
                'N/A',
  departureAirport: getAirportCode(booking, 'origin') || 
                    getAirportCode(booking, 'departureAirport') || 
                    'LOS',
  arrivalAirport: getAirportCode(booking, 'destination') || 
                  getAirportCode(booking, 'arrivalAirport') || 
                  'ABV',
  departureCity: booking?.departureCity || 
                 booking?.bookingData?.departureCity || 
                 getCityFromCode(getAirportCode(booking, 'origin')),
  arrivalCity: booking?.arrivalCity || 
               booking?.bookingData?.arrivalCity || 
               getCityFromCode(getAirportCode(booking, 'destination')),
  departureTime: getDateTime(booking, 'departureTime') || 
                 getDateTime(booking, 'departureDate') || 
                 booking?.bookingData?.departureDate,
  arrivalTime: getDateTime(booking, 'arrivalTime') || 
               getDateTime(booking, 'arrivalDate') || 
               booking?.bookingData?.arrivalDate,
  price: booking?.displayPrice || 
         booking?.price || 
         formatPrice(booking?.totalAmount || 0, booking?.currency || 'NGN'),
  cabin: booking?.cabin || 
         booking?.bookingData?.cabinClass || 
         'Economy',
  stops: getStopsCount(booking),
  status: booking?.status || 'PENDING',
  paymentStatus: booking?.paymentStatus || 'PENDING',
  totalAmount: booking?.totalAmount || 0,
  currency: booking?.currency || 'NGN',
  // ✅ Cancellation fee from backend (real conversion)
  cancellationFee: booking?.bookingData?.cancellationFee || 0,
  cancellationFeeCurrency: booking?.bookingData?.cancellationFeeCurrency || booking?.currency || 'NGN',
  cancellationFeeUSD: booking?.bookingData?.cancellationFeeUSD || 50,
  refundAmount: booking?.bookingData?.refundAmount || 0,
  // ✅ FIXED: Customer email with JSON parsing (type-safe)
  customerEmail: (() => {
    // Try to get email from passengerInfo (handles JSON string)
    const passengerInfo = booking?.passengerInfo;
    
    if (passengerInfo) {
      if (typeof passengerInfo === 'string') {
        try {
          const parsed = JSON.parse(passengerInfo);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0]?.email || null;
          }
          return parsed?.email || null;
        } catch (e) {
          return null;
        }
      }
      if (typeof passengerInfo === 'object' && passengerInfo !== null) {
        const info = passengerInfo as any;
        return info.email || null;
      }
    }
    
    // Try other locations
    return booking?.bookingData?.email || 
           booking?.bookingData?.contact?.email ||
           booking?.bookingData?.leadPassenger?.email ||
           booking?.providerData?.contact?.email ||
           null;
  })(),
  // ✅ FIXED: Customer name with JSON parsing (type-safe)
  customerName: (() => {
    const passengerInfo = booking?.passengerInfo;
    
    if (passengerInfo) {
      if (typeof passengerInfo === 'string') {
        try {
          const parsed = JSON.parse(passengerInfo);
          const passenger = Array.isArray(parsed) ? parsed[0] : parsed;
          if (passenger?.firstName && passenger?.lastName) {
            return `${passenger.firstName} ${passenger.lastName}`;
          }
          return passenger?.firstName || passenger?.name || passenger?.fullName || 'Valued Customer';
        } catch (e) {
          return 'Valued Customer';
        }
      }
      if (typeof passengerInfo === 'object' && passengerInfo !== null) {
        const info = passengerInfo as any;
        if (info.firstName && info.lastName) {
          return `${info.firstName} ${info.lastName}`;
        }
        return info.firstName || info.name || info.fullName || info.full_name || info.fullname || info.lastName || 'Valued Customer';
      }
    }
    
    return 'Valued Customer';
  })(),
};

  const flightDataWithStopText = {
    ...flightData,
    stopText: flightData.stops === 0 ? 'Direct' : `${flightData.stops} stop${flightData.stops > 1 ? 's' : ''}`,
  };

  const originalPrice = parsePrice(flightData.price);

  // ✅ FIXED: Use backend cancellation fee (real conversion from CurrencyService)
  // The backend calculates this using the real exchange rate
  const cancellationFee = flightData.cancellationFee > 0 
    ? flightData.cancellationFee  // ✅ Real converted amount from backend
    : 0; // ⚠️ Don't use hardcoded fallback - show 0 if backend doesn't provide it

  const cancellationFeeCurrency = flightData.cancellationFeeCurrency || 'NGN';
  const cancellationFeeUSD = flightData.cancellationFeeUSD || 50;

  // ✅ FIXED: Use backend refund amount
  const totalRefund = flightData.refundAmount > 0 
    ? flightData.refundAmount  // ✅ Real refund amount from backend
    : 0; // ⚠️ Don't calculate on frontend - use backend value

  const currencySymbol = flightData.price.match(/[£$€₦]/)?.[0] || '£';

  // Check if booking is cancellable
  const isCancellable = () => {
    if (!booking) return false;
    if (booking.status === 'CANCELLED') return false;
    
    const cancellableStatuses = ['PENDING', 'PAYMENT_PENDING'];
    if (cancellableStatuses.includes(booking.status || '')) return true;
    
    if (booking.status === 'CONFIRMED' && booking.provider === 'WAKANOW') {
      const ticketStatus = (booking.bookingData as any)?.ticketStatus;
      return ticketStatus !== 'Success' && ticketStatus !== 'Issued';
    }
    
    return false;
  };

  // If no fee from backend, show a message
  const showFeeNote = flightData.cancellationFee === 0 && flightData.paymentStatus === 'COMPLETED';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#33a8da] mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-[32px] shadow-sm max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-500 mb-6">The booking you're trying to cancel doesn't exist.</p>
          <button onClick={handleBack} className="bg-[#33a8da] text-white font-black px-6 py-3 rounded-xl">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-[32px] shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Booking Cancelled</h1>
          
          {cancelResult && (
            <div className="space-y-2 text-gray-500 font-medium">
              <p>{cancelResult.message}</p>
              {cancelResult.refundEligible && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Refund Amount</span>
                    <span className="font-bold text-[#33a8da]">
                      {formatPrice(cancelResult.refundAmount, cancelResult.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cancellation Fee</span>
                    <span className="text-red-500">
                      - {formatPrice(cancelResult.cancellationFee, cancelResult.cancellationFeeCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Fee (USD)</span>
                    <span>${cancelResult.cancellationFeeUSD.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!cancelResult && (
            <p className="text-gray-500 font-medium">
              Your booking has been cancelled successfully.
              {flightData.isWakanow && flightData.paymentStatus === 'COMPLETED' && (
                <span className="block mt-2 text-sm text-yellow-600">
                  Refund will be processed within 7-10 business days.
                </span>
              )}
              {flightData.customerEmail && (
                <span className="block mt-2 text-sm text-blue-600">
                  📧 A confirmation email has been sent to {flightData.customerEmail}
                </span>
              )}
            </p>
          )}
          
          <button onClick={handleBack} className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl shadow-lg">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // Check if booking can be cancelled
  if (!isCancellable()) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-[32px] shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-500 mx-auto">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Cannot Cancel Booking</h1>
          <p className="text-gray-500 font-medium">
            {booking.status === 'CANCELLED' 
              ? 'This booking has already been cancelled.'
              : booking.status === 'CONFIRMED' && booking.provider === 'WAKANOW'
                ? 'This booking has already been ticketed and cannot be cancelled online. Please contact support.'
                : `This booking cannot be cancelled in its current status: ${booking.status}.`}
          </p>
          <button onClick={handleBack} className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl shadow-lg">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-3xl space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-red-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Cancel Booking</h1>
          </div>
          <p className="text-gray-400 font-medium text-lg">
            You are about to cancel booking <span className="text-[#33a8da] font-black">#{flightData.bookingReference}</span>
          </p>
          {flightData.isWakanow && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ This is a Wakanow booking.
                {flightData.paymentStatus === 'COMPLETED' && (
                  <span className="block mt-1">
                    A cancellation fee of <span className="font-bold">${cancellationFeeUSD.toFixed(2)} USD</span> will apply at the current exchange rate.
                  </span>
                )}
                {flightData.status === 'CONFIRMED' && booking?.bookingData?.ticketStatus === 'Success' && (
                  <span className="block mt-1">Ticket is already issued.</span>
                )}
              </p>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}
          {flightData.customerEmail && (
            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              📧 A confirmation email will be sent to {flightData.customerEmail}
            </p>
          )}
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10">
            {/* Airline Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#f0f9ff] text-[#33a8da] text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full border border-blue-50">
                  {flightData.isWakanow ? 'Wakanow Flight' : 'Flight'}
                </span>
                <span className="text-gray-300 font-bold text-xs uppercase">
                  {flightData.airlineName} • {flightData.flightNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {flightData.pnrNumber && (
                  <span className="text-xs text-gray-400 font-mono">PNR: {flightData.pnrNumber}</span>
                )}
                <span className="bg-green-50 text-green-600 text-xs font-black px-3 py-1 rounded-full">
                  {flightData.cabin}
                </span>
              </div>
            </div>

            {/* Route Visualization */}
            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
              <div className="relative h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-400 rounded-full mb-10">
                <div className="absolute left-0 -top-3 flex flex-col items-center">
                  <div className="w-6 h-6 bg-[#33a8da] rounded-full border-4 border-white shadow-lg"></div>
                  <div className="mt-2 text-xs font-black text-gray-900">{flightData.departureAirport}</div>
                  <div className="text-xs font-bold text-gray-500">{flightData.departureCity}</div>
                </div>
                <div className="absolute right-0 -top-3 flex flex-col items-center">
                  <div className="w-6 h-6 bg-indigo-500 rounded-full border-4 border-white shadow-lg"></div>
                  <div className="mt-2 text-xs font-black text-gray-900">{flightData.arrivalAirport}</div>
                  <div className="text-xs font-bold text-gray-500">{flightData.arrivalCity}</div>
                </div>
                <div className="absolute left-1/2 -top-5 transform -translate-x-1/2">
                  <div className="bg-white p-2 rounded-full shadow-lg border border-blue-100">
                    <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-gray-900">{flightData.departureAirport}</div>
                  <div className="text-xs text-gray-500">{formatTime(flightData.departureTime)}</div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-sm font-black text-gray-400">{flightDataWithStopText.stopText}</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-gray-900">{flightData.arrivalAirport}</div>
                  <div className="text-xs text-gray-500">{formatTime(flightData.arrivalTime)}</div>
                </div>
              </div>
              <div className="text-center mt-2 text-xs text-gray-400">
                {formatDate(flightData.departureTime)}
              </div>
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Passengers</p>
                <p className="text-sm font-black text-gray-900">{getPassengerCount(booking)} Traveler(s)</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Reference</p>
                <p className="text-sm font-black text-[#33a8da]">#{flightData.bookingReference}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Summary with Cancellation Fee */}
        {flightData.paymentStatus === 'COMPLETED' && (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden p-10">
            <h3 className="text-xl font-black text-gray-900 mb-6">Refund Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Original Price</span>
                <span className="text-lg font-black text-[#33a8da]">
                  {formatPrice(originalPrice, flightData.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">
                  Cancellation Fee (Wakanow Service Charge)
                </span>
                <span className="text-lg font-black text-red-500">
                  - {cancellationFee > 0 ? formatPrice(cancellationFee, cancellationFeeCurrency) : 'Calculated at cancellation'}
                </span>
              </div>
              
              {cancellationFeeUSD > 0 && (
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>Fee in USD</span>
                  <span>${cancellationFeeUSD.toFixed(2)}</span>
                </div>
              )}
              
              {showFeeNote && (
                <div className="flex justify-between items-center text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                  <span>Exchange rate will be applied at cancellation</span>
                </div>
              )}
              
              <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-2xl font-black text-gray-900">Total Refund</span>
                <span className="text-2xl font-black text-[#33a8da]">
                  {totalRefund > 0 ? formatPrice(totalRefund, flightData.currency) : 'Calculated at cancellation'}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Refund will be processed within 7-10 business days after cancellation.
                {flightData.isWakanow && ' The $50 USD cancellation fee is charged by Wakanow and converted at the current exchange rate.'}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 pt-4">
          <button onClick={handleBack} className="text-sm font-black text-[#33a8da] uppercase tracking-widest hover:underline">
            Keep Booking
          </button>
          <button 
            onClick={handleConfirmCancellation} 
            disabled={isCancelling}
            className="flex items-center gap-3 px-10 py-5 bg-[#e11d48] text-white rounded-2xl font-black text-lg shadow-2xl shadow-red-200 hover:bg-[#be123c] disabled:opacity-50 transition transform active:scale-95"
          >
            {isCancelling ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Cancel Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}