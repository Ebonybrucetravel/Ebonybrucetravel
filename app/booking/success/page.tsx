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

  useEffect(() => {
    if (!bookingId && !bookingRef) return setLoading(false);

    const fetchBooking = async () => {
      try {
        if (bookingId) {
          try {
            const data = await api.bookingApi.getBookingById(bookingId);
            setBooking(data?.data ?? data ?? null);
            return;
          } catch {}
        }
        if (bookingRef) {
          const data = await api.bookingApi.getPublicBookingByReference(bookingRef);
          setBooking(data?.data ?? data ?? null);
        }
      } catch {
        setBooking(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId, bookingRef]);

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
      <p className="text-gray-600 mb-8">Your booking has been successfully processed. A confirmation email has been sent.</p>

      {/* Details card */}
      <div className="bg-white rounded-xl shadow p-6 text-left space-y-4 mb-8 border border-gray-100">
        <Detail label="Booking Reference" value={booking?.reference ?? bookingRef ?? '—'} highlight />
        <Detail label="Status" value={booking?.status ?? 'CONFIRMED'} badge="green" />
        <Detail label="Payment" value={booking?.paymentStatus ?? 'COMPLETED'} badge="green" />
        {booking?.totalAmount && <Detail label="Amount Paid" value={formatPrice(booking.totalAmount, booking.currency)} />}
        {booking?.productType && <Detail label="Service" value={booking.productType.replace(/_/g, ' ')} />}
        {booking?.createdAt && <Detail label="Booked On" value={new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button onClick={() => router.push('/profile?tab=bookings')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
          View My Bookings
        </button>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 border border-gray-300">
          Back to Home
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value, highlight, badge }: { label: string; value: string; highlight?: boolean; badge?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (
        <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${badge === 'green' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{value}</span>
      ) : (
        <span className={`font-medium ${highlight ? 'text-lg text-[#33a8da]' : 'text-gray-900'}`}>{value}</span>
      )}
    </div>
  );
}

