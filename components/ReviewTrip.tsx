'use client';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ReviewTripProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onSignIn?: () => void;
  isLoggedIn?: boolean;
  user?: {
    name: string;
    email: string;
    phone?: string; // Add phone as optional property
  };
  onSuccess?: () => void;
  onFailure?: () => void;
  onGuestBooking?: (bookingData: any) => Promise<{ success: boolean; bookingReference?: string; error?: string }>;
}

interface FlightOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  currency: string;
  owner: {
    name: string;
    iata_code: string;
    logo_symbol_url?: string;
  };
  slices: Array<{
    origin: {
      iata_code: string;
      name: string;
      city_name: string;
    };
    destination: {
      iata_code: string;
      name: string;
      city_name: string;
    };
    segments: Array<{
      departing_at: string;
      arriving_at: string;
      marketing_carrier: {
        name: string;
        iata_code: string;
      };
      marketing_carrier_flight_number: string;
      duration: string;
      passengers: Array<{
        baggages: Array<{
          quantity: number;
          type: string;
        }>;
        cabin_class: string;
        cabin_class_marketing_name: string;
      }>;
    }>;
    duration: string;
  }>;
  passengers: Array<{
    type: string;
  }>;
  conditions?: {
    change_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
    refund_before_departure?: {
      allowed: boolean;
      penalty_amount?: string;
      penalty_currency?: string;
    };
  };
  payment_requirements?: {
    price_guarantee_expires_at?: string;
    payment_required_by?: string;
  };
}

