// app/admin/dashboard/wakanow/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface Booking {
  id: string;
  reference: string;
  customerName?: string;
  user?: { name: string };
  totalAmount: number;
  currency: string;
  status: string;
  pnrNumber?: string;
  createdAt: string;
  provider?: string;
}

export default function WakanowBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWakanowBookings();
  }, []);

  const fetchWakanowBookings = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/v1/admin/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Filter for Wakanow bookings
        const wakanowBookings = data.data.filter((booking: any) => 
          booking.provider === 'WAKANOW' || 
          booking.provider?.toUpperCase() === 'WAKANOW'
        );
        setBookings(wakanowBookings);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => 
    booking.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.pnrNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Wakanow Bookings</h1>
        <p className="text-gray-600 mt-1">View and manage all Wakanow bookings</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by reference, customer name, or PNR..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Refresh Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={fetchWakanowBookings}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PNR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.map((booking) => (
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
                      'bg-red-100 text-red-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No Wakanow bookings found
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="mt-2">Loading bookings...</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}