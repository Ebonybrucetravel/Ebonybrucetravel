'use client';

import React, { useEffect, useState } from 'react';
import { getBookingDisputeEvidence } from '@/lib/adminApi';

interface AdminBookingDetailsProps {
  bookingId: string;
  booking?: any;
  onBack: () => void;
}

export default function AdminBookingDetails({ bookingId, booking, onBack }: AdminBookingDetailsProps) {
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getBookingDisputeEvidence(bookingId);
        if (!cancelled) setDispute(res.data ?? res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  const formatDate = (s: string) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleString('en-GB');
    } catch {
      return s;
    }
  };

  const d = dispute || booking;

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-sm mb-10 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path d="M15 19l-7-7 7-7" />
        </svg>
        Back to Bookings
      </button>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl p-8 text-center">
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] p-8 lg:p-12 shadow-sm border border-gray-100 space-y-8">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
            Booking {d?.reference || bookingId}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Reference</p>
              <p className="text-lg font-bold text-gray-900">{d?.reference || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
              <p className="text-lg font-bold text-gray-900">{d?.status || booking?.status || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Guest</p>
              <p className="text-sm font-bold text-gray-900">{d?.guestName || d?.user?.name || booking?.user?.name || '—'}</p>
              <p className="text-xs text-gray-500">{d?.guestEmail || d?.user?.email || booking?.user?.email || ''}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Amount</p>
              <p className="text-lg font-bold text-[#33a8da]">
                {d?.currency || booking?.currency} {Number(d?.amount ?? d?.totalAmount ?? booking?.totalAmount)?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Booking timestamp</p>
              <p className="text-sm text-gray-600">{formatDate(d?.bookingTimestampUtc || d?.createdAt || booking?.createdAt)}</p>
            </div>
            {d?.stripeChargeId && (
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Stripe Charge</p>
                <p className="text-xs font-mono text-gray-600 break-all">{d.stripeChargeId}</p>
              </div>
            )}
          </div>

          {d?.cancellationPolicySnapshot && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Cancellation policy snapshot</p>
              <pre className="p-4 bg-gray-50 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap">
                {d.cancellationPolicySnapshot}
              </pre>
            </div>
          )}

          <p className="text-xs text-gray-400">
            This view shows dispute evidence data. Use it when handling chargebacks or customer support inquiries.
          </p>
        </div>
      )}
    </div>
  );
}
