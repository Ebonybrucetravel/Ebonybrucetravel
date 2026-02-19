'use client';

import React, { useEffect, useState } from 'react';
import { getDashboardStats, exportBookingsCsv } from '@/lib/adminApi';

interface StatsData {
  period?: { start: string; end: string };
  totalBookings?: number;
  totalRevenue?: number;
  bookingsByStatus?: Record<string, number>;
  bookingsByProductType?: Record<string, { count: number; revenue?: number }>;
  bookingsByProvider?: Record<string, number>;
  paymentStatusBreakdown?: Record<string, number>;
  recentBookings?: Array<{
    id: string;
    reference: string;
    productType: string;
    status: string;
    totalAmount: number;
    currency: string;
    user?: { name: string; email: string };
    createdAt: string;
  }>;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getDefaultRange = () => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    };
  };
  const [dateRange, setDateRange] = useState(getDefaultRange);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const res = await getDashboardStats(params);
      setData(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [dateRange.start, dateRange.end]);

  const handleExport = async () => {
    try {
      await exportBookingsCsv({
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const totalBookings = data?.totalBookings ?? 0;
  const totalRevenue = data?.totalRevenue ?? 0;
  const byProductType = data?.bookingsByProductType ?? {};
  const productKeys = Object.keys(byProductType);
  const totalByProduct = productKeys.reduce((s, k) => s + (byProductType[k]?.count ?? 0), 0);

  const recentBookings = data?.recentBookings ?? [];
  const byStatus = data?.bookingsByStatus ?? {};

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-700 font-bold">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 px-6 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10 bg-[#f8fbfe]">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Global Analytics</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Aggregated performance and booking overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium"
          />
          <button
            type="button"
            onClick={handleExport}
            className="bg-[#33a8da] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#2c98c7] transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Revenue</p>
          <h3 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
            {typeof totalRevenue === 'number'
              ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalRevenue)
              : totalRevenue}
          </h3>
        </div>
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2">Total Bookings</p>
          <h3 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
            {totalBookings.toLocaleString()}
          </h3>
        </div>
        <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status Breakdown</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(byStatus).slice(0, 4).map(([k, v]) => (
              <span key={k} className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Booking by product type */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Booking by Product Type</h3>
            <div className="space-y-4">
              {productKeys.length === 0 ? (
                <p className="text-gray-400 text-sm">No data for this period</p>
              ) : (
                productKeys.map((key, i) => {
                  const item = byProductType[key];
                  const count = item?.count ?? 0;
                  const pct = totalByProduct > 0 ? Math.round((count / totalByProduct) * 100) : 0;
                  const colors = ['bg-[#33a8da]', 'bg-[#2ecc71]', 'bg-[#9b59b6]', 'bg-[#e67e22]'];
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-900">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-black text-gray-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-full rounded-full ${colors[i % colors.length]} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Recent activity */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Bookings</h3>
            </div>
            <div className="space-y-4">
              {recentBookings.length === 0 ? (
                <p className="text-gray-400 text-sm">No recent bookings</p>
              ) : (
                recentBookings.slice(0, 6).map((b) => (
                  <div key={b.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-[#33a8da]/10 flex items-center justify-center text-lg">📅</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{b.reference}</p>
                      <p className="text-xs text-gray-500">
                        {b.user?.name || b.user?.email || '—'} • {b.productType?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs font-bold text-[#33a8da] mt-0.5">
                        {b.currency} {Number(b.totalAmount)?.toLocaleString()} • {b.status}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
