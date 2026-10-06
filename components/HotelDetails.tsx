'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { SearchResult, SearchParams } from '../lib/types';
import api from '../lib/api';
import CompactSearchBox from './CompactSearchBox';
import { config } from '../lib/config';
import { extractAmenities } from '@/lib/amenities'; 
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
  onBook: (bookingData?: any) => void;
  onFetchImages?: (hotelId: string, hotelName?: string) => Promise<any[]>;
  onFetchSuggestions?: (query: string) => Promise<any[]>;
  onNewSearch?: (params: any) => void;
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


const extractRoomAmenities = (description: string): string[] => {
  if (!description) return [];
  const desc = description.toUpperCase();
  const found: string[] = [];

  // Bed config
  if (/\b1\s*KING\b|KING BED|\bKING\b/.test(desc)) found.push('King Bed');
  if (/\b1\s*QUEEN\b|QUEEN BED|\bQUEEN\b/.test(desc)) found.push('Queen Bed');
  if (/\b1\s*DOUBLE\b|DOUBLE BED|\bDOUBLE\b/.test(desc)) found.push('Double Bed');
  if (/\b2\s*TWIN\b|TWIN BEDS?|\bTWIN\b/.test(desc)) found.push('Twin Beds');
  if (/\b1\s*SINGLE\b|SINGLE BED|\bSINGLE\b/.test(desc)) found.push('Single Bed');

  // Common Amadeus codes
  if (/\bNSMK\b|NON[- ]?SMOKING/.test(desc)) found.push('Non-Smoking');
  if (/\bSMK\b|\bSMOKING\b/.test(desc)) found.push('Smoking');

  // Board / meal plans
  if (/\bBED\s*&\s*BREAKFAST\b|\bBED AND BREAKFAST\b|\bBB\b/.test(desc)) found.push('Breakfast Included');
  if (/\bHALF\s*BOARD\b|\bHB\b/.test(desc)) found.push('Half Board');
  if (/\bFULL\s*BOARD\b|\bFB\b/.test(desc)) found.push('Full Board');
  if (/\bROOM\s*ONLY\b|\bRO\b/.test(desc)) found.push('Room Only');

  // Board types
  if (/\bBEST\s*FLEXIBLE\s*RATE\b/.test(desc)) found.push('Flexible Rate');
  if (/\bBEST\s*AVAILABLE\s*RATE\b|\bBAR\b/.test(desc)) found.push('Best Available Rate');
  if (/\bSPECIAL\s*OFFER\b|\bPROMO/.test(desc)) found.push('Special Offer');
  if (/\bADVANCE\s*SAVER\b/.test(desc)) found.push('Advance Saver');
  if (/\bFREE\s*CANCELLATION\b/.test(desc)) found.push('Free Cancellation');

  // Room features
  if (/\bWIFI\b|WI-FI|INTERNET/.test(desc)) found.push('Wi-Fi');
  if (/\bBALCONY\b/.test(desc)) found.push('Balcony');
  if (/\bTERRACE\b/.test(desc)) found.push('Terrace');
  if (/\bOCEAN\s*VIEW\b|SEA\s*VIEW/.test(desc)) found.push('Sea View');
  if (/\bCITY\s*VIEW\b/.test(desc)) found.push('City View');
  if (/\bGARDEN\s*VIEW\b/.test(desc)) found.push('Garden View');
  if (/\bMOUNTAIN\s*VIEW\b/.test(desc)) found.push('Mountain View');
  if (/\bPOOL\s*VIEW\b/.test(desc)) found.push('Pool View');

  // Room categories
  if (/\bSUITE\b/.test(desc)) found.push('Suite');
  if (/\bAPARTMENT\b/.test(desc)) found.push('Apartment');
  if (/\bSTUDIO\b/.test(desc)) found.push('Studio');
  if (/\bEXECUTIVE\b/.test(desc)) found.push('Executive');
  if (/\bDELUXE\b/.test(desc)) found.push('Deluxe');
  if (/\bSUPERIOR\b/.test(desc)) found.push('Superior');
  if (/\bPREMIUM\b/.test(desc)) found.push('Premium');
  if (/\bSTANDARD\b/.test(desc)) found.push('Standard');

  // Amenities
  if (/\bNESPRESSO\b/.test(desc)) found.push('Nespresso Machine');
  if (/\bCOFFEE\s*MAKER\b/.test(desc)) found.push('Coffee Maker');
  if (/\bTEA\s*MAKER\b/.test(desc)) found.push('Tea Maker');
  if (/\bMINI\s*BAR\b|MINIBAR/.test(desc)) found.push('Minibar');
  if (/\bSAFE\b/.test(desc)) found.push('In-Room Safe');
  if (/\bHAIR\s*DRYER\b/.test(desc)) found.push('Hair Dryer');
  if (/\bTV\b|FLAT[- ]SCREEN|SMART\s*TV/.test(desc)) found.push('Flat-screen TV');
  if (/\bAIR\s*CONDITIONING\b|\bAC\b|\bA\/C\b/.test(desc)) found.push('Air Conditioning');
  if (/\bHEATING\b/.test(desc)) found.push('Heating');
  if (/\bDESK\b|WORKSPACE|WORK\s*SPACE|WORKSTATION/.test(desc)) found.push('Work Desk');
  if (/\bIRON\b/.test(desc)) found.push('Iron & Board');
  if (/\bBATHTUB\b|BATH\s*TUB/.test(desc)) found.push('Bathtub');
  if (/\bSHOWER\b/.test(desc)) found.push('Shower');
  if (/\bJACUZZI\b/.test(desc)) found.push('Jacuzzi');
  if (/\bBATHROOM\s*AMENITIES\b|TOILETRIES/.test(desc)) found.push('Toiletries');

  // Accessibility & family
  if (/\bACCESSIBLE\b|WHEELCHAIR/.test(desc)) found.push('Accessible');
  if (/\bFAMILY\b/.test(desc)) found.push('Family Room');
  if (/\bCONNECTING\b/.test(desc)) found.push('Connecting Rooms');
  if (/\bSOFA\s*BED\b/.test(desc)) found.push('Sofa Bed');

  // Views
  if (/\bVIEW\b/.test(desc) && !found.some((a) => a.includes('View'))) {
    found.push('Room with View');
  }

    // Water & drinks
    if (/\bBOTTLED?\s*WATER\b/.test(desc)) found.push('Bottled Water');
    if (/\bTEA\b|\bTEA\s*MAKER\b|\bTEA\s*&\s*COFFEE\b/.test(desc) && !found.includes('Tea Maker')) {
      found.push('Tea Maker');
    }
  
    // Data / connectivity
    const gbMatch = desc.match(/\b(\d+)\s*GB\b/);
    if (gbMatch) found.push(`${gbMatch[1]}GB Wi-Fi`);
  
    // Room size (MTR = metres, SQM = square metres)
    const mtrMatch = desc.match(/\b(\d{1,3})\s*(?:MTR|M²|SQM|SQUARE\s*MET(?:RE|ER)?S?)\b/i);
    if (mtrMatch) found.push(`${mtrMatch[1]} m² Room`);
  
    // Bathroom specifics
    if (/\bMOLTON\s*BROWN\b|\bBATH\s*AMENITIES\b|\bAMENITIES\b/.test(desc) && !found.includes('Toiletries')) {
      found.push('Toiletries');
    }
  
    // Generic extras commonly seen in Amadeus strings
    if (/\bNESPRESSO\b/.test(desc) && !found.includes('Nespresso Machine')) {
      found.push('Nespresso Machine');
    }
    if (/\bFREE\s*BOTTLED\s*WATER\b/.test(desc)) {
      if (!found.includes('Bottled Water')) found.push('Bottled Water');
    }
    if (/\bNESPRESSO\s*MACHINE\b/.test(desc)) {
      if (!found.includes('Nespresso Machine')) found.push('Nespresso Machine');
    }

  return Array.from(new Set(found));
};

