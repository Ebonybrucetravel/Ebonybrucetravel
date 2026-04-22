'use client';

import { useState, useEffect } from 'react';
import { ticketWakanowPNR } from '@/lib/wakanow-api';
import { listBookings } from '@/lib/adminApi';

export default function IssueTicketsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuingTicket, setIssuingTicket] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [pnrNumber, setPnrNumber] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchWakanowBookings();
  }, []);

  const fetchWakanowBookings = async () => {
    try {
      setLoading(true);
      const response = await listBookings({ provider: 'WAKANOW' });
      
      if (response.success && response.data) {
        setBookings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setMessage({ type: 'error', text: 'Error fetching bookings' });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTicket = async (bookingId: string) => {
    if (!pnrNumber) {
      setMessage({ type: 'error', text: 'Please enter PNR number' });
      return;
    }

    try {
      setIssuingTicket(true);
      const response = await ticketWakanowPNR(bookingId, pnrNumber);
      console.log('Ticket response:', response);
      
      if (response.success !== false) {
        setMessage({ type: 'success', text: 'Ticket issued successfully!' });
        setSelectedBooking(null);
        setPnrNumber('');
        fetchWakanowBookings();
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to issue ticket' });
      }
    } catch (error: any) {
      console.error('Issue ticket error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to issue ticket' });
    } finally {
      setIssuingTicket(false);
    }
  };

  const pendingBookings = bookings.filter(b => !b.pnrNumber);
  const issuedBookings = bookings.filter(b => b.pnrNumber);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Issue Wakanow Tickets</h1>
        <p className="text-gray-600 mt-1">Issue tickets for confirmed Wakanow bookings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <div className="text-3xl mb-2">🎫</div>
          <div className="text-3xl font-bold">{pendingBookings.length}</div>
          <div className="text-sm opacity-90">Pending Tickets to Issue</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-3xl font-bold">{issuedBookings.length}</div>
          <div className="text-sm opacity-90">Tickets Issued</div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex justify-between items-center ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-xl">&times;</button>
        </div>
      )}

      {/* Pending Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Pending Tickets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 font-mono">{booking.reference}</td>
                  <td className="px-6 py-4">{booking.user?.name || booking.customerName}</td>
                  <td className="px-6 py-4">{booking.currency} {booking.totalAmount}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      Issue Ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Ticket Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Issue Ticket</h3>
            <p className="mb-2">Booking: {selectedBooking.reference}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">PNR Number</label>
              <input
                type="text"
                value={pnrNumber}
                onChange={(e) => setPnrNumber(e.target.value.toUpperCase())}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter PNR number"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleIssueTicket(selectedBooking.id)}
                disabled={issuingTicket}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
              >
                {issuingTicket ? 'Processing...' : 'Issue Ticket'}
              </button>
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 bg-gray-200 py-2 rounded-lg"
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