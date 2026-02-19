'use client';

import React, { useEffect, useState } from 'react';
import {
  listVouchers,
  listRewardRules,
  adjustUserPoints,
  cancelVoucher,
  getRewardsDashboard,
} from '@/lib/adminApi';

export default function AdminRewards() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'vouchers' | 'rules'>('vouchers');
  const [statusFilter, setStatusFilter] = useState('');
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, rRes] = await Promise.all([
        listVouchers({ status: statusFilter || undefined, limit: 50 }),
        listRewardRules(),
      ]);
      setVouchers(Array.isArray(vRes.data) ? vRes.data : []);
      setMeta(vRes.meta ?? null);
      const rawRules = rRes.data as unknown;
      setRules(Array.isArray(rawRules) ? rawRules : Array.isArray((rawRules as { rules?: unknown[] })?.rules) ? (rawRules as { rules: unknown[] }).rules : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setVouchers([]);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustUserId || !adjustPoints || !adjustReason) {
      alert('User ID, points, and reason are required');
      return;
    }
    setAdjusting(true);
    try {
      await adjustUserPoints(adjustUserId, parseInt(adjustPoints, 10), adjustReason);
      setAdjustUserId('');
      setAdjustPoints('');
      setAdjustReason('');
      alert('Points adjusted successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to adjust points');
    } finally {
      setAdjusting(false);
    }
  };

  const handleCancelVoucher = async (id: string) => {
    if (!window.confirm('Cancel this voucher?')) return;
    try {
      await cancelVoucher(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Rewards & Vouchers</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Loyalty and voucher management</p>
        </div>
      </div>

      {/* Adjust points */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-8">
        <h3 className="text-sm font-black text-gray-900 uppercase mb-4">Adjust User Points</h3>
        <form onSubmit={handleAdjustPoints} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">User ID</label>
            <input
              type="text"
              value={adjustUserId}
              onChange={(e) => setAdjustUserId(e.target.value)}
              placeholder="clx..."
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-48"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Points (+ credit, - debit)</label>
            <input
              type="number"
              value={adjustPoints}
              onChange={(e) => setAdjustPoints(e.target.value)}
              placeholder="500 or -100"
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-32"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Reason</label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Goodwill adjustment"
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm w-48"
            />
          </div>
          <button
            type="submit"
            disabled={adjusting}
            className="px-6 py-2 bg-[#33a8da] text-white rounded-xl font-black text-sm uppercase disabled:opacity-50"
          >
            {adjusting ? 'Adjusting...' : 'Adjust'}
          </button>
        </form>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('vouchers')}
          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase ${
            tab === 'vouchers' ? 'bg-[#33a8da] text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          Vouchers
        </button>
        <button
          type="button"
          onClick={() => setTab('rules')}
          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase ${
            tab === 'rules' ? 'bg-[#33a8da] text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          Reward Rules
        </button>
      </div>

      {tab === 'vouchers' && (
        <>
          <div className="flex gap-2 mb-4">
            {['', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${
                  statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
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
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Code</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">User</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Expiry</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vouchers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-16 text-center text-gray-400">
                          No vouchers found
                        </td>
                      </tr>
                    ) : (
                      vouchers.map((v) => (
                        <tr key={v.id}>
                          <td className="px-8 py-5 font-black text-[#33a8da]">{v.code || v.voucherCode || '—'}</td>
                          <td className="px-8 py-5 text-sm">{v.userId?.slice(0, 12) || '—'}...</td>
                          <td className="px-8 py-5">
                            <span
                              className={`px-3 py-1 rounded-full text-[9px] font-black ${
                                v.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-xs text-gray-500">
                            {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-8 py-5">
                            {v.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => handleCancelVoucher(v.id)}
                                className="text-red-500 font-bold text-xs hover:underline"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'rules' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-16 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#33a8da]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#f8fbfe] border-b border-gray-100">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Name</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Points</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Discount</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-16 text-center text-gray-400">
                        No reward rules configured
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id}>
                        <td className="px-8 py-5 font-bold text-gray-900">{r.name || '—'}</td>
                        <td className="px-8 py-5 text-sm">{r.pointsRequired ?? '—'}</td>
                        <td className="px-8 py-5 text-sm">
                          {r.discountType} {r.discountValue} {r.currency}
                        </td>
                        <td className="px-8 py-5">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black ${
                              r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {r.isActive ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
