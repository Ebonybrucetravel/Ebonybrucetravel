'use client';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '@/context/SearchContext';
import { useRouter } from 'next/navigation';
import api from '../lib/api';
import { format } from 'date-fns';

interface CarDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
  createdBooking?: any;
}

const CarDetails: React.FC<CarDetailsProps> = ({ 
  item, 
  searchParams, 
  onBack, 
  onBook,
  createdBooking 
}) => {
  const { currency } = useLanguage();
  const router = useRouter();
  const { selectItem } = useSearch();
  
  const [promoCode, setPromoCode] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedCarData, setDetailedCarData] = useState<any>(createdBooking || item?.realData || null);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null>(null);

  const handleSelectCar = () => {
    // Get current car data (either detailed or original)
    const currentCarData = detailedCarData || item;
    
    console.log('========== 🚗 CAR DETAILS - CALCULATING PRICES ==========');
    console.log('1. Raw car data:', {
      original_price: currentCarData.original_price,
      base_price: currentCarData.base_price,
      markup_amount: currentCarData.markup_amount,
      service_fee: currentCarData.service_fee,
      conversion_fee: currentCarData.conversion_fee,
      conversion_fee_percentage: currentCarData.conversion_fee_percentage,
      final_price: currentCarData.final_price,
      currency: currentCarData.currency
    });
  
    // Calculate all price components
    const basePrice = parseFloat(currentCarData.base_price || currentCarData.original_price || '0');
    const markupAmount = parseFloat(currentCarData.markup_amount || '0');
    const serviceFee = parseFloat(currentCarData.service_fee || '0');
    const taxes = markupAmount + serviceFee; // Combined taxes (markup + service fee)
    
    // Conversion fee
    const conversionFee = parseFloat(currentCarData.conversion_fee || '0');
    const conversionPercentage = currentCarData.conversion_fee_percentage || 0;
    
    // Total price (base + taxes + conversion fee)
    const totalPrice = parseFloat(currentCarData.final_price || '0') || (basePrice + taxes + conversionFee);
  
    // Format for display
    const formattedBasePrice = `£${basePrice.toFixed(2)}`;
    const formattedTaxes = `£${taxes.toFixed(2)}`;
    const formattedConversionFee = conversionFee > 0 ? `£${conversionFee.toFixed(2)}` : '';
    const formattedTotalPrice = `£${totalPrice.toFixed(2)}`;
  
    console.log('2. Calculated values:', {
      basePrice,
      markupAmount,
      serviceFee,
      taxes,
      conversionFee,
      conversionPercentage,
      totalPrice,
      formattedBasePrice,
      formattedTaxes,
      formattedConversionFee,
      formattedTotalPrice
    });
  
    // Extract vehicle details
    const vehicle = currentCarData.vehicle || {};
    const pickupLocation = {
      code: currentCarData.start?.locationCode || currentCarData.pickupLocation || '',
      dateTime: currentCarData.start?.dateTime || currentCarData.pickupDateTime || ''
    };
    const dropoffLocation = {
      code: currentCarData.end?.locationCode || currentCarData.dropoffLocation || '',
      dateTime: currentCarData.end?.dateTime || currentCarData.dropoffDateTime || ''
    };
  
    // Vehicle specs
    const seats = vehicle.seats?.[0]?.count || currentCarData.seats || 0;
    const baggage = vehicle.baggages?.reduce((total: number, bag: any) => 
      total + (bag.count || 0), 0) || currentCarData.baggage || 0;
    const vehicleCode = vehicle.code || currentCarData.vehicleCode || '';
    const vehicleCategory = vehicle.category || currentCarData.vehicleCategory || '';
  
    // Create complete booking with ALL price fields
    const completeBooking = {
      ...currentCarData,
      
      // Raw API fields
      original_price: currentCarData.original_price,
      base_price: currentCarData.base_price,
      markup_amount: currentCarData.markup_amount,
      service_fee: currentCarData.service_fee,
      conversion_fee: currentCarData.conversion_fee,
      conversion_fee_percentage: currentCarData.conversion_fee_percentage,
      final_price: currentCarData.final_price,
      currency: currentCarData.currency || 'GBP',
      
      // ✅ CALCULATED NUMERIC VALUES
      calculatedBasePrice: basePrice,
      calculatedMarkup: markupAmount,
      calculatedServiceFee: serviceFee,
      calculatedTaxes: taxes,
      calculatedConversionFee: conversionFee,
      calculatedTotal: totalPrice,
      
      // ✅ FORMATTED STRINGS for display
      displayBasePrice: formattedBasePrice,
      displayTaxes: formattedTaxes,
      displayConversionFee: formattedConversionFee,
      displayConversionPercentage: conversionPercentage,
      displayTotalPrice: formattedTotalPrice,
      
      // Flight format compatibility
      original_amount: currentCarData.original_price,
      final_amount: currentCarData.final_price,
      
      // Vehicle details
      vehicle: vehicle,
      pickupLocation: pickupLocation,
      dropoffLocation: dropoffLocation,
      
      // Booking metadata
      type: 'car-rentals' as const,
      status: 'Pending',
      
      // Store everything in bookingData
      bookingData: {
        ...currentCarData.bookingData,
        vehicleCode,
        vehicleCategory,
        seats,
        baggage,
        serviceFee,
        basePrice,
        taxes,
        conversionFee,
        conversionPercentage,
        totalPrice,
        formattedBasePrice,
        formattedTaxes,
        formattedConversionFee,
        formattedTotalPrice
      }
    };
  
    console.log('3. Complete booking object with ALL price fields:', {
      basePrice: completeBooking.calculatedBasePrice,
      taxes: completeBooking.calculatedTaxes,
      conversionFee: completeBooking.calculatedConversionFee,
      total: completeBooking.calculatedTotal,
      displayBasePrice: completeBooking.displayBasePrice,
      displayTaxes: completeBooking.displayTaxes,
      displayConversionFee: completeBooking.displayConversionFee,
      displayTotalPrice: completeBooking.displayTotalPrice
    });
  
    // Save to context
    selectItem(completeBooking);
    
    // Save to sessionStorage as backup
    sessionStorage.setItem('lastSelectedItem', JSON.stringify(completeBooking));
    
    // Navigate to review page
    router.push('/booking/review');
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // If we have createdBooking from the API, use it directly
    if (createdBooking) {
      console.log('✅ Using created booking data:', createdBooking);
      setDetailedCarData({
        ...item?.realData,
        ...createdBooking.bookingData,
        // Merge the pricing from the booking
        base_price: createdBooking.basePrice,
        final_price: createdBooking.totalAmount,
        currency: createdBooking.currency
      });
      return;
    }
    
    const fetchCarDetails = async () => {
      if (!item) return;
      
      // If we already have full data from the search results, use it directly
      if (item.start?.locationCode && item.end?.locationCode && item.vehicle) {
        console.log('✅ Using existing car data from search results:', {
          id: item.id,
          start: item.start,
          end: item.end,
          vehicle: item.vehicle
        });
        setDetailedCarData(item);
        return;
      }
      
      // If we have realData with the structure, use that
      if (item.realData?.start?.locationCode) {
        console.log('✅ Using car data from realData');
        setDetailedCarData(item.realData);
        return;
      }
      
      // Only make API call if we're missing critical data
      setIsLoadingDetails(true);
      setError(null);
      setImageError(false);
      
      try {
        const offerId = item.id || item.realData?.offerId || item.realData?.id;
        
        if (!offerId) {
          throw new Error('No offer ID found');
        }
    
        // Extract data from the item
        let pickupLocationCode = item.start?.locationCode || item.pickupLocation;
        let pickupDateTime = item.start?.dateTime || item.pickupDateTime;
        let dropoffLocationCode = item.end?.locationCode || item.dropoffLocation;
        let dropoffDateTime = item.end?.dateTime || item.dropoffDateTime;
        let passengers = item.seats || 2;
    
        if (!pickupLocationCode || !pickupDateTime || !dropoffLocationCode || !dropoffDateTime) {
          console.error('❌ Missing required car rental parameters:', {
            pickupLocationCode,
            pickupDateTime,
            dropoffLocationCode,
            dropoffDateTime
          });
          setError('This car rental offer is missing location or date information.');
          setIsLoadingDetails(false);
          return;
        }
    
        console.log('📅 Fetching full details with params:', {
          pickupLocationCode,
          pickupDateTime,
          dropoffLocationCode,
          dropoffDateTime,
          passengers
        });
    
        const searchResponse = await api.carApi.searchCarRentals({
          pickupLocationCode,
          pickupDateTime,
          dropoffLocationCode,
          dropoffDateTime,
          currency: 'GBP',
          passengers
        });
    
        if (searchResponse.success && searchResponse.data?.data) {
          const fullOffer = searchResponse.data.data.find(
            (offer: any) => offer.id === offerId
          );
    
          if (fullOffer) {
            console.log('✅ Found full car offer from API');
            setDetailedCarData(fullOffer);
          } else {
            console.log('⚠️ Offer not found, using original item');
            setDetailedCarData(item);
          }
        } else {
          console.log('⚠️ API returned no data, using original item');
          setDetailedCarData(item);
        }
      } catch (err: any) {
        console.error('Failed to fetch car details:', err);
        setError(err.message || 'Unable to load car details');
        setDetailedCarData(item);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    
    fetchCarDetails();
  }, [item, searchParams, createdBooking]);

  if (!item && !detailedCarData) return null;

  // Use detailedCarData from API
  const carData = detailedCarData;
  
  // If we don't have API data, show nothing
  if (!carData) {
    return (
      <div className="bg-gray-50 min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
            <p className="text-yellow-800">No car data available</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Extract data directly from API response structure
  const vehicle = carData.vehicle || {};
  const serviceProvider = carData.serviceProvider || 
                         carData.partnerInfo?.serviceProvider || 
                         {};
  const partnerInfo = carData.partnerInfo || {};
  
  // Get image URL from API
  const carImage = vehicle.imageURL || carData.imageURL || partnerInfo.serviceProvider?.logoUrl || serviceProvider.logoUrl;
  
  const handleImageError = () => {
    setImageError(true);
    console.log('❌ Failed to load image from API:', carImage);
  };

  // Extract pickup and dropoff from API
  const pickupLocation = {
    code: carData.start?.locationCode || '',
    display: carData.start?.locationCode || '',
    dateTime: carData.start?.dateTime || ''
  };

  const dropoffLocation = {
    code: carData.end?.locationCode || '',
    display: carData.end?.locationCode || '',
    dateTime: carData.end?.dateTime || ''
  };

  // Calculate duration from API dates
  const calculateRentalDuration = (): { days: number; hours: number; minutes: number } => {
    if (!carData.start?.dateTime || !carData.end?.dateTime) {
      return { days: 0, hours: 0, minutes: 0 };
    }
    
    try {
      const startDate = new Date(carData.start.dateTime);
      const endDate = new Date(carData.end.dateTime);
      
      const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;
      const remainingMinutes = diffMinutes % 60;
      
      return {
        days: diffDays,
        hours: remainingHours,
        minutes: remainingMinutes
      };
    } catch {
      return { days: 0, hours: 0, minutes: 0 };
    }
  };

  const duration = calculateRentalDuration();
  const rentalDays = duration.days;
  const rentalHours = duration.hours;
  const rentalMinutes = duration.minutes;

  // Format date for display
  const formatDate = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      return format(date, 'dd MMM yyyy');
    } catch {
      return dateTimeStr;
    }
  };

  const formatTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '';
    try {
      const date = new Date(dateTimeStr);
      return format(date, 'hh:mm a');
    } catch {
      return dateTimeStr;
    }
  };

  // Vehicle specs from API
  const seats = vehicle.seats?.[0]?.count || 0;
  const baggage = vehicle.baggages?.reduce((total: number, bag: any) => 
    total + (bag.count || 0), 0) || 0;
  const vehicleCategory = vehicle.category || '';
  const vehicleCode = vehicle.code || '';
  const vehicleDescription = vehicle.description || '';
  
  // Pricing from API
  const basePrice = parseFloat(carData.base_price || carData.original_price || '0');
  const markupAmount = parseFloat(carData.markup_amount || '0');
  const serviceFee = parseFloat(carData.service_fee || '0');
  const taxes = markupAmount + serviceFee;
  const totalPrice = parseFloat(carData.final_price || '0') || (basePrice + taxes);
  const currencyCode = carData.currency || 'GBP';

  const pricePerDay = rentalDays > 0 ? basePrice / rentalDays : basePrice;
  
  const formattedBasePrice = basePrice > 0 ? `£${basePrice.toFixed(2)}` : '';
  const formattedTaxes = taxes > 0 ? `£${taxes.toFixed(2)}` : '';
  const formattedTotalPrice = totalPrice > 0 ? `£${totalPrice.toFixed(2)}` : '';
  const formattedPricePerDay = pricePerDay > 0 ? `£${pricePerDay.toFixed(2)}` : '';

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      alert('Please enter a promo code');
      return;
    }
    
    setIsLoadingDetails(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (promoCode.toUpperCase() === 'SAVE10') {
        setAppliedPromo({ code: 'SAVE10', discount: 10, type: 'percentage' });
        alert('Promo code applied! 10% discount');
      } else if (promoCode.toUpperCase() === 'CAR50') {
        setAppliedPromo({ code: 'CAR50', discount: 50, type: 'fixed' });
        alert('Promo code applied! £50 off');
      } else {
        alert('Invalid promo code');
        setAppliedPromo(null);
      }
    } catch (error) {
      console.error('Failed to apply promo:', error);
      alert('Failed to apply promo code');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getDiscountedTotal = (): number => {
    if (!appliedPromo) return totalPrice;
    
    if (appliedPromo.type === 'percentage') {
      return totalPrice * (1 - appliedPromo.discount / 100);
    } else {
      return Math.max(0, totalPrice - appliedPromo.discount);
    }
  };

  const discountedTotal = getDiscountedTotal();
  const formattedDiscountedTotal = discountedTotal > 0 ? `£${discountedTotal.toFixed(2)}` : '';

  // Only show if we have required data
  if (!pickupLocation.code || !dropoffLocation.code || !basePrice) {
    return (
      <div className="bg-gray-50 min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
            <p className="text-yellow-800">Incomplete car data from API</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation */}
        <button 
          onClick={onBack} 
          className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#33a8da] transition group"
          disabled={isLoadingDetails}
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back to Selection
        </button>

        {/* Loading Overlay */}
        {isLoadingDetails && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#33a8da] mb-4"></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Loading Car Details</h3>
              <p className="text-sm text-gray-500">Fetching from API...</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-red-800">API Error</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Booking Reference if available */}
        {createdBooking?.reference && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Booking Reference:</span> {createdBooking.reference}
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Information (65%) */}
          <div className="flex-1 space-y-6">
            
            {/* Main Car Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[340px]">
              <div className="md:w-1/3 flex items-center justify-center p-8 bg-gray-50/50">
                {carImage && !imageError ? (
                  <img 
                    src={carImage}
                    className="max-w-full max-h-48 object-contain transition-all duration-300 hover:scale-110" 
                    alt={vehicleDescription}
                    onError={handleImageError}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image from API</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                      {vehicleDescription || 'Vehicle from API'}
                    </h1>
                    {seats > 0 && (
                      <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-gray-500 flex-wrap">
                        <span>{seats} Passengers</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>Automatic</span>
                        {baggage > 0 && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17,14H15V12H17M13,14H11V12H13M9,14H7V12H9M17,10H15V8H17M13,10H11V8H13M9,10H7V8H9M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z" />
                              </svg>
                              {baggage}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Provider Info */}
                    {(serviceProvider.name || partnerInfo.serviceProvider?.name) && (
                      <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-gray-400 uppercase">Provided by</span>
                        <span className="text-sm font-black text-gray-900">
                          {serviceProvider.name || partnerInfo.serviceProvider?.name}
                        </span>
                        {serviceProvider.isPreferred && (
                          <span className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-1 rounded">
                            Preferred Partner
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Vehicle Code Badges */}
                    {(vehicleCode || vehicleCategory) && (
                      <div className="mt-3 flex items-center gap-2">
                        {vehicleCode && (
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                            {vehicleCode}
                          </span>
                        )}
                        {vehicleCategory && (
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                            {vehicleCategory}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Features Grid */}
                {(vehicleCode || vehicleCategory || seats > 0 || baggage > 0) && (
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {vehicleCode && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Vehicle Code</p>
                        <p className="text-sm font-bold text-gray-900">{vehicleCode}</p>
                      </div>
                    )}
                    {vehicleCategory && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Category</p>
                        <p className="text-sm font-bold text-gray-900">{vehicleCategory}</p>
                      </div>
                    )}
                    {seats > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Seats</p>
                        <p className="text-sm font-bold text-gray-900">{seats}</p>
                      </div>
                    )}
                    {baggage > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Baggage</p>
                        <p className="text-sm font-bold text-gray-900">{baggage}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Vehicle Description */}
                {vehicle.description && (
                  <div className="mt-6 p-4 bg-blue-50/50 rounded-lg">
                    <p className="text-sm text-gray-700 italic">"{vehicle.description}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pickup & Dropoff Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Trip Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pickup */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" strokeWidth={2} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 uppercase mb-1">Pickup Location</p>
                      <p className="text-sm font-bold text-gray-900">
                        {pickupLocation.code}
                      </p>
                      {pickupLocation.dateTime && (
                        <>
                          <p className="text-xs font-medium text-gray-600 mt-2">
                            {formatDate(pickupLocation.dateTime)}
                          </p>
                          <p className="text-xs font-bold text-gray-800">
                            {formatTime(pickupLocation.dateTime)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropoff */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" strokeWidth={2} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 uppercase mb-1">Dropoff Location</p>
                      <p className="text-sm font-bold text-gray-900">
                        {dropoffLocation.code}
                      </p>
                      {dropoffLocation.dateTime && (
                        <>
                          <p className="text-xs font-medium text-gray-600 mt-2">
                            {formatDate(dropoffLocation.dateTime)}
                          </p>
                          <p className="text-xs font-bold text-gray-800">
                            {formatTime(dropoffLocation.dateTime)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration Display */}
              {rentalDays > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-bold text-gray-700">Rental Duration</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-gray-900">
                        {rentalDays} day{rentalDays !== 1 ? 's' : ''}
                      </span>
                      {(rentalHours > 0 || rentalMinutes > 0) && (
                        <span className="text-xs font-medium text-gray-600 block">
                          {rentalHours > 0 && `${rentalHours} hour${rentalHours !== 1 ? 's' : ''}`}
                          {rentalHours > 0 && rentalMinutes > 0 && ' '}
                          {rentalMinutes > 0 && `${rentalMinutes} min`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Booking Summary */}
          <aside className="w-full lg:w-[440px] sticky top-24">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Booking Summary</h2>
                
                {/* Timeline with locations from API */}
                <div className="space-y-8 relative">
                  <div className="absolute left-[7px] top-[14px] bottom-[14px] w-px bg-gray-200"></div>
                  
                  {/* Pickup */}
                  <div className="flex items-start gap-6 relative">
                    <div className="w-4 h-4 rounded-full bg-green-500 mt-1 flex-shrink-0 z-10 border-4 border-white"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 uppercase">Pick Up</p>
                      <p className="text-xs font-bold text-gray-900 mt-1">
                        {pickupLocation.code}
                      </p>
                      {pickupLocation.dateTime && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {formatDate(pickupLocation.dateTime)} {formatTime(pickupLocation.dateTime)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dropoff */}
                  <div className="flex items-start gap-6 relative">
                    <div className="w-4 h-4 rounded-full bg-red-500 mt-1 flex-shrink-0 z-10 border-4 border-white"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 uppercase">Drop Off</p>
                      <p className="text-xs font-bold text-gray-900 mt-1">
                        {dropoffLocation.code}
                      </p>
                      {dropoffLocation.dateTime && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {formatDate(dropoffLocation.dateTime)} {formatTime(dropoffLocation.dateTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duration and Price Summary */}
                {rentalDays > 0 && basePrice > 0 && (
                  <div className="mt-10 grid grid-cols-2 gap-y-4">
                    <span className="text-sm font-bold text-gray-900">Duration</span>
                    <span className="text-sm font-bold text-gray-900 text-right">
                      {rentalDays} day{rentalDays !== 1 ? 's' : ''}
                      {rentalHours > 0 && ` ${rentalHours}h`}
                    </span>
                    
                    <span className="text-sm font-bold text-gray-900">Price per day</span>
                    <span className="text-sm font-bold text-gray-900 text-right">
                      {formattedPricePerDay}
                    </span>
                    
                    {carData.distance && (
                      <>
                        <span className="text-sm font-bold text-gray-900">Distance</span>
                        <span className="text-sm font-bold text-gray-900 text-right">
                          {carData.distance.value} {carData.distance.unit}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Fare Breakdown with Taxes */}
              {basePrice > 0 && (
                <div className="p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 mb-4 uppercase">Fare Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Base Fare {rentalDays > 0 ? `(${rentalDays} days)` : ''}</span>
                        <span className="text-gray-900">{formattedBasePrice}</span>
                      </div>
                      
                      {/* Taxes - Markup + Service fee combined */}
                      {taxes > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                          <span>Taxes</span>
                          <span className="text-gray-900">{formattedTaxes}</span>
                        </div>
                      )}
                      
                      {carData.conversion_fee && parseFloat(carData.conversion_fee) > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                          <span>Conversion Fee ({carData.conversion_fee_percentage}%)</span>
                          <span className="text-gray-900">
                            £{parseFloat(carData.conversion_fee).toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {appliedPromo && (
                        <div className="flex justify-between items-center text-xs font-bold text-green-600">
                          <span>Discount ({appliedPromo.code})</span>
                          <span>- {formattedDiscountedTotal}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                        <span>Total Fare</span>
                        <span className="text-lg font-black text-[#33a8da]">
                          {appliedPromo ? formattedDiscountedTotal : formattedTotalPrice}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 border-dashed border-t w-full"></div>

                  {/* Promo Code */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-900 uppercase">Promo Code</h3>
                    <div className="flex gap-2">
                      <input 
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter Promo Code" 
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-1 focus:ring-[#33a8da] outline-none transition-all"
                        disabled={isLoadingDetails}
                      />
                      <button 
                        onClick={handleApplyPromo}
                        disabled={isLoadingDetails || !promoCode.trim()}
                        className="px-6 py-3 border border-[#33a8da] text-[#33a8da] font-bold text-sm rounded-lg hover:bg-blue-50 transition active:scale-95 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedPromo && (
                      <p className="text-xs text-green-600 font-bold">
                        ✓ Promo code {appliedPromo.code} applied!
                      </p>
                    )}
                  </div>

                  {/* Book Button */}
                  <div className="pt-6 border-t border-gray-100">
                    <button 
                      onClick={handleSelectCar}
                      disabled={isLoadingDetails || !pickupLocation.code || !dropoffLocation.code}
                      className="w-full bg-[#33a8da] text-white font-black py-5 rounded-xl shadow-xl shadow-blue-500/10 hover:bg-[#2c98c7] transition active:scale-95 text-base uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingDetails ? 'Loading...' : 'Confirm & Book Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CarDetails;