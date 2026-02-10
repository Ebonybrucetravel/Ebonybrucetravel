'use client';
import React from 'react';

const BookingsList: React.FC = () => {
  const bookings = [
    { id: 'BK-101', type: 'Flight', title: 'Lagos to Abuja', date: 'Oct 24, 2025', status: 'Confirmed', amount: '$120' },
    { id: 'BK-102', type: 'Hotel', title: 'Rome Luxury Suite', date: 'Dec 12, 2025', status: 'Pending', amount: '$450' },
  ];

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
      <h3 className="text-2xl font-black text-gray-900 mb-8">Recent Bookings</h3>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${booking.type === 'Flight' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                {booking.type === 'Flight' ? '✈️' : '🏨'}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{booking.title}</h4>
                <p className="text-xs text-gray-500 font-bold">{booking.id} • {booking.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-gray-900">{booking.amount}</p>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {booking.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingsList;