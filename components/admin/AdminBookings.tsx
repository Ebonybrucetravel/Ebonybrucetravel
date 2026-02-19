'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listBookings, exportBookingsCsv } from '@/lib/adminApi';

const STATUS_OPTIONS = ['', 'PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'FAILED'];
const PRODUCT_TYPES = ['', 'FLIGHT_DOMESTIC', 'FLIGHT_INTERNATIONAL', 'HOTEL', 'CAR_RENTAL', 'PACKAGE'];
const PROVIDERS = ['', 'DUFFEL', 'TRIPS_AFRICA', 'BOOKING_COM', 'AMADEUS'];

export default function AdminBookings() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    productType: '',
    provider: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page: filters.page, limit: filters.limit };
      if (filters.status) params.status = filters.status;
      if (filters.productType) params.productType = filters.productType;
      if (filters.provider) params.provider = filters.provider;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await listBookings(params);
      setData(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.page, filters.status, filters.productType, filters.provider, filters.startDate, filters.endDate, filters.limit]);

  const handleExport = async () => {
    try {
      await exportBookingsCsv({
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const formatDate = (s: string) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return s;
    }
  };

  const statusClass = (s: string) => {
    if (s === 'CONFIRMED') return 'bg-[#e7f6ed] text-[#5cb85c] border-[#d4edda]';
    if (s === 'CANCELLED' || s === 'FAILED') return 'bg-red-50 text-red-500 border-red-100';
    if (s === 'PENDING' || s === 'PAYMENT_PENDING') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Bookings</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Global platform activity</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 border border-gray-100 bg-white rounded-xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o || 'all'} value={o}>{o || 'All'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Product</label>
          <select
            value={filters.productType}
            onChange={(e) => setFilters((f) => ({ ...f, productType: e.target.value, page: 1 }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
          >
            {PRODUCT_TYPES.map((o) => (
              <option key={o || 'all'} value={o}>{o ? o.replace(/_/g, ' ') : 'All'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Provider</label>
          <select
            value={filters.provider}
            onChange={(e) => setFilters((f) => ({ ...f, provider: e.target.value, page: 1 }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
          >
            {PROVIDERS.map((o) => (
              <option key={o || 'all'} value={o}>{o || 'All'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">From</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value, page: 1 }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">To</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value, page: 1 }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#33a8da]" />
          </div>
        ) : error ? (
          <div className="p-16 text-center">
            <p className="text-red-600 font-bold">{error}</p>
            <button type="button" onClick={load} className="mt-4 text-[#33a8da] font-bold hover:underline">Retry</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead>
                  <tr className="bg-[#f8fbfe] border-b border-gray-100">
                    <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                    <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                    <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
                    <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-gray-400 font-bold">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    data.map((b) => (
                      <tr
                        key={b.id}
                        className="hover:bg-blue-50/10 transition cursor-pointer"
                        onClick={() => router.push(`/admin/dashboard/bookings/${b.id}`)}
                      >
                        <td className="px-6 lg:px-8 py-5 text-sm font-black text-[#33a8da]">{b.reference || b.id}</td>
                        <td className="px-6 lg:px-8 py-5 text-sm font-bold text-gray-900">
                          {b.user?.name || b.user?.email || '—'}
                        </td>
                        <td className="px-6 lg:px-8 py-5 text-xs font-bold text-gray-600">{b.productType?.replace(/_/g, ' ')}</td>
                        <td className="px-6 lg:px-8 py-5 text-sm font-black text-gray-900">
                          {b.currency} {Number(b.totalAmount)?.toLocaleString()}
                        </td>
                        <td className="px-6 lg:px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${statusClass(b.status || '')}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 lg:px-8 py-5 text-[10px] font-bold text-gray-400">{formatDate(b.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {meta && meta.totalPages > 1 && (
              <div className="px-8 py-4 border-t border-gray-50 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Page {meta.page} of {meta.totalPages} ({meta.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                    disabled={meta.page <= 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, page: Math.min(meta.totalPages, f.page + 1) }))}
                    disabled={meta.page >= meta.totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
