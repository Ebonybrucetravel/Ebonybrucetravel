'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { formatPrice } from '@/lib/utils';

interface FlightDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
}

const FlightDetails: React.FC<FlightDetailsProps> = ({ item, searchParams, onBack, onBook }) => {
  const router = useRouter();
  const { selectItem } = useSearch();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Debug log
  useEffect(() => {
    console.log('🎯 FlightDetails received item:', item);
    console.log('🎯 Item slices:', item.slices);
    console.log('🎯 Number of slices:', item.slices?.length);
  }, [item]);

  // Handle booking with complete data preservation
  const handleBookClick = () => {
    console.log('📚 Creating booking from flight with price fields:', {
      original_amount: item.original_amount,
      markup_amount: item.markup_amount,
      service_fee: item.service_fee,
      final_amount: item.final_amount,
      currency: item.currency
    });

    // Create a COMPLETE booking object with ALL flight details including price fields
    const completeBooking = {
      // Spread all item properties first
      ...item,
      
      // Ensure ID is set
      id: item.id || `flight-${Date.now()}`,
      
      // Set booking-specific fields
      type: 'flight',
      status: 'Confirmed',
      date: item.departureTime || new Date().toISOString(),
      
      // Explicitly include ALL price fields at the top level
      original_amount: item.original_amount,
      markup_amount: item.markup_amount,
      service_fee: item.service_fee,
      final_amount: item.final_amount,
      currency: item.currency || 'GBP',
      
      // Explicitly include ALL flight fields to ensure they're captured
      departureAirport: item.departureAirport,
      arrivalAirport: item.arrivalAirport,
      departureCity: item.departureCity,
      arrivalCity: item.arrivalCity,
      departureTime: item.departureTime,
      arrivalTime: item.arrivalTime,
      airlineName: item.airlineName,
      airlineCode: item.airlineCode,
      airlineLogo: item.airlineLogo,
      flightNumber: item.flightNumber,
      stopCount: item.stopCount,
      stopText: item.stopText,
      cabin: item.cabin,
      baggage: item.baggage,
      displayPrice: item.displayPrice || item.price,
      price: item.price,
      duration: item.duration,
      
      // For backward compatibility
      title: item.title || `${item.departureAirport} → ${item.arrivalAirport}`,
      provider: item.airlineName || item.provider,
      subtitle: item.subtitle || `${item.airlineName} ${item.flightNumber}`,
      
      // Icon background
      iconBg: 'text-[#33a8da]',
      
      // Include slices for segment details if available
      slices: item.slices,
      
      // Include realData if available
      realData: item.realData,
      
      // Include owner if available
      owner: item.owner,
    };

    console.log('💾 Saving complete booking with price fields:', {
      id: completeBooking.id,
      original_amount: completeBooking.original_amount,
      markup_amount: completeBooking.markup_amount,
      service_fee: completeBooking.service_fee,
      final_amount: completeBooking.final_amount,
      currency: completeBooking.currency
    });

    // ✅ STEP 1: Set the selected item in context (this is crucial!)
    selectItem(completeBooking);
    
    // Save to storage as backup
    try {
      // Save as current booking (for immediate use in payment)
      sessionStorage.setItem('currentBooking', JSON.stringify(completeBooking));
      
      // Add to recent bookings list
      const recentBookings = sessionStorage.getItem('recentBookings');
      const bookings = recentBookings ? JSON.parse(recentBookings) : [];
      
      // Check if booking already exists
      const existingIndex = bookings.findIndex((b: any) => b.id === completeBooking.id);
      if (existingIndex >= 0) {
        bookings[existingIndex] = completeBooking;
      } else {
        bookings.push(completeBooking);
      }
      
      // Keep only last 10 bookings
      const recentBookingsTrimmed = bookings.slice(-10);
      sessionStorage.setItem('recentBookings', JSON.stringify(recentBookingsTrimmed));
      console.log('✅ Saved to sessionStorage, recentBookings count:', recentBookingsTrimmed.length);
      
      // Also save to localStorage for persistence
      const savedBookings = localStorage.getItem('userBookings');
      const allBookings = savedBookings ? JSON.parse(savedBookings) : [];
      
      const localExistingIndex = allBookings.findIndex((b: any) => b.id === completeBooking.id);
      if (localExistingIndex >= 0) {
        allBookings[localExistingIndex] = completeBooking;
      } else {
        allBookings.push(completeBooking);
      }
      
      localStorage.setItem('userBookings', JSON.stringify(allBookings));
      console.log('✅ Saved to localStorage');
      
      // Store individual booking by ID for easy retrieval
      localStorage.setItem(`booking_${completeBooking.id}`, JSON.stringify(completeBooking));
      
    } catch (e) {
      console.error('❌ Error saving booking:', e);
    }

    // ✅ STEP 2: Navigate to review page
    router.push('/booking/review');
  };

  // Format functions
  const formatTime = (dateTime?: string) => {
    if (!dateTime) return '--:--';
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateTime?: string) => {
    if (!dateTime) return '';
    try {
      const date = new Date(dateTime);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Fixed calculateDuration function to handle both string and object
  const calculateDuration = (duration?: any) => {
    if (!duration) return '';
    
    // If it's an object with a duration property
    if (typeof duration === 'object' && duration !== null) {
      if (duration.duration) {
        duration = duration.duration;
      } else {
        return '';
      }
    }
    
    // Ensure it's a string
    const durationStr = String(duration);
    
    // Parse ISO 8601 duration format like PT1H35M
    const hours = durationStr.match(/(\d+)H/);
    const minutes = durationStr.match(/(\d+)M/);
    return `${hours ? hours[1] + 'h ' : ''}${minutes ? minutes[1] + 'm' : ''}`.trim() || durationStr;
  };

  // Parse baggage
  let baggageInfo: any[] = [];
  if (item.baggage) {
    try {
      baggageInfo = JSON.parse(item.baggage);
    } catch {
      baggageInfo = [];
    }
  }
  
  const checkedBaggage = baggageInfo.find((b: any) => b.type === 'checked') || { quantity: 0 };
  const carryOnBaggage = baggageInfo.find((b: any) => b.type === 'carry_on') || { quantity: 0 };

  // Get refund policy
  const isRefundable = item.conditions?.refund_before_departure?.allowed || false;

  // Check if this is a round trip (has multiple slices)
  const isRoundTrip = item.slices && item.slices.length > 1;
  const outboundSlice = item.slices?.[0];
  const returnSlice = item.slices?.[1];

  // Use transformed fields if available (from context/SearchResults)
  if (item.departureAirport && item.arrivalAirport && item.departureTime) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen py-12">
        <div className="max-w-6xl mx-auto px-4">
          <button onClick={onBack} className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#33a8da] transition mb-8 group">
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to Results
          </button>

          <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-8 md:p-12 border-b border-gray-50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100">
                    {item.airlineLogo ? (
                      <img 
                        src={item.airlineLogo} 
                        className="max-w-full max-h-full object-contain" 
                        alt={item.airlineName || item.provider}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.airlineCode || item.airlineName || item.provider}&background=33a8da&color=fff&bold=true&size=64`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#33a8da] to-[#2c98c7] rounded-xl flex items-center justify-center text-white font-black text-sm">
                        {item.airlineCode?.substring(0, 2) || item.airlineName?.substring(0, 2) || item.provider?.substring(0, 2) || 'FL'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">{item.airlineName || item.provider}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.flightNumber}</p>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.stopText}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-[#33a8da] tracking-tighter">{item.displayPrice || item.price}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Per Passenger</p>
                </div>
              </div>

              {/* Flight Summary - Shows both outbound and return for round trips */}
              {isRoundTrip && outboundSlice && returnSlice ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                  {/* Outbound Summary */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-black text-gray-900">
                          {outboundSlice.origin?.iata_code || item.departureAirport}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="font-black text-gray-900">
                          {outboundSlice.destination?.iata_code || item.arrivalAirport}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        {formatTime(outboundSlice.segments?.[0]?.departing_at)} - {formatTime(outboundSlice.segments?.[outboundSlice.segments.length - 1]?.arriving_at)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Flight • {outboundSlice.segments?.[0]?.operating_carrier?.name || item.airlineName} • {calculateDuration(outboundSlice.duration)}
                      </p>
                      {(outboundSlice.segments?.length || 1) > 1 && (
                        <p className="text-[9px] font-bold text-amber-600 mt-1">
                          {outboundSlice.segments.length - 1} stop
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Return Summary */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-black text-gray-900">
                          {returnSlice.origin?.iata_code || item.arrivalAirport}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="font-black text-gray-900">
                          {returnSlice.destination?.iata_code || item.departureAirport}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        {formatTime(returnSlice.segments?.[0]?.departing_at)} - {formatTime(returnSlice.segments?.[returnSlice.segments.length - 1]?.arriving_at)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Flight • {returnSlice.segments?.[0]?.operating_carrier?.name || item.airlineName} • {calculateDuration(returnSlice.duration)}
                      </p>
                      {(returnSlice.segments?.length || 1) > 1 && (
                        <p className="text-[9px] font-bold text-amber-600 mt-1">
                          {returnSlice.segments.length - 1} stop
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Flight Summary for one-way */
                <div className="mt-8 flex items-start gap-3 pt-6 border-t border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-black text-gray-900">{item.departureAirport}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="font-black text-gray-900">{item.arrivalAirport}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {formatTime(item.departureTime)} - {formatTime(item.arrivalTime)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Flight • {item.airlineName} • {calculateDuration(item.duration)}
                    </p>
                    {(item.stopCount || 0) > 0 && (
                      <p className="text-[9px] font-bold text-amber-600 mt-1">
                        {item.stopCount} stop{item.stopCount > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 md:p-12 space-y-12">
              {/* Journey Details - Two Column Layout for Round Trip */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  {/* Outbound Journey */}
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Outbound Journey</h3>
                      <p className="text-xs font-bold text-gray-600">
                        {formatDate(outboundSlice?.segments?.[0]?.departing_at || item.departureTime)}
                      </p>
                    </div>
                    
                    {outboundSlice?.segments?.map((segment: any, idx: number) => (
                      <div key={idx} className="mb-6 last:mb-0">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <p className="text-2xl font-black text-gray-900">{formatTime(segment.departing_at)}</p>
                            <p className="text-xs font-bold text-gray-400 mt-1 uppercase">
                              {segment.origin?.iata_code}
                            </p>
                            <p className="text-[10px] text-gray-400">{segment.origin?.city?.name || segment.origin?.city || segment.origin?.name}</p>
                          </div>
                          
                          <div className="flex-1 px-4">
                            <div className="w-full h-[2px] bg-gray-100 relative">
                              <div className="absolute left-1/2 -translate-x-1/2 -top-[11px] bg-white px-2">
                                <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                                </svg>
                              </div>
                            </div>
                            <p className="text-[9px] font-black text-gray-400 text-center mt-2 tracking-widest">
                              {calculateDuration(segment.duration)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-black text-gray-900">{formatTime(segment.arriving_at)}</p>
                            <p className="text-xs font-bold text-gray-400 mt-1 uppercase">
                              {segment.destination?.iata_code}
                            </p>
                            <p className="text-[10px] text-gray-400">{segment.destination?.city?.name || segment.destination?.city || segment.destination?.name}</p>
                          </div>
                        </div>

                        {/* Flight info */}
                        <div className="mt-2 text-center">
                          <p className="text-[10px] text-gray-500">
                            Flight {segment.marketing_carrier_flight_number} • {segment.operating_carrier?.name}
                          </p>
                        </div>

                        {/* Stopover info if not last segment */}
                        {idx < (outboundSlice.segments.length - 1) && (
                          <div className="my-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-[10px] font-bold text-amber-700">
                              ✈️ Connection in {segment.destination?.iata_code} • Layover time TBD
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Return Journey - Only show if round trip */}
                  {isRoundTrip && returnSlice && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Return Journey</h3>
                        <p className="text-xs font-bold text-gray-600">
                          {formatDate(returnSlice.segments?.[0]?.departing_at)}
                        </p>
                      </div>
                      
                      {returnSlice.segments?.map((segment: any, idx: number) => (
                        <div key={idx} className="mb-6 last:mb-0">
                          <div className="flex items-center justify-between">
                            <div className="text-left">
                              <p className="text-2xl font-black text-gray-900">{formatTime(segment.departing_at)}</p>
                              <p className="text-xs font-bold text-gray-400 mt-1 uppercase">
                                {segment.origin?.iata_code}
                              </p>
                              <p className="text-[10px] text-gray-400">{segment.origin?.city?.name || segment.origin?.city || segment.origin?.name}</p>
                            </div>
                            
                            <div className="flex-1 px-4">
                              <div className="w-full h-[2px] bg-gray-100 relative">
                                <div className="absolute left-1/2 -translate-x-1/2 -top-[11px] bg-white px-2">
                                  <svg className="w-5 h-5 text-[#33a8da] transform rotate-180" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                                  </svg>
                                </div>
                              </div>
                              <p className="text-[9px] font-black text-gray-400 text-center mt-2 tracking-widest">
                                {calculateDuration(segment.duration)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-2xl font-black text-gray-900">{formatTime(segment.arriving_at)}</p>
                              <p className="text-xs font-bold text-gray-400 mt-1 uppercase">
                                {segment.destination?.iata_code}
                              </p>
                              <p className="text-[10px] text-gray-400">{segment.destination?.city?.name || segment.destination?.city || segment.destination?.name}</p>
                            </div>
                          </div>

                          {/* Flight info */}
                          <div className="mt-2 text-center">
                            <p className="text-[10px] text-gray-500">
                              Flight {segment.marketing_carrier_flight_number} • {segment.operating_carrier?.name}
                            </p>
                          </div>

                          {/* Stopover info if not last segment */}
                          {idx < (returnSlice.segments.length - 1) && (
                            <div className="my-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                              <p className="text-[10px] font-bold text-amber-700">
                                ✈️ Connection in {segment.destination?.iata_code} • Layover time TBD
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Show message if one-way */}
                {!isRoundTrip && (
                  <div className="mt-6 text-center">
                    <span className="inline-block px-4 py-2 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      One-way Flight
                    </span>
                  </div>
                )}
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-xl mb-3 block">🧳</span>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Checked Baggage</p>
                  <p className="text-xs font-bold text-gray-900">
                    {checkedBaggage.quantity > 0 ? `${checkedBaggage.quantity} bag` : 'No checked bag'}
                  </p>
                  {carryOnBaggage.quantity > 0 && (
                    <p className="text-[9px] font-bold text-gray-500 mt-1">
                      + {carryOnBaggage.quantity} carry-on
                    </p>
                  )}
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-xl mb-3 block">💺</span>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cabin</p>
                  <p className="text-xs font-bold text-gray-900 capitalize">{item.cabin || 'Economy'}</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-xl mb-3 block">💳</span>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Refund</p>
                  <p className="text-xs font-bold text-gray-900">
                    {isRefundable ? 'Refundable' : 'Non-refundable'}
                  </p>
                </div>
              </div>

              {/* Checkout Button */}
              <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-600">
                    {isRoundTrip ? 'Round trip' : 'One-way'} • {(item.stopCount || 0) === 0 ? 'Direct flight' : `${item.stopCount} stop${item.stopCount > 1 ? 's' : ''}`} • Seats confirmed for immediate booking.
                  </p>
                </div>
                <button 
                  onClick={handleBookClick} 
                  className="w-full md:w-auto px-12 py-5 bg-[#33a8da] text-white font-black rounded-2xl shadow-xl hover:bg-[#2c98c7] transition active:scale-95 uppercase tracking-widest text-xs"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no transformed fields, show loading or error
  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="bg-white rounded-[32px] p-12 shadow-xl border border-gray-100">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Flight Details Loading</h3>
          <p className="text-sm text-gray-500 font-medium mb-6">
            Please wait while we load the complete flight information.
          </p>
          <button onClick={onBack} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
            Back to Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlightDetails;