'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelFlightPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Format price helper
  const formatPrice = (amount: number, currency: string) => {
    if (!amount) return 'N/A';
    const symbols: Record<string, string> = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'NGN': '₦' };
    const symbol = symbols[currency] || '£';
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Parse price to number for calculations
  const parsePrice = (priceStr: string): number => {
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

  // Helper to extract airport code from various possible locations
  const getAirportCode = (bookingData: any, field: string): string => {
    // Try direct field
    if (bookingData[field]) return bookingData[field];
    
    // Try nested in bookingData
    if (bookingData.bookingData?.[field]) return bookingData.bookingData[field];
    
    // Try from segments if available
    if (bookingData.bookingData?.segments?.[0]?.departure?.iataCode && field === 'origin') {
      return bookingData.bookingData.segments[0].departure.iataCode;
    }
    if (bookingData.bookingData?.segments?.[0]?.arrival?.iataCode && field === 'destination') {
      return bookingData.bookingData.segments[0].arrival.iataCode;
    }
    
    // Try from itineraries
    if (bookingData.bookingData?.itineraries?.[0]?.segments?.[0]?.departure?.iataCode && field === 'origin') {
      return bookingData.bookingData.itineraries[0].segments[0].departure.iataCode;
    }
    if (bookingData.bookingData?.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.iataCode && field === 'destination') {
      const segments = bookingData.bookingData.itineraries[0].segments;
      return segments[segments.length - 1].arrival.iataCode;
    }
    
    // Try from offer data
    if (bookingData.providerData?.itineraries?.[0]?.segments?.[0]?.departure?.iataCode && field === 'origin') {
      return bookingData.providerData.itineraries[0].segments[0].departure.iataCode;
    }
    if (bookingData.providerData?.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.iataCode && field === 'destination') {
      const segments = bookingData.providerData.itineraries[0].segments;
      return segments[segments.length - 1].arrival.iataCode;
    }
    
    return field === 'origin' ? 'LOS' : 'ABV';
  };

  // Helper to extract datetime from various possible locations
  const getDateTime = (bookingData: any, field: string): string | undefined => {
    // Try direct field
    if (bookingData[field]) return bookingData[field];
    
    // Try nested in bookingData
    if (bookingData.bookingData?.[field]) return bookingData.bookingData[field];
    
    // Try from segments
    if (bookingData.bookingData?.segments?.[0]?.departure?.at && field === 'departureTime') {
      return bookingData.bookingData.segments[0].departure.at;
    }
    if (bookingData.bookingData?.segments?.slice(-1)[0]?.arrival?.at && field === 'arrivalTime') {
      const segments = bookingData.bookingData.segments;
      return segments[segments.length - 1].arrival.at;
    }
    
    // Try from itineraries
    if (bookingData.bookingData?.itineraries?.[0]?.segments?.[0]?.departure?.at && field === 'departureTime') {
      return bookingData.bookingData.itineraries[0].segments[0].departure.at;
    }
    if (bookingData.bookingData?.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at && field === 'arrivalTime') {
      const segments = bookingData.bookingData.itineraries[0].segments;
      return segments[segments.length - 1].arrival.at;
    }
    
    // Try from providerData
    if (bookingData.providerData?.itineraries?.[0]?.segments?.[0]?.departure?.at && field === 'departureTime') {
      return bookingData.providerData.itineraries[0].segments[0].departure.at;
    }
    if (bookingData.providerData?.itineraries?.[0]?.segments?.slice(-1)[0]?.arrival?.at && field === 'arrivalTime') {
      const segments = bookingData.providerData.itineraries[0].segments;
      return segments[segments.length - 1].arrival.at;
    }
    
    return undefined;
  };

  // Helper to get stops count
  const getStopsCount = (bookingData: any): number => {
    // Try direct
    if (bookingData.stops !== undefined) return bookingData.stops;
    if (bookingData.bookingData?.stops !== undefined) return bookingData.bookingData.stops;
    
    // Calculate from segments
    const segments = bookingData.bookingData?.segments || 
                     bookingData.bookingData?.itineraries?.[0]?.segments ||
                     bookingData.providerData?.itineraries?.[0]?.segments;
    
    if (segments && segments.length > 0) {
      return segments.length - 1;
    }
    
    return 0;
  };

  // Unwrap params
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setBookingId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!bookingId) return;

    // Load booking data from storage
    const loadBooking = () => {
      try {
        // FIRST: Try to get from currentCancellingBooking (set by modal)
        const currentCancelling = localStorage.getItem('currentCancellingBooking');
        if (currentCancelling) {
          const parsed = JSON.parse(currentCancelling);
          if (parsed.id === bookingId) {
            setBooking(parsed);
            setIsLoading(false);
            // Clear it after use
            localStorage.removeItem('currentCancellingBooking');
            return;
          }
        }

        // SECOND: Try to get from specific cancellation key
        const specificCancelling = localStorage.getItem(`cancelling_${bookingId}`);
        if (specificCancelling) {
          const parsed = JSON.parse(specificCancelling);
          setBooking(parsed);
          setIsLoading(false);
          // Clear it after use
          localStorage.removeItem(`cancelling_${bookingId}`);
          return;
        }

        // THIRD: Try to get from individual booking
        const saved = localStorage.getItem(`booking_${bookingId}`);
        if (saved) {
          setBooking(JSON.parse(saved));
          setIsLoading(false);
          return;
        }
        
        // FOURTH: Try from userBookings
        const userBookings = localStorage.getItem('userBookings');
        if (userBookings) {
          const bookings = JSON.parse(userBookings);
          const found = bookings.find((b: any) => b.id === bookingId);
          if (found) {
            setBooking(found);
            setIsLoading(false);
            return;
          }
        }
        
        // Not found
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading booking:', error);
        setIsLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  const handleBack = () => {
    router.push('/profile');
  };

  const handleConfirmCancellation = () => {
    if (!booking || !bookingId) return;
    
    setIsCancelling(true);
    setTimeout(() => {
      // Update booking status
      if (booking) {
        const updatedBooking = { ...booking, status: 'CANCELLED' };
        localStorage.setItem(`booking_${bookingId}`, JSON.stringify(updatedBooking));
        
        // Update in userBookings
        const userBookings = localStorage.getItem('userBookings');
        if (userBookings) {
          const bookings = JSON.parse(userBookings);
          const updated = bookings.map((b: any) => 
            b.id === bookingId ? updatedBooking : b
          );
          localStorage.setItem('userBookings', JSON.stringify(updated));
        }
      }
      
      setIsCancelling(false);
      setIsCancelled(true);
    }, 2000);
  };

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

  // Extract flight data with improved extraction
  const flightData = {
    id: booking.id,
    bookingReference: booking.reference || booking.id?.slice(-8) || 'FLT-8824',
    airlineName: booking.airlineName || 
                 booking.provider || 
                 booking.bookingData?.airline || 
                 booking.bookingData?.airlineName || 
                 'Airline',
    flightNumber: booking.flightNumber || 
                  booking.bookingData?.flightNumber || 
                  'N/A',
    
    // Airport codes using helper
    departureAirport: getAirportCode(booking, 'origin') || 
                      getAirportCode(booking, 'departureAirport') || 
                      'LOS',
    arrivalAirport: getAirportCode(booking, 'destination') || 
                    getAirportCode(booking, 'arrivalAirport') || 
                    'ABV',
    
    // City names
    departureCity: booking.departureCity || 
                   booking.bookingData?.departureCity || 
                   getCityFromCode(getAirportCode(booking, 'origin')),
    arrivalCity: booking.arrivalCity || 
                 booking.bookingData?.arrivalCity || 
                 getCityFromCode(getAirportCode(booking, 'destination')),
    
    // Date and time using helper
    departureTime: getDateTime(booking, 'departureTime') || 
                   getDateTime(booking, 'departureDate') || 
                   booking.bookingData?.departureDate,
    arrivalTime: getDateTime(booking, 'arrivalTime') || 
                 getDateTime(booking, 'arrivalDate') || 
                 booking.bookingData?.arrivalDate,
    
    price: booking.displayPrice || 
           booking.price || 
           formatPrice(booking.totalAmount, booking.currency),
    
    cabin: booking.cabin || 
           booking.bookingData?.cabinClass || 
           'Economy',
    
    stops: getStopsCount(booking),
  };

  // Helper to get city name from airport code
  function getCityFromCode(code: string): string {
    const cityMap: Record<string, string> = {
      'LOS': 'Lagos',
      'ABV': 'Abuja',
      'LHR': 'London',
      'CDG': 'Paris',
      'DXB': 'Dubai',
      'JFK': 'New York',
      'LAX': 'Los Angeles',
      'SYD': 'Sydney',
      'HND': 'Tokyo',
      'SIN': 'Singapore',
    };
    return cityMap[code] || code;
  }

  const flightDataWithStopText = {
    ...flightData,
    stopText: flightData.stops === 0 ? 'Direct' : `${flightData.stops} stop${flightData.stops > 1 ? 's' : ''}`,
  };

  const originalPrice = parsePrice(flightData.price);
  const cancellationFee = 50;
  const totalRefund = originalPrice - cancellationFee;
  const currencySymbol = flightData.price.match(/[£$€₦]/)?.[0] || '£';

  if (isCancelled) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-[32px] shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Flight Cancelled</h1>
          <p className="text-gray-500 font-medium">
            Your flight {flightData.flightNumber} has been cancelled. Refund of {currencySymbol}{totalRefund.toFixed(2)} will be processed within 7-10 business days.
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
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Cancel Flight</h1>
          </div>
          <p className="text-gray-400 font-medium text-lg">
            You are about to cancel flight <span className="text-[#33a8da] font-black">#{flightData.bookingReference}</span>
          </p>
        </div>

        {/* Flight Details Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10">
            {/* Airline Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#f0f9ff] text-[#33a8da] text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full border border-blue-50">
                  Flight
                </span>
                <span className="text-gray-300 font-bold text-xs uppercase">
                  {flightData.airlineName} • {flightData.flightNumber}
                </span>
              </div>
              <span className="bg-green-50 text-green-600 text-xs font-black px-3 py-1 rounded-full">
                {flightData.cabin}
              </span>
            </div>

            {/* Route Visualization */}
            <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
              <div className="relative h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-400 rounded-full mb-10">
                {/* Origin */}
                <div className="absolute left-0 -top-3 flex flex-col items-center">
                  <div className="w-6 h-6 bg-[#33a8da] rounded-full border-4 border-white shadow-lg"></div>
                  <div className="mt-2 text-xs font-black text-gray-900">{flightData.departureAirport}</div>
                  <div className="text-xs font-bold text-gray-500">{flightData.departureCity}</div>
                </div>
                
                {/* Destination */}
                <div className="absolute right-0 -top-3 flex flex-col items-center">
                  <div className="w-6 h-6 bg-indigo-500 rounded-full border-4 border-white shadow-lg"></div>
                  <div className="mt-2 text-xs font-black text-gray-900">{flightData.arrivalAirport}</div>
                  <div className="text-xs font-bold text-gray-500">{flightData.arrivalCity}</div>
                </div>

                {/* Airplane */}
                <div className="absolute left-1/2 -top-5 transform -translate-x-1/2">
                  <div className="bg-white p-2 rounded-full shadow-lg border border-blue-100">
                    <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Flight Info */}
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

            {/* Flight Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Passengers</p>
                <p className="text-sm font-black text-gray-900">
                  {booking.bookingData?.passengers?.adults || 
                   booking.bookingData?.passengers || 
                   booking.passengers || 
                   1} Traveler(s)
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Reference</p>
                <p className="text-sm font-black text-[#33a8da]">#{flightData.bookingReference}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Summary */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10 space-y-8">
            <h3 className="text-xl font-black text-gray-900">Refund Summary</h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Ticket Price</span>
                <span className="text-lg font-black text-[#33a8da]">{currencySymbol}{originalPrice.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Cancellation Fee</span>
                <span className="text-lg font-black text-red-500">- {currencySymbol}{cancellationFee.toFixed(2)}</span>
              </div>
              
              <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                <span className="text-2xl font-black text-gray-900">Total Refund</span>
                <span className="text-2xl font-black text-[#33a8da]">
                  {currencySymbol}{totalRefund.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 pt-4">
          <button onClick={handleBack} className="text-sm font-black text-[#33a8da] uppercase tracking-widest hover:underline">
            Keep Flight
          </button>
          <button onClick={handleConfirmCancellation} disabled={isCancelling}
            className="flex items-center gap-3 px-10 py-5 bg-[#e11d48] text-white rounded-2xl font-black text-lg shadow-2xl shadow-red-200 hover:bg-[#be123c] disabled:opacity-50"
          >
            {isCancelling ? 'Processing...' : 'Cancel Flight'}
          </button>
        </div>
      </div>
    </div>
  );
}