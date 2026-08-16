'use client';

import React, { useEffect, useState } from 'react';
import {
  getCustomer,
  updateCustomerNotes,
  suspendCustomer,
  activateCustomer,
  sendCustomerPasswordReset,
  listBookings,
} from '@/lib/adminApi';

interface AdminCustomerProfileProps {
  customerId: string;
  onBack: () => void;
}

interface Customer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  status: string;
  bookingsCount?: number;
  points?: number;
  loyaltyPoints?: number;
  internalNotes?: string;
  notes?: string;
  interactionHistory?: Array<{
    type: string;
    reference: string;
    date: string;
  }>;
  registeredDate?: string;
  createdAt?: string;
  lastActive?: string;
  [key: string]: any;
}

interface Booking {
  id: string;
  reference: string;
  productType: string;
  provider: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  bookingData?: any;
}

export default function AdminCustomerProfile({ customerId, onBack }: AdminCustomerProfileProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'activity' | 'notes'>('bookings');

const load = async () => {
  setLoading(true);
  setError(null);
  setErrorDetails(null);
  
  try {
    console.log('🔍 Fetching customer with ID:', customerId);
    
    const response = await getCustomer(customerId);
    
    console.log('📦 Full API Response:', response);
    
    if (!response) {
      throw new Error('No response received from API');
    }
    
    // Check if response has error
    if (response.success === false) {
      throw new Error(response.message || 'API returned error');
    }
    
    let customerData: Customer | null = null;
    
    // ✅ The customer data is in response.data
    if (response.data) {
      // If data has an id, it's the customer
      if (response.data.id) {
        customerData = response.data;
      }
      // If data is nested deeper (response.data.data)
      else if (response.data.data && response.data.data.id) {
        customerData = response.data.data;
      }
    }
    
    if (!customerData) {
      console.error('❌ Could not extract customer data:', response);
      setErrorDetails(JSON.stringify(response, null, 2));
      throw new Error('Could not find customer data in response');
    }
    
    console.log('✅ Customer data extracted:', customerData);
    
    setCustomer(customerData);
    setNotes(customerData.internalNotes || customerData.notes || '');
    
  } catch (e) {
    console.error('❌ Error loading customer:', e);
    setError(e instanceof Error ? e.message : 'Failed to load customer');
  } finally {
    setLoading(false);
  }
};

  const fetchCustomerBookings = async () => {
    if (!customerId) return;
    
    setLoadingBookings(true);
    try {
      console.log(`📡 Fetching bookings for customer: ${customerId}`);
      
      // ✅ ULTIMATE FIX: Loop through pages until we have everything
      let allBookings: Booking[] = [];
      let currentPage = 1;
      const limit = 100; // Use a page size of 100 (max supported by your API)
      let hasMoreData = true;

      while (hasMoreData) {
        console.log(`📡 Fetching page ${currentPage}...`);
        
        const response = await listBookings({ 
          userId: customerId, 
          limit: limit,
          page: currentPage // Assuming your API supports a 'page' parameter
        });

        let pageData: Booking[] = [];
        if (response?.data) {
          if (Array.isArray(response.data)) {
            pageData = response.data;
          } else if (response.data.bookings) {
            pageData = response.data.bookings;
          } else if (response.data.items) {
            pageData = response.data.items;
          }
        }

        // If this page returned no data, we are done
        if (pageData.length === 0) {
          hasMoreData = false;
        } else {
          // Add this page's data to our master list
          allBookings = [...allBookings, ...pageData];
          currentPage++;
          
          // If the data length is less than the limit, we reached the last page
          if (pageData.length < limit) {
            hasMoreData = false;
          }
        }
      }
      
      console.log(`✅ Found ${allBookings.length} total bookings across all pages`);
      setBookings(allBookings);
      
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      load();
      fetchCustomerBookings();
    }
  }, [customerId]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await updateCustomerNotes(customerId, notes || '');
      setCustomer((c) => c ? { ...c, internalNotes: notes, notes: notes } : null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async () => {
    const reason = window.prompt('Reason for suspension (optional):');
    if (reason === null) return;
    setActionLoading('suspend');
    try {
      await suspendCustomer(customerId, reason || 'No reason provided');
      setCustomer((c) => c ? { ...c, status: 'SUSPENDED' } : null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to suspend');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    setActionLoading('activate');
    try {
      await activateCustomer(customerId);
      setCustomer((c) => c ? { ...c, status: 'ACTIVE' } : null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to activate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading('reset');
    try {
      await sendCustomerPasswordReset(customerId);
      alert('Password reset link sent to customer email.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send reset link');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (s: string) => {
    if (!s) return '—';
    try {
      return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return s;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency || 'NGN',
        minimumFractionDigits: 2,
      }).format(amount || 0);
    } catch {
      return `${currency || 'NGN'} ${(amount || 0).toFixed(2)}`;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CONFIRMED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
      COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
      FAILED: 'bg-red-100 text-red-700 border-red-200',
      PAYMENT_PENDING: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FLIGHT_DOMESTIC: 'Domestic Flight',
      FLIGHT_INTERNATIONAL: 'International Flight',
      HOTEL: 'Hotel',
      CAR_RENTAL: 'Car Rental',
    };
    return labels[type] || type;
  };

  const getProductTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      FLIGHT_DOMESTIC: '✈️',
      FLIGHT_INTERNATIONAL: '🌍',
      HOTEL: '🏨',
      CAR_RENTAL: '🚗',
    };
    return icons[type] || '📦';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#33a8da] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium mb-6 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Customers</span>
        </button>
        
        <div className="bg-red-50 rounded-2xl p-8 text-center border border-red-200 max-w-2xl mx-auto">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-700 font-bold mb-2">{error || 'Customer not found'}</p>
          <p className="text-red-500 text-sm mb-4">Customer ID: {customerId}</p>
          
          {errorDetails && (
            <div className="mb-4 p-4 bg-white rounded-xl text-left overflow-auto max-h-60">
              <p className="text-xs font-bold text-gray-600 mb-2">Response Details:</p>
              <pre className="text-xs text-gray-500 whitespace-pre-wrap">{errorDetails}</pre>
            </div>
          )}
          
          <button 
            onClick={load} 
            className="px-6 py-2 bg-[#33a8da] text-white rounded-xl font-medium hover:bg-[#2c98c7] transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isSuspended = (customer.status || '').toUpperCase() === 'SUSPENDED';
  const history = customer.interactionHistory ?? [];
  const totalSpent = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

  return (
    <div className="p-4 md:p-8 bg-gray-50/80 min-h-screen">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium mb-6 transition group"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Customers</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#33a8da] to-[#1a6a8a] flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3 shadow-md">
                {(customer.name || customer.email || '?').slice(0, 2).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name || '—'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{customer.email}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className={`px-3 py-0.5 rounded-full text-xs font-medium border ${
                  isSuspended 
                    ? 'bg-red-50 text-red-600 border-red-200' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}>
                  {isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                </span>
                <span className="px-3 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200">
                  Customer
                </span>
              </div>
            </div>

            {/* ✅ Count the actual downloaded bookings */}
            <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-col items-center">
                <p className="text-base font-bold text-gray-800">{bookings.length}</p>
                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Bookings</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-base font-bold text-[#33a8da]">{customer.loyaltyPoints ?? customer.points ?? 0}</p>
                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Points</p>
              </div>
              <div className="flex flex-col items-center w-full">
                <div className="inline-flex items-baseline gap-0.5 text-sm font-bold text-gray-800 whitespace-nowrap">
                  <span className="text-[9px] text-gray-500 font-semibold">NGN</span>
                  <span>
                    {new Intl.NumberFormat('en-GB', {
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 0,
                    }).format(totalSpent)}
                  </span>
                </div>
                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">Spent</p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{customer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Joined {formatDate(customer.createdAt || customer.registeredDate || '')}</span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
              <button
                onClick={isSuspended ? handleActivate : handleSuspend}
                disabled={!!actionLoading}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition ${
                  actionLoading 
                    ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white' 
                    : isSuspended
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {actionLoading ? 'Processing...' : (isSuspended ? 'Activate Customer' : 'Suspend Access')}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!!actionLoading}
                className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition"
              >
                {actionLoading === 'reset' ? 'Sending...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100 flex">
            {[
              /* ✅ Use bookings.length for the tab label */
              { id: 'bookings', label: `Bookings (${bookings.length})`, icon: '📋' },
              { id: 'activity', label: 'Activity', icon: '📊' },
              { id: 'notes', label: 'Notes', icon: '📝' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#33a8da] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'bookings' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Booking History</h3>
                {loadingBookings && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#33a8da] border-t-transparent"></div>
                    Loading...
                  </div>
                )}
              </div>

              {loadingBookings ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#33a8da] border-t-transparent"></div>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-1">📭</p>
                  <p className="text-gray-500 font-medium">No Bookings Found</p>
                  <p className="text-sm text-gray-400 mt-1">This customer has no bookings yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%]">Ref</th>
                        <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-[25%]">Type</th>
                        <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%]">Status</th>
                        <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-[20%]">Amount</th>
                        <th className="text-left py-2.5 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider w-[15%]">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                          <td className="py-3 px-3 align-middle">
                            <span className="text-sm font-mono font-medium text-gray-900">{booking.reference}</span>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <span className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-md text-xs shrink-0">
                                {getProductTypeIcon(booking.productType)}
                              </span>
                              <span className="truncate max-w-[120px] md:max-w-[160px]">{getProductTypeLabel(booking.productType)}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 align-middle">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 align-middle text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {formatCurrency(Number(booking.totalAmount || 0), booking.currency)}
                          </td>
                          <td className="py-3 px-3 align-middle text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(booking.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Activity History</h3>
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-1">📊</p>
                  <p className="text-gray-500 font-medium">No Activity</p>
                  <p className="text-sm text-gray-400 mt-1">No interaction history available.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                        📅
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{h.type}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Ref: {h.reference} • {formatDate(h.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Internal Notes</h3>
              <textarea 
                placeholder="Add a private note about this customer..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] resize-none transition" 
                disabled={saving}
              />
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={handleSaveNotes}
                  disabled={saving || !notes.trim()}
                  className={`px-6 py-2.5 rounded-xl font-medium text-sm transition ${
                    saving || !notes.trim()
                      ? 'bg-gray-200 cursor-not-allowed text-gray-400'
                      : 'bg-[#33a8da] text-white hover:bg-[#2c98c7]'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>

              {customer.notes && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Previous Notes</h4>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600">{customer.notes}</p>
                    <p className="text-xs text-gray-400 mt-2">Added by Admin</p>
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