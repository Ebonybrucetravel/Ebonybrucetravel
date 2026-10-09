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
    const leadPassenger = Array.isArray(apiData.passengerInfo)
      ? apiData.passengerInfo[0]
      : apiData.passengerInfo;

    const passengerName = leadPassenger
      ? `${leadPassenger.firstName} ${leadPassenger.lastName}`
      : apiData.user?.name || 'Guest';

    const pd = apiData.providerData || {};
    const bookingData = apiData.bookingData || {};
    const productType = apiData.productType || '';
    const isFlight = productType.includes('FLIGHT');
    const isHotel = productType === 'HOTEL';
    const isCar = productType === 'CAR_RENTAL';

    // ============ FLIGHT ============
    let from = 'N/A';
    let to = 'N/A';
    let departure = 'N/A';
    let arrival = 'N/A';
    let airlineName: string | null = null;
    let flightNumber: string | null = null; // ✅ declared ONCE
    let airlineCode: string | null = null;  // ✅ declared ONCE
    let pnrNumber = 'Not issued yet';

    if (isFlight) {
      const flightSummary =
        pd.FlightBookingSummary ||
        pd.FlightBookingResult?.FlightBookingSummaryModel ||
        null;
      const summaryModel = flightSummary?.FlightSummaryModel || flightSummary || {};
      const flightCombination =
        summaryModel.FlightCombination || flightSummary?.FlightCombination || {};
      const flightModels = flightCombination.FlightModels || summaryModel.FlightModels || [];

      const outbound = flightModels[0] || {};
      const legs = outbound.FlightLegs || [];
      const firstLeg = legs[0] || {};
      const lastLeg = legs[legs.length - 1] || firstLeg;

      from = outbound.DepartureCode || firstLeg.DepartureCode || 'N/A';
      to = outbound.ArrivalCode || lastLeg.DestinationCode || 'N/A';
      departure = outbound.DepartureTime || firstLeg.StartTime || 'N/A';
      arrival = outbound.ArrivalTime || lastLeg.EndTime || 'N/A';
      airlineName = outbound.AirlineName || firstLeg.AirlineName || null;
      airlineCode = outbound.Airline || firstLeg.AirlineCode || null;
      flightNumber = outbound.Name || outbound.FlightNumber || firstLeg.FlightNumber || null;

      pnrNumber =
        bookingData?.pnrReferenceNumber ||
        bookingData?.PnrReferenceNumber ||
        pd?.PnrReferenceNumber ||
        pd?.FlightBookingSummary?.PnrReferenceNumber ||
        'Not issued yet';
    }

    // ============ HOTEL ============
    let hotelName: string | null = null;
    let hotelAddress: string | null = null;
    let hotelCity: string | null = null;
    let hotelCountry: string | null = null;
    let checkInDate: string | null = null;
    let checkOutDate: string | null = null;
    let roomType: string | null = null;
    let boardType: string | null = null;
    let numberOfRooms: number | null = null;
    let totalGuests: number | null = null;

    if (isHotel) {
      const hotelDetails = bookingData.hotelDetails || {};
      hotelName = hotelDetails.hotelName || bookingData.hotelName || 'Hotel';
      hotelAddress = hotelDetails.hotelAddress || bookingData.hotelAddress || '';
      hotelCity = hotelDetails.hotelCity || bookingData.hotelCity || '';
      hotelCountry = hotelDetails.hotelCountry || bookingData.hotelCountry || '';
      checkInDate = bookingData.checkInDate || null;
      checkOutDate = bookingData.checkOutDate || null;
      roomType = hotelDetails.roomType || bookingData.roomType || 'Standard Room';
      boardType = hotelDetails.boardType || bookingData.boardType || 'Room Only';
      numberOfRooms = bookingData.totalRooms || hotelDetails.numberOfRooms || 1;
      totalGuests = Array.isArray(bookingData.guests)
        ? bookingData.guests.length
        : bookingData.guests || 1;
    }

    // ============ CAR RENTAL ============
    let pickupLocation: string | null = null;
    let dropoffLocation: string | null = null;
    let pickupDateTime: string | null = null;
    let dropoffDateTime: string | null = null;
    let vehicleType: string | null = null;
    let carProvider: string | null = null;
    let transferType: string | null = null;

    if (isCar) {
      const offer = bookingData.offerData || {};
      const start = offer.start || {};
      const end = offer.end || {};
      const vehicle = offer.vehicle || {};
      const provider = offer.serviceProvider || {};

      pickupLocation =
        start.locationCode ||
        bookingData.pickup_location ||
        bookingData.pickupLocation ||
        'N/A';

      dropoffLocation =
        end.locationCode ||
        bookingData.dropoff_location ||
        bookingData.dropoffLocation ||
        'N/A';

      const flatPickup = bookingData.flight_date
        ? `${bookingData.flight_date}T${bookingData.flight_time || '00:00'}:00`
        : null;
      const flatDropoff = flatPickup;

      pickupDateTime =
        start.dateTime || bookingData.pickupDateTime || flatPickup || 'N/A';
      dropoffDateTime =
        end.dateTime || bookingData.dropoffDateTime || flatDropoff || 'N/A';

      vehicleType =
        vehicle.description ||
        offer.vehicleType ||
        bookingData.vehicleType ||
        bookingData.transfer_type ||
        'N/A';

      carProvider =
        provider.name ||
        bookingData.serviceProvider ||
        bookingData.carProvider ||
        (bookingData.amadeus_offer_id ? 'Amadeus' : 'N/A');

      transferType =
        bookingData.transfer_type || offer.transferType || 'PRIVATE';

      // ✅ Reuse flightNumber and airlineCode declared at the top
      if (!flightNumber) {
        flightNumber = bookingData.flight_number || null;
      }
      if (!airlineCode) {
        airlineCode = bookingData.airline_code || null;
      }
    }

    // ============ PASSENGERS ============
    const providerTravellers = pd?.FlightBookingSummary?.TravellerDetails || [];
    const allPassengers: any[] = []; // ✅ NOW DECLARED

    if (Array.isArray(apiData.passengerInfo)) {
      allPassengers.push(...apiData.passengerInfo);
    } else if (apiData.passengerInfo) {
      allPassengers.push(apiData.passengerInfo);
    }

    if (allPassengers.length === 0 && providerTravellers.length > 0) {
      for (const t of providerTravellers) {
        allPassengers.push({
          firstName: t.FirstName,
          lastName: t.LastName,
          title: t.Title,
          gender: t.Gender,
          dateOfBirth: t.DateOfBirth,
          passengerType: t.PassengerType,
          email: t.Email,
          phone: t.PhoneNumber,
        });
      }
    }

    // Hotel guests fallback
    if (allPassengers.length === 0 && isHotel && Array.isArray(bookingData.guests)) {
      for (const g of bookingData.guests) {
        allPassengers.push({
          firstName: g.name?.firstName || '',
          lastName: g.name?.lastName || '',
          title: g.name?.title || '',
          email: g.contact?.email,
          phone: g.contact?.phone,
        });
      }
    }

    // Car passengers fallback
    if (allPassengers.length === 0 && isCar && Array.isArray(bookingData.passengers)) {
      for (const p of bookingData.passengers) {
        allPassengers.push({
          firstName: p.name?.firstName || '',
          lastName: p.name?.lastName || '',
          title: p.name?.title || '',
          email: p.contact?.email,
          phone: p.contact?.phone,
        });
      }
    }

    return {
      id: apiData.id,
      type: productType.replace(/_/g, ' ') || 'Booking',
      source: apiData.provider || 'Unknown',
      customer: passengerName,
      email: leadPassenger?.email || apiData.user?.email,
      phone: leadPassenger?.phone || apiData.user?.phone,
      price: apiData.totalAmount
        ? `${apiData.currency || '$'}${apiData.totalAmount.toLocaleString()}`
        : '$0.00',
      rawPrice: apiData.totalAmount,
      status: apiData.status || 'Pending',
      paymentStatus: apiData.paymentStatus || 'N/A',
      date: apiData.createdAt
        ? new Date(apiData.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })
        : 'N/A',
      bookingReference: apiData.reference || apiData.id,
      productType,
      provider: apiData.provider,
      currency: apiData.currency || 'USD',

      // Flight fields
      from, to, departure, arrival,
      airlineName, flightNumber, pnrNumber, airlineCode,

      // Hotel fields
      hotelName, hotelAddress, hotelCity, hotelCountry,
      checkInDate, checkOutDate, roomType, boardType,
      numberOfRooms, totalGuests,

      // Car fields
      pickupLocation, dropoffLocation, pickupDateTime, dropoffDateTime,
      vehicleType, carProvider, transferType,

      // Common
      paymentMethod: apiData.paymentMethod || 'Credit Card',
      passengerInfo: leadPassenger,
      allPassengers,
      bookingData: apiData.bookingData,
      providerData: apiData.providerData,
      cancellationRequests: apiData.cancellationRequests || [],
      cancellationRequestId: apiData.cancellationRequests?.[0]?.id,
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
                {/* Product Type Badge */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    {booking.productType?.includes('FLIGHT') && (
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    {booking.productType === 'HOTEL' && (
                      <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
                      </svg>
                    )}
                    {booking.productType === 'CAR_RENTAL' && (
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{booking.type}</p>
                    <p className="text-sm text-gray-500">Provider: {booking.source}</p>
                  </div>
                </div>

                {/* ============ FLIGHT LAYOUT ============ */}
                {booking.productType?.includes('FLIGHT') && (
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
                      <p className="font-medium text-gray-900">
                        {booking.departure && booking.departure !== 'N/A'
                          ? new Date(booking.departure).toLocaleString('en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Arrival</p>
                      <p className="font-medium text-gray-900">
                        {booking.arrival && booking.arrival !== 'N/A'
                          ? new Date(booking.arrival).toLocaleString('en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    {booking.airlineName && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Airline</p>
                        <p className="font-medium text-gray-900">{booking.airlineName}</p>
                      </div>
                    )}
                    {booking.flightNumber && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Flight Number</p>
                        <p className="font-medium text-gray-900">{booking.flightNumber}</p>
                      </div>
                    )}
                    <div className="col-span-2 mt-2 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Airline PNR Number</p>
                      <p className="font-mono font-bold text-[#33a8da]">
                        {booking.pnrNumber || 'Not issued yet'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ============ HOTEL LAYOUT ============ */}
                {booking.productType === 'HOTEL' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Hotel Name</p>
                        <p className="font-medium text-gray-900">
                          {booking.hotelName || 'Hotel'}
                        </p>
                      </div>
                      {booking.hotelAddress && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Address</p>
                          <p className="font-medium text-gray-900">
                            {booking.hotelAddress}
                            {booking.hotelCity ? `, ${booking.hotelCity}` : ''}
                            {booking.hotelCountry ? `, ${booking.hotelCountry}` : ''}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Check-in</p>
                        <p className="font-medium text-gray-900">
                          {booking.checkInDate
                            ? new Date(booking.checkInDate).toLocaleDateString('en-GB', {
                                dateStyle: 'medium',
                              })
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Check-out</p>
                        <p className="font-medium text-gray-900">
                          {booking.checkOutDate
                            ? new Date(booking.checkOutDate).toLocaleDateString('en-GB', {
                                dateStyle: 'medium',
                              })
                            : 'N/A'}
                        </p>
                      </div>
                      {booking.roomType && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Room Type</p>
                          <p className="font-medium text-gray-900">{booking.roomType}</p>
                        </div>
                      )}
                      {booking.boardType && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Board Type</p>
                          <p className="font-medium text-gray-900">{booking.boardType}</p>
                        </div>
                      )}
                      {booking.numberOfRooms && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Rooms</p>
                          <p className="font-medium text-gray-900">{booking.numberOfRooms}</p>
                        </div>
                      )}
                      {booking.totalGuests && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Guests</p>
                          <p className="font-medium text-gray-900">{booking.totalGuests}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                                {/* ============ CAR RENTAL LAYOUT ============ */}
                                {booking.productType === 'CAR_RENTAL' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs font-bold text-blue-700 uppercase mb-2">Pickup</p>
                      <p className="font-bold text-lg">{booking.pickupLocation || 'N/A'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.pickupDateTime && booking.pickupDateTime !== 'N/A'
                          ? new Date(booking.pickupDateTime).toLocaleString('en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Date & time TBD'}
                      </p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-xs font-bold text-green-700 uppercase mb-2">Dropoff</p>
                      <p className="font-bold text-lg">{booking.dropoffLocation || 'N/A'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.dropoffDateTime && booking.dropoffDateTime !== 'N/A'
                          ? new Date(booking.dropoffDateTime).toLocaleString('en-GB', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Date & time TBD'}
                      </p>
                    </div>

                    {booking.vehicleType && booking.vehicleType !== 'N/A' && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Vehicle / Transfer Type</p>
                        <p className="font-medium text-gray-900">{booking.vehicleType}</p>
                      </div>
                    )}
                    {booking.carProvider && booking.carProvider !== 'N/A' && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Provider</p>
                        <p className="font-medium text-gray-900">{booking.carProvider}</p>
                      </div>
                    )}
                    {booking.flightNumber && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Flight Number</p>
                        <p className="font-medium text-gray-900">{booking.flightNumber}</p>
                      </div>
                    )}
                    {booking.airlineCode && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Airline Code</p>
                        <p className="font-medium text-gray-900">{booking.airlineCode}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Passenger Details (if available) */}
            {booking.allPassengers && booking.allPassengers.length > 0 && (
              <div className="space-y-6">
                {booking.allPassengers.map((p: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {booking.allPassengers.length > 1
  ? `${booking.productType === 'HOTEL' ? 'Guest' : 'Passenger'} #${idx + 1} (${p.passengerType || p.type || 'Adult'})`
  : booking.productType === 'HOTEL' ? 'Guest Details' : 'Passenger Details'}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {p.firstName && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">First Name</p>
                          <p className="font-medium text-gray-900">{p.firstName}</p>
                        </div>
                      )}
                      {p.lastName && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Last Name</p>
                          <p className="font-medium text-gray-900">{p.lastName}</p>
                        </div>
                      )}
                      {p.title && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Title</p>
                          <p className="font-medium text-gray-900 capitalize">{p.title}</p>
                        </div>
                      )}
                      {p.gender && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Gender</p>
                          <p className="font-medium text-gray-900">{p.gender === 'm' || p.gender === 'Male' ? 'Male' : 'Female'}</p>
                        </div>
                      )}
                      {p.dateOfBirth && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                          <p className="font-medium text-gray-900">{p.dateOfBirth}</p>
                        </div>
                      )}
                      {p.passengerType && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Type</p>
                          <p className="font-medium text-gray-900">{p.passengerType}</p>
                        </div>
                      )}
                      {p.passportNumber && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Passport Number</p>
                          <p className="font-medium text-gray-900">{p.passportNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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