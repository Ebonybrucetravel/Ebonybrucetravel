'use client';
import React, { useEffect, useState, useCallback } from 'react';
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
  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();
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
  
  // State for converted prices
  const [convertedPrices, setConvertedPrices] = useState({
    basePrice: 0,
    taxes: 0,
    totalPrice: 0,
    pricePerDay: 0,
    discountedTotal: 0,
    formattedBasePrice: '',
    formattedTaxes: '',
    formattedTotalPrice: '',
    formattedPricePerDay: '',
    formattedDiscountedTotal: '',
    formattedConversionFee: '',
    originalCurrency: 'GBP',
    originalAmount: 0,
    conversionFee: 0,
    conversionPercentage: 0
  });
  const [isConverting, setIsConverting] = useState(false);

  // Helper function to extract original price and currency
  const extractOriginalPriceInfo = (carData: any) => {
    let amount = 0;
    let currencyCode = 'GBP';
    
    // Check for original_price field
    if (carData.original_price) {
      amount = parseFloat(carData.original_price);
      currencyCode = carData.original_currency || 'GBP';
    }
    // Check for base_price field
    else if (carData.base_price) {
      amount = parseFloat(carData.base_price);
      currencyCode = carData.original_currency || 'GBP';
    }
    // Check for final_price field
    else if (carData.final_price) {
      amount = parseFloat(carData.final_price);
      currencyCode = carData.currency || 'GBP';
    }
    // Check for price string
    else if (carData.price) {
      const priceStr = String(carData.price);
      if (priceStr.includes('£')) currencyCode = 'GBP';
      else if (priceStr.includes('$')) currencyCode = 'USD';
      else if (priceStr.includes('€')) currencyCode = 'EUR';
      else if (priceStr.includes('₦')) currencyCode = 'NGN';
      
      const match = priceStr.match(/[\d,.]+/);
      if (match) {
        amount = parseFloat(match[0].replace(/,/g, ''));
      }
    }
    
    return { amount, currency: currencyCode };
  };

  // Handle apply promo
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

  // Convert all prices when currency changes or car data loads
  useEffect(() => {
    const convertAllPrices = async () => {
      if (!detailedCarData) return;
      
      setIsConverting(true);
      try {
        const carData = detailedCarData;
        
        // Extract original price info
        const { amount: originalAmount, currency: originalCurrency } = extractOriginalPriceInfo(carData);
        
        // Get base price components
        const basePriceOriginal = parseFloat(carData.base_price || carData.original_price || '0');
        const markupAmount = parseFloat(carData.markup_amount || '0');
        const serviceFee = parseFloat(carData.service_fee || '0');
        const taxesOriginal = markupAmount + serviceFee;
        const totalPriceOriginal = parseFloat(carData.final_price || '0') || (basePriceOriginal + taxesOriginal);
        const conversionFeeOriginal = parseFloat(carData.conversion_fee || '0');
        const conversionPercentage = carData.conversion_fee_percentage || 0;
        
        // Convert to user's currency if needed
        let basePriceConverted = basePriceOriginal;
        let taxesConverted = taxesOriginal;
        let totalPriceConverted = totalPriceOriginal;
        let conversionFeeConverted = conversionFeeOriginal;
        let pricePerDayConverted = 0;
        
        // Calculate rental days
        let rentalDays = 0;
        if (carData.start?.dateTime && carData.end?.dateTime) {
          try {
            const startDate = new Date(carData.start.dateTime);
            const endDate = new Date(carData.end.dateTime);
            const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            rentalDays = Math.floor(diffHours / 24);
            if (rentalDays === 0 && diffHours > 0) rentalDays = 1;
          } catch (e) {
            rentalDays = 1;
          }
        }
        
        // Perform conversion if needed
        if (originalCurrency !== currency.code && originalAmount > 0) {
          basePriceConverted = await convertPrice(basePriceOriginal, originalCurrency);
          if (taxesOriginal > 0) taxesConverted = await convertPrice(taxesOriginal, originalCurrency);
          totalPriceConverted = await convertPrice(totalPriceOriginal, originalCurrency);
          if (conversionFeeOriginal > 0) conversionFeeConverted = await convertPrice(conversionFeeOriginal, originalCurrency);
          
          console.log(`💰 CarDetails - Converted ${originalCurrency} ${basePriceOriginal.toFixed(2)} → ${currency.code} ${basePriceConverted.toFixed(2)}`);
        }
        
        // Calculate price per day
        if (rentalDays > 0) {
          pricePerDayConverted = totalPriceConverted / rentalDays;
        }
        
        // Calculate discounted total if promo applied
        let discountedTotalConverted = totalPriceConverted;
        if (appliedPromo) {
          if (appliedPromo.type === 'percentage') {
            discountedTotalConverted = totalPriceConverted * (1 - appliedPromo.discount / 100);
          } else {
            discountedTotalConverted = Math.max(0, totalPriceConverted - appliedPromo.discount);
          }
        }
        
        // Format prices
        const formattedBasePrice = await formatPrice(basePriceConverted);
        const formattedTaxes = await formatPrice(taxesConverted);
        const formattedTotalPrice = await formatPrice(totalPriceConverted);
        const formattedPricePerDay = await formatPrice(pricePerDayConverted);
        const formattedDiscountedTotal = await formatPrice(discountedTotalConverted);
        const formattedConversionFee = conversionFeeConverted > 0 ? await formatPrice(conversionFeeConverted) : '';
        
        setConvertedPrices({
          basePrice: basePriceConverted,
          taxes: taxesConverted,
          totalPrice: totalPriceConverted,
          pricePerDay: pricePerDayConverted,
          discountedTotal: discountedTotalConverted,
          formattedBasePrice,
          formattedTaxes,
          formattedTotalPrice,
          formattedPricePerDay,
          formattedDiscountedTotal,
          formattedConversionFee,
          originalCurrency,
          originalAmount,
          conversionFee: conversionFeeConverted,
          conversionPercentage
        });
        
      } catch (error) {
        console.error('Failed to convert car prices:', error);
      } finally {
        setIsConverting(false);
      }
    };
    
    convertAllPrices();
  }, [detailedCarData, currency.code, convertPrice, formatPrice, appliedPromo]);

  const handleSelectCar = useCallback(async () => {
    // Get current car data (either detailed or original)
    const currentCarData = detailedCarData || item;
    
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
    
    // Create complete booking with converted prices
    const completeBooking = {
      ...currentCarData,
      
      // Converted values
      currency: currency.code,
      originalPriceAmount: convertedPrices.originalAmount,
      originalPriceCurrency: convertedPrices.originalCurrency,
      
      // Calculated numeric values (converted)
      calculatedBasePrice: convertedPrices.basePrice,
      calculatedMarkup: convertedPrices.taxes,
      calculatedServiceFee: 0,
      calculatedTaxes: convertedPrices.taxes,
      calculatedConversionFee: convertedPrices.conversionFee,
      calculatedTotal: convertedPrices.totalPrice,
      
      // Formatted strings for display
      displayBasePrice: convertedPrices.formattedBasePrice,
      displayTaxes: convertedPrices.formattedTaxes,
      displayConversionFee: convertedPrices.formattedConversionFee,
      displayConversionPercentage: convertedPrices.conversionPercentage,
      displayTotalPrice: convertedPrices.formattedTotalPrice,
      
      // Vehicle details
      vehicle: vehicle,
      pickupLocation: pickupLocation,
      dropoffLocation: dropoffLocation,
      
      // Booking metadata
      type: 'car-rentals' as const,
      status: 'Pending',
      
      bookingData: {
        ...currentCarData.bookingData,
        vehicleCode,
        vehicleCategory,
        seats,
        baggage,
        basePrice: convertedPrices.basePrice,
        taxes: convertedPrices.taxes,
        conversionFee: convertedPrices.conversionFee,
        conversionPercentage: convertedPrices.conversionPercentage,
        totalPrice: convertedPrices.totalPrice,
        formattedBasePrice: convertedPrices.formattedBasePrice,
        formattedTaxes: convertedPrices.formattedTaxes,
        formattedConversionFee: convertedPrices.formattedConversionFee,
        formattedTotalPrice: convertedPrices.formattedTotalPrice,
        originalCurrency: convertedPrices.originalCurrency,
        convertedCurrency: currency.code
      }
    };
  
    console.log('3. Complete booking object with converted prices:', {
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
  }, [detailedCarData, item, currency.code, convertedPrices, selectItem, router]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // If we have createdBooking from the API, use it directly
    if (createdBooking) {
      console.log('✅ Using created booking data:', createdBooking);
      setDetailedCarData({
        ...item?.realData,
        ...createdBooking.bookingData,
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
        console.log('✅ Using existing car data from search results');
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
    
        let pickupLocationCode = item.start?.locationCode || item.pickupLocation;
        let pickupDateTime = item.start?.dateTime || item.pickupDateTime;
        let dropoffLocationCode = item.end?.locationCode || item.dropoffLocation;
        let dropoffDateTime = item.end?.dateTime || item.dropoffDateTime;
        let passengers = item.seats || 2;
    
        if (!pickupLocationCode || !pickupDateTime || !dropoffLocationCode || !dropoffDateTime) {
          console.error('❌ Missing required car rental parameters');
          setError('This car rental offer is missing location or date information.');
          setIsLoadingDetails(false);
          return;
        }
    
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
            setDetailedCarData(item);
          }
        } else {
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

  const carData = detailedCarData;
  
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
  
  const vehicle = carData.vehicle || {};
  const serviceProvider = carData.serviceProvider || carData.partnerInfo?.serviceProvider || {};
  const partnerInfo = carData.partnerInfo || {};
  const carImage = vehicle.imageURL || carData.imageURL || partnerInfo.serviceProvider?.logoUrl || serviceProvider.logoUrl;
  
  const handleImageError = () => {
    setImageError(true);
  };

  const pickupLocation = {
    code: carData.start?.locationCode || '',
    dateTime: carData.start?.dateTime || ''
  };

  const dropoffLocation = {
    code: carData.end?.locationCode || '',
    dateTime: carData.end?.dateTime || ''
  };

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

  const seats = vehicle.seats?.[0]?.count || 0;
  const baggage = vehicle.baggages?.reduce((total: number, bag: any) => total + (bag.count || 0), 0) || 0;
  const vehicleCategory = vehicle.category || '';
  const vehicleCode = vehicle.code || '';
  const vehicleDescription = vehicle.description || '';

  // Show loading while converting
  if ((isLoadingRates || isConverting) && !convertedPrices.formattedTotalPrice) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading prices in {currency.code}...</p>
        </div>
      </div>
    );
  }

  if (!pickupLocation.code || !dropoffLocation.code) {
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

        {isLoadingDetails && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#33a8da] mb-4"></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Loading Car Details</h3>
              <p className="text-sm text-gray-500">Fetching from API...</p>
            </div>
          </div>
        )}

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

        {createdBooking?.reference && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Booking Reference:</span> {createdBooking.reference}
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column */}
          <div className="flex-1 space-y-6">
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
                    <span className="text-gray-400 text-xs">No image available</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 p-8">
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                  {vehicleDescription || 'Vehicle'}
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
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Trip Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M5 13l4 4L19 7" strokeWidth={2} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 uppercase mb-1">Pickup Location</p>
                      <p className="text-sm font-bold text-gray-900">{pickupLocation.code}</p>
                      {pickupLocation.dateTime && (
                        <>
                          <p className="text-xs font-medium text-gray-600 mt-2">{formatDate(pickupLocation.dateTime)}</p>
                          <p className="text-xs font-bold text-gray-800">{formatTime(pickupLocation.dateTime)}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" strokeWidth={2} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 uppercase mb-1">Dropoff Location</p>
                      <p className="text-sm font-bold text-gray-900">{dropoffLocation.code}</p>
                      {dropoffLocation.dateTime && (
                        <>
                          <p className="text-xs font-medium text-gray-600 mt-2">{formatDate(dropoffLocation.dateTime)}</p>
                          <p className="text-xs font-bold text-gray-800">{formatTime(dropoffLocation.dateTime)}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

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
                      {rentalHours > 0 && (
                        <span className="text-xs font-medium text-gray-600 block">
                          {rentalHours} hour{rentalHours !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Booking Summary */}
          <aside className="w-full lg:w-[440px] sticky top-24">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Booking Summary</h2>
                
                <div className="space-y-8 relative">
                  <div className="absolute left-[7px] top-[14px] bottom-[14px] w-px bg-gray-200"></div>
                  
                  <div className="flex items-start gap-6 relative">
                    <div className="w-4 h-4 rounded-full bg-green-500 mt-1 flex-shrink-0 z-10 border-4 border-white"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 uppercase">Pick Up</p>
                      <p className="text-xs font-bold text-gray-900 mt-1">{pickupLocation.code}</p>
                      {pickupLocation.dateTime && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {formatDate(pickupLocation.dateTime)} {formatTime(pickupLocation.dateTime)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-6 relative">
                    <div className="w-4 h-4 rounded-full bg-red-500 mt-1 flex-shrink-0 z-10 border-4 border-white"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 uppercase">Drop Off</p>
                      <p className="text-xs font-bold text-gray-900 mt-1">{dropoffLocation.code}</p>
                      {dropoffLocation.dateTime && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {formatDate(dropoffLocation.dateTime)} {formatTime(dropoffLocation.dateTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {rentalDays > 0 && convertedPrices.basePrice > 0 && (
                  <div className="mt-10 grid grid-cols-2 gap-y-4">
                    <span className="text-sm font-bold text-gray-900">Duration</span>
                    <span className="text-sm font-bold text-gray-900 text-right">
                      {rentalDays} day{rentalDays !== 1 ? 's' : ''}
                    </span>
                    
                    <span className="text-sm font-bold text-gray-900">Price per day</span>
                    <span className="text-sm font-bold text-gray-900 text-right">
                      {convertedPrices.formattedPricePerDay}
                    </span>
                  </div>
                )}
              </div>

              {convertedPrices.basePrice > 0 && (
                <div className="p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 mb-4 uppercase">Fare Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Base Fare {rentalDays > 0 ? `(${rentalDays} days)` : ''}</span>
                        <span className="text-gray-900">{convertedPrices.formattedBasePrice}</span>
                      </div>
                      
                      {convertedPrices.taxes > 0 && (
                        <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                          <span>Taxes</span>
                          <span className="text-gray-900">{convertedPrices.formattedTaxes}</span>
                        </div>
                      )}
                      
                      {convertedPrices.formattedConversionFee && (
                        <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                          <span>Conversion Fee ({convertedPrices.conversionPercentage}%)</span>
                          <span className="text-gray-900">{convertedPrices.formattedConversionFee}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                        <span>Total Fare</span>
                        <span className="text-lg font-black text-[#33a8da]">
                          {convertedPrices.formattedTotalPrice}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 border-dashed border-t w-full"></div>

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

                  <div className="pt-6 border-t border-gray-100">
                    <button 
                      onClick={handleSelectCar}
                      disabled={isLoadingDetails || !pickupLocation.code || !dropoffLocation.code || isConverting}
                      className="w-full bg-[#33a8da] text-white font-black py-5 rounded-xl shadow-xl shadow-blue-500/10 hover:bg-[#2c98c7] transition active:scale-95 text-base uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConverting ? 'Converting...' : isLoadingDetails ? 'Loading...' : 'Confirm & Book Now'}
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