// Icon per amenity category for the grouped view
const CATEGORY_ICONS: Record<string, string> = {
  'Room Comfort':           'fa-bed',
  'Technology & Media':     'fa-wifi',
  'Food & Drink':           'fa-utensils',
  'Wellness & Fitness':     'fa-spa',
  'Recreation':             'fa-person-swimming',
  'Transportation':         'fa-car',
  'Guest Services':         'fa-bell-concierge',
  'Business':               'fa-briefcase',
  'Accessibility & Family': 'fa-wheelchair',
  'Other':                  'fa-circle-info',
};

// Preferred display order for the categories
const CATEGORY_ORDER: string[] = [
  'Room Comfort',
  'Technology & Media',
  'Food & Drink',
  'Wellness & Fitness',
  'Recreation',
  'Transportation',
  'Guest Services',
  'Business',
  'Accessibility & Family',
  'Other',
];

// Icon per room-amenity label (from extractRoomAmenities)
const ROOM_AMENITY_ICONS: Record<string, string> = {
  // Bed
  'King Bed': 'fa-bed',
  'Queen Bed': 'fa-bed',
  'Double Bed': 'fa-bed',
  'Twin Beds': 'fa-bed',
  'Single Bed': 'fa-bed',
  'Sofa Bed': 'fa-couch',
  // Smoking
  'Non-Smoking': 'fa-ban-smoking',
  'Smoking': 'fa-smoking',
  // Board
  'Breakfast Included': 'fa-utensils',
  'Half Board': 'fa-utensils',
  'Full Board': 'fa-utensils',
  'Room Only': 'fa-utensils',
  // Rate
  'Flexible Rate': 'fa-tag',
  'Best Available Rate': 'fa-tag',
  'Special Offer': 'fa-tag',
  'Advance Saver': 'fa-tag',
  'Free Cancellation': 'fa-circle-check',
  // Connectivity
  'Wi-Fi': 'fa-wifi',
  // Views / rooms
  'Balcony': 'fa-door-open',
  'Terrace': 'fa-house',
  'Sea View': 'fa-water',
  'City View': 'fa-city',
  'Garden View': 'fa-tree',
  'Mountain View': 'fa-mountain-sun',
  'Pool View': 'fa-person-swimming',
  'Room with View': 'fa-eye',
  'Suite': 'fa-star',
  'Apartment': 'fa-building',
  'Studio': 'fa-door-open',
  'Executive': 'fa-briefcase',
  'Deluxe': 'fa-gem',
  'Superior': 'fa-arrow-up',
  'Premium': 'fa-crown',
  'Standard': 'fa-check',
  // Amenities
  'Nespresso Machine': 'fa-mug-hot',
  'Coffee Maker': 'fa-mug-hot',
  'Tea Maker': 'fa-mug-saucer',
  'Minibar': 'fa-wine-bottle',
  'In-Room Safe': 'fa-lock',
  'Hair Dryer': 'fa-wind',
  'Flat-screen TV': 'fa-tv',
  'Air Conditioning': 'fa-snowflake',
  'Heating': 'fa-fire',
  'Work Desk': 'fa-table',
  'Iron & Board': 'fa-shirt',
  'Bathtub': 'fa-bath',
  'Shower': 'fa-shower',
  'Jacuzzi': 'fa-hot-tub-person',
  'Toiletries': 'fa-spray-can-sparkles',
  // Accessibility
  'Accessible': 'fa-wheelchair',
  'Family Room': 'fa-children',
  'Connecting Rooms': 'fa-door-open',
};

function categorizeAmenity(label: string): string {
  const l = (label || '').toLowerCase();

  // Food & Drink FIRST — must include nespresso, bottle water, tea maker, etc.
  if (/breakfast|restaurant|\bbar\b|lounge|coffee|tea\b|nespresso|minibar|mini bar|cafe|café|dining|room service|snack|beverage|bottle.?water|bottled water/i.test(l)) {
    return 'Food & Drink';
  }
  if (/wifi|wi-fi|internet|ethernet|data port|\d+\s*gb|phone|telephone|tv|television|flat.screen|av equip|computer|printer|fax|copy|satellite/i.test(l)) {
    return 'Technology & Media';
  }
  if (/pool|spa|gym|fitness|sauna|massage|jacuzzi|steam|beauty|wellness|health club|yoga/i.test(l)) {
    return 'Wellness & Fitness';
  }
  if (/parking|shuttle|car rental|taxi|limousine|airport|transport|garage|valet/i.test(l)) {
    return 'Transportation';
  }
  if (/wheelchair|accessible|family|children|childcare|pets|baby|playground|play area|crib/i.test(l)) {
    return 'Accessibility & Family';
  }
  if (/meeting|business center|conference/i.test(l)) {
    return 'Business';
  }
  if (/laundry|dry clean|concierge|elevator|luggage|currency|atm|gift|nightclub|tour|travel desk|wake|bellman|shoe shine|translation|wedding|newspaper|safe|lock/i.test(l)) {
    return 'Guest Services';
  }
  // Room Comfort — moved AFTER Food & Drink; drop "nespresso" and "minibar" from here
  if (/\bbed\b|room size|mtr|m²|sqm|air condition|a\/c|heating|heat|fan |iron|hair|bath|shower|toiletries|desk|kitchen|fridge|microwave|non.smok|smoking|balcony|view/i.test(l)) {
    return 'Room Comfort';
  }
  if (/jog|treadmill|locker|sun bed|shopping|sightseeing|swimming|steam bath|garden|shuttle to/i.test(l)) {
    return 'Recreation';
  }
  return 'Other';
}

