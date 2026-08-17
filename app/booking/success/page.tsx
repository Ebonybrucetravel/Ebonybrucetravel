"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { config } from '@/lib/config';
import { formatPrice } from '@/lib/utils';
import type { Booking as BookingType } from '@/lib/types';
import { ticketWakanowPNR } from '@/lib/wakanow-api';

// Helper function to get airport name
const getAirportName = (code: string): string => {
  const airports: Record<string, string> = {
    'LOS': 'Murtala Muhammed International Airport, Lagos',
    'ABV': 'Nnamdi Azikiwe International Airport, Abuja',
    'PHC': 'Port Harcourt International Airport',
    'KAN': 'Mallam Aminu Kano International Airport',
    'ENU': 'Akanu Ibiam International Airport, Enugu',
    'QOW': 'Sam Mbakwe Airport, Owerri',
    'BNI': 'Benin Airport',
    'JOS': 'Yakubu Gowon Airport, Jos',
    'KAD': 'Kaduna Airport',
    'YOL': 'Yola Airport',
    'LHR': 'London Heathrow Airport',
    'JFK': 'John F. Kennedy International Airport, New York',
    'CDG': 'Charles de Gaulle Airport, Paris',
    'DXB': 'Dubai International Airport',
    'IST': 'Istanbul Airport',
    'FRA': 'Frankfurt Airport',
    'AMS': 'Amsterdam Schiphol Airport',
  };
  return airports[code] || code;
};

// Helper function to format date
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Helper function to format time
const formatTime = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

// Helper function to calculate nights
const calculateNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 1;
  try {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  } catch {
    return 1;
  }
};

// Helper function to calculate rental days
const calculateRentalDays = (pickup: string, dropoff: string): number => {
  if (!pickup || !dropoff) return 1;
  try {
    const start = new Date(pickup);
    const end = new Date(dropoff);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  } catch {
    return 1;
  }
};

