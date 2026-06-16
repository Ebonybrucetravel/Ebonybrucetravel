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

  const handleIssueWakanowTicket = async () => {
    if (!pnrNumber) {
      alert('Please enter PNR number');
      return;
    }
    
    if (!booking) {
      alert('Booking not found');
      return;
    }
    
    const bookingIdValue = booking.id;
    if (!bookingIdValue) {
      alert('Booking ID not found. Please refresh the page and try again.');
      return;
    }
    
    try {
      setIssuingTicket(true);
      console.log('Issuing ticket for booking:', bookingIdValue, 'PNR:', pnrNumber);
      
      const response = await ticketWakanowPNR(bookingIdValue, pnrNumber);
      console.log('Ticket response:', response);
      
      if (response.success !== false) {
        alert('Ticket issued successfully!');
        setShowTicketForm(false);
        setPnrNumber('');
        
        // Refresh booking data
        await fetchAuthBooking(bookingIdValue);
      } else {
        alert(response.message || response.error || 'Failed to issue ticket');
      }
    } catch (error: any) {
      console.error('Issue ticket error:', error);
      alert(error.message || 'Failed to issue ticket. Please check the PNR number and try again.');
    } finally {
      setIssuingTicket(false);
    }
  };

// ==================== RENDER HOTEL DETAILS ====================
const renderHotelDetails = () => {
  if (!booking) return null;
  
  const isHotel = booking.productType === 'HOTEL';
  if (!isHotel) return null;
  
  const bookingData = booking.bookingData as any;
  
  // ✅ FIX: Extract hotel details from the correct location
  // The backend stores hotel details in bookingData.hotelDetails
  const hotelDetails = bookingData?.hotelDetails || {};
  
  // Extract hotel name from multiple possible locations
  const hotelName = 
    hotelDetails?.hotelName || 
    bookingData?.hotelName || 
    bookingData?.hotel?.name || 
    'Hotel';
  
  // Extract other hotel details
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
  
  // ✅ FIX: guests might be an object, not a number
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
  
  // ✅ FIX: rooms might be an object too
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
  
  // Get provider order ID from providerData
  const providerOrderId = (booking.providerData as any)?.id || (booking.providerData as any)?.orderId || 'N/A';
  const providerConfirmationNumber = (booking.providerData as any)?.hotelBookings?.[0]?.hotelProviderInformation?.[0]?.confirmationNumber || 'N/A';
  
  // Build full address
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
      
      {/* ✅ Hotel Name - Now displays correctly */}
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
      
      {/* Hotel Offer ID - Important */}
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
      
      {/* Room Details if available */}
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

  // ==================== RENDER WAKANOW FLIGHT DETAILS ====================
  const renderWakanowDetails = () => {
    if (!booking) return null;
    
    const providerData = booking?.providerData as any;
    const isWakanow = booking?.provider === 'WAKANOW';
    
    if (!isWakanow) return null;
    
    // Extract flight details
    const flightSummaryModel = providerData?.FlightBookingSummary?.FlightSummaryModel;
    const flightCombination = flightSummaryModel?.FlightCombination;
    const flightModels = flightCombination?.FlightModels || [];
    const outboundFlight = flightModels[0] || {};
    const returnFlight = flightModels[1] || null;
    const flightLegs = outboundFlight?.FlightLegs || [];
    const firstLeg = flightLegs[0] || {};
    const lastLeg = flightLegs[flightLegs.length - 1] || firstLeg;
    
    const flightNumber = firstLeg?.FlightNumber || 'N/A';
    const airline = outboundFlight?.AirlineName || outboundFlight?.Airline || 'ValueJet';
    const airlineCode = outboundFlight?.Airline || '';
    const departureCode = firstLeg?.DepartureCode || 'N/A';
    const departureName = firstLeg?.DepartureName || '';
    const departureTime = firstLeg?.StartTime ? new Date(firstLeg.StartTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const departureDate = firstLeg?.StartTime || '';
    const arrivalCode = lastLeg?.DestinationCode || 'N/A';
    const arrivalName = lastLeg?.DestinationName || '';
    const arrivalTime = lastLeg?.EndTime ? new Date(lastLeg.EndTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const stops = outboundFlight?.Stops || 0;
    const stopText = stops === 0 ? 'Direct' : stops === 1 ? '1 stop' : `${stops} stops`;
    const duration = outboundFlight?.TripDuration || '';
    const cabinClass = firstLeg?.CabinClassName || 'Economy';
    const pnrNumberValue = providerData?.FlightBookingSummary?.PnrReferenceNumber || booking?.pnrNumber || 'Not issued yet';
    
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Powered by</p>
              <p className="font-bold text-xl">Wakanow</p>
            </div>
            <div className="text-3xl">🌍</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <p className="text-sm text-gray-500">Airline</p>
            <p className="font-semibold text-lg">{airline} {airlineCode && `(${airlineCode})`}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Flight Number</p>
            <p className="font-semibold text-lg">{flightNumber}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-blue-600">{departureCode}</span>
            </div>
            <p className="font-bold text-lg">{departureCode}</p>
            <p className="text-sm text-gray-500 truncate max-w-[100px] mx-auto">{departureName}</p>
            <p className="text-sm font-medium mt-2">{formatDate(departureDate)}</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{departureTime}</p>
          </div>

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
              {duration} • {stopText}
            </p>
          </div>

          <div className="text-center flex-1">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-green-600">{arrivalCode}</span>
            </div>
            <p className="font-bold text-lg">{arrivalCode}</p>
            <p className="text-sm text-gray-500 truncate max-w-[100px] mx-auto">{arrivalName}</p>
            <p className="text-sm font-medium mt-2">{formatDate(departureDate)}</p>
            <p className="text-xl font-bold text-green-600 mt-1">{arrivalTime}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">PNR Number</p>
              <p className="font-mono font-bold text-lg">{pnrNumberValue}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cabin Class</p>
              <p className="font-medium capitalize">{cabinClass}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stops</p>
              <p className="font-medium">{stopText}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Booking Status</p>
              <span className="inline-block text-xs font-bold uppercase px-2 py-1 rounded-full bg-green-100 text-green-700">
                {booking?.status || 'CONFIRMED'}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket issuance form if needed */}
        {pnrNumberValue === 'Not issued yet' && !isGuest && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-yellow-800 mb-2">Ticket Not Issued Yet</p>
                <p className="text-sm text-yellow-700 mb-3">
                  This Wakanow booking needs a ticket to be issued. Please enter the PNR number to complete the process.
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
  const isHotelBooking = booking?.productType === 'HOTEL';
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
              {isWakanow ? 'WAKANOW FLIGHT' : (productType?.replace(/_/g, ' ') || 'Booking')}
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

      {/* Trip details - Hotel OR Flight */}
      {booking && (
        <div className="bg-white rounded-xl shadow p-6 mb-8 border border-gray-100">
          <h3 className="text-xl font-bold mb-4">Trip Details</h3>
          {isHotelBooking ? renderHotelDetails() : renderWakanowDetails()}
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
            {booking.markupAmount && booking.markupAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Markup</span>
                <span className="font-medium">{formatPrice(booking.markupAmount, booking.currency)}</span>
              </div>
            )}
            {booking.serviceFee && booking.serviceFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span className="font-medium">{formatPrice(booking.serviceFee, booking.currency)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Total Amount</span>
                <span className="text-[#33a8da] text-lg">{formatPrice(booking.totalAmount, booking.currency)}</span>
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