const HotelDetails: React.FC<HotelDetailsProps> = ({
  item,
  searchParams,
  onBack,
  onBook,
  onFetchImages,
  onFetchSuggestions,
  onNewSearch, 
}) => {
  const { currency, convertPrice, formatPrice, isLoadingRates } = useLanguage();
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();
  const [searchBoxLoading, setSearchBoxLoading] = useState(false);
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
  const [bookingCardPrice, setBookingCardPrice] = useState<string>('');
  const [roomDetailModal, setRoomDetailModal] = useState<any>(null);
  const [roomImageIndex, setRoomImageIndex] = useState(0);

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
    const currencyCode = price.currency || 'GBP';
    const total = price.total;
    let formattedTotal = '0.00';
    
    if (typeof total === 'number') {
      formattedTotal = total.toFixed(2);
    } else if (typeof total === 'string') {
      const parsed = parseFloat(total);
      formattedTotal = isNaN(parsed) ? '0.00' : parsed.toFixed(2);
    }

    const currencySymbol = currencyCode === 'NGN' ? '₦' : 
                           currencyCode === 'GBP' ? '£' : 
                           currencyCode === 'USD' ? '$' : 
                           currencyCode === 'EUR' ? '€' : currencyCode;
                           
    return `${currencySymbol}${formattedTotal}`;
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
    if (searchParams?.checkInDate) return searchParams.checkInDate;
    if (item?.realData?.checkInDate) return item.realData.checkInDate;
    // ✅ Return a default if needed
    return null;
  };
  
  const getCheckOutDate = () => {
    if (searchParams?.checkOutDate) return searchParams.checkOutDate;
    if (item?.realData?.checkOutDate) return item.realData.checkOutDate;
    // ✅ Return a default if needed
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

  const getNightsCount = (customCheckIn?: string | null, customCheckOut?: string | null) => {
    const checkIn = customCheckIn || getCheckInDate();
    const checkOut = customCheckOut || getCheckOutDate();
    
    if (checkIn && checkOut) {
      try {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (nights > 0) {
          console.log(`✅ Calculated ${nights} nights for dates ${checkIn} to ${checkOut}`);
          return nights;
        }
      } catch (e) {
        console.warn('Error calculating nights:', e);
      }
    }
    return 1;
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
      
      if (data?.success && data?.data?.data && Array.isArray(data.data.data)) {
        const hotelData = data.data.data[0];
        console.log('✅ Hotel data found:', hotelData?.hotelId);
        
        if (hotelData && hotelData.roomTypes && Array.isArray(hotelData.roomTypes)) {
          console.log('✅ Found roomTypes in response:', hotelData.roomTypes.length);
          
          fetchedRoomTypes = hotelData.roomTypes.map((room: any, index: number) => {
            const price = room.price || {};
            const occupancy = room.occupancy || { maxAdults: 2 };
            
            const roomName =
            room.name?.name ||           // ✅ API returns { name: { name: "Premium Room" } }
            room.name?.text?.text ||     // legacy fallback
            room.name?.text ||           // legacy fallback
            room.type ||                 // room code fallback
            'Standard Room';
            const roomDescription =
  (typeof room.description?.text === 'string' ? room.description.text : null) ||
  room.description?.text?.text ||
  (typeof room.description === 'string' ? room.description : null) ||
  '';
            
            // ✅ GET IMAGES FROM THE API - FIXED
const roomImages = room.images || [];
const primaryImage = room.primaryImage || '';

console.log(`📸 Room ${index} (${room.type}):`);
console.log(`  - images from API: ${roomImages.length}`);
console.log(`  - primaryImage from API: ${primaryImage ? 'yes' : 'no'}`);
console.log(`  - first image URI: ${roomImages.length > 0 ? roomImages[0]?.uri : 'none'}`);
console.log(`  - roomName: ${roomName}`);

// ✅ Use ONLY API images - check images array first, then primaryImage
let roomImage = '';

// 1. Try the images array - use different image based on room index
if (roomImages && Array.isArray(roomImages) && roomImages.length > 0) {

  const imageIndex = index % roomImages.length; // Cycle through available images
  const selectedImage = roomImages[imageIndex];
  
  if (selectedImage?.uri && selectedImage.uri.startsWith('http')) {
    roomImage = selectedImage.uri;
    console.log(`  - Using image ${imageIndex + 1}/${roomImages.length} for room ${room.type}`);
  }
}

// 2. If no image found, try primaryImage
if (!roomImage && primaryImage && primaryImage.startsWith('http')) {
  roomImage = primaryImage;
}

console.log(`  - roomImage found: ${roomImage ? 'yes' : 'no'}`);
console.log(`  - roomImage URL: ${roomImage || 'none'}`);



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
            const currencyCode = price.currency || 'GBP';
            const base = parseFloat(price.base || '0');

            let serviceFee = 0;
            let conversionFee = 0;
            let markup = 0;

            if (price.fees && Array.isArray(price.fees)) {
              price.fees.forEach((fee: any) => {
                if (fee.type === 'SERVICE_FEE') serviceFee = parseFloat(fee.amount || 0);
                if (fee.type === 'CONVERSION_FEE') conversionFee = parseFloat(fee.amount || 0);
                if (fee.type === 'MARKUP' || fee.type === 'MARKUP_PERCENTAGE') markup = parseFloat(fee.amount || 0);
              });
            }
            
            const isRefundable = room.policies?.cancellation !== null;
            const cancellationDeadline = room.policies?.cancellation?.deadline || '';
            const isAvailable = room.available !== undefined ? room.available : true;
            const rateFamily = room.rateFamily || '';
            
            return {
              id: room.id || room.roomId || `room-${index}`,
              name: roomName,
              type: room.type || 'Standard',
              description: roomDescription,
              bedTypes: bedTypes,
              occupancy: occupancy,
              image: roomImage,
              images: roomImages,
              primaryImage: primaryImage,
              price: {
                total: total,
                currency: currencyCode,
                base: base,
                fees: price.fees || [], 
                markup_percentage: price.markup_percentage || 15,
                service_fee: serviceFee,      
                conversion_fee: conversionFee, 
                markup_amount: markup,         
                original_currency: price.original_currency || 'USD',
              },
              isRefundable: isRefundable,
              cancellationDeadline: cancellationDeadline,
              available: isAvailable,
              rateFamily: rateFamily,
              raw: room,
            };
          });
        }
      }
      
      if (fetchedRoomTypes.length > 0) {
        console.log('✅ Room types loaded:', fetchedRoomTypes.length);
        
        const uniqueRoomMap = new Map();
        fetchedRoomTypes.forEach((room) => {
          const key = room.type || room.name;
          if (!uniqueRoomMap.has(key)) {
            uniqueRoomMap.set(key, room);
          }
        });
        
        const uniqueRoomTypes = Array.from(uniqueRoomMap.values());
        
        console.log('✅ Final Unique Rooms:', uniqueRoomTypes.length);
        
        setRoomTypes(uniqueRoomTypes);
        if (!selectedRoomType) {
          setSelectedRoomType(uniqueRoomTypes[0]);
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
  }, [item, searchParams, currency.code]);

  useEffect(() => {
    if (item?.id) {
      fetchRoomTypesWithFees();
    }
  }, [item?.id, fetchRoomTypesWithFees]);

  // AUTO-SET BOOKING CARD PRICE
  useEffect(() => {
    if (selectedRoomType) {
      const perNight = selectedRoomType.price?.total || 0;
      const originalCurrency = selectedRoomType.price?.currency || 'USD';
      
      let calculatedNights = 1;
      const offerCheckIn = selectedRoomType.raw?.checkInDate || selectedRoomType.raw?.checkIn;
      const offerCheckOut = selectedRoomType.raw?.checkOutDate || selectedRoomType.raw?.checkOut;
      
      if (offerCheckIn && offerCheckOut) {
        try {
          const start = new Date(offerCheckIn);
          const end = new Date(offerCheckOut);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const nightsFromOffer = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (nightsFromOffer > 0) calculatedNights = nightsFromOffer;
          }
        } catch (e) {}
      }
      
      const totalForStay = perNight * calculatedNights;
      
      setOriginalPriceAmount(totalForStay);
      setOriginalPriceCurrency(originalCurrency);
      
      const updatePrice = async () => {
        if (originalCurrency !== currency.code) {
          const converted = await convertPrice(totalForStay, originalCurrency);
          const formatted = await formatPrice(converted);
          setBookingCardPrice(formatted);
        } else {
          const formatted = await formatPrice(totalForStay, originalCurrency);
          setBookingCardPrice(formatted);
        }
      };
      updatePrice();
    }
  }, [selectedRoomType, currency.code, convertPrice, formatPrice]);
  
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

          // ✅ EXTRACT IMAGES FROM API ONLY - NO FALLBACKS
          const extractedImages: HotelImage[] = [];

          console.log('📸 Extracting images from API...');

          // 1️⃣ Try media array (primary source)
          if (hotelData.media && Array.isArray(hotelData.media)) {
            console.log(`📸 Found ${hotelData.media.length} media items`);
            
            hotelData.media.forEach((mediaItem: any, index: number) => {
              if (mediaItem.mediaScales && Array.isArray(mediaItem.mediaScales)) {
                const largestScale = mediaItem.mediaScales.reduce((a: any, b: any) => {
                  const aSize = (a.dimensions?.width || 0) * (a.dimensions?.height || 0);
                  const bSize = (b.dimensions?.width || 0) * (b.dimensions?.height || 0);
                  return aSize > bSize ? a : b;
                });
                
                if (largestScale?.href) {
                  const category = mediaItem.category || mediaItem.tags?.[0] || 'Hotel View';
                  const displayCategory = categoryMap[category] || category || 'Hotel View';
                  
                  const isDuplicate = extractedImages.some(img => img.url === largestScale.href);
                  if (!isDuplicate) {
                    extractedImages.push({
                      id: mediaItem.id || `img-${index}`,
                      url: largestScale.href,
                      caption: displayCategory,
                      type: category,
                      category: displayCategory,
                    });
                  }
                }
              }
              
              if (mediaItem.url) {
                const isDuplicate = extractedImages.some(img => img.url === mediaItem.url);
                if (!isDuplicate) {
                  extractedImages.push({
                    id: mediaItem.id || `img-url-${index}`,
                    url: mediaItem.url,
                    caption: mediaItem.category || 'Hotel View',
                    type: mediaItem.type || 'image',
                    category: mediaItem.category || 'Hotel View',
                  });
                }
              }
            });
          }

          console.log(`📸 Extracted ${extractedImages.length} images from media`);

          // 2️⃣ If no images from media, try hotelData.images
          if (extractedImages.length === 0 && hotelData.images && Array.isArray(hotelData.images)) {
            console.log(`📸 Trying hotelData.images: ${hotelData.images.length} images`);
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

          // 3️⃣ Try primaryImage
          if (extractedImages.length === 0 && hotelData.primaryImage) {
            console.log('📸 Using primaryImage');
            extractedImages.push({
              id: 'primary',
              url: hotelData.primaryImage,
              caption: 'Hotel View',
              type: 'primary',
              category: 'Hotel View',
            });
          }

          console.log(`✅ Final API images: ${extractedImages.length}`);

// 4️⃣ Extract room images from roomTypes (if available)
const roomImagesFromTypes: HotelImage[] = [];

if (roomTypes && Array.isArray(roomTypes) && roomTypes.length > 0) {
  console.log(`📸 Extracting room images from ${roomTypes.length} room types`);
  
  roomTypes.forEach((room: any, index: number) => {
    if (room.images && Array.isArray(room.images) && room.images.length > 0) {
      // Get the first image from each room type
      const firstImage = room.images[0];
      if (firstImage?.uri) {
        // Always add room images (even if URLs are the same as hotel images)
// They have different captions and categories
roomImagesFromTypes.push({
  id: `room-${index}`,
  url: firstImage.uri,
  caption: `Room ${room.type || index + 1}`,
  type: 'ROOM_VIEW',
  category: 'Room View',
});
      }
      
      // Optionally add the second image from each room for variety
      if (room.images.length > 1 && room.images[1]?.uri) {
        const secondImage = room.images[1];
        const isDuplicate = roomImagesFromTypes.some(img => img.url === secondImage.uri);
        if (!isDuplicate) {
          roomImagesFromTypes.push({
            id: `room-${index}-2`,
            url: secondImage.uri,
            caption: `Room ${room.type || index + 1}`,
            type: 'ROOM_VIEW',
            category: 'Room View',
          });
        }
      }
    }
  });
  
  console.log(`📸 Extracted ${roomImagesFromTypes.length} images from room types`);
}

// 5️⃣ Combine hotel images with room images
const allImages = [...extractedImages, ...roomImagesFromTypes];

// Remove duplicates based on URL
const uniqueImages = allImages.filter((img, index, self) => 
  index === self.findIndex((t) => t.url === img.url)
);

console.log(`✅ Final combined images: ${uniqueImages.length} (${extractedImages.length} hotel + ${roomImagesFromTypes.length} room)`);

// ✅ ONLY SET IMAGES FROM API - NO FALLBACKS
if (uniqueImages.length > 0) {
  setHotelImages(uniqueImages);
  setCurrentImageIndex(0);
} else {
  console.warn('⚠️ No images found from API');
  setHotelImages([]);
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

   
  useEffect(() => {
    // Only run if we have room types
    if (roomTypes.length === 0) return;
    
    console.log('🔄 Updating gallery with room images from roomTypes...');
    console.log(`📸 Found ${roomTypes.length} room types`);
    
    const roomImagesFromTypes: HotelImage[] = [];
    const addedUrls = new Set<string>();
    
    // First, add existing hotel image URLs to the set to avoid duplicates
    hotelImages.forEach(img => {
      if (img.url) addedUrls.add(img.url);
    });
    
    roomTypes.forEach((room: any, index: number) => {
      if (room.images && Array.isArray(room.images) && room.images.length > 0) {
        console.log(`  📸 Room ${room.type} has ${room.images.length} images`);
        
        // Use the room index to pick a DIFFERENT image from the array
        const imageIndex = index % room.images.length;
        const selectedImage = room.images[imageIndex];
        
        if (selectedImage?.uri && !addedUrls.has(selectedImage.uri)) {
          addedUrls.add(selectedImage.uri);
          roomImagesFromTypes.push({
            id: `room-${room.type || index}`,
            url: selectedImage.uri,
            caption: `Room ${room.type || index + 1}`,
            type: 'ROOM_VIEW',
            category: 'Room View',
          });
          console.log(`    ✅ Added image ${imageIndex + 1} for room ${room.type}`);
        }
      }
    });
    
    if (roomImagesFromTypes.length > 0) {
      console.log(`📸 Adding ${roomImagesFromTypes.length} unique room images to gallery`);
      
      // ✅ ROOM IMAGES FIRST, then hotel images
      const updatedImages = [...roomImagesFromTypes, ...hotelImages];
      setHotelImages(updatedImages);
    } else {
      console.log('📸 No new unique room images to add');
    }
  }, [roomTypes]); // This runs whenever roomTypes changes



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
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">About the Hotel</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            {description || "Experience luxury and comfort in this beautiful property."}
          </p>
          {fullDetails?.chainName && (
            <p className="text-xs font-medium text-gray-400 mt-2">Chain: {fullDetails.chainName}</p>
          )}
        </div>

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

        {amenities.length > 0 && (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold text-gray-900">Top Amenities</h3>
      <button
        onClick={() => setActiveTab('amenities')}
        className="text-xs text-[#33a8da] hover:underline font-medium"
      >
        See all {amenities.length} →
      </button>
    </div>
    <div className="flex flex-wrap gap-2">
      {extractAmenities({ amenities })
        .slice(0, 10)
        .map((a, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700"
          >
            <i
              className={`fa-solid fa-${a.icon || 'circle-info'} text-gray-400 text-[11px]`}
              aria-hidden
            />
            <span>{a.label}</span>
          </span>
        ))}
    </div>
  </div>
)}
      </div>
    );
  };

  // ✅ Group rooms by name (e.g., "Standard Room" appears once, all rate plans inside)
const groupRoomsByType = useCallback((rooms: any[]) => {
  const groups = new Map<string, {
    key: string;
    name: string;
    type: string;
    image: string;
    images: any[];
    features: string[];
    maxAdults: number;
    bedTypes: any[];
    description: string;
    rateFamily: string;
    rates: any[];
  }>();

  rooms.forEach((room) => {
    const name = room.name || room.type || 'Standard Room';
const key = name; 

    if (!groups.has(key)) {
      // Extract feature tags from description (uses your existing helper)
      const features = extractRoomAmenities(room.description || '');

      groups.set(key, {
        key,
        name,
        type: room.type || '',
        image: room.image || room.primaryImage || '',
        images: room.images || [],
        features,
        maxAdults: room.occupancy?.maxAdults || 2,
        bedTypes: room.bedTypes || [],
        description: room.description || '',
        rateFamily: room.rateFamily || '',
        rates: [],
      });
    }

    groups.get(key)!.rates.push(room);
  });

 
  // Sort rates inside each group by price ascending
for (const group of groups.values()) {
  group.rates.sort((a, b) => (a.price?.total || 0) - (b.price?.total || 0));

  // ✅ Deduplicate visually identical rate plans
  const seen = new Set<string>();
  group.rates = group.rates.filter((rate) => {
    // Extract the "visible fingerprint" of this rate
    const rateFeatures = extractRoomAmenities(rate.description || '');
    const boardType = rateFeatures.find(f =>
      /breakfast|half board|full board|room only/i.test(f)
    ) || '';
    const isFlexible = rate.isRefundable ||
      rateFeatures.some(f => /free cancellation|flexible rate/i.test(f));

   
    const bedSig = (rate.bedTypes || [])
      .map((b: any) => `${b.type || 'Bed'}${b.quantity > 1 ? 'x' + b.quantity : ''}`)
      .sort()
      .join('|');

  
    const fingerprint = [
      rate.price?.total || 0,
      rate.price?.currency || '',
      bedSig,
      boardType.toLowerCase(),
      isFlexible ? 'refundable' : 'nonrefundable',
      (rate.rateFamily || '').toLowerCase(),
      rate.cancellationDeadline || '',
    ].join('::');

    if (seen.has(fingerprint)) {
    
      console.log(`🗑️ Deduping rate: ${fingerprint}`);
      return false;
    }
    seen.add(fingerprint);
    return true;
  });
}

return Array.from(groups.values()).sort(
  (a, b) => (a.rates[0]?.price?.total || 0) - (b.rates[0]?.price?.total || 0)
);
}, []);

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
      </div>
    );
  }

  const grouped = groupRoomsByType(roomTypes);

  // Helper: calculate nights from offer dates
  const getRoomNights = (room: any) => {
    const checkIn = room.raw?.checkInDate || room.raw?.checkIn;
    const checkOut = room.raw?.checkOutDate || room.raw?.checkOut;
    if (checkIn && checkOut) {
      try {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const n = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (n > 0) return n;
        }
      } catch { /* noop */ }
    }
    return nights;
  };

  // Short icon set for the room-level chips
  const IcoSnow = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18" />
    </svg>
  );
  const IcoWifi = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0M5.05 13.05a10 10 0 0113.9 0" />
    </svg>
  );
  const IcoBath = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3zM7 12V6a2 2 0 114 0" />
    </svg>
  );
  const IcoTv = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 22h8M12 18v4" />
    </svg>
  );
  const IcoBed = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10V7a2 2 0 012-2h4a2 2 0 012 2v3m0 0V7a2 2 0 012-2h4a2 2 0 012 2v3m0 0v9m0-9H3m0 0v9m18-3H3" />
    </svg>
  );
  const IcoUser = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  const IcoCoffee = () => (
    <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  );
  const IcoCheck = () => (
    <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
  const IcoInfo = () => (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
    </svg>
  );

  return (
    <div className="space-y-4">
      {grouped.map((group) => {
        const currencyCode = group.rates[0]?.price?.currency || 'GBP';
        const currencySymbol =
          currencyCode === 'NGN' ? '₦'
          : currencyCode === 'GBP' ? '£'
          : currencyCode === 'USD' ? '$'
          : currencyCode === 'EUR' ? '€'
          : currencyCode;

        // Short feature chips based on parsed features
        const featureChips = [
          { show: group.features.some(f => /air condition/i.test(f)), icon: <IcoSnow />, label: 'Air conditioning' },
          { show: group.features.some(f => /bath/i.test(f)),          icon: <IcoBath />, label: 'Private bathroom' },
          { show: group.features.some(f => /tv/i.test(f)),            icon: <IcoTv />,   label: 'Flat-screen TV' },
          { show: group.features.some(f => /sound/i.test(f)),         icon: <IcoSnow />, label: 'Soundproofing' },
          { show: group.features.some(f => /wifi|internet/i.test(f)), icon: <IcoWifi />, label: 'Free WiFi' },
        ].filter(c => c.show);

        const bedDisplay = group.bedTypes.length > 0
          ? group.bedTypes.map((b: any) => `${b.quantity > 1 ? `${b.quantity} × ` : ''}${b.type || 'Bed'}`).join(' • ')
          : 'Queen';

        return (
          <div key={group.key} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row">
              {/* ── LEFT: Room info ── */}
              <div className="lg:w-[30%] p-4 border-b lg:border-b-0 lg:border-r border-gray-100">
                {group.image ? (
                  <img
                    src={group.image}
                    alt={group.name}
                    className="w-full h-32 object-cover rounded-md mb-3"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                <h3 className="text-[#33a8da] font-bold text-base mb-2 hover:underline cursor-pointer">
                  {safeRender(group.name)}
                </h3>

                <div className="flex items-center gap-1.5 text-gray-700 text-xs mb-1">
                  <IcoUser />
                  <span>Sleeps: {group.maxAdults} adult{group.maxAdults > 1 ? 's' : ''}</span>
                </div>
                

                {/* Feature chips */}
                {featureChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {featureChips.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[10px] text-gray-700 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5"
                      >
                        {f.icon}
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setRoomDetailModal(group.rates[0]);
                    setRoomImageIndex(0);
                  }}
                  className="text-[10px] text-[#33a8da] hover:underline mt-3 inline-flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View details
                </button>
              </div>

              {/* ── RIGHT: Rate plans ── */}
              <div className="flex-1">
                {group.rates.map((rate: any, idx: number) => {
                  const isSelected = selectedRoomType?.id === rate.id;
                  const price = rate.price?.total || 0;
                  const basePrice = rate.price?.base || 0;
                  const roomNights = getRoomNights(rate);

                  // Detect board type
                  const rateFeatures = extractRoomAmenities(rate.description || '');
                  const boardType = rateFeatures.find(f =>
                    /breakfast|half board|full board|room only/i.test(f)
                  ) || null;
                  const isFlexible = rate.isRefundable ||
                    rateFeatures.some(f => /free cancellation|flexible rate/i.test(f));

                  return (
                    <div
                      key={rate.id || idx}
                      className={`flex flex-col lg:flex-row items-stretch ${
                        idx < group.rates.length - 1 ? 'border-b border-gray-100' : ''
                      } ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* Today's price */}
                      <div className="lg:w-[30%] p-4 border-b lg:border-b-0 lg:border-r border-gray-100">
                        {basePrice > price && (
                          <div className="text-xs text-red-500 line-through mb-0.5">
                            {currencySymbol}{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-gray-900">
                            {currencySymbol}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <IcoInfo />
                        </div>
                        <div className="text-xs text-gray-500">Includes taxes and fees</div>
                        <div className="text-xs text-gray-500">
                          {roomNights} night{roomNights > 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Available rates */}
                      <div className="lg:flex-1 p-4 border-b lg:border-b-0 lg:border-r border-gray-100">
                      <div className="flex items-start gap-2 text-sm text-gray-800 mb-2">
    <IcoBed />
    <span>
      {rate.bedTypes && rate.bedTypes.length > 0
        ? rate.bedTypes.map((b: any) => `${b.quantity > 1 ? `${b.quantity} × ` : ''}${b.type || 'Bed'}`).join(' • ')
        : 'Queen'}
    </span>
  </div>
                        {boardType && (
                          <div className="flex items-start gap-2 text-sm text-gray-800 mb-2">
                            <IcoCoffee />
                            <span>{boardType}</span>
                          </div>
                        )}
                        {isFlexible ? (
                          <div className="flex items-start gap-2 text-sm text-green-700 mb-2">
                            <IcoCheck />
                            <span>
                              {rate.cancellationDeadline
                                ? `Free cancellation before ${new Date(rate.cancellationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : 'Free cancellation'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-sm text-gray-500 mb-2">
                            <span className="w-4 h-4" />
                            <span>Non-refundable</span>
                          </div>
                        )}
                        {rate.rateFamily && (
                          <div className="flex items-start gap-2 text-xs text-purple-600 mt-1">
                            <span className="w-4" />
                            <span>Rate: {rate.rateFamily}</span>
                          </div>
                        )}
                      </div>

                      {/* Select */}
                      <div className="lg:w-[22%] p-4 flex flex-col items-start justify-center gap-2">
                        <button
                          type="button"
                          disabled={!rate.available}
                          onClick={() => {
                            if (!rate.available) return;
                            setSelectedRoomType(rate);
                            setOriginalPriceAmount(price);
                            setOriginalPriceCurrency(currencyCode);

                            // Sync booking card price
                            if (currencyCode !== currency.code) {
                              convertPrice(price, currencyCode).then(converted => {
                                formatPrice(converted).then(formatted => setBookingCardPrice(formatted));
                              });
                            } else {
                              formatPrice(price, currencyCode).then(formatted => setBookingCardPrice(formatted));
                            }
                          }}
                          className={`w-full text-sm font-semibold py-2 rounded transition ${
                            !rate.available
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : isSelected
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-[#33a8da] text-white hover:bg-[#2c98c7]'
                          }`}
                        >
                          {!rate.available ? 'Sold Out' : isSelected ? '✓ Selected' : "I'll reserve"}
                        </button>
                        {rate.isRefundable && (
                          <p className="text-[10px] text-gray-500 leading-tight">
                            • You won&apos;t be charged yet
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
const renderAmenities = () => {
  const rawAmenities = fullDetails?.amenities || [];
  const amenities = extractAmenities({ amenities: rawAmenities });

  if (amenities.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No amenity details provided for this hotel.
      </p>
    );
  }

  // Group by category
  const groups: Record<string, typeof amenities> = {};
  for (const a of amenities) {
    const cat = categorizeAmenity(a.label);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(a);
  }

  const sortedCategories = CATEGORY_ORDER.filter((c) => groups[c]?.length > 0);

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => (
        <div key={category}>
          {/* Category header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[#33a8da]/10 flex items-center justify-center">
              <i
                className={`fa-solid ${CATEGORY_ICONS[category] || 'fa-circle-info'} text-[#33a8da] text-sm`}
                aria-hidden
              />
            </div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              {category}
            </h3>
            <span className="text-xs text-gray-400">
              ({groups[category].length})
            </span>
          </div>

          {/* Amenities grid */}
          <div className="flex flex-wrap gap-2">
            {groups[category].map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-gray-100 transition"
              >
                <i
                  className={`fa-solid fa-${a.icon || 'circle-info'} text-gray-400 text-[11px]`}
                  aria-hidden
                />
                <span>{a.label}</span>
              </span>
            ))}
          </div>
        </div>
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
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={onBack} className="hover:text-[#33a8da] transition">Home</button>
          <span>/</span>
          <span>Hotel Search</span>
          <span>/</span>
          <span className="text-[#33a8da] font-medium">Property Details</span>
        </nav>
        {onNewSearch && (
          <div className="mb-6">
            <CompactSearchBox
              activeTab="hotels"
              loading={searchBoxLoading}
              initialParams={{
                type: 'hotels',
                location: searchParams?.location || item?.subtitle || '',
                cityCode: searchParams?.cityCode || (item as any)?.hotelId || '',
                checkInDate: searchParams?.checkInDate,
                checkOutDate: searchParams?.checkOutDate,
                travellers: { adults: searchParams?.adults || 2, children: 0 },
                rooms: searchParams?.rooms || 1,
              }}
              onSearch={async (data) => {
                console.log('🔄 New hotel search from details header:', data);
                setSearchBoxLoading(true);
                try {
                  // Hand control back to the parent — it should navigate/search
                  onNewSearch(data);
                } finally {
                  setSearchBoxLoading(false);
                }
              }}
            />
          </div>
        )}

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

        {/* Gallery - Only API images, NO fallbacks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-8">
          <div className="lg:col-span-8 h-[350px] md:h-[420px] rounded-xl overflow-hidden bg-gray-100 relative group">
            {hotelImages.length > 0 ? (
              <>
                <img 
                  src={hotelImages[currentImageIndex]?.url || hotelImages[0]?.url} 
                  className="w-full h-full object-cover"
                  alt={hotelImages[currentImageIndex]?.caption || item.title}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (hotelImages.length > 1) {
                      const nextIndex = (currentImageIndex + 1) % hotelImages.length;
                      target.src = hotelImages[nextIndex]?.url || '';
                    } else {
                      target.style.display = 'none';
                    }
                  }}
                />
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
                  <span className="text-xs text-white font-medium">
                    {currentImageIndex + 1} / {hotelImages.length}
                  </span>
                </div>
                <button 
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium text-white hover:bg-black/80 transition"
                >
                  View All Photos ({hotelImages.length})
                </button>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm font-medium">No images available</p>
                  <p className="text-gray-300 text-xs mt-1">Images not provided by the hotel</p>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-3 h-[350px] md:h-[420px]">
            {hotelImages.slice(0, 4).map((img, i) => (
              <div 
                key={img.id || i} 
                className={`rounded-xl overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition ${
                  currentImageIndex === i ? 'ring-2 ring-[#33a8da]' : ''
                }`}
                onClick={() => setCurrentImageIndex(i)}
              >
                <img 
                  src={img.url} 
                  className="w-full h-full object-cover" 
                  alt={img.caption || ''}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ))}
            {hotelImages.length === 0 && (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
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
            <div className="min-h-[300px]">
              {renderActiveContent()}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-24">
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</label>
                <p className="text-sm font-semibold text-gray-900">{checkInDate || 'Select date'}</p>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-2 block">Check-out</label>
                <p className="text-sm font-semibold text-gray-900">{checkOutDate || 'Select date'}</p>
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Guests</label>
                <p className="text-sm font-semibold text-gray-900">{getGuestsDisplay()}</p>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-500">
                      Price for {(() => {
                        if (selectedRoomType) {
                          const offerCheckIn = selectedRoomType.raw?.checkInDate || selectedRoomType.raw?.checkIn;
                          const offerCheckOut = selectedRoomType.raw?.checkOutDate || selectedRoomType.raw?.checkOut;
                          
                          if (offerCheckIn && offerCheckOut) {
                            try {
                              const start = new Date(offerCheckIn);
                              const end = new Date(offerCheckOut);
                              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                                const calculatedNights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                if (calculatedNights > 0) {
                                  return `${calculatedNights} night${calculatedNights > 1 ? 's' : ''}`;
                                }
                              }
                            } catch (e) {}
                          }
                        }
                        return `${nights || 1} night${(nights || 1) > 1 ? 's' : ''}`;
                      })()}
                    </p>
                    <p className="text-2xl font-bold text-[#33a8da]">
                      {selectedRoomType && bookingCardPrice ? bookingCardPrice : (convertedPrice || 'Price on request')}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRoomType && (
  <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-100">
    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Selected Room</p>
    <p className="text-sm font-semibold text-gray-900">
      {safeRender(selectedRoomType.name || selectedRoomType.type || 'Standard Room')}
    </p>
    <p className="text-xs text-gray-500 mt-1">
      {formatRoomPrice(selectedRoomType.price)} total for {(() => {
        const checkIn = selectedRoomType.raw?.checkInDate || selectedRoomType.raw?.checkIn;
        const checkOut = selectedRoomType.raw?.checkOutDate || selectedRoomType.raw?.checkOut;
        if (checkIn && checkOut) {
          try {
            const start = new Date(checkIn);
            const end = new Date(checkOut);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
              if (nights > 0) return `${nights} night${nights > 1 ? 's' : ''}`;
            }
          } catch (e) {}
        }
        return 'stay';
      })()}
    </p>

    {/* ✅ Room amenities — icon + label */}
    {(() => {
      const parsed = extractRoomAmenities(selectedRoomType.description || '');
      if (parsed.length === 0) return null;
      return (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">
            Room Amenities ({parsed.length})
          </p>
          <div className="space-y-1">
            {parsed.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-gray-700">
                <i
                  className={`fa-solid ${ROOM_AMENITY_ICONS[a] || 'fa-circle-check'} text-[#33a8da] text-[10px] w-3`}
                  aria-hidden
                />
                <span className="truncate">{a}</span>
              </div>
            ))}
            {parsed.length > 10 && (
              <p className="text-[10px] text-gray-400 italic pt-0.5">
                +{parsed.length - 10} more
              </p>
            )}
          </div>
        </div>
      );
    })()}
  </div>
)}

<button 
  onClick={() => {
    if (selectedRoomType) {
      // ✅ Store the selected room data with dates
      const bookingData = {
        room: selectedRoomType,
        price: originalPriceAmount,
        currency: originalPriceCurrency,
        formattedPrice: bookingCardPrice || convertedPrice,
        // ✅ INCLUDE DATES - these are critical for the booking
        checkInDate: searchParams?.checkInDate || checkInDate,
        checkOutDate: searchParams?.checkOutDate || checkOutDate,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: getGuestsDisplay(),
        nights: nights,
        hotelName: item?.title,
        hotelId: item?.id,
        selectedRoomData: selectedRoomType,
        selectedRoomType: selectedRoomType.type || selectedRoomType.name,
        roomTypeName: selectedRoomType.name || selectedRoomType.type || 'Standard Room',
        totalAmount: originalPriceAmount,
        final_amount: originalPriceAmount.toString(),
        final_price: originalPriceAmount.toString(),
        selectedCurrency: originalPriceCurrency,
        offerId: selectedRoomType.raw?.offerId || selectedRoomType.id || item?.id,
        roomImages: selectedRoomType.images || [],
        roomPrimaryImage: selectedRoomType.primaryImage || selectedRoomType.image || '',
        // ✅ Add hotel data
        hotel: item,
        // ✅ Ensure type is set
        type: 'hotels',
      };
      
      console.log('📦 HotelDetails - Calling onBook with:', {
        totalAmount: bookingData.totalAmount,
        selectedRoomType: bookingData.selectedRoomType,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        nights: bookingData.nights,
      });
      
      // ✅ Call onBook with the data
      onBook(bookingData);
    } else {
      onBook();
    }
  }}
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

      {/* ✅ NEW: Room Detail Modal */}
      {roomDetailModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setRoomDetailModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 truncate">
                  {safeRender(roomDetailModal.name || roomDetailModal.type || 'Room Details')}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {/* ✅ Room Type badge */}
                  <span className="text-[10px] font-medium text-white bg-[#33a8da] px-2 py-0.5 rounded-full">
                    {safeRender(roomDetailModal.name || 'Standard Room')}
                  </span>
                  {/* Room code */}
                  {roomDetailModal.type && (
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {roomDetailModal.type}
                    </span>
                  )}
                  {/* Rate family */}
                  {roomDetailModal.rateFamily && (
                    <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      Rate: {roomDetailModal.rateFamily}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setRoomDetailModal(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

                                {/* Left: Image Slideshow */}
                                <div className="md:sticky md:top-0 md:self-start p-4">
                  {(() => {
                    const imgs = roomDetailModal.images || [];
                    const fallback = roomDetailModal.image || roomDetailModal.primaryImage;

                    const gallery: string[] = imgs
                      .map((img: any) => img?.uri)
                      .filter((u: string | undefined): u is string => !!u);

                    if (gallery.length === 0 && fallback) gallery.push(fallback);

                    if (gallery.length === 0) {
                      return (
                        <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      );
                    }

                    const total = gallery.length;
                    const idx = Math.min(roomImageIndex, total - 1);

                    const goPrev = () =>
                      setRoomImageIndex((prev) => (prev - 1 + total) % total);
                    const goNext = () =>
                      setRoomImageIndex((prev) => (prev + 1) % total);

                    return (
                      <>
                        {/* Slideshow Stage */}
                        <div
                          className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3 group"
                          onMouseEnter={(e) => {
                            const el = e.currentTarget.querySelector<HTMLElement>('.slideshow-autoplay');
                            if (el) el.dataset.paused = 'true';
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget.querySelector<HTMLElement>('.slideshow-autoplay');
                            if (el) el.dataset.paused = 'false';
                          }}
                        >
                          {/* Slides — render all, only active is visible with fade */}
                          {gallery.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Room photo ${i + 1}`}
                              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
                                i === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.opacity = '0.3';
                              }}
                            />
                          ))}

                          {/* Prev arrow — always visible on desktop, larger tap area */}
                          {total > 1 && (
                            <button
                              type="button"
                              onClick={goPrev}
                              aria-label="Previous slide"
                              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition opacity-90 group-hover:opacity-100"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                          )}

                          {/* Next arrow */}
                          {total > 1 && (
                            <button
                              type="button"
                              onClick={goNext}
                              aria-label="Next slide"
                              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition opacity-90 group-hover:opacity-100"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}

                          {/* Slide counter */}
                          {total > 1 && (
                            <div className="absolute bottom-2 right-2 z-20 bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                              {idx + 1} / {total}
                            </div>
                          )}

                          {/* Progress bar (subtle autoplay indicator) */}
                          {total > 1 && (
                            <div className="absolute bottom-0 left-0 right-0 z-20 h-0.5 bg-white/20">
                              <div
                                className="h-full bg-[#33a8da] transition-all duration-500"
                                style={{ width: `${((idx + 1) / total) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Dot indicators */}
                        {total > 1 && total <= 10 && (
                          <div className="flex justify-center gap-1.5 mb-3">
                            {gallery.map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                aria-label={`Go to slide ${i + 1}`}
                                onClick={() => setRoomImageIndex(i)}
                                className={`h-1.5 rounded-full transition-all ${
                                  i === idx ? 'w-6 bg-[#33a8da]' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        {/* Thumbnails */}
                        {total > 1 && (
                          <div className="grid grid-cols-4 gap-2">
                            {gallery.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setRoomImageIndex(i)}
                                className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                                  i === idx
                                    ? 'border-[#33a8da]'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={url}
                                  alt={`Thumbnail ${i + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Right: Details */}
                <div className="p-6 space-y-5">

                  {/* Price */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Price</p>
                    <p className="text-2xl font-bold text-[#33a8da] mt-1">
                      {formatRoomPrice(roomDetailModal.price)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total for the stay • includes taxes & fees
                    </p>
                  </div>

                                    {/* Occupancy & Bed */}
                                    <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Room Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {/* ✅ Room Type pill */}
                      <span className="px-3 py-1 bg-[#33a8da] text-white rounded-full text-xs font-medium">
                        {safeRender(roomDetailModal.name || 'Standard Room')}
                      </span>
                      {roomDetailModal.occupancy && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          👥 Max {roomDetailModal.occupancy.maxAdults || 2} adults
                        </span>
                      )}
                      {roomDetailModal.bedTypes?.map((b: any, i: number) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          🛏 {b.quantity > 1 ? `${b.quantity} × ` : ''}{b.type || 'Bed'}
                        </span>
                      ))}
                      {roomDetailModal.isRefundable ? (
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                          ✓ Refundable
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          Non-refundable
                        </span>
                      )}
                    </div>
                  </div>

                       {/* ✅ Parsed Amenities — grouped with icons */}
{(() => {
  const parsed = extractRoomAmenities(roomDetailModal.description || '');
  if (parsed.length === 0) return null;

  // Convert labels → { label, icon }
  const items = parsed.map((label) => ({
    label,
    icon: ROOM_AMENITY_ICONS[label] || 'fa-circle-check',
  }));

  // Group by category
  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const cat = categorizeAmenity(item.label);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }

  const sortedCategories = CATEGORY_ORDER.filter((c) => groups[c]?.length > 0);

  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 mb-3">
        Amenities & Features
      </h4>
      <div className="space-y-4">
        {sortedCategories.map((category) => (
          <div key={category}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-[#33a8da]/10 flex items-center justify-center">
                <i
                  className={`fa-solid ${CATEGORY_ICONS[category] || 'fa-circle-info'} text-[#33a8da] text-[11px]`}
                  aria-hidden
                />
              </div>
              <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {category}
              </h5>
              <span className="text-[10px] text-gray-400">
                ({groups[category].length})
              </span>
            </div>

            {/* Amenity chips */}
            <div className="flex flex-wrap gap-2">
              {groups[category].map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 text-gray-700 rounded-full text-xs"
                >
                  <i
                    className={`fa-solid ${a.icon} text-[#33a8da] text-[11px]`}
                    aria-hidden
                  />
                  <span>{a.label}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
})()}

                  {/* Description */}
                  {roomDetailModal.description && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2">Description</h4>
                      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                      {safeRender(roomDetailModal.description)
  .replace(/\r\n|\r|\n/g, '\n')      // ← single backslash = real newlines
  .replace(/[ \t]{2,}/g, ' ')         // collapse runs of spaces/tabs only
  .trim()}
                      </div>
                    </div>
                  )}

                  {/* Cancellation */}
                  {roomDetailModal.cancellationDeadline && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2">Cancellation</h4>
                      <p className="text-sm text-gray-600">
                        Free cancellation until{' '}
                        <strong>{new Date(roomDetailModal.cancellationDeadline).toLocaleString()}</strong>
                      </p>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-4 flex gap-3 shrink-0">
              <button
                onClick={() => setRoomDetailModal(null)}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedRoomType(roomDetailModal);
                  setRoomDetailModal(null);
                }}
                className="flex-1 py-3 bg-[#33a8da] text-white rounded-xl font-bold text-sm hover:bg-[#2c98c7] transition"
              >
                Select This Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetails;