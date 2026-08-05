'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import toast from 'react-hot-toast';
import HotelDetails from '@/components/HotelDetails';

export default function HotelDetailsPage() {
  const router = useRouter();
  const { selectedItem, searchParams, persistSelectionForReturn } = useSearch();
  const [enrichedItem, setEnrichedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get data from sessionStorage first (set by SearchResults)
    const storedData = sessionStorage.getItem('selectedHotelDetails');
    
    console.log('🔍 HotelDetailsPage - Loading hotel data:', {
      hasStoredData: !!storedData,
      hasSelectedItem: !!selectedItem,
      selectedItemKeys: selectedItem ? Object.keys(selectedItem) : [],
    });
    
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        console.log('✅ Loaded hotel from sessionStorage:', {
          name: parsed.name || parsed.title,
          hasOffers: !!(parsed.offers?.length),
          hasOfferId: !!parsed.offerId,
          hasOffer_id: !!parsed.offer_id,
          hotelId: parsed.hotelId || parsed.id,
        });
        
        // ✅ Ensure we preserve all offer data
        const enriched = {
          ...parsed,
          hotelId: parsed.hotelId || parsed.id,
          hotel: parsed.hotel || {
            hotelId: parsed.hotelId || parsed.id,
            name: parsed.name || parsed.title,
            offers: parsed.offers || [],
          },
          offers: parsed.offers || [],
          offerId: parsed.offerId || parsed.offer_id || null,
          offer_id: parsed.offer_id || parsed.offerId || null,
          realData: {
            ...parsed.realData,
            offerId: parsed.realData?.offerId || parsed.offerId || parsed.offer_id || null,
          },
        };
        
        console.log('✅ Enriched from sessionStorage:', {
          id: enriched.id,
          name: enriched.name,
          hasOffers: !!(enriched.offers?.length),
          offerId: enriched.offerId,
          offer_id: enriched.offer_id,
        });
        
        setEnrichedItem(enriched);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Failed to parse sessionStorage data:', e);
      }
    }

    // Fallback to selectedItem from context
    if (selectedItem) {
      console.log('✅ Using selectedItem from context:', {
        title: selectedItem.title,
        hasOffers: !!(selectedItem as any).offers?.length,
        hasOfferId: !!(selectedItem as any).offerId,
        hasOffer_id: !!(selectedItem as any).offer_id,
        hasHotelOffers: !!((selectedItem as any).hotel?.offers?.length),
      });
      
      const itemAny = selectedItem as any;
      const hotelData = itemAny.hotel || {};
      
      // ✅ Extract offers from all possible sources
      const offers = itemAny.offers || hotelData.offers || [];
      
      // ✅ Extract offerId from all possible sources
      const offerId = itemAny.offerId || 
                     hotelData.offerId || 
                     itemAny.offer_id || 
                     hotelData.offer_id ||
                     itemAny.realData?.offerId ||
                     (offers.length > 0 ? offers[0]?.id : null);
      
      console.log('🔑 Extracted offer data:', {
        offerId,
        offersCount: offers.length,
        firstOfferId: offers.length > 0 ? offers[0]?.id : 'none',
      });
      
      const enriched = {
        ...selectedItem,
        hotelId: itemAny.hotelId || hotelData.hotelId || selectedItem.id,
        hotel: {
          ...hotelData,
          hotelId: hotelData.hotelId || selectedItem.id,
          name: hotelData.name || selectedItem.title,
          primaryImage: hotelData.primaryImage || itemAny.primaryImage || selectedItem.image,
          images: hotelData.images || itemAny.images || [],
          imageCategories: hotelData.imageCategories || itemAny.imageCategories || {},
          description: hotelData.description || itemAny.description,
          address: hotelData.address || itemAny.address,
          cityCode: hotelData.cityCode || itemAny.cityCode,
          offers: offers,
          offerId: offerId,
        },
        primaryImage: hotelData.primaryImage || itemAny.primaryImage || selectedItem.image,
        images: hotelData.images || itemAny.images || [],
        imageCategories: hotelData.imageCategories || itemAny.imageCategories || {},
        checkInDate: itemAny.checkInDate || searchParams?.checkInDate,
        checkOutDate: itemAny.checkOutDate || searchParams?.checkOutDate,
        adults: itemAny.adults || searchParams?.adults || 1,
        currency: itemAny.currency || searchParams?.currency || 'NGN',
        offers: offers,
        offerId: offerId,
        offer_id: offerId,
        amenities: itemAny.amenities || hotelData.amenities || [],
        address: itemAny.address || hotelData.address || '',
        cityCode: itemAny.cityCode || hotelData.cityCode || '',
        description: itemAny.description || hotelData.description || '',
        realData: {
          ...itemAny.realData,
          offerId: itemAny.realData?.offerId || offerId,
          offers: itemAny.realData?.offers || offers,
        },
        final_amount: itemAny.final_amount || hotelData.final_amount,
        final_price: itemAny.final_price || hotelData.final_price,
        totalAmount: itemAny.totalAmount || hotelData.totalAmount,
        originalPriceAmount: itemAny.originalPriceAmount || hotelData.originalPriceAmount,
        originalPriceCurrency: itemAny.originalPriceCurrency || hotelData.originalPriceCurrency || 'NGN',
        selectedRoom: itemAny.selectedRoom || hotelData.selectedRoom || null,
        priceBreakdown: itemAny.priceBreakdown || hotelData.priceBreakdown || null,
      };
      
      console.log('✅ Enriched item created:', {
        id: enriched.id,
        title: enriched.title,
        hasOffers: !!(enriched.offers?.length),
        offerId: enriched.offerId,
        offer_id: enriched.offer_id,
        hotelId: enriched.hotelId,
        hotelHasOffers: !!(enriched.hotel?.offers?.length),
        hotelOfferId: enriched.hotel?.offerId,
      });
      
      setEnrichedItem(enriched);
      setLoading(false);
      return;
    }

    console.warn('No hotel data found, redirecting to search');
    router.push('/search');
    setLoading(false);
  }, [selectedItem, searchParams, router]);

  // ✅ UPDATED: handleBook with bookingData parameter - PRESERVES DATES
  const handleBook = useCallback((bookingData?: any) => {
    console.log('🔄 handleBook called with:', {
      hasBookingData: !!bookingData,
      bookingDataTotalAmount: bookingData?.totalAmount,
      bookingDataSelectedRoom: bookingData?.selectedRoomType,
      bookingDataCheckIn: bookingData?.checkInDate || bookingData?.checkIn,
      bookingDataCheckOut: bookingData?.checkOutDate || bookingData?.checkOut,
      hasEnrichedItem: !!enrichedItem,
    });
    
    // ✅ If bookingData was passed from HotelDetails (with selected room data), USE IT!
    if (bookingData && bookingData.totalAmount && bookingData.totalAmount > 0) {
      console.log('✅✅✅ Using booking data from HotelDetails with price:', bookingData.totalAmount);
      console.log('✅✅✅ Selected room type:', bookingData.selectedRoomType);
      console.log('✅✅✅ Check-in:', bookingData.checkInDate || bookingData.checkIn);
      console.log('✅✅✅ Check-out:', bookingData.checkOutDate || bookingData.checkOut);
      
      // ✅ Ensure dates are preserved
      const enrichedBookingData = {
        ...bookingData,
        // ✅ Ensure dates are properly set
        checkInDate: bookingData.checkInDate || bookingData.checkIn,
        checkOutDate: bookingData.checkOutDate || bookingData.checkOut,
        // ✅ Ensure type is set
        type: 'hotels',
        provider: 'Premium Hotels',
        // ✅ Ensure all room data is preserved
        selectedRoomData: bookingData.selectedRoomData,
        selectedRoomType: bookingData.selectedRoomType || bookingData.selectedRoomData?.type,
        roomTypeName: bookingData.roomTypeName || bookingData.selectedRoomData?.name,
        // ✅ Preserve hotel data
        hotel: bookingData.hotel || {
          id: bookingData.hotelId,
          name: bookingData.hotelName,
        },
      };
      
      // ✅ Store the data with dates preserved
      sessionStorage.setItem('selectedHotelForBooking', JSON.stringify(enrichedBookingData));
      console.log('📦 Stored booking data from HotelDetails:', {
        totalAmount: enrichedBookingData.totalAmount,
        selectedRoomType: enrichedBookingData.selectedRoomType,
        checkInDate: enrichedBookingData.checkInDate,
        checkOutDate: enrichedBookingData.checkOutDate,
      });
      
      router.push('/booking/review');
      return;
    }
    
    // ✅ If no bookingData, use enrichedItem (fallback)
    let itemToUse = enrichedItem;
    
    if (!itemToUse) {
      console.warn('⚠️ No enrichedItem, trying sessionStorage...');
      const storedData = sessionStorage.getItem('selectedHotelDetails');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          console.log('✅ Retrieved from sessionStorage:', parsed.name || parsed.title);
          itemToUse = parsed;
        } catch (e) {
          console.error('Failed to parse sessionStorage:', e);
        }
      }
    }
    
    if (!itemToUse) {
      console.error('❌ No hotel data available!');
      toast.error('Hotel data is not available. Please go back and try again.');
      return;
    }
    
    console.log('🔄 Booking hotel (fallback):', itemToUse.name || itemToUse.title);
    
    // ✅ Get price from itemToUse
    let totalPrice = 0;
    let currency = itemToUse.currency || 'NGN';
    
    // Try to get price from various sources
    if (itemToUse.final_amount) {
      totalPrice = parseFloat(itemToUse.final_amount);
    } else if (itemToUse.totalAmount) {
      totalPrice = itemToUse.totalAmount;
    } else if (itemToUse.originalPriceAmount) {
      totalPrice = itemToUse.originalPriceAmount;
    } else if (itemToUse.price) {
      if (typeof itemToUse.price === 'string') {
        totalPrice = parseFloat(itemToUse.price.replace(/[^0-9.]/g, ''));
      } else if (typeof itemToUse.price === 'number') {
        totalPrice = itemToUse.price;
      }
    }
    
    // If still no price, use a default
    if (totalPrice === 0) {
      totalPrice = 100000; // Default fallback
      console.warn('⚠️ No price found, using default:', totalPrice);
    }
    
    // ============================================================
    // ✅ ENHANCED: Extract offer ID from ALL possible sources
    // ============================================================
    let offerId = '';
    let offers: any[] = [];
    
    console.log('🔍 DEBUG - Extracting offer ID from itemToUse:', {
      hasOffers: !!(itemToUse.offers?.length),
      hasOfferId: !!itemToUse.offerId,
      hasOffer_id: !!itemToUse.offer_id,
      hasHotelData: !!itemToUse.hotelData,
      hasRealData: !!itemToUse.realData,
      hasHotelOffers: !!(itemToUse.hotel?.offers?.length),
      itemKeys: Object.keys(itemToUse),
    });
    
    // Source 1: Check itemToUse.offers
    if (itemToUse.offers && Array.isArray(itemToUse.offers) && itemToUse.offers.length > 0) {
      offers = itemToUse.offers;
      offerId = itemToUse.offers[0]?.id || '';
      console.log('🔑 Source 1 - itemToUse.offers:', { offerId, count: offers.length });
    }
    
    // Source 2: Check hotel.offers
    if (!offerId && itemToUse.hotel?.offers && Array.isArray(itemToUse.hotel.offers) && itemToUse.hotel.offers.length > 0) {
      offers = itemToUse.hotel.offers;
      offerId = itemToUse.hotel.offers[0]?.id || '';
      console.log('🔑 Source 2 - hotel.offers:', { offerId, count: offers.length });
    }
    
    // Source 3: Check hotelData.offers
    if (!offerId && itemToUse.hotelData?.offers && Array.isArray(itemToUse.hotelData.offers) && itemToUse.hotelData.offers.length > 0) {
      offers = itemToUse.hotelData.offers;
      offerId = itemToUse.hotelData.offers[0]?.id || '';
      console.log('🔑 Source 3 - hotelData.offers:', { offerId, count: offers.length });
    }
    
    // Source 4: Check realData.offerId
    if (!offerId && itemToUse.realData?.offerId) {
      offerId = itemToUse.realData.offerId;
      console.log('🔑 Source 4 - realData.offerId:', offerId);
    }
    
    // Source 5: Check itemToUse.offerId
    if (!offerId && itemToUse.offerId) {
      offerId = itemToUse.offerId;
      console.log('🔑 Source 5 - itemToUse.offerId:', offerId);
    }
    
    // Source 6: Check itemToUse.offer_id
    if (!offerId && itemToUse.offer_id) {
      offerId = itemToUse.offer_id;
      console.log('🔑 Source 6 - itemToUse.offer_id:', offerId);
    }
    
    // Source 7: Check hotel.offerId
    if (!offerId && itemToUse.hotel?.offerId) {
      offerId = itemToUse.hotel.offerId;
      console.log('🔑 Source 7 - hotel.offerId:', offerId);
    }
    
    // Source 8: Check hotelData.offerId
    if (!offerId && itemToUse.hotelData?.offerId) {
      offerId = itemToUse.hotelData.offerId;
      console.log('🔑 Source 8 - hotelData.offerId:', offerId);
    }
    
    // Source 9: Check if the ID itself is an offer ID
    if (!offerId && itemToUse.id && typeof itemToUse.id === 'string') {
      if (itemToUse.id.startsWith('offer_') || itemToUse.id.includes('offer')) {
        offerId = itemToUse.id;
        console.log('🔑 Source 9 - itemToUse.id (looks like offer):', offerId);
      }
    }
    
    // Source 10: Check hotel.id if it looks like an offer
    if (!offerId && itemToUse.hotel?.id && typeof itemToUse.hotel.id === 'string') {
      if (itemToUse.hotel.id.startsWith('offer_') || itemToUse.hotel.id.includes('offer')) {
        offerId = itemToUse.hotel.id;
        console.log('🔑 Source 10 - hotel.id (looks like offer):', offerId);
      }
    }
    
    // Source 11: Check sessionStorage for hotelOfferId
    if (!offerId && typeof window !== 'undefined') {
      const storedOfferId = sessionStorage.getItem('hotelOfferId');
      if (storedOfferId) {
        offerId = storedOfferId;
        console.log('🔑 Source 11 - sessionStorage.hotelOfferId:', offerId);
      }
    }
    
    // Source 12: Check sessionStorage for selectedHotelDetails
    if (!offerId && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('selectedHotelDetails');
      if (stored) {
        try {
          const storedData = JSON.parse(stored);
          const storedOfferId = storedData.offerId || 
                               storedData.offer_id ||
                               storedData.offers?.[0]?.id ||
                               storedData.hotel?.offers?.[0]?.id;
          if (storedOfferId) {
            offerId = storedOfferId;
            offers = storedData.offers || storedData.hotel?.offers || [];
            console.log('🔑 Source 12 - sessionStorage.selectedHotelDetails:', offerId);
          }
        } catch (e) {
          console.error('Failed to parse sessionStorage:', e);
        }
      }
    }
    
    // Source 13: Deep search for any array with objects that have an id field
    if (!offerId) {
      const possibleOfferArrays = [
        itemToUse.offers,
        itemToUse.hotel?.offers,
        itemToUse.hotelData?.offers,
        itemToUse.realData?.offers,
        itemToUse.hotel?.roomTypes?.flatMap((rt: any) => rt.offers || []),
        itemToUse.roomTypes?.flatMap((rt: any) => rt.offers || []),
      ];
      
      for (const arr of possibleOfferArrays) {
        if (Array.isArray(arr) && arr.length > 0) {
          const firstItem = arr[0];
          if (firstItem && typeof firstItem === 'object' && firstItem.id) {
            offerId = firstItem.id;
            offers = arr;
            console.log('🔑 Source 13 - Found in array with id field:', { offerId });
            break;
          }
        }
      }
    }
    
    // ✅ If no offer ID found, show error
    if (!offerId) {
      console.error('❌ No valid offer ID found! Hotel data:', {
        hotelId: itemToUse.hotelId || itemToUse.id,
        hasOffers: !!offers.length,
        offersCount: offers.length,
        name: itemToUse.name || itemToUse.title,
        fullItem: JSON.stringify(itemToUse, null, 2),
      });
      
      toast.error(
        'Unable to find a valid hotel offer. Please go back and search for hotels again.',
        { duration: 5000 }
      );
      return;
    }
    
    console.log('✅ Final offerId found:', offerId);
    console.log('📦 Hotel data for booking:', {
      hotelId: itemToUse.hotelId || itemToUse.id,
      offerId: offerId,
      offersCount: offers.length,
      name: itemToUse.name || itemToUse.title,
    });
    
    // ✅ Create price breakdown
    const priceBreakdown = {
      basePrice: totalPrice / 1.15,
      markupAmount: totalPrice * 0.10,
      markupPercentage: 10,
      serviceFee: 5000,
      serviceFeePercentage: 0,
      taxes: totalPrice * 0.05,
      taxPercentage: 5,
      totalAmount: totalPrice,
      currency: currency,
      breakdown: `Base: ${(totalPrice / 1.15).toFixed(2)} + Markup: ${(totalPrice * 0.10).toFixed(2)} + Service Fee: 5000 = ${totalPrice.toFixed(2)}`,
      offerId: offerId,
    };
    
    const hotelForBooking = {
      id: itemToUse.id,
      hotelId: itemToUse.hotelId || itemToUse.id,
      name: itemToUse.name || itemToUse.title,
      title: itemToUse.title,
      subtitle: itemToUse.subtitle,
      image: itemToUse.image,
      primaryImage: itemToUse.primaryImage || itemToUse.image,
      images: itemToUse.images || [],
      imageCategories: itemToUse.imageCategories || {},
      price: `${currency} ${totalPrice.toFixed(2)}`,
      originalPriceAmount: itemToUse.originalPriceAmount || totalPrice,
      originalPriceCurrency: itemToUse.originalPriceCurrency || currency,
      currency: currency,
      rating: itemToUse.rating || 4,
      description: itemToUse.description || itemToUse.subtitle,
      address: itemToUse.address || '',
      cityCode: itemToUse.cityCode || '',
      checkInDate: itemToUse.checkInDate || searchParams?.checkInDate || '',
      checkOutDate: itemToUse.checkOutDate || searchParams?.checkOutDate || '',
      nights: itemToUse.nights || 1,
      guests: itemToUse.adults || searchParams?.adults || 1,
      rooms: itemToUse.rooms || searchParams?.roomQuantity || 1,
      amenities: itemToUse.amenities || [],
      offers: offers,
      offerId: offerId,
      offer_id: offerId,
      provider: itemToUse.provider || 'amadeus',
      type: 'hotels',
      priceBreakdown: priceBreakdown,
      basePrice: priceBreakdown.basePrice,
      totalAmount: priceBreakdown.totalAmount,
      final_amount: priceBreakdown.totalAmount.toString(),
      final_price: priceBreakdown.totalAmount.toString(),
      markupAmount: priceBreakdown.markupAmount,
      serviceFee: priceBreakdown.serviceFee,
      taxes: priceBreakdown.taxes.toString(),
      breakdown: priceBreakdown.breakdown,
      hotelData: {
        ...itemToUse,
        primaryImage: itemToUse.primaryImage || itemToUse.image,
        images: itemToUse.images || [],
        imageCategories: itemToUse.imageCategories || {},
        priceBreakdown: priceBreakdown,
        offers: offers,
        offerId: offerId,
        offer_id: offerId,
      },
      realData: {
        ...itemToUse.realData,
        offerId: offerId,
      }
    };

    // ✅ Store in sessionStorage
    sessionStorage.setItem('selectedHotelForBooking', JSON.stringify(hotelForBooking));
    sessionStorage.setItem('selectedItem', JSON.stringify(hotelForBooking));
    sessionStorage.setItem('hotelOfferId', offerId);
    
    router.push('/booking/review');
  }, [enrichedItem, searchParams, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#33a8da] mb-6"></div>
          <p className="text-gray-500">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (!enrichedItem) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Hotel Not Found</h1>
        <p className="text-gray-600 mb-8">Please select a hotel from the search results.</p>
        <button 
          onClick={() => router.push('/search')} 
          className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition"
        >
          Back to Search
        </button>
      </div>
    );
  }

  const hotelSearchParams = {
    type: 'hotels' as const,
    checkInDate: enrichedItem.checkInDate || searchParams?.checkInDate || '',
    checkOutDate: enrichedItem.checkOutDate || searchParams?.checkOutDate || '',
    adults: enrichedItem.adults || searchParams?.adults || 1,
    guests: enrichedItem.adults || searchParams?.adults || 1,
    destination: enrichedItem.cityCode || searchParams?.destination || '',
    cityCode: enrichedItem.cityCode || searchParams?.cityCode || '',
    roomQuantity: enrichedItem.rooms || searchParams?.roomQuantity || 1,
    currency: enrichedItem.currency || searchParams?.currency || 'NGN',
    ...searchParams,
  };

  return (
    <HotelDetails
      item={enrichedItem}
      searchParams={hotelSearchParams}
      onBack={() => router.push('/search')}
      onBook={handleBook}
    />
  );
}