const ReviewTrip: React.FC<ReviewTripProps> = ({ 
  item, 
  searchParams, 
  onBack, 
  onSignIn, 
  isLoggedIn, 
  user, 
  onSuccess, 
  onFailure,
  onGuestBooking 
}) => {
  const { currency } = useLanguage();
  
  // Robust detection for booking type
  const rawType = (item.type || searchParams?.type || 'flights').toLowerCase();
  const isHotel = rawType.includes('hotel') || item.id?.toLowerCase().includes('hotel');
  const isCar = rawType.includes('car') || item.id?.toLowerCase().includes('car');
  const isFlight = !isHotel && !isCar;

  // Jump directly to checkout for hotels and cars
  const [view, setView] = useState<'review' | 'checkout'>(isHotel || isCar ? 'checkout' : 'review');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
  const [isBooking, setIsBooking] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [name, setName] = useState(isLoggedIn ? user?.name || '' : '');
  const [email, setEmail] = useState(isLoggedIn ? user?.email || '' : '');
  const [phone, setPhone] = useState(isLoggedIn ? user?.phone || '' : '');
  const [flightData, setFlightData] = useState<FlightOffer | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Parse flight offer data from item
  useEffect(() => {
    if (item && item.id && typeof item === 'object') {
      // Check if item is a flight offer from API
      if (item.total_amount && item.owner && item.slices) {
        setFlightData(item as FlightOffer);
      }
    }
  }, [item]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // Safely parse travelers count
  const parseTravelersCount = () => {
    try {
      // First try to get from flight data passengers
      if (flightData?.passengers?.length) {
        return flightData.passengers.length;
      }
      
      // Then try from searchParams
      const travellers = searchParams?.travellers;
      if (!travellers) return 1;
      
      if (typeof travellers === 'string') {
        const match = travellers.match(/\d+/);
        return match ? parseInt(match[0]) : 1;
      }
      
      if (typeof travellers === 'number') {
        return travellers;
      }
      
      return 1;
    } catch (error) {
      console.error('Error parsing travelers count:', error);
      return 1;
    }
  };

  const travelersCount = parseTravelersCount();
  
  // Get destination/origin from flight data first, then searchParams
  const firstSlice = flightData?.slices?.[0];
  const destination = firstSlice?.destination?.city_name || 
                     searchParams?.segments?.[0]?.to || 
                     searchParams?.location || 
                     searchParams?.carPickUp || 
                     'Your Destination';
  const origin = firstSlice?.origin?.city_name || 
                searchParams?.segments?.[0]?.from || 
                'Lagos';
  
  const getCode = (str: string) => {
    if (!str || typeof str !== 'string') return 'LOC';
    const match = str.match(/\((.*?)\)/);
    return match ? match[1] : str.substring(0, 3).toUpperCase();
  };

  const originCode = firstSlice?.origin?.iata_code || getCode(origin);
  const destCode = firstSlice?.destination?.iata_code || getCode(destination);
  const cityName = destination.split('(')[0].trim();

  // Currency conversion function
  const convertCurrency = (amountGBP: number, toCurrency: string) => {
    if (toCurrency === 'GBP') return amountGBP;
    if (toCurrency === 'USD') return amountGBP * 1.3;
    if (toCurrency === 'NGN') return amountGBP * 1500;
    if (toCurrency === 'EUR') return amountGBP * 1.18;
    return amountGBP;
  };

  // Calculate price with proper conversion
  const calculatePrice = () => {
    if (flightData) {
      // Parse price from flight data (should be in GBP)
      const priceInGBP = parseFloat(flightData.total_amount) || 225.69;
      
      // Convert to current currency
      const convertedPrice = convertCurrency(priceInGBP, currency.code);
      
      console.log('💰 Price calculation:', {
        originalGBP: priceInGBP,
        targetCurrency: currency.code,
        convertedPrice: convertedPrice,
        currencySymbol: currency.symbol
      });
      
      return convertedPrice;
    }
    
    // Fallback: Check if item has a price property
    if (item.price) {
      // Extract numeric value from price string
      const priceStr = item.price.toString();
      const numericMatch = priceStr.match(/[\d,.]+/);
      if (numericMatch) {
        let numericPrice = parseFloat(numericMatch[0].replace(/,/g, ''));
        
        // Check if price is already in the target currency
        if (priceStr.includes('£') || priceStr.includes('GBP')) {
          // Price is in GBP, convert it
          return convertCurrency(numericPrice, currency.code);
        } else if (priceStr.includes('₦') || priceStr.includes('NGN')) {
          // Price is already in NGN, just return it
          return numericPrice;
        } else if (priceStr.includes('$') || priceStr.includes('USD')) {
          // Convert USD to target currency (assuming USD to GBP conversion first)
          const usdToGbp = numericPrice / 1.3;
          return convertCurrency(usdToGbp, currency.code);
        }
        
        // If no currency symbol, assume it's already in target currency
        return numericPrice;
      }
    }
    
    // Default fallback
    const defaultPriceGBP = 75.00;
    return convertCurrency(defaultPriceGBP, currency.code);
  };

  const unitCount = isHotel ? 3 : (isCar ? 2 : travelersCount); 
  const cleaningFee = isHotel ? 45 : 0;
  
  // Scale fee based on currency
  const scaleFee = (fee: number) => {
    return convertCurrency(fee, currency.code);
  };
  
  const discount = isPromoApplied ? scaleFee(10) : 0;
  const subtotal = calculatePrice() * unitCount;
  const totalPrice = subtotal + (isHotel ? scaleFee(cleaningFee) : 0) - discount;
  const formattedTotal = `${currency.symbol}${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Format price display
  const formatPrice = (price: number) => {
    return `${currency.symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format duration from ISO 8601 to readable format
  const formatDuration = (duration: string) => {
    if (!duration) return '';
    
    const timeStr = duration.replace('PT', '');
    let result = '';
    
    if (timeStr.includes('H')) {
      const [hours] = timeStr.split('H');
      result += `${hours}h`;
    }
    
    if (timeStr.includes('M')) {
      const parts = timeStr.split('H');
      const minutesPart = parts[1] || timeStr;
      const [minutes] = minutesPart.split('M');
      result += minutes ? ` ${minutes}m` : '';
    }
    
    return result.trim();
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time to readable format
  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const handleApplyPromo = () => {
    setPromoError('');
    const code = promoCode.toUpperCase().trim();
    if (['EBONY5', 'WELCOME', 'FLYEBONY'].includes(code)) {
      setIsPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid coupon code');
      setIsPromoApplied(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!name.trim()) {
      setBookingError("Please enter your full name");
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setBookingError("Please enter a valid email address");
      return;
    }
    if (!phone.trim()) {
      setBookingError("Please enter your phone number");
      return;
    }
    
    setIsBooking(true);
    setBookingError(null);
    
    try {
      // If user is logged in, use regular booking flow
      if (isLoggedIn && onSuccess) {
        onSuccess();
        return;
      }
      
      // For guest booking, create the booking
      if (onGuestBooking) {
        const bookingData = {
          productType: isFlight ? "FLIGHT_INTERNATIONAL" : isHotel ? "HOTEL_BOOKING" : "CAR_RENTAL",
          provider: flightData?.owner?.name || item.provider || "TRIPS_AFRICA",
          basePrice: Math.round(calculatePrice() * 100), // Convert to cents/kobo
          currency: currency.code,
          bookingData: {
            offerId: flightData?.id || item.id,
            origin: origin,
            destination: destination,
            departureDate: firstSlice?.segments?.[0]?.departing_at || searchParams?.segments?.[0]?.date || new Date().toISOString(),
            airline: flightData?.owner?.name || item.provider,
            ...(isHotel && { hotelName: item.title, nights: 3 }),
            ...(isCar && { carModel: item.title, days: 2 }),
          },
          passengerInfo: {
            firstName: name.split(' ')[0] || name,
            lastName: name.split(' ').slice(1).join(' ') || name,
            email: email,
            phone: phone,
          }
        };
        
        console.log('📤 Guest booking data:', bookingData);
        const result = await onGuestBooking(bookingData);
        
        if (result.success) {
          // Store guest booking info in localStorage
          localStorage.setItem('guestBooking', JSON.stringify({
            bookingReference: result.bookingReference,
            name,
            email,
            phone,
            date: new Date().toISOString()
          }));
          
          if (onSuccess) {
            onSuccess();
          }
        } else {
          setBookingError(result.error || 'Booking failed. Please try again.');
          setIsBooking(false);
        }
      } else {
        // Fallback: If no guest booking handler, just trigger success
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      setBookingError(error.message || 'Booking failed. Please try again.');
      setIsBooking(false);
    }
  };

  const handleSignInClick = () => {
    if (onSignIn) {
      onSignIn();
    }
  };

  // Review screen only for Flights
  if (isFlight && view === 'review') {
    const firstSegment = firstSlice?.segments?.[0];
    const airlineName = flightData?.owner?.name || item.provider;
    const flightNumber = firstSegment?.marketing_carrier_flight_number;
    const departureTime = firstSegment?.departing_at;
    const arrivalTime = firstSegment?.arriving_at;
    const duration = firstSlice?.duration;
    const baggageInfo = firstSegment?.passengers?.[0]?.baggages || [];

    return (
      <div className="bg-[#f0f2f5] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={onBack} 
              className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 group"
            >
              <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
              Go back
            </button>
            {!isLoggedIn && (
              <button 
                onClick={handleSignInClick}
                className="bg-white border border-gray-300 rounded-lg px-4 py-1.5 text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-[#33a8da]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Sign in for better experience
              </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-12">
              <section>
                <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">1. Review Flight Details</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-6">
                  Total price includes all taxes and fees
                </p>

                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <div className="p-8 border-b border-gray-50 bg-gradient-to-r from-[#f8fbfe] to-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-2xl text-gray-900 mb-2">{airlineName} • Economy</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[#33a8da]">
                            {formatPrice(calculatePrice())}
                          </span>
                          <span className="text-xs font-bold text-gray-400 uppercase">per person</span>
                        </div>
                      </div>
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-md">
                        {flightData?.owner?.logo_symbol_url ? (
                          <img 
                            src={flightData.owner.logo_symbol_url} 
                            className="w-full h-full object-contain" 
                            alt={airlineName} 
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-50 rounded-lg flex items-center justify-center">
                            <span className="font-black text-[#33a8da] text-lg">
                              {airlineName.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Baggage information */}
                    {baggageInfo.map((baggage, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          {baggage.quantity} {baggage.type === 'carry_on' ? 'carry-on' : 'checked'} bag{baggage.quantity !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                    
                    {/* Flight details */}
                    {flightNumber && (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-700">Flight {flightNumber}</span>
                      </div>
                    )}
                    
                    {duration && (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{formatDuration(duration)}</span>
                      </div>
                    )}
                    
                    {/* Change/Refund conditions */}
                    {flightData?.conditions?.change_before_departure?.allowed && (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          Changes {flightData.conditions.change_before_departure.penalty_amount ? 
                            `(${flightData.conditions.change_before_departure.penalty_currency === 'GBP' ? '£' : '$'}${flightData.conditions.change_before_departure.penalty_amount} fee)` : 
                            'allowed'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">2. Final Step</h2>
                <div className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center p-2 shadow-sm">
                      {flightData?.owner?.logo_symbol_url ? (
                        <img 
                          src={flightData.owner.logo_symbol_url} 
                          className="w-full h-full object-contain" 
                          alt={airlineName} 
                        />
                      ) : (
                        <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
                          <span className="font-black text-[#33a8da] text-xl">
                            {airlineName.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-black text-xl text-gray-900 block">{airlineName}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Economy Class</span>
                      {flightNumber && (
                        <span className="text-xs font-bold text-gray-500 mt-1">Flight {flightNumber}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <span className="font-black text-3xl text-gray-900 block">{formatPrice(calculatePrice())}</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        Inc. Taxes & Fees
                      </p>
                      <p className="text-xs font-bold text-gray-500 mt-1">
                        Total for {travelersCount} {travelersCount === 1 ? 'traveler' : 'travelers'}: {formatPrice(subtotal)}
                      </p>
                    </div>
                    <button 
                      onClick={() => setView('checkout')}
                      className="bg-gradient-to-r from-[#33a8da] to-[#2c98c7] text-white px-12 py-4 rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest shadow-lg shadow-blue-500/10"
                    >
                      Continue to Checkout
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <aside className="w-full lg:w-[380px]">
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-lg sticky top-24">
                <div className="mb-8">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-1">{cityName}</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
                    FLIGHT • {travelersCount} PERSON{travelersCount !== 1 ? 'S' : ''}
                  </p>
                </div>
                
                <div className="border-t border-gray-50 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-center">
                      <div className="text-sm font-black text-gray-900 uppercase tracking-tighter">{originCode}</div>
                      <div className="text-xs font-bold text-gray-400">{firstSlice?.origin?.name || origin}</div>
                    </div>
                    <div className="flex-1 relative px-4">
                      <div className="border-t-2 border-dashed border-gray-200 relative">
                        <div className="absolute left-1/2 -translate-x-1/2 -top-3">
                          <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black text-gray-900 uppercase tracking-tighter">{destCode}</div>
                      <div className="text-xs font-bold text-gray-400">{firstSlice?.destination?.name || destination}</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-[#f8fbfe] to-blue-50 rounded-2xl p-6 space-y-4">
                    {departureTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">DEPARTURE</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900">{formatDate(departureTime)}</span>
                          <div className="text-xs font-bold text-gray-500">{formatTime(departureTime)}</div>
                        </div>
                      </div>
                    )}
                    
                    {arrivalTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">ARRIVAL</span>
                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900">{formatDate(arrivalTime)}</span>
                          <div className="text-xs font-bold text-gray-500">{formatTime(arrivalTime)}</div>
                        </div>
                      </div>
                    )}
                    
                    {duration && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">DURATION</span>
                        <span className="text-sm font-black text-gray-900">{formatDuration(duration)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Payment guarantee */}
                  {flightData?.payment_requirements?.price_guarantee_expires_at && (
                    <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-bold text-green-700">
                          Price guaranteed until {new Date(flightData.payment_requirements.price_guarantee_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  // Checkout screen for everyone
  return (
    <div className="bg-[#f8fbfe] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black text-[#001f3f] tracking-tighter uppercase mb-2">Check Out</h1>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {isHotel ? 'COMPLETE YOUR HOTEL RESERVATION' : 
               isCar ? 'COMPLETE YOUR CAR RENTAL' : 
               'CONFIRM YOUR FLIGHT BOOKING'}
            </p>
          </div>
          <button 
            onClick={onBack} 
            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 transform group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel Order
          </button>
        </div>

        {/* Booking Error Alert */}
        {bookingError && (
          <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-3xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-red-800 mb-1">Booking Error</h3>
                <p className="text-red-700 text-sm">{bookingError}</p>
                <button 
                  onClick={() => setBookingError(null)}
                  className="mt-2 text-xs font-bold text-red-600 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-8">
            {/* Guest Identity Section */}
            <section className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-6 h-6 bg-[#33a8da] rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-[#001f3f] tracking-tight uppercase">Guest Identity</h2>
              </div>
              
              {!isLoggedIn && (
                <div className="bg-gradient-to-r from-[#f8fbfe] to-blue-50 border border-dashed border-[#33a8da]/30 rounded-3xl p-8 mb-10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <svg className="w-6 h-6 text-[#33a8da]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-900 font-bold text-base mb-2">
                        {isLoggedIn ? 'Booking as Member' : 'Booking as Guest'}
                      </p>
                      <p className="text-gray-600 text-sm mb-3">
                        {isLoggedIn 
                          ? 'You are logged in as a member. Your booking will be linked to your account.'
                          : 'You are booking as a guest. Complete your booking without creating an account.'}
                      </p>
                      {!isLoggedIn && onSignIn && (
                        <button 
                          onClick={handleSignInClick}
                          className="text-[#33a8da] text-xs font-bold uppercase tracking-widest hover:underline mt-1 inline-flex items-center gap-2 group"
                        >
                          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          SIGN IN TO EARN EBONY POINTS
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Full Legal Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] transition-all outline-none placeholder:text-gray-400"
                    placeholder="e.g. John Doe"
                    required
                    disabled={isBooking}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] transition-all outline-none placeholder:text-gray-400"
                      placeholder="name@domain.com"
                      required
                      disabled={isBooking}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-[#33a8da] transition-all outline-none placeholder:text-gray-400"
                      placeholder="+234 800 000 0000"
                      required
                      disabled={isBooking}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Payment Method Section */}
            <section className="bg-white rounded-[32px] p-10 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-6 h-6 bg-[#33a8da] rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-[#001f3f] tracking-tight uppercase">Payment Channel</h2>
              </div>
              
              <div className="space-y-4">
                <label 
                  onClick={() => !isBooking && setPaymentMethod('card')}
                  className={`flex items-center justify-between p-8 border-3 rounded-3xl cursor-pointer transition-all group ${
                    paymentMethod === 'card' 
                      ? 'border-[#33a8da] bg-gradient-to-r from-blue-50/50 to-white shadow-lg shadow-blue-500/10' 
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                  } ${isBooking ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-6 h-6 rounded-full border-3 flex items-center justify-center transition-colors ${
                      paymentMethod === 'card' ? 'border-[#33a8da]' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'card' && <div className="w-3 h-3 bg-[#33a8da] rounded-full" />}
                    </div>
                    <div>
                      <span className="font-black text-lg text-[#001f3f]">Credit / Debit Card</span>
                      <p className="text-xs font-bold text-gray-400 mt-1">Pay securely with your card</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2021.svg" className="h-6 w-auto" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6 w-auto" alt="Mastercard" />
                  </div>
                </label>

                <label 
                  onClick={() => !isBooking && setPaymentMethod('bank')}
                  className={`flex items-center justify-between p-8 border-3 rounded-3xl cursor-pointer transition-all group ${
                    paymentMethod === 'bank' 
                      ? 'border-[#33a8da] bg-gradient-to-r from-blue-50/50 to-white shadow-lg shadow-blue-500/10' 
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                  } ${isBooking ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-6 h-6 rounded-full border-3 flex items-center justify-center transition-colors ${
                      paymentMethod === 'bank' ? 'border-[#33a8da]' : 'border-gray-300'
                    }`}>
                      {paymentMethod === 'bank' && <div className="w-3 h-3 bg-[#33a8da] rounded-full" />}
                    </div>
                    <div>
                      <span className="font-black text-lg text-[#001f3f]">Bank Transfer / USSD</span>
                      <p className="text-xs font-bold text-gray-400 mt-1">Direct bank transfer</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/>
                    </svg>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="w-full lg:w-[460px]">
            <div className="sticky top-24 bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header Image for Hotels & Cars */}
              {!isFlight && (
                <div className="relative h-72">
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600"} 
                    className="w-full h-full object-cover" 
                    alt="Property" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <h3 className="text-white font-black text-2xl tracking-tight mb-2">{item.title || item.provider}</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-white font-black text-sm">5.0 • Excellent</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-10 border-b border-gray-50 bg-gradient-to-r from-[#001f3f] to-[#003366] text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-75 mb-2">Order Summary</p>
                <h3 className="text-3xl font-black tracking-tight">{flightData?.owner?.name || item.provider}</h3>
                {flightData?.owner?.iata_code && (
                  <p className="text-sm font-bold opacity-80 mt-1">Airline Code: {flightData.owner.iata_code}</p>
                )}
              </div>

              <div className="p-10 space-y-10">
                {/* Booking Details */}
                <div className="space-y-6">
                  <h4 className="text-xl font-black text-[#001f3f] tracking-tight uppercase">Booking Details</h4>
                  <div className="space-y-4">
                    {flightData?.slices?.[0]?.segments?.[0]?.departing_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold text-gray-600">
                          {formatDate(flightData.slices[0].segments[0].departing_at)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-sm">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <span className="font-bold text-gray-600">
                        {travelersCount} Traveler{travelersCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {flightData?.slices?.[0]?.segments?.[0]?.marketing_carrier_flight_number && (
                      <div className="flex items-center gap-3 text-sm">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold text-gray-600">
                          Flight {flightData.slices[0].segments[0].marketing_carrier_flight_number}
                        </span>
                      </div>
                    )}
                    
                    {flightData?.slices?.[0]?.duration && (
                      <div className="flex items-center gap-3 text-sm">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold text-gray-600">
                          {formatDuration(flightData.slices[0].duration)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-6">
                  <h4 className="text-xl font-black text-[#001f3f] tracking-tight uppercase">Price Breakdown</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-base">
                      <span className="text-gray-600 font-bold">
                        {travelersCount} {travelersCount === 1 ? 'Traveler' : 'Travelers'} x {formatPrice(calculatePrice() / unitCount)}
                      </span>
                      <span className="text-[#33a8da] font-black">{formatPrice(subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-base">
                      <span className="text-gray-600 font-bold">Service fee</span>
                      <span className="text-green-600 font-black uppercase">FREE</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-base border-b border-gray-50 pb-6">
                      <span className="text-gray-600 font-bold">Taxes & Fees</span>
                      <span className="text-green-600 font-black uppercase">INCLUDED</span>
                    </div>

                    {isPromoApplied && (
                      <div className="flex justify-between items-center text-base bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4">
                        <span className="text-green-600 font-black">Promo Discount ({promoCode})</span>
                        <span className="text-green-600 font-black">- {formatPrice(discount)}</span>
                      </div>
                    )}

                    <div className="pt-4 flex justify-between items-center">
                      <div>
                        <span className="text-3xl font-black text-[#001f3f] tracking-tighter block">Total</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">Payable Now</span>
                      </div>
                      <span className="text-4xl font-black text-[#33a8da] tracking-tighter">{formattedTotal}</span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="pt-4">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Promotional Key</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="EBONY10" 
                      className="flex-1 px-5 py-4 bg-gray-50 rounded-2xl font-black text-sm uppercase tracking-wider outline-none focus:ring-3 focus:ring-[#33a8da]/20 focus:bg-white transition-all"
                      disabled={isBooking}
                    />
                    <button 
                      onClick={handleApplyPromo}
                      className="bg-[#001f3f] text-white px-8 py-2 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-900 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isBooking}
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-red-500 font-bold mt-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {promoError}
                    </p>
                  )}
                </div>

                {/* Complete Booking Button */}
                <button 
                  onClick={handleCompleteBooking}
                  disabled={isBooking}
                  className="w-full bg-gradient-to-r from-[#33a8da] to-[#2c98c7] text-white font-black py-6 rounded-2xl shadow-2xl shadow-blue-500/20 hover:shadow-3xl hover:shadow-blue-500/30 transition-all transform active:scale-95 text-xl uppercase tracking-[0.1em] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isBooking ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isLoggedIn ? 'Processing Booking...' : 'Creating Guest Booking...'}
                    </span>
                  ) : (
                    `Complete ${isLoggedIn ? 'Member' : 'Guest'} Booking`
                  )}
                </button>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-3 mt-8 text-xs font-black text-gray-400 uppercase tracking-widest">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Secure SSL Transaction • 256-bit Encryption
                </div>
              </div>

              {/* Footer Terms */}
              <div className="mx-10 mb-10 p-8 bg-gradient-to-r from-[#f8fbfe] to-blue-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed text-center">
                  By completing this booking, you agree to our{' '}
                  <a href="/terms" className="text-[#33a8da] hover:underline">Terms of Use</a> and the{' '}
                  <span className="font-black">{flightData?.owner?.name || item.provider}</span> reservation policy.
                  Your payment is protected by our secure booking guarantee.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReviewTrip;