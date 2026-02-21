'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  registered: string;
  booking: number;
  points: string;
  status: string;
  phone?: string;
  country?: string;
  lastActive?: string;
}

interface UserProfileProps {
  userId: string;
  onBack: () => void;
  onSuspend?: (userId: string) => void;
  onResetPassword?: (userId: string) => void;
}

export default function UserProfile({ userId, onBack, onSuspend, onResetPassword }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'activity'>('overview');

  useEffect(() => {
    // Fetch user data from API
    const fetchUser = async () => {
      setLoading(true);
      try {
        // Replace with your actual API call
        // const response = await fetch(`/api/admin/users/${userId}`);
        // const data = await response.json();
        
        // Mock data for demonstration
        setTimeout(() => {
          setUser({
            id: userId,
            name: 'John Dane',
            email: 'john.dane@example.com',
            registered: 'Jan 12, 2024',
            booking: 12,
            points: '15,200',
            status: 'Active',
            phone: '+1 (555) 123-4567',
            country: 'United States',
            lastActive: '2024-01-15T10:30:00Z'
          });
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#33a8da] rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-gray-500">User not found</p>
            <button onClick={onBack} className="mt-4 text-[#33a8da] hover:underline">
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="text-sm font-medium">Back to Users</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            User Profile
          </h1>
          <p className="text-gray-500 mt-2">View and manage user details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-4xl font-bold text-white mx-auto mb-4 shadow-lg">
                {user.name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              
              <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">{user.booking}</p>
                  <p className="text-xs text-gray-500">Bookings</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-[#33a8da]">{user.points}</p>
                  <p className="text-xs text-gray-500">Points</p>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    user.status === 'Active' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {user.status}
                  </p>
                  <p className="text-xs text-gray-500">Status</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => onResetPassword?.(user.id)}
                  className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 transition flex items-center gap-3"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Reset Password
                </button>
                <button 
                  onClick={() => onSuspend?.(user.id)}
                  className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 rounded-xl text-sm font-medium text-red-600 transition flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {user.status === 'Active' ? 'Suspend User' : 'Unsuspend User'}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Internal Notes</h3>
              <textarea 
                placeholder="Add a private note about this user..."
                className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] resize-none"
              />
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-100">
                <div className="flex">
                  {(['overview', 'bookings', 'activity'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-6 py-4 text-sm font-medium capitalize transition-all relative ${
                        activeTab === tab 
                          ? 'text-[#33a8da]' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Full Name</label>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-xl">{user.name}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Email Address</label>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-xl">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Phone Number</label>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-xl">{user.phone || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Country</label>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-xl">{user.country || '—'}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Registered Date</label>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-xl">{user.registered}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Last Active</label>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-xl">
                        {user.lastActive ? new Date(user.lastActive).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'bookings' && (
                  <div className="text-center py-12 text-gray-500">
                    No bookings found for this user
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="text-center py-12 text-gray-500">
                    No recent activity
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-lg">
                      ✈️
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Flight Booking Confirmed</p>
                      <p className="text-xs text-gray-500 mt-1">Ref: #BK-9421{i} • Jan 2026</p>
                    </div>
                    <span className="text-xs text-gray-400">2 hours ago</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-3 text-sm font-medium text-[#33a8da] hover:text-[#2c8fc0] border-t border-gray-100 hover:bg-gray-50 transition rounded-b-2xl">
                View All Activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}