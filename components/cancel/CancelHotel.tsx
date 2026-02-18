'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Unwrap params FIRST - this is the key fix
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setBookingId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  // Now use bookingId instead of params.id directly
  useEffect(() => {
    if (!bookingId) return;

    // Load booking data from storage
    const loadBooking = () => {
      try {
        console.log('🔍 Loading booking with ID:', bookingId);
        
        // FIRST: Try to get from currentCancellingBooking (set by modal)
        const currentCancelling = localStorage.getItem('currentCancellingBooking');
        if (currentCancelling) {
          try {
            const parsed = JSON.parse(currentCancelling);
            if (parsed.id === bookingId) {
              console.log('✅ Found booking in currentCancellingBooking');
              setBooking(parsed);
              setIsLoading(false);
              // DON'T remove it yet - might need it for refresh
              // We'll keep it until cancellation is complete
              return;
            }
          } catch (e) {
            console.warn('Failed to parse currentCancellingBooking', e);
          }
        }

        // SECOND: Try to get from specific cancellation key
        const specificCancelling = localStorage.getItem(`cancelling_${bookingId}`);
        if (specificCancelling) {
          try {
            const parsed = JSON.parse(specificCancelling);
            console.log('✅ Found booking in cancelling_' + bookingId);
            setBooking(parsed);
            setIsLoading(false);
            // DON'T remove it yet
            return;
          } catch (e) {
            console.warn('Failed to parse cancelling_' + bookingId, e);
          }
        }

        // THIRD: Try to get from individual booking
        const saved = localStorage.getItem(`booking_${bookingId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            console.log('✅ Found booking in booking_' + bookingId);
            setBooking(parsed);
            setIsLoading(false);
            return;
          } catch (e) {
            console.warn('Failed to parse booking_' + bookingId, e);
          }
        }
        
        // FOURTH: Try from userBookings
        const userBookings = localStorage.getItem('userBookings');
        if (userBookings) {
          try {
            const bookings = JSON.parse(userBookings);
            const found = bookings.find((b: any) => b.id === bookingId);
            if (found) {
              console.log('✅ Found booking in userBookings');
              setBooking(found);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse userBookings', e);
          }
        }
        
        // FIFTH: Try from recentBookings
        const recentBookings = localStorage.getItem('recentBookings');
        if (recentBookings) {
          try {
            const bookings = JSON.parse(recentBookings);
            const found = bookings.find((b: any) => b.id === bookingId);
            if (found) {
              console.log('✅ Found booking in recentBookings');
              setBooking(found);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('Failed to parse recentBookings', e);
          }
        }
        
        // Not found
        console.log('❌ Booking not found in any storage location');
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
    
    // Simulate API call
    setTimeout(() => {
      // Update booking status
      const updatedBooking = { ...booking, status: 'CANCELLED' };
      
      // Save updated booking to localStorage
      localStorage.setItem(`booking_${bookingId}`, JSON.stringify(updatedBooking));
      
      // Update in userBookings if present
      const userBookings = localStorage.getItem('userBookings');
      if (userBookings) {
        try {
          const bookings = JSON.parse(userBookings);
          const updated = bookings.map((b: any) => 
            b.id === bookingId ? updatedBooking : b
          );
          localStorage.setItem('userBookings', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to update userBookings', e);
        }
      }
      
      // Update in recentBookings if present
      const recentBookings = localStorage.getItem('recentBookings');
      if (recentBookings) {
        try {
          const bookings = JSON.parse(recentBookings);
          const updated = bookings.map((b: any) => 
            b.id === bookingId ? updatedBooking : b
          );
          localStorage.setItem('recentBookings', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to update recentBookings', e);
        }
      }
      
      // NOW we can clean up the temporary cancellation keys
      localStorage.removeItem('currentCancellingBooking');
      localStorage.removeItem(`cancelling_${bookingId}`);
      
      setIsCancelling(false);
      setIsCancelled(true);
    }, 2000);
  };

  // Helper function to safely extract guest count
  const getGuestCount = () => {
    if (!booking) return 2;
    
    // Try to get from booking.guests first
    if (booking?.guests) {
      if (typeof booking.guests === 'number') {
        return booking.guests;
      }
      if (typeof booking.guests === 'object') {
        if (booking.guests.adults) return booking.guests.adults;
        if (booking.guests.total) return booking.guests.total;
        if (booking.guests.count) return booking.guests.count;
      }
    }
    
    // Try to get from bookingData
    if (booking?.bookingData?.guests) {
      if (typeof booking.bookingData.guests === 'number') {
        return booking.bookingData.guests;
      }
      if (typeof booking.bookingData.guests === 'object') {
        if (booking.bookingData.guests.adults) return booking.bookingData.guests.adults;
        if (booking.bookingData.guests.total) return booking.bookingData.guests.total;
        if (booking.bookingData.guests.count) return booking.bookingData.guests.count;
      }
    }
    
    return 2;
  };

  // Helper function to safely extract room count
  const getRoomCount = () => {
    if (!booking) return 1;
    
    if (booking?.rooms) {
      if (typeof booking.rooms === 'number') return booking.rooms;
      if (typeof booking.rooms === 'object') {
        if (booking.rooms.count) return booking.rooms.count;
        if (booking.rooms.total) return booking.rooms.total;
      }
    }
    if (booking?.bookingData?.rooms) {
      if (typeof booking.bookingData.rooms === 'number') return booking.bookingData.rooms;
      if (typeof booking.bookingData.rooms === 'object') {
        if (booking.bookingData.rooms.count) return booking.bookingData.rooms.count;
        if (booking.bookingData.rooms.total) return booking.bookingData.rooms.total;
      }
    }
    return 1;
  };

  // Helper function to safely extract price
  const getPrice = () => {
    if (!booking) return 'N/A';
    
    if (booking?.displayPrice) return booking.displayPrice;
    if (booking?.price) return booking.price;
    if (booking?.totalAmount) {
      const symbols: Record<string, string> = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'NGN': '₦' };
      const symbol = symbols[booking.currency || 'GBP'] || '£';
      return `${symbol}${booking.totalAmount.toFixed(2)}`;
    }
    if (booking?.bookingData?.price) {
      const symbols: Record<string, string> = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'NGN': '₦' };
      const symbol = symbols[booking.bookingData.currency || 'GBP'] || '£';
      return `${symbol}${booking.bookingData.price.toFixed(2)}`;
    }
    return 'N/A';
  };

  // Format date
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'Date TBD';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Parse price for calculations
  const parsePrice = (priceStr: string): number => {
    const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
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
          <p className="text-gray-500 mb-6">The hotel booking you're trying to cancel doesn't exist.</p>
          <button onClick={handleBack} className="bg-[#33a8da] text-white font-black px-6 py-3 rounded-xl">
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const guestCount = getGuestCount();
  const roomCount = getRoomCount();
  const price = getPrice();

  // Extract hotel data with better fallbacks
  const hotelData = {
    name: booking?.title || 
          booking?.name || 
          booking?.bookingData?.hotelName || 
          booking?.hotelName || 
          'Hotel',
    location: booking?.location || 
              booking?.subtitle || 
              booking?.bookingData?.location || 
              booking?.city || 
              'City Center',
    checkIn: formatDisplayDate(booking?.checkIn || booking?.bookingData?.checkInDate),
    checkOut: formatDisplayDate(booking?.checkOut || booking?.bookingData?.checkOutDate),
    rooms: roomCount,
    guests: guestCount,
    price: price,
    bookingReference: booking?.reference || 
                     booking?.id?.slice(-8) || 
                     'HOT-8824',
    cancellationDeadline: booking?.cancellationDeadline || 
                         booking?.bookingData?.cancellationDeadline || 
                         '24 hours before check-in',
  };

  const originalPrice = parsePrice(hotelData.price);
  const cancellationFee = 0; // Hotels often have free cancellation
  const totalRefund = originalPrice - cancellationFee;
  const currencySymbol = hotelData.price.match(/[£$€₦]/)?.[0] || '£';

  if (isCancelled) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center bg-white p-12 rounded-[32px] shadow-sm">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-4">Hotel Cancelled</h1>
          <p className="text-gray-500 mb-6">
            Your booking at {hotelData.name} has been cancelled. 
            Refund of {currencySymbol}{totalRefund.toFixed(2)} will be processed within 5-7 business days.
          </p>
          <button onClick={handleBack} className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl hover:bg-[#2c98c7] transition">
            Back to Bookings
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
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Cancel Hotel</h1>
          </div>
          <p className="text-gray-400 font-medium text-lg">
            You are about to cancel booking <span className="text-[#33a8da] font-black">#{hotelData.bookingReference}</span>
          </p>
        </div>

        {/* Hotel Details */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10">
            <div className="flex items-center justify-between mb-6">
              <span className="bg-orange-50 text-orange-600 text-[11px] font-black px-4 py-1 rounded-full">
                Hotel
              </span>
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-2">{hotelData.name}</h2>
            <p className="text-gray-500 mb-6">{hotelData.location}</p>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Check-in</p>
                <p className="text-sm font-black text-gray-900">{hotelData.checkIn}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Check-out</p>
                <p className="text-sm font-black text-gray-900">{hotelData.checkOut}</p>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-black">{hotelData.rooms} room{hotelData.rooms > 1 ? 's' : ''}</span> • 
                <span className="font-black"> {hotelData.guests} guest{hotelData.guests > 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Refund Summary */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10">
            <h3 className="text-xl font-black text-gray-900 mb-6">Refund Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Room Cost</span>
                <span className="font-black">{currencySymbol}{originalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Cancellation Fee</span>
                <span className="font-black">{currencySymbol}{cancellationFee.toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between text-lg font-black">
                <span>Total Refund</span>
                <span className="text-[#33a8da]">{currencySymbol}{totalRefund.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Free cancellation up to {hotelData.cancellationDeadline}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-10">
          <button 
            onClick={handleBack} 
            className="text-sm font-black text-[#33a8da] uppercase tracking-widest hover:underline"
          >
            Keep Booking
          </button>
          <button 
            onClick={handleConfirmCancellation} 
            disabled={isCancelling}
            className="px-10 py-5 bg-red-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-red-200 hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
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
              'Cancel Hotel'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}