export default function BookingSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get('id');
  const bookingRef = params.get('ref');
  const emailParam = params.get('email');

  const [booking, setBooking] = useState<BookingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  // Wakanow ticket issuance state
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [pnrNumber, setPnrNumber] = useState('');
  const [issuingTicket, setIssuingTicket] = useState(false);

  const BASE_URL = config.apiBaseUrl;

  // Define fetch functions
  const fetchAuthBooking = async (id: string) => {
    setLoading(true);
    try {
      console.log('Fetching authenticated booking:', id);
      const token = api.getStoredAuthToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${BASE_URL}/api/v1/bookings/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch booking: ${response.status}`);
      }
      
      const result = await response.json();
      const bookingData = result?.data?.booking || result?.data || result;
      
      if (!bookingData) {
        throw new Error('No booking data found');
      }
      
      setBooking(bookingData);
      console.log('Auth booking fetched:', bookingData);
      
    } catch (err: any) {
      console.error('Failed to fetch auth booking:', err);
      
      if (err.message?.includes('401') || err.status === 401) {
        setError('Your session has expired. Please sign in again.');
      } else if (err.message?.includes('404') || err.status === 404) {
        setError('Booking not found');
      } else {
        setError(err.message || 'Unable to load booking details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestBooking = async (ref: string, emailAddress: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${BASE_URL}/api/v1/bookings/public/by-reference/${encodeURIComponent(ref)}?email=${encodeURIComponent(emailAddress)}`;
      console.log('Fetching guest booking with email:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch booking: ${response.status}`);
      }
      
      const result = await response.json();
      const bookingData = result?.data ?? result ?? null;
      
      if (!bookingData) {
        throw new Error('No booking data found');
      }
      
      setBooking(bookingData);
      setEmail(emailAddress);
      localStorage.setItem('guestEmail', emailAddress);
      console.log('Guest booking fetched successfully:', bookingData);
      
    } catch (err: any) {
      console.error('Failed to fetch guest booking:', err);
      setError('Unable to load booking. Please check your reference and email.');
      setShowEmailForm(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBooking = async () => {
      const token = api.getStoredAuthToken();
      const isAuthenticated = !!token;
      
      console.log('Auth status:', { isAuthenticated, token: !!token });
      console.log('URL params:', { bookingId, bookingRef, emailParam });

      // CASE 1: Authenticated user with ID
      if (isAuthenticated && bookingId) {
        console.log('📱 Authenticated user fetching by ID:', bookingId);
        setIsGuest(false);
        await fetchAuthBooking(bookingId);
        return;
      }
      
      // CASE 2: Authenticated user with reference
      if (isAuthenticated && bookingRef) {
        console.log('📱 Authenticated user fetching by reference:', bookingRef);
        setIsGuest(false);
        try {
          const response = await fetch(`${BASE_URL}/api/v1/bookings/${bookingRef}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            const bookingData = result?.data?.booking || result?.data || result;
            if (bookingData) {
              setBooking(bookingData);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.log('Fetch by reference failed:', err);
        }
        
        if (emailParam) {
          await fetchGuestBooking(bookingRef, emailParam);
        } else {
          setShowEmailForm(true);
          setLoading(false);
        }
        return;
      }
      
      // CASE 3: Guest user with reference
      if (bookingRef) {
        console.log('👤 Guest user fetching by reference:', bookingRef);
        setIsGuest(true);
        
        const storedEmail = localStorage.getItem('guestEmail') || sessionStorage.getItem('guestEmail');
        const urlEmail = emailParam;
        
        if (urlEmail) {
          setEmail(urlEmail);
          localStorage.setItem('guestEmail', urlEmail);
          await fetchGuestBooking(bookingRef, urlEmail);
        } else if (storedEmail) {
          setEmail(storedEmail);
          await fetchGuestBooking(bookingRef, storedEmail);
        } else {
          setShowEmailForm(true);
          setLoading(false);
        }
        return;
      }
      
      // CASE 4: Fallback
      if (bookingId) {
        console.log('⚠️ Attempting to fetch by ID without auth');
        setError('Please sign in to view this booking');
        setLoading(false);
      } else {
        setError('Missing booking ID or reference');
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, bookingRef, emailParam]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && bookingRef) {
      setLoading(true);
      setShowEmailForm(false);
      setError(null);
      
      try {
        localStorage.setItem('guestEmail', email);
        await fetchGuestBooking(bookingRef, email);
      } catch (err: any) {
        console.error('Failed to fetch booking:', err);
        setError('Unable to load booking. Please check your reference and email.');
        setShowEmailForm(true);
      } finally {
        setLoading(false);
      }
    }
  };

// In handleIssueWakanowTicket, use the correct booking ID
const handleIssueWakanowTicket = async () => {
  if (!pnrNumber) {
    alert('Please enter PNR number');
    return;
  }
  
  if (!booking) {
    alert('Booking not found');
    return;
  }
  
  // Use the booking ID from the booking object
  const bookingIdValue = booking.id;
  if (!bookingIdValue) {
    alert('Booking ID not found. Please refresh the page and try again.');
    return;
  }
  
  try {
    setIssuingTicket(true);
    console.log('Issuing ticket for booking:', bookingIdValue, 'PNR:', pnrNumber);
    
    // The PNR should be 7F66FV
    const response = await ticketWakanowPNR(bookingIdValue, pnrNumber);
    console.log('Ticket response:', response);
    
    if (response.success !== false) {
      alert('Ticket issued successfully!');
      setShowTicketForm(false);
      setPnrNumber('');
      
      // Refresh booking data
      await fetchAuthBooking(bookingIdValue);
    } else {
      const errorMsg = (response as any)?.error || response?.message || 'Failed to issue ticket';
      alert(errorMsg);
    }
  } catch (error: any) {
    console.error('Issue ticket error:', error);
    alert(error.message || 'Failed to issue ticket. Please check the PNR number and try again.');
  } finally {
    setIssuingTicket(false);
  }
};

// ==================== RENDER DUFFEL FLIGHT DETAILS ====================
const renderDuffelDetails = () => {
  if (!booking) return null;
  
  const isDuffel = booking?.provider === 'DUFFEL';
  if (!isDuffel) return null;
  
  const bookingData = booking.bookingData as any;
  const providerData = booking.providerData as any;
  
  // Extract Duffel order data
  const duffelOrder = bookingData?.duffelOrder || providerData || {};
  
  // Get slices from the order
  const slices = duffelOrder.slices || bookingData?.slices || [];
  const outboundSlice = slices[0] || {};
  const returnSlice = slices[1] || null;
  
  // Get passengers
  const passengers = duffelOrder.passengers || bookingData?.passengers || [];
  
  // Extract outbound segments
  const outboundSegments = outboundSlice.segments || [];
  const firstOutboundSegment = outboundSegments[0] || {};
  const lastOutboundSegment = outboundSegments[outboundSegments.length - 1] || firstOutboundSegment;
  
  // Extract return segments if exists
  const returnSegments = returnSlice?.segments || [];
  const firstReturnSegment = returnSegments[0] || {};
  const lastReturnSegment = returnSegments[returnSegments.length - 1] || firstReturnSegment;
  
  // Outbound flight details
  const outboundDepartureAirport = firstOutboundSegment.origin?.iata_code || firstOutboundSegment.origin?.iataCode || 'N/A';
  const outboundDepartureCity = firstOutboundSegment.origin?.city_name || firstOutboundSegment.origin?.city || '';
  const outboundDepartureTime = firstOutboundSegment.departing_at || firstOutboundSegment.departure?.at || '';
  
  const outboundArrivalAirport = lastOutboundSegment.destination?.iata_code || lastOutboundSegment.destination?.iataCode || 'N/A';
  const outboundArrivalCity = lastOutboundSegment.destination?.city_name || lastOutboundSegment.destination?.city || '';
  const outboundArrivalTime = lastOutboundSegment.arriving_at || lastOutboundSegment.arrival?.at || '';
  
  // Operating carrier
  const operatingCarrier = firstOutboundSegment.operating_carrier || firstOutboundSegment.marketing_carrier || {};
  const airlineName = operatingCarrier.name || 'Airline';
  const airlineCode = operatingCarrier.iata_code || '';
  const airlineLogo = operatingCarrier.logo_symbol_url || '';
  
  // Flight number
  const flightNumber = firstOutboundSegment.marketing_carrier_flight_number || 
                      firstOutboundSegment.flight_number || 
                      firstOutboundSegment.number || 
                      'N/A';
  
  // Duration
  const outboundDuration = outboundSlice.duration || '';
  const returnDuration = returnSlice?.duration || '';
  
  // Stops
  const outboundStops = Math.max(0, outboundSegments.length - 1);
  const returnStops = returnSegments.length > 0 ? Math.max(0, returnSegments.length - 1) : 0;
  
  const outboundStopText = outboundStops === 0 ? 'Direct' : outboundStops === 1 ? '1 stop' : `${outboundStops} stops`;
  const returnStopText = returnStops === 0 ? 'Direct' : returnStops === 1 ? '1 stop' : `${returnStops} stops`;
  
  // Check if this is a round trip
  const isRoundTrip = slices.length > 1;
  
  // Get order ID
  const orderId = duffelOrder.id || booking.providerBookingId || 'N/A';
  
  // Get booking reference from Duffel
  const duffelBookingRef = duffelOrder.booking_reference || duffelOrder.reference || 'N/A';
  
  // Get cabin class
  let cabinClass = 'Economy';
  if (firstOutboundSegment.passengers?.length > 0) {
    cabinClass = firstOutboundSegment.passengers[0].cabin_class_marketing_name || 
                 firstOutboundSegment.passengers[0].cabin_class || 
                 'Economy';
  }
  
  // ✅ FIX: Add type annotations to the filter and reduce callbacks
  let baggageInfo = '';
  if (firstOutboundSegment.passengers?.length > 0) {
    const baggages = firstOutboundSegment.passengers[0].baggages || [];
    if (baggages.length > 0) {
      const checkedBags = baggages.filter((b: any) => b.type === 'checked');
if (checkedBags.length > 0) {
  baggageInfo = `${checkedBags.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0)} checked bag${checkedBags.length > 1 ? 's' : ''}`;
}
    }
  }
  
  // Get passenger count
  const passengerCount = passengers.length || 1;
  
  // Get total amount
  const totalAmount = duffelOrder.total_amount || booking.totalAmount || 0;
  const currency = duffelOrder.total_currency || booking.currency || 'GBP';
  
  // Get conditions
  const isRefundable = duffelOrder.conditions?.refund_before_departure?.allowed || false;
  
  return (
    <div className="space-y-6">
      {/* Provider Badge */}
      <div className="bg-gradient-to-r from-[#33a8da] to-[#2c98c7] text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Powered by</p>
            <p className="font-bold text-xl">Duffel • Flight</p>
          </div>
          <div className="text-3xl">✈️</div>
        </div>
      </div>
      
      {/* Order ID and Reference */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="font-mono font-bold text-md text-blue-600 break-all">{orderId}</p>
          </div>
          {duffelBookingRef !== 'N/A' && (
            <div>
              <p className="text-sm text-gray-500">Booking Reference</p>
              <p className="font-mono font-bold text-md">{duffelBookingRef}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Passengers</p>
            <p className="font-medium">{passengerCount} passenger{passengerCount > 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cabin Class</p>
            <p className="font-medium capitalize">{cabinClass}</p>
          </div>
        </div>
      </div>
      
      {/* Outbound Flight */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Outbound Flight</h4>
          <span className="text-sm text-gray-500">{outboundDuration}</span>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          {airlineLogo ? (
            <img src={airlineLogo} alt={airlineName} className="w-12 h-12 object-contain" />
          ) : (
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">{airlineCode || '✈'}</span>
            </div>
          )}
          <div>
            <p className="font-semibold">{airlineName}</p>
            <p className="text-sm text-gray-500">Flight {flightNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-gray-900">{formatTime(outboundDepartureTime)}</p>
            <p className="font-bold text-lg">{outboundDepartureAirport}</p>
            <p className="text-sm text-gray-500 truncate max-w-[120px] mx-auto">{outboundDepartureCity || getAirportName(outboundDepartureAirport)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(outboundDepartureTime)}</p>
          </div>

          {/* Arrow */}
          <div className="flex-1 px-4">
            <div className="relative">
              <div className="border-t-2 border-gray-300 border-dashed absolute w-full top-1/2"></div>
              <div className="flex justify-center">
                <svg className="w-8 h-8 text-gray-400 bg-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              {outboundDuration} • {outboundStopText}
            </p>
            {outboundStops > 0 && outboundSegments.length > 1 && (
              <p className="text-center text-xs text-gray-400 mt-1">
                {outboundSegments.map((seg: any, i: number) => (
                  <span key={i}>
                    {seg.origin?.iata_code || seg.origin?.iataCode || '??'}
                    {i < outboundSegments.length - 1 && ' → '}
                  </span>
                ))}
              </p>
            )}
          </div>

          {/* Arrival */}
          <div className="text-center flex-1">
            <p className="text-2xl font-bold text-gray-900">{formatTime(outboundArrivalTime)}</p>
            <p className="font-bold text-lg">{outboundArrivalAirport}</p>
            <p className="text-sm text-gray-500 truncate max-w-[120px] mx-auto">{outboundArrivalCity || getAirportName(outboundArrivalAirport)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(outboundArrivalTime)}</p>
          </div>
        </div>
        
        {/* Baggage info */}
        {baggageInfo && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 border-t border-gray-100 pt-3">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={1.5} />
            </svg>
            <span>{baggageInfo}</span>
          </div>
        )}
      </div>

      {/* Return Flight (if exists) */}
      {isRoundTrip && returnSlice && returnSegments.length > 0 && (
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Return Flight</h4>
            <span className="text-sm text-gray-500">{returnDuration}</span>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            {airlineLogo ? (
              <img src={airlineLogo} alt={airlineName} className="w-12 h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">{airlineCode || '✈'}</span>
              </div>
            )}
            <div>
              <p className="font-semibold">{airlineName}</p>
              <p className="text-sm text-gray-500">Flight {firstReturnSegment.marketing_carrier_flight_number || firstReturnSegment.flight_number || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-gray-900">{formatTime(firstReturnSegment.departing_at || firstReturnSegment.departure?.at)}</p>
              <p className="font-bold text-lg">{firstReturnSegment.origin?.iata_code || firstReturnSegment.origin?.iataCode || 'N/A'}</p>
              <p className="text-sm text-gray-500 truncate max-w-[120px] mx-auto">{firstReturnSegment.origin?.city_name || firstReturnSegment.origin?.city || ''}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(firstReturnSegment.departing_at || firstReturnSegment.departure?.at)}</p>
            </div>

            <div className="flex-1 px-4">
              <div className="relative">
                <div className="border-t-2 border-gray-300 border-dashed absolute w-full top-1/2"></div>
                <div className="flex justify-center">
                  <svg className="w-8 h-8 text-gray-400 bg-white rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {returnDuration} • {returnStopText}
              </p>
              {returnStops > 0 && returnSegments.length > 1 && (
                <p className="text-center text-xs text-gray-400 mt-1">
                  {returnSegments.map((seg: any, i: number) => (
                    <span key={i}>
                      {seg.origin?.iata_code || seg.origin?.iataCode || '??'}
                      {i < returnSegments.length - 1 && ' → '}
                    </span>
                  ))}
                </p>
              )}
            </div>

            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-gray-900">{formatTime(lastReturnSegment.arriving_at || lastReturnSegment.arrival?.at)}</p>
              <p className="font-bold text-lg">{lastReturnSegment.destination?.iata_code || lastReturnSegment.destination?.iataCode || 'N/A'}</p>
              <p className="text-sm text-gray-500 truncate max-w-[120px] mx-auto">{lastReturnSegment.destination?.city_name || lastReturnSegment.destination?.city || ''}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(lastReturnSegment.arriving_at || lastReturnSegment.arrival?.at)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Refundable status */}
      {/* Refundable status */}
<div className={`p-4 rounded-lg ${isRefundable ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
  <div className="flex items-start gap-2">
    {isRefundable ? (
      <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ) : (
      <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    )}
    <div>
      <p className={`font-medium ${isRefundable ? 'text-green-800' : 'text-gray-700'}`}>
        {isRefundable ? 'Refundable' : 'Non-Refundable'}
      </p>
      {isRefundable && duffelOrder.conditions?.refund_before_departure?.penalty_amount && (
        <p className="text-sm text-green-700 mt-1">
          Penalty: {duffelOrder.conditions.refund_before_departure.penalty_amount} {duffelOrder.conditions.refund_before_departure.penalty_currency}
        </p>
      )}
    </div>
  </div>
</div>
    </div>
  );
};



  // ==================== RENDER HOTEL DETAILS (UNCHANGED - AMADEUS) ====================
  const renderHotelDetails = () => {
    if (!booking) return null;
    
    const isHotel = booking.productType === 'HOTEL';
    if (!isHotel) return null;
    
    const bookingData = booking.bookingData as any;
    
    // Extract hotel details from the correct location
    const hotelDetails = bookingData?.hotelDetails || {};
    
    const hotelName = 
      hotelDetails?.hotelName || 
      bookingData?.hotelName || 
      bookingData?.hotel?.name || 
      'Hotel';
    
    const hotelAddress = 
      hotelDetails?.hotelAddress || 
      bookingData?.hotelAddress || 
      '';
    
    const hotelCity = 
      hotelDetails?.hotelCity || 
      bookingData?.hotelCity || 
      '';
    
    const hotelCountry = 
      hotelDetails?.hotelCountry || 
      bookingData?.hotelCountry || 
      '';
    
    const hotelRating = 
      hotelDetails?.hotelRating || 
      bookingData?.hotelRating || 
      null;
    
    const hotelDescription = 
      hotelDetails?.hotelDescription || 
      bookingData?.hotelDescription || 
      '';
    
    const hotelPhone = 
      hotelDetails?.hotelPhone || 
      bookingData?.hotelPhone || 
      '';
    
    const roomType = 
      hotelDetails?.roomType || 
      bookingData?.roomType || 
      'Standard Room';
    
    const boardType = 
      hotelDetails?.boardType || 
      bookingData?.boardType || 
      'Room Only';
    
    const numberOfRooms = 
      hotelDetails?.numberOfRooms || 
      bookingData?.numberOfRooms || 
      1;
    
    const hotelCheckInTime = 
      hotelDetails?.hotelCheckInTime || 
      bookingData?.hotelCheckInTime || 
      '15:00';
    
    const hotelCheckOutTime = 
      hotelDetails?.hotelCheckOutTime || 
      bookingData?.hotelCheckOutTime || 
      '12:00';
    
    const hotelId = 
      hotelDetails?.hotelId || 
      bookingData?.hotelId || 
      bookingData?.hotel?.hotelId || 
      booking.id;
    
    const hotelOfferId = 
      bookingData?.amadeus_offer_id || 
      bookingData?.offerId || 
      bookingData?.hotelOfferId || 
      'N/A';
    
    const checkInDate = 
      bookingData?.checkInDate || 
      bookingData?.check_in_date;
    
    const checkOutDate = 
      bookingData?.checkOutDate || 
      bookingData?.check_out_date;
    
    let guestsCount = 1;
    if (bookingData?.guests) {
      if (typeof bookingData.guests === 'number') {
        guestsCount = bookingData.guests;
      } else if (typeof bookingData.guests === 'object' && !Array.isArray(bookingData.guests)) {
        guestsCount = bookingData.guests.adults || bookingData.guests.guests || 1;
      } else if (Array.isArray(bookingData.guests)) {
        guestsCount = bookingData.guests.length;
      }
    } else if (bookingData?.adults && typeof bookingData.adults === 'number') {
      guestsCount = bookingData.adults;
    }
    
    let roomsCount = 1;
    if (bookingData?.rooms) {
      if (typeof bookingData.rooms === 'number') {
        roomsCount = bookingData.rooms;
      } else if (typeof bookingData.rooms === 'object') {
        roomsCount = bookingData.rooms.rooms || 1;
      }
    } else if (bookingData?.roomQuantity && typeof bookingData.roomQuantity === 'number') {
      roomsCount = bookingData.roomQuantity;
    }
    
    const nights = calculateNights(checkInDate, checkOutDate);
    
    const providerOrderId = (booking.providerData as any)?.id || (booking.providerData as any)?.orderId || 'N/A';
    const providerConfirmationNumber = (booking.providerData as any)?.hotelBookings?.[0]?.hotelProviderInformation?.[0]?.confirmationNumber || 'N/A';
    
    const fullAddress = hotelAddress || 
      (hotelCity && hotelCountry ? `${hotelCity}, ${hotelCountry}` : 
      hotelCity || hotelCountry || '');
    
    return (
      <div className="space-y-6">
        {/* Provider Badge */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Powered by</p>
              <p className="font-bold text-xl">Amadeus Hotels</p>
            </div>
            <div className="text-3xl">🏨</div>
          </div>
        </div>
        
        {/* Hotel Name */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-2xl font-bold text-gray-900">{hotelName}</h3>
          {fullAddress && (
            <p className="text-sm text-gray-600 mt-1">{fullAddress}</p>
          )}
          {hotelRating && (
            <p className="text-sm text-gray-500 mt-1">
              {'⭐'.repeat(Math.round(hotelRating))} {hotelRating}/5
            </p>
          )}
          {hotelId && <p className="text-sm text-gray-400 mt-1">Hotel ID: {hotelId}</p>}
        </div>
        
        {/* Hotel Offer ID */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Hotel Offer ID</p>
              <p className="font-mono font-bold text-md text-blue-600 break-all">{hotelOfferId}</p>
            </div>
            {providerOrderId !== 'N/A' && (
              <div>
                <p className="text-sm text-gray-500">Amadeus Order ID</p>
                <p className="font-mono font-bold text-md break-all">{providerOrderId}</p>
              </div>
            )}
            {providerConfirmationNumber !== 'N/A' && (
              <div>
                <p className="text-sm text-gray-500">Confirmation Number</p>
                <p className="font-mono font-bold text-md">{providerConfirmationNumber}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Stay Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Stay Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Check-in</p>
              <p className="font-medium">{formatDate(checkInDate)}</p>
              <p className="text-xs text-gray-400">From {hotelCheckInTime}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Check-out</p>
              <p className="font-medium">{formatDate(checkOutDate)}</p>
              <p className="text-xs text-gray-400">Until {hotelCheckOutTime}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Nights</p>
              <p className="font-medium">{nights} night{nights > 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Guests</p>
              <p className="font-medium">{guestsCount} guest{guestsCount > 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rooms</p>
              <p className="font-medium">{roomsCount} room{roomsCount > 1 ? 's' : ''}</p>
            </div>
            {boardType && (
              <div>
                <p className="text-sm text-gray-500">Board Type</p>
                <p className="font-medium">{boardType}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Room Details */}
        {roomType && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Room Details</h4>
            <p className="text-gray-700 font-medium">{roomType}</p>
            {boardType && (
              <p className="text-sm text-gray-500 mt-1">Board: {boardType}</p>
            )}
            {numberOfRooms > 1 && (
              <p className="text-sm text-gray-500">Number of Rooms: {numberOfRooms}</p>
            )}
            {hotelDescription && (
              <p className="text-sm text-gray-600 mt-2 border-t border-gray-200 pt-2">{hotelDescription}</p>
            )}
          </div>
        )}
        
        {/* Hotel Phone */}
        {hotelPhone && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Contact</h4>
            <p className="text-gray-700">📞 {hotelPhone}</p>
          </div>
        )}
        
        {/* Cancellation Policy */}
        {booking.cancellationPolicySnapshot && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800">Cancellation Policy</p>
                <p className="text-sm text-yellow-700 mt-1">{booking.cancellationPolicySnapshot}</p>
                {booking.cancellationDeadline && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Cancel by: {formatDate(booking.cancellationDeadline)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };



// ==================== RENDER CAR RENTAL / TRANSFER DETAILS ====================
const renderCarRentalDetails = () => {
  if (!booking) return null;
  
  const isCarRental = booking?.productType === 'CAR_RENTAL';
  if (!isCarRental) return null;
  
  const bookingData = booking.bookingData as any;
  
  // ✅ CHECK IF THIS IS A TRANSFER
  const isTransferBooking = bookingData?.type === 'transfer-offer' || 
                            bookingData?.transferType !== undefined ||
                            bookingData?.start?.locationCode !== undefined ||
                            bookingData?.end?.locationCode !== undefined ||
                            (bookingData?.offerData && bookingData.offerData.type === 'transfer-offer');
  
  // ==================== HELPER: Normalize data ====================
  const normalizeBookingData = (rawData: any) => {
    if (rawData?.offerData) {
      return rawData.offerData;
    }
    if (rawData?.type === 'transfer-offer' || rawData?.start?.locationCode) {
      return rawData;
    }
    if (rawData?.carRentalDetails || rawData?.transferDetails) {
      return rawData.carRentalDetails || rawData.transferDetails;
    }
    return rawData;
  };
  
  const normalizedData = normalizeBookingData(bookingData);
  const offerId = normalizedData?.offerId || bookingData?.offerId || bookingData?.amadeus_offer_id || 'N/A';
  
  // ==================== TRANSFER BOOKING ====================
  if (isTransferBooking) {
    const start = normalizedData?.start || bookingData?.start || {};
    const end = normalizedData?.end || bookingData?.end || {};
    const vehicle = normalizedData?.vehicle || bookingData?.vehicle || {};
    const serviceProvider = normalizedData?.serviceProvider || bookingData?.serviceProvider || {};
    const cancellationRules = normalizedData?.cancellationRules || bookingData?.cancellationRules || [];
    
    // ✅ FIX: Extract duration from multiple locations
    const duration = 
      normalizedData?.duration ||
      bookingData?.duration ||
      normalizedData?.tripDuration ||
      bookingData?.tripDuration ||
      normalizedData?.travelTime ||
      bookingData?.travelTime ||
      normalizedData?.estimatedDuration ||
      bookingData?.estimatedDuration ||
      normalizedData?.offerData?.duration ||
      '';
    
    const distance = normalizedData?.distance || bookingData?.distance || {};
    const passengers = bookingData?.passengers || normalizedData?.passengers || [];
    
    // Vehicle details
    const vehicleDescription = vehicle?.description || 'Transfer Vehicle';
    const vehicleCategory = vehicle?.category || 'ST';
    const vehicleCode = vehicle?.code || '';
    const seats = vehicle?.seats?.[0]?.count || 'N/A';
    const baggage = vehicle?.baggages?.[0]?.count || 'N/A';
    const vehicleImage = vehicle?.imageURL || '';
    
    // Service provider
    const providerName = serviceProvider?.name || 'Transfer Provider';
    const providerCode = serviceProvider?.code || '';
    const providerLogo = serviceProvider?.logoUrl || '';
    const termsUrl = serviceProvider?.termsUrl || '';
    
    // Transfer type
    const transferType = normalizedData?.transferType || bookingData?.transferType || 'PRIVATE';
    
    // Pickup
    const pickupLocation = start?.locationCode || 'N/A';
    const pickupDateTime = start?.dateTime || '';
    const pickupAddress = start?.address?.line || start?.address || '';
    const pickupName = start?.name || '';
    const pickupCity = start?.address?.cityName || '';
    
    // Dropoff
    const dropoffLocation = end?.locationCode || 'N/A';
    const dropoffDateTime = end?.dateTime || '';
    const dropoffAddress = end?.address?.line || end?.address || '';
    const dropoffName = end?.name || '';
    const dropoffCity = end?.address?.cityName || '';
    
    // Distance
    const distanceValue = distance?.value || '';
    const distanceUnit = distance?.unit || 'KM';
    
    // ✅ Helper: Calculate duration from pickup/dropoff times
    const calculateDurationFromTimes = (pickup: string, dropoff: string): string => {
      if (!pickup || !dropoff) return '';
      try {
        const startTime = new Date(pickup);
        const endTime = new Date(dropoff);
        const diffMs = Math.abs(endTime.getTime() - startTime.getTime());
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return '';
      } catch {
        return '';
      }
    };
    
    // ✅ Use calculated duration if no duration was found
    let finalDuration = duration;
    if (!finalDuration) {
      finalDuration = calculateDurationFromTimes(pickupDateTime, dropoffDateTime);
    }
    
    // Format helpers
    const formatDateTime = (dateTime: string): string => {
      if (!dateTime) return 'N/A';
      try {
        const date = new Date(dateTime);
        return date.toLocaleString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return dateTime;
      }
    };
    
    const formatDuration = (durationStr: string): string => {
      if (!durationStr) return 'N/A';
      try {
        // Handle PT format (e.g., PT1H24M)
        const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (match) {
          const hours = match[1] ? parseInt(match[1]) : 0;
          const minutes = match[2] ? parseInt(match[2]) : 0;
          if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
          if (hours > 0) return `${hours}h`;
          if (minutes > 0) return `${minutes}m`;
          return durationStr;
        }
        // If it's already formatted (e.g., "1h 24m"), return as is
        if (durationStr.includes('h') || durationStr.includes('m')) {
          return durationStr;
        }
        return durationStr;
      } catch {
        return durationStr;
      }
    };
    
    const getCategoryDisplay = (category: string): string => {
      const map: Record<string, string> = {
        'ST': 'Standard',
        'BU': 'Business',
        'FC': 'First Class',
        'PR': 'Premium',
        'EL': 'Electric',
        'SUV': 'SUV',
        'VAN': 'Van',
        'CAR': 'Car',
        'LMS': 'Limousine',
        'BUS': 'Bus',
        'SDN': 'Sedan',
        'ELC': 'Electric'
      };
      return map[category] || category || 'Standard';
    };
    
    const getTransferTypeDisplay = (type: string): string => {
      const map: Record<string, string> = {
        'PRIVATE': 'Private Transfer',
        'SHARED': 'Shared Transfer',
        'TAXI': 'Taxi',
        'HOURLY': 'Hourly Rental',
        'AIRPORT': 'Airport Transfer',
        'LUXURY': 'Luxury Transfer'
      };
      return map[type] || type || 'Private Transfer';
    };
    
    return (
      <div className="space-y-6">
        {/* Provider Badge */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Powered by</p>
              <p className="font-bold text-xl">🚐 Transfer Service</p>
            </div>
            <div className="text-3xl">🚐</div>
          </div>
        </div>
        
        {/* Offer ID & Transfer Type & Duration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Offer ID</p>
              <p className="font-mono font-bold text-md text-emerald-600 break-all">{offerId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Transfer Type</p>
              <p className="font-medium">{getTransferTypeDisplay(transferType)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{formatDuration(finalDuration)}</p>
            </div>
          </div>
        </div>
        
        {/* Vehicle Details */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-lg">Vehicle Details</h4>
          
          {vehicleImage && (
            <div className="mb-4">
              <img 
                src={vehicleImage} 
                alt={vehicleDescription} 
                className="w-full max-h-48 object-contain rounded-lg bg-gray-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Category</p>
              <p className="font-semibold text-gray-900">{getCategoryDisplay(vehicleCategory)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Seats</p>
              <p className="font-semibold text-gray-900">{seats}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Baggage</p>
              <p className="font-semibold text-gray-900">{baggage}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Vehicle Code</p>
              <p className="font-mono font-semibold text-gray-900">{vehicleCode || 'N/A'}</p>
            </div>
          </div>
          
          <p className="text-gray-700 font-medium">{vehicleDescription}</p>
        </div>
        
        {/* Service Provider */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-lg">Service Provider</h4>
          <div className="flex items-center gap-4">
            {providerLogo && (
              <img 
                src={providerLogo} 
                alt={providerName} 
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div>
              <p className="font-semibold text-lg">{providerName}</p>
              {providerCode && (
                <p className="text-sm text-gray-500">Code: {providerCode}</p>
              )}
              {termsUrl && (
                <a 
                  href={termsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:underline"
                >
                  View Terms & Conditions
                </a>
              )}
            </div>
          </div>
        </div>
        
        {/* Pickup & Dropoff */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-lg">Pickup & Dropoff</h4>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Pickup</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  <div>
                    <p className="font-bold text-lg">{pickupLocation}</p>
                    <p className="text-sm text-gray-600">{pickupName || pickupCity || pickupAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold">{formatDateTime(pickupDateTime)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Dropoff</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  <div>
                    <p className="font-bold text-lg">{dropoffLocation}</p>
                    <p className="text-sm text-gray-600">{dropoffName || dropoffCity || dropoffAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold">{formatDateTime(dropoffDateTime)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Distance */}
        {distanceValue && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-lg">Distance</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-lg font-medium">
                {distanceValue} {distanceUnit}
              </p>
            </div>
          </div>
        )}
        
        {/* Cancellation Policy */}
        {cancellationRules && cancellationRules.length > 0 && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-lg">Cancellation Policy</h4>
            <div className="space-y-2">
              {cancellationRules.map((rule: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border ${rule.feeValue === '0' || rule.feeValue === '0%' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <p className="text-sm text-gray-700">{rule.ruleDescription}</p>
                  {rule.feeValue !== undefined && (
                    <p className="text-xs mt-1">
                      {rule.feeValue === '0' || rule.feeValue === '0%' ? (
                        <span className="text-green-600 font-medium">✓ Free cancellation</span>
                      ) : (
                        <span className="text-yellow-700">
                          Fee: {rule.feeValue}% {rule.feeType || ''}
                          {rule.metricMin && rule.metricMax && ` (${rule.metricMin} - ${rule.metricMax} ${rule.metricType})`}
                          {rule.metricMin && !rule.metricMax && ` (${rule.metricMin}+ ${rule.metricType})`}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Passenger Info */}
        {passengers && passengers.length > 0 && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="font-semibold text-gray-900 mb-3 text-lg">Passengers</h4>
            <div className="space-y-2">
              {passengers.map((passenger: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {passenger.name?.firstName} {passenger.name?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {passenger.name?.title || 'MR'} • {passenger.contact?.phone || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Passenger {index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Fallback for non-transfer car rentals
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Powered by</p>
            <p className="font-bold text-xl">Amadeus • Car Rental</p>
          </div>
          <div className="text-3xl">🚗</div>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Offer ID</p>
            <p className="font-mono font-bold text-md text-emerald-600 break-all">{offerId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Booking Reference</p>
            <p className="font-mono font-bold text-md">{booking.reference}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-yellow-800">Transfer details are being loaded</p>
            <p className="text-sm text-yellow-700">Please refresh the page or contact support if this issue persists.</p>
          </div>
        </div>
      </div>
    </div>
  );
};


  const renderWakanowDetails = () => {
    if (!booking) return null;
    
    const isWakanow = booking?.provider === 'WAKANOW';
    if (!isWakanow) return null;
    
    const providerData = booking?.providerData as any;
    const bookingData = booking.bookingData as any;
    
    // ✅ Get the Wakanow Booking ID (starts with 260...)
    const wakanowBookingId = 
      providerData?.WakanowBookingId || 
      providerData?.BookingId || 
      bookingData?.bookingId ||
      bookingData?.wakanowBookingId ||
      bookingData?.WakanowBookingId ||
      'N/A';
    
    // ✅ Get the local booking ID
    const localBookingId = booking?.id || 'N/A';
    
    // ✅ Get the booking reference
    const bookingReference = booking?.reference || 'N/A';
    
    // ✅ Updated PNR extraction
    const pnrNumber = 
    bookingData?.pnrReferenceNumber ||   // ✅ This is where the backend stores it
    bookingData?.PnrReferenceNumber ||   // ✅ Alternative case
    bookingData?.pnrNumber ||            // Fallback
    bookingData?.PnrNumber ||
    bookingData?.PNR ||
    providerData?.PnrReferenceNumber ||
    providerData?.PNR ||
    providerData?.PnrNumber ||
    booking?.bookingData?.pnrReferenceNumber ||
    booking?.bookingData?.PnrReferenceNumber ||
    'Not issued yet';
    
    console.log('🔍 BOOKING IDs:', {
      wakanowBookingId,
      localBookingId,
      bookingReference,
      pnrNumber,
      hasPassengers: !!bookingData?.passengers?.length,
      passengerCount: bookingData?.passengers?.length || 0,
    });
    
    // ✅ Extract all flight data
    let airlineName = 'N/A';
    let flightNumber = 'N/A';
    let departureAirport = 'N/A';
    let arrivalAirport = 'N/A';
    let departureTime = '';
    let arrivalTime = '';
    let stops = 0;
    let cabinClass = 'Economy';
    let bookingClass = 'Economy';
    let ticketStatus = 'Pending';
    let totalAmount = booking?.totalAmount || 0;
    let currency = booking?.currency || 'NGN';
    let airlineCode = '';
    let departureDate = '';
    let arrivalDate = '';
    let paymentStatus = booking?.paymentStatus || 'PENDING';
  
    // ==================== PASSENGER EXTRACTION ====================
    let leadPassengerName = 'N/A';
    let leadPassengerEmail = 'N/A';
    let leadPassengerPhone = 'N/A';
    let leadPassengerAddress = 'N/A';
    
    let allPassengers: Array<{
      name: string;
      type: string;
      dateOfBirth?: string;
      email?: string;
      phone?: string;
    }> = [];
  
    // ✅ Helper functions
    const safeGet = (obj: any, keys: string[], fallback: string = ''): string => {
      if (!obj || typeof obj !== 'object') return fallback;
      for (const key of keys) {
        const val = obj[key];
        if (val && typeof val === 'string' && val.trim()) {
          return val.trim();
        }
      }
      return fallback;
    };
  
    const extractName = (obj: any): string => {
      if (!obj) return '';
      const firstName = safeGet(obj, ['firstName', 'FirstName', 'first_name', 'givenName']);
      const lastName = safeGet(obj, ['lastName', 'LastName', 'last_name', 'familyName', 'surname']);
      const fullName = safeGet(obj, ['fullName', 'FullName', 'name', 'Name']);
      
      if (fullName && fullName !== 'N/A') return fullName;
      if (firstName && lastName) return `${firstName} ${lastName}`.trim();
      if (firstName) return firstName;
      if (lastName) return lastName;
      return '';
    };
  
    const extractPassengerType = (obj: any): string => {
      if (!obj) return 'Adult';
      const type = safeGet(obj, ['passengerType', 'PassengerType', 'type', 'Type', 'PTC']);
      if (type) {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('child') || lowerType === 'chd') return 'Child';
        if (lowerType.includes('infant') || lowerType === 'inf') return 'Infant';
      }
      const dob = safeGet(obj, ['dateOfBirth', 'DateOfBirth', 'DOB', 'dob']);
      if (dob) {
        try {
          const age = new Date().getFullYear() - new Date(dob).getFullYear();
          if (age < 2) return 'Infant';
          if (age < 12) return 'Child';
        } catch {}
      }
      return 'Adult';
    };
  
    const extractEmail = (obj: any): string => {
      return safeGet(obj, ['email', 'Email', 'emailAddress', 'EmailAddress', 'eMail']);
    };
  
    const extractPhone = (obj: any): string => {
      return safeGet(obj, ['phone', 'Phone', 'phoneNumber', 'PhoneNumber', 'mobile', 'Mobile', 'contactNumber']);
    };
  
    const extractAddress = (obj: any): string => {
      return safeGet(obj, ['address', 'Address', 'AddressLine1', 'AddressLine', 'street', 'Street', 'addressLine1']);
    };
  
  // ✅ Extract ALL passengers from ALL sources
const extractAllPassengers = () => {
  const passengerMap = new Map<string, any>();
  
  // SOURCE 1: bookingData.passengers
  if (bookingData?.passengers && Array.isArray(bookingData.passengers)) {
    bookingData.passengers.forEach((p: any, idx: number) => {
      const name = extractName(p);
      if (name) {
        passengerMap.set(`passengers_${idx}`, p);
      }
    });
  }
  
  // SOURCE 2: bookingData.travellers
  if (bookingData?.travellers && Array.isArray(bookingData.travellers)) {
    bookingData.travellers.forEach((t: any, idx: number) => {
      const name = extractName(t);
      if (name) {
        passengerMap.set(`travellers_${idx}`, t);
      }
    });
  }
  
  // SOURCE 3: booking.passengerInfo
  const passengerInfoValue = booking.passengerInfo;
  if (passengerInfoValue) {
    if (Array.isArray(passengerInfoValue)) {
      passengerInfoValue.forEach((p: any, idx: number) => {
        const name = extractName(p);
        if (name) {
          passengerMap.set(`passengerInfo_${idx}`, p);
        }
      });
    } else if (typeof passengerInfoValue === 'object') {
      const name = extractName(passengerInfoValue);
      if (name) {
        passengerMap.set('passengerInfo_main', passengerInfoValue);
      }
    }
  }
  
  // SOURCE 4: bookingData.additionalPassengers
  if (bookingData?.additionalPassengers && Array.isArray(bookingData.additionalPassengers)) {
    bookingData.additionalPassengers.forEach((p: any, idx: number) => {
      const name = extractName(p);
      if (name) {
        passengerMap.set(`additional_${idx}`, p);
      }
    });
  }
  
  // SOURCE 5: providerData
  if (providerData) {
    const travellers = providerData.Travellers || providerData.travellers || 
                       providerData.passengers || providerData.Passengers || [];
    if (Array.isArray(travellers)) {
      travellers.forEach((t: any, idx: number) => {
        const name = extractName(t);
        if (name) {
          passengerMap.set(`provider_${idx}`, t);
        }
      });
    }
  }
  
  // Convert map to array
  let foundLead = false;
  
  passengerMap.forEach((p) => {
    const name = extractName(p);
    if (!name) return;
    
    const dob = safeGet(p, ['dateOfBirth', 'DateOfBirth', 'DOB', 'dob']);
    const email = extractEmail(p);
    const phone = extractPhone(p);
    
    allPassengers.push({
      name,
      type: extractPassengerType(p),
      dateOfBirth: dob || undefined,
      email: email || undefined,
      phone: phone || undefined,
    });
    
    if (!foundLead) {
      leadPassengerName = name;
      leadPassengerEmail = email || 'N/A';
      leadPassengerPhone = phone || 'N/A';
      leadPassengerAddress = extractAddress(p) || 'N/A';
      foundLead = true;
    }
  });
  
  // ✅ If no passengers found, try booking directly (type-safe)
  if (allPassengers.length === 0 && booking) {
    // Use type assertion to safely access potential properties
    const bookingAny = booking as any;
    const name = bookingAny.passengerName || bookingAny.name || '';
    if (name) {
      allPassengers.push({
        name,
        type: 'Adult',
        dateOfBirth: undefined,
        email: bookingAny.email || undefined,
        phone: bookingAny.phone || undefined,
      });
      leadPassengerName = name;
      leadPassengerEmail = bookingAny.email || 'N/A';
      leadPassengerPhone = bookingAny.phone || 'N/A';
    }
  }
  
  console.log('📋 EXTRACTED PASSENGERS:', {
    allPassengers: allPassengers.map(p => ({
      name: p.name,
      type: p.type,
    })),
    total: allPassengers.length,
  });
};
  
    extractAllPassengers();
  
    // ✅ Try to extract flight data from providerData
    if (providerData) {
      let flightSummary = null;
      let flightModels = [];
      
      if (providerData.FlightBookingSummary) {
        flightSummary = providerData.FlightBookingSummary;
      } else if (providerData.FlightBookingResult?.FlightBookingSummaryModel) {
        flightSummary = providerData.FlightBookingResult.FlightBookingSummaryModel;
      } else if (providerData.FlightSummaryModel) {
        flightSummary = providerData;
      }
      
      if (flightSummary) {
        const summaryModel = flightSummary.FlightSummaryModel || flightSummary;
        const flightCombination = summaryModel.FlightCombination || flightSummary.FlightCombination || {};
        flightModels = flightCombination.FlightModels || summaryModel.FlightModels || [];
        
        const outboundFlight = flightModels[0] || {};
        const flightLegs = outboundFlight?.FlightLegs || [];
        const firstLeg = flightLegs[0] || {};
        const lastLeg = flightLegs[flightLegs.length - 1] || firstLeg;
        
        airlineName = outboundFlight.AirlineName || outboundFlight.Airline || firstLeg.AirlineName || firstLeg.Airline || 'N/A';
        airlineCode = outboundFlight.Airline || firstLeg.AirlineCode || '';
        flightNumber = outboundFlight.Name || outboundFlight.FlightNumber || firstLeg.FlightNumber || firstLeg.Name || 'N/A';
        
        departureAirport = outboundFlight.DepartureCode || firstLeg.DepartureCode || outboundFlight.Origin || 'N/A';
        arrivalAirport = outboundFlight.ArrivalCode || lastLeg.DestinationCode || outboundFlight.Destination || 'N/A';
        departureTime = outboundFlight.DepartureTime || firstLeg.StartTime || outboundFlight.DepartureDateTime || '';
        arrivalTime = outboundFlight.ArrivalTime || lastLeg.EndTime || outboundFlight.ArrivalDateTime || '';
        departureDate = departureTime ? new Date(departureTime).toISOString().split('T')[0] : '';
        arrivalDate = arrivalTime ? new Date(arrivalTime).toISOString().split('T')[0] : '';
        
        stops = outboundFlight.Stops || outboundFlight.StopCount || 0;
        cabinClass = firstLeg.CabinClassName || outboundFlight.CabinClass || 'Economy';
        bookingClass = firstLeg.BookingClass || outboundFlight.BookingClass || 'Economy';
        
        ticketStatus = flightSummary.TicketStatus || summaryModel.TicketStatus || 'Pending';
        
        const price = flightCombination.Price || summaryModel.Price || {};
        totalAmount = price.Amount || outboundFlight.Price || booking?.totalAmount || 0;
        currency = price.CurrencyCode || booking?.currency || 'NGN';
        
        paymentStatus = flightSummary.PaymentStatus || booking?.paymentStatus || 'PENDING';
      }
    }
    
    // Fallback to bookingData
    if (airlineName === 'N/A' && bookingData) {
      airlineName = bookingData.airlineName || bookingData.airline || 'N/A';
      flightNumber = bookingData.flightNumber || bookingData.flight_number || 'N/A';
      departureAirport = bookingData.origin || bookingData.departureAirport || 'N/A';
      arrivalAirport = bookingData.destination || bookingData.arrivalAirport || 'N/A';
      departureTime = bookingData.departureTime || bookingData.departureDate || '';
      arrivalTime = bookingData.arrivalTime || bookingData.arrivalDate || '';
      departureDate = bookingData.departureDate || '';
      arrivalDate = bookingData.arrivalDate || '';
      stops = bookingData.stops || 0;
      cabinClass = bookingData.cabinClass || bookingData.cabin || 'Economy';
      bookingClass = bookingData.bookingClass || bookingData.class || 'Economy';
      ticketStatus = bookingData.ticketStatus || 'Pending';
      totalAmount = bookingData.totalAmount || booking?.totalAmount || 0;
      currency = bookingData.currency || booking?.currency || 'NGN';
      airlineCode = bookingData.airlineCode || '';
      paymentStatus = bookingData.paymentStatus || booking?.paymentStatus || 'PENDING';
    }
    
    const isDomestic = bookingData?.is_domestic || 
      (departureAirport !== 'N/A' && arrivalAirport !== 'N/A' && 
       getAirportName(departureAirport) === getAirportName(arrivalAirport));
    
    const stopText = stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`;
    const isTicketIssued = ticketStatus === 'Success' || ticketStatus === 'Issued' || ticketStatus === 'TICKETED';
    const bookingStatus = booking?.status || 'PENDING';
    const airlineLogo = airlineCode ? `https://images.wakanow.com/Images/flight-logos/${airlineCode}.gif` : '';
    
    const getPaymentStatusText = (status: string): string => {
      const map: Record<string, string> = {
        'PAID': 'Paid',
        'SUCCESS': 'Paid',
        'COMPLETED': 'Paid',
        'PENDING': 'Pending',
        'FAILED': 'Failed',
        'CANCELLED': 'Cancelled',
        'REFUNDED': 'Refunded'
      };
      return map[status?.toUpperCase()] || status || 'Pending';
    };
    
    const formatDuration = (departure: string, arrival: string): string => {
      if (!departure || !arrival) return '';
      try {
        const diff = Math.abs(new Date(arrival).getTime() - new Date(departure).getTime());
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h`;
        return `${minutes}m`;
      } catch {
        return '';
      }
    };
    
    const duration = formatDuration(departureTime, arrivalTime);
  
    const getPassengerTypeBadge = (type: string): string => {
      const map: Record<string, string> = {
        'Adult': 'bg-green-100 text-green-700',
        'Child': 'bg-yellow-100 text-yellow-700',
        'Infant': 'bg-purple-100 text-purple-700',
      };
      return map[type] || 'bg-gray-100 text-gray-700';
    };
  
    // ==================== RETURN JSX ====================
    return (
      <div className="space-y-6">
        {/* Invoice Header with Wakanow Booking ID */}
        <div className="bg-gradient-to-r from-[#33a8da] to-[#2c98c7] text-white p-4 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm opacity-90">Powered by</p>
              <p className="font-bold text-xl">Wakanow {isDomestic ? '• Domestic' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80">Wakanow Booking ID</p>
              <p className="font-mono font-bold text-sm">{wakanowBookingId}</p>
              <p className="text-xs opacity-80 mt-1">Reference</p>
              <p className="font-mono font-bold text-sm">{bookingReference}</p>
              
            </div>
          </div>
        </div>
        
        {/* ==================== PASSENGER DETAILS (NO PASSPORT) ==================== */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-lg">Passenger Details</h4>
          
          {allPassengers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600 font-medium">#</th>
                      <th className="px-4 py-2 text-left text-gray-600 font-medium">Passenger Name</th>
                      <th className="px-4 py-2 text-left text-gray-600 font-medium">Type</th>
                      <th className="px-4 py-2 text-left text-gray-600 font-medium">Date of Birth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allPassengers.map((passenger, index) => (
                      <tr key={index} className={index === 0 ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2 font-medium">{index + 1}</td>
                        <td className="px-4 py-2 font-medium">
                          {passenger.name}
                          {index === 0 && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Lead</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${getPassengerTypeBadge(passenger.type)}`}>
                            {passenger.type}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {passenger.dateOfBirth ? formatDate(passenger.dateOfBirth) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Lead Passenger Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="font-medium ml-2">{leadPassengerEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium ml-2">{leadPassengerPhone}</span>
                  </div>
                  {leadPassengerAddress !== 'N/A' && (
                    <div className="md:col-span-2">
                      <span className="text-gray-500">Address:</span>
                      <span className="font-medium ml-2">{leadPassengerAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">No passenger details available</p>
            </div>
          )}
        </div>
        
        {/* ==================== FLIGHT DETAILS ==================== */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-lg">Flight Details</h4>
          
          {/* Airline Info */}
          <div className="flex items-center gap-3 mb-4">
            {airlineLogo && (
              <img 
                src={airlineLogo} 
                alt={airlineName} 
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div>
              <p className="font-semibold text-lg">{airlineName}</p>
              <p className="text-sm text-gray-500">Flight {flightNumber} • {airlineCode}</p>
            </div>
          </div>
          
          {/* Cabin & Booking Class */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Cabin Class</p>
              <p className="font-medium capitalize">{cabinClass}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Booking Class</p>
              <p className="font-medium uppercase">{bookingClass}</p>
            </div>
          </div>
          
          {/* Departure */}
          <div className="bg-blue-50 p-4 rounded-lg mb-3">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Departure</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-bold text-lg">{departureAirport}</p>
                <p className="text-sm text-gray-600">{getAirportName(departureAirport)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-bold text-lg">{formatDate(departureDate || departureTime)}</p>
                <p className="text-sm text-gray-600">{formatTime(departureTime)}</p>
              </div>
            </div>
          </div>
          
          {/* Arrival */}
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Arrival</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-bold text-lg">{arrivalAirport}</p>
                <p className="text-sm text-gray-600">{getAirportName(arrivalAirport)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date & Time</p>
                <p className="font-bold text-lg">{formatDate(arrivalDate || arrivalTime)}</p>
                <p className="text-sm text-gray-600">{formatTime(arrivalTime)}</p>
              </div>
            </div>
          </div>
          
          {/* Duration & Stops */}
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{duration || stopText}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Stops</p>
              <p className="font-medium">{stopText}</p>
            </div>
          </div>
        </div>
        
        {/* ==================== PRICE DETAILS ==================== */}
        <div className="border-b border-gray-200 pb-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-lg">Price Details</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid</span>
                <span className="font-bold text-lg text-[#33a8da]">{formatPrice(totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status</span>
                <span className={`font-medium ${paymentStatus === 'PAID' || paymentStatus === 'SUCCESS' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {getPaymentStatusText(paymentStatus)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* ==================== PNR & STATUS ==================== */}
        <div className="border-b border-gray-200 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">PNR Number</p>
              <p className="font-mono font-bold text-lg">{pnrNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Booking Status</p>
              <span className={`inline-block text-xs font-bold uppercase px-3 py-1 rounded-full ${
                bookingStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                bookingStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {formatStatus(bookingStatus)}
              </span>
            </div>
          </div>
        </div>
        
        {/* ==================== TICKET STATUS ==================== */}
        {!isTicketIssued && !isGuest && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-yellow-800 mb-2">Ticket Not Issued Yet</p>
                <p className="text-sm text-yellow-700 mb-3">
                  This booking needs a ticket to be issued. Please enter the PNR number to complete the process.
                </p>
                
                {!showTicketForm ? (
                  <button
                    onClick={() => setShowTicketForm(true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                  >
                    Issue Ticket
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={pnrNumber}
                      onChange={(e) => setPnrNumber(e.target.value.toUpperCase())}
                      placeholder="Enter PNR Number"
                      className="w-full px-4 py-2 border rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleIssueWakanowTicket}
                        disabled={issuingTicket}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {issuingTicket ? 'Issuing...' : 'Confirm Issue'}
                      </button>
                      <button
                        onClick={() => setShowTicketForm(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {isTicketIssued && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-green-800">Ticket Issued ✓</p>
                <p className="text-sm text-green-700">Your ticket has been successfully issued.</p>
                <p className="text-xs text-green-600 mt-1">PNR: {pnrNumber}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string): string => {
    const statusMap: Record<string, string> = {
      'CONFIRMED': 'green',
      'PENDING': 'yellow',
      'FAILED': 'red',
      'CANCELLED': 'gray',
      'REFUNDED': 'purple',
      'COMPLETED': 'green',
      'PAID': 'green'
    };
    return statusMap[status] || "gray";
  };

  const formatStatus = (status: string): string => {
    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isWakanow = booking?.provider === 'WAKANOW';
  const isDuffel = booking?.provider === 'DUFFEL';
  const isHotelBooking = booking?.productType === 'HOTEL';
  const isCarRental = booking?.productType === 'CAR_RENTAL';
  const productType = booking?.productType || '';
  const isConfirmed = ['CONFIRMED', 'COMPLETED', 'PAID'].includes(booking?.status || '');
  const isPending = ['PENDING', 'PROCESSING'].includes(booking?.status || '');
  const isFailed = ['FAILED', 'CANCELLED'].includes(booking?.status || '');

  // Email form for guest bookings
  if (showEmailForm && !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-xl shadow p-8 border border-gray-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Email</h1>
            <p className="text-gray-600">
              Please enter the email address used for this booking to view your details.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Reference: <span className="font-mono font-bold">{bookingRef}</span>
            </p>
          </div>
          
          <form onSubmit={handleEmailSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#33a8da] focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
            >
              View My Booking
            </button>
          </form>
          
          <button
            onClick={() => router.push('/')}
            className="w-full mt-4 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 border border-gray-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg
          className="animate-spin h-10 w-10 text-[#33a8da]"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          {error || "Unable to find your booking details."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Guest banner */}
      {isGuest && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Enjoying your booking experience?</p>
                <p className="text-sm text-gray-600">Create a free account to earn loyalty points, manage your bookings, and get exclusive deals!</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const params = new URLSearchParams();
                  if (email) params.set('email', email);
                  if (bookingRef) params.set('bookingRef', bookingRef);
                  router.push(`/register?${params.toString()}`);
                }}
                className="px-4 py-2 bg-[#33a8da] text-white font-medium rounded-lg hover:bg-[#2c98c7] transition text-sm"
              >
                Sign Up Free
              </button>
              <button 
                onClick={() => {
                  const params = new URLSearchParams();
                  if (email) params.set('email', email);
                  if (bookingRef) params.set('bookingRef', bookingRef);
                  router.push(`/login?${params.toString()}`);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 border border-gray-300 transition text-sm"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authenticated welcome banner */}
      {!isGuest && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-green-800">
                <span className="font-medium">Welcome back!</span> You're viewing your complete booking details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status header */}
      <div className="text-center mb-8">
        {isConfirmed && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">Your booking has been successfully confirmed.</p>
          </>
        )}

        {isPending && (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Processing</h1>
            <p className="text-gray-600">Your payment was successful, but we're still waiting for confirmation from the provider.</p>
          </>
        )}

        {isFailed && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Failed</h1>
            <p className="text-gray-600 mb-4">We couldn't confirm your booking with the provider.</p>
          </>
        )}
      </div>

      {/* Booking summary */}
      <div className="bg-white rounded-xl shadow p-6 mb-8 border border-gray-100">
        <div className="text-center mb-4">
          <div className="inline-block bg-blue-50 px-4 py-2 rounded-full mb-4">
            <span className="text-sm font-medium text-blue-700">
              {isDuffel ? 'DUFFEL FLIGHT' : 
               isWakanow ? 'WAKANOW FLIGHT' : 
               (productType?.replace(/_/g, ' ') || 'Booking')}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Reference: {booking.reference}</h2>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-block mt-1 text-xs font-bold uppercase px-3 py-1 rounded-full ${
                isConfirmed ? 'bg-green-100 text-green-700' :
                isPending ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {formatStatus(booking.status)}
              </span>
            </div>
            
            {booking.totalAmount && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="font-bold text-lg text-gray-900">{formatPrice(booking.totalAmount, booking.currency)}</p>
              </div>
            )}
            
            {booking.createdAt && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Booked On</p>
                <p className="font-medium">{formatDate(booking.createdAt)}</p>
              </div>
            )}
            
            {isGuest && email && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium truncate">{email}</p>
              </div>
            )}
          </div>
        </div>
      </div>

    {booking && (
  <div className="bg-white rounded-xl shadow p-6 mb-8 border border-gray-100">
    <h3 className="text-xl font-bold mb-4">Trip Details</h3>
    {isHotelBooking ? renderHotelDetails() : 
     isCarRental ? renderCarRentalDetails() :
     isDuffel ? renderDuffelDetails() : 
     renderWakanowDetails()}
  </div>
)}

     {/* Price breakdown */}
{booking && booking.basePrice && (
  <div className="bg-white rounded-xl shadow p-6 mb-8 border border-gray-100">
    <h3 className="text-xl font-bold mb-4">Price Breakdown</h3>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-gray-600">Base Price</span>
        <span className="font-medium">{formatPrice(booking.basePrice, booking.currency)}</span>
      </div>
      
      {/* ✅ Combined Service Fee (Markup + Service Fee) */}
      {((booking.markupAmount && booking.markupAmount > 0) || 
        (booking.serviceFee && booking.serviceFee > 0)) && (
        <div className="flex justify-between border-t border-gray-100 pt-2">
          <span className="text-gray-600">Service Fee</span>
          <span className="font-medium">
            {formatPrice(
              (booking.markupAmount || 0) + (booking.serviceFee || 0), 
              booking.currency
            )}
          </span>
        </div>
      )}
      
      <div className="border-t border-gray-200 pt-2 mt-2">
        <div className="flex justify-between font-bold">
          <span>Total Amount</span>
          <span className="text-[#33a8da] text-lg">
            {formatPrice(booking.totalAmount, booking.currency)}
          </span>
        </div>
      </div>
    </div>
  </div>
)}
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={() => router.push('/')} 
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}