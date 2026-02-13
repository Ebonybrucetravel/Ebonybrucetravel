'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SearchResult, SearchParams } from '../lib/types';

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
  const [activeTab, setActiveTab] = useState('Overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [hotelImages, setHotelImages] = useState<HotelImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // States for suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // States for usage stats
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(false);

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
      const baseUrl = 'https://ebony-bruce-production.up.railway.app';
      
      // If onFetchSuggestions prop is provided, use it
      if (onFetchSuggestions) {
        const data = await onFetchSuggestions(query);
        // Ensure data is an array
        setSuggestions(Array.isArray(data) ? data : []);
        return data;
      }
      
      // Otherwise use our direct API call
      const response = await fetch(`${baseUrl}/api/v1/bookings/hotels/accommodation/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.status}`);
      }
      
      const data = await response.json();
      // Ensure data is an array
      setSuggestions(Array.isArray(data) ? data : []);
      return data;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      return [];
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // ============ FETCH IMAGE USAGE STATS ============
  const fetchImageUsageStats = async () => {
    try {
      setLoadingStats(true);
      setStatsError(false);
      const baseUrl = 'https://ebony-bruce-production.up.railway.app';
      
      // Note: This endpoint likely requires authentication
      // You need to add your API key/token here
      const response = await fetch(`${baseUrl}/api/v1/bookings/hotels/images/usage-stats`, {
        headers: {
          'Authorization': 'Bearer YOUR_API_TOKEN_HERE', // Add your token
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Authentication required for usage stats. Skipping...');
          setStatsError(true);
          return null;
        }
        throw new Error(`Failed to fetch usage stats: ${response.status}`);
      }
      
      const data = await response.json();
      setUsageStats(data);
      setStatsError(false);
      return data;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      setStatsError(true);
      return null;
    } finally {
      setLoadingStats(false);
    }
  };

  // ============ FETCH HOTEL IMAGES ============
  const fetchHotelImages = async (hotelId: string, hotelName?: string) => {
    try {
      const baseUrl = 'https://ebony-bruce-production.up.railway.app';
      
      // Build URL with query parameters
      let url = `${baseUrl}/api/v1/bookings/hotels/${hotelId}/images`;
      if (hotelName) {
        url += `?hotelName=${encodeURIComponent(hotelName)}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.warn('API response is not an array:', data);
        return [];
      }
      
      // Transform API response to our HotelImage interface
      const images: HotelImage[] = data.map((img: any) => ({
        id: img.id || `${hotelId}-${Date.now()}-${Math.random()}`,
        url: img.url || img,
        caption: img.caption || `${hotelName || 'Hotel'} - Image`,
        type: img.type || 'default'
      }));
      
      return images;
    } catch (error) {
      console.error('Error in fetchHotelImages:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadHotelImages = async () => {
      if (item?.id) {
        setLoadingImages(true);
        setImageError(false);
        
        try {
          let images: HotelImage[] = [];
          
          // If onFetchImages prop is provided, use it
          if (onFetchImages) {
            const fetchedImages = await onFetchImages(item.id, item.title);
            
           // FIX: Check if fetchedImages has a data property that is an array
if (fetchedImages && typeof fetchedImages === 'object' && 'data' in fetchedImages && Array.isArray(fetchedImages.data)) {
  images = fetchedImages.data.map((img: any) => ({
    id: img.id || `${item.id}-${Date.now()}-${Math.random()}`,
    url: typeof img === 'string' ? img : img.url,
    caption: img.caption || `${item.title} - Hotel Image`,
    type: img.type || 'default'
  }));
} 
            // Also keep the array check as fallback
            else if (Array.isArray(fetchedImages) && fetchedImages.length > 0) {
              images = fetchedImages.map((img: any) => ({
                id: img.id || `${item.id}-${Date.now()}-${Math.random()}`,
                url: typeof img === 'string' ? img : img.url,
                caption: img.caption || `${item.title} - Hotel Image`,
                type: img.type || 'default'
              }));
            } else {
              console.warn('onFetchImages did not return an array or data array:', fetchedImages);
            }
          } else {
            // Otherwise use our direct API call
            images = await fetchHotelImages(item.id, item.title);
          }
          
          if (images && images.length > 0) {
            setHotelImages(images);
          } else {
            setImageError(true);
            // Fallback images if API returns none
            setHotelImages(getFallbackImages());
          }
        } catch (error) {
          console.error('Error loading hotel images:', error);
          setImageError(true);
          // Fallback images on error
          setHotelImages(getFallbackImages().slice(0, 3));
        } finally {
          setLoadingImages(false);
        }
      } else {
        // Default fallback if no hotel ID
        setHotelImages(getFallbackImages());
      }
    };
  
    loadHotelImages();
    
    // Try to fetch usage stats but don't block UI if it fails
    fetchImageUsageStats().catch(() => {
      // Silently fail - this is not critical
      setStatsError(true);
    });
  }, [item?.id, item?.title, onFetchImages]);

  // Helper function to get fallback images
  const getFallbackImages = (): HotelImage[] => [
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
    },
    {
      id: 'fallback-4',
      url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1200",
      caption: "Restaurant",
      type: "dining"
    },
    {
      id: 'fallback-5',
      url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=1200",
      caption: "Swimming Pool",
      type: "amenity"
    },
  ];

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

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.suggestions-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const nextImage = useCallback(() => {
    if (hotelImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % hotelImages.length);
  }, [hotelImages.length]);

  const prevImage = useCallback(() => {
    if (hotelImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + hotelImages.length) % hotelImages.length);
  }, [hotelImages.length]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    console.log('Selected suggestion:', suggestion);
    setSearchQuery(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    // Here you can add logic to navigate to the selected hotel
  };

  const roomOptions = [
    { type: 'Classic room', guests: 2, price: 110.00, options: ['Free cancellation', 'No prepayment'] },
    { type: 'Classic room', guests: 2, price: 125.00, options: ['Free cancellation', 'Breakfast included'] },
    { type: 'Double room', guests: 2, price: 135.00, options: ['Free cancellation', 'WiFi included'] },
    { type: 'Double room', guests: 2, price: 145.00, options: ['Breakfast included', 'No prepayment'] },
    { type: 'Classic room', guests: 3, price: 165.00, options: ['Free cancellation', 'Extra bed'] },
  ];

  const amenities = [
    { group: 'Common', items: ['Free Wi-Fi', 'Swimming Pool', 'Air Conditioning', 'Flat-screen TV', 'Ensuite Bathroom', 'Balcony'] },
    { group: 'Kitchen', items: ['Refrigerator', 'Kitchenette', 'Electric kettle', 'Microwave', 'Dining area', 'Coffee machine'] },
    { group: 'Wellness', items: ['Fitness center', 'Spa and wellness center', 'Massage', 'Hot tub/Jacuzzi'] },
    { group: 'Services', items: ['Room service', '24-hour front desk', 'Concierge service', 'Laundry', 'Airport shuttle'] }
  ];

  const policies = [
    { label: 'Check-in', value: 'From 2:00 PM' },
    { label: 'Check-out', value: 'Until 11:00 AM' },
    { label: 'Cancellation / Prepayment', value: 'Cancellation and prepayment policies vary according to accommodation type. Please enter the dates of your stay and check the conditions of your required room.' },
    { label: 'Children and extra beds', value: 'Children of all ages are welcome. Children 12 years and above are considered adults at this property.' },
    { label: 'Pets', value: 'Pets are not allowed.' },
    { label: 'Payment methods', value: 'Cash, Visa, Mastercard, American Express' }
  ];

  const renderOverview = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">About this property</h2>
          <div className="text-sm text-gray-500 font-medium leading-relaxed space-y-4">
            <p>{item.title} provides premium, air-conditioned accommodations with free Wi-Fi in a prime urban location. Every suite is meticulously designed to offer a perfect blend of modern comfort and sophisticated local style.</p>
            <p>Featuring state-of-the-art facilities, guests can enjoy a seamless stay with high-speed connectivity and luxury bedding. The property is ideally situated within walking distance of the city's main attractions.</p>
          </div>
        </div>
        <div className="w-full lg:w-64 h-40 rounded-2xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
          <img 
            src={hotelImages.length > 0 ? hotelImages[0]?.url : "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&q=80&w=600"} 
            className="w-full h-full object-cover" 
            alt="Property Map" 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-12 border-t border-gray-50">
        {[
          { label: 'Property Type', value: 'Boutique Hotel' },
          { label: 'Year Built', value: '2018 (Renovated)' },
          { label: 'Staff Languages', value: 'EN, IT, FR' },
          { label: 'Room Count', value: '42 Luxury Suites' }
        ].map(stat => (
          <div key={stat.label}>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-xs font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRooms = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white border border-gray-100 rounded-[20px] shadow-sm overflow-hidden">
        <table className="w-full text-left table-fixed">
          <thead className="bg-[#f8fbfe] border-b border-gray-100">
            <tr>
              <th className="w-[30%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room Type</th>
              <th className="w-[12%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sleeps</th>
              <th className="w-[20%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
              <th className="w-[23%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Options</th>
              <th className="w-[15%] px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {roomOptions.map((room, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition">
                <td className="px-4 py-6">
                   <p className="text-sm font-black text-[#33a8da] hover:underline cursor-pointer truncate">{room.type}</p>
                   <div className="flex gap-1.5 mt-2">
                     <span className="w-3 h-3 bg-blue-50 rounded"></span>
                     <span className="w-3 h-3 bg-gray-50 rounded"></span>
                   </div>
                </td>
                <td className="px-4 py-6">
                  <div className="flex gap-0.5 text-gray-300">
                     {[...Array(room.guests)].map((_, j) => (
                       <svg key={j} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                     ))}
                  </div>
                </td>
                <td className="px-4 py-6">
                  <p className="text-base font-black text-gray-900">${room.price.toFixed(2)}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap">Includes taxes</p>
                </td>
                <td className="px-4 py-6">
                   <div className="space-y-1.5">
                     {room.options.map((opt, k) => (
                       <div key={k} className="flex items-center gap-1.5 text-[9px] font-bold text-green-600 uppercase tracking-tighter">
                         <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>
                         <span className="truncate">{opt}</span>
                       </div>
                     ))}
                   </div>
                </td>
                <td className="px-4 py-6 text-right">
                  <button onClick={onBook} className="bg-[#33a8da] text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-[#2c98c7] transition active:scale-95 whitespace-nowrap">Reserve</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row gap-16 items-start">
         <div className="w-full md:w-64 space-y-8 shrink-0">
            <div className="flex items-center gap-5">
               <div className="text-5xl font-black text-[#33a8da] tracking-tighter">4.9</div>
               <div className="space-y-1">
                  <div className="flex text-yellow-400">
                     {[...Array(5)].map((_, i) => <svg key={i} className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
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

  const renderAmenities = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
        {amenities.map((group) => (
          <div key={group.group}>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-50 pb-2">{group.group}</h3>
            <div className="grid grid-cols-2 gap-y-4">
              {group.items.map((amenity) => (
                <div key={amenity} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-[#33a8da] rounded-full"></div>
                  <span className="text-sm font-bold text-gray-700">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white border border-gray-100 rounded-[24px] overflow-hidden shadow-sm">
        {policies.map((policy, i) => (
          <div key={policy.label} className={`flex flex-col md:flex-row p-6 ${i !== policies.length - 1 ? 'border-b border-gray-50' : ''}`}>
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

  // Loading state
  if (loadingImages) {
    return (
      <div className="bg-[#f8fbfe] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da] mx-auto mb-4"></div>
          <p className="text-gray-500">Loading hotel images...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fbfe] min-h-screen">
      {/* Immersive BLURRED Glass Lightbox Gallery */}
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
                className="w-full h-full object-cover transition-all duration-700 animate-in fade-in" 
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
                className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  currentImageIndex === i ? 'border-[#33a8da] scale-110 shadow-2xl' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={img.url} className="w-full h-full object-cover" alt={img.caption || ''} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs - Formal Style */}
        <nav className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-10">
          <button onClick={onBack} className="hover:text-gray-900 transition">Home</button>
          <span className="text-gray-200">/</span>
          <span className="hover:text-gray-900 cursor-pointer">Hotel Search</span>
          <span className="text-gray-200">/</span>
          <span className="text-[#33a8da]">Property Details</span>
        </nav>

        {/* Hotel Search Suggestions Bar */}
        <div className="mb-10 suggestions-container relative">
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
            <button className="bg-[#33a8da] text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#2c98c7] transition active:scale-95">
              Search
            </button>
          </div>

          {/* Suggestions Dropdown */}
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
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {suggestion.location}
                      </p>
                    )}
                    {suggestion.price && (
                      <p className="text-sm font-bold text-[#33a8da] mt-1">From ${suggestion.price}</p>
                    )}
                  </div>
                  {suggestion.rating && (
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                      <span className="text-xs font-black text-gray-900">{suggestion.rating}</span>
                      <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title Section - Formal Design */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-none mb-3">
              {item.title}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[#33a8da]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                <span className="text-xs font-bold text-gray-500">{item.subtitle}</span>
              </div>
              <button className="text-[10px] font-black text-[#33a8da] uppercase tracking-widest hover:underline">Show on map</button>
            </div>
            {imageError && (
              <p className="text-xs text-amber-600 mt-2">
                Using placeholder images. Actual hotel photos could not be loaded.
              </p>
            )}
            {/* Usage Stats Badge - Only show if successfully fetched */}
            {usageStats && !statsError && !loadingStats && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  API Usage: {usageStats.totalRequests || 0} requests | {usageStats.remainingCredits || 'N/A'} credits left
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-100 bg-white rounded-xl text-[10px] font-black text-gray-500 hover:bg-gray-50 transition uppercase tracking-widest shadow-sm">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
               Share
             </button>
             <button className="w-11 h-11 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition shadow-sm">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
             </button>
             <div className="bg-[#33a8da] text-white font-black px-4 py-2.5 rounded-xl text-lg tracking-tighter shadow-lg shadow-blue-500/20">4.9</div>
          </div>
        </div>

        {/* Gallery Section - Functional Slider */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-16">
           <div className="lg:col-span-8 bg-white rounded-[32px] p-0 border border-gray-100 shadow-xl overflow-hidden relative group h-[400px] lg:h-[600px]">
             {/* Slider Navigation Arrows */}
             <div className="absolute inset-0 flex items-center justify-between z-20 px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={prevImage} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#33a8da] hover:bg-white transition active:scale-90">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={nextImage} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center text-[#33a8da] hover:bg-white transition active:scale-90">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                </button>
             </div>

             <img 
               src={hotelImages[currentImageIndex]?.url}
               className="w-full h-full object-cover transition-all duration-700 animate-in fade-in" 
               alt={hotelImages[currentImageIndex]?.caption || item.title} 
             />

             {/* Image Counter Badge */}
             <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white z-30">
               {currentImageIndex + 1} / {hotelImages.length}
             </div>

             {/* View All Photos Button Overlay */}
             <button 
              onClick={() => setIsLightboxOpen(true)}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/20 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl hover:bg-black/80 transition flex items-center gap-3 z-30"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               View all {hotelImages.length} photos
             </button>
           </div>

           <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
             {hotelImages.slice(1, 3).map((img, i) => (
                <div 
                  key={img.id || i} 
                  onClick={() => setCurrentImageIndex(i + 1)} 
                  className="bg-gray-100 rounded-[24px] overflow-hidden border border-gray-100 cursor-pointer hover:opacity-90 transition relative"
                >
                   <img src={img.url} className="w-full h-full object-cover" alt={img.caption || ''} />
                   {img.caption && (
                     <div className="absolute bottom-2 left-2 right-2">
                       <span className="text-[8px] font-bold text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                         {img.caption}
                       </span>
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
                  className={`pb-5 text-[10px] font-black uppercase tracking-widest transition relative shrink-0 ${activeTab === tab ? 'text-[#33a8da]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#33a8da] rounded-full animate-in fade-in duration-300" />}
                </button>
              ))}
            </div>

            <div className="min-h-[400px]">
               {renderActiveContent()}
            </div>
          </div>

          <aside className="w-full lg:w-[380px]">
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl sticky top-24">
               <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Starting from</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{item.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Available</p>
                    <p className="text-xs font-bold text-gray-400">Next 48 hours</p>
                  </div>
               </div>

               <div className="space-y-4 mb-10">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dates</p>
                    <p className="text-sm font-bold text-gray-900">Oct 24, 2024 - Oct 27, 2024</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Guests</p>
                    <p className="text-sm font-bold text-gray-900">2 Adults, 1 Room</p>
                  </div>
               </div>

               <button onClick={onBook} className="w-full bg-[#33a8da] text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-[#2c98c7] transition active:scale-95 text-xs uppercase tracking-widest">
                 Reserve Your Stay
               </button>

               <p className="text-[9px] font-bold text-gray-400 text-center mt-6 uppercase tracking-widest">Zero hidden fees . Instant confirmation</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default HotelDetails;