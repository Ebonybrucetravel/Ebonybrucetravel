'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelCarPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

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

  // Format date and time
  const formatDateTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return 'Date TBD';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeStr;
    }
  };

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    if (!amount) return 'N/A';
    const symbols: Record<string, string> = {
      'GBP': '£', 'USD': '$', 'EUR': '€', 'NGN': '₦'
    };
    const symbol = symbols[currency] || '£';
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#33a8da] mb-4"></div>
          <p className="text-gray-600">Loading car rental details...</p>
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
          <p className="text-gray-500 mb-6">The car rental booking you're trying to cancel doesn't exist.</p>
          <button onClick={handleBack} className="bg-[#33a8da] text-white font-black px-6 py-3 rounded-xl">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // Extract car rental data (handle both nested and flat structures)
  const carData = {
    id: booking.id,
    bookingReference: booking.reference || booking.id?.slice(-8) || 'CAR-8824',
    vehicle: booking.title || booking.vehicleModel || booking.bookingData?.vehicleType || 'Vehicle',
    vehicleCode: booking.vehicleCode || booking.bookingData?.vehicleCategory || 'SUV',
    provider: booking.provider || booking.bookingData?.provider || 'Rental Company',
    pickupLocation: booking.pickupLocation || booking.bookingData?.pickupLocation || booking.bookingData?.pickupLocationCode || 'Airport',
    dropoffLocation: booking.dropoffLocation || booking.bookingData?.dropoffLocation || booking.bookingData?.dropoffLocationCode || 'Airport',
    pickupDateTime: booking.pickupDateTime || booking.bookingData?.pickupDateTime || booking.date,
    dropoffDateTime: booking.dropoffDateTime || booking.bookingData?.dropoffDateTime,
    transmission: booking.transmission || booking.bookingData?.transmission || 'Automatic',
    seats: booking.seats || booking.bookingData?.seats || 5,
    price: booking.displayPrice || booking.price || formatPrice(booking.totalAmount, booking.currency),
    currency: booking.currency || 'GBP',
    cancellationPolicy: booking.cancellationPolicy || booking.bookingData?.cancellationPolicy || 'Free cancellation up to 48 hours before pickup',
    image: booking.image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2',
  };

  // Parse price to number
  const parsePrice = (priceStr: string): number => {
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const currencySymbol = carData.currency === 'GBP' ? '£' : 
                        carData.currency === 'USD' ? '$' : 
                        carData.currency === 'EUR' ? '€' : '£';
  
  const originalPrice = parsePrice(carData.price);
  const cancellationFee = 25; // Cars often have a cancellation fee
  const totalRefund = originalPrice - cancellationFee;

  if (isCancelled) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-[32px] shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Car Rental Cancelled</h1>
          <p className="text-gray-500 font-medium">
            Your {carData.vehicle} rental has been cancelled. 
            Refund of {currencySymbol}{totalRefund.toFixed(2)} will be processed within 3-5 business days.
          </p>
          <button onClick={handleBack} className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl shadow-lg">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#33a8da] transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profile
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Section */}
          <div className="p-8 md:p-10 border-b border-gray-50">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 10c.46.1.85.38 1.08.81.22.43.27.93.16 1.4l-1 4A2 2 0 0117.31 17H6.7a2 2 0 01-1.95-2.79l1-4A2 2 0 017.7 10H19zM6 6h12v2H6V6z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Cancel Car Rental</h1>
                <p className="text-sm text-gray-500">Booking #{carData.bookingReference}</p>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3 border border-amber-100">
              <div className="text-amber-600 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.516-2.625L8.485 2.495zM10 5a1 1 0 011 1v3a1 1 0 11-2 0V6a1 1 0 011-1zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {carData.cancellationPolicy}. A cancellation fee of {currencySymbol}{cancellationFee} may apply.
              </p>
            </div>
          </div>

          {/* Car Details */}
          <div className="p-8 md:p-10 space-y-8">
            {/* Car Image and Info */}
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-64 h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center p-6">
                <img 
                  src={carData.image} 
                  alt={carData.vehicle}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-900 mb-2">{carData.vehicle}</h2>
                <p className="text-sm text-gray-600 mb-2">{carData.provider}</p>
                <p className="text-sm text-gray-500">{carData.vehicleCode}</p>
              </div>
            </div>

            {/* Rental Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 rounded-2xl p-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pick-up</p>
                <p className="text-base font-black text-gray-900">{carData.pickupLocation}</p>
                <p className="text-xs text-gray-600 mt-1">{formatDateTime(carData.pickupDateTime)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Drop-off</p>
                <p className="text-base font-black text-gray-900">{carData.dropoffLocation}</p>
                <p className="text-xs text-gray-600 mt-1">{formatDateTime(carData.dropoffDateTime)}</p>
              </div>
            </div>

            {/* Vehicle Specs */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-lg font-black text-gray-900 mb-4">Vehicle Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Transmission</p>
                  <p className="text-sm font-black text-gray-900">{carData.transmission}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Seats</p>
                  <p className="text-sm font-black text-gray-900">{carData.seats}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Refund Summary */}
          <div className="bg-gray-50 p-8 md:p-10 border-t border-gray-100">
            <h3 className="text-xl font-black text-gray-900 mb-6">Refund Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rental Cost</span>
                <span className="text-lg font-black text-gray-900">{currencySymbol}{originalPrice.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-red-500">
                <span className="text-sm font-bold">Cancellation Fee</span>
                <span className="text-lg font-black">- {currencySymbol}{cancellationFee.toFixed(2)}</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xl font-black text-gray-900">Total Refund</span>
                <span className="text-2xl font-black text-[#33a8da]">
                  {currencySymbol}{totalRefund.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Refund will be processed to your original payment method within 3-5 business days.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="p-8 md:p-10 border-t border-gray-100 flex flex-col md:flex-row items-center justify-end gap-4">
            <button 
              onClick={handleBack}
              className="px-8 py-4 border-2 border-gray-200 text-gray-700 font-black rounded-xl hover:bg-gray-50 transition"
            >
              Keep Rental
            </button>
            <button 
              onClick={handleConfirmCancellation}
              disabled={isCancelling}
              className="px-8 py-4 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition shadow-lg disabled:opacity-50 flex items-center gap-2"
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
                'Confirm Cancellation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}