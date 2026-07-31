'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getWakanowWalletBalance } from '@/lib/adminApi';
import { config } from '@/lib/config';

export default function WakanowDashboard() {
  const [walletBalance, setWalletBalance] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Initializing...');
      
      // Check if token exists
      const token = localStorage.getItem('adminToken');
      setDebugInfo(`Token exists: ${!!token}`);
      
      if (!token) {
        setError('No admin token found. Please login again.');
        setLoading(false);
        return;
      }
      
      // Fetch wallet balance
      try {
        setDebugInfo('Fetching wallet balance...');
        console.log('🔍 Fetching wallet balance...');
        console.log('📌 Admin token:', token.substring(0, 20) + '...');
        
        const balanceRes = await getWakanowWalletBalance();
        console.log('📦 Wallet balance response:', balanceRes);
        setDebugInfo(`Balance response received: ${balanceRes.success ? 'success' : 'failed'}`);
        
        if (balanceRes.success && balanceRes.data) {
          setWalletBalance({
            balance: balanceRes.data.balance || 0,
            currency: balanceRes.data.currency || 'NGN',
          });
          console.log('✅ Wallet balance set to:', balanceRes.data.balance);
        } else {
          console.warn('⚠️ Wallet balance response not successful:', balanceRes);
          setWalletBalance({ balance: 0, currency: 'NGN' });
          setDebugInfo(`Balance API returned: ${balanceRes.message || 'No message'}`);
        }
      } catch (balanceError: any) {
        console.error('❌ Error fetching wallet balance:', balanceError);
        console.error('❌ Error details:', balanceError.message);
        setWalletBalance({ balance: 0, currency: 'NGN' });
        setDebugInfo(`Balance error: ${balanceError.message}`);
        // Don't set the main error here, just show in debug
      }
      
      // Fetch Wakanow bookings
      try {
        setDebugInfo('Fetching bookings...');
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${config.apiBaseUrl}/api/v1/admin/bookings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        setDebugInfo(`Bookings response: ${response.status}`);
        
        if (data.success && data.data) {
          const wakanowBookings = data.data.filter((booking: any) => 
            booking.provider === 'WAKANOW' || 
            booking.provider?.toUpperCase() === 'WAKANOW'
          );
          setRecentBookings(wakanowBookings.slice(0, 5));
          console.log('✅ Found Wakanow bookings:', wakanowBookings.length);
        } else {
          console.warn('⚠️ Bookings response not successful:', data);
          setRecentBookings([]);
        }
      } catch (bookingsError: any) {
        console.error('❌ Error fetching bookings:', bookingsError);
        setDebugInfo(`Bookings error: ${bookingsError.message}`);
        setRecentBookings([]);
      }
      
      setDebugInfo('Fetch complete');
      
    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      setError(`Failed to load Wakanow data: ${error.message}`);
      setDebugInfo(`General error: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading Wakanow dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Wallet Balance',
      value: walletBalance ? `${walletBalance.currency || 'NGN'} ${walletBalance.balance?.toLocaleString() || 0}` : 'N/A',
      icon: '💰',
      gradient: 'from-green-500 to-emerald-500',
      link: '/admin/dashboard/wakanow/wallet'
    },
    {
      title: 'Total Bookings',
      value: recentBookings.length,
      icon: '📋',
      gradient: 'from-blue-500 to-cyan-500',
      link: '/admin/dashboard/wakanow/bookings'
    },
    {
      title: 'Pending Tickets',
      value: recentBookings.filter(b => !b.pnrNumber).length,
      icon: '🎫',
      gradient: 'from-orange-500 to-red-500',
      link: '/admin/dashboard/wakanow/tickets'
    },
    {
      title: 'Issued Tickets',
      value: recentBookings.filter(b => b.pnrNumber).length,
      icon: '✅',
      gradient: 'from-purple-500 to-pink-500',
      link: '/admin/dashboard/wakanow/tickets'
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Wakanow Integration Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage Wakanow bookings, issue tickets, and monitor wallet balance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Link
            key={index}
            href={stat.link}
            className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
              </div>
              <h3 className="text-gray-600 font-medium">{stat.title}</h3>
            </div>
            <div className={`h-1 bg-gradient-to-r ${stat.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300`} />
          </Link>
        ))}
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 font-mono">Debug: {debugInfo}</p>
            <button
              onClick={() => setDebugInfo('')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Refreshing...
            </>
          ) : (
            'Refresh Data'
          )}
        </button>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Wakanow Bookings</h2>
            <Link 
              href="/admin/dashboard/wakanow/bookings"
              className="text-sm text-[#33a8da] hover:text-[#2c8fc0] font-medium"
            >
              View All →
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-mono">{booking.reference}</td>
                  <td className="px-6 py-4 text-sm">{booking.user?.name || booking.customerName || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{booking.currency || 'NGN'} {booking.totalAmount}</td>
                  <td className="px-6 py-4">
                    {booking.pnrNumber ? (
                      <span className="font-mono text-sm text-green-600">{booking.pnrNumber}</span>
                    ) : (
                      <span className="text-sm text-gray-400">Not issued</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No Wakanow bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          href="/admin/dashboard/wakanow/tickets"
          className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white hover:shadow-lg transition-shadow group"
        >
          <div className="text-3xl mb-3">🎫</div>
          <h3 className="font-semibold text-lg mb-1">Issue Tickets</h3>
          <p className="text-sm opacity-90">Issue tickets for confirmed Wakanow bookings</p>
        </Link>
        
        <Link 
          href="/admin/dashboard/wakanow/wallet"
          className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white hover:shadow-lg transition-shadow group"
        >
          <div className="text-3xl mb-3">💰</div>
          <h3 className="font-semibold text-lg mb-1">Check Wallet Balance</h3>
          <p className="text-sm opacity-90">View your Wakanow wallet balance and transactions</p>
        </Link>
        
        <Link 
          href="/admin/dashboard/wakanow/bookings"
          className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white hover:shadow-lg transition-shadow group"
        >
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-semibold text-lg mb-1">Manage Bookings</h3>
          <p className="text-sm opacity-90">View and manage all Wakanow bookings</p>
        </Link>
      </div>

      {/* No Data Message */}
      {!walletBalance?.balance && !recentBookings.length && !error && (
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            No Wakanow data available. This could mean:
          </p>
          <ul className="mt-2 text-sm text-yellow-600 list-disc list-inside">
            <li>No bookings have been made with Wakanow yet</li>
            <li>The Wakanow API integration needs to be configured</li>
            <li>Check the debug info above for more details</li>
          </ul>
        </div>
      )}
    </div>
  );
}