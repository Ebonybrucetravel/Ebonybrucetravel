// components/CarDetails.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../lib/api';

interface CarDetailsProps {
  item: any;
  searchParams: any;
  onBack: () => void;
  onBook: () => void;
}

const CarDetails: React.FC<CarDetailsProps> = ({ 
  item, 
  searchParams, 
  onBack, 
  onBook 
}) => {
  const { currency } = useLanguage();
  const [promoCode, setPromoCode] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedCarData, setDetailedCarData] = useState<any>(item?.realData || null);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
  } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchCarDetails = async () => {
      if (!item) return;
      
      // If we already have full realData with vehicle and imageURL, use it
      if (item.realData?.vehicle?.imageURL || item.realData?.imageURL) {
        setDetailedCarData(item.realData);
        return;
      }
      
      setIsLoadingDetails(true);
      setError(null);
      setImageError(false);
      
      try {
        const offerId = item.id || item.realData?.offerId || item.realData?.id;
        
        if (!offerId) {
          throw new Error('No offer ID found');
        }

        // Extract search parameters from the correct locations
        // The searchParams from the parent component might be in different formats
        
        // Try to get pickup location from various sources
        let pickupLocationCode = 'LOS';
        let pickupDateTime = new Date().toISOString();
        let dropoffLocationCode = 'LOS';
        let dropoffDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        let passengers = 2;

        // Check searchParams structure from Home.tsx
        if (searchParams) {
          console.log('🔍 Search params received:', searchParams);
          
          // For car rentals, the params might be under carPickUp/carDropOff
          if (searchParams.carPickUp) {
            pickupLocationCode = searchParams.carPickUp;
            // Try to extract airport code from display name
            const match = searchParams.carPickUp.match(/\(([A-Z]{3})\)/);
            if (match) {
              pickupLocationCode = match[1];
            }
          }
          
          if (searchParams.carDropOff) {
            dropoffLocationCode = searchParams.carDropOff;
            const match = searchParams.carDropOff.match(/\(([A-Z]{3})\)/);
            if (match) {
              dropoffLocationCode = match[1];
            }
          } else {
            dropoffLocationCode = pickupLocationCode;
          }
          
          // Handle dates
          if (searchParams.pickUpDate) {
            const time = searchParams.pickUpTime || '10:00';
            pickupDateTime = `${searchParams.pickUpDate}T${time}:00`;
          }
          
          if (searchParams.dropOffDate) {
            const time = searchParams.dropOffTime || '10:00';
            dropoffDateTime = `${searchParams.dropOffDate}T${time}:00`;
          }
          
          if (searchParams.passengers) {
            passengers = parseInt(searchParams.passengers) || 2;
          }
        }

        // Also check if the item itself has the location data
        if (item.realData) {
          if (item.realData.pickupLocation) {
            pickupLocationCode = item.realData.pickupLocation;
          }
          if (item.realData.pickupDateTime) {
            pickupDateTime = item.realData.pickupDateTime;
          }
          if (item.realData.dropoffLocation) {
            dropoffLocationCode = item.realData.dropoffLocation;
          }
          if (item.realData.dropoffDateTime) {
            dropoffDateTime = item.realData.dropoffDateTime;
          }
        }

        console.log('📅 Using search params:', {
          pickupLocationCode,
          pickupDateTime,
          dropoffLocationCode,
          dropoffDateTime,
          passengers
        });

        // Search for cars with the same parameters to get the full offer with images
        const searchResponse = await api.carApi.searchCarRentals({
          pickupLocationCode,
          pickupDateTime,
          dropoffLocationCode,
          dropoffDateTime,
          currency: 'GBP',
          passengers
        });

        if (searchResponse.success && searchResponse.data?.data) {
          // Find the specific offer by ID
          const fullOffer = searchResponse.data.data.find(
            (offer: any) => offer.id === offerId
          );

          if (fullOffer) {
            console.log('✅ Found full car offer:', {
              id: fullOffer.id,
              pickup: fullOffer.start?.locationCode,
              dropoff: fullOffer.end?.locationCode,
              pickupTime: fullOffer.start?.dateTime,
              dropoffTime: fullOffer.end?.dateTime
            });
            setDetailedCarData(fullOffer);
          } else {
            setDetailedCarData(item.realData);
          }
        } else {
          setDetailedCarData(item.realData);
        }
      } catch (err: any) {
        console.error('Failed to fetch car details:', err);
        setError(err.message || 'Unable to load additional car details');
        setDetailedCarData(item.realData);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    
    fetchCarDetails();
  }, [item, searchParams]);

  if (!item && !detailedCarData) return null;

  // Use detailedCarData if available, otherwise fallback to item.realData or item
  const carData = detailedCarData || item.realData || item;
  
  // Extract all possible data structures
  const vehicle = carData.vehicle || {};
  const serviceProvider = carData.serviceProvider || 
                         carData.partnerInfo?.serviceProvider || 
                         {};
  const partnerInfo = carData.partnerInfo || {};
  
  // --- IMAGE HANDLING ---
  const getCarImage = (): string => {
    if (vehicle.imageURL) return vehicle.imageURL;
    if (carData.imageURL) return carData.imageURL;
    if (partnerInfo.serviceProvider?.logoUrl) return partnerInfo.serviceProvider.logoUrl;
    if (serviceProvider.logoUrl) return serviceProvider.logoUrl;
    if (item.image) return item.image;
    
    // Unsplash fallbacks by vehicle type
    if (vehicle.category === 'FC' || vehicle.code === 'FC') {
      return 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&q=80&w=600';
    } else if (vehicle.category === 'BU' || vehicle.code === 'BU') {
      return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
    } else if (vehicle.code === 'SUV') {
      return 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=600';
    } else if (vehicle.code === 'VAN') {
      return 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600';
    } else {
      return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
    }
  };

  const carImage = getCarImage();

  const handleImageError = () => {
    setImageError(true);
    console.log('❌ Failed to load image:', carImage);
  };

  const getFallbackImage = (): string => {
    if (vehicle.category === 'FC' || vehicle.code === 'FC') {
      return 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?auto=format&fit=crop&q=80&w=600';
    } else if (vehicle.category === 'BU' || vehicle.code === 'BU') {
      return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
    } else if (vehicle.code === 'SUV') {
      return 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=600';
    } else if (vehicle.code === 'VAN') {
      return 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600';
    } else {
      return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600';
    }
  };
  
  // --- EXTRACT PICKUP AND DROPOFF LOCATIONS CORRECTLY ---
  // Priority: 1. API response data, 2. item.realData, 3. searchParams, 4. defaults
  
  const getPickupLocation = (): { code: string; display: string; dateTime: string } => {
    // Try API response first
    if (carData.start?.locationCode) {
      return {
        code: carData.start.locationCode,
        display: carData.start.locationCode,
        dateTime: carData.start.dateTime || ''
      };
    }
    
    // Try item.realData
    if (item.realData?.pickupLocation) {
      return {
        code: item.realData.pickupLocation,
        display: item.realData.pickupLocation,
        dateTime: item.realData.pickupDateTime || ''
      };
    }
    
    // Try searchParams
    if (searchParams) {
      // Try to get the display name with airport code
      if (searchParams.carPickUp) {
        const display = searchParams.carPickUp;
        const match = display.match(/\(([A-Z]{3})\)/);
        const code = match ? match[1] : display.substring(0, 3).toUpperCase();
        
        // Construct dateTime
        let dateTime = '';
        if (searchParams.pickUpDate) {
          const time = searchParams.pickUpTime || '10:00';
          dateTime = `${searchParams.pickUpDate}T${time}:00`;
        }
        
        return { code, display, dateTime };
      }
    }
    
    return { code: 'LOS', display: 'Lagos (LOS)', dateTime: '' };
  };

  const getDropoffLocation = (): { code: string; display: string; dateTime: string } => {
    // Try API response first
    if (carData.end?.locationCode) {
      return {
        code: carData.end.locationCode,
        display: carData.end.locationCode,
        dateTime: carData.end.dateTime || ''
      };
    }
    
    // Try item.realData
    if (item.realData?.dropoffLocation) {
      return {
        code: item.realData.dropoffLocation,
        display: item.realData.dropoffLocation,
        dateTime: item.realData.dropoffDateTime || ''
      };
    }
    
    // Try searchParams
    if (searchParams) {
      if (searchParams.carDropOff) {
        const display = searchParams.carDropOff;
        const match = display.match(/\(([A-Z]{3})\)/);
        const code = match ? match[1] : display.substring(0, 3).toUpperCase();
        
        let dateTime = '';
        if (searchParams.dropOffDate) {
          const time = searchParams.dropOffTime || '10:00';
          dateTime = `${searchParams.dropOffDate}T${time}:00`;
        }
        
        return { code, display, dateTime };
      }
      
      // If no dropoff, use pickup
      if (searchParams.carPickUp) {
        const pickup = getPickupLocation();
        return { 
          code: pickup.code, 
          display: pickup.display,
          dateTime: pickup.dateTime
        };
      }
    }
    
    const pickup = getPickupLocation();
    return { code: pickup.code, display: pickup.display, dateTime: '' };
  };

  const pickupLocation = getPickupLocation();
  const dropoffLocation = getDropoffLocation();

  // --- CALCULATE RENTAL DURATION CORRECTLY ---
  const calculateRentalDuration = (): { days: number; hours: number; minutes: number; totalMinutes: number } => {
    // Try to get dates from various sources
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    // 1. From API response
    if (carData.start?.dateTime) {
      try {
        startDate = new Date(carData.start.dateTime);
      } catch (e) {}
    }
    
    if (carData.end?.dateTime) {
      try {
        endDate = new Date(carData.end.dateTime);
      } catch (e) {}
    }
    
    // 2. From item.realData
    if (!startDate && item.realData?.pickupDateTime) {
      try {
        startDate = new Date(item.realData.pickupDateTime);
      } catch (e) {}
    }
    
    if (!endDate && item.realData?.dropoffDateTime) {
      try {
        endDate = new Date(item.realData.dropoffDateTime);
      } catch (e) {}
    }
    
    // 3. From searchParams
    if (!startDate && searchParams) {
      if (searchParams.pickUpDate) {
        const time = searchParams.pickUpTime || '10:00';
        try {
          startDate = new Date(`${searchParams.pickUpDate}T${time}:00`);
        } catch (e) {}
      }
    }
    
    if (!endDate && searchParams) {
      if (searchParams.dropOffDate) {
        const time = searchParams.dropOffTime || '10:00';
        try {
          endDate = new Date(`${searchParams.dropOffDate}T${time}:00`);
        } catch (e) {}
      } else if (searchParams.pickUpDate) {
        // Default to 3 days after pickup
        const date = new Date(`${searchParams.pickUpDate}T10:00:00`);
        date.setDate(date.getDate() + 3);
        endDate = date;
      }
    }
    
    // 4. Default values
    if (!startDate) {
      startDate = new Date();
    }
    
    if (!endDate) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3);
    }
    
    const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    const remainingMinutes = diffMinutes % 60;
    
    return {
      days: Math.max(1, diffDays),
      hours: remainingHours,
      minutes: remainingMinutes,
      totalMinutes: diffMinutes
    };
  };

  const duration = calculateRentalDuration();
  const rentalDays = duration.days;
  const rentalHours = duration.hours;
  const rentalMinutes = duration.minutes;

  // Format date for display
  const formatDate = (dateTimeStr: string): string => {
    if (!dateTimeStr) return 'N/A';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return dateTimeStr;
    }
  };

  const formatTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return 'N/A';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return dateTimeStr;
    }
  };

  // Get display date/time strings
  const pickupDisplayDateTime = pickupLocation.dateTime || 
                                (searchParams?.pickUpDate ? `${searchParams.pickUpDate}T${searchParams.pickUpTime || '10:00'}:00` : '');
  
  const dropoffDisplayDateTime = dropoffLocation.dateTime || 
                                 (searchParams?.dropOffDate ? `${searchParams.dropOffDate}T${searchParams.dropOffTime || '10:00'}:00` : '');

  // Vehicle specs
  const seats = vehicle.seats?.[0]?.count || 4;
  const baggage = vehicle.baggages?.reduce((total: number, bag: any) => 
    total + (bag.count || 0), 0) || 2;
  const vehicleCategory = vehicle.category || carData.vehicleCategory || 'ST';
  const vehicleCode = vehicle.code || carData.vehicleCode || 'CAR';
  const vehicleDescription = vehicle.description || 
                            carData.vehicleType || 
                            item.title || 
                            'Luxury Vehicle';
  
  // --- PRICING ---
  let basePrice = 0;
  let currencyCode = 'GBP';
  
  // Try to get price from API response
  if (carData.final_price) {
    basePrice = parseFloat(carData.final_price);
    currencyCode = carData.currency || 'GBP';
  } else if (carData.converted?.monetaryAmount) {
    basePrice = parseFloat(carData.converted.monetaryAmount);
    currencyCode = carData.converted.currencyCode || 'GBP';
  } else if (carData.quotation?.monetaryAmount) {
    basePrice = parseFloat(carData.quotation.monetaryAmount);
    currencyCode = carData.quotation.currencyCode || 'GBP';
  } else if (carData.price?.total) {
    basePrice = parseFloat(carData.price.total);
    currencyCode = carData.price.currency || 'GBP';
  } else if (item.price) {
    // Parse from price string (e.g., "£494.76" or "₦731.00")
    const priceStr = item.price.toString();
    const numericMatch = priceStr.match(/[\d,.]+/);
    if (numericMatch) {
      basePrice = parseFloat(numericMatch[0].replace(/,/g, ''));
    }
    
    // Detect currency
    if (priceStr.includes('£')) currencyCode = 'GBP';
    else if (priceStr.includes('₦')) currencyCode = 'NGN';
    else if (priceStr.includes('€')) currencyCode = 'EUR';
    else if (priceStr.includes('$')) currencyCode = 'USD';
  }

  // Use currency from context or detected currency
  const displayCurrency = currency || { 
    symbol: currencyCode === 'GBP' ? '£' : 
           currencyCode === 'USD' ? '$' : 
           currencyCode === 'EUR' ? '€' : 
           currencyCode === 'NGN' ? '₦' : '£',
    code: currencyCode 
  };

  // Calculate price per day
  const pricePerDay = rentalDays > 0 ? basePrice / rentalDays : basePrice;
  
  const formattedBasePrice = `${displayCurrency.symbol}${basePrice.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
  
  const formattedPricePerDay = `${displayCurrency.symbol}${pricePerDay.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;

  // Handle promo code
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

  // Calculate discounted price
  const getDiscountedTotal = (): number => {
    if (!appliedPromo) return basePrice;
    
    if (appliedPromo.type === 'percentage') {
      return basePrice * (1 - appliedPromo.discount / 100);
    } else {
      return Math.max(0, basePrice - appliedPromo.discount);
    }
  };

  const discountedTotal = getDiscountedTotal();
  const formattedDiscountedTotal = `${displayCurrency.symbol}${discountedTotal.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;

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
              <p className="text-sm text-gray-500">Fetching the latest vehicle information...</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-yellow-800">Using cached car details</p>
              <p className="text-xs text-yellow-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column: Information (65%) */}
          <div className="flex-1 space-y-6">
            
            {/* Main Car Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[340px]">
              <div className="md:w-1/3 flex items-center justify-center p-8 bg-gray-50/50">
                <img 
                  src={!imageError ? carImage : getFallbackImage()}
                  className="max-w-full max-h-48 object-contain transition-all duration-300 hover:scale-110" 
                  alt={vehicleDescription}
                  onError={handleImageError}
                  loading="lazy"
                />
              </div>
              
              <div className="flex-1 p-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                      {vehicleDescription}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm font-semibold text-gray-500 flex-wrap">
                      <span>{seats} Passengers</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>Automatic</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17,14H15V12H17M13,14H11V12H13M9,14H7V12H9M17,10H15V8H17M13,10H11V8H13M9,10H7V8H9M19,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z" />
                        </svg>
                        {baggage}
                      </div>
                    </div>
                    
                    {/* Provider Info */}
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-gray-400 uppercase">Provided by</span>
                      <span className="text-sm font-black text-gray-900">
                        {serviceProvider.name || partnerInfo.serviceProvider?.name || 'Amadeus Cars'}
                      </span>
                      {serviceProvider.isPreferred && (
                        <span className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-1 rounded">
                          Preferred Partner
                        </span>
                      )}
                    </div>
                    
                    {/* Vehicle Code Badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                        {vehicleCode}
                      </span>
                      <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                        {vehicleCategory}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Features Grid */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Vehicle Code</p>
                    <p className="text-sm font-bold text-gray-900">{vehicleCode}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Category</p>
                    <p className="text-sm font-bold text-gray-900">
                      {vehicleCategory === 'FC' ? 'First Class' : 
                       vehicleCategory === 'BU' ? 'Business' : 
                       vehicleCategory === 'ST' ? 'Standard' : vehicleCategory}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Seats</p>
                    <p className="text-sm font-bold text-gray-900">{seats}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Baggage</p>
                    <p className="text-sm font-bold text-gray-900">{baggage}</p>
                  </div>
                </div>

                {/* Vehicle Description */}
                {vehicle.description && (
                  <div className="mt-6 p-4 bg-blue-50/50 rounded-lg">
                    <p className="text-sm text-gray-700 italic">"{vehicle.description}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pickup & Dropoff Details Card - CORRECTED */}
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
                        {pickupLocation.display}
                      </p>
                      {pickupDisplayDateTime && (
                        <>
                          <p className="text-xs font-medium text-gray-600 mt-2">
                            {formatDate(pickupDisplayDateTime)}
                          </p>
                          <p className="text-xs font-bold text-gray-800">
                            {formatTime(pickupDisplayDateTime)}
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
                        {dropoffLocation.display}
                      </p>
                      {dropoffDisplayDateTime && (
                        <>
                          <p className="text-xs font-medium text-gray-600 mt-2">
                            {formatDate(dropoffDisplayDateTime)}
                          </p>
                          <p className="text-xs font-bold text-gray-800">
                            {formatTime(dropoffDisplayDateTime)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration Display - CORRECTED */}
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
            </div>
          </div>

          {/* Right Column: Booking Summary (35%) - CORRECTED */}
          <aside className="w-full lg:w-[440px] sticky top-24">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Booking Summary</h2>
                
                {/* Timeline with CORRECT locations and times */}
                <div className="space-y-8 relative">
                  <div className="absolute left-[7px] top-[14px] bottom-[14px] w-px bg-gray-200"></div>
                  
                  {/* Pickup */}
                  <div className="flex items-start gap-6 relative">
                    <div className="w-4 h-4 rounded-full bg-green-500 mt-1 flex-shrink-0 z-10 border-4 border-white"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-900 uppercase">Pick Up</p>
                      <p className="text-xs font-bold text-gray-900 mt-1">
                        {pickupLocation.display}
                      </p>
                      {pickupDisplayDateTime && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {formatDate(pickupDisplayDateTime)} {formatTime(pickupDisplayDateTime)}
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
                        {dropoffLocation.display}
                      </p>
                      {dropoffDisplayDateTime && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          {formatDate(dropoffDisplayDateTime)} {formatTime(dropoffDisplayDateTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duration and Price Summary */}
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
              </div>

              {/* Fare Breakdown */}
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-4 uppercase">Fare Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                      <span>Base Fare ({rentalDays} days)</span>
                      <span className="text-gray-900">{formattedBasePrice}</span>
                    </div>
                    
                    {carData.conversion_fee && (
                      <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                        <span>Conversion Fee ({carData.conversion_fee_percentage}%)</span>
                        <span className="text-gray-900">
                          {displayCurrency.symbol}{parseFloat(carData.conversion_fee).toFixed(2)}
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
                        {appliedPromo ? formattedDiscountedTotal : formattedBasePrice}
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
                    onClick={onBook}
                    disabled={isLoadingDetails}
                    className="w-full bg-[#33a8da] text-white font-black py-5 rounded-xl shadow-xl shadow-blue-500/10 hover:bg-[#2c98c7] transition active:scale-95 text-base uppercase tracking-widest disabled:opacity-50"
                  >
                    {isLoadingDetails ? 'Loading...' : 'Confirm & Book Now'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CarDetails;