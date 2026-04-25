"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Booking as BookingType } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ticketWakanowPNR } from '@/lib/wakanow-api';

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

  useEffect(() => {
    const id = params.get("id");
    const ref = params.get("ref");
    const email = params.get("email");

    if (!id && !ref) {
      setLoading(false);
      setError("Missing booking ID or reference");
      return;
    }

    const fetchBooking = async () => {
      try {
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
            const response = await api.bookingApi.getBookingById(bookingRef);
            const bookingData = response?.data ?? response ?? null;
            if (bookingData) {
              setBooking(bookingData);
              setLoading(false);
              return;
            }
          } catch {
            if (emailParam) {
              await fetchGuestBooking(bookingRef, emailParam);
            } else {
              setShowEmailForm(true);
              setLoading(false);
            }
          }
          return;
        }
        
        // CASE 3: Guest user with reference
        if (bookingRef) {
          console.log('👤 Guest user fetching by reference:', bookingRef);
          setIsGuest(true);
          
          // Try to fetch without email first
          try {
            console.log('Attempting to fetch booking without email...');
            const response = await api.publicRequest(
              `/api/v1/bookings/public/by-reference/${encodeURIComponent(bookingRef)}`,
              { method: 'GET' }
            );
            const bookingData = response?.data ?? response ?? null;
            if (bookingData) {
              setBooking(bookingData);
              const fetchedEmail = bookingData.passengerInfo?.email;
              if (fetchedEmail) {
                setEmail(fetchedEmail);
                localStorage.setItem('guestEmail', fetchedEmail);
              }
              setLoading(false);
              return;
            }
          } catch (err) {
            console.log('Fetch without email failed, trying with email');
          }
          
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
        }
        
      } catch (err) {
        console.error('Fetch error:', err);
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, bookingRef, emailParam]);

  const fetchGuestBooking = async (ref: string, emailAddress: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/v1/bookings/public/by-reference/${encodeURIComponent(ref)}?email=${encodeURIComponent(emailAddress)}`;
      console.log('Fetching guest booking with email:', url);
      
      const response = await api.publicRequest(url, { method: 'GET' });
      const bookingData = response?.data ?? response ?? null;
      
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

  const fetchAuthBooking = async (id: string) => {
    setLoading(true);
    try {
      console.log('Fetching authenticated booking:', id);
      const response = await api.bookingApi.getBookingById(id);
      console.log('Auth response:', response);
      
      const bookingData = response?.data ?? response ?? null;
      
      if (!bookingData) {
        throw new Error('No booking data found');
      }
      
      setBooking(bookingData);
      console.log('Auth booking fetched:', bookingData);
      
    } catch (err: any) {
      console.error('Failed to fetch auth booking:', err);
      
      if (err.status === 401) {
        setError('Your session has expired. Please sign in again.');
      } else if (err.status === 404) {
        setError('Booking not found');
      } else {
        setError(err.message || 'Unable to load booking details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && bookingRef) {
      setLoading(true);
      setShowEmailForm(false);
      setError(null);
      
      try {
        localStorage.setItem('guestEmail', email);
        const url = `/api/v1/bookings/public/by-reference/${encodeURIComponent(bookingRef)}?email=${encodeURIComponent(email)}`;
        console.log('Submitting email form:', url);
        
        const response = await api.publicRequest(url, { method: 'GET' });
        const bookingData = response?.data ?? response ?? null;
        
        if (!bookingData) {
          throw new Error('No booking data found');
        }
        
        setBooking(bookingData);
        console.log('Booking fetched after email submit:', bookingData);
        
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
    
    const bookingId = booking.id;
    if (!bookingId) {
      alert('Booking ID not found. Please refresh the page and try again.');
      return;
    }
    
    try {
      setIssuingTicket(true);
      console.log('Issuing ticket for booking:', bookingId, 'PNR:', pnrNumber);
      
      const response = await ticketWakanowPNR(bookingId, pnrNumber);
      console.log('Ticket response:', response);
      
      if (response.success !== false) {
        alert('Ticket issued successfully!');
        setShowTicketForm(false);
        setPnrNumber('');
        
        if (bookingId) {
          await fetchAuthBooking(bookingId);
        }
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

  const downloadWakanowPDF = () => {
    if (!booking) return;
    
    const doc = new jsPDF();
    let yPos = 20;
    
    const addSection = (title: string, y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(51, 168, 222);
      doc.text(title, 20, y);
      return y + 8;
    };

    const addField = (label: string, value: string, y: number, isImportant: boolean = false) => {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(label, 25, y);
      doc.setFontSize(11);
      doc.setTextColor(isImportant ? 51 : 0, isImportant ? 168 : 0, isImportant ? 222 : 0);
      doc.text(value, 25, y + 5);
      return y + 12;
    };

    doc.setFontSize(22);
    doc.setTextColor(51, 168, 222);
    doc.text('Ebony Bruce Travels', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('WAKANOW FLIGHT CONFIRMATION', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setDrawColor(51, 168, 222);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Booking Reference: ${booking.reference}`, 20, yPos);
    yPos += 7;
    doc.text(`Status: ${booking.status}`, 20, yPos);
    yPos += 7;
    doc.text(`Booked On: ${formatDate(booking.createdAt)}`, 20, yPos);
    yPos += 15;

    yPos = addSection('WAKANOW BOOKING DETAILS', yPos);
    
    const bookingData = booking?.bookingData || {};
    const pnr = booking.pnrNumber || 
                bookingData.pnrNumber || 
                bookingData.PnReferenceNumber || 
                bookingData.pnReferenceNumber || 
                bookingData.FlightBookingResult?.PnReferenceNumber ||
                bookingData.FlightBookingSummary?.PnReferenceNumber ||
                'Will be issued soon';
    const airline = bookingData.airline || 'Wakanow Partner Airline';
    const flightNumber = bookingData.flightNumber || bookingData.offerId || 'N/A';
    const origin = bookingData.origin || 'N/A';
    const destination = bookingData.destination || 'N/A';
    const departureDate = bookingData.departureDate || '';
    const cabinClass = bookingData.cabinClass || 'Economy';
    
    yPos = addField('PNR Number', pnr, yPos, true);
    yPos = addField('Airline', airline, yPos, true);
    yPos = addField('Flight Number', flightNumber, yPos, true);
    yPos = addField('From', `${origin} - ${getAirportName(origin)}`, yPos);
    yPos = addField('To', `${destination} - ${getAirportName(destination)}`, yPos);
    yPos = addField('Departure Date', formatDate(departureDate), yPos);
    yPos = addField('Cabin Class', cabinClass, yPos);
    yPos += 5;

    yPos = addSection('PASSENGER INFORMATION', yPos);
    
    const passengerInfo = booking?.passengerInfo || {};
    
    yPos = addField('Lead Passenger', `${passengerInfo.title || ''} ${passengerInfo.firstName || ''} ${passengerInfo.lastName || ''}`.trim(), yPos, true);
    yPos = addField('Email', passengerInfo.email || 'N/A', yPos);
    yPos = addField('Phone', passengerInfo.phone || 'N/A', yPos);
    yPos += 5;

    yPos = addSection('PRICE BREAKDOWN', yPos);
    
    const basePrice = booking.basePrice || 0;
    const markupAmount = booking.markupAmount || 0;
    const serviceFee = booking.serviceFee || 0;
    const totalAmount = booking.totalAmount || 0;
    const currency = booking.currency || 'USD';
    
    yPos = addField('Base Fare', formatPrice(basePrice, currency), yPos);
    yPos = addField('Markup', formatPrice(markupAmount, currency), yPos);
    yPos = addField('Service Fee', formatPrice(serviceFee, currency), yPos);
    doc.setFontSize(12);
    doc.setTextColor(51, 168, 222);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatPrice(totalAmount, currency)}`, 25, yPos + 5);
    yPos += 15;

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for choosing Ebony Bruce Travels!', 105, doc.internal.pageSize.height - 20, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, doc.internal.pageSize.height - 15, { align: 'center' });
    
    doc.save(`wakanow-booking-${booking.reference}.pdf`);
  };

  const renderWakanowDetails = () => {
    const bookingData = booking?.bookingData || {};
    const isWakanow = booking?.provider === 'WAKANOW' || bookingData?.provider === 'WAKANOW';
    const hasTicket = !!(booking?.pnrNumber || bookingData?.pnrNumber);
    
    if (!isWakanow) return null;
    
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
            <p className="font-semibold text-lg">{bookingData.airline || 'Wakanow Partner'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Flight Number</p>
            <p className="font-semibold text-lg">{bookingData.flightNumber || bookingData.offerId || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-blue-600">{bookingData.origin || 'N/A'}</span>
            </div>
            <p className="font-bold text-xl">{bookingData.origin || 'N/A'}</p>
            <p className="text-sm text-gray-500">Departure</p>
            <p className="font-medium mt-1">
              {bookingData.departureDate ? formatDate(bookingData.departureDate) : 'Date TBD'}
            </p>
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
            <p className="text-center text-sm text-gray-500 mt-2">Wakanow Flight</p>
          </div>

          <div className="text-center flex-1">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-green-600">{bookingData.destination || 'N/A'}</span>
            </div>
            <p className="font-bold text-xl">{bookingData.destination || 'N/A'}</p>
            <p className="text-sm text-gray-500">Arrival</p>
            <p className="font-medium mt-1">
              {bookingData.departureDate ? formatDate(bookingData.departureDate) : 'Date TBD'}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">PNR Number</p>
              <p className="font-mono font-bold text-lg">
                {(booking?.pnrNumber || 
                  bookingData?.pnrNumber || 
                  bookingData?.PnReferenceNumber || 
                  bookingData?.pnReferenceNumber || 
                  bookingData?.FlightBookingResult?.PnReferenceNumber ||
                  bookingData?.FlightBookingSummary?.PnReferenceNumber) || 'Not issued yet'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cabin Class</p>
              <p className="font-medium capitalize">{bookingData.cabinClass || 'Economy'}</p>
            </div>
          </div>
        </div>

        {!hasTicket && !isGuest && (
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

  const downloadFlightPDF = () => {
    if (!booking) return;
    
    const doc = new jsPDF();
    let yPos = 20;
    
    const addSection = (title: string, y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(51, 168, 222);
      doc.text(title, 20, y);
      return y + 8;
    };

    const addField = (label: string, value: string, y: number, isImportant: boolean = false) => {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(label, 25, y);
      doc.setFontSize(11);
      doc.setTextColor(isImportant ? 51 : 0, isImportant ? 168 : 0, isImportant ? 222 : 0);
      doc.text(value, 25, y + 5);
      return y + 12;
    };

    doc.setFontSize(22);
    doc.setTextColor(51, 168, 222);
    doc.text('Ebony Bruce Travels', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('FLIGHT BOOKING CONFIRMATION', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setDrawColor(51, 168, 222);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Booking Reference: ${booking.reference}`, 20, yPos);
    yPos += 7;
    doc.text(`Status: ${booking.status}`, 20, yPos);
    yPos += 7;
    doc.text(`Booked On: ${formatDate(booking.createdAt)}`, 20, yPos);
    yPos += 15;

    yPos = addSection('FLIGHT DETAILS', yPos);
    
    const bookingData = booking?.bookingData || {};
    const airline = bookingData.airline || 'N/A';
    const flightNumber = bookingData.flightNumber || 'N/A';
    const origin = bookingData.origin || 'N/A';
    const destination = bookingData.destination || 'N/A';
    const departureDate = bookingData.departureDate || '';
    const cabinClass = bookingData.cabinClass || 'Economy';
    
    yPos = addField('Airline', airline, yPos, true);
    yPos = addField('Flight Number', flightNumber, yPos, true);
    yPos = addField('From', `${origin} - ${getAirportName(origin)}`, yPos);
    yPos = addField('To', `${destination} - ${getAirportName(destination)}`, yPos);
    yPos = addField('Departure Date', formatDate(departureDate), yPos);
    yPos = addField('Cabin Class', cabinClass, yPos);
    
    const formatFlightTime = (date: string, hoursToAdd: number) => {
      if (!date) return 'N/A';
      try {
        const d = new Date(date);
        d.setHours(d.getHours() + hoursToAdd);
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return 'N/A';
      }
    };

    yPos = addField('Departure Time', formatFlightTime(departureDate, 0), yPos);
    yPos = addField('Arrival Time', formatFlightTime(departureDate, 2), yPos);
    yPos = addField('Duration', '2h 00m (estimated)', yPos);
    yPos += 5;

    yPos = addSection('PASSENGER INFORMATION', yPos);
    
    const passengerInfo = booking?.passengerInfo || {};
    const passengers = typeof bookingData.passengers === 'object' 
      ? bookingData.passengers 
      : { adults: bookingData.passengers || 1, children: 0, infants: 0 };
    
    yPos = addField('Lead Passenger', `${passengerInfo.title || ''} ${passengerInfo.firstName || ''} ${passengerInfo.lastName || ''}`.trim(), yPos, true);
    yPos = addField('Email', passengerInfo.email || 'N/A', yPos);
    yPos = addField('Phone', passengerInfo.phone || 'N/A', yPos);
    yPos = addField('Adults', passengers.adults?.toString() || '1', yPos);
    if (passengers.children > 0) yPos = addField('Children', passengers.children.toString(), yPos);
    if (passengers.infants > 0) yPos = addField('Infants', passengers.infants.toString(), yPos);
    yPos += 5;

    yPos = addSection('BAGGAGE ALLOWANCE', yPos);
    yPos = addField('Checked Baggage', '1 x 23kg per passenger', yPos);
    yPos = addField('Cabin Baggage', '1 x 7kg per passenger', yPos);
    yPos += 5;

    yPos = addSection('PRICE BREAKDOWN', yPos);
    
    const basePrice = booking.basePrice || 0;
    const markupAmount = booking.markupAmount || 0;
    const serviceFee = booking.serviceFee || 0;
    const totalAmount = booking.totalAmount || 0;
    const currency = booking.currency || 'USD';
    
    yPos = addField('Base Fare', formatPrice(basePrice, currency), yPos);
    yPos = addField('Markup', formatPrice(markupAmount, currency), yPos);
    yPos = addField('Service Fee', formatPrice(serviceFee, currency), yPos);
    doc.setFontSize(12);
    doc.setTextColor(51, 168, 222);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatPrice(totalAmount, currency)}`, 25, yPos + 5);
    yPos += 15;

    yPos = addSection('IMPORTANT INFORMATION', yPos);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('• Check-in opens 24 hours before departure', 25, yPos);
    yPos += 5;
    doc.text('• Arrive at airport at least 3 hours before departure', 25, yPos);
    yPos += 5;
    doc.text('• Valid passport/ID required for all passengers', 25, yPos);
    yPos += 5;
    doc.text('• Visa requirements vary by destination - check before travel', 25, yPos);
    yPos += 5;
    doc.text('• Flight times are estimates and subject to change', 25, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for choosing Ebony Bruce Travels!', 105, doc.internal.pageSize.height - 20, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, doc.internal.pageSize.height - 15, { align: 'center' });
    
    doc.save(`flight-booking-${booking.reference}.pdf`);
  };

  const downloadHotelPDF = () => {
    if (!booking) return;
    
    const doc = new jsPDF();
    let yPos = 20;
    
    const addSection = (title: string, y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(51, 168, 222);
      doc.text(title, 20, y);
      return y + 8;
    };

    const addField = (label: string, value: string, y: number, isImportant: boolean = false) => {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(label, 25, y);
      doc.setFontSize(11);
      doc.setTextColor(isImportant ? 51 : 0, isImportant ? 168 : 0, isImportant ? 222 : 0);
      doc.text(value, 25, y + 5);
      return y + 12;
    };

    doc.setFontSize(22);
    doc.setTextColor(51, 168, 222);
    doc.text('Ebony Bruce Travels', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('HOTEL BOOKING CONFIRMATION', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setDrawColor(51, 168, 222);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Booking Reference: ${booking.reference}`, 20, yPos);
    yPos += 7;
    doc.text(`Status: ${booking.status}`, 20, yPos);
    yPos += 7;
    doc.text(`Booked On: ${formatDate(booking.createdAt)}`, 20, yPos);
    yPos += 15;

    yPos = addSection('HOTEL DETAILS', yPos);
    
    const providerData = booking?.providerData as any;
    const hotelBookings = providerData?.hotelBookings?.[0];
    const hotelOffer = hotelBookings?.hotelOffer;
    const hotel = hotelBookings?.hotel;
    const bookingData = booking?.bookingData || {};
    
    const hotelName = hotel?.name || hotelOffer?.hotel?.name || bookingData.hotelName || 'Hotel';
    const checkInDate = hotelOffer?.checkInDate || bookingData.checkInDate || '';
    const checkOutDate = hotelOffer?.checkOutDate || bookingData.checkOutDate || '';
    const nights = calculateNights(checkInDate, checkOutDate);
    const roomType = hotelOffer?.room?.type || bookingData.roomType || 'Standard Room';
    const roomDescription = hotelOffer?.room?.description?.text || '';
    const roomQuantity = hotelOffer?.roomQuantity || bookingData.rooms || 1;
    const adults = hotelOffer?.guests?.adults || bookingData.guests || 1;
    const confirmationNumber = hotelBookings?.hotelProviderInformation?.[0]?.confirmationNumber || booking?.providerBookingId;
    
    yPos = addField('Hotel Name', hotelName, yPos, true);
    if (confirmationNumber) yPos = addField('Confirmation Number', confirmationNumber, yPos, true);
    yPos = addField('Check-in Date', formatDate(checkInDate), yPos);
    yPos = addField('Check-out Date', formatDate(checkOutDate), yPos);
    yPos = addField('Nights', nights.toString(), yPos);
    yPos = addField('Room Type', roomType, yPos);
    if (roomDescription) yPos = addField('Room Description', roomDescription, yPos);
    yPos = addField('Rooms', roomQuantity.toString(), yPos);
    yPos = addField('Guests', `${adults} Adult(s)`, yPos);
    yPos += 5;

    yPos = addSection('GUEST INFORMATION', yPos);
    
    const passengerInfo = booking?.passengerInfo || {};
    const guests = hotelBookings?.guests || [];
    
    yPos = addField('Lead Guest', `${passengerInfo.title || ''} ${passengerInfo.firstName || ''} ${passengerInfo.lastName || ''}`.trim(), yPos, true);
    yPos = addField('Email', passengerInfo.email || 'N/A', yPos);
    yPos = addField('Phone', passengerInfo.phone || 'N/A', yPos);
    
    if (guests.length > 0) {
      yPos = addField('Additional Guests', guests.map((g: any) => `${g.name?.firstName} ${g.name?.lastName}`).join(', '), yPos);
    }
    yPos += 5;

    yPos = addSection('PRICE BREAKDOWN', yPos);
    
    const basePrice = booking.basePrice || 0;
    const markupAmount = booking.markupAmount || 0;
    const serviceFee = booking.serviceFee || 0;
    const totalAmount = booking.totalAmount || 0;
    const currency = booking.currency || 'USD';
    
    yPos = addField('Base Price', formatPrice(basePrice, currency), yPos);
    yPos = addField('Markup', formatPrice(markupAmount, currency), yPos);
    yPos = addField('Service Fee', formatPrice(serviceFee, currency), yPos);
    yPos = addField('Price per Night', formatPrice(totalAmount / nights, currency), yPos);
    
    doc.setFontSize(12);
    doc.setTextColor(51, 168, 222);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatPrice(totalAmount, currency)}`, 25, yPos + 5);
    yPos += 15;

    const cancellations = hotelOffer?.policies?.cancellations || [];
    const cancellationDeadline = cancellations[0]?.deadline;
    const cancellationAmount = cancellations[0]?.amount;
    
    if (cancellationDeadline || cancellationAmount) {
      yPos = addSection('CANCELLATION POLICY', yPos);
      if (cancellationDeadline) {
        yPos = addField('Free cancellation until', formatDate(cancellationDeadline), yPos, true);
      }
      if (cancellationAmount) {
        yPos = addField('Cancellation fee after', formatPrice(parseFloat(cancellationAmount), currency), yPos);
      }
      yPos += 5;
    }

    yPos = addSection('HOTEL POLICIES', yPos);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('• Check-in: from 14:00', 25, yPos);
    yPos += 5;
    doc.text('• Check-out: until 11:00', 25, yPos);
    yPos += 5;
    doc.text('• Breakfast hours: 07:00 - 10:30', 25, yPos);
    yPos += 5;
    doc.text('• Valid ID required at check-in', 25, yPos);
    yPos += 5;
    doc.text('• Credit card required for incidentals', 25, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for choosing Ebony Bruce Travels!', 105, doc.internal.pageSize.height - 20, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, doc.internal.pageSize.height - 15, { align: 'center' });
    
    doc.save(`hotel-booking-${booking.reference}.pdf`);
  };

  const downloadCarPDF = () => {
    if (!booking) return;
    
    const doc = new jsPDF();
    let yPos = 20;
    
    const addSection = (title: string, y: number) => {
      doc.setFontSize(14);
      doc.setTextColor(51, 168, 222);
      doc.text(title, 20, y);
      return y + 8;
    };

    const addField = (label: string, value: string, y: number, isImportant: boolean = false) => {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(label, 25, y);
      doc.setFontSize(11);
      doc.setTextColor(isImportant ? 51 : 0, isImportant ? 168 : 0, isImportant ? 222 : 0);
      doc.text(value, 25, y + 5);
      return y + 12;
    };

    doc.setFontSize(22);
    doc.setTextColor(51, 168, 222);
    doc.text('Ebony Bruce Travels', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('CAR RENTAL CONFIRMATION', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setDrawColor(51, 168, 222);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 5;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Booking Reference: ${booking.reference}`, 20, yPos);
    yPos += 7;
    doc.text(`Status: ${booking.status}`, 20, yPos);
    yPos += 7;
    doc.text(`Booked On: ${formatDate(booking.createdAt)}`, 20, yPos);
    yPos += 15;

    yPos = addSection('VEHICLE DETAILS', yPos);
    
    const bookingData = booking?.bookingData || {};
    const vehicleType = bookingData.vehicleType || 'Car Rental';
    const offerId = bookingData.offerId || 'N/A';
    const pickupLocationCode = bookingData.pickupLocationCode || 'N/A';
    const dropoffLocationCode = bookingData.dropoffLocationCode || 'N/A';
    const pickupDateTime = bookingData.pickupDateTime || '';
    const dropoffDateTime = bookingData.dropoffDateTime || '';
    const rentalDays = calculateRentalDays(pickupDateTime, dropoffDateTime);
    
    const getVehicleCategory = (type: string) => {
      if (type.includes('VAN')) return 'Van';
      if (type.includes('SUV')) return 'SUV';
      if (type.includes('LUXURY')) return 'Luxury';
      if (type.includes('ECONOMY')) return 'Economy';
      return 'Standard';
    };
    
    const vehicleCategory = getVehicleCategory(vehicleType);
    const passengerCapacity = vehicleType.includes('VAN') ? 7 : vehicleType.includes('SUV') ? 5 : 4;
    
    yPos = addField('Vehicle Type', vehicleType, yPos, true);
    yPos = addField('Category', vehicleCategory, yPos);
    yPos = addField('Passenger Capacity', `${passengerCapacity} seats`, yPos);
    yPos = addField('Transmission', 'Automatic', yPos);
    yPos = addField('Offer ID', offerId, yPos);
    yPos += 5;

    yPos = addSection('RENTAL PERIOD', yPos);
    
    yPos = addField('Pick-up Location', `${pickupLocationCode} - ${getAirportName(pickupLocationCode)}`, yPos, true);
    yPos = addField('Pick-up Date', formatDate(pickupDateTime), yPos);
    yPos = addField('Pick-up Time', formatTime(pickupDateTime), yPos, true);
    yPos = addField('Drop-off Location', `${dropoffLocationCode} - ${getAirportName(dropoffLocationCode)}`, yPos, true);
    yPos = addField('Drop-off Date', formatDate(dropoffDateTime), yPos);
    yPos = addField('Drop-off Time', formatTime(dropoffDateTime), yPos, true);
    yPos = addField('Rental Duration', `${rentalDays} day(s)`, yPos);
    yPos += 5;

    yPos = addSection('DRIVER INFORMATION', yPos);
    
    const passengerInfo = booking?.passengerInfo || {};
    
    yPos = addField('Driver Name', `${passengerInfo.title || ''} ${passengerInfo.firstName || ''} ${passengerInfo.lastName || ''}`.trim(), yPos, true);
    yPos = addField('Email', passengerInfo.email || 'N/A', yPos);
    yPos = addField('Phone', passengerInfo.phone || 'N/A', yPos);
    yPos = addField('Driver License', 'Required at pick-up', yPos);
    yPos += 5;

    yPos = addSection('PRICE BREAKDOWN', yPos);
    
    const basePrice = booking.basePrice || 0;
    const markupAmount = booking.markupAmount || 0;
    const serviceFee = booking.serviceFee || 0;
    const totalAmount = booking.totalAmount || 0;
    const currency = booking.currency || 'USD';
    
    yPos = addField('Base Price', formatPrice(basePrice, currency), yPos);
    yPos = addField('Markup', formatPrice(markupAmount, currency), yPos);
    yPos = addField('Service Fee', formatPrice(serviceFee, currency), yPos);
    yPos = addField('Price per Day', formatPrice(totalAmount / rentalDays, currency), yPos);
    
    doc.setFontSize(12);
    doc.setTextColor(51, 168, 222);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatPrice(totalAmount, currency)}`, 25, yPos + 5);
    yPos += 15;

    yPos = addSection('INCLUDED IN RENTAL', yPos);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('• Unlimited mileage', 25, yPos);
    yPos += 5;
    doc.text('• Collision Damage Waiver (CDW)', 25, yPos);
    yPos += 5;
    doc.text('• Theft Protection (TP)', 25, yPos);
    yPos += 5;
    doc.text('• Third Party Liability', 25, yPos);
    yPos += 5;
    doc.text('• Airport surcharges', 25, yPos);
    yPos += 5;
    doc.text('• 24/7 Roadside Assistance', 25, yPos);
    yPos += 10;

    yPos = addSection('IMPORTANT INFORMATION', yPos);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('• Valid driver\'s license required at pick-up', 25, yPos);
    yPos += 5;
    doc.text('• Driver must be at least 21 years old', 25, yPos);
    yPos += 5;
    doc.text('• Credit card required for security deposit', 25, yPos);
    yPos += 5;
    doc.text('• Fuel policy: Same-to-same (return with full tank)', 25, yPos);
    yPos += 5;
    doc.text('• Additional drivers can be added at counter', 25, yPos);
    yPos += 5;
    doc.text('• Cross-border travel may be restricted', 25, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for choosing Ebony Bruce Travels!', 105, doc.internal.pageSize.height - 20, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, doc.internal.pageSize.height - 15, { align: 'center' });
    
    doc.save(`car-rental-${booking.reference}.pdf`);
  };

  const formatDate = (dateString: string) => {
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

  const formatTime = (dateString: string) => {
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

  const getAirportName = (code: string) => {
    const airports: Record<string, string> = {
      'LOS': 'Murtala Muhammed International Airport',
      'LHR': 'London Heathrow Airport',
      'LGW': 'London Gatwick Airport',
      'JFK': 'John F. Kennedy International Airport',
      'CDG': 'Charles de Gaulle Airport',
      'DXB': 'Dubai International Airport',
      'SYD': 'Sydney Airport',
      'NYC': 'New York Airport',
      'PAR': 'Paris Airport',
      'ABV': 'Nnamdi Azikiwe International Airport',
    };
    return airports[code] || code;
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
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

  const calculateRentalDays = (pickup: string, dropoff: string) => {
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

  const renderFlightDetails = () => {
    const bookingData = booking?.bookingData || {};
    
    const airline = bookingData.airline || 'N/A';
    const flightNumber = bookingData.flightNumber || 'N/A';
    const origin = bookingData.origin || 'N/A';
    const destination = bookingData.destination || 'N/A';
    const departureDate = bookingData.departureDate || '';
    const cabinClass = bookingData.cabinClass || 'Economy';
    const passengers = typeof bookingData.passengers === 'object' 
      ? bookingData.passengers 
      : { adults: bookingData.passengers || 1, children: 0, infants: 0 };
    
    const formatDepartureTime = () => {
      if (!departureDate) return 'N/A';
      try {
        const date = new Date(departureDate);
        return date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } catch {
        return '00:00';
      }
    };

    const getEstimatedArrival = () => {
      if (!departureDate) return 'N/A';
      try {
        const date = new Date(departureDate);
        date.setHours(date.getHours() + 2);
        return date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } catch {
        return '02:00';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <p className="text-sm text-gray-500">Airline</p>
            <p className="font-semibold text-lg">{airline}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Flight Number</p>
            <p className="font-semibold text-lg">{flightNumber}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-blue-600">{origin}</span>
            </div>
            <p className="font-bold text-xl">{origin}</p>
            <p className="text-sm text-gray-500">Departure</p>
            <p className="font-medium mt-1">{formatDate(departureDate)}</p>
            <p className="text-lg font-semibold text-blue-600">{formatDepartureTime()}</p>
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
            <p className="text-center text-sm text-gray-500 mt-2">Direct Flight</p>
          </div>

          <div className="text-center flex-1">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-green-600">{destination}</span>
            </div>
            <p className="font-bold text-xl">{destination}</p>
            <p className="text-sm text-gray-500">Arrival</p>
            <p className="font-medium mt-1">{formatDate(departureDate)}</p>
            <p className="text-lg font-semibold text-green-600">{getEstimatedArrival()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Cabin Class</p>
            <p className="font-medium capitalize">{cabinClass}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Passengers</p>
            <p className="font-medium">{passengers.adults || 1} Adult(s)</p>
            {passengers.children > 0 && (
              <p className="text-sm text-gray-600">{passengers.children} Child(ren)</p>
            )}
            {passengers.infants > 0 && (
              <p className="text-sm text-gray-600">{passengers.infants} Infant(s)</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500 mb-2">Baggage Allowance</p>
          <p className="text-sm">1 x 23kg checked baggage per passenger</p>
          <p className="text-sm">1 x 7kg cabin baggage per passenger</p>
        </div>
      </div>
    );
  };

  const renderHotelDetails = () => {
    const providerData = booking?.providerData as any;
    const hotelBookings = providerData?.hotelBookings?.[0];
    const hotelOffer = hotelBookings?.hotelOffer;
    const hotel = hotelBookings?.hotel;
    const bookingData = booking?.bookingData || {};
    
    console.log('Hotel data for rendering:', {
      providerData,
      hotelBookings,
      hotelOffer,
      hotel,
      bookingData
    });

    if (!hotelOffer && !hotel) {
      return (
        <div className="text-center py-8 text-gray-500">
          Hotel details not available
        </div>
      );
    }

    const hotelName = hotel?.name || hotelOffer?.hotel?.name || bookingData.hotelName || 'Hotel';
    const hotelId = hotel?.hotelId || hotelOffer?.hotel?.hotelId || bookingData.hotelId || 'N/A';
    const chainCode = hotel?.chainCode || hotelOffer?.hotel?.chainCode || '';
    
    const checkInDate = hotelOffer?.checkInDate || bookingData.checkInDate || '';
    const checkOutDate = hotelOffer?.checkOutDate || bookingData.checkOutDate || '';
    const nights = calculateNights(checkInDate, checkOutDate);
    const roomType = hotelOffer?.room?.type || bookingData.roomType || 'Standard Room';
    const roomDescription = hotelOffer?.room?.description?.text || '';
    const roomQuantity = hotelOffer?.roomQuantity || bookingData.rooms || 1;
    const adults = hotelOffer?.guests?.adults || bookingData.guests || 1;
    const guests = hotelBookings?.guests || (bookingData.guests ? [bookingData.guests] : []);
    const price = hotelOffer?.price || {};
    const basePrice = price.base ? parseFloat(price.base) : (booking?.basePrice || 0);
    const totalPrice = price.total ? parseFloat(price.total) : (booking?.totalAmount || 0);
    const currency = price.currency || booking?.currency || 'USD';
    const taxes = price.taxes || [];
    const cancellations = hotelOffer?.policies?.cancellations || [];
    const cancellationDeadline = cancellations[0]?.deadline || booking?.cancellationDeadline;
    const cancellationAmount = cancellations[0]?.amount;
    const bookingStatus = hotelBookings?.bookingStatus || booking?.status;
    const confirmationNumber = hotelBookings?.hotelProviderInformation?.[0]?.confirmationNumber || 
                              booking?.providerBookingId;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <p className="text-sm text-gray-500">Hotel</p>
            <p className="font-semibold text-xl">{hotelName}</p>
            {chainCode && <p className="text-sm text-gray-500">{chainCode} • {hotelId}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Booking Status</p>
            <span className={`inline-block mt-1 text-xs font-bold uppercase px-3 py-1 rounded-full ${
              bookingStatus === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {bookingStatus || 'CONFIRMED'}
            </span>
            {confirmationNumber && (
              <>
                <p className="text-sm text-gray-500 mt-2">Confirmation #</p>
                <p className="font-mono text-sm">{confirmationNumber}</p>
              </>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Check-in</p>
              <p className="font-bold text-lg">{formatDate(checkInDate)}</p>
              <p className="text-sm text-gray-600">from 14:00</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Check-out</p>
              <p className="font-bold text-lg">{formatDate(checkOutDate)}</p>
              <p className="text-sm text-gray-600">until 11:00</p>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="inline-block bg-white px-3 py-1 rounded-full text-sm font-medium">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Room Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Room Type</p>
              <p className="font-medium">{roomType}</p>
              {roomDescription && (
                <p className="text-sm text-gray-600 mt-1">{roomDescription}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Quantity</p>
              <p className="font-medium">{roomQuantity} room(s)</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Guests</p>
              <p className="font-medium">{adults} Adult(s)</p>
              {guests.length > 0 && (
                <p className="text-xs text-gray-500">
                  {guests.map((g: any) => `${g.name?.firstName} ${g.name?.lastName}`).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Price Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price ({nights} nights)</span>
              <span className="font-medium">{formatPrice(basePrice, currency)}</span>
            </div>
            
            {taxes.length > 0 && (
              <>
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Taxes & Fees</p>
                  {taxes.map((tax: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-500">{tax.code?.replace(/_/g, ' ')}</span>
                      <span>{formatPrice(parseFloat(tax.amount), tax.currency || currency)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-[#33a8da] text-lg">{formatPrice(totalPrice, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {(cancellationDeadline || cancellationAmount) && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Cancellation Policy</h4>
            <div className="space-y-2">
              {cancellationDeadline && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Free cancellation until</span>
                  <span className="font-medium">{formatDate(cancellationDeadline)}</span>
                </div>
              )}
              {cancellationAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancellation fee after</span>
                  <span className="font-medium text-red-600">{formatPrice(parseFloat(cancellationAmount), currency)}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {booking?.cancellationPolicySnapshot || 'Standard cancellation policy applies'}
              </p>
            </div>
          </div>
        )}

        {guests.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Guest Information</h4>
            {guests.map((guest: any, index: number) => (
              <div key={index} className="mb-3 last:mb-0">
                <p className="font-medium">
                  {guest.name?.title} {guest.name?.firstName} {guest.name?.lastName}
                </p>
                {guest.contact && (
                  <div className="text-sm text-gray-600">
                    <p>Email: {guest.contact.email}</p>
                    <p>Phone: {guest.contact.phone}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCarRentalDetails = () => {
    const bookingData = booking?.bookingData || {};
    const providerData = booking?.providerData as any;
    
    console.log('Car rental data for rendering:', {
      bookingData,
      providerData,
      booking
    });

    const vehicleType = bookingData.vehicleType || 'Car Rental';
    const offerId = bookingData.offerId || 'N/A';
    const pickupLocationCode = bookingData.pickupLocationCode || 'N/A';
    const dropoffLocationCode = bookingData.dropoffLocationCode || 'N/A';
    const pickupDateTime = bookingData.pickupDateTime || '';
    const dropoffDateTime = bookingData.dropoffDateTime || '';
    const passengerInfo = (booking?.passengerInfo as any) || {};
    const firstName = passengerInfo.firstName || '';
    const lastName = passengerInfo.lastName || '';
    const email = passengerInfo.email || '';
    const phone = passengerInfo.phone || '';
    const rentalDays = calculateRentalDays(pickupDateTime, dropoffDateTime);

    const getVehicleCategory = (type: string) => {
      if (type.includes('VAN')) return 'Van';
      if (type.includes('SUV')) return 'SUV';
      if (type.includes('LUXURY')) return 'Luxury';
      if (type.includes('ECONOMY')) return 'Economy';
      return 'Standard';
    };

    const vehicleCategory = getVehicleCategory(vehicleType);
    
    const getPassengerCapacity = (type: string) => {
      if (type.includes('VAN')) return 7;
      if (type.includes('SUV')) return 5;
      if (type.includes('LUXURY')) return 4;
      return 4;
    };

    const passengerCapacity = getPassengerCapacity(vehicleType);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <p className="text-sm text-gray-500">Vehicle</p>
            <p className="font-semibold text-xl">{vehicleType}</p>
            <p className="text-sm text-gray-500 mt-1">{vehicleCategory} • Offer ID: {offerId}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Booking Status</p>
            <span className="inline-block mt-1 text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-100 text-green-700">
              {booking?.status || 'CONFIRMED'}
            </span>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 text-center">Rental Period</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Pick-up</p>
              <p className="font-bold text-lg">{formatDate(pickupDateTime)}</p>
              <p className="text-lg font-semibold text-blue-600">{formatTime(pickupDateTime)}</p>
              <p className="text-sm font-medium mt-1">{getAirportName(pickupLocationCode)}</p>
              <p className="text-xs text-gray-500">{pickupLocationCode}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Drop-off</p>
              <p className="font-bold text-lg">{formatDate(dropoffDateTime)}</p>
              <p className="text-lg font-semibold text-blue-600">{formatTime(dropoffDateTime)}</p>
              <p className="text-sm font-medium mt-1">{getAirportName(dropoffLocationCode)}</p>
              <p className="text-xs text-gray-500">{dropoffLocationCode}</p>
            </div>
          </div>
          <div className="text-center mt-3">
            <span className="inline-block bg-white px-4 py-2 rounded-full text-sm font-medium">
              {rentalDays} {rentalDays === 1 ? 'day' : 'days'} rental
            </span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Vehicle Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Vehicle Type</p>
              <p className="font-medium">{vehicleCategory}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Passenger Capacity</p>
              <p className="font-medium">{passengerCapacity} seats</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Transmission</p>
              <p className="font-medium">Automatic</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Baggage</p>
              <p className="font-medium">{vehicleCategory === 'Van' ? '4 bags' : '2 bags'}</p>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Price Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price ({rentalDays} days)</span>
              <span className="font-medium">{formatPrice(booking?.basePrice || 0, booking?.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Markup</span>
              <span className="font-medium">{formatPrice(booking?.markupAmount || 0, booking?.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Fee</span>
              <span className="font-medium">{formatPrice(booking?.serviceFee || 0, booking?.currency)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Total Amount</span>
                <span className="text-[#33a8da] text-lg">{formatPrice(booking?.totalAmount || 0, booking?.currency)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Price per day: {formatPrice((booking?.totalAmount || 0) / rentalDays, booking?.currency)}
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Driver Information</h4>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{firstName} {lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{phone}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-yellow-800 mb-1">Important Information</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Valid driver's license required</li>
                <li>• Driver must be at least 21 years old</li>
                <li>• Credit card required at pick-up for deposit</li>
                <li>• Fuel policy: Same-to-same (return with full tank)</li>
              </ul>
            </div>
          </div>
        </div>

        {providerData?.orderCreationError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-orange-800">Provider Confirmation Pending</p>
                <p className="text-sm text-orange-700">
                  Your booking is confirmed and payment successful. We're waiting for final confirmation from the rental provider. You'll receive an email once confirmed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
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

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const isWakanow = booking?.provider === 'WAKANOW' || booking?.bookingData?.provider === 'WAKANOW';

  // Email form for guest bookings (only shown when no email is provided and no booking)
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

  const isConfirmed = ['CONFIRMED', 'COMPLETED', 'PAID'].includes(booking.status);
  const isPending = ['PENDING', 'PROCESSING'].includes(booking.status);
  const isFailed = ['FAILED', 'CANCELLED'].includes(booking.status);
  const productType = booking.productType || booking.bookingData?.productType;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Guest banner - encouraging sign up (not blocking content) */}
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

      {/* Status-specific header */}
      <div className="text-center mb-8">
        {isConfirmed && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">
              Your booking has been successfully confirmed. A confirmation email has been sent.
            </p>
          </>
        )}

        {isPending && (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Processing</h1>
            <p className="text-gray-600">Your payment was successful, but we're still waiting for confirmation from the provider. We'll notify you via email once confirmed.</p>
          </>
        )}

        {isFailed && (
          <>
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
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Booking Failed
            </h1>
            <p className="text-gray-600 mb-4">
              We couldn't confirm your booking with the provider. A refund has
              been initiated.
            </p>
          </>
        )}
      </div>

      {/* Basic booking summary - visible to everyone */}
      <div className="bg-white rounded-xl shadow p-6 mb-8 border border-gray-100">
        <div className="text-center mb-4">
          <div className="inline-block bg-blue-50 px-4 py-2 rounded-full mb-4">
            <span className="text-sm font-medium text-blue-700">
              {isWakanow ? 'WAKANOW FLIGHT' : (productType?.replace(/_/g, ' ') || 'Booking')}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Reference: {booking.reference}</h2>
          <p className="text-gray-600">
            {isConfirmed && 'Your booking has been confirmed'}
            {isPending && 'Your booking is being processed'}
            {isFailed && 'Your booking could not be completed'}
          </p>
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

            {isWakanow && booking.pnrNumber && (
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">PNR Number</p>
                <p className="font-mono font-bold text-sm">{booking.pnrNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* For ALL users: Show full detailed itinerary (no blur, no blocking) */}
      {booking && (
        <div className="space-y-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h3 className="text-xl font-bold mb-4">Trip Details</h3>
            {isWakanow && renderWakanowDetails()}
            {!isWakanow && productType?.includes('FLIGHT') && renderFlightDetails()}
            {!isWakanow && productType?.includes('HOTEL') && renderHotelDetails()}
            {!isWakanow && productType?.includes('CAR') && renderCarRentalDetails()}
          </div>

          {!productType?.includes('HOTEL') && !productType?.includes('CAR') && booking.basePrice && (
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
              <h3 className="text-xl font-bold mb-4">Price Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price</span>
                  <span className="font-medium">{formatPrice(booking.basePrice || 0, booking.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Markup</span>
                  <span className="font-medium">{formatPrice(booking.markupAmount || 0, booking.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="font-medium">{formatPrice(booking.serviceFee || 0, booking.currency)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total Amount</span>
                    <span className="text-[#33a8da] text-lg">{formatPrice(booking.totalAmount || 0, booking.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {booking.passengerInfo && (
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
              <h3 className="text-xl font-bold mb-4">Traveler Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <Detail 
                  label="Name" 
                  value={`${booking.passengerInfo.title || ''} ${booking.passengerInfo.firstName || ''} ${booking.passengerInfo.lastName || ''}`.trim()} 
                />
                <Detail label="Email" value={booking.passengerInfo.email} />
                <Detail label="Phone" value={booking.passengerInfo.phone || 'N/A'} />
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h3 className="text-xl font-bold mb-4">Booking Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Detail label="Booking Reference" value={booking.reference} highlight />
              <Detail label="Provider" value={booking.provider || 'N/A'} />
              <Detail label="Payment Status" value={booking.paymentStatus} badge={getStatusBadge(booking.paymentStatus)} />
              <Detail label="Payment Reference" value={booking.paymentReference || 'N/A'} />
              {booking.providerBookingId && (
                <Detail label="Provider Reference" value={booking.providerBookingId} />
              )}
              {isWakanow && booking.pnrNumber && (
                <Detail label="PNR Number" value={booking.pnrNumber} highlight />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status-specific messages */}
      {isPending && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-sm text-blue-800">
          <p className="font-medium mb-1">What happens next?</p>
          <p>We're confirming your booking with the provider. This usually takes 1-2 minutes. You'll receive an email once confirmed.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Refresh Status
          </button>
        </div>
      )}

      {isFailed && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-8 text-sm text-red-800">
          <p className="font-medium mb-1">Refund Information</p>
          <p>
            A full refund of{" "}
            {formatPrice(booking.totalAmount, booking.currency)} has been
            initiated. It may take 5-10 business days to appear in your account.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {!isGuest ? (
          <>
            <button 
              onClick={() => router.push('/profile?tab=bookings')} 
              className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
            >
              View My Bookings
            </button>
            
            <button 
              onClick={() => {
                if (isWakanow) {
                  downloadWakanowPDF();
                } else if (productType?.includes('FLIGHT')) {
                  downloadFlightPDF();
                } else if (productType?.includes('HOTEL')) {
                  downloadHotelPDF();
                } else if (productType?.includes('CAR')) {
                  downloadCarPDF();
                } else {
                  downloadFlightPDF();
                }
              }}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download {isWakanow ? 'Wakanow' : (productType?.includes('FLIGHT') ? 'Flight' : productType?.includes('HOTEL') ? 'Hotel' : 'Car Rental')} Report
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => {
                const params = new URLSearchParams();
                if (email) params.set('email', email);
                if (bookingRef) params.set('bookingRef', bookingRef);
                router.push(`/register?${params.toString()}`);
              }} 
              className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
            >
              Create Free Account
            </button>
            
            <button 
              onClick={() => {
                if (isWakanow) {
                  downloadWakanowPDF();
                } else if (productType?.includes('FLIGHT')) {
                  downloadFlightPDF();
                } else if (productType?.includes('HOTEL')) {
                  downloadHotelPDF();
                } else if (productType?.includes('CAR')) {
                  downloadCarPDF();
                } else {
                  downloadFlightPDF();
                }
              }}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Report
            </button>
          </>
        )}
        
        <button 
          onClick={() => router.push('/')} 
          className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 border border-gray-300"
        >
          Back to Home
        </button>
      </div>

      {/* Guest reminder */}
      {isGuest && (
        <p className="text-center text-sm text-gray-500 mt-6">
          <svg className="inline-block w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Your booking reference has been sent to {email}. Save it to check your booking later.
        </p>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  highlight,
  badge,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: string;
}) {
  const badgeColors = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-700",
    purple: "bg-purple-100 text-purple-700",
  };

  if (!value || value === 'N/A' || value.trim() === '') {
    return null;
  }

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      {badge ? (
        <span
          className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${badgeColors[badge as keyof typeof badgeColors] || badgeColors.gray}`}
        >
          {value}
        </span>
      ) : (
        <span
          className={`font-medium ${highlight ? "text-lg text-[#33a8da]" : "text-gray-900"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}