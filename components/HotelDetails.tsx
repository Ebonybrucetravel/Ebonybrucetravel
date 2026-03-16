'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { SearchResult, SearchParams } from '../lib/types';
import api from '../lib/api';

interface HotelDetailsProps {
  item: SearchResult | null;
  searchParams: SearchParams | null;
  onBack: () => void;
  onBook: () => void;
  onFetchImages?: (hotelId: string, hotelName?: string) => Promise<any[]>;
  onFetchSuggestions?: (query: string) => Promise<any[]>;
}

interface HotelImage {
  id: string;
  url: string;
  caption?: string;
  type?: string;
}

interface Suggestion {
  id: string;
  name: string;
  location?: string;
  price?: number;
  rating?: number;
  image?: string;
}

const HotelDetails: React.FC<HotelDetailsProps> = ({
  item,
  searchParams,
  onBack,
  onBook,
  onFetchImages,
  onFetchSuggestions
}) => {
  const { currency } = useLanguage();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('Overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [hotelImages, setHotelImages] = useState<HotelImage[]>(() => {
    if (item?.image && !item.image.includes('placehold.co')) {
      return [{
        id: `${item.id}-initial`,
        url: item.image,
        caption: item.title || 'Hotel Image',
        type: 'initial'
      }];
    }
    return [];
  });
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Wishlist/Saved Items States
  const [isSaved, setIsSaved] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNotes, setSaveNotes] = useState('');
  const [isCheckingSave, setIsCheckingSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // States for suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // States for hotel details and images
  const [fullDetails, setFullDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(false);



  // Check if item is saved when component loads
  useEffect(() => {
    if (isLoggedIn && item?.id) {
      checkIfSaved();
    }
  }, [isLoggedIn, item?.id]);


  // Check if current hotel is in wishlist
  const checkIfSaved = async () => {
    if (!item?.id) return;

    try {
      setIsCheckingSave(true);

      // Get all saved items and filter client-side
      const response = await api.userApi.getSavedItems();

      // Handle the response properly - check if response has data property
      const savedItems = response && typeof response === 'object' && 'data' in response
        ? (response as any).data
        : response;

      if (Array.isArray(savedItems)) {
        // Look for items with productType 'HOTEL' and matching title
        const savedHotel = savedItems.find(
          (savedItem: any) =>
            savedItem.productType === 'HOTEL' &&
            savedItem.title === item.title
        );

        if (savedHotel) {
          setIsSaved(true);
          setSavedItemId(savedHotel.id);
        }
      }
    } catch (error) {
      console.error('Error checking saved status:', error);
    } finally {
      setIsCheckingSave(false);
    }
  };

  // Toggle save/unsave hotel
  const handleSaveToggle = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (isSaved && savedItemId) {
      // Remove from wishlist
      try {
        setIsSaving(true);
        await api.userApi.removeSavedItem(savedItemId);
        setIsSaved(false);
        setSavedItemId(null);
        toast.success('Removed from wishlist');
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        toast.error('Failed to remove from wishlist');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Show modal to add with notes
      setShowSaveModal(true);
    }
  };

  // Save hotel to wishlist with notes - SIMPLIFIED for API
  const handleSaveWithNotes = async () => {
    if (!item) return;

    try {
      setIsSaving(true);

      const priceMatch = item.price?.match(/[\d,.]+/);
      const pricePerNight = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

      // Format the request according to API expectations - only required fields
      const saveData: {
        productType: 'FLIGHT_DOMESTIC' | 'FLIGHT_INTERNATIONAL' | 'HOTEL' | 'CAR_RENTAL' | 'PACKAGE';
        title: string;
        price?: number;
        currency?: string;
        notes?: string;
      } = {
        productType: 'HOTEL',
        title: item.title,
        price: pricePerNight,
        currency: 'GBP',
        notes: saveNotes
      };

      console.log('Saving item with data:', saveData);

      const response = await api.userApi.saveItem(saveData);

      if (response && typeof response === 'object') {
        const responseData = 'data' in response ? (response as any).data : response;

        if (responseData && responseData.id) {
          setIsSaved(true);
          setSavedItemId(responseData.id);
          setShowSaveModal(false);
          setSaveNotes('');
          toast.success('Added to wishlist!');
        } else {
          toast.success('Added to wishlist!');
          setIsSaved(true);
          setShowSaveModal(false);
          setSaveNotes('');
        }
      }
    } catch (error: any) {
      console.error('Error saving to wishlist:', error);
      toast.error(error?.message || 'Failed to add to wishlist');
    } finally {
      setIsSaving(false);
    }
  };
  // Format date function
  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Extract real dates from searchParams or item
  const getCheckInDate = () => {
    // Try from searchParams first
    if (searchParams?.checkInDate) {
      return formatDisplayDate(searchParams.checkInDate);
    }
    // Try from item.realData
    if (item?.realData?.checkInDate) {
      return formatDisplayDate(item.realData.checkInDate);
    }
    // Try from item.bookingData
    if ((item as any)?.bookingData?.checkInDate) {
      return formatDisplayDate((item as any).bookingData.checkInDate);
    }
    return null;
  };

  const getCheckOutDate = () => {
    // Try from searchParams first
    if (searchParams?.checkOutDate) {
      return formatDisplayDate(searchParams.checkOutDate);
    }
    // Try from item.realData
    if (item?.realData?.checkOutDate) {
      return formatDisplayDate(item.realData.checkOutDate);
    }
    // Try from item.bookingData
    if ((item as any)?.bookingData?.checkOutDate) {
      return formatDisplayDate((item as any).bookingData.checkOutDate);
    }
    return null;
  };

  // Get guests count
  const getGuestsCount = () => {
    // Try from searchParams
    if (searchParams?.guests) {
      return `${searchParams.guests} Adults`;
    }
    if (searchParams?.adults) {
      return `${searchParams.adults} Adults`;
    }
    // Try from item.realData
    if (item?.realData?.guests) {
      return `${item.realData.guests} Adults`;
    }
    // Try from item
    if ((item as any)?.guests) {
      return `${(item as any).guests} Adults`;
    }
    return '2 Adults';
  };

  // Get rooms count
  const getRoomsCount = () => {
    // Try from searchParams
    if (searchParams?.rooms) {
      return `${searchParams.rooms} Room${searchParams.rooms > 1 ? 's' : ''}`;
    }
    if (searchParams?.roomQuantity) {
      return `${searchParams.roomQuantity} Room${searchParams.roomQuantity > 1 ? 's' : ''}`;
    }
    // Try from item.realData
    if (item?.realData?.rooms) {
      return `${item.realData.rooms} Room${item.realData.rooms > 1 ? 's' : ''}`;
    }
    // Try from item
    if ((item as any)?.rooms) {
      return `${(item as any).rooms} Room${(item as any).rooms > 1 ? 's' : ''}`;
    }
    return '1 Room';
  };

  // Get nights count
  const getNightsCount = () => {
    const checkIn = getCheckInDate();
    const checkOut = getCheckOutDate();

    if (checkIn && checkOut) {
      try {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (nights > 0) return nights;
      } catch (e) {
        console.warn('Error calculating nights:', e);
      }
    }
    return null;
  };

  const checkInDate = getCheckInDate();
  const checkOutDate = getCheckOutDate();
  const nights = getNightsCount();

  // Early return if no item is selected
  if (!item) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No hotel selected</p>
          <button
            onClick={onBack}
            className="mt-4 bg-[#33a8da] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  // ============ FETCH HOTEL SUGGESTIONS ============
  const fetchHotelSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      setLoadingSuggestions(true);

      // If onFetchSuggestions prop is provided, use it
      if (onFetchSuggestions) {
        const data = await onFetchSuggestions(query);
        setSuggestions(Array.isArray(data) ? data : []);
        return data;
      }

      // Default to empty for now if no endpoint
      setSuggestions([]);
      return [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      return [];
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Helper function to get fallback images
  const getFallbackImages = useCallback((): HotelImage[] => [
    {
      id: 'fallback-1',
      url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200",
      caption: "Luxury Hotel Exterior",
      type: "exterior"
    },
    {
      id: 'fallback-2',
      url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
      caption: "Hotel Lobby",
      type: "lobby"
    },
    {
      id: 'fallback-3',
      url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200",
      caption: "Luxury Suite",
      type: "room"
    }
  ], []);

  // Main data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      if (!item?.id) return;

      try {
        setLoadingImages(true);
        setLoadingDetails(true);
        setLoadingStats(true);

        // Fetch everything in parallel
        // Only fetch usage stats for admins to avoid 401 errors
        const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

        const [imagesRes, detailsRes, statsRes] = await Promise.allSettled([
          api.paymentApi.getHotelImages(item.id, { hotelName: item.title }),
          api.hotelApi.getHotelDetails(item.id),
          ...(isAdmin ? [api.hotelApi.getUsageStats()] : [])
        ]);

        // Handle images
        if (imagesRes.status === 'fulfilled' && imagesRes.value.success && imagesRes.value.data?.images) {
          const fetchedImages = imagesRes.value.data.images;

          // Filter out placeholders if we have real images
          const filteredImages = fetchedImages.filter((img: any) => {
            const url = typeof img === 'string' ? img : img.url;
            return url && !url.includes('placehold.co') && !url.includes('dummyimage.com');
          });

          if (filteredImages.length > 0) {
            console.log(`✅ Found ${filteredImages.length} real images`);
            setHotelImages(filteredImages.map((img: any, i: number) => ({
              id: `${item.id}-${i}`,
              url: typeof img === 'string' ? img : img.url,
              caption: typeof img === 'object' ? (img.type || img.attribution || item.title) : item.title,
              type: 'api'
            })));
          } else {
            console.log('⚠️ No real images found in API response, keeping initial/fallback images');
            // If we have an initial image from search result, it's better than nothing
            if (hotelImages.length === 0) {
              setHotelImages(getFallbackImages());
            }
          }
        } else {
          console.error('❌ Failed to fetch images or empty response');
          if (hotelImages.length === 0) {
            setHotelImages(getFallbackImages());
          }
          setImageError(true);
        }

        // Handle details - be more robust with response structure and 404s
        if (detailsRes.status === 'fulfilled') {
          const resValue = detailsRes.value;
          if (resValue?.success) {
            setFullDetails(resValue.data || resValue);
          } else if (resValue && typeof resValue === 'object' && !resValue.statusCode) {
            // Some endpoints return the object directly, check it's not an error response
            setFullDetails(resValue);
          }
        } else {
          console.log('ℹ️ Hotel details unavailable via API, falling back to search result data');
          // fullDetails remains null, UI will use item data as fallback
        }

        // Handle usage stats
        if (isAdmin) {
          const statsResult = statsRes as PromiseSettledResult<any>;
          if (statsResult.status === 'fulfilled' && statsResult.value) {
            setUsageStats(statsResult.value);
          } else {
            setStatsError(true);
          }
        }

      } catch (err) {
        console.error('Error fetching hotel data:', err);
        setHotelImages(getFallbackImages());
        setImageError(true);
      } finally {
        setLoadingImages(false);
        setLoadingDetails(false);
        setLoadingStats(false);
      }
    };

    fetchData();
  }, [item?.id, item?.title, getFallbackImages]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        fetchHotelSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Navigation functions
  const nextImage = useCallback(() => {
    if (hotelImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % hotelImages.length);
  }, [hotelImages.length]);

  const prevImage = useCallback(() => {
    if (hotelImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + hotelImages.length) % hotelImages.length);
  }, [hotelImages.length]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
  };

  const renderOverview = () => {
    const amenities = fullDetails?.amenities || item?.amenities || [];
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section>
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">About this Property</h2>
          <p className="text-gray-500 font-medium leading-relaxed text-sm">
            {fullDetails?.description || item?.subtitle || "Experience luxury and comfort in this beautiful property located in the heart of the city."}
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <h4 className="font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2 text-[10px]">
              <div className="w-1.5 h-1.5 bg-[#33a8da] rounded-full" />
              Property Highlights
            </h4>
            <div className="grid grid-cols-2 gap-y-4">
              {amenities.slice(0, 8).map((amenity: string, i: number) => (
                <div key={i} className="flex items-center gap-3 text-gray-600 font-bold hover:text-[#33a8da] transition-colors cursor-default">
                  <svg className="w-3.5 h-3.5 text-[#33a8da]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-wider">{amenity}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <h4 className="font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2 text-[10px]">
              <div className="w-1.5 h-1.5 bg-[#33a8da] rounded-full" />
              Location Info
            </h4>
            <div className="space-y-4 font-bold">
              <div className="flex justify-between items-center text-[10px] border-b border-gray-50 pb-3">
                <span className="text-gray-400 uppercase tracking-widest">Neighborhood</span>
                <span className="text-gray-900 uppercase tracking-widest">{item?.subtitle?.split(',')[0]}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] border-b border-gray-50 pb-3">
                <span className="text-gray-400 uppercase tracking-widest">City</span>
                <span className="text-gray-900 uppercase tracking-widest">{item?.subtitle?.split(',').slice(-1)[0] || 'Lagos'}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderRooms = () => {
    const realData = (item as any)?.realData || {};
    const roomType = realData.roomType || item?.features?.[0] || 'Standard Room';
    const bedType = realData.bedType || 'King/Queen Bed';
    const guests = realData.guests || 2;
    const price = item?.price || '£0';

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-[40px] border border-gray-100 p-8 hover:shadow-xl transition-all duration-500 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />

          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-64 h-48 bg-gray-100 rounded-[32px] overflow-hidden">
              <img
                src={hotelImages[1]?.url || hotelImages[0]?.url || "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=400"}
                className="w-full h-full object-cover"
                alt="Room"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#33a8da10] text-[#33a8da] rounded-full text-[9px] font-black uppercase tracking-widest">
                Best Available Rate
              </div>
              <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{roomType}</h4>
              <div className="flex flex-wrap gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5" /></svg>
                  {guests} Guests
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeWidth="2.5" /></svg>
                  {bedType}
                </span>
                {realData.isRefundable && (
                  <span className="flex items-center gap-2 text-green-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
                    Refundable
                  </span>
                )}
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Starting from</div>
              <div className="text-4xl font-black text-gray-900">{price}</div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Includes taxes & fees</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAmenities = () => {
    const amenities = fullDetails?.amenities || item?.amenities || [];
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {amenities.map((amenity: string, i: number) => (
          <div key={i} className="flex items-center gap-4 bg-white p-6 rounded-[24px] border border-gray-100 hover:border-[#33a8da] hover:shadow-sm transition-all group">
            <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#33a8da]/10 transition-colors">
              <svg className="w-5 h-5 text-gray-400 group-hover:text-[#33a8da]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-black text-gray-900 text-[10px] uppercase tracking-widest">{amenity}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderPolicies = () => {
    const realData = (item as any)?.realData || {};
    const cancellationPolicy = realData.cancellationPolicy || "Standard cancellation policy applies. Please check during booking for specific terms.";

    const policyItems = [
      { label: 'Check-in', value: 'From 2:00 PM' },
      { label: 'Check-out', value: 'Until 11:00 AM' },
      { label: 'Cancellation', value: cancellationPolicy },
      { label: 'Pets', value: 'Pets are not allowed unless specified.' },
      { label: 'Payment', value: 'Cash, Visa, Mastercard, American Express' }
    ];

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm">
          {policyItems.map((policy, i) => (
            <div key={policy.label} className={`flex flex-col md:flex-row p-6 ${i !== policyItems.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="w-full md:w-56 shrink-0 mb-2 md:mb-0">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{policy.label}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-700 leading-relaxed">{policy.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReviews = () => (
    <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-12">
        <div className="w-full md:w-64 space-y-6">
          <div className="flex items-center gap-4">
            <div className="text-6xl font-black text-gray-900 tracking-tighter">4.9</div>
            <div>
              <div className="flex text-yellow-400 mb-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">1,240 Reviews</p>
            </div>
          </div>
          <div className="space-y-4">
            {['Cleanliness', 'Location', 'Service'].map((metric) => (
              <div key={metric}>
                <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  <span>{metric}</span>
                  <span className="text-gray-900">4.9</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#33a8da] w-[98%]"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-10">
          {[1, 2].map((rev) => (
            <div key={rev} className="pb-8 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                  <img src={`https://ui-avatars.com/api/?name=Reviewer+${rev}&background=f4d9c6&color=9a7d6a`} className="w-full h-full" alt="" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">Hannah Jenkins</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Dec 2024</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium leading-relaxed italic">
                "A truly formal and premium experience. The attention to detail and professional staff made our stay unforgettable."
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );


  const renderActiveContent = () => {
    switch (activeTab) {
      case 'Overview': return renderOverview();
      case 'Available Rooms': return renderRooms();
      case 'Guest Reviews': return renderReviews();
      case 'Amenities': return renderAmenities();
      case 'Policies': return renderPolicies();
      default: return renderOverview();
    }
  };

  if (loadingImages || loadingDetails) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da] mx-auto mb-4"></div>
          <p className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Preparing your stay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fbfe] min-h-screen">
      {/* Lightbox Gallery */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-[60px] flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-6 text-white relative z-10">
            <div className="flex flex-col">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#33a8da]">Ebony Bruce Gallery</p>
              <h3 className="text-lg font-bold">{item.title}</h3>
              {hotelImages[currentImageIndex]?.caption && (
                <p className="text-sm text-gray-300 mt-1">{hotelImages[currentImageIndex].caption}</p>
              )}
            </div>
            <button onClick={() => setIsLightboxOpen(false)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 relative flex items-center justify-center px-4 md:px-20">
            <button onClick={prevImage} className="absolute left-6 md:left-10 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition flex items-center justify-center border border-white/10 text-white active:scale-95 z-20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className="w-full max-w-5xl h-full flex items-center justify-center p-4">
              <img
                src={hotelImages[currentImageIndex]?.url}
                className="w-full h-full object-contain transition-all duration-700 animate-in fade-in"
                alt={hotelImages[currentImageIndex]?.caption || item.title}
              />
            </div>

            <button onClick={nextImage} className="absolute right-6 md:right-10 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition flex items-center justify-center border border-white/10 text-white active:scale-95 z-20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="p-10 flex justify-center gap-3 overflow-x-auto hide-scrollbar relative z-10">
            {hotelImages.map((img, i) => (
              <button
                key={img.id || i}
                onClick={() => setCurrentImageIndex(i)}
                className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${currentImageIndex === i ? 'border-[#33a8da] scale-110 shadow-2xl' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
              >
                <img src={img.url} className="w-full h-full object-cover" alt={img.caption || ''} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10">
          <button onClick={onBack} className="hover:text-gray-900 transition">Home</button>
          <span className="text-gray-200">/</span>
          <span className="hover:text-gray-900 cursor-pointer">Hotel Search</span>
          <span className="text-gray-200">/</span>
          <span className="text-[#33a8da]">Property Details</span>
        </nav>

        {/* Search Bar */}
        <div className="mb-10 relative">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 flex items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search for hotels, destinations..."
                className="w-full px-6 py-4 text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
              />
              {loadingSuggestions && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#33a8da]"></div>
                </div>
              )}
            </div>
            <button className="bg-[#33a8da] text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest">
              Search
            </button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition border-b border-gray-50 last:border-0 flex items-start gap-4"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.image && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={suggestion.image} alt={suggestion.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-900">{suggestion.name}</p>
                    {suggestion.location && (
                      <p className="text-xs text-gray-500 mt-1">{suggestion.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter mb-3">{item.title}</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[#33a8da]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                <span className="text-xs font-bold text-gray-500">{item.subtitle}</span>
              </div>
            </div>
            {usageStats && (
              <div className="mt-4 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[8px] font-black uppercase tracking-widest">
                  API Usage: {usageStats.usage || 0} / {usageStats.limit || '∞'}
                </span>
                <span className="text-[8px] font-bold text-gray-400">({usageStats.percentage || 0}% used)</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSaveToggle}
              disabled={isCheckingSave || isSaving}
              className={`flex items-center gap-2 px-4 py-2.5 border border-gray-100 bg-white rounded-xl text-[10px] font-black transition-all shadow-sm ${isSaved ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-[#33a8da]'
                }`}
            >
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <div className="bg-[#33a8da] text-white font-black px-4 py-2.5 rounded-xl text-lg tracking-tighter">4.9</div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-16">
          <div className="lg:col-span-8 bg-white rounded-[32px] p-0 border border-gray-100 shadow-xl overflow-hidden relative group h-[400px] lg:h-[600px]">
            <div className="absolute inset-0 flex items-center justify-between z-20 px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button onClick={prevImage} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#33a8da] hover:bg-white transition active:scale-90">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={nextImage} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#33a8da] hover:bg-white transition active:scale-90">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <img src={hotelImages[currentImageIndex]?.url} className="w-full h-full object-cover transition-all duration-700" alt={item.title} />
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white z-30">
              {currentImageIndex + 1} / {hotelImages.length}
            </div>
            <button
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/20 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white z-30 flex items-center gap-3 hover:bg-black/80 transition"
            >
              View all photos
            </button>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
            {hotelImages.slice(1, 4).map((img, i) => (
              <div key={img.id || i} onClick={() => setCurrentImageIndex(i + 1)} className="bg-gray-100 rounded-[24px] overflow-hidden border border-gray-100 cursor-pointer h-full relative group">
                <img src={img.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                {img.caption && (
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-bold text-white bg-black/50 px-2 py-1 rounded-full">{img.caption}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="flex-1">
            <div className="border-b border-gray-100 mb-12 flex gap-12 overflow-x-auto hide-scrollbar sticky top-20 bg-[#f8fbfe] z-20 pt-4">
              {['Overview', 'Available Rooms', 'Amenities', 'Guest Reviews', 'Policies'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-5 text-[10px] font-black uppercase tracking-widest transition relative shrink-0 ${activeTab === tab ? 'text-[#33a8da]' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#33a8da] rounded-full" />}
                </button>
              ))}
            </div>
            <div className="min-h-[400px]">{renderActiveContent()}</div>
          </div>

          <aside className="w-full lg:w-[380px]">
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl sticky top-24">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Starting from</p>
                  <p className="text-4xl font-black text-gray-900 tracking-tighter">{item.price}</p>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dates</p>
                  <p className="text-sm font-bold text-gray-900">
                    {checkInDate && checkOutDate
                      ? `${checkInDate} - ${checkOutDate} ${nights ? `(${nights} night${nights > 1 ? 's' : ''})` : ''}`
                      : 'Select dates to view pricing'}
                  </p>
                </div>
              </div>

              <button onClick={onBook} className="w-full bg-[#33a8da] text-white font-black py-5 rounded-2xl shadow-xl hover:shadow-2xl transition active:scale-95 text-xs uppercase tracking-widest">
                Reserve Your Stay
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-in zoom-in duration-300">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add to Wishlist</h3>
            <textarea
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              placeholder="Add a note (optional)..."
              className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition">Cancel</button>
              <button
                onClick={handleSaveWithNotes}
                disabled={isSaving}
                className="flex-1 py-3 bg-[#33a8da] text-white rounded-xl font-medium text-sm hover:shadow-lg transition disabled:bg-gray-200"
              >
                {isSaving ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetails;