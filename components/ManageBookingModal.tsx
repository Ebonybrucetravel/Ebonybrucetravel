'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import type { Booking } from '@/lib/types'; // Import the type from your types file

interface ManageBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancelClick: (booking: Booking) => void;
}

const ManageBookingModal: React.FC<ManageBookingModalProps> = ({ 
  isOpen, 
  onClose, 
  booking,
  onCancelClick
}) => {
  const router = useRouter();

  if (!isOpen || !booking) return null;

  const handleCancelClick = () => {
    onClose();
    
    if (!booking?.id) {
      console.error('Booking ID is missing');
      alert('Unable to cancel: Booking ID is missing');
      return;
    }

    // Map productType to URL path
    const typeMap: Record<string, string> = {
      'FLIGHT_INTERNATIONAL': 'flight',
      'FLIGHT_DOMESTIC': 'flight',
      'HOTEL': 'hotel',
      'CAR_RENTAL': 'car'
    };
    
    const productType = booking.productType || 'FLIGHT_INTERNATIONAL';
    const type = typeMap[productType] || 'flight';
    
    // Store the booking data in localStorage BEFORE navigation
    localStorage.setItem(`cancelling_${booking.id}`, JSON.stringify(booking));
    localStorage.setItem('currentCancellingBooking', JSON.stringify(booking));
    
    router.push(`/cancel/${type}/${booking.id}`);
  };

  // Helper function to safely check product type
  const isFlight = () => {
    return booking.productType?.includes('FLIGHT') || false;
  };

  // Get icon based on product type with safe check
  const getBookingIcon = () => {
    const productType = booking.productType;
    
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      );
    }
    
    switch(productType) {
      case 'HOTEL':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 9H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V11a2 2 0 00-2-2zm-6 4h-2v-2h2v2zm6 0h-4v-2h4v2zM5 13h4v2H5v-2z"/>
          </svg>
        );
      case 'CAR_RENTAL':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 10c.46.1.85.38 1.08.81.22.43.27.93.16 1.4l-1 4A2 2 0 0117.31 17H6.7a2 2 0 01-1.95-2.79l1-4A2 2 0 017.7 10H19zM6 6h12v2H6V6z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/>
          </svg>
        );
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const upperStatus = status?.toUpperCase() || '';
    
    switch(upperStatus) {
      case 'CONFIRMED':
        return 'bg-[#e7f6ed] text-[#5cb85c] border-[#d4edda]';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'FAILED':
        return 'bg-red-50 text-red-500 border-red-100';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    if (!amount && amount !== 0) return 'Price unavailable';
    
    const symbols: Record<string, string> = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'NGN': '₦'
    };
    const symbol = symbols[currency] || '£';
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
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

  // Format time
  const formatTime = (dateTime?: string) => {
    if (!dateTime) return '--:--';
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return '--:--';
    }
  };

  // Get booking title based on product type
  const getBookingTitle = () => {
    const productType = booking.productType;
    const bookingData = booking.bookingData || {};
    
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      const origin = bookingData.origin || '???';
      const destination = bookingData.destination || '???';
      return (
        <div className="flex items-center gap-1">
          <span className="font-bold text-lg">{origin}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <span className="font-bold text-lg">{destination}</span>
        </div>
      );
    }
    
    switch(productType) {
      case 'HOTEL':
        return (
          <div className="font-bold text-lg text-gray-900">
            {bookingData.hotelName || 'Hotel Booking'}
          </div>
        );
      case 'CAR_RENTAL':
        return (
          <div className="font-bold text-lg text-gray-900">
            {bookingData.vehicleType || 'Car Rental'}
          </div>
        );
      default:
        return (
          <div className="font-bold text-lg text-gray-900">
            Booking
          </div>
        );
    }
  };

  // Get booking subtitle
  const getBookingSubtitle = () => {
    const productType = booking.productType;
    const bookingData = booking.bookingData || {};
    
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      return (
        <span className="text-xs text-gray-500">
          {bookingData.airline || booking.provider || 'Airline'} 
          {bookingData.flightNumber && ` • ${bookingData.flightNumber}`}
        </span>
      );
    }
    
    switch(productType) {
      case 'HOTEL': {
        // Handle rooms with type guard
        let roomCount = 1;
        if (bookingData.rooms) {
          if (typeof bookingData.rooms === 'object') {
            // Type assertion for the object
            const roomsObj = bookingData.rooms as Record<string, any>;
            roomCount = Number(roomsObj.count) || 
                       Number(roomsObj.total) || 
                       1;
          } else {
            roomCount = Number(bookingData.rooms) || 1;
          }
        }

        return (
          <span className="text-xs text-gray-500">
            {booking.provider} • {roomCount} room{roomCount > 1 ? 's' : ''}
          </span>
        );
      }
      case 'CAR_RENTAL':
        return (
          <span className="text-xs text-gray-500">
            {booking.provider}
          </span>
        );
      default:
        return (
          <span className="text-xs text-gray-500">
            {booking.reference}
          </span>
        );
    }
  };

  // Get main details line
  const getMainDetails = () => {
    const productType = booking.productType;
    const bookingData = booking.bookingData || {};
    
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      // Handle passengers that might be an object
      let passengerCount = 1;
      if (bookingData.passengers) {
        if (typeof bookingData.passengers === 'object') {
          const passengersObj = bookingData.passengers as Record<string, any>;
          passengerCount = (passengersObj.adults || 0) + 
                          (passengersObj.children || 0) + 
                          (passengersObj.infants || 0);
          passengerCount = passengerCount || 1;
        } else {
          passengerCount = Number(bookingData.passengers) || 1;
        }
      }
      
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-gray-900">
              {formatTime(bookingData.departureDate)}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-bold text-gray-600 capitalize">
              {bookingData.cabinClass || 'Economy'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {formatDate(bookingData.departureDate)} • {passengerCount} passenger{passengerCount > 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    
    switch(productType) {
      case 'HOTEL': {
        // Handle guests with type guard
        let guestCount = 1;
        
        if (bookingData.guests) {
          if (typeof bookingData.guests === 'object') {
            const guestsObj = bookingData.guests as Record<string, any>;
            // If it's an object, check for common patterns
            if ('adults' in guestsObj) {
              guestCount = Number(guestsObj.adults) || 1;
            } else if ('total' in guestsObj) {
              guestCount = Number(guestsObj.total) || 1;
            } else if ('count' in guestsObj) {
              guestCount = Number(guestsObj.count) || 1;
            } else {
              guestCount = 1;
            }
          } else {
            guestCount = Number(bookingData.guests) || 1;
          }
        }

        // Handle rooms with type guard
        let roomCount = 1;
        if (bookingData.rooms) {
          if (typeof bookingData.rooms === 'object') {
            const roomsObj = bookingData.rooms as Record<string, any>;
            roomCount = Number(roomsObj.count) || 
                       Number(roomsObj.total) || 
                       1;
          } else {
            roomCount = Number(bookingData.rooms) || 1;
          }
        }

        // Ensure we have numbers
        guestCount = Number(guestCount) || 1;
        roomCount = Number(roomCount) || 1;

        return (
          <div className="space-y-1">
            <p className="text-sm font-black text-gray-900">
              {formatDate(bookingData.checkInDate)} - {formatDate(bookingData.checkOutDate)}
            </p>
            <p className="text-xs text-gray-500">
              {roomCount} room{roomCount > 1 ? 's' : ''} • {guestCount} guest{guestCount > 1 ? 's' : ''}
            </p>
          </div>
        );
      }
      
      case 'CAR_RENTAL':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">Pick-up:</span>
              <span className="text-sm font-black text-gray-900">
                {bookingData.pickupLocationCode || bookingData.pickupLocation || '???'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {formatDate(bookingData.pickupDateTime)} at {formatTime(bookingData.pickupDateTime)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-gray-600">Drop-off:</span>
              <span className="text-sm font-black text-gray-900">
                {bookingData.dropoffLocationCode || bookingData.dropoffLocation || '???'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {formatDate(bookingData.dropoffDateTime)} at {formatTime(bookingData.dropoffDateTime)}
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Get cancellation policy text
  const getCancellationPolicy = () => {
    if (booking.cancellationDeadline) {
      const deadline = new Date(booking.cancellationDeadline);
      const now = new Date();
      const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (hoursLeft > 0) {
        return `Free cancellation available for ${hoursLeft} more hour${hoursLeft > 1 ? 's' : ''}`;
      }
    }
    return booking.cancellationPolicySnapshot || 'Standard cancellation policy applies';
  };

  // Determine if cancel button should be disabled
  const isCancelDisabled = () => {
    const status = booking.status?.toUpperCase();
    return status === 'CANCELLED' || status === 'FAILED' || status === 'COMPLETED';
  };

  // Determine provider text
  const getProviderText = () => {
    const productType = booking.productType;
    return productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC' ? 'airline' : 'provider';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Manage Booking</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Select an action for your booking <span className="text-[#33a8da]">#{booking.reference?.slice(-8) || booking.id?.slice(-8)}</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              Changes may be subject to {getProviderText()} fees and price differences.
            </p>
          </div>

          {/* Booking Summary Card */}
          <div className="bg-[#f7f9fa] rounded-2xl p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#33a8da] shadow-sm shrink-0 border border-gray-100">
                {getBookingIcon()}
              </div>
              
              {/* Booking Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    {getBookingTitle()}
                    <div className="mt-1">
                      {getBookingSubtitle()}
                    </div>
                  </div>
                  <span className={`${getStatusColor(booking.status)} text-[10px] font-bold px-3 py-1 rounded-full border shrink-0 ml-2`}>
                    {booking.status}
                  </span>
                </div>
                
                {/* Main Details */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {getMainDetails()}
                </div>
              </div>
            </div>
          </div>

          {/* Price Info */}
          <div className="flex justify-between items-center px-2">
            <span className="text-sm font-bold text-gray-600">Total Amount</span>
            <span className="text-2xl font-black text-[#33a8da]">
              {formatPrice(booking.totalAmount, booking.currency)}
            </span>
          </div>

          {/* Info Banner - Show cancellation policy if available */}
          {(booking.cancellationDeadline || booking.cancellationPolicySnapshot) && (
            <div className="bg-[#ebf5ff] rounded-xl p-4 flex items-start gap-3 border border-[#cfe2ff]">
              <div className="text-[#33a8da] mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {getCancellationPolicy()}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-end gap-3">
          <button 
            onClick={handleCancelClick}
            className="px-6 py-3 border border-red-500 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isCancelDisabled()}
          >
            {booking.status?.toUpperCase() === 'CANCELLED' ? 'Already Cancelled' : 
             booking.status?.toUpperCase() === 'FAILED' ? 'Booking Failed' : 
             booking.status?.toUpperCase() === 'COMPLETED' ? 'Trip Completed' :
             'Cancel Booking'}
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-xl text-sm hover:bg-[#2c98c7] transition shadow-lg shadow-blue-500/10 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageBookingModal;