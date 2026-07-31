'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { SearchResult, SearchParams } from '../lib/types';
import api from '../lib/api';
import { config } from '../lib/config';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

// Fix for default marker icons
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Make sure marker icons work
if (typeof window !== 'undefined') {
  L.Marker.prototype.options.icon = defaultIcon;
}

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
  category?: string;
}

// Helper functions
const getDescriptionText = (description: any): string => {
  if (!description) return '';
  if (typeof description === 'string') return description;
  if (typeof description === 'object') {
    return description.text || description.description || '';
  }
  return '';
};

const safeRender = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return value.text || value.description || JSON.stringify(value);
  }
  return String(value);
};

// Helper to extract room images from media
const extractRoomImagesFromMedia = (media: any[]): string[] => {
  if (!media || !Array.isArray(media)) return [];
  
  const roomImages: string[] = [];
  
  const roomMedia = media.filter((item: any) => {
    const category = item.category || '';
    const tags = item.tags || [];
    const roomCategories = ['ROOM_VIEW', 'MISCELLANEOUS', 'PROPERTY_AMENITY'];
    const roomTags = ['ROOM_VIEW', 'HOTEL_ROOM', 'BEDROOM', 'SUITE'];
    
    const isRoomCategory = roomCategories.some(c => category.includes(c));
    const hasRoomTag = tags.some((t: string) => roomTags.some(rt => t.includes(rt)));
    const caption = (item.caption || '').toLowerCase();
    const hasRoomKeyword = caption.includes('room') || 
                          caption.includes('suite') || 
                          caption.includes('bed') ||
                          caption.includes('bedroom');
    
    return (isRoomCategory || hasRoomTag || hasRoomKeyword) && item.mediaScales;
  });
  
  roomMedia.forEach((item: any) => {
    if (item.mediaScales && Array.isArray(item.mediaScales)) {
      const largest = item.mediaScales.reduce((a: any, b: any) => {
        const aSize = (a.dimensions?.width || 0) * (a.dimensions?.height || 0);
        const bSize = (b.dimensions?.width || 0) * (b.dimensions?.height || 0);
        return aSize > bSize ? a : b;
      });
      
      if (largest?.href) {
        roomImages.push(largest.href);
      }
    }
  });
  
  return roomImages;
};

