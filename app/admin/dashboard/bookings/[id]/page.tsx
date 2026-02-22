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
  getBookingDisputeEvidence 
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
      price: apiData.totalAmount ? `$${apiData.totalAmount.toLocaleString()}` : '$0.00',
      rawPrice: apiData.totalAmount,
      status: apiData.status || 'Pending',
      date: apiData.createdAt ? new Date(apiData.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      }) : 'N/A',
      bookingReference: apiData.reference || apiData.id,
      from: apiData.bookingData?.from || 'N/A',
      to: apiData.bookingData?.to || 'N/A',
      departure: apiData.bookingData?.departureDate || 'N/A',
      arrival: apiData.bookingData?.returnDate || 'N/A',
      paymentMethod: apiData.paymentMethod || 'Credit Card',
      currency: apiData.currency || 'USD',
    };
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await updateBookingStatus(booking.id, newStatus);
      if (response.success) {
        setBooking({ ...booking, status: newStatus });
        alert(`Booking status updated to ${newStatus}`);
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update booking status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    setIsUpdating(true);
    try {
      const response = await cancelBooking(booking.id, 'Cancelled by admin');
      if (response.success) {
        setBooking({ ...booking, status: 'Cancelled' });
        alert('Booking cancelled successfully');
      } else {
        throw new Error(response.message || 'Failed to cancel booking');
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Failed to cancel booking');
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
      const response = await processRefund(booking.id, {
        amount: parseFloat(refundAmount),
        reason: refundReason || 'Refund requested'
      });
      if (response.success) {
        alert('Refund processed successfully');
        setShowRefundModal(false);
        setRefundAmount('');
        setRefundReason('');
      } else {
        throw new Error(response.message || 'Failed to process refund');
      }
    } catch (err) {
      console.error('Error processing refund:', err);
      alert('Failed to process refund');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendEmail = async (type: 'confirmation' | 'reminder' | 'cancellation') => {
    setIsUpdating(true);
    try {
      const response = await sendBookingEmail(booking.id, type);
      if (response.success) {
        alert(`${type} email sent successfully`);
      } else {
        throw new Error(response.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Failed to send email');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewDisputeEvidence = async () => {
    try {
      const response = await getBookingDisputeEvidence(booking.id);
      if (response.success && response.data) {
        // Handle dispute evidence display
        console.log('Dispute evidence:', response.data);
        // You could open a modal or navigate to a dispute page
      } else {
        alert('No dispute evidence found');
      }
    } catch (err) {
      console.error('Error fetching dispute evidence:', err);
      alert('Failed to fetch dispute evidence');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!booking) return <div className="p-8 text-gray-500">Booking not found</div>;

  // ... rest of your JSX remains the same, but update the action buttons:

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* ... existing header and navigation ... */}

      {/* Update the status dropdown */}
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
      </select>

      {/* Update the action buttons at the bottom */}
      <div className="flex gap-3">
        <button 
          onClick={handleCancelBooking}
          disabled={isUpdating || booking.status === 'CANCELLED'}
          className="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
        >
          Cancel Booking
        </button>
        <button 
          onClick={() => handleSendEmail('confirmation')}
          disabled={isUpdating}
          className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all disabled:opacity-50"
        >
          Send Email
        </button>
      </div>

      {/* Add Refund Button */}
      <button
        onClick={() => setShowRefundModal(true)}
        disabled={isUpdating || booking.status !== 'CANCELLED'}
        className="w-full mt-3 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50"
      >
        Process Refund
      </button>

      {/* Add Dispute Evidence Button */}
      <button
        onClick={handleViewDisputeEvidence}
        className="w-full mt-3 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all"
      >
        View Dispute Evidence
      </button>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">Refund Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  placeholder="Enter amount"
                />
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
    </div>
  );
}