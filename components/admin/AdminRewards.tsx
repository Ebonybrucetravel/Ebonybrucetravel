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
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);

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
      setShowAdjustModal(false);
      alert('Points adjusted successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to adjust points');
    } finally {
      setAdjusting(false);
    }
  };

  const handleCancelVoucher = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this voucher?')) return;
    try {
      await cancelVoucher(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const filteredVouchers = vouchers.filter(v => 
    v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      'ACTIVE': 'bg-emerald-50 text-emerald-600',
      'USED': 'bg-blue-50 text-blue-600',
      'EXPIRED': 'bg-gray-50 text-gray-600',
      'CANCELLED': 'bg-red-50 text-red-600'
    };
    return statusStyles[status] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Rewards & Vouchers
          </h1>
          <p className="text-gray-500 mt-2">Manage loyalty points and promotional vouchers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Adjust Points
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Active Vouchers', value: vouchers.filter(v => v.status === 'ACTIVE').length.toString(), change: '+12%', icon: '🎫', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
          { label: 'Total Points Issued', value: '125K', change: '+8%', icon: '⭐', color: 'text-amber-600', bgColor: 'bg-amber-50' },
          { label: 'Reward Rules', value: rules.length.toString(), change: '+3', icon: '📋', color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { label: 'Redemption Rate', value: '76%', change: '+5%', icon: '🔄', color: 'text-purple-600', bgColor: 'bg-purple-50' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
              <span className={`text-sm font-semibold ${stat.color} bg-opacity-10 ${stat.bgColor} px-3 py-1 rounded-full`}>
                {stat.change}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'vouchers', label: 'Vouchers', icon: '🎫' },
          { id: 'rules', label: 'Reward Rules', icon: '📋' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as 'vouchers' | 'rules')}
            className={`relative px-6 py-3 rounded-xl font-medium text-sm transition-all ${
              tab === item.id
                ? 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{item.icon}</span>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {tab === 'vouchers' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search vouchers..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  {['', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'].map((s) => (
                    <button
                      key={s || 'all'}
                      onClick={() => setStatusFilter(s)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === s
                          ? 'bg-white text-[#33a8da] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {s || 'All'}
                    </button>
                  ))}
                </div>

                <span className="text-sm text-gray-500 ml-auto">
                  {filteredVouchers.length} vouchers found
                </span>
              </div>
            </div>

            {/* Vouchers Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-16 flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#33a8da] rounded-full border-t-transparent animate-spin"></div>
                  </div>
                </div>
              ) : error ? (
                <div className="p-16 text-center">
                  <p className="text-red-600 font-medium">{error}</p>
                  <button onClick={load} className="mt-4 px-6 py-2 bg-[#33a8da] text-white rounded-xl text-sm font-medium hover:bg-[#2c8fc0] transition">
                    Retry
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No vouchers found
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-[#33a8da]">{v.code || v.voucherCode || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-xs font-bold">
                                {v.userId?.charAt(0) || 'U'}
                              </div>
                              <span className="text-sm text-gray-600">{v.userId?.slice(0, 12)}...</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(v.status)}`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-500">
                              {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {v.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleCancelVoucher(v.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
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
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'rules' && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-16 flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#33a8da] rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rule Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Points Required</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No reward rules configured
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{r.name || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#33a8da]">{r.pointsRequired ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {r.discountType} {r.discountValue} {r.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            r.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-600'
                          }`}>
                            {r.isActive ? 'Active' : 'Inactive'}
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

      {/* Adjust Points Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <form onSubmit={handleAdjustPoints}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Adjust User Points</h2>
                  <p className="text-sm text-gray-500 mt-1">Add or deduct loyalty points</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                  <input
                    type="text"
                    value={adjustUserId}
                    onChange={(e) => setAdjustUserId(e.target.value)}
                    placeholder="Enter user ID"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points <span className="text-xs text-gray-500">(positive to add, negative to deduct)</span>
                  </label>
                  <input
                    type="number"
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(e.target.value)}
                    placeholder="e.g., 500 or -100"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g., Goodwill adjustment"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    required
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="flex-1 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adjusting ? 'Adjusting...' : 'Adjust Points'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}