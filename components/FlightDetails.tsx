'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { 
  X, Share2, Clock, Briefcase, Info, 
  Package, User, Calendar,
  CheckCircle, AlertCircle, Plane
} from 'lucide-react';

interface FlightDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
  isOverlay?: boolean;
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

// Helper function to get airport display name with code
const getAirportDisplayName = (airportCode?: string, airportName?: string): string => {
  if (airportName && airportName !== 'Unknown' && airportName !== '') {
    return `${airportCode || 'FCO'} · ${airportName}`;
  }
  
  const airportMap: Record<string, string> = {
    'FCO': 'Rome (Rome)',
    'LHR': 'London (London)',
    'CDG': 'Paris (Paris)',
    'AMS': 'Amsterdam (Amsterdam)',
    'DXB': 'Dubai (Dubai)',
    'DOH': 'Doha (Doha)',
    'AUH': 'Abu Dhabi (Abu Dhabi)',
    'IST': 'Istanbul (Istanbul)',
    'JFK': 'New York (New York)',
    'EWR': 'Newark (Newark)',
    'ORD': 'Chicago (Chicago)',
    'ATL': 'Atlanta (Atlanta)',
    'LAX': 'Los Angeles (Los Angeles)',
    'SFO': 'San Francisco (San Francisco)',
    'MIA': 'Miami (Miami)',
    'YYZ': 'Toronto (Toronto)',
    'YVR': 'Vancouver (Vancouver)',
    'YUL': 'Montreal (Montreal)',
    'ADD': 'Addis Ababa (Addis Ababa)',
    'LOS': 'Lagos (Lagos)',
    'NBO': 'Nairobi (Nairobi)',
    'JNB': 'Johannesburg (Johannesburg)',
    'CPT': 'Cape Town (Cape Town)',
    'DUR': 'Durban (Durban)',
  };
  
  if (airportCode && airportMap[airportCode]) {
    return `${airportCode} · ${airportMap[airportCode]}`;
  }
  
  return airportCode || 'Unknown';
};

