'use client';

import React, { useEffect, useState } from 'react';
import { listAuditLogs } from '@/lib/adminApi';

export default function AdminAuditLogs() {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ total: number; page: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ userId: '', action: '', page: 1, limit: 50 });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogs({
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        page: filters.page,
        limit: filters.limit,
      });
      setData(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters.page, filters.userId, filters.action, filters.limit]);

  const formatDate = (s: string) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleString('en-GB');
    } catch {
      return s;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10">
      <div className="mb-10">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Audit Logs</h2>
        <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">SUPER_ADMIN only – system activity trail</p>
      </div>

      <div className="bg-white rounded-[32px] p-6 mb-6 border border-gray-100 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={filters.userId}
          onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value, page: 1 }))}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-48"
        />
        <input
          type="text"
          placeholder="Filter by action..."
          value={filters.action}
          onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value, page: 1 }))}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-48"
        />
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#33a8da]" />
          </div>
        ) : error ? (
          <div className="p-16 text-center">
            <p className="text-red-600 font-bold">{error}</p>
            <button type="button" onClick={load} className="mt-4 text-[#33a8da] font-bold hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fbfe] border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-gray-400 font-bold">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  data.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-8 py-5 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-gray-900">{log.user?.name || log.user?.email || '—'}</p>
                        <p className="text-[10px] text-gray-500">{log.user?.role}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-lg bg-gray-100 text-xs font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-xs text-gray-600">
                        {log.entityType} {log.entityId ? `#${String(log.entityId).slice(-8)}` : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="px-8 py-4 border-t border-gray-50 flex justify-between">
            <p className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                disabled={meta.page <= 1}
                className="px-4 py-2 rounded-lg border text-sm font-bold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, page: Math.min(meta.totalPages, f.page + 1) }))}
                disabled={meta.page >= meta.totalPages}
                className="px-4 py-2 rounded-lg border text-sm font-bold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
