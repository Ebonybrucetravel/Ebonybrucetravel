'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getStoredAuthToken } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Booking } from '@/lib/types';
function normalizeBooking(data: any): Booking | null {
    const raw = data?.data?.booking ?? data?.booking ?? data?.data ?? data;
    if (!raw?.id)
        return null;
    return {
        id: raw.id,
        reference: raw.reference ?? '',
        status: raw.status ?? 'CONFIRMED',
        paymentStatus: raw.paymentStatus ?? 'COMPLETED',
        productType: raw.productType ?? 'HOTEL',
        provider: raw.provider ?? '',
        basePrice: raw.basePrice ?? 0,
        totalAmount: raw.totalAmount ?? raw.finalAmount ?? 0,
        currency: raw.currency ?? 'GBP',
        bookingData: raw.bookingData ?? {},
        passengerInfo: raw.passengerInfo ?? { firstName: '', lastName: '', email: '', phone: '' },
        createdAt: raw.createdAt ?? new Date().toISOString(),
    };
}
export default function BookingSuccessPage() {
    const router = useRouter();
    const params = useSearchParams();
    const bookingId = params.get('id');
    const bookingRef = params.get('ref');
    const email = params.get('email');
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (!bookingId && !bookingRef) {
            setLoading(false);
            return;
        }
        const fetchBooking = async () => {
            setError(null);
            try {
                const hasToken = typeof window !== 'undefined' && !!getStoredAuthToken();
                if (bookingRef) {
                    const data = await api.bookingApi.getPublicBookingByReference(bookingRef);
                    setBooking(normalizeBooking(data));
                    return;
                }
                if (bookingId && hasToken) {
                    const data = await api.bookingApi.getBookingById(bookingId);
                    setBooking(normalizeBooking(data));
                    return;
                }
                if (bookingId && email && bookingRef) {
                    const data = await api.bookingApi.getPublicBookingById(bookingId, bookingRef, email);
                    setBooking(normalizeBooking(data));
                    return;
                }
                if (bookingId && !hasToken) {
                    setError('Add your booking reference and email to the link to view this booking, or sign in to see your bookings.');
                }
            }
            catch (e: any) {
                setBooking(null);
                setError(e?.message ?? 'Could not load booking details.');
            }
            finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [bookingId, bookingRef, email]);
    if (loading) {
        return (<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <svg className="animate-spin h-10 w-10 text-[#33a8da]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-sm font-medium text-gray-500">Loading your booking…</p>
      </div>);
    }
    if (!bookingId && !bookingRef) {
        return (<div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No booking specified</h1>
        <p className="text-gray-600 mb-6">Use the link from your confirmation email or open your bookings from your profile.</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">Back to home</button>
      </div>);
    }
    if (error || !booking) {
        return (<div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Could not load booking</h1>
        <p className="text-gray-600 mb-6">{error ?? 'Booking not found or link expired.'}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">Back to home</button>
          <button onClick={() => router.push('/profile?tab=bookings')} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 border border-gray-300">My bookings</button>
        </div>
      </div>);
    }
    const isGuest = typeof window !== 'undefined' && !getStoredAuthToken();
    return (<div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking confirmed</h1>
      <p className="text-gray-600 mb-8">
        {isGuest
            ? 'Your booking has been confirmed. A confirmation email has been sent to the address you provided. Keep your reference for any changes or support.'
            : 'Your booking has been successfully processed. A confirmation email has been sent.'}
      </p>

      <div className="bg-white rounded-xl shadow p-6 text-left space-y-4 mb-8 border border-gray-100">
        <Detail label="Booking reference" value={booking.reference || bookingRef || '—'} highlight/>
        <Detail label="Status" value={booking.status || 'CONFIRMED'} badge="green"/>
        <Detail label="Payment" value={booking.paymentStatus || 'COMPLETED'} badge="green"/>
        {booking.totalAmount != null && <Detail label="Amount paid" value={formatPrice(booking.totalAmount, booking.currency)}/>}
        {booking.productType && <Detail label="Service" value={booking.productType.replace(/_/g, ' ')}/>}
        {booking.createdAt && <Detail label="Booked on" value={new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}/>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {!isGuest && (<button onClick={() => router.push('/profile?tab=bookings')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
            View my bookings
          </button>)}
        <button onClick={() => router.push('/search')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
          {isGuest ? 'Book again' : 'Search again'}
        </button>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 border border-gray-300">
          Back to home
        </button>
      </div>
    </div>);
}
function Detail({ label, value, highlight, badge }: {
    label: string;
    value: string;
    highlight?: boolean;
    badge?: string;
}) {
    return (<div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (<span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${badge === 'green' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{value}</span>) : (<span className={`font-medium ${highlight ? 'text-lg text-[#33a8da]' : 'text-gray-900'}`}>{value}</span>)}
    </div>);
}
