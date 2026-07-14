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

const FlightDetails: React.FC<FlightDetailsProps> = ({ item, searchParams, onBack, onBook }) => {
  const router = useRouter();
  const { selectItem } = useSearch();
  const { currency, formatPrice, isLoadingRates } = useLanguage();
  const [convertedPrice, setConvertedPrice] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  
  // ✅ Add local state to track the item
  const [currentItem, setCurrentItem] = useState(item);

  // ✅ Update local state when item prop changes
  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Helper functions (defined early)
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

  // Convert price when component loads or currency changes
  useEffect(() => {
    const convertFlightPrice = async () => {
      if (!currentItem) return;
      
      setIsConverting(true);
      try {
        let originalAmount = 0;
        let originalCurrency = 'NGN';
        
        // ✅ PRIORITY 1: Check for Wakanow data first (most accurate)
        if (currentItem.isWakanow && currentItem.totalAmount) {
          originalAmount = currentItem.totalAmount;
          originalCurrency = currentItem.currency || 'NGN';
        }
        // ✅ PRIORITY 2: Check flight_summary
        else if (currentItem.flight_summary?.price?.Amount) {
          originalAmount = currentItem.flight_summary.price.Amount;
          originalCurrency = currentItem.flight_summary.price.CurrencyCode || 'NGN';
        }
        // ✅ PRIORITY 3: Check priceBreakdown
        else if (currentItem.priceBreakdown?.totalAmount) {
          originalAmount = currentItem.priceBreakdown.totalAmount;
          originalCurrency = currentItem.priceBreakdown.currency || 'NGN';
        }
        // Fallback to other price fields
        else if (currentItem.originalPriceAmount && currentItem.originalPriceCurrency) {
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
        } else if (currentItem.price) {
          if (typeof currentItem.price === 'string') {
            const match = currentItem.price.match(/[\d,]+\.?\d*/);
            if (match) {
              originalAmount = parseFloat(match[0].replace(/,/g, ''));
            }
          } else if (typeof currentItem.price === 'number') {
            originalAmount = currentItem.price;
          }
        }
        
        if (originalAmount > 0) {
          const formatted = await formatPrice(originalAmount, originalCurrency);
          setConvertedPrice(formatted);
          console.log('💰 Price converted:', { originalAmount, originalCurrency, formatted });
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

// Transform the item to ensure correct structure for display
const transformedItem = useMemo(() => {
  if (!currentItem) return null;
  
  console.log('🔄 FlightDetails: Transforming flight:', {
    id: currentItem.id,
    provider: currentItem.provider,
    isWakanow: currentItem.isWakanow,
    hasSlices: !!(currentItem.slices),
    slicesLength: currentItem.slices?.length,
    hasWakanowData: !!currentItem._wakanowData,
    fareRulesCount: currentItem.fare_rules?.length || 0,
    penaltyRulesCount: currentItem.penalty_rules?.length || 0,
    hasBaggage: !!currentItem.freeBaggage,
    isRefundable: currentItem.isRefundable,
    customMessagesCount: (currentItem as any).custom_messages?.length || 0,
    slice0Origin: currentItem.slices?.[0]?.segments?.[0]?.origin?.iata_code,
    slice0Dest: currentItem.slices?.[0]?.segments?.[0]?.destination?.iata_code,
    slice0Departing: currentItem.slices?.[0]?.segments?.[0]?.departing_at,
    slice0Arriving: currentItem.slices?.[0]?.segments?.[0]?.arriving_at,
  });
  
  // ✅ FIRST: Check if we have Wakanow data from the API (most complete)
  if (currentItem._wakanowData) {
    const wakanowData = currentItem._wakanowData;
    const flightSummary = wakanowData.flight_summary;
    
    if (flightSummary?.slices && flightSummary.slices.length > 0) {
      console.log('📦 Using Wakanow data from API:', {
        slicesCount: flightSummary.slices.length,
        totalAmount: wakanowData.totalAmount,
        fareRules: wakanowData.fare_rules?.length || 0,
        penaltyRules: wakanowData.penalty_rules?.length || 0,
        customMessagesCount: wakanowData.custom_messages?.length || 0,
        firstSliceOrigin: flightSummary.slices[0]?.segments?.[0]?.origin?.iata_code,
        firstSliceDest: flightSummary.slices[0]?.segments?.[0]?.destination?.iata_code,
        firstSliceDeparting: flightSummary.slices[0]?.segments?.[0]?.departing_at,
        firstSliceArriving: flightSummary.slices[0]?.segments?.[0]?.arriving_at,
      });
      
      // ✅ Format custom_messages
      const rawMessages = wakanowData.custom_messages || [];
      let formattedCustomMessages: Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }> = [];

      if (Array.isArray(rawMessages) && rawMessages.length > 0) {
        if (typeof rawMessages[0] === 'object' && rawMessages[0] !== null && 'Title' in rawMessages[0]) {
          formattedCustomMessages = rawMessages as unknown as Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }>;
        } else if (typeof rawMessages[0] === 'string') {
          formattedCustomMessages = rawMessages.map((msg: string) => ({
            Title: 'Message',
            Message: msg,
            SeverityLevel: 'Medium' as const,
          }));
        }
      }
      
      // ✅ Ensure slices have proper structure with all fields
      const processedSlices = flightSummary.slices.map((slice: any) => {
        const segments = (slice.segments || []).map((segment: any) => {
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
        };
      });
      
      return {
        ...currentItem,
        slices: processedSlices,
        isRoundTrip: processedSlices.length > 1,
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
        // ✅ ✅ ✅ PRESERVE CUSTOM MESSAGES
        custom_messages: formattedCustomMessages.length > 0 ? formattedCustomMessages : (currentItem as any).custom_messages || [],
        freeBaggage: processedSlices[0]?.segments?.[0]?.freeBaggage || 
                     processedSlices[0]?.freeBaggage ||
                     currentItem.freeBaggage ||
                     null,
      };
    }
  }
  
  // ✅ SECOND: If we have already enriched data (from page), use it directly
  if (currentItem.fare_rules?.length > 0 || currentItem.penalty_rules?.length > 0 || currentItem.isRefundable) {
    console.log('📦 Using already enriched Wakanow data from props');
    
    const slices = currentItem.slices || [];
    const processedSlices = slices.map((slice: any) => {
      const segments = (slice.segments || []).map((segment: any) => ({
        departing_at: segment.departing_at || segment.startTime || segment.departureTime || '',
        arriving_at: segment.arriving_at || segment.endTime || segment.arrivalTime || '',
        duration: segment.duration || slice.duration || '',
        origin: segment.origin || { iata_code: '', name: '', city_name: '' },
        destination: segment.destination || { iata_code: '', name: '', city_name: '' },
        operating_carrier: segment.operating_carrier || { name: '', iata_code: '' },
        marketing_carrier_flight_number: segment.marketing_carrier_flight_number || segment.flightNumber || '',
        freeBaggage: segment.freeBaggage || currentItem.freeBaggage || null,
      }));
      
      return {
        ...slice,
        segments: segments,
        duration: slice.duration || '',
        origin: segments[0]?.origin || slice.origin,
        destination: segments[segments.length - 1]?.destination || slice.destination,
        departure_time: segments[0]?.departing_at || slice.departure_time || slice.departureTime,
        arrival_time: segments[segments.length - 1]?.arriving_at || slice.arrival_time || slice.arrivalTime,
      };
    });
    
    return {
      ...currentItem,
      slices: processedSlices.length > 0 ? processedSlices : currentItem.slices,
      isRoundTrip: (processedSlices.length > 1) || currentItem.isRoundTrip || false,
      freeBaggage: currentItem.freeBaggage || null,
      // ✅ Preserve custom_messages
      custom_messages: (currentItem as any).custom_messages || [],
    };
  }
  
  // Handle Wakanow flights
  if (currentItem.isWakanow) {
    const wakanowItem = currentItem as any;
    
    // If slices exist, transform them to ensure proper structure
    if (wakanowItem.slices && wakanowItem.slices.length > 0) {
      console.log('📦 Processing existing Wakanow slices:', wakanowItem.slices.length);
      
      const transformedSlices = wakanowItem.slices.map((slice: any, sliceIndex: number) => {
        const segments = (slice.segments || []).map((segment: any) => {
          const departingAt = segment.departing_at || segment.departureTime || segment.start_time || slice.departure_time;
          const arrivingAt = segment.arriving_at || segment.arrivalTime || segment.end_time || slice.arrival_time;
          
          const originCode = segment.origin?.iata_code || segment.from || segment.departure_code || slice.origin?.iata_code;
          const originName = segment.origin?.name || segment.fromName || slice.origin?.name;
          const originCity = segment.origin?.city_name || segment.departureCity || slice.origin?.city_name;
          
          const destCode = segment.destination?.iata_code || segment.to || segment.destination_code || slice.destination?.iata_code;
          const destName = segment.destination?.name || segment.toName || slice.destination?.name;
          const destCity = segment.destination?.city_name || segment.arrivalCity || slice.destination?.city_name;
          
          const airlineName = segment.operating_carrier?.name || segment.airline || wakanowItem.airlineName;
          const airlineCode = segment.operating_carrier?.iata_code || segment.airlineCode || wakanowItem.airlineCode;
          const flightNum = segment.flight_number || segment.marketing_carrier_flight_number || wakanowItem.flightNumber;
          
          return {
            departing_at: departingAt,
            arriving_at: arrivingAt,
            duration: segment.duration,
            origin: {
              iata_code: originCode,
              name: originName,
              city_name: originCity,
            },
            destination: {
              iata_code: destCode,
              name: destName,
              city_name: destCity,
            },
            operating_carrier: {
              name: airlineName,
              iata_code: airlineCode,
            },
            marketing_carrier_flight_number: flightNum,
            freeBaggage: segment.freeBaggage || slice.freeBaggage || wakanowItem.freeBaggage,
          };
        });
        
        return {
          ...slice,
          segments: segments,
          origin: segments[0]?.origin,
          destination: segments[segments.length - 1]?.destination,
          departure_time: segments[0]?.departing_at,
          arrival_time: segments[segments.length - 1]?.arriving_at,
        };
      });
      
      console.log('✅ Transformed Wakanow slices:', {
        sliceCount: transformedSlices.length,
        outboundSegments: transformedSlices[0]?.segments?.length,
        outboundOrigin: transformedSlices[0]?.origin?.iata_code,
        outboundDest: transformedSlices[0]?.destination?.iata_code,
        outboundDeparture: transformedSlices[0]?.departure_time,
      });
      
      return {
        ...currentItem,
        slices: transformedSlices,
        isRoundTrip: transformedSlices.length > 1,
        // ✅ Preserve custom_messages
        custom_messages: (currentItem as any).custom_messages || [],
      };
    }
    
    // If no slices, build from direct flight data
    console.log('🏗️ Building slices from direct flight data');
    
    const departureTime = wakanowItem.departureTime || wakanowItem.time;
    const arrivalTime = wakanowItem.arrivalTime;
    const duration = wakanowItem.duration;
    
    const outboundSegment = {
      departing_at: departureTime,
      arriving_at: arrivalTime,
      duration: duration,
      origin: {
        iata_code: wakanowItem.departureAirport || wakanowItem.departureCity,
        name: wakanowItem.departureCity,
        city_name: wakanowItem.departureCity,
      },
      destination: {
        iata_code: wakanowItem.arrivalAirport || wakanowItem.arrivalCity,
        name: wakanowItem.arrivalCity,
        city_name: wakanowItem.arrivalCity,
      },
      operating_carrier: {
        name: wakanowItem.airlineName || wakanowItem.title?.split(' ')[0],
        iata_code: wakanowItem.airlineCode,
      },
      marketing_carrier_flight_number: wakanowItem.flightNumber,
      freeBaggage: wakanowItem.freeBaggage,
    };
    
    const outboundSlice = {
      segments: [outboundSegment],
      duration: duration,
      origin: outboundSegment.origin,
      destination: outboundSegment.destination,
      departure_time: departureTime,
      arrival_time: arrivalTime,
    };
    
    const slices = [outboundSlice];
    
    if (wakanowItem.isRoundTrip || wakanowItem.returnFlight) {
      const returnFlight = wakanowItem.returnFlight;
      const returnDepartureTime = returnFlight?.departureTime;
      const returnArrivalTime = returnFlight?.arrivalTime;
      const returnDuration = returnFlight?.duration;
      
      const returnSegment = {
        departing_at: returnDepartureTime,
        arriving_at: returnArrivalTime,
        duration: returnDuration,
        origin: {
          iata_code: returnFlight?.departureAirport,
          name: returnFlight?.departureCity,
          city_name: returnFlight?.departureCity,
        },
        destination: {
          iata_code: returnFlight?.arrivalAirport,
          name: returnFlight?.arrivalCity,
          city_name: returnFlight?.arrivalCity,
        },
        operating_carrier: {
          name: returnFlight?.airlineName || wakanowItem.airlineName,
          iata_code: returnFlight?.airlineCode,
        },
        marketing_carrier_flight_number: returnFlight?.flightNumber,
        freeBaggage: returnFlight?.freeBaggage || wakanowItem.freeBaggage,
      };
      
      const returnSlice = {
        segments: [returnSegment],
        duration: returnDuration,
        origin: returnSegment.origin,
        destination: returnSegment.destination,
        departure_time: returnDepartureTime,
        arrival_time: returnArrivalTime,
      };
      
      slices.push(returnSlice);
    }
    
    console.log('✅ Built slices from direct data:', {
      slicesCount: slices.length,
      outboundOrigin: slices[0]?.origin?.iata_code,
      outboundDest: slices[0]?.destination?.iata_code,
    });
    
    return {
      ...currentItem,
      slices: slices,
      isRoundTrip: slices.length > 1,
      // ✅ Preserve custom_messages
      custom_messages: (currentItem as any).custom_messages || [],
    };
  }
  
  // Handle Duffel flights - ensure return direction is correct
  if (currentItem.provider === 'duffel' || currentItem.slices) {
    let slices = [...(currentItem.slices || [])];
    
    // Fix return direction for Duffel if needed
    if (slices.length > 1) {
      const outboundOrigin = slices[0]?.segments?.[0]?.origin?.iata_code;
      const outboundDest = slices[0]?.segments?.[slices[0].segments.length - 1]?.destination?.iata_code;
      const returnOrigin = slices[1]?.segments?.[0]?.origin?.iata_code;
      const returnDest = slices[1]?.segments?.[slices[1].segments.length - 1]?.destination?.iata_code;
      
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
      ...currentItem,
      slices: slices,
      isRoundTrip: slices.length > 1,
      // ✅ Preserve custom_messages for Duffel too
      custom_messages: (currentItem as any).custom_messages || [],
    };
  }
  
  // ✅ FINAL: Return currentItem with custom_messages preserved
  return {
    ...currentItem,
    custom_messages: (currentItem as any).custom_messages || [],
  };
}, [currentItem]);

// ✅ UPDATED: Handle book click - use cached data if available
const handleBookClick = async () => {
  try {
    let finalItem = { ...transformedItem };
    
    console.log('📦 handleBookClick - Flight data:', {
      id: transformedItem.id,
      provider: transformedItem.provider,
      isWakanow: transformedItem.isWakanow,
      hasSelectData: !!(transformedItem as any).selectData,
      hasWakanowData: !!transformedItem._wakanowData,
      hasFareRules: transformedItem.fare_rules?.length > 0,
      customMessagesCount: (transformedItem as any).custom_messages?.length || 0,
    });
    
    // ✅ If we already have Wakanow data, use it - NO API CALL
    if (transformedItem.isWakanow && transformedItem._wakanowData) {
      console.log('✅ Using cached Wakanow data - skipping API call!');
      
      // ✅ PRESERVE custom_messages from transformedItem
      const completeBooking = {
        ...transformedItem,
        id: transformedItem.id || `flight-${Date.now()}`,
        type: 'flight',
        status: 'Confirmed',
        // ✅ Ensure custom_messages is preserved
        custom_messages: (transformedItem as any).custom_messages || [],
      };
      
      selectItem(completeBooking);
      sessionStorage.setItem('selectedBooking', JSON.stringify(completeBooking));
      router.push('/booking/review');
      return;
    }
    
    // ✅ If we have fare_rules but no _wakanowData, still use it
    if (transformedItem.isWakanow && transformedItem.fare_rules?.length > 0) {
      console.log('✅ Using cached fare rules - skipping API call!');
      
      const completeBooking = {
        ...transformedItem,
        id: transformedItem.id || `flight-${Date.now()}`,
        type: 'flight',
        status: 'Confirmed',
        // ✅ Ensure custom_messages is preserved
        custom_messages: (transformedItem as any).custom_messages || [],
      };
      
      selectItem(completeBooking);
      sessionStorage.setItem('selectedBooking', JSON.stringify(completeBooking));
      router.push('/booking/review');
      return;
    }
    
    // ✅ Only call API if we don't have any cached data (should rarely happen)
    if (transformedItem.isWakanow && (transformedItem as any).selectData) {
      console.log('⚠️ No cached data, calling API (should not happen)');
      setIsConverting(true);
      
      const { selectWakanowFlight } = await import('@/lib/wakanow-api');
      const selectResult = await selectWakanowFlight(
        (transformedItem as any).selectData,
        'NGN'
      );
      
      const responseData = selectResult?.data;
      
      if (responseData) {
        console.log('✅ Received full Wakanow data:', {
          totalAmount: responseData.totalAmount,
          basePrice: responseData.basePrice,
          taxes: responseData.taxes,
          slices: responseData.flight_summary?.slices?.length,
          bookingId: responseData.booking_id,
          customMessagesCount: responseData.custom_messages?.length || 0,
        });
        
        const flightSummary = responseData.flight_summary;
        
        // ✅ Format custom_messages
        const rawMessages = responseData.custom_messages || [];
        let formattedCustomMessages: Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }> = [];

        if (Array.isArray(rawMessages) && rawMessages.length > 0) {
          if (typeof rawMessages[0] === 'object' && rawMessages[0] !== null && 'Title' in rawMessages[0]) {
            formattedCustomMessages = rawMessages as unknown as Array<{ Title: string; Message: string; SeverityLevel: 'High' | 'Medium' | 'Low' }>;
          } else if (typeof rawMessages[0] === 'string') {
            formattedCustomMessages = rawMessages.map((msg: string) => ({
              Title: 'Message',
              Message: msg,
              SeverityLevel: 'Medium' as const,
            }));
          }
        }
        
        // ✅ If we already have custom_messages from view details, merge them
        const existingCustomMessages = (transformedItem as any).custom_messages || [];
        const finalCustomMessages = formattedCustomMessages.length > 0 ? formattedCustomMessages : existingCustomMessages;
        
        finalItem = {
          ...transformedItem,
          
          // ✅ Pricing data from API
          totalAmount: responseData.totalAmount,
          basePrice: responseData.basePrice,
          markupAmount: responseData.markupAmount,
          markupPercentage: responseData.markupPercentage,
          serviceFee: responseData.serviceFee,
          serviceFeePercentage: responseData.serviceFeePercentage,
          taxes: responseData.taxes,
          taxPercentage: responseData.taxPercentage,
          currency: responseData.currency,
          priceBreakdown: responseData.priceBreakdown,
          
          // ✅ Flight summary from API
          slices: flightSummary?.slices || transformedItem.slices,
          isRoundTrip: flightSummary?.slices?.length > 1,
          flight_summary: flightSummary,
          
          // ✅ Terms, rules, booking info
          terms_and_conditions: responseData.terms_and_conditions?.TermsAndConditions?.length > 0 ? {
            TermsAndConditions: responseData.terms_and_conditions.TermsAndConditions,
            TermsAndConditionImportantNotice: responseData.terms_and_conditions.TermsAndConditionImportantNotice || ''
          } : null,
          fare_rules: responseData.fare_rules || [],
          penalty_rules: responseData.penalty_rules || [],
          bookingId: responseData.booking_id,
          isRefundable: flightSummary?.isRefundable || false,
          is_price_matched: responseData.is_price_matched,
          is_passport_required: responseData.is_passport_required,
          // ✅ ✅ ✅ PRESERVE CUSTOM MESSAGES
          custom_messages: finalCustomMessages,
          message: responseData.message,
          
          // ✅ Store raw data
          _wakanowData: responseData,
        };
        
        console.log('✅ Updated finalItem with Wakanow data:', {
          totalAmount: finalItem.totalAmount,
          currency: finalItem.currency,
          slicesCount: finalItem.slices?.length,
          bookingId: finalItem.bookingId,
          customMessagesCount: finalItem.custom_messages?.length || 0,
        });
      }
    }
    
    const completeBooking = {
      ...finalItem,
      id: finalItem.id || `flight-${Date.now()}`,
      type: 'flight',
      status: 'Confirmed'
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
      status: 'Confirmed'
    };
    selectItem(completeBooking);
    router.push('/booking/review');
  } finally {
    setIsConverting(false);
  }
};

  // Render a single flight segment
  const renderSegment = (segment: any, index: number, isLast: boolean) => {
    if (!segment) return null;
    
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
        {/* ✅ Show baggage info if available */}
        {segment.freeBaggage && segment.freeBaggage.BagCount > 0 && (
          <div className="mt-1 text-center">
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              ✈️ {segment.freeBaggage.BagCount} bag{segment.freeBaggage.BagCount > 1 ? 's' : ''} included
              {segment.freeBaggage.Weight > 0 && ` (${segment.freeBaggage.Weight} ${segment.freeBaggage.WeightUnit || 'kg'})`}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render a journey with stopovers
  const renderJourney = (slice: any, title: string, date: string) => {
    if (!slice) {
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

  // ✅ DEFINE isRoundTrip, outboundSlice, and returnSlice HERE (before using them)
  const isRoundTrip = transformedItem.slices && transformedItem.slices.length > 1;
  const outboundSlice = transformedItem.slices?.[0];
  const returnSlice = transformedItem.slices?.[1];

  // ✅ NOW define all the variables that depend on outboundSlice
  const firstSegment = outboundSlice?.segments?.[0] || {};
  const airlineName = transformedItem.airlineName || firstSegment?.operating_carrier?.name || transformedItem.provider || 'Airline';
  const airlineCode = transformedItem.airlineCode || firstSegment?.operating_carrier?.iata_code || '';
  const airlineLogo = transformedItem.airlineLogo;
  const flightNumber = transformedItem.flightNumber || firstSegment?.marketing_carrier_flight_number || '';
  const stopCount = outboundSlice?.segments?.length ? outboundSlice.segments.length - 1 : 0;
  const stopText = stopCount === 0 ? 'Direct' : `${stopCount} stop${stopCount > 1 ? 's' : ''}`;
  
  // ✅ Get baggage info from the first segment or from transformedItem
  const baggageInfo = outboundSlice?.segments?.[0]?.freeBaggage || transformedItem.freeBaggage;
  
  // ✅ Get refundable status
  const isRefundable = transformedItem.isRefundable || transformedItem.flight_summary?.isRefundable || false;
  
  // ✅ Get provider badge
  const providerBadge = transformedItem.isWakanow ? 'Wakanow' : '';

  // ✅ Get fare rules and penalty rules
  const fareRules = transformedItem.fare_rules || [];
  const penaltyRules = transformedItem.penalty_rules || [];

  // Log what we're showing
  console.log('📊 FlightDetails rendering with:', {
    hasBaggage: !!baggageInfo,
    baggageCount: baggageInfo?.BagCount || 0,
    isRefundable,
    fareRulesCount: fareRules.length,
    penaltyRulesCount: penaltyRules.length,
    providerBadge,
    // ✅ Log slice data for debugging
    slicesLength: transformedItem.slices?.length || 0,
    outboundOrigin: outboundSlice?.segments?.[0]?.origin?.iata_code,
    outboundDest: outboundSlice?.segments?.[0]?.destination?.iata_code,
    outboundDeparture: outboundSlice?.segments?.[0]?.departing_at,
    outboundArrival: outboundSlice?.segments?.[0]?.arriving_at,
    hasReturn: !!returnSlice,
  });

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
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stopText}</p>
                    
                    {/* ✅ Show provider badge for Wakanow */}
                    {providerBadge && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-[9px] font-bold text-[#33a8da] bg-[#33a8da]/10 px-2 py-0.5 rounded-full">
                          {providerBadge}
                        </span>
                      </>
                    )}
                    
                    {/* ✅ Show refundable badge */}
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

            {/* ✅ Baggage Info - Displayed prominently */}
            {baggageInfo && baggageInfo.BagCount > 0 && (
              <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="text-sm font-bold text-gray-700">
                  Baggage Allowance: <span className="text-green-700">{baggageInfo.BagCount} bag{baggageInfo.BagCount > 1 ? 's' : ''} included</span>
                  {baggageInfo.Weight > 0 && ` (${baggageInfo.Weight} ${baggageInfo.WeightUnit || 'kg'} per bag)`}
                </span>
              </div>
            )}

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

            {/* ✅ Fare Rules Section - Shows all fare rules from Wakanow */}
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

            {/* ✅ Penalty Rules Section - Shows all penalty rules from Wakanow */}
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