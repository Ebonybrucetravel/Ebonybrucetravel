'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';

interface FlightDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
}

const formatDurationDisplay = (duration?: string): string => {
  if (!duration) return '';
  
  if (duration.includes('.')) {
    const parts = duration.split('.');
    const days = parseInt(parts[0]);
    const timeParts = parts[1]?.split(':') || [];
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    
    if (days > 0) {
      if (hours > 0 && minutes > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${days}d ${hours}h`;
      if (minutes > 0) return `${days}d ${minutes}m`;
      return `${days}d`;
    }
  }
  
  if (duration.includes(':') && !duration.includes('.')) {
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h`;
      if (minutes > 0) return `${minutes}m`;
      return '';
    }
  }
  
  return duration;
};

const FlightDetails: React.FC<FlightDetailsProps> = ({ item, searchParams, onBack, onBook }) => {
  const router = useRouter();
  const { selectItem } = useSearch();
  const { currency, formatPrice, isLoadingRates } = useLanguage();
  const [convertedPrice, setConvertedPrice] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Helper functions
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
    return formatDurationDisplay(String(duration));
  };

  const formatStopTime = (duration?: string): string => {
    if (!duration) return '';
    
    if (duration.includes(':')) {
      const parts = duration.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
      }
    }
    
    return duration;
  };

  useEffect(() => {
    const convertFlightPrice = async () => {
      if (!currentItem) return;
      
      setIsConverting(true);
      try {
        let originalAmount = 0;
        let originalCurrency = 'NGN';
        
        if (currentItem.isWakanow && currentItem.totalAmount) {
          originalAmount = currentItem.totalAmount;
          originalCurrency = currentItem.currency || 'NGN';
        } else if (currentItem.flight_summary?.price?.Amount) {
          originalAmount = currentItem.flight_summary.price.Amount;
          originalCurrency = currentItem.flight_summary.price.CurrencyCode || 'NGN';
        } else if (currentItem.priceBreakdown?.totalAmount) {
          originalAmount = currentItem.priceBreakdown.totalAmount;
          originalCurrency = currentItem.priceBreakdown.currency || 'NGN';
        } else if (currentItem.originalPriceAmount && currentItem.originalPriceCurrency) {
          originalAmount = currentItem.originalPriceAmount;
          originalCurrency = currentItem.originalPriceCurrency;
        } else if (currentItem.original_amount) {
          originalAmount = parseFloat(currentItem.original_amount);
          originalCurrency = currentItem.original_currency || 'NGN';
        } else if (currentItem.total_amount) {
          originalAmount = parseFloat(currentItem.total_amount);
          originalCurrency = currentItem.total_currency || 'NGN';
        } else if (currentItem.rawPrice) {
          originalAmount = currentItem.rawPrice;
          originalCurrency = currentItem.currency || 'NGN';
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
  }, [currentItem, currency.code, formatPrice]);


  const stopInformation = useMemo(() => {
    if (!currentItem) return null;
    
    let stopInfo = null;
    
    if (currentItem._wakanowData?.stop_information) {
      stopInfo = currentItem._wakanowData.stop_information;
    } else if (currentItem.stop_information) {
      stopInfo = currentItem.stop_information;
    } else if (currentItem.flight_summary?.stop_information) {
      stopInfo = currentItem.flight_summary.stop_information;
    }
    
    if (stopInfo) {
      console.log('🛑 Found stop_information:', stopInfo);
      
      const technicalStops = stopInfo.technicalStops || [];
      const hasTechnicalStops = stopInfo.summary?.hasTechnicalStops || false;
      const totalTechnicalStops = stopInfo.summary?.totalTechnicalStops || 0;
      const totalLayovers = stopInfo.totalStops || 0;
      const layoversList = stopInfo.layoversList || [];
      
      return {
        totalLayovers: totalLayovers,
        layoversList: layoversList,
        technicalStops: technicalStops,
        hasTechnicalStops: hasTechnicalStops,
        totalTechnicalStops: totalTechnicalStops,
        raw: stopInfo
      };
    }
    
    return null;
  }, [currentItem]);

const getStopoverAirports = (segments: any[]) => {
  if (!segments || segments.length <= 1) return [];
  
  const stopovers = [];
  
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextSegment = segments[i + 1];
    
    const destination = segment.destination || {};
    const destinationCode = destination.iata_code || destination.code || segment.destinationCode || '';
    const destinationName = destination.name || destination.city_name || segment.destinationName || '';
    const destinationCity = destination.city_name || destination.name || segment.destinationName || '';
    
  
    const arrivalTime = segment.arriving_at || segment.endTime || segment.arrivalTime || segment.end_time || '';
    
   
    const departureTime = nextSegment?.departing_at || nextSegment?.startTime || nextSegment?.departureTime || nextSegment?.start_time || '';
    
  
    let layoverDuration = '';
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
    
    const outgoingFlightNum = nextSegment?.flightNumber || nextSegment?.marketing_carrier_flight_number || '';
    const outgoingAirline = nextSegment?.operatingCarrier || nextSegment?.operating_carrier?.name || '';
    
    stopovers.push({
      code: destinationCode,
      name: destinationName || destinationCode,
      city: destinationCity || destinationName || destinationCode,
      arrivalTime: arrivalTime,
      departureTime: departureTime,
      layoverDuration: layoverDuration,
      flightNumber: outgoingFlightNum,
      airline: outgoingAirline,
    });
  }
  
  return stopovers;
};
  const transformedItem = useMemo(() => {
    if (!currentItem) return null;
    
    if (currentItem._wakanowData) {
      const wakanowData = currentItem._wakanowData;
      const flightSummary = wakanowData.flight_summary;
      
      if (flightSummary?.slices && flightSummary.slices.length > 0) {
        const processedSlices = flightSummary.slices.map((slice: any) => {
          
const segments = (slice.segments || []).map((segment: any) => {
  
  const technicalStops = segment.technicalStops || segment.TechnicalStops || [];
  const hasTechnicalStops = segment.hasTechnicalStops || technicalStops.length > 0;
  
  return {
    departing_at: segment.departing_at || segment.startTime || segment.departureTime || segment.start_time || '',
    arriving_at: segment.arriving_at || segment.endTime || segment.arrivalTime || segment.end_time || '',
    duration: segment.duration || slice.tripDuration || '',
    origin: {
      iata_code: segment.origin?.iata_code || segment.departureCode || slice.departureCode || '',
      name: segment.origin?.name || segment.departureName || slice.departureName || '',
      city_name: segment.origin?.city_name || segment.departureName || slice.departureName || '',
    },
    destination: {
      iata_code: segment.destination?.iata_code || segment.destinationCode || slice.arrivalCode || '',
      name: segment.destination?.name || segment.destinationName || slice.arrivalName || '',
      city_name: segment.destination?.city_name || segment.destinationName || slice.arrivalName || '',
    },
    operating_carrier: {
      name: segment.operating_carrier?.name || segment.operatingCarrier || slice.airline || '',
      iata_code: segment.operating_carrier?.iata_code || segment.airlineCode || slice.airlineCode || '',
    },
    marketing_carrier_flight_number: segment.marketing_carrier_flight_number || segment.flightNumber || slice.flightNumber || '',
    freeBaggage: segment.freeBaggage || slice.freeBaggage || null,
    // ✅ Add technical stops to the segment
    technicalStops: technicalStops,
    hasTechnicalStops: hasTechnicalStops,
    // ✅ CRITICAL: Preserve the original fields for stopover detection
    destinationCode: segment.destinationCode || slice.arrivalCode || '',
    destinationName: segment.destinationName || slice.arrivalName || '',
    startTime: segment.startTime || segment.departing_at || slice.departureTime || '',
    endTime: segment.endTime || segment.arriving_at || slice.arrivalTime || '',
    flightNumber: segment.flightNumber || slice.flightNumber || '',
    operatingCarrier: segment.operatingCarrier || segment.operating_carrier?.name || slice.airline || '',
  };
});
          
          return {
            ...slice,
            segments: segments,
            duration: slice.duration || slice.tripDuration || '',
            origin: segments[0]?.origin || slice.origin,
            destination: segments[segments.length - 1]?.destination || slice.destination,
            departure_time: segments[0]?.departing_at || slice.departure_time || slice.departureTime,
            arrival_time: segments[segments.length - 1]?.arriving_at || slice.arrival_time || slice.arrivalTime,
            stopDetails: slice.stopDetails || null,
          };
        });
        
        return {
          ...currentItem,
          slices: processedSlices,
          isRoundTrip: processedSlices.length === 2,
          isMultiCity: processedSlices.length > 2,
          totalAmount: wakanowData.totalAmount || currentItem.totalAmount || 0,
          basePrice: wakanowData.basePrice || currentItem.basePrice || 0,
          markupAmount: wakanowData.markupAmount || currentItem.markupAmount || 0,
          markupPercentage: wakanowData.markupPercentage || currentItem.markupPercentage || 10,
          serviceFee: wakanowData.serviceFee || currentItem.serviceFee || 0,
          serviceFeePercentage: wakanowData.serviceFeePercentage || currentItem.serviceFeePercentage || 5,
          taxes: wakanowData.taxes || currentItem.taxes || 0,
          taxPercentage: wakanowData.taxPercentage || currentItem.taxPercentage || 15,
          currency: wakanowData.currency || currentItem.currency || 'NGN',
          priceBreakdown: wakanowData.priceBreakdown || currentItem.priceBreakdown || undefined,
          flight_summary: flightSummary || currentItem.flight_summary,
          isRefundable: flightSummary?.isRefundable || currentItem.isRefundable || false,
          fare_rules: wakanowData.fare_rules || currentItem.fare_rules || [],
          penalty_rules: wakanowData.penalty_rules || currentItem.penalty_rules || [],
          terms_and_conditions: wakanowData.terms_and_conditions || currentItem.terms_and_conditions || null,
          bookingId: wakanowData.booking_id || currentItem.bookingId || '',
          custom_messages: wakanowData.custom_messages || (currentItem as any).custom_messages || [],
          freeBaggage: processedSlices[0]?.segments?.[0]?.freeBaggage || 
                       processedSlices[0]?.freeBaggage ||
                       currentItem.freeBaggage ||
                       null,
          stop_information: wakanowData.stop_information || currentItem.stop_information || null,
          _wakanowData: wakanowData,
        };
      }
    }
    
    if (currentItem.fare_rules?.length > 0 || currentItem.penalty_rules?.length > 0 || currentItem.isRefundable) {
      const slices = currentItem.slices || [];
      const processedSlices = slices.map((slice: any) => {
        const segments = (slice.segments || []).map((segment: any) => {
        
          const technicalStops = segment.technicalStops || segment.TechnicalStops || [];
          const hasTechnicalStops = segment.hasTechnicalStops || technicalStops.length > 0;
          
          return {
            departing_at: segment.departing_at || segment.startTime || segment.departureTime || '',
            arriving_at: segment.arriving_at || segment.endTime || segment.arrivalTime || '',
            duration: segment.duration || slice.duration || '',
            origin: segment.origin || { iata_code: '', name: '', city_name: '' },
            destination: segment.destination || { iata_code: '', name: '', city_name: '' },
            operating_carrier: segment.operating_carrier || { name: '', iata_code: '' },
            marketing_carrier_flight_number: segment.marketing_carrier_flight_number || segment.flightNumber || '',
            freeBaggage: segment.freeBaggage || currentItem.freeBaggage || null,
            
            technicalStops: technicalStops,
            hasTechnicalStops: hasTechnicalStops,
            // ✅ Preserve original fields
            destinationCode: segment.destinationCode || segment.destination?.iata_code || '',
            destinationName: segment.destinationName || segment.destination?.name || '',
            startTime: segment.startTime || segment.departing_at || '',
            endTime: segment.endTime || segment.arriving_at || '',
            flightNumber: segment.flightNumber || '',
            operatingCarrier: segment.operatingCarrier || segment.operating_carrier?.name || '',
          };
        });
            
        return {
          ...slice,
          segments: segments,
          duration: slice.duration || '',
          origin: segments[0]?.origin || slice.origin,
          destination: segments[segments.length - 1]?.destination || slice.destination,
          departure_time: segments[0]?.departing_at || slice.departure_time || slice.departureTime,
          arrival_time: segments[segments.length - 1]?.arriving_at || slice.arrival_time || slice.arrivalTime,
          stopDetails: slice.stopDetails || null,
        };
      });
      
      return {
        ...currentItem,
        slices: processedSlices.length > 0 ? processedSlices : currentItem.slices,
        isRoundTrip: processedSlices.length === 2,
        isMultiCity: processedSlices.length > 2,
        freeBaggage: currentItem.freeBaggage || null,
        custom_messages: (currentItem as any).custom_messages || [],
        stop_information: currentItem.stop_information || null,
      };
    }
    
    return currentItem;
  }, [currentItem]);



const renderStopDetails = () => {
  const stopInfo = stopInformation;
  
  const hasTechnicalStops = stopInfo?.hasTechnicalStops || false;
  const technicalStops = stopInfo?.technicalStops || [];
  const totalTechnicalStops = stopInfo?.totalTechnicalStops || 0;
  
  
  const slices = transformedItem?.slices || [];
  let enrichedTechnicalStops = [...technicalStops];
  

  if (slices.length > 0 && (!hasTechnicalStops || technicalStops.length === 0 || technicalStops[0]?.stopLocation === 'Unknown')) {
    slices.forEach((slice: any) => {
      const segments = slice?.segments || [];
      segments.forEach((segment: any) => {
       
        if (segment.hasTechnicalStops && segment.technicalStops && segment.technicalStops.length > 0) {
          segment.technicalStops.forEach((ts: any) => {
            const airportCode = ts.AirportCode || ts.stopCode || '';
            const airportName = ts.AirportName || ts.stopLocation || '';
            const duration = ts.Duration || ts.stopDuration || '';
            
          
            const exists = enrichedTechnicalStops.some(
              (existing: any) => existing.stopCode === airportCode || existing.stopLocation === airportName
            );
            
            if (!exists && (airportCode || airportName)) {
              enrichedTechnicalStops.push({
                stopLocation: airportName || airportCode,
                stopCode: airportCode,
                stopDuration: duration,
                arrivalTime: ts.ArrivalDate || ts.arrivalTime || null,
                departureTime: ts.DepartureDate || ts.departureTime || null,
              });
            }
          });
        }
      });
    });
  }
  
  // Also check flight_summary slices directly
  const flightSummary = transformedItem?.flight_summary;
  if (flightSummary?.slices) {
    flightSummary.slices.forEach((slice: any) => {
      const segments = slice?.segments || [];
      segments.forEach((segment: any) => {
        if (segment.hasTechnicalStops && segment.technicalStops && segment.technicalStops.length > 0) {
          segment.technicalStops.forEach((ts: any) => {
            const airportCode = ts.AirportCode || ts.stopCode || '';
            const airportName = ts.AirportName || ts.stopLocation || '';
            const duration = ts.Duration || ts.stopDuration || '';
            
            const exists = enrichedTechnicalStops.some(
              (existing: any) => existing.stopCode === airportCode || existing.stopLocation === airportName
            );
            
            if (!exists && (airportCode || airportName)) {
              enrichedTechnicalStops.push({
                stopLocation: airportName || airportCode,
                stopCode: airportCode,
                stopDuration: duration,
                arrivalTime: ts.ArrivalDate || ts.arrivalTime || null,
                departureTime: ts.DepartureDate || ts.departureTime || null,
              });
            }
          });
        }
      });
    });
  }
  
  const finalTechnicalStops = enrichedTechnicalStops.length > 0 ? enrichedTechnicalStops : technicalStops;
  const hasValidTechnicalStops = finalTechnicalStops.some(
    (stop: any) => stop.stopLocation && stop.stopLocation !== 'Unknown'
  );
  

  const showTechnicalStops = hasValidTechnicalStops || (hasTechnicalStops && finalTechnicalStops.length > 0);
  
  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-px flex-1 ${showTechnicalStops ? 'bg-amber-200' : 'bg-gray-200'}`}></div>
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${showTechnicalStops ? 'text-amber-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className={`text-xs font-black uppercase tracking-wider ${showTechnicalStops ? 'text-amber-600' : 'text-gray-400'}`}>
            Technical Stops {showTechnicalStops ? `(${finalTechnicalStops.length})` : ''}
          </h4>
        </div>
        <div className={`h-px flex-1 ${showTechnicalStops ? 'bg-amber-200' : 'bg-gray-200'}`}></div>
      </div>
      
      {showTechnicalStops && finalTechnicalStops.length > 0 ? (
        <div className="space-y-3">
          {finalTechnicalStops.map((stop: any, idx: number) => {
        
            let displayName = stop.stopLocation || stop.location || 'Unknown';
            if (displayName === 'Unknown' && stop.stopCode) {
           
              const airportNames: Record<string, string> = {
                'FCO': 'Rome (FCO)',
                'LHR': 'London (LHR)',
                'CDG': 'Paris (CDG)',
                'AMS': 'Amsterdam (AMS)',
                'DXB': 'Dubai (DXB)',
                'DOH': 'Doha (DOH)',
                'AUH': 'Abu Dhabi (AUH)',
                'IST': 'Istanbul (IST)',
                'JFK': 'New York (JFK)',
                'EWR': 'Newark (EWR)',
                'ORD': 'Chicago (ORD)',
                'ATL': 'Atlanta (ATL)',
                'LAX': 'Los Angeles (LAX)',
                'SFO': 'San Francisco (SFO)',
                'MIA': 'Miami (MIA)',
                'YYZ': 'Toronto (YYZ)',
                'YVR': 'Vancouver (YVR)',
                'YUL': 'Montreal (YUL)',
                'ADD': 'Addis Ababa (ADD)',
                'LOS': 'Lagos (LOS)',
                'NBO': 'Nairobi (NBO)',
                'JNB': 'Johannesburg (JNB)',
                'CPT': 'Cape Town (CPT)',
                'DUR': 'Durban (DUR)',
              };
              displayName = airportNames[stop.stopCode] || `${stop.stopCode} (Technical Stop)`;
            } else if (displayName === 'Unknown' && stop.airport) {
              displayName = stop.airport;
            }
            
            // Get stop duration
            let durationDisplay = stop.stopDuration || stop.duration || '';
            
            return (
              <div key={idx} className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-base font-black text-gray-900">{displayName}</p>
                      {stop.stopCode && displayName !== stop.stopCode && (
                        <span className="text-xs text-gray-500">({stop.stopCode})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {durationDisplay && (
                        <span className="text-xs text-amber-700">⏱ {formatStopTime(durationDisplay)}</span>
                      )}
                      {stop.arrivalTime && (
                        <span className="text-xs text-gray-500">Arrives: {formatTime(stop.arrivalTime)}</span>
                      )}
                      {stop.departureTime && (
                        <span className="text-xs text-gray-500">Departs: {formatTime(stop.departureTime)}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Technical stop • Passengers remain on board
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-600 font-medium">No technical stops on this route</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">This flight does not have any technical stops (fuel stops where passengers stay on board).</p>
        </div>
      )}
    </div>
  );
};

  // Handle book click
  const handleBookClick = async () => {
    try {
      let finalItem = { ...transformedItem };
      
      if (transformedItem.isWakanow && transformedItem._wakanowData) {
        const completeBooking = {
          ...transformedItem,
          id: transformedItem.id || `flight-${Date.now()}`,
          type: 'flight',
          status: 'Confirmed',
          custom_messages: (transformedItem as any).custom_messages || [],
          stop_information: transformedItem.stop_information || null,
        };
        
        selectItem(completeBooking);
        sessionStorage.setItem('selectedBooking', JSON.stringify(completeBooking));
        router.push('/booking/review');
        return;
      }
      
      if (transformedItem.isWakanow && transformedItem.fare_rules?.length > 0) {
        const completeBooking = {
          ...transformedItem,
          id: transformedItem.id || `flight-${Date.now()}`,
          type: 'flight',
          status: 'Confirmed',
          custom_messages: (transformedItem as any).custom_messages || [],
          stop_information: transformedItem.stop_information || null,
        };
        
        selectItem(completeBooking);
        sessionStorage.setItem('selectedBooking', JSON.stringify(completeBooking));
        router.push('/booking/review');
        return;
      }
      
      const completeBooking = {
        ...transformedItem,
        id: transformedItem.id || `flight-${Date.now()}`,
        type: 'flight',
        status: 'Confirmed',
        stop_information: transformedItem.stop_information || null,
      };
      
      selectItem(completeBooking);
      sessionStorage.setItem('selectedBooking', JSON.stringify(completeBooking));
      router.push('/booking/review');
    } catch (error: any) {
      console.error('Failed to prepare booking:', error);
      
      if (error.message?.toLowerCase().includes('expired') || 
          error.message?.toLowerCase().includes('search again')) {
        toast.error('Your flight selection has expired. Please search for flights again.');
        setTimeout(() => {
          router.push('/search');
        }, 2000);
        return;
      }
      
      const completeBooking = {
        ...transformedItem,
        id: transformedItem.id || `flight-${Date.now()}`,
        type: 'flight',
        status: 'Confirmed',
        stop_information: transformedItem.stop_information || null,
      };
      selectItem(completeBooking);
      router.push('/booking/review');
    } finally {
      setIsConverting(false);
    }
  };

const renderSegment = (segment: any, index: number, isLast: boolean, sliceIndex: number = 0) => {
  if (!segment) return null;
  

  const segmentTechnicalStops = segment.technicalStops || [];
  const hasSegmentTechnicalStops = segment.hasTechnicalStops || segmentTechnicalStops.length > 0;
  
  return (
    <div key={index} className={`${!isLast ? 'mb-6' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="text-left">
          <p className="text-2xl font-black text-gray-900">{formatTime(segment.departing_at)}</p>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">{segment.origin?.iata_code || '--'}</p>
          <p className="text-[10px] text-gray-400">{segment.origin?.city_name || ''}</p>
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
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase">{segment.destination?.iata_code || '--'}</p>
          <p className="text-[10px] text-gray-400">{segment.destination?.city_name || ''}</p>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-[10px] text-gray-500">
          Flight {segment.marketing_carrier_flight_number || '--'} • {segment.operating_carrier?.name || ''}
        </p>
      </div>
      {segment.freeBaggage && segment.freeBaggage.BagCount > 0 && (
        <div className="mt-1 text-center">
          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            ✈️ {segment.freeBaggage.BagCount} bag{segment.freeBaggage.BagCount > 1 ? 's' : ''} included
            {segment.freeBaggage.Weight > 0 && ` (${segment.freeBaggage.Weight} ${segment.freeBaggage.WeightUnit || 'kg'})`}
          </span>
        </div>
      )}

  
{hasSegmentTechnicalStops && (
  <div className="mt-4 pl-4 border-l-2 border-amber-300">
    <div className="flex items-center gap-2 mb-2">
      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
        Technical Stop{segmentTechnicalStops.length > 1 ? 's' : ''}
      </span>
    </div>
    <div className="space-y-2">
      {segmentTechnicalStops.map((stop: any, stopIdx: number) => {
       
        let displayName = stop.AirportName || stop.stopLocation || stop.location || stop.airport || 'Unknown';
        let stopCode = stop.AirportCode || stop.stopCode || stop.code || '';
        
        
        if ((displayName === 'Unknown' || displayName === '') && stopCode) {
          const airportNames: Record<string, string> = {
            'FCO': 'Rome (FCO)',
            'LHR': 'London (LHR)',
            'CDG': 'Paris (CDG)',
            'AMS': 'Amsterdam (AMS)',
            'DXB': 'Dubai (DXB)',
            'DOH': 'Doha (DOH)',
            'AUH': 'Abu Dhabi (AUH)',
            'IST': 'Istanbul (IST)',
            'JFK': 'New York (JFK)',
            'EWR': 'Newark (EWR)',
            'ORD': 'Chicago (ORD)',
            'ATL': 'Atlanta (ATL)',
            'LAX': 'Los Angeles (LAX)',
            'SFO': 'San Francisco (SFO)',
            'MIA': 'Miami (MIA)',
            'YYZ': 'Toronto (YYZ)',
            'YVR': 'Vancouver (YVR)',
            'YUL': 'Montreal (YUL)',
            'ADD': 'Addis Ababa (ADD)',
            'LOS': 'Lagos (LOS)',
            'NBO': 'Nairobi (NBO)',
            'JNB': 'Johannesburg (JNB)',
            'CPT': 'Cape Town (CPT)',
            'DUR': 'Durban (DUR)',
          };
          displayName = airportNames[stopCode] || `${stopCode} (Technical Stop)`;
        }
        
        
        let durationDisplay = stop.Duration || stop.stopDuration || stop.duration || '';

        const arrivalTime = stop.ArrivalDate || stop.arrivalTime || stop.arrival || null;
        const departureTime = stop.DepartureDate || stop.departureTime || stop.departure || null;
        
        return (
          <div key={`tech-stop-${sliceIndex}-${index}-${stopIdx}`} className="bg-amber-50/70 rounded-lg border border-amber-100 p-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-bold text-gray-900">{displayName}</p>
                  {durationDisplay && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      ⏱ {formatStopTime(durationDisplay)}
                    </span>
                  )}
                </div>
                {stopCode && displayName !== `${stopCode} (Technical Stop)` && (
                  <p className="text-[10px] text-gray-500 mt-0.5">Airport: {stopCode}</p>
                )}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {arrivalTime && (
                    <span className="text-[10px] text-gray-500">Arrives: {formatTime(arrivalTime)}</span>
                  )}
                  {departureTime && (
                    <span className="text-[10px] text-gray-500">Departs: {formatTime(departureTime)}</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Technical stop • Passengers remain on board
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
    </div>
  );
};
const renderJourney = (slice: any, title: string, date: string, journeyNumber: number) => {
  if (!slice) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">
              {journeyNumber}
            </div>
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</h3>
          </div>
          <p className="text-xs font-bold text-gray-600">{date}</p>
        </div>
        <div className="text-center py-8 text-gray-400">No flight information available</div>
      </div>
    );
  }
  
  const segments = slice?.segments || [];
  const stopovers = getStopoverAirports(segments);
  const hasStopovers = stopovers.length > 0;
  

  if (segments.length > 0) {
    console.log(`🔍 Journey ${journeyNumber} - segments: ${segments.length}, stopovers: ${stopovers.length}`);
    console.log('🔍 Stopovers:', stopovers);
  }
  
  if (segments.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">
              {journeyNumber}
            </div>
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</h3>
          </div>
          <p className="text-xs font-bold text-gray-600">{date}</p>
        </div>
        <div className="text-center py-8 text-gray-400">No flight information available</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#33a8da]/10 flex items-center justify-center text-[#33a8da] font-black text-sm flex-shrink-0">
            {journeyNumber}
          </div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{title}</h3>
        </div>
        <p className="text-xs font-bold text-gray-600">{date}</p>
      </div>
      
      {segments.map((segment: any, idx: number) => (
        <div key={`segment-${journeyNumber}-${idx}`}>
          {renderSegment(segment, idx, idx === segments.length - 1)}
        </div>
      ))}
      
      {/* ✅ Always show stopovers if they exist */}
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
              <div key={`stopover-${journeyNumber}-${idx}`} className="bg-amber-50 rounded-xl border border-amber-100 p-4">
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

  // Show loading state
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

  if (!transformedItem) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-[32px] p-12 shadow-xl border border-gray-100">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase mb-2">Flight Details Unavailable</h3>
            <p className="text-sm text-gray-500 font-medium mb-6">Unable to load flight details. Please go back and try again.</p>
            <button onClick={onBack} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isRoundTrip = transformedItem.isRoundTrip || false;
  const isMultiCity = transformedItem.isMultiCity || false;
  const slices = transformedItem.slices || [];
  const sliceCount = slices.length;

  // ✅ Determine trip type label
  let tripTypeLabel = 'One-way';
  if (isMultiCity) {
    tripTypeLabel = 'Multi-city';
  } else if (isRoundTrip) {
    tripTypeLabel = 'Round trip';
  }

  const firstSegment = slices[0]?.segments?.[0] || {};
  const airlineName = transformedItem.airlineName || firstSegment?.operating_carrier?.name || transformedItem.provider || 'Airline';
  const airlineCode = transformedItem.airlineCode || firstSegment?.operating_carrier?.iata_code || '';
  const airlineLogo = transformedItem.airlineLogo;
  const flightNumber = transformedItem.flightNumber || firstSegment?.marketing_carrier_flight_number || '';
  
  // ✅ Calculate total stops across all slices
  const totalStopsAcrossSlices = slices.reduce((total: number, slice: any) => {
    return total + (slice.segments?.length ? slice.segments.length - 1 : 0);
  }, 0);
  const stopText = totalStopsAcrossSlices === 0 ? 'Direct' : `${totalStopsAcrossSlices} stop${totalStopsAcrossSlices > 1 ? 's' : ''}`;
  
  const baggageInfo = slices[0]?.segments?.[0]?.freeBaggage || transformedItem.freeBaggage;
  const isRefundable = transformedItem.isRefundable || transformedItem.flight_summary?.isRefundable || false;
  const providerBadge = transformedItem.isWakanow ? 'Wakanow' : '';
  const fareRules = transformedItem.fare_rules || [];
  const penaltyRules = transformedItem.penalty_rules || [];

  // ✅ Get stop information from the API
  const stopInfo = stopInformation;
  const hasTechnicalStops = stopInfo?.hasTechnicalStops || false;
  const totalTechnicalStops = stopInfo?.totalTechnicalStops || 0;

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
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{flightNumber || 'Flight'}</p>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{tripTypeLabel}</p>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stopText}</p>
                    
                    {/* ✅ Only show technical stop badge if there are actual technical stops */}
                    {hasTechnicalStops && totalTechnicalStops > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          🛑 {totalTechnicalStops} technical stop{totalTechnicalStops > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                    
                    {providerBadge && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-[9px] font-bold text-[#33a8da] bg-[#33a8da]/10 px-2 py-0.5 rounded-full">
                          {providerBadge}
                        </span>
                      </>
                    )}
                    
                    {isRefundable && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          ✅ Refundable
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#33a8da] tracking-tighter">{convertedPrice || 'Loading...'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Per Passenger</p>
              </div>
            </div>

            

            {/* ✅ Multi-City Summary */}
            <div className="pt-6 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {slices.map((slice: any, idx: number) => {
                  const origin = slice.origin?.iata_code || slice.departureCode || '--';
                  const destination = slice.destination?.iata_code || slice.arrivalCode || '--';
                  const depTime = formatTime(slice.segments?.[0]?.departing_at || slice.departure_time || slice.departureTime);
                  const arrTime = formatTime(slice.segments?.[slice.segments.length - 1]?.arriving_at || slice.arrival_time || slice.arrivalTime);
                  const segmentCount = slice.segments?.length || 1;
                  const stops = segmentCount > 1 ? `${segmentCount - 1} stop` : 'Direct';
                  
                  return (
                    <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-black text-gray-900">{origin}</span>
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span className="font-black text-gray-900">{destination}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        {depTime} - {arrTime}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {stops} • {calculateDuration(slice.duration || slice.tripDuration)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Journey Details - Multi-City Support */}
          <div className="p-8 md:p-12 space-y-12">
            <div className="grid grid-cols-1 gap-8 md:gap-12">
            
{slices.map((slice: any, idx: number) => {
  const journeyNumber = idx + 1;
  let title = `Journey ${journeyNumber}`;
  let date = formatDate(slice.segments?.[0]?.departing_at || slice.departure_time || slice.departureTime);
  
  if (isRoundTrip) {
    if (idx === 0) title = 'Outbound Journey';
    else if (idx === 1) title = 'Return Journey';
  } else if (isMultiCity) {
    const origin = slice.origin?.iata_code || slice.departureCode || '--';
    const destination = slice.destination?.iata_code || slice.arrivalCode || '--';
    title = `${origin} → ${destination}`;
  }
  
  return (
    <div key={`journey-${idx}`}>
      {renderJourney(slice, title, date, journeyNumber)}
    </div>
  );
})}
            </div>

         

            {/* Fare Rules Section */}
            {fareRules.length > 0 && (
              <div className="pt-6 border-t border-gray-100">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Fare Rules</h4>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <ul className="space-y-1.5">
                    {fareRules.map((rule: string, idx: number) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-[#33a8da] mt-0.5">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Penalty Rules Section */}
            {penaltyRules.length > 0 && (
              <div className="pt-2">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Penalty Rules</h4>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <ul className="space-y-1.5">
                    {penaltyRules.map((rule: string, idx: number) => (
                      <li key={idx} className="text-xs text-amber-700 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">⚠</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
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
                  {tripTypeLabel} • {stopText} • Seats confirmed for immediate booking.
                  {/* ✅ Only show technical stops if they actually exist */}
                  {hasTechnicalStops && totalTechnicalStops > 0 && ` • ${totalTechnicalStops} technical stop${totalTechnicalStops > 1 ? 's' : ''}`}
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