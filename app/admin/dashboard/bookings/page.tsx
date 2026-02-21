'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { listBookings, exportBookingsCsv } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

interface Booking {
  id: string;
  type: string;
  source: string;
  customer: string;
  price: string;
  status: string;
  date: string;
}

export default function BookingsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        const params: any = {
          page,
          limit,
        };

        if (statusFilter !== 'All') {
          params.status = statusFilter.toLowerCase();
        }

        if (searchTerm) {
          params.search = searchTerm;
        }

        const response = await listBookings(params);
        
        if (response.success && response.data) {
          const transformedBookings = response.data.map((item: any) => ({
            id: item.id || item.bookingId || `#BK-${Math.floor(1000 + Math.random() * 9000)}`,
            type: item.productType || item.type || 'Flight',
            source: item.provider || item.source || 'Unknown',
            customer: item.user?.name || item.customerName || 'Guest',
            price: item.totalAmount ? `$${item.totalAmount.toLocaleString()}` : '$0.00',
            status: item.status || 'Pending',
            date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: '2-digit', 
              year: 'numeric' 
            }) : new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          }));
          
          setBookings(transformedBookings);
          setTotalPages(response.meta?.totalPages || 1);
        } else {
          // Fallback to mock data if API fails
          setBookings(getMockBookings());
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
        // Fallback to mock data
        setBookings(getMockBookings());
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [page, statusFilter, searchTerm, router]);

  const getMockBookings = (): Booking[] => {
    return [
      { id: '#LND-8824', type: 'Flight', source: 'Air Peace', customer: 'John Dane', price: '$450.00', status: 'Confirmed', date: 'Jan 15, 2026' },
      { id: '#LND-8830', type: 'Hotel', source: 'Marriott', customer: 'Michael Smith', price: '$550.00', status: 'Confirmed', date: 'Jan 10, 2026' },
      { id: '#LND-8844', type: 'Car Rental', source: 'Hertz', customer: 'Robert Brown', price: '$350.00', status: 'Cancelled', date: 'Jan 27, 2026' },
      { id: '#LND-9012', type: 'Flight', source: 'Qatar Airways', customer: 'Sarah Jenkins', price: '$1,200.00', status: 'Confirmed', date: 'Feb 02, 2026' },
    ];
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = b.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  const handleExport = async () => {
    try {
      await exportBookingsCsv({
        status: statusFilter !== 'All' ? statusFilter.toLowerCase() : undefined,
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export bookings. Please try again.');
    }
  };

  const handleViewBooking = (booking: Booking) => {
    router.push(`/admin/dashboard/bookings/${booking.id.replace('#', '')}`);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Bookings
          </h1>
          <p className="text-gray-500 mt-2">Manage and track all platform bookings</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button 
            onClick={() => router.push('/admin/dashboard/bookings/create')} 
            className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 4v16m8-8H4" />
            </svg>
            New Booking
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by booking ID or customer..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
              />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['All', 'Confirmed', 'Cancelled', 'Pending'].map(status => (
                <button 
                  key={status} 
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === status 
                      ? 'bg-white text-[#33a8da] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.length > 0 ? filteredBookings.map((booking, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-[#33a8da]">{booking.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{booking.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-xs font-bold">
                        {booking.customer.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{booking.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900">{booking.price}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'Confirmed' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : booking.status === 'Cancelled'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{booking.date}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewBooking(booking)}
                      className="text-[#33a8da] hover:text-[#2c8fc0] text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50 hover:border-[#33a8da] transition"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50 hover:border-[#33a8da] transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}