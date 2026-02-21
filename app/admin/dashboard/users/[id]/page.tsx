'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // TODO: Fetch user details from API
    setTimeout(() => {
      setUser({
        id: params.id,
        name: 'John Dane',
        email: 'johndane@example.com',
        phone: '+234 801 234 5678',
        registered: 'Jan 12, 2024',
        booking: 12,
        points: '15,200',
        status: 'Active',
        role: 'user',
        lastLogin: '2026-02-20T10:30:00',
        bookings: [
          { id: '#LND-8824', type: 'Flight', date: 'Jan 15, 2026', amount: '$450.00', status: 'Confirmed' },
          { id: '#LND-8830', type: 'Hotel', date: 'Jan 10, 2026', amount: '$550.00', status: 'Confirmed' },
        ]
      });
      setIsLoading(false);
    }, 1000);
  }, [params.id]);

  const handleSuspendUser = () => {
    if (confirm('Are you sure you want to suspend this user?')) {
      // TODO: Implement API call
      setUser({ ...user, status: 'Suspended' });
      alert('User suspended successfully');
    }
  };

  const handleResetPassword = () => {
    if (confirm('Send password reset email to this user?')) {
      // TODO: Implement API call
      alert('Password reset email sent');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!user) return <div className="p-8 text-gray-500">User not found</div>;

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
        <span className="text-sm font-medium">Back to Users</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4 shadow-lg">
                {user.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {user.status}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {user.role}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{user.booking}</p>
                <p className="text-xs text-gray-500">Bookings</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[#33a8da]">{user.points}</p>
                <p className="text-xs text-gray-500">Points</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">12</p>
                <p className="text-xs text-gray-500">Reviews</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm text-gray-600">{user.phone}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">Joined {user.registered}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSuspendUser}
                className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all"
              >
                {user.status === 'Active' ? 'Suspend' : 'Activate'}
              </button>
              <button
                onClick={handleResetPassword}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-2xl p-1 shadow-xl border border-gray-100 inline-flex">
            {['overview', 'bookings', 'activity', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">$2,450</p>
                  <p className="text-xs text-emerald-600 mt-1">+12% from last month</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Loyalty Tier</p>
                  <p className="text-2xl font-bold text-gray-900">Gold</p>
                  <p className="text-xs text-gray-500 mt-1">2,500 points to next tier</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Avg. Booking Value</p>
                  <p className="text-2xl font-bold text-gray-900">$204</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Last Active</p>
                  <p className="text-2xl font-bold text-gray-900">2h ago</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
              <div className="space-y-4">
                {user.bookings.map((booking: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-lg">
                        {booking.type === 'Flight' ? '✈️' : '🏨'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.id}</p>
                        <p className="text-xs text-gray-500">{booking.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{booking.amount}</p>
                      <span className={`text-xs font-medium ${
                        booking.status === 'Confirmed' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { action: 'Logged in', time: '2 hours ago', icon: '🔑' },
                  { action: 'Booking #LND-8824 confirmed', time: '1 day ago', icon: '✅' },
                  { action: 'Profile updated', time: '3 days ago', icon: '✏️' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                      {activity.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h3>
              <textarea 
                placeholder="Add a private note about this user..." 
                className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] mb-4" 
              />
              <button className="px-6 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all">
                Save Note
              </button>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Previous Notes</h4>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600">Preferred window seats, always books business class</p>
                    <p className="text-xs text-gray-400 mt-2">Added by Admin • 2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}