const HotelDetails: React.FC<HotelDetailsProps> = ({
  item,
  searchParams,
  onBack,
  onBook,
  onFetchImages,
  onFetchSuggestions
}) => {
  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<any>(null);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [hotelImages, setHotelImages] = useState<HotelImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [convertedPrice, setConvertedPrice] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);
  const [originalPriceAmount, setOriginalPriceAmount] = useState<number>(0);
  const [originalPriceCurrency, setOriginalPriceCurrency] = useState<string>('GBP');
  const [fullDetails, setFullDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNotes, setSaveNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Image category mapping
  const categoryMap: Record<string, string> = {
    'EXTERIOR_VIEW': 'Exterior',
    'LOBBY_VIEW': 'Lobby',
    'BAR_OR_LOUNGE': 'Lounge/Bar',
    'RESTAURANT': 'Restaurant',
    'MEETING_ROOM': 'Meeting Room',
    'HEALTH_CLUB': 'Fitness Center',
    'PROPERTY_AMENITY': 'Amenity',
    'MISCELLANEOUS': 'Hotel View',
    'ROOM_VIEW': 'Room',
    'BATHROOM_VIEW': 'Bathroom',
    'SWIMMING_POOL': 'Pool',
    'SPA': 'Spa',
  };

  const formatRoomPrice = (price: any): string => {
    if (!price) return 'Price not available';
    const currency = price.currency || 'GBP';
    const total = price.total;
    let formattedTotal = '0.00';
    if (typeof total === 'number') {
      formattedTotal = total.toFixed(2);
    } else if (typeof total === 'string') {
      const parsed = parseFloat(total);
      formattedTotal = isNaN(parsed) ? '0.00' : parsed.toFixed(2);
    }
    return `${currency} ${formattedTotal}`;
  };

  // Extract price from item
  const extractOriginalPrice = useCallback(() => {
    if (!item) return { amount: 0, currency: 'GBP' };
    
    const itemAny = item as any;
    let amount = 0;
    let currencyCode = 'GBP';
    
    if (itemAny.originalPriceAmount) {
      amount = itemAny.originalPriceAmount;
      currencyCode = itemAny.originalPriceCurrency || 'GBP';
    } else if (itemAny.original_amount) {
      amount = parseFloat(itemAny.original_amount);
      currencyCode = itemAny.original_currency || 'GBP';
    } else if (itemAny.final_amount) {
      amount = parseFloat(itemAny.final_amount);
      currencyCode = itemAny.currency || 'GBP';
    } else if (itemAny.price) {
      const priceStr = String(itemAny.price);
      const match = priceStr.match(/[\d,.]+/);
      if (match) {
        amount = parseFloat(match[0].replace(/,/g, ''));
      }
      if (priceStr.includes('£')) currencyCode = 'GBP';
      else if (priceStr.includes('$')) currencyCode = 'USD';
      else if (priceStr.includes('€')) currencyCode = 'EUR';
      else if (priceStr.includes('₦')) currencyCode = 'NGN';
    }
    
    return { amount, currency: currencyCode };
  }, [item]);

  // Convert price
  useEffect(() => {
    const convertHotelPrice = async () => {
      if (!item) return;
      setIsConverting(true);
      try {
        const { amount, currency: originalCurrency } = extractOriginalPrice();
        setOriginalPriceAmount(amount);
        setOriginalPriceCurrency(originalCurrency);
        
        if (amount > 0) {
          let finalDisplayPrice = '';
          if (originalCurrency !== currency.code) {
            const converted = await convertPrice(amount, originalCurrency);
            finalDisplayPrice = await formatPrice(converted);
          } else {
            finalDisplayPrice = await formatPrice(amount, originalCurrency);
          }
          setConvertedPrice(finalDisplayPrice);
        }
      } catch (error) {
        console.error('Failed to convert price:', error);
        setConvertedPrice(item.price ? String(item.price) : 'Price on request');
      } finally {
        setIsConverting(false);
      }
    };
    convertHotelPrice();
  }, [item, currency.code, convertPrice, formatPrice, extractOriginalPrice]);

  // Check if saved
  useEffect(() => {
    if (isLoggedIn && item?.id) {
      checkIfSaved();
    }
  }, [isLoggedIn, item?.id]);

  const checkIfSaved = async () => {
    if (!item?.id) return;
    try {
      const response = await api.userApi.getSavedItems();
      const savedItems = response && typeof response === 'object' && 'data' in response
        ? (response as any).data
        : response;
      if (Array.isArray(savedItems)) {
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
    }
  };

  const handleSaveToggle = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (isSaved && savedItemId) {
      try {
        setIsSaving(true);
        await api.userApi.removeSavedItem(savedItemId);
        setIsSaved(false);
        setSavedItemId(null);
        toast.success('Removed from wishlist');
      } catch (error) {
        toast.error('Failed to remove from wishlist');
      } finally {
        setIsSaving(false);
      }
    } else {
      setShowSaveModal(true);
    }
  };

  const handleSaveWithNotes = async () => {
    if (!item) return;
    try {
      setIsSaving(true);
      const saveData = {
        productType: 'HOTEL' as const,
        title: item.title,
        price: originalPriceAmount || 0,
        currency: originalPriceCurrency,
        notes: saveNotes
      };
      const response = await api.userApi.saveItem(saveData);
      if (response && typeof response === 'object') {
        const responseData = 'data' in response ? (response as any).data : response;
        if (responseData && responseData.id) {
          setIsSaved(true);
          setSavedItemId(responseData.id);
          setShowSaveModal(false);
          setSaveNotes('');
          toast.success('Added to wishlist!');
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add to wishlist');
    } finally {
      setIsSaving(false);
    }
  };

  // Format dates
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

  const getCheckInDate = () => {
    if (searchParams?.checkInDate) return formatDisplayDate(searchParams.checkInDate);
    if (item?.realData?.checkInDate) return formatDisplayDate(item.realData.checkInDate);
    return null;
  };

  const getCheckOutDate = () => {
    if (searchParams?.checkOutDate) return formatDisplayDate(searchParams.checkOutDate);
    if (item?.realData?.checkOutDate) return formatDisplayDate(item.realData.checkOutDate);
    return null;
  };

  const getGuestsDisplay = () => {
    const adults = searchParams?.adults || item?.realData?.adults || 1;
    return `${adults} Adult${adults > 1 ? 's' : ''}`;
  };

  const getRoomsDisplay = () => {
    const count = searchParams?.rooms || searchParams?.roomQuantity || item?.realData?.rooms || 1;
    return `${count} Room${count > 1 ? 's' : ''}`;
  };

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

  const fetchRoomTypesWithFees = useCallback(async () => {
    if (!item) return;
    const itemAny = item as any;
    const hotelId = itemAny.hotelId || itemAny.hotel?.hotelId || itemAny.realData?.hotelId || itemAny.id;
    if (!hotelId) {
      console.warn('⚠️ No hotelId found for room types');
      setLoadingRoomTypes(false);
      return;
    }
    
    setLoadingRoomTypes(true);
    try {
      const token = localStorage.getItem('token');
      const checkIn = searchParams?.checkInDate || new Date().toISOString().split('T')[0];
      const checkOut = searchParams?.checkOutDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const adults = searchParams?.adults || 2;
      
      console.log('🔍 Fetching room types for hotel:', hotelId);
      
      const response = await fetch(`${config.apiBaseUrl}/api/v1/bookings/search/hotels/amadeus/room-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          hotelIds: [hotelId],
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: adults,
          roomQuantity: 1,
          currency: currency.code || 'GBP',
        }),
      });
  
      const data = await response.json();
      console.log('📦 Room types response:', data);
  
      let fetchedRoomTypes: any[] = [];
      
      if (data.success && data.data) {
        const innerData = data.data;
        
        if (innerData.success && innerData.data && Array.isArray(innerData.data)) {
          const hotelData = innerData.data[0];
          
          if (hotelData && hotelData.roomTypes && Array.isArray(hotelData.roomTypes)) {
            console.log('✅ Found roomTypes in response:', hotelData.roomTypes.length);
            
            fetchedRoomTypes = hotelData.roomTypes.map((room: any, index: number) => {
              const price = room.price || {};
              const occupancy = room.occupancy || { maxAdults: 2 };
              
              const roomName = room.name?.text || room.type || 'Standard Room';
              const roomDescription = room.description?.text || '';
              
              let bedTypes: any[] = room.bedTypes || [];
              if (bedTypes.length === 0) {
                const type = room.type || '';
                let bedType = 'Queen';
                let beds = 1;
                
                if (type.includes('K')) bedType = 'King';
                else if (type.includes('Q')) bedType = 'Queen';
                else if (type.includes('T')) bedType = 'Twin';
                else if (type.includes('D')) bedType = 'Double';
                
                const match = type.match(/(\d+)/);
                if (match) beds = parseInt(match[1]) || 1;
                
                bedTypes = [{ type: bedType, quantity: beds }];
              }
              
              const total = parseFloat(price.total || '0');
              const currency = price.currency || 'GBP';
              const base = parseFloat(price.base || '0');
              
              const isRefundable = room.policies?.cancellation !== null;
              const cancellationDeadline = room.policies?.cancellation?.deadline || '';
              const isAvailable = room.available !== undefined ? room.available : true;
              const rateFamily = room.rateFamily || '';
              
              let roomImage = '';
              if (hotelData.images && Array.isArray(hotelData.images)) {
                const roomImages = hotelData.images.filter((img: any) => 
                  img.category === 'ROOM_VIEW' || img.category === 'MISCELLANEOUS'
                );
                if (roomImages.length > 0) {
                  roomImage = roomImages[index % roomImages.length]?.uri || '';
                } else if (hotelData.images.length > 0) {
                  roomImage = hotelData.images[0]?.uri || '';
                }
              }
              
              return {
                id: room.id || room.roomId || `room-${index}`,
                name: roomName,
                type: room.type || 'Standard',
                description: roomDescription,
                bedTypes: bedTypes,
                occupancy: occupancy,
                price: {
                  total: total,
                  currency: currency,
                  base: base,
                  fees: price.fees || [],
                  markup_percentage: price.markup_percentage || 15,
                  service_fee: parseFloat(price.service_fee || '0'),
                  original_currency: price.original_currency || 'USD',
                },
                isRefundable: isRefundable,
                cancellationDeadline: cancellationDeadline,
                available: isAvailable,
                rateFamily: rateFamily,
                image: roomImage,
                raw: room,
              };
            });
          }
        }
      }
      
      if (fetchedRoomTypes.length > 0) {
        console.log('✅ Room types loaded:', fetchedRoomTypes.length);
        // ✅ Only show available rooms
        const availableRooms = fetchedRoomTypes.filter((room: any) => room.available !== false);
        
        if (availableRooms.length === 0) {
          console.warn('⚠️ No available rooms found');
          setRoomTypes([]);
          setSelectedRoomType(null);
        } else {
          setRoomTypes(availableRooms);
          if (!selectedRoomType) {
            const firstRoom = availableRooms[0];
            setSelectedRoomType(firstRoom);
          }
        }
      } else {
        console.warn('⚠️ No room types found in response');
        setRoomTypes([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching room types:', error);
      setRoomTypes([]);
    } finally {
      setLoadingRoomTypes(false);
    }
  }, [item, searchParams, currency.code, selectedRoomType]);

  useEffect(() => {
    if (item?.id) {
      fetchRoomTypesWithFees();
    }
  }, [item?.id, fetchRoomTypesWithFees]);

  // ============ MAIN DATA FETCH ============
  useEffect(() => {
    const fetchData = async () => {
      if (!item?.id) return;
      
      try {
        setLoadingImages(true);
        setLoadingDetails(true);

        const itemAny = item as any;
        const hotelId = itemAny.hotelId || 
                        itemAny.hotel?.hotelId || 
                        itemAny.realData?.hotelId || 
                        itemAny.id;
        
        console.log('🔍 Fetching hotel details for ID:', hotelId);

        if (!hotelId) {
          console.warn('⚠️ No hotelId found, using item data as fallback');
          setFullDetails({
            hotelId: item.id,
            name: item.title,
            description: getDescriptionText(item.subtitle) || 'Experience luxury and comfort.',
            amenities: itemAny.amenities || ['Free Wi-Fi', 'Air Conditioning'],
            policies: itemAny.policies || [],
            rating: item.rating || 4,
            totalReviews: 100,
            sentiment: 'POSITIVE',
            checkInOut: { checkIn: '15:00', checkOut: '12:00' },
            formattedAddress: itemAny.address || '',
            phoneNumber: itemAny.phoneNumber || '',
            email: itemAny.email || '',
            website: itemAny.website || '',
            latitude: itemAny.latitude || null,
            longitude: itemAny.longitude || null,
          });
          setLoadingDetails(false);
          setLoadingImages(false);
          return;
        }

        const response = await api.hotelApi.getHotelDetails(hotelId);
        console.log('📋 API Response:', response);

        if (response?.success && response?.data) {
          const hotelData = response.data;
          console.log('📋 Hotel data:', hotelData);

          const latitude = hotelData.location?.geoCode?.latitude || null;
          const longitude = hotelData.location?.geoCode?.longitude || null;
          console.log('📍 Coordinates:', { latitude, longitude });

          // Extract images from media with category mapping
          const extractedImages: HotelImage[] = [];
          if (hotelData.media && Array.isArray(hotelData.media)) {
            const imageMedia = hotelData.media.filter((m: any) => 
              m.mediaScales && Array.isArray(m.mediaScales) && m.mediaScales.length > 0
            );
            
            imageMedia.forEach((mediaItem: any, index: number) => {
              const largestScale = mediaItem.mediaScales.reduce((a: any, b: any) => {
                const aSize = (a.dimensions?.width || 0) * (a.dimensions?.height || 0);
                const bSize = (b.dimensions?.width || 0) * (b.dimensions?.height || 0);
                return aSize > bSize ? a : b;
              });
              
              if (largestScale?.href) {
                const category = mediaItem.category || mediaItem.tags?.[0] || 'Hotel View';
                const displayCategory = categoryMap[category] || category || 'Hotel View';
                
                extractedImages.push({
                  id: mediaItem.id || `img-${index}`,
                  url: largestScale.href,
                  caption: displayCategory,
                  type: category,
                  category: displayCategory,
                });
              }
            });
          }

          if (extractedImages.length === 0 && hotelData.images && Array.isArray(hotelData.images)) {
            hotelData.images.forEach((url: string, index: number) => {
              if (url && !url.includes('placehold.co')) {
                extractedImages.push({
                  id: `img-${index}`,
                  url: url,
                  caption: 'Hotel View',
                  type: 'api',
                  category: 'Hotel View',
                });
              }
            });
          }

          if (extractedImages.length > 0) {
            setHotelImages(extractedImages);
          } else {
            setHotelImages([
              {
                id: 'fallback-1',
                url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200",
                caption: "Exterior",
                type: "exterior",
                category: "Exterior"
              },
              {
                id: 'fallback-2',
                url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
                caption: "Lobby",
                type: "lobby",
                category: "Lobby"
              },
              {
                id: 'fallback-3',
                url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1200",
                caption: "Room",
                type: "room",
                category: "Room"
              }
            ]);
          }

          let phoneNumber = '';
          let email = '';
          let website = '';
          if (hotelData.contact && Array.isArray(hotelData.contact)) {
            const phoneContact = hotelData.contact.find((c: any) => c.phone && c.phone.deviceType === 'VOICE');
            if (phoneContact?.phone?.number) {
              const phone = phoneContact.phone;
              phoneNumber = [phone.countryCallingCode, phone.areaCode, phone.number]
                .filter(Boolean)
                .join(' ');
            }
            
            const emailContact = hotelData.contact.find((c: any) => c.email);
            if (emailContact?.email?.address) email = emailContact.email.address;
            
            const websiteContact = hotelData.contact.find((c: any) => c.website);
            if (websiteContact?.website?.href) website = websiteContact.website.href;
          }

          let formattedAddress = '';
          if (hotelData.address) {
            const lines = hotelData.address.lines?.join(', ') || '';
            const city = hotelData.address.cityName || '';
            const postalCode = hotelData.address.postalCode || '';
            const country = hotelData.address.countryCode || '';
            formattedAddress = [lines, city, postalCode, country].filter(Boolean).join(', ');
          }

          const amenities: string[] = [];
          if (hotelData.media && Array.isArray(hotelData.media)) {
            const amenityMedia = hotelData.media.filter((m: any) => 
              m.tags && (m.tags.includes('AMENITY_INFORMATION') || m.tags.includes('ONSITE_FACILITIES'))
            );
            
            amenityMedia.forEach((mediaItem: any) => {
              if (mediaItem.description?.text) {
                const lines = mediaItem.description.text.split(/[\r\n]+/).filter((line: string) => line.trim());
                lines.forEach((line: string) => {
                  const trimmed = line.trim();
                  if (trimmed && !amenities.includes(trimmed)) {
                    amenities.push(trimmed);
                  }
                });
              }
            });
          }

          if (hotelData.amenities && Array.isArray(hotelData.amenities)) {
            hotelData.amenities.forEach((amenity: string) => {
              if (!amenities.includes(amenity)) {
                amenities.push(amenity);
              }
            });
          }

          const policies: any[] = [];
          if (hotelData.policies && Array.isArray(hotelData.policies)) {
            hotelData.policies.forEach((policy: any) => {
              policies.push({
                type: policy.type || 'GENERAL_POLICY',
                text: policy.text || '',
                category: policy.category || null,
              });
            });
          }

          setFullDetails({
            hotelId: hotelData.hotelId || hotelId,
            name: hotelData.name || item.title,
            chainName: hotelData.chainName || '',
            chainCode: hotelData.chainCode || '',
            description: getDescriptionText(hotelData.description) || 'Experience luxury and comfort.',
            formattedAddress: formattedAddress,
            phoneNumber: phoneNumber,
            email: email,
            website: website,
            latitude: latitude,
            longitude: longitude,
            address: hotelData.address || {},
            contact: hotelData.contact || [],
            media: hotelData.media || [],
            images: hotelData.images || [],
            primaryImage: hotelData.primaryImage || (extractedImages.length > 0 ? extractedImages[0].url : ''),
            location: hotelData.location || {},
            checkInOut: hotelData.checkInOut || { checkIn: '15:00', checkOut: '12:00' },
            amenities: amenities.length > 0 ? amenities : ['Free Wi-Fi', 'Air Conditioning', '24-Hour Front Desk'],
            policies: policies.length > 0 ? policies : [],
            rating: hotelData.rating || item?.rating || 4,
            totalReviews: hotelData.totalReviews || 100,
            sentiment: hotelData.sentiment || 'POSITIVE',
            _rawData: hotelData,
          });

          console.log('✅ Full details set successfully with coordinates:', { latitude, longitude });
        } else {
          console.warn('⚠️ API returned no data, using item as fallback');
          const itemAny2 = item as any;
          setFullDetails({
            hotelId: hotelId,
            name: item.title,
            description: getDescriptionText(item.subtitle) || 'Experience luxury and comfort.',
            amenities: itemAny2.amenities || ['Free Wi-Fi', 'Air Conditioning'],
            policies: itemAny2.policies || [],
            rating: item.rating || 4,
            totalReviews: 100,
            sentiment: 'POSITIVE',
            checkInOut: { checkIn: '15:00', checkOut: '12:00' },
            formattedAddress: itemAny2.address || '',
            phoneNumber: itemAny2.phoneNumber || '',
            email: itemAny2.email || '',
            website: itemAny2.website || '',
            latitude: itemAny2.latitude || null,
            longitude: itemAny2.longitude || null,
          });
        }

      } catch (error) {
        console.error('Error fetching hotel details:', error);
        const itemAny = item as any;
        setFullDetails({
          hotelId: item.id,
          name: item.title,
          description: getDescriptionText(item.subtitle) || 'Experience luxury and comfort.',
          amenities: itemAny.amenities || ['Free Wi-Fi', 'Air Conditioning'],
          policies: itemAny.policies || [],
          rating: item.rating || 4,
          totalReviews: 100,
          sentiment: 'POSITIVE',
          checkInOut: { checkIn: '15:00', checkOut: '12:00' },
        });
      } finally {
        setLoadingImages(false);
        setLoadingDetails(false);
      }
    };

    fetchData();
  }, [item]);

  // ============ RENDER FUNCTIONS ============
  
  const renderOverview = () => {
    const amenities = fullDetails?.amenities || [];
    const description = getDescriptionText(fullDetails?.description) || '';
    const phoneNumber = fullDetails?.phoneNumber || '';
    const email = fullDetails?.email || '';
    const website = fullDetails?.website || '';
    const latitude = fullDetails?.latitude;
    const longitude = fullDetails?.longitude;
    const checkIn = fullDetails?.checkInOut?.checkIn || '15:00';
    const checkOut = fullDetails?.checkInOut?.checkOut || '12:00';
    const hotelName = fullDetails?.name || item?.title || 'Hotel';
    
    let addressDisplay = '';
    if (fullDetails?.address) {
      const lines = fullDetails.address.lines?.join(', ') || '';
      const city = fullDetails.address.cityName || '';
      const postalCode = fullDetails.address.postalCode || '';
      const country = fullDetails.address.countryCode || '';
      addressDisplay = [lines, city, postalCode, country].filter(Boolean).join(', ');
    }

    const hasCoordinates = latitude && longitude;

    return (
      <div className="space-y-6">
        {/* About Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">About the Property</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            {description || "Experience luxury and comfort in this beautiful property."}
          </p>
          {fullDetails?.chainName && (
            <p className="text-xs font-medium text-gray-400 mt-2">Chain: {fullDetails.chainName}</p>
          )}
        </div>

        {/* Map Section */}
        {hasCoordinates && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Location Map</h3>
            <div className="rounded-xl overflow-hidden border border-gray-200 h-[250px] bg-gray-100 relative">
              {typeof window !== 'undefined' && (
                <MapContainer
                  center={[latitude, longitude]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[latitude, longitude]}>
                    <Popup>
                      <div className="text-sm font-medium">{hotelName}</div>
                      <div className="text-xs text-gray-500">{addressDisplay}</div>
                    </Popup>
                  </Marker>
                </MapContainer>
              )}
              <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-500 shadow-sm">
                <a 
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#33a8da] hover:underline"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Location & Contact Section */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-900">Location & Contact</h3>
          
          {addressDisplay && (
            <div className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-700">{addressDisplay}</span>
            </div>
          )}
          
          {hasCoordinates && (
            <div className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18.5a5.5 5.5 0 100-11 5.5 5.5 0 000 11z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 13v-2m0 4h.01" />
              </svg>
              <a 
                href={`https://www.google.com/maps?q=${latitude},${longitude}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#33a8da] hover:underline"
              >
                {latitude.toFixed(4)}, {longitude.toFixed(4)} (View on map)
              </a>
            </div>
          )}
          
          {phoneNumber && (
            <div className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-gray-700">{phoneNumber}</span>
            </div>
          )}
          
          {email && (
            <div className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href={`mailto:${email}`} className="text-[#33a8da] hover:underline">{email}</a>
            </div>
          )}
          
          {website && (
            <div className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              <a href={website} target="_blank" rel="noopener noreferrer" className="text-[#33a8da] hover:underline">
                Visit Website
              </a>
            </div>
          )}
          
          <div className="flex items-start gap-2 text-sm">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-700">Check-in: {checkIn} / Check-out: {checkOut}</span>
          </div>
        </div>

        {/* Amenities Section */}
        {amenities.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Hotel Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {amenities.slice(0, 15).map((amenity: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700">
                  {safeRender(amenity)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRoomTypesList = () => {
    if (loadingRoomTypes) {
      return (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#33a8da]"></div>
          <p className="mt-3 text-gray-500 text-sm">Loading room types...</p>
        </div>
      );
    }
  
   

if (!roomTypes || roomTypes.length === 0) {
  return (
    <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <p className="text-gray-500 font-medium text-sm">No rooms available</p>
      <p className="text-xs text-gray-400 mt-1">All rooms are sold out for these dates</p>
      <p className="text-xs text-gray-400 mt-1">Please try different dates</p>
    </div>
  );
}
  
    return (
      <div className="space-y-4">
        {roomTypes.map((room: any, index: number) => {
          const total = room.price?.total || 0;
          const currencyCode = room.price?.currency || 'GBP';
          const isSelected = selectedRoomType?.id === room.id;
          // ✅ Check availability - default to true if not specified
          const isAvailable = room.available !== undefined ? room.available : true;
          
          const currencySymbol = currencyCode === 'NGN' ? '₦' : 
                                currencyCode === 'GBP' ? '£' : 
                                currencyCode === 'USD' ? '$' : 
                                currencyCode === 'EUR' ? '€' : currencyCode;
          
          // ✅ Get room name and description
          const roomName = room.name || room.type || 'Standard Room';
          const roomDescription = room.description || '';
          
          // ✅ Get bed types
          const bedTypes = room.bedTypes || [];
          const bedTypeDisplay = bedTypes.length > 0 
            ? bedTypes.map((b: any) => `${b.type || 'Queen'}${b.quantity > 1 ? ` x${b.quantity}` : ''}`).join(' • ')
            : 'Queen';
          
          // ✅ Get occupancy
          const maxAdults = room.occupancy?.maxAdults || 2;
          
          // ✅ Get room image
          const roomImage = room.image || '';
          
          return (
            <div 
              key={room.id || index} 
              className={`bg-white rounded-lg border-2 overflow-hidden transition-all duration-200 ${
                isSelected && isAvailable
                  ? 'border-[#33a8da] shadow-md shadow-[#33a8da]/15' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              } ${!isAvailable ? 'opacity-75 bg-gray-50' : 'cursor-pointer'}`}
              onClick={() => isAvailable && setSelectedRoomType(room)}
            >
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                {roomImage && (
                  <div className="w-full sm:w-[140px] h-[120px] sm:h-[140px] bg-gray-100 relative flex-shrink-0 overflow-hidden">
                    <img 
                      src={roomImage} 
                      alt={roomName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {isSelected && isAvailable && (
                      <div className="absolute top-1.5 right-1.5 bg-[#33a8da] text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                        ✓ Selected
                      </div>
                    )}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold px-3 py-1 bg-red-600/80 rounded-full">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>
                )}
  
                {/* Content */}
                <div className={`flex-1 p-3 sm:p-4 ${!roomImage ? 'sm:pl-4' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Room Name */}
                      <div className="flex items-start justify-between sm:hidden">
                        <h4 className={`font-bold text-sm leading-tight flex-1 ${!isAvailable ? 'text-gray-500' : 'text-gray-900'}`}>
                          {safeRender(roomName)}
                        </h4>
                        <p className={`text-base font-bold ml-2 shrink-0 ${!isAvailable ? 'text-gray-400' : 'text-[#33a8da]'}`}>
                          {currencySymbol}{total.toFixed(2)}
                        </p>
                      </div>
                      
                      <h4 className={`font-bold text-sm leading-tight hidden sm:block ${!isAvailable ? 'text-gray-500' : 'text-gray-900'}`}>
                        {safeRender(roomName)}
                      </h4>
                      
                      {/* Room Type and Bed Type */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {room.type && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                            {safeRender(room.type)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {bedTypeDisplay}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {maxAdults} adults
                        </span>
                        {room.rateFamily && (
                          <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            {safeRender(room.rateFamily)}
                          </span>
                        )}
                        {!isAvailable && (
                          <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                            Sold Out
                          </span>
                        )}
                      </div>
  
                      {/* Description */}
                      {roomDescription && (
                        <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${!isAvailable ? 'text-gray-400' : 'text-gray-500'}`}>
                          {safeRender(roomDescription)}
                        </p>
                      )}
  
                      {/* Price breakdown */}
                      {room.price?.fees && room.price.fees.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {room.price.fees.map((fee: any, i: number) => (
                            <span key={i} className="text-[9px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              {fee.type}: {currencySymbol}{fee.amount}
                            </span>
                          ))}
                        </div>
                      )}
  
                      {/* Refundable & Cancellation */}
                      <div className="flex items-center gap-2 mt-1.5">
                        {room.isRefundable ? (
                          <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Refundable
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Non-refundable
                          </span>
                        )}
                        {room.cancellationDeadline && (
                          <span className="text-[9px] text-orange-500">
                            Cancel by {new Date(room.cancellationDeadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
  
                    {/* Price & Action */}
                    <div className="hidden sm:flex sm:flex-col sm:items-end sm:justify-between sm:gap-1 shrink-0">
                      <p className={`text-lg font-bold ${!isAvailable ? 'text-gray-400' : 'text-[#33a8da]'}`}>
                        {currencySymbol}{total.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-gray-400">per night</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAvailable) setSelectedRoomType(room);
                        }}
                        disabled={!isAvailable}
                        className={`px-4 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                          !isAvailable 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : isSelected 
                              ? 'bg-[#33a8da] text-white shadow-sm' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {!isAvailable ? 'Sold Out' : isSelected ? '✓ Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
  
                  {/* Bottom row - Mobile Select */}
                  <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center sm:hidden">
                    <span className="text-[9px] text-gray-400">Includes taxes & charges</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAvailable) setSelectedRoomType(room);
                      }}
                      disabled={!isAvailable}
                      className={`px-4 py-1 text-xs font-semibold rounded-lg transition ${
                        !isAvailable 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                          : isSelected 
                            ? 'bg-[#33a8da] text-white shadow-sm' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {!isAvailable ? 'Sold Out' : isSelected ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const renderAmenities = () => {
    const amenities = fullDetails?.amenities || [];
    return (
      <div className="flex flex-wrap gap-2">
        {amenities.map((amenity: string, i: number) => (
          <span key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700">
            {safeRender(amenity)}
          </span>
        ))}
      </div>
    );
  };

  const renderPolicies = () => {
    const policies = fullDetails?.policies || [];
    
    if (policies.length === 0) {
      return <p className="text-gray-500">No policies available</p>;
    }

    return (
      <div className="space-y-4">
        {policies.map((policy: any, i: number) => {
          let displayType = policy.type || 'Policy';
          displayType = displayType.replace(/_/g, ' ');
          displayType = displayType.toLowerCase().split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
          
          return (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{displayType}</p>
              <p className="text-sm text-gray-700 mt-1">{policy.text}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'rooms': return renderRoomTypesList();
      case 'amenities': return renderAmenities();
      case 'policies': return renderPolicies();
      default: return renderOverview();
    }
  };

  // ============ LOADING STATE ============
  if (loadingImages || loadingDetails || (isConverting && !convertedPrice)) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da] mx-auto mb-4"></div>
          <p className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Preparing your stay...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No hotel selected</p>
          <button onClick={onBack} className="mt-4 bg-[#33a8da] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={onBack} className="hover:text-[#33a8da] transition">Home</button>
          <span>/</span>
          <span>Hotel Search</span>
          <span>/</span>
          <span className="text-[#33a8da] font-medium">Property Details</span>
        </nav>

        {/* Title & Location */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{safeRender(item.title)}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{safeRender(item.subtitle)}</span>
            <span className="text-xs text-gray-400">• Excellent location</span>
          </div>
          {fullDetails?.chainName && (
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">
              {safeRender(fullDetails.chainName)}
            </span>
          )}
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-8">
          <div className="lg:col-span-8 h-[350px] md:h-[420px] rounded-xl overflow-hidden bg-gray-100 relative group">
            <img 
              src={hotelImages[currentImageIndex]?.url || hotelImages[0]?.url} 
              className="w-full h-full object-cover"
              alt={hotelImages[currentImageIndex]?.caption || item.title}
            />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
              <span className="text-xs text-white font-medium">
                {currentImageIndex + 1} / {hotelImages.length || 1}
              </span>
            </div>
            <button 
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium text-white hover:bg-black/80 transition"
            >
              View All Photos
            </button>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-3 h-[350px] md:h-[420px]">
            {hotelImages.slice(0, 4).map((img, i) => (
              <div 
                key={img.id || i} 
                className="rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition"
                onClick={() => setCurrentImageIndex(i)}
              >
                <img src={img.url} className="w-full h-full object-cover" alt={img.caption || ''} />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-6 overflow-x-auto">
                {['overview', 'rooms', 'amenities', 'policies'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium capitalize transition relative ${
                      activeTab === tab 
                        ? 'text-[#33a8da] border-b-2 border-[#33a8da]' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'overview' ? 'Overview' : 
                     tab === 'rooms' ? 'Room Types' : 
                     tab === 'amenities' ? 'Amenities' : 'Policies'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {renderActiveContent()}
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
              {/* Dates */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</label>
                <p className="text-sm font-semibold text-gray-900">{checkInDate || 'Select date'}</p>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-2 block">Check-out</label>
                <p className="text-sm font-semibold text-gray-900">{checkOutDate || 'Select date'}</p>
              </div>

              {/* Guests */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</label>
                <p className="text-sm font-semibold text-gray-900">{getGuestsDisplay()}</p>
              </div>

              {/* Price */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-500">Price for {nights || 1} night{nights && nights > 1 ? 's' : ''}</p>
                    <p className="text-2xl font-bold text-[#33a8da]">{convertedPrice || 'Price on request'}</p>
                  </div>
                </div>
              </div>

              {/* Selected Room */}
              {selectedRoomType && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Selected Room</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {safeRender(selectedRoomType.name || selectedRoomType.type || 'Standard Room')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatRoomPrice(selectedRoomType.price)} per night
                  </p>
                </div>
              )}

              {/* Book Button */}
              <button 
                onClick={onBook}
                className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-xl hover:bg-[#2c98c7] transition active:scale-95 text-sm"
              >
                Reserve Room
              </button>

              {/* Save Button */}
              <button 
                onClick={handleSaveToggle}
                disabled={isSaving}
                className={`w-full mt-2 py-2 text-sm font-medium border rounded-xl transition ${
                  isSaved 
                    ? 'border-red-200 text-red-500 hover:bg-red-50' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {isSaved ? '❤️ Saved' : '♡ Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Gallery */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-300">
          <div className="flex justify-between items-center px-4 py-3 text-white border-b border-white/10 shrink-0">
            <div className="flex flex-col">
              <p className="text-xs font-medium text-[#33a8da]">Gallery</p>
              <h3 className="text-sm font-bold truncate max-w-[200px]">{item.title}</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {currentImageIndex + 1} / {hotelImages.length || 1}
              </span>
              <button 
                onClick={() => setIsLightboxOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 relative flex items-center justify-center px-4 py-2 min-h-0">
            <button 
              onClick={() => setCurrentImageIndex(prev => (prev - 1 + hotelImages.length) % hotelImages.length)} 
              className="absolute left-2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition flex items-center justify-center border border-white/10 text-white active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="w-full max-w-5xl h-full flex items-center justify-center">
              <img
                src={hotelImages[currentImageIndex]?.url || hotelImages[0]?.url}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                alt={hotelImages[currentImageIndex]?.caption || item.title}
              />
            </div>

            <button 
              onClick={() => setCurrentImageIndex(prev => (prev + 1) % hotelImages.length)}
              className="absolute right-2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition flex items-center justify-center border border-white/10 text-white active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-3 border-t border-white/10 shrink-0 overflow-x-auto">
            <div className="flex justify-center gap-2">
              {hotelImages.map((img, i) => (
                <button
                  key={img.id || i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    currentImageIndex === i 
                      ? 'border-[#33a8da] shadow-lg shadow-[#33a8da]/30' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={img.url} 
                    className="w-full h-full object-cover" 
                    alt={img.caption || ''} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
              <button 
                onClick={() => setShowSaveModal(false)} 
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
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