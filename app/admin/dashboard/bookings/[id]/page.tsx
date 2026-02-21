'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch booking details from API
    setTimeout(() => {
      setBooking({
        id: params.id,
        type: 'Flight',
        source: 'Air Peace',
        customer: 'John Dane',
        email: 'john.dane@example.com',
        phone: '+234 801 234 5678',
        price: '$450.00',
        status: 'Confirmed',
        date: 'Jan 15, 2026',
        from: 'Lagos (LOS)',
        to: 'London (LHR)',
        departure: '10:30 AM',
        arrival: '8:45 PM',
        duration: '11h 15m',
        bookingReference: 'EB-8824',
        paymentMethod: 'Credit Card',
        baggage: '2 pieces included',
        specialRequests: 'Window seat, vegetarian meal',
      });
      setIsLoading(false);
    }, 1000);
  }, [params.id]);

  const handleStatusChange = (newStatus: string) => {
    // TODO: Update booking status via API
    setBooking({ ...booking, status: newStatus });
    alert(`Booking status updated to ${newStatus}`);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!booking) return <div className="p-8 text-gray-500">Booking not found</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
      >
        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <span className="text-sm font-medium">Back to Bookings</span>
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Booking Details
          </h1>
          <p className="text-gray-500 mt-2">Reference: {booking.bookingReference}</p>
        </div>
        <div className="flex gap-3">
          <select
            value={booking.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
          >
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all">
            Edit Booking
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Banner */}
          <div className={`rounded-2xl p-6 ${
            booking.status === 'Confirmed' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
              : booking.status === 'Cancelled'
              ? 'bg-gradient-to-r from-red-500 to-pink-500'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          } text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Current Status</p>
                <h2 className="text-2xl font-bold">{booking.status}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90 mb-1">Booking Date</p>
                <p className="font-semibold">{booking.date}</p>
              </div>
            </div>
          </div>

          {/* Flight Details */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Flight Details</h3>
            <div className="flex items-center justify-between mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">LOS</p>
                <p className="text-sm text-gray-500 mt-1">Lagos</p>
                <p className="text-xs font-medium text-[#33a8da] mt-2">{booking.departure}</p>
              </div>
              <div className="flex-1 mx-8">
                <div className="relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-[#33a8da] rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-500 mt-4">{booking.duration}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">LHR</p>
                <p className="text-sm text-gray-500 mt-1">London</p>
                <p className="text-xs font-medium text-[#33a8da] mt-2">{booking.arrival}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Airline</p>
                <p className="text-sm font-medium text-gray-900">{booking.source}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
                <p className="text-sm font-medium text-[#33a8da]">{booking.bookingReference}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Baggage Allowance</p>
                <p className="text-sm font-medium text-gray-900">{booking.baggage}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Special Requests</p>
                <p className="text-sm font-medium text-gray-900">{booking.specialRequests}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Base Fare</span>
                <span className="text-sm font-medium text-gray-900">$380.00</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Taxes & Fees</span>
                <span className="text-sm font-medium text-gray-900">$70.00</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-[#33a8da]/10 to-transparent rounded-xl">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-[#33a8da]">{booking.price}</span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Payment Method</span>
                  <span className="text-sm font-medium text-gray-900">{booking.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-2xl font-bold text-white">
                {booking.customer.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{booking.customer}</p>
                <p className="text-sm text-gray-500">Customer ID: #CUST-001</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">{booking.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm text-gray-600">{booking.phone}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              {[
                { time: '2 hours ago', action: 'Booking confirmed', icon: '✅' },
                { time: '3 hours ago', action: 'Payment processed', icon: '💰' },
                { time: '5 hours ago', action: 'Booking created', icon: '📝' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all">
              Cancel Booking
            </button>
            <button className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all">
              Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}