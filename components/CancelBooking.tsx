'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCancelBooking } from '@/hooks/useCancelBooking';
import { Booking } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

interface CancelBookingProps {
  booking: Booking;
  onBack: () => void;
  onCancelSuccess?: () => void;
}

const CancelBooking: React.FC<CancelBookingProps> = ({ 
  booking, 
  onBack, 
  onCancelSuccess 
}) => {
  const router = useRouter();
  const { cancelBooking, isCancelling } = useCancelBooking();
  const [isCancelled, setIsCancelled] = useState(false);
  const [cancelResult, setCancelResult] = useState<any>(null);

  // Extract booking details
  const isWakanow = booking.provider === 'WAKANOW';
  const pnrNumber = booking.bookingData?.pnrReferenceNumber || 
                    booking.bookingData?.pnrNumber || 
                    booking.pnrNumber || 
                    'N/A';

  // Flight details
  const origin = booking.bookingData?.origin || 'N/A';
  const destination = booking.bookingData?.destination || 'N/A';
  const airline = booking.bookingData?.airline || 'N/A';
  const flightNumber = booking.bookingData?.flightNumber || 'N/A';
  const departureDate = booking.bookingData?.departureDate || booking.createdAt;

  // Hotel details
  const hotelName = booking.bookingData?.hotelName || 'N/A';
  const checkInDate = booking.bookingData?.checkInDate;
  const checkOutDate = booking.bookingData?.checkOutDate;

  // Car rental details
  const vehicleType = booking.bookingData?.vehicleType || 'N/A';
  const pickupDateTime = booking.bookingData?.pickupDateTime;
  const dropoffDateTime = booking.bookingData?.dropoffDateTime;

  const getProductTypeLabel = () => {
    if (booking.productType?.includes('FLIGHT')) return 'Flight';
    if (booking.productType === 'HOTEL') return 'Hotel';
    if (booking.productType === 'CAR_RENTAL') return 'Car Rental';
    return booking.productType || 'Booking';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      FAILED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      PAYMENT_PENDING: 'Payment Pending',
      CONFIRMED: 'Confirmed',
      CANCELLED: 'Cancelled',
      FAILED: 'Failed',
      COMPLETED: 'Completed',
    };
    return labels[status] || status;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleConfirmCancellation = async () => {
    try {
      const result = await cancelBooking(booking.id);
      setCancelResult(result);
      setIsCancelled(true);
      toast.success(result.message || 'Booking cancelled successfully');
      if (onCancelSuccess) {
        onCancelSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel booking');
    }
  };

  // Extract the origin and destination codes for display
  const getCode = (str: string) => {
    if (!str) return '---';
    const match = str.match(/\((.*?)\)/);
    return match ? match[1] : str.substring(0, 3).toUpperCase();
  };

  const originCode = getCode(origin);
  const destCode = getCode(destination);
  const originCity = origin.split('(')[0].trim() || origin;
  const destCity = destination.split('(')[0].trim() || destination;

  if (isCancelled) {
    return (
      <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-[32px] shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Cancellation Confirmed</h1>
          <p className="text-gray-500 font-medium">
            {cancelResult?.message || 'Your booking has been cancelled successfully.'}
            {cancelResult?.refundEligible && (
              <span className="block mt-2 text-sm text-green-600">
                Refund of {formatPrice(cancelResult.refundAmount, cancelResult.currency)} will be processed.
              </span>
            )}
          </p>
          <button 
            onClick={onBack} 
            className="w-full bg-[#33a8da] text-white font-black py-4 rounded-xl shadow-lg hover:bg-[#2c98c7] transition"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col items-center justify-center p-4 py-12">
      <div className="w-full max-w-3xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-red-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Cancel Booking</h1>
          </div>
          <p className="text-gray-400 font-medium text-lg max-w-xl leading-relaxed">
            You are about to cancel <span className="text-[#33a8da] font-black">#{booking.reference}</span>. 
            Please review the details below carefully. This action cannot be undone.
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="bg-[#f0f9ff] text-[#33a8da] text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full border border-blue-50">
                  {getProductTypeLabel()}
                </span>
                <span className="text-gray-300 font-bold text-xs uppercase tracking-tight">
                  {formatDate(booking.createdAt)}
                </span>
              </div>
              <div className={`text-xs font-black px-3 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                {getStatusLabel(booking.status)}
              </div>
            </div>

            {/* Flight Details */}
            {booking.productType?.includes('FLIGHT') && (
              <>
                <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
                  <div className="relative h-2 bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-400 rounded-full mb-10">
                    <div className="absolute left-0 -top-3 flex flex-col items-center">
                      <div className="w-6 h-6 bg-[#33a8da] rounded-full border-4 border-white shadow-lg"></div>
                      <div className="mt-2 text-xs font-black text-gray-900">{originCode}</div>
                      <div className="text-xs font-bold text-gray-500">{originCity}</div>
                    </div>
                    
                    <div className="absolute right-0 -top-3 flex flex-col items-center">
                      <div className="w-6 h-6 bg-indigo-500 rounded-full border-4 border-white shadow-lg"></div>
                      <div className="mt-2 text-xs font-black text-gray-900">{destCode}</div>
                      <div className="text-xs font-bold text-gray-500">{destCity}</div>
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
                      <div className="text-2xl font-black text-gray-900">{originCode}</div>
                      <div className="text-xs font-bold text-gray-500">Departure</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-black text-gray-900">→</div>
                      <div className="text-xs font-bold text-gray-500 mt-1">{airline}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-gray-900">{destCode}</div>
                      <div className="text-xs font-bold text-gray-500">Arrival</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-2">{airline} Flight</h3>
                    <p className="text-sm font-bold text-gray-500">
                      {airline} • Flight #{flightNumber} • {isWakanow ? 'Wakanow' : 'Duffel'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Departure</p>
                      <p className="text-sm font-black text-gray-900">{formatDateTime(departureDate)}</p>
                      <p className="text-xs font-bold text-gray-500">{origin}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Arrival</p>
                      <p className="text-sm font-black text-gray-900">{formatDateTime(departureDate)}</p>
                      <p className="text-xs font-bold text-gray-500">{destination}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Hotel Details */}
            {booking.productType === 'HOTEL' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{hotelName}</h3>
                  <p className="text-sm font-bold text-gray-500">Hotel Booking</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Check-in</p>
                    <p className="text-sm font-black text-gray-900">{formatDate(checkInDate)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Check-out</p>
                    <p className="text-sm font-black text-gray-900">{formatDate(checkOutDate)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Car Rental Details */}
            {booking.productType === 'CAR_RENTAL' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{vehicleType}</h3>
                  <p className="text-sm font-bold text-gray-500">Car Rental</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pickup</p>
                    <p className="text-sm font-black text-gray-900">{formatDateTime(pickupDateTime)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dropoff</p>
                    <p className="text-sm font-black text-gray-900">{formatDateTime(dropoffDateTime)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Common Booking Info */}
            <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking Reference</p>
                <p className="text-sm font-black text-[#33a8da]">#{booking.reference}</p>
              </div>
              {pnrNumber !== 'N/A' && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">PNR Number</p>
                  <p className="text-sm font-black text-gray-900">{pnrNumber}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Refund Summary Card */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-10 space-y-8">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Refund Summary</h3>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Original Price</span>
                <span className="text-lg font-black text-[#33a8da] tracking-tight">
                  {formatPrice(booking.totalAmount, booking.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Cancellation Fee</span>
                <span className="text-lg font-black text-red-500 tracking-tight">- N0.00</span>
              </div>
              
              <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
                <span className="text-2xl font-black text-gray-900 tracking-tighter">Total Refund</span>
                <span className="text-2xl font-black text-[#33a8da] tracking-tighter">
                  {formatPrice(booking.totalAmount, booking.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Refund Footer Banner */}
          <div className="bg-[#f7f9fa] p-6 border-t border-gray-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <p className="text-sm font-black text-gray-900 tracking-tight leading-none">
              {isWakanow && booking.paymentStatus === 'COMPLETED' ? (
                <>
                  Refund will be processed within <span className="text-blue-600">7-10 business days</span>.
                  {booking.status === 'CONFIRMED' && ' Ticket cancellation may take additional time.'}
                </>
              ) : (
                <>
                  Refund will be processed to your <span className="text-blue-600">original payment method</span> within 3-5 business days.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-10 pt-4">
          <button 
            onClick={onBack}
            className="text-sm font-black text-[#33a8da] uppercase tracking-widest hover:underline"
          >
            Return to Profile
          </button>
          
          <button 
            onClick={handleConfirmCancellation}
            disabled={isCancelling}
            className="flex items-center gap-3 px-10 py-5 bg-[#e11d48] text-white rounded-2xl font-black text-lg shadow-2xl shadow-red-200 hover:bg-[#be123c] transition transform active:scale-95 disabled:opacity-50"
          >
            {isCancelling ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <div className="bg-white/20 rounded-full p-1 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBooking;