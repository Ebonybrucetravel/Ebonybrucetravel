'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export default function BookingSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get('id');
  const bookingRef = params.get('ref');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId && !bookingRef) {
      setLoading(false);
      setError('No booking information provided');
      return;
    }

    const fetchBooking = async () => {
      try {
        let data;
        if (bookingId) {
          try {
            data = await api.bookingApi.getBookingById(bookingId);
          } catch (err) {
            console.log('Failed to fetch by ID, trying reference...');
          }
        }
        
        if (!data && bookingRef) {
          data = await api.bookingApi.getPublicBookingByReference(bookingRef);
        }
        
        const bookingData = data?.data ?? data ?? null;
        setBooking(bookingData);
        
        // Log the actual status for debugging
        console.log('Booking status from API:', bookingData?.status);
        
      } catch (err) {
        console.error('Failed to fetch booking:', err);
        setError('Unable to load booking details');
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooking();
  }, [bookingId, bookingRef]);

  // Function to determine badge color based on status
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      'CONFIRMED': 'green',
      'PENDING': 'yellow',
      'FAILED': 'red',
      'CANCELLED': 'gray',
      'REFUNDED': 'purple'
    };
    return statusMap[status] || 'gray';
  };

  // Function to format status for display
  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-10 w-10 text-[#33a8da]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
        <p className="text-gray-600 mb-8">{error || 'Unable to find your booking details.'}</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
          Back to Home
        </button>
      </div>
    );
  }

  // Determine what to show based on actual status
  const isConfirmed = booking.status === 'CONFIRMED';
  const isPending = booking.status === 'PENDING';
  const isFailed = booking.status === 'FAILED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      {/* Status-specific header */}
      <div className="text-center mb-8">
        {isConfirmed && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your booking has been successfully confirmed. A confirmation email has been sent.</p>
          </>
        )}

        {isPending && (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Processing</h1>
            <p className="text-gray-600">Your payment was successful, but we're still waiting for confirmation from the provider. We'll notify you once confirmed.</p>
          </>
        )}

        {isFailed && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Failed</h1>
            <p className="text-gray-600 mb-4">We couldn't confirm your booking with the provider. A refund has been initiated.</p>
          </>
        )}
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl shadow p-6 text-left space-y-4 mb-8 border border-gray-100">
        <Detail label="Booking Reference" value={booking.reference} highlight />
        
        {/* Show actual status with appropriate badge */}
        <Detail 
          label="Status" 
          value={formatStatus(booking.status)} 
          badge={getStatusBadge(booking.status)} 
        />
        
        <Detail 
          label="Payment" 
          value={booking.paymentStatus?.replace(/_/g, ' ') || 'COMPLETED'} 
          badge={booking.paymentStatus === 'COMPLETED' ? 'green' : 'yellow'} 
        />
        
        {booking.totalAmount && (
          <Detail 
            label="Amount Paid" 
            value={formatPrice(booking.totalAmount, booking.currency)} 
          />
        )}
        
        {booking.productType && (
          <Detail 
            label="Service" 
            value={booking.productType.replace(/_/g, ' ')} 
          />
        )}
        
        {booking.createdAt && (
          <Detail 
            label="Booked On" 
            value={new Date(booking.createdAt).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })} 
          />
        )}

        {/* Show provider booking ID if available */}
        {booking.providerBookingId && (
          <Detail 
            label="Provider Reference" 
            value={booking.providerBookingId} 
          />
        )}
      </div>

      {/* Status-specific messages */}
      {isPending && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-sm text-blue-800">
          <p className="font-medium mb-1">What happens next?</p>
          <p>We're confirming your booking with the airline. This usually takes 1-2 minutes. You'll receive an email once confirmed, or you can refresh this page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Refresh Status
          </button>
        </div>
      )}

      {isFailed && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-8 text-sm text-red-800">
          <p className="font-medium mb-1">Refund Information</p>
          <p>A full refund of {formatPrice(booking.totalAmount, booking.currency)} has been initiated. It may take 5-10 business days to appear in your account.</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={() => router.push('/profile?tab=bookings')} 
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
        >
          View My Bookings
        </button>
        <button 
          onClick={() => router.push('/')} 
          className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 border border-gray-300"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value, highlight, badge }: { label: string; value: string; highlight?: boolean; badge?: string }) {
  const badgeColors = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (
        <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${badgeColors[badge as keyof typeof badgeColors] || badgeColors.gray}`}>
          {value}
        </span>
      ) : (
        <span className={`font-medium ${highlight ? 'text-lg text-[#33a8da]' : 'text-gray-900'}`}>{value}</span>
      )}
    </div>
  );
}