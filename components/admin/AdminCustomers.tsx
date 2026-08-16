'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listCustomers, listBookings } from '@/lib/adminApi';

export default function AdminCustomers() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'active' | 'suspended',
    search: '',
    page: 1,
    limit: 20,
  });

  // ✅ FIXED LOAD FUNCTION: Removed the limit to get the true count
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCustomers({
        status: filters.status,
        search: filters.search || undefined,
        page: filters.page,
        limit: filters.limit,
      });

      let customersData = Array.isArray(res.data) ? res.data : [];

      // ✅ REMOVED "limit: 1" so the API returns all bookings for counting
      const updatedData = await Promise.all(
        customersData.map(async (customer) => {
          try {
            const bookingRes = await listBookings({ userId: customer.id });
            let realCount = 0;
            
            if (bookingRes?.data) {
              // If the API returns a pagination meta object, use that first (fastest)
              if (bookingRes.meta?.total) {
                realCount = bookingRes.meta.total;
              } 
              // Otherwise, fallback to counting the array length
              else if (Array.isArray(bookingRes.data)) {
                realCount = bookingRes.data.length;
              } else if (bookingRes.data.bookings) {
                realCount = bookingRes.data.bookings.length;
              } else if (bookingRes.data.items) {
                realCount = bookingRes.data.items.length;
              }
            }
            return { ...customer, bookingsCount: realCount };
          } catch (err) {
            return customer; 
          }
        })
      );

      setData(updatedData);
      setMeta(res.meta ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(), filters.search ? 300 : 0);
    return () => clearTimeout(t);
  }, [filters.status, filters.search, filters.page, filters.limit]);

  const formatDate = (s: string) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return s;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Customer Directory</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">
            {meta ? `${meta.total} customers` : 'Loading...'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 lg:p-8 flex flex-wrap gap-4 items-center justify-between border-b border-gray-50">
          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'suspended'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, status: s, page: 1 }))}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filters.status === s ? 'bg-[#33a8da] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Suspended'}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-48 lg:w-64"
          />
        </div>

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
              <table className="w-full text-left min-w-[740px]">
                <thead>
                  <tr className="bg-[#f8fbfe] border-b border-gray-100">
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bookings</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Points</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-16 text-center text-gray-400 font-bold">No customers found</td>
                    </tr>
                  ) : (
                    data.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-blue-50/10 transition"
                      >
                        <td className="px-6 lg:px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-black text-[#33a8da]">
                              {(c.name || c.email || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900">{c.name || '—'}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-6 text-xs font-bold text-gray-500">
                          {formatDate(c.registeredDate || c.createdAt)}
                        </td>
                        
                        <td className="px-6 lg:px-8 py-6 text-sm font-black text-gray-900">
                          {c.bookingsCount !== undefined && c.bookingsCount !== null ? c.bookingsCount : '—'}
                        </td>

                        <td className="px-6 lg:px-8 py-6 text-sm font-black text-gray-900">
                          {c.points ?? c.loyaltyPoints ?? '—'}
                        </td>

                        <td className="px-6 lg:px-8 py-6">
                          <span
                            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${
                              (c.status || 'ACTIVE') === 'ACTIVE'
                                ? 'bg-[#e7f6ed] text-[#5cb85c] border-[#d4edda]'
                                : 'bg-red-50 text-red-500 border-red-100'
                            }`}
                          >
                            {c.status || 'ACTIVE'}
                          </span>
                        </td>
                        
                        <td className="px-6 lg:px-8 py-6 text-right">
                          <button
                            onClick={() => router.push(`/admin/dashboard/customers/${c.id}`)}
                            className="text-[11px] font-bold text-[#33a8da] hover:text-[#2c98c7] hover:underline transition-colors"
                          >
                            View Details →
                          </button>
                        </td>
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