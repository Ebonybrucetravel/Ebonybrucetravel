'use client';

import React, { useEffect, useState } from 'react';
import { listCancellationRequests, processCancellationRequest } from '@/lib/adminApi';

export default function AdminCancellationRequests() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    id: string;
    action: 'REJECT' | 'APPROVE_PARTIAL_REFUND' | 'APPROVE_FULL_REFUND';
    refundAmount: string;
    adminNotes: string;
    rejectionReason: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCancellationRequests();
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (id: string, action: 'REJECT' | 'APPROVE_PARTIAL_REFUND' | 'APPROVE_FULL_REFUND') => {
    setModal({
      id,
      action,
      refundAmount: '',
      adminNotes: '',
      rejectionReason: '',
    });
  };

  const handleProcess = async () => {
    if (!modal) return;
    const needsRefund = modal.action === 'APPROVE_PARTIAL_REFUND' || modal.action === 'APPROVE_FULL_REFUND';
    if (needsRefund && !modal.refundAmount) {
      alert('Refund amount is required for partial/full refund');
      return;
    }
    if (modal.action === 'REJECT' && !modal.rejectionReason) {
      alert('Rejection reason is required');
      return;
    }
    setProcessing(modal.id);
    try {
      await processCancellationRequest(modal.id, {
        action: modal.action,
        refundAmount: needsRefund ? parseFloat(modal.refundAmount) : undefined,
        adminNotes: modal.adminNotes || undefined,
        rejectionReason: modal.action === 'REJECT' ? modal.rejectionReason : undefined,
      });
      setModal(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process');
    } finally {
      setProcessing(null);
    }
  };

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
        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Cancellation Requests</h2>
        <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">
          Pending requests awaiting admin decision
        </p>
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
        ) : data.length === 0 ? (
          <div className="p-16 text-center text-gray-400 font-bold">
            No pending cancellation requests
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fbfe] border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Request ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Booking</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Requested</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((r) => (
                  <tr key={r.id}>
                    <td className="px-8 py-5 text-sm font-mono">{r.id?.slice(0, 12)}...</td>
                    <td className="px-8 py-5 text-sm">
                      {r.booking?.reference || r.bookingId?.slice(0, 12) || '—'}
                    </td>
                    <td className="px-8 py-5 text-xs text-gray-500">{formatDate(r.requestedAt)}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(r.id, 'APPROVE_FULL_REFUND')}
                          className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100"
                        >
                          Full Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal(r.id, 'APPROVE_PARTIAL_REFUND')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100"
                        >
                          Partial
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal(r.id, 'REJECT')}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
            <h3 className="text-lg font-black text-gray-900 mb-6">
              {modal.action === 'REJECT' ? 'Reject Request' : modal.action === 'APPROVE_FULL_REFUND' ? 'Approve Full Refund' : 'Approve Partial Refund'}
            </h3>
            {(modal.action === 'APPROVE_PARTIAL_REFUND' || modal.action === 'APPROVE_FULL_REFUND') && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">Refund amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={modal.refundAmount}
                  onChange={(e) => setModal((m) => m ? { ...m, refundAmount: e.target.value } : m)}
                  placeholder="450.00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200"
                />
              </div>
            )}
            {modal.action === 'REJECT' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">Rejection reason *</label>
                <textarea
                  value={modal.rejectionReason}
                  onChange={(e) => setModal((m) => m ? { ...m, rejectionReason: e.target.value } : m)}
                  placeholder="e.g. Outside cancellation window"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 h-24"
                  required
                />
              </div>
            )}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 mb-1">Admin notes (optional)</label>
              <textarea
                value={modal.adminNotes}
                onChange={(e) => setModal((m) => m ? { ...m, adminNotes: e.target.value } : m)}
                placeholder="Internal note..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 h-20"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleProcess}
                disabled={processing === modal.id}
                className="flex-1 py-3 bg-[#33a8da] text-white rounded-xl font-black text-sm uppercase disabled:opacity-50"
              >
                {processing === modal.id ? 'Processing...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
