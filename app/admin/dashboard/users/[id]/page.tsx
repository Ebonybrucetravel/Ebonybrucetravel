'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  phone: string;
  image: string;
  createdAt: string;
  suspendedAt: string | null;
  internalNotes: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  bookingsCount: number;
  loyaltyPoints: number;
  interactionHistory: any[];
  role?: string;
  lastLogin?: string;
  bookings?: Array<{
    id: string;
    type: string;
    date: string;
    amount: string;
    status: string;
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  registered: string;
  booking: number;
  points: string;
  status: 'Active' | 'Suspended';
  role: string;
  lastLogin: string;
  notes?: string;
  bookings?: Array<{
    id: string;
    type: string;
    date: string;
    amount: string;
    status: string;
  }>;
}

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const userId = params.id as string;
  const API_BASE_URL = 'https://ebony-bruce-production.up.railway.app/api/v1';

  // Get auth token
  const getToken = (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('adminToken') || '';
  };

  // Fetch user details
  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No admin token found. Please log in again.');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Fetching user:', userId);
      
      const response = await fetch(`${API_BASE_URL}/admin/customers/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized - Please log in again');
        if (response.status === 404) throw new Error('User not found');
        throw new Error(`API error: ${response.status}`);
      }

      const responseData: ApiResponse<UserData> = await response.json();
      console.log('📦 API Response:', responseData);

      // Handle response structure
      const userData = responseData.data;
      
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || 'Not provided',
        registered: userData.createdAt,
        booking: userData.bookingsCount || 0,
        points: userData.loyaltyPoints?.toString() || '0',
        status: userData.status === 'SUSPENDED' ? 'Suspended' : 'Active',
        role: userData.role || 'user',
        lastLogin: userData.lastLogin || '',
        notes: userData.internalNotes || '',
        bookings: userData.bookings || []
      });

    } catch (err) {
      console.error('❌ Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendUser = async (): Promise<void> => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
  
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason) return;
  
    try {
      setIsActionLoading(true);
      
      const token = getToken();
      
      console.log('🔄 Suspending user:', userId);
      
      const response = await fetch(`${API_BASE_URL}/admin/customers/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
  
      const responseData: ApiResponse<UserData> = await response.json();
      console.log('📦 Suspend response:', responseData);
  
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to suspend user');
      }
  
      // Show success message
      alert(responseData.message || 'User suspended successfully');
      
      // Refresh user data - the API returns the updated user in data.data
      if (responseData.data) {
        const userData = responseData.data;
        setUser({
          id: userData.id || userId,
          name: userData.name || user?.name || '',
          email: userData.email || user?.email || '',
          phone: userData.phone || user?.phone || '',
          registered: userData.createdAt || user?.registered || '',
          booking: userData.bookingsCount || user?.booking || 0,
          points: userData.loyaltyPoints?.toString() || user?.points || '0',
          status: userData.status === 'SUSPENDED' ? 'Suspended' : 'Active',
          role: userData.role || user?.role || 'user',
          lastLogin: userData.lastLogin || user?.lastLogin || '',
          notes: userData.internalNotes || user?.notes || '',
          bookings: userData.bookings || user?.bookings || []
        });
      } else {
        // Fallback to fetching again
        await fetchUserDetails();
      }
      
    } catch (err) {
      console.error('❌ Suspension error:', err);
      alert(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleActivateUser = async (): Promise<void> => {
    try {
      setIsActionLoading(true);
      
      const token = getToken();
      
      // Since there's no specific activate endpoint, use the suspend endpoint with status update
      const response = await fetch(`${API_BASE_URL}/admin/customers/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      
      const responseData: ApiResponse<UserData> = await response.json();
  
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to activate user');
      }
  
      alert(responseData.message || 'User activated successfully');
      
      // Update user state directly from response
      if (responseData.data) {
        const userData = responseData.data;
        setUser({
          id: userData.id || userId,
          name: userData.name || user?.name || '',
          email: userData.email || user?.email || '',
          phone: userData.phone || user?.phone || '',
          registered: userData.createdAt || user?.registered || '',
          booking: userData.bookingsCount || user?.booking || 0,
          points: userData.loyaltyPoints?.toString() || user?.points || '0',
          status: 'Active', // Force to Active since we're activating
          role: userData.role || user?.role || 'user',
          lastLogin: userData.lastLogin || user?.lastLogin || '',
          notes: userData.internalNotes || user?.notes || '',
          bookings: userData.bookings || user?.bookings || []
        });
      } else {
        await fetchUserDetails();
      }
      
    } catch (err) {
      console.error('❌ Activation error:', err);
      alert(err instanceof Error ? err.message : 'Failed to activate user');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!confirm('Send password reset email to this user?')) return;

    try {
      setIsActionLoading(true);
      
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/admin/customers/${userId}/reset-password-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData: ApiResponse<null> = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to send reset email');
      }

      alert(responseData.message || 'Password reset email sent successfully');
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveNote = async (): Promise<void> => {
    if (!noteText.trim()) return;

    try {
      setIsSavingNote(true);
      
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/admin/customers/${userId}/notes`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: noteText })
      });

      const responseData: ApiResponse<UserData> = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to save note');
      }

      alert(responseData.message || 'Note saved successfully');
      setNoteText('');
      
      // Update user with new note
      if (responseData.data) {
        setUser(prev => prev ? {
          ...prev,
          notes: responseData.data.internalNotes || noteText
        } : null);
      } else {
        await fetchUserDetails();
      }
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Format currency in pounds
  const formatPounds = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount || 0);
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button 
          onClick={fetchUserDetails}
          className="px-4 py-2 bg-[#33a8da] text-white rounded-lg hover:bg-[#2c8fc0]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">User not found</p>
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-[#33a8da] text-white rounded-lg hover:bg-[#2c8fc0]"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
        disabled={isActionLoading}
      >
        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 19l-7-7 7-7" strokeWidth={2} />
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
                {user.name?.charAt(0) || 'U'}
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
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">
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
                <p className="text-lg font-bold text-gray-900">0</p>
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
                <span className="text-sm text-gray-600">Joined {new Date(user.registered).toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={user.status === 'Active' ? handleSuspendUser : handleActivateUser}
                disabled={isActionLoading}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActionLoading 
                    ? 'opacity-50 cursor-not-allowed bg-gray-400' 
                    : user.status === 'Active'
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg'
                }`}
              >
                {isActionLoading ? 'Processing...' : (user.status === 'Active' ? 'Suspend' : 'Activate')}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isActionLoading}
                className={`flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm transition-all ${
                  isActionLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:border-[#33a8da] hover:text-[#33a8da]'
                }`}
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
                disabled={isActionLoading}
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
                  <p className="text-2xl font-bold text-gray-900">{formatPounds(0)}</p>
                  <p className="text-xs text-emerald-600 mt-1">From {user.booking} bookings</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Loyalty Points</p>
                  <p className="text-2xl font-bold text-gray-900">{user.points}</p>
                  <p className="text-xs text-gray-500 mt-1">Current balance</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Account Status</p>
                  <p className={`text-2xl font-bold ${
                    user.status === 'Active' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {user.status}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Last Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-GB') : 'N/A'}
                  </p>
                </div>
              </div>
              
              {user.notes && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                  <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                  <p className="text-sm text-gray-600">{user.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h3>
              {user.bookings && user.bookings.length > 0 ? (
                <div className="space-y-4">
                  {user.bookings.map((booking, i) => (
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
                        <p className="text-sm font-semibold text-gray-900">{formatPounds(booking.amount)}</p>
                        <span className={`text-xs font-medium ${
                          booking.status === 'Confirmed' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No bookings found</p>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {user.lastLogin && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                      🔑
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last login</p>
                      <p className="text-xs text-gray-500">{new Date(user.lastLogin).toLocaleString('en-GB')}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                    📝
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account created</p>
                    <p className="text-xs text-gray-500">{new Date(user.registered).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h3>
              <textarea 
                placeholder="Add a private note about this user..." 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] mb-4" 
                disabled={isSavingNote}
              />
              <button 
                onClick={handleSaveNote}
                disabled={isSavingNote || !noteText.trim()}
                className={`px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                  isSavingNote || !noteText.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white hover:shadow-lg'
                }`}
              >
                {isSavingNote ? 'Saving...' : 'Save Note'}
              </button>

              {user.notes && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Previous Notes</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">{user.notes}</p>
                      <p className="text-xs text-gray-400 mt-2">Added by Admin</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}