'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createBooking, 
  listBookings, 
  exportBookingsCsv,
  getBooking,
  updateBookingStatus,
  cancelBooking,
  processRefund,
  sendBookingEmail,
  getBookingDisputeEvidence 
} from '@/lib/adminApi';

export default function CreateBookingPage() {
  const router = useRouter();
  
  const [serviceType, setServiceType] = useState<'Flight' | 'Car Rental' | 'Hotel'>('Flight');
  const [customerType, setCustomerType] = useState<'Existing User' | 'New Guest'>('Existing User');
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT CARD' | 'BANK TRANSFER'>('CREDIT CARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  // For searching existing users
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const [formData, setFormData] = useState({
    customerSearch: '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    returnDate: '',
    provider: '',
    baseFare: '',
    offerId: '',
  });

  // Search for existing users
  useEffect(() => {
    const searchUsers = async () => {
      if (formData.customerSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Import dynamically to avoid circular dependency
        const { listCustomers } = await import('@/lib/adminApi');
        const response = await listCustomers({ 
          search: formData.customerSearch,
          limit: 5 
        });
        
        if (response.success && response.data) {
          const customers = Array.isArray(response.data) ? response.data : response.data.customers || [];
          setSearchResults(customers);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounce);
  }, [formData.customerSearch]);

  const selectUser = (user: any) => {
    setFormData(prev => ({
      ...prev,
      customerId: user.id || user._id || '',
      customerSearch: user.name || user.email || '',
    }));
    setShowResults(false);
  };

  // Map UI service type to API product type
  const getProductType = () => {
    switch(serviceType) {
      case 'Flight':
        return 'FLIGHT_INTERNATIONAL';
      case 'Hotel':
        return 'HOTEL';
      case 'Car Rental':
        return 'CAR_RENTAL';
      default:
        return 'FLIGHT_INTERNATIONAL';
    }
  };

  // Get provider based on service type - using exact API values
  const getProvider = () => {
    // For flights
    if (serviceType === 'Flight') {
      const flightProviders: Record<string, string> = {
        'DUFFEL': 'DUFFEL',
        'AMADEUS': 'AMADEUS',
      };
      return flightProviders[formData.provider] || 'DUFFEL';
    }
    
    // For hotels
    if (serviceType === 'Hotel') {
      const hotelProviders: Record<string, string> = {
        'BOOKING_COM': 'BOOKING_COM',
        'AMADEUS': 'AMADEUS',
      };
      return hotelProviders[formData.provider] || 'BOOKING_COM';
    }
    
    // For car rentals
    if (serviceType === 'Car Rental') {
      return 'AMADEUS'; // Default for car rentals
    }
    
    return 'DUFFEL';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    
    try {
      // Build the request body according to the API format
      const bookingData: any = {
        productType: getProductType(),
        provider: getProvider(),
        basePrice: parseFloat(formData.baseFare),
        currency: 'GBP',
        bookingData: {
          offerId: formData.offerId || `manual_${Date.now()}`,
          from: formData.fromLocation,
          to: formData.toLocation,
          departureDate: formData.departureDate,
          returnDate: formData.returnDate || undefined,
        },
      };

      // Add user info based on customer type
      if (customerType === 'Existing User' && formData.customerId) {
        bookingData.userId = formData.customerId;
      } else if (customerType === 'New Guest') {
        const nameParts = formData.customerName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        bookingData.passengerInfo = {
          firstName,
          lastName,
          email: formData.customerEmail,
        };
      }

      console.log('📤 Submitting booking:', bookingData);

      const response = await createBooking(bookingData);
      
      if (response.success) {
        setSubmitSuccess('Booking created successfully!');
        
        // Optional: Send confirmation email
        if (response.data?.id) {
          try {
            await sendBookingEmail(response.data.id, 'confirmation');
            console.log('✅ Confirmation email sent');
          } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
          }
        }
        
        // Reset form after successful submission
        setTimeout(() => {
          router.push('/admin/dashboard/bookings?success=Booking created successfully');
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Example function to fetch a single booking
  const fetchBooking = async (bookingId: string) => {
    try {
      const response = await getBooking(bookingId);
      if (response.success) {
        console.log('📦 Booking details:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    }
  };

  // Example function to update booking status
  const updateStatus = async (bookingId: string, status: string) => {
    try {
      const response = await updateBookingStatus(bookingId, status);
      if (response.success) {
        alert(`Booking status updated to ${status}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Example function to cancel booking
  const cancelBookingHandler = async (bookingId: string, reason?: string) => {
    try {
      const response = await cancelBooking(bookingId, reason);
      if (response.success) {
        alert('Booking cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  // Example function to process refund
  const processRefundHandler = async (bookingId: string, amount: number) => {
    try {
      const response = await processRefund(bookingId, {
        amount,
        reason: 'Customer initiated refund'
      });
      if (response.success) {
        alert(`Refund of £${amount} processed successfully`);
      }
    } catch (error) {
      console.error('Error processing refund:', error);
    }
  };

  // Example function to get dispute evidence
  const getDisputeEvidence = async (bookingId: string) => {
    try {
      const response = await getBookingDisputeEvidence(bookingId);
      if (response.success) {
        console.log('📄 Dispute evidence:', response.data);
      }
    } catch (error) {
      console.error('Error fetching dispute evidence:', error);
    }
  };

  // Example function to export bookings
  const exportBookings = async () => {
    try {
      await exportBookingsCsv({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error exporting bookings:', error);
    }
  };

  const handleRefresh = () => {
    setFormData({
      customerSearch: '',
      customerId: '',
      customerName: '',
      customerEmail: '',
      fromLocation: '',
      toLocation: '',
      departureDate: '',
      returnDate: '',
      provider: '',
      baseFare: '',
      offerId: '',
    });
    setServiceType('Flight');
    setCustomerType('Existing User');
    setPaymentMethod('CREDIT CARD');
    setSubmitError(null);
    setSubmitSuccess(null);
    setSearchResults([]);
    setShowResults(false);
  };

  const isFormValid = () => {
    if (!formData.provider) return false;
    if (!formData.fromLocation || !formData.toLocation || !formData.departureDate) return false;
    if (!formData.baseFare || isNaN(parseFloat(formData.baseFare)) || parseFloat(formData.baseFare) <= 0) return false;
    if (customerType === 'Existing User' && !formData.customerId) return false;
    if (customerType === 'New Guest' && (!formData.customerName || !formData.customerEmail)) return false;
    return true;
  };

  // Get provider options based on service type
  const getProviderOptions = () => {
    if (serviceType === 'Flight') {
      return [
        { value: 'DUFFEL', label: 'Duffel' },
        { value: 'AMADEUS', label: 'Amadeus' },
      ];
    } else if (serviceType === 'Hotel') {
      return [
        { value: 'BOOKING_COM', label: 'Booking.com' },
        { value: 'AMADEUS', label: 'Amadeus' },
      ];
    } else {
      return [
        { value: 'AMADEUS', label: 'Amadeus' },
      ];
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
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
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Create New Booking
            </h1>
            <p className="text-gray-500 mt-2">Fill in the details to create a reservation</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={exportBookings}
              type="button"
              className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
            <button 
              onClick={handleRefresh}
              type="button"
              className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          </div>
        </div>

        {submitSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div className="flex items-center gap-3 text-emerald-600">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm">{submitSuccess}</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Service Type */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Service Type</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'Flight', label: 'Flight', icon: '✈️', gradient: 'from-blue-500 to-cyan-500' },
                  { id: 'Hotel', label: 'Hotel', icon: '🏨', gradient: 'from-amber-500 to-orange-500' },
                  { id: 'Car Rental', label: 'Car', icon: '🚗', gradient: 'from-emerald-500 to-teal-500' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setServiceType(item.id as any);
                      setFormData(prev => ({ ...prev, provider: '' })); // Reset provider when service type changes
                    }}
                    className={`relative group overflow-hidden rounded-xl transition-all duration-300 ${
                      serviceType === item.id ? 'shadow-lg scale-105' : 'hover:shadow-md'
                    }`}
                  >
                    {serviceType === item.id && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className={`relative p-4 text-center ${
                      serviceType === item.id ? 'text-white' : 'text-gray-600'
                    }`}>
                      <span className="text-3xl mb-2 block">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">2. Customer Information</h3>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCustomerType('Existing User')}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                      customerType === 'Existing User'
                        ? 'bg-white text-[#33a8da] shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('New Guest')}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                      customerType === 'New Guest'
                        ? 'bg-white text-[#33a8da] shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    New Guest
                  </button>
                </div>
              </div>

              {customerType === 'Existing User' ? (
                <div className="relative">
                  <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={formData.customerSearch}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerSearch: e.target.value }))}
                    placeholder="Search by name or email..."
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                  
                  {/* Search Results Dropdown */}
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id || user._id}
                          type="button"
                          onClick={() => selectUser(user)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-center gap-3 border-b border-gray-100 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white text-sm font-medium">
                            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da]"></div>
                    </div>
                  )}

                  <input
                    type="hidden"
                    value={formData.customerId}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Full name"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="Email address"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>
              )}
            </div>

            {/* Trip Details */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Trip Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">From</label>
                  <input
                    type="text"
                    value={formData.fromLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromLocation: e.target.value }))}
                    placeholder="Departure city"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">To</label>
                  <input
                    type="text"
                    value={formData.toLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
                    placeholder="Arrival city"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Departure Date</label>
                  <input
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, departureDate: e.target.value }))}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Return Date (optional)</label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  >
                    <option value="">Select provider</option>
                    {getProviderOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {serviceType === 'Flight' && 'Available: DUFFEL, AMADEUS'}
                    {serviceType === 'Hotel' && 'Available: BOOKING_COM, AMADEUS'}
                    {serviceType === 'Car Rental' && 'Available: AMADEUS'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Base Fare (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.baseFare}
                    onChange={(e) => setFormData(prev => ({ ...prev, baseFare: e.target.value }))}
                    placeholder="Enter amount in £"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Offer ID (optional)</label>
                  <input
                    type="text"
                    value={formData.offerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, offerId: e.target.value }))}
                    placeholder="Provider offer ID"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Booking Summary</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500">Service Type</span>
                  <span className="font-semibold text-gray-900">{serviceType}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500">Provider</span>
                  <span className="font-semibold text-gray-900">{formData.provider || 'Not selected'}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-500">Base Fare</span>
                  <span className="font-semibold text-gray-900">
                    £ {formData.baseFare ? parseFloat(formData.baseFare).toFixed(2) : '0.00'}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#33a8da]">
                      £ {formData.baseFare ? parseFloat(formData.baseFare).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-xs text-gray-500 mb-3">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CREDIT CARD')}
                      className={`py-3 rounded-xl text-xs font-medium border transition-all ${
                        paymentMethod === 'CREDIT CARD'
                          ? 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white border-transparent shadow-lg'
                          : 'border-gray-200 text-gray-500 hover:border-[#33a8da]'
                      }`}
                    >
                      Credit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('BANK TRANSFER')}
                      className={`py-3 rounded-xl text-xs font-medium border transition-all ${
                        paymentMethod === 'BANK TRANSFER'
                          ? 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white border-transparent shadow-lg'
                          : 'border-gray-200 text-gray-500 hover:border-[#33a8da]'
                      }`}
                    >
                      Bank Transfer
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid() || isSubmitting}
                  className={`w-full py-4 rounded-xl font-medium transition-all mt-4 ${
                    !isFormValid() || isSubmitting
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white hover:shadow-lg hover:shadow-[#33a8da]/25'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </div>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}