const FlightDetails: React.FC<FlightDetailsProps> = ({ 
  item, 
  searchParams, 
  onBack, 
  onBook,
  isOverlay = false 
}) => {
  const router = useRouter();
  const { selectItem } = useSearch();
  const { currency, formatPrice, isLoadingRates } = useLanguage();
  const [convertedPrice, setConvertedPrice] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);
  const [activeTab, setActiveTab] = useState<'fare' | 'penalty'>('fare');

  // Brand colors
  const brandColors = {
    primary: '#33a8da',
    primaryDark: '#2c98c7',
    primaryLight: '#e8f4fa',
    background: '#f8fafc',
    text: '#1a1a2e',
    textSecondary: '#6b7280',
  };

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return '--:--';
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
              technicalStops: technicalStops,
              hasTechnicalStops: hasTechnicalStops,
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

  // Share functionality
  const handleShare = async () => {
    try {
      const url = window.location.href;
      const destCity = slices[0]?.destination?.city_name || slices[0]?.destination?.name || 'Destination';
      const title = `Flight to ${destCity}`;
      const text = `Check out this flight to ${destCity} on Ebony Bruce Travels!`;
      
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success('Link copied to clipboard!');
        } catch {
          toast.error('Unable to share or copy link');
        }
      }
    }
  };

  // Show loading state
  if (isConverting || isLoadingRates) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: brandColors.background }}>
        <div className="bg-white rounded-2xl p-12 shadow-xl border border-gray-100 text-center max-w-md w-full">
          <div className="w-16 h-16 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-black text-gray-900">Loading Price</h3>
          <p className="text-sm text-gray-500 font-medium">Converting to {currency.code}...</p>
        </div>
      </div>
    );
  }

  if (!transformedItem) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: brandColors.background }}>
        <div className="bg-white rounded-2xl p-12 shadow-xl border border-gray-100 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-yellow-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900">Flight Details Unavailable</h3>
          <p className="text-sm text-gray-500 font-medium mb-6">Unable to load flight details. Please go back and try again.</p>
          <button onClick={onBack} className="px-6 py-3 text-white font-bold rounded-lg transition" style={{ backgroundColor: brandColors.primary }}>
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const slices = transformedItem.slices || [];
  const firstSegment = slices[0]?.segments?.[0] || {};
  const airlineName = transformedItem.airlineName || firstSegment?.operating_carrier?.name || transformedItem.provider || 'Airline';
  const airlineLogo = transformedItem.airlineLogo || firstSegment?.operating_carrier?.logo || slices[0]?.airlineLogo || null;
  
  const totalStopsAcrossSlices = slices.reduce((total: number, slice: any) => {
    return total + (slice.segments?.length ? slice.segments.length - 1 : 0);
  }, 0);
  
  const fareRules = transformedItem.fare_rules || [];
  const penaltyRules = transformedItem.penalty_rules || [];

  const totalDuration = slices[0]?.duration || slices[0]?.tripDuration || '';
  const formattedDuration = calculateDuration(totalDuration);

  // Get route info
  const destCity = slices[0]?.destination?.city_name || slices[0]?.destination?.name || 'Destination';

  // Check if we have any rules to show
  const hasFareRules = fareRules.length > 0;
  const hasPenaltyRules = penaltyRules.length > 0;
  const hasAnyRules = hasFareRules || hasPenaltyRules;

  // Get baggage info from API
  const baggageInfo = transformedItem.freeBaggage || slices[0]?.freeBaggage || slices[0]?.segments?.[0]?.freeBaggage || null;
  const baggageCount = baggageInfo?.BagCount || 0;
  const baggageWeight = baggageInfo?.Weight || 0;

  // Main render - conditionally remove outer background for overlay
  return (
    <div 
      className={isOverlay ? '' : 'min-h-screen'} 
      style={{ backgroundColor: isOverlay ? 'transparent' : brandColors.background }}
    >
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* White Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Top Bar */}
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: brandColors.primary }}>
                Your flight to {destCity}
              </h1>
              <button 
                onClick={handleShare}
                className="flex items-center gap-1.5 text-sm mt-1.5 font-medium hover:underline transition" 
                style={{ color: brandColors.primary }}
              >
                <Share2 size={15} /> Share this flight
              </button>
            </div>
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={22} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* Flight Sections */}
          <div className="px-6 py-5 border-b border-gray-100">
            {slices.map((slice: any, sliceIdx: number) => {
              const segments = slice?.segments || [];
              if (segments.length === 0) return null;
              
              const isRoundTripSlice = transformedItem.isRoundTrip && sliceIdx === 1;
              const routeLabel = isRoundTripSlice ? `Flight to ${segments[0]?.origin?.city_name || 'Origin'}` : `Flight to ${destCity}`;
              const stops = segments.length > 1 ? `${segments.length - 1} stop` : 'Direct';
              const duration = calculateDuration(slice.duration || slice.tripDuration);
              
              // Get airline logo for this slice
              const sliceAirlineLogo = slice.airlineLogo || airlineLogo;
              
              return (
                <div key={`route-${sliceIdx}`} className="mb-8 last:mb-0">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-gray-900">{routeLabel}</h2>
                    <p className="text-sm text-gray-500">{stops} · {duration || '24h 50m'}</p>
                  </div>

                  <div className="space-y-5">
                    {segments.map((segment: any, segIdx: number) => {
                      const isLast = segIdx === segments.length - 1;
                      const depDate = formatDate(segment.departing_at);
                      const layoverDuration = !isLast ? calculateDuration(segment.duration) : null;
                      
                      // ONLY check technical stops from the segment data
                      const hasTechStop = segment.hasTechnicalStops && segment.technicalStops?.length > 0;
                      const techStop = hasTechStop ? segment.technicalStops[0] : null;
                      const hasFinalTechStop = !!(techStop);
                      
                      // Get airline logo for this segment
                      const segmentAirlineLogo = segment.operating_carrier?.logo || sliceAirlineLogo;
                      
                      return (
                        <div key={`segment-${sliceIdx}-${segIdx}`}>
                          {/* Flight Segment */}
                          <div className="flex gap-5">
                            {/* Timeline */}
                            <div className="flex flex-col items-center pt-1">
                              <div className="w-3 h-3 rounded-full border-2 border-gray-300 bg-white"></div>
                              <div className="w-0.5 flex-1 min-h-[60px] bg-gray-200 my-1.5"></div>
                              <div className="w-3 h-3 rounded-full border-2 border-gray-300 bg-white"></div>
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              {/* Departure */}
                              <div>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">
                                      <Calendar size={12} className="inline mr-1" style={{ color: brandColors.primary }} />
                                      {depDate} · {formatTime(segment.departing_at)}
                                    </p>
                                    <p className="font-bold text-gray-900 text-base mt-0.5">
                                      {segment.origin?.iata_code || '--'} · {segment.origin?.name || segment.origin?.city_name || ''}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {segmentAirlineLogo ? (
                                        <img 
                                          src={segmentAirlineLogo} 
                                          alt={segment.operating_carrier?.name || airlineName}
                                          className="w-4 h-4 object-contain"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <Plane size={14} className="text-gray-400" />
                                      )}
                                      <span className="text-xs font-medium text-gray-600">{segment.operating_carrier?.name || airlineName}</span>
                                    </div>
                                    <p className="text-xs text-gray-400">{segment.marketing_carrier_flight_number || '--'} · Economy</p>
                                    <p className="text-xs text-gray-400">Flight time {calculateDuration(segment.duration)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Arrival */}
                              <div className="pt-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500">
                                      <Calendar size={12} className="inline mr-1" style={{ color: brandColors.primary }} />
                                      {formatDate(segment.arriving_at)} · {formatTime(segment.arriving_at)}
                                    </p>
                                    <p className="font-bold text-gray-900 text-base mt-0.5">
                                      {segment.destination?.iata_code || '--'} · {segment.destination?.name || segment.destination?.city_name || ''}
                                    </p>
                                    {/* Technical Stop - Show ONLY if exists on THIS segment */}
                                    {hasFinalTechStop && techStop && (
                                      <div className="mt-1.5 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                        <Plane size={14} className="text-amber-600" />
                                        <span className="text-xs font-medium text-amber-700">
                                          Technical stop: {getAirportDisplayName(
                                            techStop.AirportCode || techStop.stopCode || 'FCO',
                                            techStop.AirportName || techStop.stopLocation
                                          )}
                                          {techStop.Duration && ` · ${formatDurationDisplay(techStop.Duration)}`}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Layover - Brand Blue Color */}
                          {!isLast && layoverDuration && (
                            <div className="flex items-center gap-2.5 py-2.5 rounded-lg px-4 ml-11 border" 
                              style={{ 
                                backgroundColor: brandColors.primaryLight, 
                                borderColor: brandColors.primary,
                                color: brandColors.primary
                              }}
                            >
                              <Clock size={15} style={{ color: brandColors.primary }} />
                              <span className="text-sm font-medium" style={{ color: brandColors.primary }}>
                                Layover {layoverDuration}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Baggage - Only from API */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={18} style={{ color: brandColors.primary }} />
              <h3 className="font-bold text-gray-800">Baggage</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">The total baggage included in the price</p>
            <div className="space-y-3.5">
              {baggageCount > 0 && (
                <div className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex gap-3 items-start">
                    <Package size={18} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{baggageCount} checked bag{baggageCount > 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-500">Max weight {baggageWeight || 23} kg</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">Included</span>
                </div>
              )}
            </div>
          </div>

          {/* Fare Rules & Penalty Rules - Tabs */}
          {hasAnyRules && (
            <div className="px-6 py-5 border-b border-gray-100">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-200 mb-4">
                {hasFareRules && (
                  <button
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
                      activeTab === 'fare'
                        ? 'text-[#33a8da] border-b-2 border-[#33a8da]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('fare')}
                  >
                    Fare Rules
                  </button>
                )}
                {hasPenaltyRules && (
                  <button
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 relative ${
                      activeTab === 'penalty'
                        ? 'text-[#33a8da] border-b-2 border-[#33a8da]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('penalty')}
                  >
                    Penalty Rules
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {/* Fare Rules Tab */}
                {activeTab === 'fare' && hasFareRules && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Helpful policy information</p>
                    <div className="space-y-2.5">
                      {fareRules.map((rule: string, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start py-2 px-4 bg-gray-50 rounded-lg border border-gray-100">
                          <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Penalty Rules Tab */}
                {activeTab === 'penalty' && hasPenaltyRules && (
                  <div>
                    <div className="space-y-2.5">
                      {penaltyRules.map((rule: string, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start py-2 px-4 bg-amber-50 rounded-lg border border-amber-100">
                          <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-800">{rule}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer - Price and Continue Button */}
          <div className="px-6 py-6 bg-gray-50 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total price</p>
                <p className="text-3xl font-bold" style={{ color: brandColors.primary }}>
                  {convertedPrice || 'US$1,371.97'}
                </p>
              </div>
              <button 
                onClick={handleBookClick}
                className="w-full sm:w-auto text-white font-bold py-3 px-12 rounded-xl transition-all duration-200 hover:shadow-lg active:scale-95"
                style={{ backgroundColor: brandColors.primary }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = brandColors.primaryDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = brandColors.primary;
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightDetails;