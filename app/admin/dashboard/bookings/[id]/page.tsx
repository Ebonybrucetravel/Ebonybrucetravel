'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { 
  getBooking, 
  updateBookingStatus, 
  cancelBooking,
  processRefund,
  sendBookingEmail,
  getBookingDisputeEvidence,
  processCancellationRequest 
} from '@/lib/adminApi';

export default function BookingDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationAction, setCancellationAction] = useState<'REJECT' | 'APPROVE_PARTIAL_REFUND' | 'APPROVE_FULL_REFUND'>('APPROVE_FULL_REFUND');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState<any>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchBooking = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        const response = await getBooking(params.id as string);
        
        if (response.success && response.data) {
          const transformedData = transformBookingData(response.data);
          setBooking(transformedData);
          
          if (response.data.cancellationRequests) {
            setCancellationRequests(response.data.cancellationRequests);
          }
        } else {
          throw new Error(response.message || 'Failed to fetch booking');
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch booking');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchBooking();
    }
  }, [params.id, router]);

  const transformBookingData = (apiData: any) => {
    // Map API response to component format
    const passengerName = apiData.passengerInfo 
      ? `${apiData.passengerInfo.firstName} ${apiData.passengerInfo.lastName}`
      : apiData.user?.name || 'Guest';
    
    return {
      id: apiData.id,
      type: apiData.productType?.replace('_', ' ') || 'Flight',
      source: apiData.provider || 'Unknown',
      customer: passengerName,
      email: apiData.passengerInfo?.email || apiData.user?.email,
      phone: apiData.passengerInfo?.phone || apiData.user?.phone,
      price: apiData.totalAmount ? `${apiData.currency || '$'}${apiData.totalAmount.toLocaleString()}` : '$0.00',
      rawPrice: apiData.totalAmount,
      status: apiData.status || 'Pending',
      paymentStatus: apiData.paymentStatus || 'N/A',
      date: apiData.createdAt ? new Date(apiData.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      }) : 'N/A',
      bookingReference: apiData.reference || apiData.id,
      from: apiData.bookingData?.origin || apiData.bookingData?.from || 'N/A',
      to: apiData.bookingData?.destination || apiData.bookingData?.to || 'N/A',
      departure: apiData.bookingData?.departureDate || 'N/A',
      arrival: apiData.bookingData?.returnDate || 'N/A',
      paymentMethod: apiData.paymentMethod || 'Credit Card',
      currency: apiData.currency || 'USD',
      productType: apiData.productType,
      provider: apiData.provider,
      passengerInfo: apiData.passengerInfo,
      bookingData: apiData.bookingData,
      cancellationRequests: apiData.cancellationRequests || [],
      cancellationRequestId: apiData.cancellationRequests?.[0]?.id 
    };
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      console.log('📤 Updating booking status:', { id: booking.id, newStatus });
      const response = await updateBookingStatus(booking.id, newStatus);
      console.log('📥 Status update response:', response);
      
      if (response.success) {
        setBooking({ ...booking, status: newStatus });
        alert(`Booking status updated to ${newStatus}`);
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update booking status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    setIsUpdating(true);
    try {
      console.log('📤 Cancelling booking:', { id: booking.id, reason: 'Cancelled by admin' });
      const response = await cancelBooking(booking.id, 'Cancelled by admin');
      console.log('📥 Cancel response:', response);
      
      if (response.success) {
        setBooking({ ...booking, status: 'CANCELLED' });
        alert('Booking cancelled successfully');
      } else {
        throw new Error(response.message || 'Failed to cancel booking');
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Failed to cancel booking: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!refundAmount) {
      alert('Please enter refund amount');
      return;
    }
  
    setIsUpdating(true);
    try {
      // Use the correct format that matches adminApi.ts
      const refundData = {
        refundAmount: parseFloat(refundAmount),
        refundStatus: "COMPLETED"
      };
      
      console.log('📤 Processing refund:', { bookingId: booking.id, data: refundData });
  
      const response = await processRefund(booking.id, refundData);
      
      console.log('📥 Refund response:', response);
      
      if (response.success) {
        alert('Refund processed successfully');
        setShowRefundModal(false);
        setRefundAmount('');
        setRefundReason('');
        
        // Refresh booking data
        const updatedBooking = await getBooking(params.id as string);
        if (updatedBooking.success) {
          setBooking(transformBookingData(updatedBooking.data));
        }
      } else {
        throw new Error(response.message || 'Failed to process refund');
      }
    } catch (err) {
      console.error('❌ Error processing refund:', err);
      alert('Failed to process refund: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProcessCancellation = async () => {
    setIsUpdating(true);
    try {
      const cancellationRequestId = booking.cancellationRequestId;
      
      if (!cancellationRequestId) {
        alert('No cancellation request found for this booking');
        return;
      }

      const cancellationData: any = {
        action: cancellationAction,
        adminNotes: adminNotes || undefined
      };

      if (cancellationAction !== 'REJECT') {
        cancellationData.refundAmount = parseFloat(refundAmount);
        cancellationData.rejectionReason = null;
      } else {
        cancellationData.rejectionReason = rejectionReason;
        cancellationData.refundAmount = null;
      }

      console.log('📤 Processing cancellation request:', { 
        cancellationRequestId, 
        data: cancellationData 
      });

      const response = await processCancellationRequest(cancellationRequestId, cancellationData);
      
      console.log('📥 Cancellation response:', response);
      
      if (response.success) {
        alert(`Cancellation request ${cancellationAction.replace('_', ' ').toLowerCase()} successfully`);
        setShowCancellationModal(false);
        setAdminNotes('');
        setRejectionReason('');
        setRefundAmount('');
        
        // Refresh booking data
        const updatedBooking = await getBooking(params.id as string);
        if (updatedBooking.success) {
          setBooking(transformBookingData(updatedBooking.data));
        }
      } else {
        throw new Error(response.message || 'Failed to process cancellation');
      }
    } catch (err) {
      console.error('❌ Error processing cancellation:', err);
      alert('Failed to process cancellation request: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendEmail = async (type: 'confirmation' | 'reminder' | 'cancellation') => {
    setIsUpdating(true);
    try {
      console.log(`📤 Sending ${type} email for booking:`, booking.id);
      
      const response = await sendBookingEmail(booking.id, type);
      
      console.log('📥 Email response:', response);
      
      if (response.success) {
        alert(`${type} email sent successfully`);
      } else {
        throw new Error(response.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('❌ Error sending email:', err);
      alert('Failed to send email: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewDisputeEvidence = async () => {
    try {
      console.log('📤 Fetching dispute evidence for booking:', booking.id);
      
      const response = await getBookingDisputeEvidence(booking.id);
      
      console.log('📥 Dispute evidence response:', response);
      
      if (response.success && response.data) {
        setDisputeEvidence(response.data);
        setShowDisputeModal(true);
      } else {
        alert('No dispute evidence found');
      }
    } catch (err) {
      console.error('❌ Error fetching dispute evidence:', err);
      alert('Failed to fetch dispute evidence: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!booking) return <div className="p-8 text-gray-500">Booking not found</div>;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header with back button and title */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
        </div>

        {/* Status Bar */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
              <p className="text-xl font-bold text-gray-900">{booking.bookingReference}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-full text-sm font-bold
                ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : ''}
                ${booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : ''}
                ${booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : ''}
                ${booking.status === 'FAILED' ? 'bg-gray-100 text-gray-700' : ''}
              `}>
                {booking.status}
              </div>
              <select
                value={booking.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isUpdating}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] disabled:opacity-50"
              >
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer & Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Name</p>
                  <p className="font-medium text-gray-900">{booking.customer}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="font-medium text-gray-900">{booking.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="font-medium text-gray-900">{booking.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Booking Date</p>
                  <p className="font-medium text-gray-900">{booking.date}</p>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip Details</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                    {booking.type.includes('FLIGHT') ? '✈️' : 
                     booking.type.includes('HOTEL') ? '🏨' : '🚗'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{booking.type}</p>
                    <p className="text-sm text-gray-500">Provider: {booking.source}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">From</p>
                    <p className="font-medium text-gray-900">{booking.from}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">To</p>
                    <p className="font-medium text-gray-900">{booking.to}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Departure</p>
                    <p className="font-medium text-gray-900">{booking.departure}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Arrival</p>
                    <p className="font-medium text-gray-900">{booking.arrival}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Passenger Details (if available) */}
            {booking.passengerInfo && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Passenger Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {booking.passengerInfo.firstName && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">First Name</p>
                      <p className="font-medium text-gray-900">{booking.passengerInfo.firstName}</p>
                    </div>
                  )}
                  {booking.passengerInfo.lastName && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Last Name</p>
                      <p className="font-medium text-gray-900">{booking.passengerInfo.lastName}</p>
                    </div>
                  )}
                  {booking.passengerInfo.title && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Title</p>
                      <p className="font-medium text-gray-900 capitalize">{booking.passengerInfo.title}</p>
                    </div>
                  )}
                  {booking.passengerInfo.gender && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Gender</p>
                      <p className="font-medium text-gray-900">{booking.passengerInfo.gender === 'm' ? 'Male' : 'Female'}</p>
                    </div>
                  )}
                  {booking.passengerInfo.dateOfBirth && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                      <p className="font-medium text-gray-900">{booking.passengerInfo.dateOfBirth}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Payment & Actions */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold text-gray-900">{booking.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-medium text-gray-900">{booking.paymentMethod}</span>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Payment Status</span>
                    <span className={`font-medium
                      ${booking.paymentStatus === 'COMPLETED' ? 'text-green-600' : ''}
                      ${booking.paymentStatus === 'PENDING' ? 'text-yellow-600' : ''}
                      ${booking.paymentStatus === 'FAILED' ? 'text-red-600' : ''}
                    `}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation Requests (if any) */}
            {cancellationRequests.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Cancellation Requests</h2>
                <div className="space-y-3">
                  {cancellationRequests.map((req: any) => (
                    <div key={req.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full
                          ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : ''}
                          ${req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : ''}
                        `}>
                          {req.status}
                        </span>
                      </div>
                      {req.reason && (
                        <div className="text-sm text-gray-600">Reason: {req.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={handleCancelBooking}
                  disabled={isUpdating || booking.status === 'CANCELLED'}
                  className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Cancel Booking
                </button>
                
                <button 
                  onClick={() => handleSendEmail('confirmation')}
                  disabled={isUpdating}
                  className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all disabled:opacity-50"
                >
                  Send Confirmation Email
                </button>
                
                <button 
                  onClick={() => handleSendEmail('reminder')}
                  disabled={isUpdating}
                  className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all disabled:opacity-50"
                >
                  Send Reminder Email
                </button>
                
                <button
                  onClick={() => setShowRefundModal(true)}
                  disabled={isUpdating || booking.status !== 'CANCELLED'}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Process Refund
                </button>

                {cancellationRequests.length > 0 && (
                  <button
                    onClick={() => setShowCancellationModal(true)}
                    disabled={isUpdating}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    Process Cancellation Request
                  </button>
                )}
                
                <button
                  onClick={handleViewDisputeEvidence}
                  className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all"
                >
                  View Dispute Evidence
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Refund Amount ({booking.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={booking.rawPrice}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Max refund: {booking.currency} {booking.rawPrice?.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  placeholder="Reason for refund"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleProcessRefund}
                  disabled={isUpdating || !refundAmount}
                  className="flex-1 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Process Refund
                </button>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Request Modal */}
      {showCancellationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Cancellation Request</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Action</label>
                <select
                  value={cancellationAction}
                  onChange={(e) => setCancellationAction(e.target.value as any)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                >
                  <option value="APPROVE_FULL_REFUND">Approve Full Refund</option>
                  <option value="APPROVE_PARTIAL_REFUND">Approve Partial Refund</option>
                  <option value="REJECT">Reject</option>
                </select>
              </div>

              {cancellationAction !== 'REJECT' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    Refund Amount ({booking.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={booking.rawPrice}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    placeholder="Enter amount"
                  />
                </div>
              )}

              {cancellationAction === 'REJECT' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    placeholder="Reason for rejection"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-2">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleProcessCancellation}
                  disabled={isUpdating || (cancellationAction === 'REJECT' ? !rejectionReason : !refundAmount)}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
                >
                  Process
                </button>
                <button
                  onClick={() => setShowCancellationModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Evidence Modal */}
      {showDisputeModal && disputeEvidence && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispute Evidence</h3>
            <pre className="bg-gray-50 p-4 rounded-xl text-xs overflow-auto">
              {JSON.stringify(disputeEvidence, null, 2)}
            </pre>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm hover:bg-gray-800 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}