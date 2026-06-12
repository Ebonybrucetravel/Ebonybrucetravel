'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Booking } from '@/lib/types';
import { getStoredAuthToken } from '@/lib/api';
import { config } from '@/lib/config';

interface ManageBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancelClick: (booking: Booking) => void;
}

const BASE_URL = config.apiBaseUrl;

const ManageBookingModal: React.FC<ManageBookingModalProps> = ({ 
  isOpen, 
  onClose, 
  booking,
  onCancelClick
}) => {
  const router = useRouter();

  // State for hotel booking updates
  const [specialRequest, setSpecialRequest] = useState('');
  const [newCheckInDate, setNewCheckInDate] = useState('');
  const [newCheckOutDate, setNewCheckOutDate] = useState('');
  const [loyaltyId, setLoyaltyId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isEditingSpecialRequest, setIsEditingSpecialRequest] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [isEditingLoyalty, setIsEditingLoyalty] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'dates' | 'special' | 'loyalty'>('special');
  const [providerBookingId, setProviderBookingId] = useState<string | null>(null);

  // Debug: Log full booking when modal opens
  useEffect(() => {
    if (isOpen && booking) {
      console.log('📋 Full booking object for extraction:', JSON.stringify(booking, null, 2));
      console.log('📋 providerData structure:', booking.providerData);
      console.log('📋 providerData.data?.id:', (booking.providerData as any)?.data?.id);
    }
  }, [isOpen, booking]);

  // Fetch booking details when modal opens
  useEffect(() => {
    if (isOpen && booking) {
      fetchBookingDetails();
      // Load existing special request if any
      const existingRequest = booking.bookingData?.specialRequest || 
                              booking.providerData?.specialRequest || '';
      setSpecialRequest(existingRequest);
      
      // Load existing dates
      const bookingData = booking.bookingData || {};
      setNewCheckInDate(bookingData.checkInDate || '');
      setNewCheckOutDate(bookingData.checkOutDate || '');
      
      // Load loyalty ID if exists
      const existingLoyaltyId = booking.bookingData?.loyaltyId || '';
      setLoyaltyId(existingLoyaltyId);
      
      // ✅ IMPROVED: Extract providerBookingId from multiple possible locations
      let extractedProviderId = null;
      
      // Source 1: Direct providerBookingId
      if (booking.providerBookingId) {
        extractedProviderId = booking.providerBookingId;
      }
      // Source 2: From providerData (Amadeus response structure)
      else if (booking.providerData) {
        const providerData = booking.providerData as any;
        // Amadeus stores the order ID in data.id (most common)
        if (providerData.data?.id) {
          extractedProviderId = providerData.data.id;
          console.log('✅ Found in providerData.data.id:', extractedProviderId);
        }
        // Fallback to other possible locations
        else if (providerData.id) {
          extractedProviderId = providerData.id;
          console.log('✅ Found in providerData.id:', extractedProviderId);
        }
        else if (providerData.orderId) {
          extractedProviderId = providerData.orderId;
          console.log('✅ Found in providerData.orderId:', extractedProviderId);
        }
        // Check hotelBookings array
        else if (providerData.data?.hotelBookings?.[0]?.id) {
          extractedProviderId = providerData.data.hotelBookings[0].id;
          console.log('✅ Found in providerData.data.hotelBookings[0].id:', extractedProviderId);
        }
      }
      // Source 3: From bookingData
      else if (booking.bookingData) {
        const bookingDataObj = booking.bookingData as any;
        if (bookingDataObj.providerBookingId) {
          extractedProviderId = bookingDataObj.providerBookingId;
        }
        else if (bookingDataObj.orderId) {
          extractedProviderId = bookingDataObj.orderId;
        }
      }
      
      setProviderBookingId(extractedProviderId);
      
      console.log('🔍 Final extracted providerBookingId:', extractedProviderId);
      console.log('🔍 booking.providerBookingId value:', booking.providerBookingId);
      
      setUpdateSuccess(false);
      setUpdateError(null);
      setIsEditingSpecialRequest(false);
      setIsEditingDates(false);
      setIsEditingLoyalty(false);
    }
  }, [isOpen, booking]);

  const fetchBookingDetails = async () => {
    if (!booking) return;
    
    setIsLoadingDetails(true);
    try {
      const token = getStoredAuthToken();
      const response = await fetch(`${BASE_URL}/api/v1/bookings/${booking.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        const bookingData = result?.data?.booking || result?.data || result;
        setBookingDetails(bookingData);
        
        // ✅ IMPROVED: Extract providerBookingId from fresh data
        let extractedId = null;
        
        // Check providerBookingId field
        if (bookingData.providerBookingId) {
          extractedId = bookingData.providerBookingId;
        }
        // Check providerData for Amadeus structure
        else if (bookingData.providerData) {
          const providerData = bookingData.providerData;
          if (providerData.data?.id) {
            extractedId = providerData.data.id;
          } else if (providerData.id) {
            extractedId = providerData.id;
          }
        }
        
        if (extractedId) {
          setProviderBookingId(extractedId);
          console.log('✅ Extracted providerBookingId from fresh data:', extractedId);
        }
        
        // Extract data from fresh response
        const existingRequest = bookingData?.bookingData?.specialRequest || 
                                bookingData?.providerData?.specialRequest || '';
        setSpecialRequest(existingRequest);
        
        const checkIn = bookingData?.bookingData?.checkInDate || 
                        bookingData?.offer?.checkInDate || '';
        const checkOut = bookingData?.bookingData?.checkOutDate || 
                         bookingData?.offer?.checkOutDate || '';
        setNewCheckInDate(checkIn);
        setNewCheckOutDate(checkOut);
        
        const existingLoyaltyId = bookingData?.bookingData?.loyaltyId || '';
        setLoyaltyId(existingLoyaltyId);
      }
    } catch (error) {
      console.error('Failed to fetch booking details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleUpdateBooking = async (updateType: 'dates' | 'special' | 'loyalty') => {
    if (!booking) return;
    
    // ✅ Validate providerBookingId exists
    if (!providerBookingId) {
      console.error('Missing providerBookingId:', {
        bookingId: booking.id,
        providerBookingId,
        bookingProviderBookingId: booking.providerBookingId,
        providerData: booking.providerData,
        providerDataDataId: (booking.providerData as any)?.data?.id
      });
      setUpdateError('Unable to update: Missing provider booking ID. Please contact support.');
      return;
    }
    
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    
    try {
      const token = getStoredAuthToken();
      
      // Build update payload based on what's being updated
      const updatePayload: any = {
        hotelBooking: {}
      };
      
      if (updateType === 'dates' && newCheckInDate && newCheckOutDate) {
        updatePayload.hotelBooking.hotelOffer = {
          product: {
            checkInDate: newCheckInDate,
            checkOutDate: newCheckOutDate,
          }
        };
      }
      
      if (updateType === 'special' && specialRequest) {
        updatePayload.hotelBooking.roomAssociation = {
          specialRequest: specialRequest
        };
      }
      
      if (updateType === 'loyalty' && loyaltyId) {
        updatePayload.hotelBooking.roomAssociation = {
          ...(updatePayload.hotelBooking.roomAssociation || {}),
          guestReferences: [{
            guestReference: "1",
            hotelLoyaltyId: loyaltyId
          }]
        };
      }
      
      console.log('📤 Sending update request:', {
        bookingId: booking.id,
        providerBookingId,
        updateType,
        payload: updatePayload
      });
      
      const response = await fetch(`${BASE_URL}/api/v1/bookings/hotels/${booking.id}/update`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updateType,
          payload: updatePayload,
          providerBookingId: providerBookingId,
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || `Failed to update ${updateType}`);
      }
      
      setUpdateSuccess(true);
      
      // Refresh booking details
      await fetchBookingDetails();
      
      // Close edit modes and auto-hide success message
      setIsEditingDates(false);
      setIsEditingSpecialRequest(false);
      setIsEditingLoyalty(false);
      
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to update booking:', error);
      setUpdateError(error.message || `Failed to update ${updateType}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelClick = () => {
    onClose();
    
    if (!booking?.id) {
      console.error('Booking ID is missing');
      alert('Unable to cancel: Booking ID is missing');
      return;
    }

    const typeMap: Record<string, string> = {
      'FLIGHT_INTERNATIONAL': 'flight',
      'FLIGHT_DOMESTIC': 'flight',
      'HOTEL': 'hotel',
      'CAR_RENTAL': 'car'
    };
    
    const productType = booking.productType || 'FLIGHT_INTERNATIONAL';
    const type = typeMap[productType] || 'flight';
    
    localStorage.setItem(`cancelling_${booking.id}`, JSON.stringify(booking));
    localStorage.setItem('currentCancellingBooking', JSON.stringify(booking));
    
    router.push(`/cancel/${type}/${booking.id}`);
  };

  const isHotel = () => booking?.productType === 'HOTEL';

  const getBookingIcon = () => {
    const productType = booking?.productType;
    
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      );
    }
    
    switch(productType) {
      case 'HOTEL':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 9H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V11a2 2 0 00-2-2zm-6 4h-2v-2h2v2zm6 0h-4v-2h4v2zM5 13h4v2H5v-2z"/>
          </svg>
        );
      case 'CAR_RENTAL':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 16H4V8h16v12z"/>
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    const upperStatus = status?.toUpperCase() || '';
    switch(upperStatus) {
      case 'CONFIRMED': return 'bg-[#e7f6ed] text-[#5cb85c] border-[#d4edda]';
      case 'COMPLETED': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'FAILED': return 'bg-red-50 text-red-500 border-red-100';
      case 'PENDING': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    if (!amount && amount !== 0) return 'Price unavailable';
    const symbols: Record<string, string> = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'NGN': '₦' };
    const symbol = symbols[currency] || '£';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Date TBD';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getBookingTitle = () => {
    const productType = booking?.productType;
    const bookingData = booking?.bookingData || {};
    
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      const origin = bookingData.origin || '???';
      const destination = bookingData.destination || '???';
      return `${origin} → ${destination}`;
    }
    
    switch(productType) {
      case 'HOTEL': return bookingData.hotelName || 'Hotel Booking';
      case 'CAR_RENTAL': return bookingData.vehicleType || 'Car Rental';
      default: return 'Booking';
    }
  };

  const getBookingSubtitle = () => {
    const productType = booking?.productType;
    const bookingData = booking?.bookingData || {};
    
    if (productType === 'FLIGHT_INTERNATIONAL' || productType === 'FLIGHT_DOMESTIC') {
      return `${bookingData.airline || booking?.provider || 'Airline'} ${bookingData.flightNumber ? `• ${bookingData.flightNumber}` : ''}`;
    }
    
    switch(productType) {
      case 'HOTEL': {
        let roomCount = 1;
        if (bookingData.rooms) {
          if (typeof bookingData.rooms === 'object') {
            const roomsObj = bookingData.rooms as Record<string, any>;
            roomCount = Number(roomsObj.count) || Number(roomsObj.total) || 1;
          } else {
            roomCount = Number(bookingData.rooms) || 1;
          }
        }
        return `${booking?.provider} • ${roomCount} room${roomCount > 1 ? 's' : ''}`;
      }
      case 'CAR_RENTAL': return booking?.provider || '';
      default: return booking?.reference || '';
    }
  };

  const getCancellationPolicy = () => {
    if (booking?.cancellationDeadline) {
      const deadline = new Date(booking.cancellationDeadline);
      const now = new Date();
      const hoursLeft = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (hoursLeft > 0) {
        return `Free cancellation available for ${hoursLeft} more hour${hoursLeft > 1 ? 's' : ''}`;
      }
    }
    return booking?.cancellationPolicySnapshot || 'Standard cancellation policy applies';
  };

  const isCancelDisabled = () => {
    const status = booking?.status?.toUpperCase();
    return status === 'CANCELLED' || status === 'FAILED' || status === 'COMPLETED';
  };

  const nights = (() => {
    if (!isHotel()) return null;
    const bookingData = booking?.bookingData || {};
    const checkIn = newCheckInDate || bookingData.checkInDate;
    const checkOut = newCheckOutDate || bookingData.checkOutDate;
    if (checkIn && checkOut) {
      return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    }
    return null;
  })();

  if (!isOpen || !booking) return null;

  // If providerBookingId is missing, show a message instead of the update form
  const isUpdateDisabled = !providerBookingId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[20px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">Manage Booking</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Manage your booking <span className="text-[#33a8da]">#{booking.reference?.slice(-8) || booking.id?.slice(-8)}</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              Modify your booking details below
            </p>
          </div>

          {/* Warning if providerBookingId missing */}
          {isUpdateDisabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Updates Temporarily Unavailable</span>
              </div>
              <p className="text-sm text-yellow-600 mt-2">
                This booking cannot be modified online. Please contact our support team for assistance with changes.
              </p>
              <p className="text-xs text-yellow-500 mt-2">
                Booking ID: {booking.id}
              </p>
            </div>
          )}

          {/* Booking Summary Card */}
          <div className="bg-[#f7f9fa] rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#33a8da] shadow-sm shrink-0 border border-gray-100">
                {getBookingIcon()}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-lg text-gray-900">{getBookingTitle()}</div>
                    <div className="text-xs text-gray-500 mt-1">{getBookingSubtitle()}</div>
                  </div>
                  <span className={`${getStatusColor(booking.status)} text-[10px] font-bold px-3 py-1 rounded-full border shrink-0 ml-2`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hotel Modification Tabs - only show if providerBookingId exists */}
          {isHotel() && !isUpdateDisabled && (
            <div>
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('dates')}
                  className={`px-4 py-2 text-sm font-bold transition-all ${
                    activeTab === 'dates' 
                      ? 'text-[#33a8da] border-b-2 border-[#33a8da]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Change Dates
                </button>
                <button
                  onClick={() => setActiveTab('special')}
                  className={`px-4 py-2 text-sm font-bold transition-all ${
                    activeTab === 'special' 
                      ? 'text-[#33a8da] border-b-2 border-[#33a8da]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Special Request
                </button>
                <button
                  onClick={() => setActiveTab('loyalty')}
                  className={`px-4 py-2 text-sm font-bold transition-all ${
                    activeTab === 'loyalty' 
                      ? 'text-[#33a8da] border-b-2 border-[#33a8da]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Loyalty ID
                </button>
              </div>

              {/* Change Dates Tab */}
              {activeTab === 'dates' && (
                <div className="border border-gray-200 rounded-2xl p-5 bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="font-bold text-gray-900">Change Stay Dates</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Check-in Date</label>
                      <input
                        type="date"
                        value={newCheckInDate}
                        onChange={(e) => setNewCheckInDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Check-out Date</label>
                      <input
                        type="date"
                        value={newCheckOutDate}
                        onChange={(e) => setNewCheckOutDate(e.target.value)}
                        min={newCheckInDate || new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20"
                      />
                    </div>
                  </div>
                  
                  {nights && nights > 0 && (
                    <div className="text-sm text-gray-600 mb-4">
                      <span className="font-bold">{nights}</span> night{nights > 1 ? 's' : ''} total
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleUpdateBooking('dates')}
                    disabled={isUpdating || !newCheckInDate || !newCheckOutDate}
                    className="w-full py-2 bg-[#33a8da] text-white font-bold text-sm rounded-lg hover:bg-[#2c98c7] transition disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Update Dates'}
                  </button>
                </div>
              )}

              {/* Special Request Tab */}
              {activeTab === 'special' && (
                <div className="border border-gray-200 rounded-2xl p-5 bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <h4 className="font-bold text-gray-900">Special Request</h4>
                  </div>
                  
                  <textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    placeholder="e.g., Late check-in, extra pillows, room with a view, etc."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 resize-none"
                    rows={3}
                  />
                  
                  <button
                    onClick={() => handleUpdateBooking('special')}
                    disabled={isUpdating || !specialRequest.trim()}
                    className="w-full mt-4 py-2 bg-[#33a8da] text-white font-bold text-sm rounded-lg hover:bg-[#2c98c7] transition disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Special Request'}
                  </button>
                </div>
              )}

              {/* Loyalty ID Tab */}
              {activeTab === 'loyalty' && (
                <div className="border border-gray-200 rounded-2xl p-5 bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <h4 className="font-bold text-gray-900">Hotel Loyalty ID</h4>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    Enter your hotel loyalty program ID to earn points for this stay
                  </p>
                  
                  <input
                    type="text"
                    value={loyaltyId}
                    onChange={(e) => setLoyaltyId(e.target.value)}
                    placeholder="Enter your loyalty ID"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20"
                  />
                  
                  <button
                    onClick={() => handleUpdateBooking('loyalty')}
                    disabled={isUpdating || !loyaltyId.trim()}
                    className="w-full mt-4 py-2 bg-[#33a8da] text-white font-bold text-sm rounded-lg hover:bg-[#2c98c7] transition disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Loyalty ID'}
                  </button>
                </div>
              )}

              {/* Success/Error Messages */}
              {updateSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-700">Booking updated successfully!</p>
                </div>
              )}
              
              {updateError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="text-sm text-red-700">{updateError}</p>
                </div>
              )}
            </div>
          )}

          {/* Price Info */}
          <div className="flex justify-between items-center px-2">
            <span className="text-sm font-bold text-gray-600">Total Amount</span>
            <span className="text-2xl font-black text-[#33a8da]">
              {formatPrice(booking.totalAmount, booking.currency)}
            </span>
          </div>

          {/* Cancellation Policy */}
          {(booking.cancellationDeadline || booking.cancellationPolicySnapshot) && (
            <div className="bg-[#ebf5ff] rounded-xl p-4 flex items-start gap-3 border border-[#cfe2ff]">
              <div className="text-[#33a8da] mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{getCancellationPolicy()}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <button 
            onClick={handleCancelClick}
            className="px-6 py-3 border border-red-500 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50 transition active:scale-95 disabled:opacity-50"
            disabled={isCancelDisabled()}
          >
            Cancel Booking
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-xl text-sm hover:bg-[#2c98c7] transition shadow-lg shadow-blue-500/10 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageBookingModal;