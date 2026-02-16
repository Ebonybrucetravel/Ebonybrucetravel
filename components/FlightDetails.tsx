'use client';
import React, { useEffect } from 'react';
import { formatPrice } from '@/lib/utils';

interface FlightDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
}

const FlightDetails: React.FC<FlightDetailsProps> = ({ item, searchParams, onBack, onBook }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ✅ ADD THIS DEBUG LOG RIGHT HERE
  useEffect(() => {
    console.log('🎯 FlightDetails received item:', JSON.stringify(item, null, 2));
    console.log('🎯 FlightDetails received searchParams:', searchParams);
  }, [item, searchParams]);

  // Log the entire item to see what we're working with
  console.log('🎯 FlightDetails item:', JSON.stringify(item, null, 2));

  // Extract real flight data from the item - match the API response structure
  const realData = item.realData || {};
  
  // Check if we have flight offer data
  const flightOffer = realData.offer || realData.flightOffer || {};
  
  // Get itineraries - this is the key path
  const itineraries = flightOffer.itineraries || realData.itineraries || [];
  const outboundItinerary = itineraries[0] || {};
  const segments = outboundItinerary.segments || [];
  
  // Get the first and last segment for complete journey info
  const firstSegment = segments[0] || {};
  const lastSegment = segments[segments.length - 1] || firstSegment;
  
  // Extract departure and arrival details from the segment
  const departure = firstSegment.departure || {};
  const arrival = lastSegment.arrival || {};
  
  // Format times properly
  const formatTime = (dateTime: string) => {
    if (!dateTime) return '--:--';
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateTime: string) => {
    if (!dateTime) return '';
    try {
      const date = new Date(dateTime);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Calculate duration from ISO 8601 format (e.g., PT1H15M)
  const calculateDuration = (duration: string) => {
    if (!duration) return '1h 15m';
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    return duration;
  };

  // Get airline info from validating airline codes
  const validatingAirlineCodes = flightOffer.validating_airline_codes || [];
  const airlineCode = validatingAirlineCodes[0] || firstSegment.carrierCode || 'EK';
  
  // Get airline name (you might want to map this)
  const getAirlineName = (code: string) => {
    const airlines: Record<string, string> = {
      'EK': 'Emirates',
      'QR': 'Qatar Airways',
      'BA': 'British Airways',
      'LH': 'Lufthansa',
      'AF': 'Air France',
      'KL': 'KLM',
      'TK': 'Turkish Airlines',
      'ET': 'Ethiopian Airlines',
      'VS': 'Virgin Atlantic',
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
    };
    return airlines[code] || code;
  };
  
  const airlineName = getAirlineName(airlineCode);
  
  // Get flight number from segment
  const flightNumber = firstSegment.flightNumber || firstSegment.number || firstSegment.flight?.number || `${airlineCode} 123`;
  
  // Get cabin class from traveler pricing
  const travelerPricings = flightOffer.traveler_pricings || [];
  const firstTraveler = travelerPricings[0] || {};
  const fareDetailsBySegment = firstTraveler.fare_details_by_segment || [];
  const firstFareDetails = fareDetailsBySegment[0] || {};
  const cabinClass = firstFareDetails.cabin || firstFareDetails.class || 'Economy';
  
  // Get baggage info
  const includedCheckedBags = firstFareDetails.included_checked_bags || {};
  const baggageWeight = includedCheckedBags.weight || 23;
  const baggageQuantity = includedCheckedBags.quantity || 2;
  
  // Get price info
  const priceTotal = flightOffer.price?.total || flightOffer.total_amount || realData.price || 0;
  const currency = flightOffer.price?.currency || realData.currency || 'GBP';
  const formattedPrice = formatPrice(parseFloat(priceTotal), currency);
  
  // Get flight duration
  const duration = outboundItinerary.duration || realData.duration || 'PT1H15M';
  const formattedDuration = calculateDuration(duration);
  
  // Get stops information
  const stops = segments.length - 1;
  const stopsText = stops === 0 ? 'Direct' : `${stops} Stop${stops > 1 ? 's' : ''}`;
  
  // Check if flight is refundable
  const isRefundable = realData.isRefundable !== false;
  const isPartialRefundable = realData.isPartialRefundable || false;

  // Get airport codes and cities
  const departureAirport = departure.iataCode || departure.airport?.iataCode || 'LOS';
  const arrivalAirport = arrival.iataCode || arrival.airport?.iataCode || 'ABV';
  
  // Get city names (you might need to map these)
  const getCityName = (code: string) => {
    const cities: Record<string, string> = {
      'LOS': 'Lagos',
      'ABV': 'Abuja',
      'LHR': 'London',
      'JFK': 'New York',
      'DXB': 'Dubai',
      'PAR': 'Paris',
      'CDG': 'Paris',
    };
    return cities[code] || code;
  };
  
  const departureCity = getCityName(departureAirport);
  const arrivalCity = getCityName(arrivalAirport);

  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <button onClick={onBack} className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-[#33a8da] transition mb-8 group">
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back to Results
        </button>

        <div className="bg-white rounded-[32px] shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 md:p-12 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100">
                <img 
                  src={item.image || `https://ui-avatars.com/api/?name=${airlineName}&background=33a8da&color=fff&bold=true&size=64`} 
                  className="max-w-full max-h-full object-contain" 
                  alt={airlineName} 
                />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{airlineName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{flightNumber}</p>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stopsText}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-[#33a8da] tracking-tighter">{formattedPrice}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Per Passenger</p>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {/* Journey Details */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Outbound Journey</h3>
                <p className="text-xs font-bold text-gray-600">{formatDate(departure.at || departure.dateTime)}</p>
              </div>
              
              <div className="flex items-center justify-between relative">
                <div className="text-center md:text-left">
                  <p className="text-3xl font-black text-gray-900">{formatTime(departure.at || departure.dateTime)}</p>
                  <p className="text-sm font-bold text-gray-400 mt-1 uppercase">
                    {departureAirport} <span className="text-xs font-normal text-gray-300">•</span> {departureCity}
                  </p>
                </div>
                
                <div className="flex-1 px-8 hidden md:block">
                  <div className="w-full h-[2px] bg-gray-100 relative">
                    <div className="absolute left-1/2 -translate-x-1/2 -top-[11px] bg-white px-3">
                      <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                      </svg>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase text-center mt-3 tracking-widest">
                    {formattedDuration}
                  </p>
                </div>

                <div className="text-center md:text-right">
                  <p className="text-3xl font-black text-gray-900">{formatTime(arrival.at || arrival.dateTime)}</p>
                  <p className="text-sm font-bold text-gray-400 mt-1 uppercase">
                    {arrivalAirport} <span className="text-xs font-normal text-gray-300">•</span> {arrivalCity}
                  </p>
                </div>
              </div>

              {/* Stopover info if any */}
              {stops > 0 && (
                <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-700">
                    ✈️ {stops} stop{stops > 1 ? 's' : ''} • Total journey time {formattedDuration}
                  </p>
                </div>
              )}
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xl mb-3 block">🧳</span>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Baggage</p>
                <p className="text-xs font-bold text-gray-900">
                  {baggageQuantity} x {baggageWeight}kg
                </p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xl mb-3 block">💺</span>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cabin</p>
                <p className="text-xs font-bold text-gray-900 capitalize">{cabinClass.toLowerCase().replace('_', ' ')}</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xl mb-3 block">💳</span>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Refund</p>
                <p className="text-xs font-bold text-gray-900">
                  {isRefundable 
                    ? isPartialRefundable ? 'Partial Refundable' : 'Fully Refundable'
                    : 'Non-refundable'}
                </p>
              </div>
            </div>

            {/* Flight Segments (if multiple) */}
            {segments.length > 1 && (
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Flight Details</h4>
                <div className="space-y-4">
                  {segments.map((segment: any, idx: number) => {
                    const segDeparture = segment.departure || {};
                    const segArrival = segment.arrival || {};
                    return (
                      <div key={idx} className="flex items-start gap-4 text-xs">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#33a8da] font-black">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {segDeparture.iataCode} → {segArrival.iataCode}
                          </p>
                          <p className="text-gray-500">
                            {formatTime(segDeparture.at || segDeparture.dateTime)} - {formatTime(segArrival.at || segArrival.dateTime)}
                          </p>
                          <p className="text-gray-400 text-[10px] mt-1">
                            Flight {segment.flightNumber || segment.number} • {segment.aircraft?.name || 'Aircraft'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-600">
                  {stops === 0 ? 'Direct flight' : `${stops} stop${stops > 1 ? 's' : ''}`} • Seats confirmed for immediate booking.
                </p>
              </div>
              <button 
                onClick={onBook} 
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
};

export default FlightDetails;