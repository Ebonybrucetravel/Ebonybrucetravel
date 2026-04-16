'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { useLanguage } from '@/context/LanguageContext';

interface FlightDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
}

const FlightDetails: React.FC<FlightDetailsProps> = ({ item, searchParams, onBack, onBook }) => {
  const router = useRouter();
  const { selectItem } = useSearch();
  const { currency, formatPrice, isLoadingRates } = useLanguage();
  const [convertedPrice, setConvertedPrice] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Convert price when component loads or currency changes
  useEffect(() => {
    const convertFlightPrice = async () => {
      if (!item) return;
      
      setIsConverting(true);
      try {
        let originalAmount = 0;
        let originalCurrency = 'GBP';
        
        // Extract original price and currency from item
        if (item.originalPriceAmount && item.originalPriceCurrency) {
          originalAmount = item.originalPriceAmount;
          originalCurrency = item.originalPriceCurrency;
        } else if (item.original_amount) {
          originalAmount = parseFloat(item.original_amount);
          originalCurrency = item.original_currency || 'GBP';
        } else if (item.total_amount) {
          originalAmount = parseFloat(item.total_amount);
          originalCurrency = item.total_currency || 'GBP';
        } else if (item.rawPrice) {
          originalAmount = item.rawPrice;
          originalCurrency = item.currency || 'GBP';
        } else if (item.price) {
          if (typeof item.price === 'string') {
            const match = item.price.match(/[\d,]+\.?\d*/);
            if (match) {
              originalAmount = parseFloat(match[0].replace(/,/g, ''));
            }
          } else if (typeof item.price === 'number') {
            originalAmount = item.price;
          }
        }
        
        if (originalAmount > 0) {
          const formatted = await formatPrice(originalAmount, originalCurrency);
          setConvertedPrice(formatted);
        } else {
          setConvertedPrice('Price on request');
        }
      } catch (error) {
        console.error('Failed to convert price:', error);
        setConvertedPrice('Price on request');
      } finally {
        setIsConverting(false);
      }
    };
    
    convertFlightPrice();
  }, [item, currency.code, formatPrice]);

  // Helper function to extract stopover airports from segments
  const getStopoverAirports = (segments: any[]) => {
    if (!segments || segments.length <= 1) return [];
    
    return segments.slice(0, -1).map((segment, idx) => {
      const nextSegment = segments[idx + 1];
      let layoverDuration = '';
      
      const destination = segment.destination || segment.to || {};
      const destinationCode = destination.iata_code || segment.to || segment.destination_code || '';
      const destinationName = destination.name || segment.toName || segment.arrival_city || '';
      const destinationCity = destination.city_name || segment.arrival_city || destinationName;
      
      const arrivalTime = segment.arriving_at || segment.arrivalTime || segment.end_time || '';
      const departureTime = nextSegment?.departing_at || nextSegment?.departureTime || nextSegment?.start_time || '';
      
      if (arrivalTime && departureTime) {
        try {
          const arrival = new Date(arrivalTime);
          const departure = new Date(departureTime);
          const diffMinutes = (departure.getTime() - arrival.getTime()) / (1000 * 60);
          const hours = Math.floor(diffMinutes / 60);
          const minutes = Math.round(diffMinutes % 60);
          if (hours > 0 && minutes > 0) layoverDuration = `${hours}h ${minutes}m`;
          else if (hours > 0) layoverDuration = `${hours}h`;
          else if (minutes > 0) layoverDuration = `${minutes}m`;
        } catch (e) {
          console.error('Error calculating layover:', e);
        }
      }
      
      const incomingFlightNum = segment.marketing_carrier_flight_number || segment.flightNumber || segment.flight_number || '';
      const incomingAirline = segment.operating_carrier?.name || segment.airline || segment.airlineName || '';
      const outgoingFlightNum = nextSegment?.marketing_carrier_flight_number || nextSegment?.flightNumber || nextSegment?.flight_number || '';
      const outgoingAirline = nextSegment?.operating_carrier?.name || nextSegment?.airline || nextSegment?.airlineName || '';
      
      return {
        code: destinationCode,
        name: destinationName,
        city: destinationCity,
        arrivalTime: arrivalTime,
        departureTime: departureTime,
        layoverDuration: layoverDuration,
        flightNumber: outgoingFlightNum,
        airline: outgoingAirline,
        incomingFlightNumber: incomingFlightNum,
        incomingAirline: incomingAirline
      };
    });
  };

  // Transform the item to ensure correct return direction
  const transformedItem = useMemo(() => {
    if (!item) return null;
    
    console.log('🔄 FlightDetails: Transforming flight:', {
      provider: item.provider,
      isWakanow: item.isWakanow,
      hasSlices: !!(item.slices),
      slicesLength: item.slices?.length,
    });
    
    // Handle Wakanow flights
    if (item.isWakanow) {
      const wakanowItem = item as any;
      let slices = wakanowItem.slices || [];
      
      if (slices.length > 0) {
        slices = slices.map((slice: any, sliceIndex: number) => {
          const isReturnSlice = sliceIndex === 1;
          
          const outboundOrigin = slices[0]?.segments?.[0]?.origin?.iata_code || 
                                 slices[0]?.segments?.[0]?.from || 
                                 wakanowItem.departureAirport;
          const outboundDest = slices[0]?.segments?.[0]?.destination?.iata_code || 
                               slices[0]?.segments?.[0]?.to || 
                               wakanowItem.arrivalAirport;
          
          const segments = (slice.segments || []).map((segment: any) => {
            let flightNumber = segment.flightNumber || wakanowItem.flightNumber;
            if (isReturnSlice && wakanowItem.returnLegs && wakanowItem.returnLegs[0]) {
              flightNumber = wakanowItem.returnLegs[0].flightNumber || flightNumber;
            }
            
            let originCode = '', originName = '', destCode = '', destName = '';
            
            if (isReturnSlice) {
              originCode = outboundDest;
              originName = outboundDest;
              destCode = outboundOrigin;
              destName = outboundOrigin;
            } else {
              originCode = segment.from || segment.origin?.iata_code || wakanowItem.departureAirport;
              originName = segment.fromName || segment.origin?.name || wakanowItem.departureCity;
              destCode = segment.to || segment.destination?.iata_code || wakanowItem.arrivalAirport;
              destName = segment.toName || segment.destination?.name || wakanowItem.arrivalCity;
            }
            
            return {
              departing_at: segment.departureTime || segment.departing_at || segment.start_time || '',
              arriving_at: segment.arrivalTime || segment.arriving_at || segment.end_time || '',
              duration: segment.duration || '',
              origin: {
                iata_code: originCode,
                name: originName,
                city_name: originName?.split('(')[0]?.trim() || originName,
              },
              destination: {
                iata_code: destCode,
                name: destName,
                city_name: destName?.split('(')[0]?.trim() || destName,
              },
              operating_carrier: {
                name: segment.airline || segment.operating_carrier?.name || wakanowItem.airlineName,
                iata_code: segment.airlineCode || segment.operating_carrier?.iata_code || wakanowItem.airlineCode
              },
              marketing_carrier_flight_number: flightNumber,
            };
          });
          
          return { ...slice, segments };
        });
      }
      
      return {
        ...item,
        slices: slices,
        isRoundTrip: slices.length > 1,
      };
    }
    
    // Handle Duffel flights - ensure return direction is correct
    if (item.provider === 'duffel' || item.slices) {
      let slices = [...(item.slices || [])];
      
      // Fix return direction for Duffel if needed
      if (slices.length > 1) {
        const outboundOrigin = slices[0]?.segments?.[0]?.origin?.iata_code;
        const outboundDest = slices[0]?.segments?.[slices[0].segments.length - 1]?.destination?.iata_code;
        const returnOrigin = slices[1]?.segments?.[0]?.origin?.iata_code;
        const returnDest = slices[1]?.segments?.[slices[1].segments.length - 1]?.destination?.iata_code;
        
        // Check if return is going the wrong way (same as outbound)
        if (returnOrigin === outboundOrigin && returnDest === outboundDest) {
          console.log('🔄 Fixing Duffel return journey direction - swapping');
          const returnSegments = slices[1].segments.map((seg: any) => {
            const newOrigin = seg.destination;
            const newDestination = seg.origin;
            return {
              ...seg,
              origin: newOrigin,
              destination: newDestination,
              departing_at: seg.arriving_at,
              arriving_at: seg.departing_at,
            };
          });
          
          slices[1] = {
            ...slices[1],
            origin: { iata_code: outboundDest },
            destination: { iata_code: outboundOrigin },
            segments: returnSegments
          };
        }
      }
      
      return {
        ...item,
        slices: slices,
        isRoundTrip: slices.length > 1,
      };
    }
    
    return item;
  }, [item]);

  if (!transformedItem) {
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
            <p className="text-sm text-gray-500 font-medium mb-6">Please wait while we load the complete flight information.</p>
            <button onClick={onBack} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isRoundTrip = transformedItem.slices && transformedItem.slices.length > 1;
  const outboundSlice = transformedItem.slices?.[0];
  const returnSlice = transformedItem.slices?.[1];

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return '--:--';
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateTime?: string) => {
    if (!dateTime) return '';
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const calculateDuration = (duration?: any) => {
    if (!duration) return '';
    let durationStr = String(duration);
    
    if (durationStr.includes(':')) {
      const parts = durationStr.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
      }
      return durationStr;
    }
    
    const hours = durationStr.match(/(\d+)H/);
    const minutes = durationStr.match(/(\d+)M/);
    return `${hours ? hours[1] + 'h ' : ''}${minutes ? minutes[1] + 'm' : ''}`.trim() || durationStr;
  };

  const handleBookClick = () => {
    const completeBooking = {
      ...transformedItem,
      id: transformedItem.id || `flight-${Date.now()}`,
      type: 'flight',
      status: 'Confirmed'
    };
    selectItem(completeBooking);
    sessionStorage.setItem('currentBooking', JSON.stringify(completeBooking));
    router.push('/booking/review');
  };

  // Render a single flight segment
  const renderSegment = (segment: any, index: number, isLast: boolean) => (
    <div key={index} className={`${!isLast ? 'mb-6' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="text-left">
          <p className="text-2xl font-black text-gray-900">{formatTime(segment.departing_at)}</p>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">{segment.origin?.iata_code}</p>
          <p className="text-[10px] text-gray-400">{segment.origin?.city_name || segment.origin?.name}</p>
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
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">{segment.destination?.iata_code}</p>
          <p className="text-[10px] text-gray-400">{segment.destination?.city_name || segment.destination?.name}</p>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-[10px] text-gray-500">
          Flight {segment.marketing_carrier_flight_number} • {segment.operating_carrier?.name}
        </p>
      </div>
    </div>
  );

  // Render a journey with stopovers
  const renderJourney = (slice: any, title: string, date: string) => {
    const segments = slice?.segments || [];
    const stopovers = getStopoverAirports(segments);
    const hasStopovers = stopovers.length > 0;
    
    if (segments.length === 0) {
      return (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</h3>
            <p className="text-xs font-bold text-gray-600">{date}</p>
          </div>
          <div className="text-center py-8 text-gray-400">No flight information available</div>
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</h3>
          <p className="text-xs font-bold text-gray-600">{date}</p>
        </div>
        
        {segments.map((segment: any, idx: number) => renderSegment(segment, idx, idx === segments.length - 1))}
        
        {hasStopovers && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-amber-200"></div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  {stopovers.length} Stopover{stopovers.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="h-px flex-1 bg-amber-200"></div>
            </div>
            
            <div className="space-y-3">
              {stopovers.map((stop, idx) => (
                <div key={idx} className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-base font-black text-gray-900">{stop.code}</p>
                          <p className="text-xs text-gray-600">{stop.name || stop.city}</p>
                        </div>
                        {stop.layoverDuration && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                            Layover: {stop.layoverDuration}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Arrives: {formatTime(stop.arrivalTime)}</span>
                        </div>
                        <span>→</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Departs: {formatTime(stop.departureTime)}</span>
                        </div>
                      </div>
                      
                      {stop.flightNumber && stop.airline && (
                        <p className="mt-2 text-[9px] text-gray-400">
                          Continue on {stop.airline} flight {stop.flightNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get airline info
  const firstSegment = outboundSlice?.segments?.[0] || {};
  const airlineName = transformedItem.airlineName || firstSegment?.operating_carrier?.name || transformedItem.provider || 'Airline';
  const airlineCode = transformedItem.airlineCode || firstSegment?.operating_carrier?.iata_code || '';
  const airlineLogo = transformedItem.airlineLogo;
  const flightNumber = transformedItem.flightNumber || firstSegment?.marketing_carrier_flight_number || '';
  const stopCount = outboundSlice?.segments?.length ? outboundSlice.segments.length - 1 : 0;
  const stopText = stopCount === 0 ? 'Direct' : `${stopCount} stop${stopCount > 1 ? 's' : ''}`;

  // Show loading state while converting
  if (isConverting || isLoadingRates) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-[32px] p-12 shadow-xl border border-gray-100">
            <div className="w-16 h-16 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Loading Price</h3>
            <p className="text-sm text-gray-500 font-medium">Converting to {currency.code}...</p>
          </div>
        </div>
      </div>
    );
  }

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
                  {airlineLogo ? (
                    <img 
                      src={airlineLogo} 
                      className="max-w-full max-h-full object-contain" 
                      alt={airlineName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&bold=true&size=64`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#33a8da] to-[#2c98c7] rounded-xl flex items-center justify-center text-white font-black text-sm">
                      {airlineCode || airlineName.substring(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">{airlineName}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{flightNumber}</p>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stopText}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#33a8da] tracking-tighter">{convertedPrice || 'Loading...'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Per Passenger</p>
              </div>
            </div>

            {/* Flight Summary */}
            {isRoundTrip && outboundSlice && returnSlice ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">1</div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-black text-gray-900">{outboundSlice.segments?.[0]?.origin?.iata_code || '--'}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="font-black text-gray-900">{outboundSlice.segments?.[outboundSlice.segments.length - 1]?.destination?.iata_code || '--'}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {formatTime(outboundSlice.segments?.[0]?.departing_at)} - {formatTime(outboundSlice.segments?.[outboundSlice.segments.length - 1]?.arriving_at)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {outboundSlice.segments?.length > 1 ? `${outboundSlice.segments.length - 1} stop` : 'Direct'} • {calculateDuration(outboundSlice.duration)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">2</div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-black text-gray-900">{returnSlice.segments?.[0]?.origin?.iata_code || '--'}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <span className="font-black text-gray-900">{returnSlice.segments?.[returnSlice.segments.length - 1]?.destination?.iata_code || '--'}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                      {formatTime(returnSlice.segments?.[0]?.departing_at)} - {formatTime(returnSlice.segments?.[returnSlice.segments.length - 1]?.arriving_at)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {returnSlice.segments?.length > 1 ? `${returnSlice.segments.length - 1} stop` : 'Direct'} • {calculateDuration(returnSlice.duration)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex items-start gap-3 pt-6 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">1</div>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-black text-gray-900">{outboundSlice?.segments?.[0]?.origin?.iata_code || transformedItem.departureAirport || '--'}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="font-black text-gray-900">{outboundSlice?.segments?.[outboundSlice.segments.length - 1]?.destination?.iata_code || transformedItem.arrivalAirport || '--'}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-500 mt-1">
                    {formatTime(outboundSlice?.segments?.[0]?.departing_at || transformedItem.departureTime)} - {formatTime(outboundSlice?.segments?.[outboundSlice.segments.length - 1]?.arriving_at || transformedItem.arrivalTime)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {stopCount === 0 ? 'Direct' : `${stopCount} stop${stopCount > 1 ? 's' : ''}`} • {calculateDuration(outboundSlice?.duration || transformedItem.duration)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Journey Details */}
          <div className="p-8 md:p-12 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {renderJourney(outboundSlice, 'Outbound Journey', formatDate(outboundSlice?.segments?.[0]?.departing_at || transformedItem.departureTime))}
              {isRoundTrip && returnSlice && renderJourney(returnSlice, 'Return Journey', formatDate(returnSlice.segments?.[0]?.departing_at))}
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
                  {isRoundTrip ? 'Round trip' : 'One-way'} • {stopText} • Seats confirmed for immediate booking.
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
};

export default FlightDetails;