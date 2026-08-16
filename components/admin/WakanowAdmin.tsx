
import { useState, useEffect } from 'react';
import { issueWakanowTicket, getWakanowWalletBalance } from '@/lib/adminApi';

interface WalletBalanceData {
  balance: number;
  currency: string;
  availableBalance?: number;
  totalBalance?: number;
}

interface TicketData {
  bookingId: string;
  pnrNumber: string;
  ticketNumber?: string;
  status?: string;
  message?: string;
}

export function WakanowAdminPanel() {
  const [walletBalance, setWalletBalance] = useState<WalletBalanceData | null>(null);
  const [ticketStatus, setTicketStatus] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ AUTOMATIC FETCH: Run this immediately when the component loads
  useEffect(() => {
    fetchWalletBalance();
  }, []);

  // Get wallet balance
  const fetchWalletBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getWakanowWalletBalance();
      if (response.success) {
        setWalletBalance(response.data);
        console.log('Wallet balance:', response.data);
      } else {
        setError(response.message || 'Failed to fetch wallet balance');
      }
    } catch (error: any) {
      console.error('Failed to fetch wallet balance:', error);
      setError(error.message || 'Failed to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  };

  // Issue ticket
  const handleIssueTicket = async (bookingId: string, pnrNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await issueWakanowTicket(bookingId, pnrNumber);
      if (response.success) {
        setTicketStatus(response.data);
        console.log('Ticket issued:', response.data);
      } else {
        setError(response.message || 'Failed to issue ticket');
      }
    } catch (error: any) {
      console.error('Failed to issue ticket:', error);
      setError(error.message || 'Failed to issue ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Wakanow Admin Panel</h2>
        
        {/* 🔄 Refresh Button */}
        <button
          onClick={fetchWalletBalance}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Balance'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      
      {/* Wallet Balance Section */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
        <h3 className="text-lg font-semibold mb-2">Wallet Balance</h3>
        
        {loading && !walletBalance ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            Loading balance...
          </div>
        ) : walletBalance ? (
          <div className="mt-4 p-5 bg-blue-50/50 rounded-xl border border-blue-100">
            <p className="text-sm text-gray-600 font-medium uppercase tracking-wider">Available Balance</p>
            <p className="text-3xl font-bold text-[#33a8da]">
              {walletBalance.currency || 'NGN'} {walletBalance.availableBalance?.toLocaleString() || walletBalance.balance?.toLocaleString() || 0}
            </p>
          </div>
        ) : (
          <p className="text-gray-400 text-sm mt-2">Click refresh to load balance.</p>
        )}
      </div>
      
      {/* Issue Ticket Section */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Issue Ticket</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Booking ID"
            id="bookingId"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="PNR Number"
            id="pnrNumber"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            onClick={() => {
              const bookingId = (document.getElementById('bookingId') as HTMLInputElement).value;
              const pnrNumber = (document.getElementById('pnrNumber') as HTMLInputElement).value;
              if (bookingId && pnrNumber) {
                handleIssueTicket(bookingId, pnrNumber);
              } else {
                setError('Please enter both Booking ID and PNR Number');
              }
            }}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Issue Ticket'}
          </button>
        </div>
        
        {ticketStatus && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-green-800">✅ Ticket issued successfully!</p>
            <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(ticketStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}