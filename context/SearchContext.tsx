'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { config } from '@/lib/config';
import { extractAirportCode, transformWakanowToDuffelFormat } from '@/lib/utils';
import type { SearchParams, SearchResult } from '@/lib/types';
import type { Airline } from '@/lib/duffel-airlines';
import api from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

// ─── Mock fallback data (only used when API fails) ─────────────────────────────
const MOCK: Record<string, SearchResult[]> = {
  flights: [
    { id: 'f-1', provider: 'Air Peace', title: 'Air Peace P47121', subtitle: 'Lagos (LOS) → Abuja (ABV)', price: '£85', time: '08:00 AM', duration: '1h 15m', type: 'flights', image: 'https://logos-world.net/wp-content/uploads/2023/03/Air-Peace-Logo.png' },
    { id: 'f-2', provider: 'Ibom Air', title: 'Ibom Air QI0320', subtitle: 'Lagos (LOS) → Abuja (ABV)', price: '£92', time: '10:30 AM', duration: '1h 10m', type: 'flights', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Ibom_Air_logo.png/1200px-Ibom_Air_logo.png' },
  ],
  hotels: [
    { id: 'h-1', provider: 'Amadeus Premium', title: 'The Wheatbaker Lagos', subtitle: 'Ikoyi, Lagos', price: '£145/night', rating: 4.9, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800', type: 'hotels', amenities: ['Free Wi-Fi', 'Swimming Pool', 'Spa'] },
  ],
  'car-rentals': [
    { id: 'c-1', provider: 'Hertz Elite', title: 'Mercedes-Benz E-Class', subtitle: 'Lagos Int. Airport', price: '£85/day', rating: 4.8, image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800', type: 'car-rentals', amenities: ['Automatic', 'AC'], features: ['5 Seats', 'Luxury'] },
  ],
};

interface SearchContextType {
  searchParams: SearchParams | null;
  searchResults: SearchResult[];
  selectedItem: SearchResult | null;
  isSearching: boolean;
  search: (params: SearchParams) => Promise<void>;
  selectItem: (item: SearchResult) => void;
  clearSearch: () => void;
  persistSelectionForReturn: () => void;
  airlines: Airline[];
  isLoadingAirlines: boolean;
  fetchAirlines: () => Promise<void>;
  searchError: string | null;
  searchCompleted: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const BOOKING_REVIEW_SELECTION_KEY = 'ebt_booking_review_selection';

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isLoadingAirlines, setIsLoadingAirlines] = useState(false);

  // Get currency and conversion functions from LanguageContext
  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(BOOKING_REVIEW_SELECTION_KEY) : null;
      if (!raw) return;
      const data = JSON.parse(raw) as { selectedItem: SearchResult | null; searchParams: SearchParams | null };
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
      if (data.selectedItem) setSelectedItem(data.selectedItem);
      if (data.searchParams) setSearchParams(data.searchParams);
    } catch {
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
    }
  }, []);

  const fetchAirlines = useCallback(async () => {
    console.log('⚠️ Airlines endpoint not available - skipping');
    return;
  }, []);

  useEffect(() => {
    if (searchParams?.type === 'flights') {
      fetchAirlines();
    }
  }, [searchParams?.type, fetchAirlines]);

  // Ref that always holds the latest search dispatch so the stable `search` callback
  // doesn't capture stale closures over currency/conversion helpers.
  const searchDispatchRef = React.useRef<(params: SearchParams) => Promise<void>>(async () => {});

  // Helper function to calculate total service fee (markup + conversion fee + taxes)
  const calculateTotalServiceFee = (markupAmount: number, conversionFee: number, taxes: number): number => {
    return markupAmount + conversionFee + taxes;
  };

  // Helper function to format price in user's currency
  const formatPriceInUserCurrency = useCallback(async (amount: number, fromCurrency: string = 'NGN'): Promise<string> => {
    try {
      let finalAmount = amount;
      if (fromCurrency !== currency.code) {
        // Convert to user's currency first
        finalAmount = await convertPrice(amount, fromCurrency);
      }
      // ✅ FIX: pass NO fromCurrency — finalAmount is already in user's currency (currency.code)
      // Previously passing fromCurrency here caused formatPrice to convert AGAIN (double-conversion)
      return formatPrice(finalAmount);
    } catch (error) {
      console.error('Failed to format price in user currency:', error);
      const { CURRENCY_SYMBOLS } = await import('@/lib/currency-service');
      const symbol = CURRENCY_SYMBOLS[fromCurrency] || fromCurrency;
      return `${symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })} (Rate Unavailable)`;
    }
  }, [currency.code, convertPrice, formatPrice]);

  // Helper function to get display price in user's currency as number
  const getDisplayPriceInUserCurrency = useCallback(async (amount: number, fromCurrency: string = 'NGN'): Promise<number> => {
    try {
      if (fromCurrency === currency.code) return amount;
      return await convertPrice(amount, fromCurrency);
    } catch (error) {
      console.error('Failed to convert price:', error);
      return amount; // Return original amount as fallback
    }
  }, [currency.code, convertPrice]);

  // ==================== CAR RENTAL SEARCH WITH MERGED SERVICE FEE ====================
  const searchCars = async (params: SearchParams) => {
    try {
      if (!params.pickupLocationCode || !params.dropoffLocationCode ||
        !params.pickupDateTime || !params.dropoffDateTime) {
        console.error('❌ Missing required car rental parameters');
        setSearchResults([]);
        setSearchError('Missing location or date information. Please try again.');
        return;
      }

      let passengerCount = 2;
      if (params.passengers) {
        if (typeof params.passengers === 'number') {
          passengerCount = params.passengers;
        } else if (typeof params.passengers === 'object') {
          passengerCount = (params.passengers.adults || 0) +
            (params.passengers.children || 0) +
            (params.passengers.infants || 0);
          passengerCount = Math.max(1, passengerCount);
        }
      }

      const carParams = {
        pickupLocationCode: params.pickupLocationCode,
        dropoffLocationCode: params.dropoffLocationCode,
        pickupDateTime: params.pickupDateTime,
        dropoffDateTime: params.dropoffDateTime,
        passengers: passengerCount,
        currency: 'NGN', // Always request in NGN
      };

      const response = await api.carApi.searchCarRentals(carParams);

      if (response.success && response.data?.data) {
        const processedResults = await Promise.all(response.data.data.map(async (item: any) => {
          const startDate = new Date(item.start?.dateTime);
          const endDate = new Date(item.end?.dateTime);
          const hoursDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          let rentalType = 'transfer';
          let displayType = 'Transfer';

          if (daysDiff >= 1) {
            rentalType = 'multi-day';
            displayType = 'Multi-Day Rental';
          } else if (hoursDiff > 4) {
            rentalType = 'long-transfer';
            displayType = 'Long Transfer';
          }

          // Extract pricing components (all in NGN from API)
          const basePrice = parseFloat(item.base_price || item.original_price || item.price?.base || '0');
          const markupAmount = parseFloat(item.markup_amount) || 0;
          const conversionFee = parseFloat(item.conversion_fee) || 0;
          const taxes = 0;
          const serviceFeeFromBackend = parseFloat(item.service_fee) || 0;
          
          // Calculate total service fee (combine all fees)
          const totalServiceFee = calculateTotalServiceFee(markupAmount, conversionFee, taxes);
          const finalServiceFee = serviceFeeFromBackend > 0 ? serviceFeeFromBackend : totalServiceFee;
          const finalPriceNGN = parseFloat(item.final_price || item.price?.total || item.converted?.monetaryAmount || '0');
          
          // Calculate service fee percentage
          let serviceFeePercentage = 0;
          if (basePrice > 0 && finalServiceFee > 0) {
            serviceFeePercentage = (finalServiceFee / basePrice) * 100;
          }

          // Get display price in user's currency
          const displayPriceInUserCurrency = await getDisplayPriceInUserCurrency(finalPriceNGN, 'NGN');
          const formattedDisplayPrice = await formatPriceInUserCurrency(finalPriceNGN, 'NGN');

          console.log(`🚗 Car rental - Service Fee Breakdown:`, {
            vehicle: item.vehicle?.description,
            basePriceNGN: `₦${basePrice}`,
            markupAmountNGN: `₦${markupAmount}`,
            conversionFeeNGN: `₦${conversionFee}`,
            totalServiceFeeNGN: `₦${finalServiceFee}`,
            serviceFeePercentage: `${serviceFeePercentage}%`,
            finalPriceNGN: `₦${finalPriceNGN}`,
            displayPriceInUserCurrency: formattedDisplayPrice,
          });

          return {
            ...item,
            type: 'car-rentals' as const,
            rentalType,
            displayType,
            rentalDays: daysDiff,
            rentalHours: hoursDiff,
            requestedDays: daysDiff,
            isMultiDay: daysDiff >= 1,
            isTransfer: daysDiff < 1,
            // ALL PRICES STORED IN NGN
            original_amount: basePrice.toString(),
            original_currency: 'NGN',
            markup_amount: markupAmount.toString(),
            conversion_fee: conversionFee.toString(),
            taxes: taxes.toString(),
            service_fee: finalServiceFee.toString(),
            service_fee_percentage: serviceFeePercentage,
            final_amount: finalPriceNGN.toString(),
            currency: 'NGN',
            rawPrice: finalPriceNGN,
            // Display price in user's currency
            price: formattedDisplayPrice,
            totalPrice: formattedDisplayPrice,
            displayPriceRaw: displayPriceInUserCurrency,
          };
        }));

        setSearchResults(processedResults);
        console.log(`✅ Processed ${processedResults.length} car rentals with merged service fee`);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Car search failed:', error);
      setSearchResults([]);
      setSearchError('Failed to search car rentals. Please try again.');
    }
  };

  // ==================== HOTEL SEARCH WITH MERGED SERVICE FEE ====================
  const searchHotels = async (params: SearchParams) => {
    try {
      const searchParamsTravellers = (params.travellers as any);
      const hotelParams = {
        cityCode: params.cityCode || 'LOS',
        checkInDate: params.checkInDate || new Date().toISOString().split('T')[0],
        checkOutDate: params.checkOutDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        adults: (typeof searchParamsTravellers === 'object' && searchParamsTravellers !== null) ? searchParamsTravellers.adults : (params.adults || 1),
        children: (typeof searchParamsTravellers === 'object' && searchParamsTravellers !== null) ? searchParamsTravellers.children : 0,
        roomQuantity: params.rooms || 1,
        currency: 'NGN', // Always request in NGN
      };

      const provider = params.provider || 'hotelbeds';
      const result = await api.hotelApi.searchAndTransformHotels(hotelParams, params.location || 'Lagos', provider as any);

      if (result.success && result.results) {
        const hotelsWithMarkup = await Promise.all(result.results.map(async (hotel: any) => {
          const offers = hotel.offers || [];
          
          const processedOffers = await Promise.all(offers.map(async (offer: any) => {
            const priceData = offer.price || {};
            // All prices in NGN from API
            const basePrice = parseFloat(priceData.base || '0');
            const totalPriceNGN = parseFloat(priceData.total || '0');
            const markupAmount = parseFloat(priceData.markup_amount || '0');
            const conversionFee = parseFloat(priceData.conversionFee || '0');
            const taxes = 0;
            
            // Calculate total service fee
            const totalServiceFee = calculateTotalServiceFee(markupAmount, conversionFee, taxes);
            
            // Calculate service fee percentage
            let serviceFeePercentage = 0;
            if (basePrice > 0 && totalServiceFee > 0) {
              serviceFeePercentage = (totalServiceFee / basePrice) * 100;
            }
            
            // Get display price in user's currency
            const displayPriceInUserCurrency = await getDisplayPriceInUserCurrency(totalPriceNGN, 'NGN');
            const formattedDisplayPrice = await formatPriceInUserCurrency(totalPriceNGN, 'NGN');
            
            console.log(`🏨 Hotel offer - Service Fee Breakdown:`, {
              hotel: hotel.hotel?.name,
              room: offer.room?.type,
              basePriceNGN: `₦${basePrice}`,
              markupAmountNGN: `₦${markupAmount}`,
              conversionFeeNGN: `₦${conversionFee}`,
              totalServiceFeeNGN: `₦${totalServiceFee}`,
              serviceFeePercentage: `${serviceFeePercentage}%`,
              totalPriceNGN: `₦${totalPriceNGN}`,
              displayPrice: formattedDisplayPrice,
            });
            
            return {
              ...offer,
              // ALL PRICES STORED IN NGN
              original_amount: basePrice.toString(),
              original_currency: 'NGN',
              markup_amount: markupAmount.toString(),
              conversion_fee: conversionFee.toString(),
              taxes: taxes.toString(),
              service_fee: totalServiceFee.toString(),
              service_fee_percentage: serviceFeePercentage,
              final_amount: totalPriceNGN.toString(),
              currency: 'NGN',
              rawPrice: totalPriceNGN,
              // Display price in user's currency
              price: formattedDisplayPrice,
              totalPriceFormatted: formattedDisplayPrice,
              displayPriceRaw: displayPriceInUserCurrency,
            };
          }));
          
          const firstOffer = processedOffers[0] || {};
          
          return {
            ...hotel,
            offers: processedOffers,
            // ALL PRICES STORED IN NGN
            original_amount: firstOffer.original_amount,
            original_currency: 'NGN',
            markup_amount: firstOffer.markup_amount,
            conversion_fee: firstOffer.conversion_fee,
            taxes: firstOffer.taxes,
            service_fee: firstOffer.service_fee,
            service_fee_percentage: firstOffer.service_fee_percentage,
            final_amount: firstOffer.final_amount,
            currency: 'NGN',
            rawPrice: firstOffer.rawPrice,
            // Display price in user's currency
            price: firstOffer.price,
            totalPrice: firstOffer.totalPriceFormatted,
            displayPriceRaw: firstOffer.displayPriceRaw,
          };
        }));
        
        setSearchResults(hotelsWithMarkup);
        console.log(`✅ Processed ${hotelsWithMarkup.length} hotels with merged service fee`);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Hotel search failed:', err);
      setSearchResults([]);
      throw new Error('Hotel search failed');
    }
  };

  const formatDateForWakanow = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // ==================== FLIGHT TRANSFORMATION WITH PROPER CURRENCY ====================
  const transformWakanowOffers = (
    offers: any[], 
    returnDate?: string, 
    cabinClass: string = 'economy', 
    isDomesticRoute: boolean = false,
    rates: Record<string, number> = { NGN: 1 }
  ): SearchResult[] => {
    if (!offers || offers.length === 0) return [];
    
    // Service fee percentage for Wakanow flights
    const SERVICE_FEE_PERCENTAGE = 10; // 10% service fee
    
    const results: SearchResult[] = [];
    
    for (let offer of offers) {
      // ✅ Handle raw Wakanow format by transforming it to the expected Duffel-like format
      if (!offer.slices && (offer.FlightLegs || offer.flightLegs || offer.legs || offer.DepartureCode)) {
        console.log('🔄 Normalizing raw Wakanow offer to Duffel format');
        offer = transformWakanowToDuffelFormat(offer);
      }

      console.log('💰 Raw Wakanow offer (NGN base):', {
        id: offer.id,
        hasSlices: !!offer.slices,
        slicesCount: offer.slices?.length,
        priceObj: offer.Price || offer.price,
        original_amount: offer.original_amount,
      });
      
      const slices = offer.slices || [];
      const outboundSlice = slices[0];
      const returnSlice = slices.length > 1 ? slices[1] : null;
      
      if (!outboundSlice) continue;
      
      const outboundSegments = outboundSlice.segments || [];
      const firstOutboundSegment = outboundSegments[0] || {};
      const lastOutboundSegment = outboundSegments[outboundSegments.length - 1] || firstOutboundSegment;
      
      const outboundDepartureTime = outboundSlice.departure_time || firstOutboundSegment.start_time || '';
      const outboundArrivalTime = outboundSlice.arrival_time || lastOutboundSegment.end_time || '';
      
      const outboundOrigin = outboundSlice.origin?.iata_code || outboundSlice.origin || firstOutboundSegment.departure_code || '';
      const outboundDestination = outboundSlice.destination?.iata_code || outboundSlice.destination || lastOutboundSegment.destination_code || '';
      
      const outboundDuration = outboundSlice.duration || '';
      const outboundStopCount = outboundSlice.stops !== undefined ? outboundSlice.stops : (outboundSegments.length - 1);
      
      const airline = outboundSlice.airline || offer.airline || {};
      const airlineName = airline.name || offer.marketing_carrier_name || '';
      const airlineCode = airline.code || offer.marketing_carrier || '';
      const airlineLogo = airline.logo_url || `https://images.wakanow.com/Images/flight-logos/${airlineCode}.gif`;
      
      // ========== EXTRACT PRICE COMPONENTS (ALL IN NGN) ==========
      // Try multiple possible price fields to be robust
      const rawOriginalAmount = 
        offer.original_amount || 
        offer.Price?.Amount || 
        offer.price?.amount || 
        offer.TotalAmount || 
        '0';
        
      const originalAmountNGN = parseFloat(rawOriginalAmount.toString());
      const baseAmountNGN = parseFloat((offer.base_amount || originalAmountNGN).toString());
      
      // Calculate service fee on the original NGN amount (10%)
      const serviceFeeNGN = originalAmountNGN * (SERVICE_FEE_PERCENTAGE / 100);
      
      // Conversion fee from backend (in NGN)
      const conversionFeeNGN = parseFloat(offer.conversion_fee) || 0;
      
      // Total service fee (our markup + conversion fee)
      const totalServiceFeeNGN = serviceFeeNGN + conversionFeeNGN;
      
      // Final total in NGN
      const finalAmountNGN = originalAmountNGN + totalServiceFeeNGN;
      
      // Get display price in user's currency (Synchronous using pre-fetched rates)
      const userCurrencyCode = currency.code;
      const rateToUserCurrency = rates[userCurrencyCode] || 0;
      
      let displayPriceInUserCurrency = finalAmountNGN;
      let formattedDisplayPrice = "";
      
      if (rateToUserCurrency > 0) {
        displayPriceInUserCurrency = finalAmountNGN * rateToUserCurrency;
        const symbol = CURRENCY_SYMBOLS[userCurrencyCode] || userCurrencyCode;
        // Round NGN to whole numbers
        const roundedAmount = userCurrencyCode === 'NGN' ? Math.round(displayPriceInUserCurrency) : displayPriceInUserCurrency;
        formattedDisplayPrice = `${symbol}${roundedAmount.toLocaleString('en-GB', { 
          minimumFractionDigits: userCurrencyCode === 'NGN' ? 0 : 2,
          maximumFractionDigits: userCurrencyCode === 'NGN' ? 0 : 2 
        })}`;
      } else {
        const symbol = CURRENCY_SYMBOLS['NGN'] || '₦';
        formattedDisplayPrice = `${symbol}${Math.round(finalAmountNGN).toLocaleString()} (Rate Unavailable)`;
      }
      
      console.log(`✈️ Flight (${airlineName}) - Price Breakdown (NGN base):`, {
        originalAmountNGN: `₦${originalAmountNGN.toFixed(2)}`,
        serviceFeePercentage: `${SERVICE_FEE_PERCENTAGE}%`,
        serviceFeeNGN: `₦${serviceFeeNGN.toFixed(2)}`,
        conversionFeeNGN: `₦${conversionFeeNGN.toFixed(2)}`,
        totalServiceFeeNGN: `₦${totalServiceFeeNGN.toFixed(2)}`,
        finalAmountNGN: `₦${finalAmountNGN.toFixed(2)}`,
        displayPriceInUserCurrency: formattedDisplayPrice,
      });
      
      let durationDisplay = outboundDuration;
      if (durationDisplay && durationDisplay.includes(':')) {
        const parts = durationDisplay.split(':');
        if (parts.length === 3) {
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]);
          if (hours > 0 && minutes > 0) durationDisplay = `${hours}h ${minutes}m`;
          else if (hours > 0) durationDisplay = `${hours}h`;
          else if (minutes > 0) durationDisplay = `${minutes}m`;
        }
      }
      
      let returnFlightData = null;
      
      if (returnSlice) {
        const returnSegments = returnSlice.segments || [];
        const firstReturnSegment = returnSegments[0] || {};
        const lastReturnSegment = returnSegments[returnSegments.length - 1] || firstReturnSegment;
        
        const returnFlightNumber = firstReturnSegment.flight_number || '';
        const returnAirline = returnSlice.airline || {};
        const returnAirlineName = returnAirline.name || offer.marketing_carrier_name || airlineName;
        
        let returnDurationDisplay = returnSlice.duration || '';
        if (returnDurationDisplay && returnDurationDisplay.includes(':')) {
          const parts = returnDurationDisplay.split(':');
          if (parts.length === 3) {
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            if (hours > 0 && minutes > 0) returnDurationDisplay = `${hours}h ${minutes}m`;
            else if (hours > 0) returnDurationDisplay = `${hours}h`;
            else if (minutes > 0) returnDurationDisplay = `${minutes}m`;
          }
        }
        
        returnFlightData = {
          departureAirport: returnSlice.origin?.iata_code || returnSlice.origin || '',
          arrivalAirport: returnSlice.destination?.iata_code || returnSlice.destination || '',
          departureCity: returnSlice.origin?.name || '',
          arrivalCity: returnSlice.destination?.name || '',
          departureTime: returnSlice.departure_time || firstReturnSegment.start_time || '',
          arrivalTime: returnSlice.arrival_time || lastReturnSegment.end_time || '',
          flightNumber: returnFlightNumber,
          airlineName: returnAirlineName,
          duration: returnDurationDisplay,
          stopCount: returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1),
          stopText: (returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1)) === 0 ? 'Direct' : 
                    (returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1)) === 1 ? '1 Stop' : `${returnSlice.stops !== undefined ? returnSlice.stops : (returnSegments.length - 1)} Stops`,
        };
      }
      
      const freeBaggage = outboundSlice.free_baggage || {};
      const baggageCount = freeBaggage.BagCount || 0;
      const baggageWeight = freeBaggage.Weight || 0;
      const baggageUnit = freeBaggage.WeightUnit || 'kg';
      
      const formattedTime = outboundDepartureTime ? new Date(outboundDepartureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
      
      const flightResult: SearchResult = {
        id: offer.id || `wakanow-${results.length}`,
        provider: 'wakanow',
        title: `${airlineName} ${firstOutboundSegment.flight_number || ''}`.trim() || 'Flight',
        subtitle: `${outboundOrigin} → ${outboundDestination}`,
        price: formattedDisplayPrice,
        totalPrice: formattedDisplayPrice,
        time: formattedTime,
        duration: durationDisplay || '--:--',
        type: 'flights',
        image: airlineLogo,
        isRefundable: offer.is_refundable || false,
        baggage: `${baggageCount} bag${baggageCount !== 1 ? 's' : ''}${baggageWeight ? ` (${baggageWeight}${baggageUnit})` : ''}`,
        airlineCode: airlineCode,
        flightNumber: firstOutboundSegment.flight_number || '',
        departureAirport: outboundOrigin,
        arrivalAirport: outboundDestination,
        departureCity: outboundSlice.origin?.name || '',
        arrivalCity: outboundSlice.destination?.name || '',
        departureTime: outboundDepartureTime,
        arrivalTime: outboundArrivalTime,
        airlineName: airlineName || 'Airline',
        airlineLogo: airlineLogo,
        stopCount: outboundStopCount,
        stopText: outboundStopCount === 0 ? 'Direct' : outboundStopCount === 1 ? '1 Stop' : `${outboundStopCount} Stops`,
        cabin: cabinClass,
        displayPrice: formattedDisplayPrice,
        rawPrice: displayPriceInUserCurrency,
        // ✅ ALL PRICES STORED IN NGN FOR CONSISTENCY
        original_amount: originalAmountNGN.toString(),
        original_currency: 'NGN',
        markup_amount: serviceFeeNGN.toString(),
        markup_percentage: SERVICE_FEE_PERCENTAGE,
        conversion_fee: conversionFeeNGN.toString(),
        conversion_fee_percentage: offer.conversion_fee_percentage || 0,
        taxes: '0',
        service_fee: totalServiceFeeNGN.toString(),
        service_fee_percentage: SERVICE_FEE_PERCENTAGE,
        final_amount: finalAmountNGN.toString(),
        currency: 'NGN',  // Always NGN for internal storage
        isRoundTrip: !!returnSlice,
        rating: 4,
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [
          outboundStopCount === 0 ? 'Direct' : `${outboundStopCount} stop${outboundStopCount > 1 ? 's' : ''}`,
          durationDisplay || '--:--',
          cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
        ],
        isWakanow: true,
        isWakanowDomestic: isDomesticRoute,
        selectData: offer.select_data || '',
        slices: slices,
        returnFlight: returnFlightData,
        fareRules: offer.fare_rules || [],
        penaltyRules: offer.penalty_rules || null,
        connection_code: offer.connection_code,
      };
      
      console.log(`✅ Created flight result (NGN base):`, {
        id: flightResult.id,
        original_amount_NGN: flightResult.original_amount,
        markup_amount_NGN: flightResult.markup_amount,
        conversion_fee_NGN: flightResult.conversion_fee,
        service_fee_NGN: flightResult.service_fee,
        final_amount_NGN: flightResult.final_amount,
        display_price: flightResult.price,
        display_currency: currency.code
      });
      
      results.push(flightResult);
    }
    
    console.log(`✅ Transformed ${results.length} Wakanow flights with NGN base`);
    return results;
  };

  const transformDuffelOffers = (
    offers: any[], 
    cabinClass: string = 'economy', 
    offerRequestId: string,
    rates: Record<string, number> = { NGN: 1 }
  ): SearchResult[] => {
    const results: SearchResult[] = [];
    
    for (const offer of offers) {
      const slices = offer.slices || [];
      const outboundSlice = slices[0] || {};
      const returnSlice = slices.length > 1 ? slices[1] : null;
      
      const outboundSegments = outboundSlice.segments || [];
      const firstOutboundSegment = outboundSegments[0] || {};
      const lastOutboundSegment = outboundSegments[outboundSegments.length - 1] || firstOutboundSegment;
      
      const ownerAirline = offer.owner || {};
      const operatingCarrier = firstOutboundSegment.operating_carrier || outboundSlice.operating_carrier || {};
      const airline = ownerAirline.id ? ownerAirline : operatingCarrier;
      const airlineName = airline.name || ownerAirline.name || operatingCarrier.name || 'Unknown Airline';
      const airlineCode = airline.iata_code || airline.iataCode || operatingCarrier.iata_code || '';
      const airlineLogo = airline.logo_symbol_url || airline.logo_url || '';
      
      const flightNumber = firstOutboundSegment.marketing_carrier_flight_number || 
                           firstOutboundSegment.flight_number || 
                           firstOutboundSegment.number || '';
      
      const outboundDepartureAirport = firstOutboundSegment.origin?.iata_code || 
                                       firstOutboundSegment.departure?.iataCode || 
                                       outboundSlice.origin?.iata_code || '';
      const outboundArrivalAirport = lastOutboundSegment.destination?.iata_code || 
                                     lastOutboundSegment.arrival?.iataCode || 
                                     outboundSlice.destination?.iata_code || '';
      
      const outboundDepartureTime = firstOutboundSegment.departing_at || 
                                    firstOutboundSegment.departure?.at || 
                                    outboundSlice.departure_time || '';
      const outboundArrivalTime = lastOutboundSegment.arriving_at || 
                                  lastOutboundSegment.arrival?.at || 
                                  outboundSlice.arrival_time || '';
      
      let totalDurMin = 0;
      if (outboundSlice.duration) {
        const match = outboundSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        const hours = match?.[1] ? parseInt(match[1]) : 0;
        const minutes = match?.[2] ? parseInt(match[2]) : 0;
        totalDurMin = hours * 60 + minutes;
      }
      const h = Math.floor(totalDurMin / 60);
      const m = totalDurMin % 60;
      const durationDisplay = `${h}h ${String(m).padStart(2, '0')}m`;
      
      // Extract pricing components (Duffel returns in GBP typically)
      const basePriceOriginal = parseFloat(offer.original_amount || offer.total_amount || '0');
      const originalCurrency = offer.original_currency || offer.total_currency || 'GBP';
      const markupAmountOriginal = parseFloat(offer.markup_amount) || 0;
      const conversionFeeOriginal = parseFloat(offer.conversion_fee) || 0;
      const taxesOriginal = parseFloat(offer.tax_amount) || 0;
      const finalPriceOriginal = parseFloat(offer.final_amount) || (basePriceOriginal + markupAmountOriginal + conversionFeeOriginal + taxesOriginal);
      
      // Convert ALL prices to NGN for consistent internal storage
      let basePriceNGN = basePriceOriginal;
      let markupAmountNGN = markupAmountOriginal;
      let conversionFeeNGN = conversionFeeOriginal;
      let taxesNGN = taxesOriginal;
      let finalPriceNGN = finalPriceOriginal;
      let originalCurrencyForInternalStorage = 'NGN';
      
      if (originalCurrency !== 'NGN') {
        const rateToNGN = rates['NGN'] || 0; // rates are based on fromCurrency
        if (rateToNGN > 0) {
          basePriceNGN = basePriceOriginal * rateToNGN;
          markupAmountNGN = markupAmountOriginal * rateToNGN;
          conversionFeeNGN = conversionFeeOriginal * rateToNGN;
          taxesNGN = taxesOriginal * rateToNGN;
          finalPriceNGN = finalPriceOriginal * rateToNGN;
        } else {
          console.error('Failed to convert Duffel prices to NGN: Rate Unavailable');
          originalCurrencyForInternalStorage = originalCurrency;
        }
      }
      
      // Final total in NGN
      const finalAmountNGN = finalPriceNGN;
      
      // Get display price in user's currency (Synchronous using pre-fetched rates)
      const userCurrencyCode = currency.code;
      const rateNGNtoUser = rates[`NGN_${userCurrencyCode}`] || 0;
      
      let displayPriceInUserCurrency = finalAmountNGN;
      let formattedDisplayPrice = "";
      
      if (originalCurrencyForInternalStorage === 'NGN' && rateNGNtoUser > 0) {
        displayPriceInUserCurrency = finalAmountNGN * rateNGNtoUser;
        const symbol = CURRENCY_SYMBOLS[userCurrencyCode] || userCurrencyCode;
        // Round NGN to whole numbers
        const roundedAmount = userCurrencyCode === 'NGN' ? Math.round(displayPriceInUserCurrency) : displayPriceInUserCurrency;
        formattedDisplayPrice = `${symbol}${roundedAmount.toLocaleString('en-GB', { 
          minimumFractionDigits: userCurrencyCode === 'NGN' ? 0 : 2,
          maximumFractionDigits: userCurrencyCode === 'NGN' ? 0 : 2 
        })}`;
      } else {
        const symbol = CURRENCY_SYMBOLS[originalCurrencyForInternalStorage] || originalCurrencyForInternalStorage;
        formattedDisplayPrice = `${symbol}${Math.round(finalPriceOriginal).toLocaleString()} (Rate Unavailable)`;
      }
      
      console.log(`✈️ Duffel Flight (${airlineName}) - Converted to NGN:`, {
        originalCurrency,
        basePriceOriginal: `${originalCurrency} ${basePriceOriginal}`,
        basePriceNGN: `₦${basePriceNGN.toFixed(2)}`,
        finalPriceNGN: `₦${finalPriceNGN.toFixed(2)}`,
        displayPrice: formattedDisplayPrice,
      });
      
      const outboundStops = Math.max(0, (outboundSegments.length || 1) - 1);
      
      const formatTimeFn = (timeStr: string): string => {
        if (!timeStr) return '--:--';
        try {
          return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch {
          return '--:--';
        }
      };
      
      let returnFlightData = null;
      
      if (returnSlice) {
        const returnSegments = returnSlice.segments || [];
        const firstReturnSegment = returnSegments[0] || {};
        const lastReturnSegment = returnSegments[returnSegments.length - 1] || firstReturnSegment;
        
        const returnFlightNumber = firstReturnSegment.marketing_carrier_flight_number || 
                                   firstReturnSegment.flight_number || 
                                   firstReturnSegment.number || '';
        
        const returnOperatingCarrier = firstReturnSegment.operating_carrier || returnSlice.operating_carrier || {};
        const returnAirlineName = returnOperatingCarrier.name || airlineName;
        const returnAirlineCode = returnOperatingCarrier.iata_code || airlineCode;
        
        let returnDurMin = 0;
        if (returnSlice.duration) {
          const match = returnSlice.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
          const hours = match?.[1] ? parseInt(match[1]) : 0;
          const minutes = match?.[2] ? parseInt(match[2]) : 0;
          returnDurMin = hours * 60 + minutes;
        }
        const returnH = Math.floor(returnDurMin / 60);
        const returnM = returnDurMin % 60;
        
        returnFlightData = {
          departureAirport: firstReturnSegment.origin?.iata_code || firstReturnSegment.departure?.iataCode || '',
          arrivalAirport: lastReturnSegment.destination?.iata_code || lastReturnSegment.arrival?.iataCode || '',
          departureCity: firstReturnSegment.origin?.city_name || firstReturnSegment.origin?.city?.name || '',
          arrivalCity: lastReturnSegment.destination?.city_name || lastReturnSegment.destination?.city?.name || '',
          departureTime: firstReturnSegment.departing_at || firstReturnSegment.departure?.at || '',
          arrivalTime: lastReturnSegment.arriving_at || lastReturnSegment.arrival?.at || '',
          flightNumber: returnFlightNumber,
          airlineName: returnAirlineName,
          airlineCode: returnAirlineCode,
          duration: returnSlice.duration,
          durationFormatted: `${returnH}h ${String(returnM).padStart(2, '0')}m`,
          stopCount: Math.max(0, (returnSegments.length || 1) - 1),
          stopText: Math.max(0, (returnSegments.length || 1) - 1) === 0 ? 'Direct' : 
                    Math.max(0, (returnSegments.length || 1) - 1) === 1 ? '1 Stop' : `${Math.max(0, (returnSegments.length || 1) - 1)} Stops`,
        };
      }
      
      const flightResult: SearchResult = {
        id: offer.id ?? `duffel-${results.length}`,
        provider: 'duffel',
        title: `${airlineName} ${flightNumber}`.trim() || 'Flight',
        subtitle: `${outboundDepartureAirport} → ${outboundArrivalAirport}`,
        price: formattedDisplayPrice,
        totalPrice: formattedDisplayPrice,
        time: formatTimeFn(outboundDepartureTime),
        duration: durationDisplay,
        type: 'flights' as const,
        image: airlineLogo || `https://ui-avatars.com/api/?name=${airlineCode || airlineName}&background=33a8da&color=fff&length=2`,
        isRefundable: false,
        baggage: 'Check airline policy',
        airlineCode: airlineCode,
        flightNumber: flightNumber,
        departureAirport: outboundDepartureAirport,
        arrivalAirport: outboundArrivalAirport,
        departureCity: firstOutboundSegment.origin?.city_name || outboundSlice.origin?.city_name || '',
        arrivalCity: lastOutboundSegment.destination?.city_name || outboundSlice.destination?.city_name || '',
        departureTime: outboundDepartureTime,
        arrivalTime: outboundArrivalTime,
        airlineName: airlineName,
        airlineLogo: airlineLogo,
        stopCount: outboundStops,
        stopText: outboundStops === 0 ? 'Direct' : outboundStops === 1 ? '1 Stop' : `${outboundStops} Stops`,
        cabin: cabinClass,
        displayPrice: formattedDisplayPrice,
        rawPrice: displayPriceInUserCurrency,
        // ✅ ALL PRICES STORED IN NGN FOR CONSISTENCY
        original_amount: basePriceNGN.toString(),
        original_currency: 'NGN',
        markup_amount: markupAmountNGN.toString(),
        markup_percentage: offer.markup_percentage || 0,
        conversion_fee: conversionFeeNGN.toString(),
        conversion_fee_percentage: offer.conversion_fee_percentage || 0,
        taxes: taxesNGN.toString(),
        service_fee: totalServiceFeeNGN.toString(),
        service_fee_percentage: serviceFeePercentage,
        final_amount: finalPriceNGN.toString(),
        currency: originalCurrencyForInternalStorage,  // Store original currency if conversion failed
        isRoundTrip: !!returnSlice,
        rating: 4,
        amenities: ['Seat Selection', 'Cabin Baggage'],
        features: [
          outboundStops === 0 ? 'Direct' : `${outboundStops} stop${outboundStops > 1 ? 's' : ''}`,
          durationDisplay,
          cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)
        ],
        isWakanow: false,
        isWakanowDomestic: false,
        selectData: offer.id,
        slices: slices,
        returnFlight: returnFlightData,
        fareRules: [],
        penaltyRules: null,
        connection_code: '',
        offer_request_id: offerRequestId,
        offer_id: offer.id,
        _normalizedAirline: airlineName.toLowerCase().trim(),
        _normalizedDepartureTime: outboundDepartureTime,
        _normalizedArrivalAirport: outboundArrivalAirport,
      };
      
      results.push(flightResult);
    }
    
    return results;
  };

  const searchFlights = async (params: SearchParams) => {
    if (!params.segments?.[0]?.from || !params.segments?.[0]?.to) {
      setSearchResults([]);
      return;
    }
  
    const origin = extractAirportCode(params.segments[0].from);
    const destination = extractAirportCode(params.segments[0].to);
    if (!origin || !destination) {
      setSearchResults([]);
      return;
    }
  
    const departureDate = params.segments[0].date || new Date().toISOString().split('T')[0];
    const returnDate = params.returnDate;
  
    let cabinClass = (params.cabinClass ?? 'economy').toLowerCase();
    if (!['economy', 'premium_economy', 'business', 'first'].includes(cabinClass)) cabinClass = 'economy';
  
    let adults = 1, children = 0, infants = 0;
    if (params.passengers) {
      if (typeof params.passengers === 'number') {
        adults = params.passengers;
      } else if (typeof params.passengers === 'object') {
        adults = params.passengers.adults || 0;
        children = params.passengers.children || 0;
        infants = params.passengers.infants || 0;
      }
    }
  
    const nigerianAirports = ['LOS', 'ABV', 'PHC', 'KAN', 'ENU', 'QOW', 'BNI', 'JOS', 'KAD', 'YOL'];
    const isDomestic = nigerianAirports.includes(origin) && nigerianAirports.includes(destination);
    
    const BASE = config.apiBaseUrl;
  
    // DOMESTIC flights
    if (isDomestic && params.tripType !== 'multi-city') {
      console.log('🇳🇬 Domestic flight detected - Using Wakanow API only');
      try {
        const { wakanowService } = await import('@/lib/wakanow.service');
        
        const wakanowParams = {
          from: origin,
          to: destination,
          departureDate: formatDateForWakanow(departureDate),
          returnDate: returnDate ? formatDateForWakanow(returnDate) : undefined,
          adults,
          children,
          infants,
          cabinClass: cabinClass as 'economy' | 'premium_economy' | 'business' | 'first',
          targetCurrency: 'NGN'  // Always request in NGN
        };
        
        const result = await wakanowService.searchDomesticFlights(wakanowParams);
        const offers = result.offers || result.normalizedFlights || [];
        const transformedResults = await transformWakanowOffers(offers, returnDate, cabinClass, true);
        
        console.log(`✅ Wakanow domestic results: ${transformedResults.length} flights with NGN base`);
        setSearchResults(transformedResults);
        return;
      } catch (error) {
        console.error('❌ Wakanow domestic search failed:', error);
        setSearchError('Domestic flight search failed. Please try again.');
        setSearchResults([]);
        return;
      }
    }
  
    // INTERNATIONAL: run both in parallel but render Wakanow immediately when ready
    console.log('🌍 International flight detected - Fetching from Wakanow + Duffel in parallel');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Helper: dedup + sort a list of results
    const deduplicateAndSort = (combined: SearchResult[]): SearchResult[] => {
      const uniqueMap = new Map<string, SearchResult>();

      const normalizeString = (str?: string) => (str || '').toUpperCase().trim();
      const getDateTimeKey = (t?: string) => {
        if (!t) return '';
        try {
          const d = new Date(t);
          return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
        } catch { return ''; }
      };
      const airlineMap: Record<string, string> = {
        'ROYAL AIR MAROC': 'AT', 'EGYPTAIR': 'MS', 'BRITISH AIRWAYS': 'BA',
        'KENYA AIRWAYS': 'KQ', 'EMIRATES AIRLINES': 'EK', 'RWANDAIR': 'WB',
        'QATAR AIRWAYS': 'QR', 'ETHIOPIAN AIRLINES': 'ET', 'KLM ROYAL DUTCH AIRLINES': 'KL',
        'AIR FRANCE': 'AF', 'VIRGIN ATLANTIC': 'VS', 'TURKISH AIRLINES': 'TK', 'AIR PEACE': 'P4',
      };
      const getAirlineKey = (f: any) => {
        const a = normalizeString(f.airlineName || f.airline || '');
        return airlineMap[a] || a;
      };

      for (const flight of combined) {
        const f = flight as any;
        if (!f.departureAirport || !f.arrivalAirport) continue;
        let key = `${getAirlineKey(f)}-${normalizeString(f.departureAirport)}-${normalizeString(f.arrivalAirport)}-${getDateTimeKey(f.departureTime)}`;
        if (f.returnFlight) key += `-${getDateTimeKey(f.returnFlight.departureTime)}`;

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, flight);
        } else {
          const existing = uniqueMap.get(key)!;
          const existingProvider = (existing as any).provider;
          // Prefer wakanow; otherwise keep cheaper of same provider
          if (f.provider === 'wakanow' && existingProvider === 'duffel') {
            uniqueMap.set(key, flight);
          } else if (f.provider === existingProvider) {
            if ((f.rawPrice || Infinity) < ((existing as any).rawPrice || Infinity)) {
              uniqueMap.set(key, flight);
            }
          }
        }
      }

      return Array.from(uniqueMap.values())
        .sort((a, b) => ((a as any).rawPrice || Infinity) - ((b as any).rawPrice || Infinity));
    };

    try {
      // ── 1. Pre-fetch Exchange Rates once for the entire search ─────────────
      const { fetchExchangeRates } = await import('@/lib/currency-service');
      const [ratesToNGN, ratesFromNGN] = await Promise.all([
        fetchExchangeRates('GBP'), // Duffel base (usually)
        fetchExchangeRates('NGN')  // Wakanow base
      ]);
      
      const rateMap: Record<string, number> = {
        'NGN': ratesToNGN.rates['NGN'] || 0,
        [`NGN_${currency.code}`]: ratesFromNGN.rates[currency.code] || 0,
        [currency.code]: ratesFromNGN.rates[currency.code] || 0 // For Wakanow direct NGN->User
      };

      // ── 2. Start both fetches in parallel ──────────────────────────────────
      const wakanowFetchPromise = (async (): Promise<SearchResult[]> => {
        try {
          const { wakanowService } = await import('@/lib/wakanow.service');
          const wakanowParams = {
            from: origin, to: destination,
            departureDate: formatDateForWakanow(departureDate),
            returnDate: returnDate ? formatDateForWakanow(returnDate) : undefined,
            adults, children, infants,
            cabinClass: cabinClass as 'economy' | 'premium_economy' | 'business' | 'first',
            targetCurrency: 'NGN',
          };
          const result = await wakanowService.searchDomesticFlights(wakanowParams);
          const offers = result.offers || result.normalizedFlights || [];
          return transformWakanowOffers(offers, returnDate, cabinClass, false, rateMap);
        } catch (err) {
          console.error('❌ Wakanow fetch failed:', err);
          return [];
        }
      })();

      const duffelFetchPromise = (async (): Promise<SearchResult[]> => {
        try {
          const requestBody: any = {
            origin, destination, departureDate,
            passengers: adults + children + infants,
            cabinClass, currency: 'NGN',
          };
          if (returnDate) requestBody.returnDate = returnDate;

          const offerRes = await fetch(`${BASE}/api/v1/bookings/search/flights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          if (!offerRes.ok) throw new Error(`Offer request failed: ${offerRes.status}`);

          const offerData = await offerRes.json();
          if (!offerData.success || !offerData.data?.offer_request_id) {
            throw new Error('No offer request ID in response');
          }
          const offerRequestId = offerData.data.offer_request_id;

          // Limit to 2 pages for speed – that's already 50–100 offers
          let allOffers: any[] = [];
          let cursor: string | null = null;
          let hasMore = true;
          let page = 1;
          const MAX_PAGES = 2;

          while (hasMore && page <= MAX_PAGES) {
            const url = new URL(`${BASE}/api/v1/bookings/offers`);
            url.searchParams.set('offer_request_id', offerRequestId);
            if (cursor) url.searchParams.set('cursor', cursor);
            const offersRes = await fetch(url.toString(), { signal: controller.signal });
            if (!offersRes.ok) throw new Error('List offers failed');
            const offersData = await offersRes.json();
            const pageOffers: any[] = offersData.data?.offers ?? offersData.data ?? offersData.offers ?? [];
            allOffers = allOffers.concat(pageOffers);
            hasMore = offersData.meta?.hasMore ?? false;
            cursor = offersData.meta?.nextCursor ?? null;
            page++;
          }

          return transformDuffelOffers(allOffers, cabinClass, offerRequestId, rateMap);
        } catch (err) {
          console.error('❌ Duffel fetch failed:', err);
          return [];
        }
      })();

      // ── 3. Show Wakanow results as soon as they're ready ──────────────────
      let wakanowResults: SearchResult[] = [];
      let duffelResults: SearchResult[] = [];

      wakanowFetchPromise
        .then(results => {
          wakanowResults = results;
          if (results.length > 0) {
            console.log(`✅ Wakanow: ${results.length} flights ready – rendering immediately`);
            setSearchResults(deduplicateAndSort([...wakanowResults, ...duffelResults]));
          }
        });

      // ── 4. When Duffel finishes, merge and update ──────────────────────────
      duffelFetchPromise
        .then(results => {
          duffelResults = results;
          if (results.length > 0) {
            console.log(`✅ Duffel: ${results.length} flights ready – merging`);
            setSearchResults(deduplicateAndSort([...wakanowResults, ...duffelResults]));
          }
        });

      // ── 5. Await both so finally/error handling still runs ─────────────────
      const [wakanowSettled, duffelSettled] = await Promise.allSettled([
        wakanowFetchPromise, duffelFetchPromise,
      ]);

      clearTimeout(timeoutId);

      if (wakanowResults.length === 0 && duffelResults.length === 0) {
        setSearchError('No flights found for your criteria. Please try different dates or airports.');
        setSearchResults([]);
      }

    } catch (error: any) {

      clearTimeout(timeoutId);

      if (wakanowSettled.status === 'rejected' && duffelSettled.status === 'rejected') {
        setSearchError('No flights found. Please try again.');
        setSearchResults([]);
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        setSearchError('Search is taking too long. Please try again.');
      } else {
        console.error('❌ International flight search failed:', error);
        setSearchError('Failed to search flights. Please try again.');
      }
      setSearchResults([]);
    }
  };


  // Update the ref on every render so the stable `search` callback always calls
  // the latest version (with up-to-date currency helpers, exchange rates, etc.)
  const _searchImpl = async (params: SearchParams) => {
    console.log('🔍 Search called with params:', params);
    setSearchParams(params);
    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);
    setSearchCompleted(false);

    try {
      if (params.type === 'car-rentals' || params.type === 'cars') {
        await searchCars(params);
      } else if (params.type === 'hotels') {
        await searchHotels(params);
      } else if (params.type === 'flights') {
        await searchFlights(params);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Failed to load results. Please try again.');
      const mockKey = params.type === 'cars' ? 'car-rentals' : params.type;
      setSearchResults(MOCK[mockKey] ?? []);
    } finally {
      setIsSearching(false);
      setSearchCompleted(true);
    }
  };

  // Keep the ref current on every render (no deps needed — runs every render)
  searchDispatchRef.current = _searchImpl;

  // Stable callback — safe to pass as prop without re-rendering consumers
  const search = useCallback((params: SearchParams) => {
    return searchDispatchRef.current(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectItem = useCallback((item: SearchResult) => {
    console.log('📦 Item selected with service fee breakdown (NGN base):', {
      id: item.id,
      provider: item.provider,
      type: item.type,
      original_amount_NGN: item.original_amount,
      original_currency: item.original_currency,
      markup_amount_NGN: item.markup_amount,
      conversion_fee_NGN: item.conversion_fee,
      taxes_NGN: item.taxes,
      service_fee_NGN: item.service_fee,
      service_fee_percentage: item.service_fee_percentage,
      final_amount_NGN: item.final_amount,
      internal_currency: item.currency,
      display_price: item.price
    });
    setSelectedItem(item);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSelectedItem(null);
    setSearchParams(null);
    setAirlines([]);
    setSearchError(null);
    setSearchCompleted(false);
    if (typeof window !== 'undefined') sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
  }, []);

  const persistSelectionForReturn = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = { selectedItem, searchParams };
      sessionStorage.setItem(BOOKING_REVIEW_SELECTION_KEY, JSON.stringify(payload));
    } catch {
      sessionStorage.removeItem(BOOKING_REVIEW_SELECTION_KEY);
    }
  }, [selectedItem, searchParams]);


  return (
    <SearchContext.Provider
      value={{
        searchParams,
        searchResults,
        selectedItem,
        isSearching,
        search,
        selectItem,
        clearSearch,
        persistSelectionForReturn,
        airlines,
        isLoadingAirlines,
        fetchAirlines,
        searchError,
        searchCompleted
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within <SearchProvider>');
  return ctx;
} 