'use client';

import React, { useEffect, useState } from 'react';
import {
  getCustomer,
  updateCustomerNotes,
  suspendCustomer,
  activateCustomer,
  sendCustomerPasswordReset,
} from '@/lib/adminApi';

interface AdminCustomerProfileProps {
  customerId: string;
  onBack: () => void;
}

export default function AdminCustomerProfile({ customerId, onBack }: AdminCustomerProfileProps) {
  const [customer, setCustomer] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCustomer(customerId);
      const data = res.data ?? res;
      setCustomer(data);
      setNotes(data.internalNotes ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await updateCustomerNotes(customerId, notes || null);
      setCustomer((c: any) => (c ? { ...c, internalNotes: notes } : c));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    const reason = window.prompt('Reason for suspension (optional):');
    if (reason === null) return;
    setActionLoading('suspend');
    try {
      await suspendCustomer(customerId, reason || undefined);
      setCustomer((c: any) => (c ? { ...c, status: 'SUSPENDED' } : c));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to suspend');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    setActionLoading('activate');
    try {
      await activateCustomer(customerId);
      setCustomer((c: any) => (c ? { ...c, status: 'ACTIVE' } : c));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to activate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading('reset');
    try {
      await sendCustomerPasswordReset(customerId);
      alert('Password reset link sent to customer email.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send reset link');
    } finally {
      setActionLoading(null);
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

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da]" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-10">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold text-sm mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="bg-red-50 rounded-2xl p-8 text-center">
          <p className="text-red-700 font-bold">{error || 'Customer not found'}</p>
          <button onClick={load} className="mt-4 text-[#33a8da] font-bold hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isSuspended = (customer.status || '').toUpperCase() === 'SUSPENDED';
  const history = customer.interactionHistory ?? [];

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
        Back to Directory
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-3xl font-black text-[#33a8da] mx-auto mb-6">
              {(customer.name || customer.email || '?').slice(0, 2).toUpperCase()}
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{customer.name || '—'}</h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{customer.email}</p>
            <div className="mt-8 pt-8 border-t border-gray-50 flex justify-between gap-4">
              <div className="text-center flex-1">
                <p className="text-xs font-black text-gray-900">{customer.bookingsCount ?? 0}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Bookings</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs font-black text-[#33a8da]">{customer.loyaltyPoints ?? customer.points ?? 0}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Points</p>
              </div>
              <div className="text-center flex-1">
                <span
                  className={`text-xs font-black ${
                    isSuspended ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  {customer.status || 'ACTIVE'}
                </span>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Status</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4">Internal Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a private note about this customer..."
              className="w-full h-32 bg-gray-50 rounded-xl p-4 text-sm font-medium border-none focus:ring-1 focus:ring-[#33a8da] outline-none resize-none"
            />
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-4 w-full py-3 bg-[#33a8da] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#2c98c7] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase mb-8">Interaction History</h3>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-400 text-sm">No interaction history</p>
              ) : (
                history.map((h: any, i: number) => (
                  <div key={i} className="flex gap-4 p-5 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg">📅</div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{h.type}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                        Ref: {h.reference} • {formatDate(h.date)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {isSuspended ? (
              <button
                type="button"
                onClick={handleActivate}
                disabled={!!actionLoading}
                className="flex-1 min-w-[140px] bg-green-50 text-green-600 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-green-100 transition disabled:opacity-50"
              >
                {actionLoading === 'activate' ? 'Activating...' : 'Activate Customer'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSuspend}
                disabled={!!actionLoading}
                className="flex-1 min-w-[140px] bg-red-50 text-red-500 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-100 transition disabled:opacity-50"
              >
                {actionLoading === 'suspend' ? 'Suspending...' : 'Suspend Access'}
              </button>
            )}
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!!actionLoading}
              className="flex-1 min-w-[140px] bg-gray-900 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition disabled:opacity-50"
            >
              {actionLoading === 'reset' ? 'Sending...' : 'Reset Password Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
