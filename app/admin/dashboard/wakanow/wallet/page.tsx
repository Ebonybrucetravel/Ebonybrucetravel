'use client';

import { useState, useEffect } from 'react';
import { getWakanowWalletBalance } from '@/lib/wakanow-api';

export default function WalletBalancePage() {
  const [walletBalance, setWalletBalance] = useState<{ Balance: number; Currency: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('adminToken') || undefined;
      const balance = await getWakanowWalletBalance(token);
      
      setWalletBalance(balance);
    } catch (err: any) {
      console.error('Failed to fetch wallet balance:', err);
      setError(err.message || 'Failed to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading wallet balance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Wallet Balance</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchBalance}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Wakanow Wallet Balance</h1>
        <p className="text-gray-600 mt-1">View your Wakanow wallet balance</p>
      </div>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-90">Available Balance</p>
            <p className="text-4xl font-bold mt-1">
              {walletBalance?.Currency || 'NGN'} {walletBalance?.Balance?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="text-5xl">💰</div>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm opacity-90">Wallet Status</p>
            <p className="text-lg font-semibold mt-1">Active</p>
          </div>
          <button
            onClick={fetchBalance}
            className="px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Wallet Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Currency</span>
            <span className="font-medium">{walletBalance?.Currency || 'NGN'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Last Updated</span>
            <span className="font-medium">{new Date().toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Status</span>
            <span className="text-green-600 font-medium">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}