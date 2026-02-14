"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";

// Define the hotel type
interface HotelDisplay {
  id: string;
  name: string;
  location: string;
  code: string;
  price: number;
  discountedPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  amenities: string[];
  chainCode?: string;
  cityName?: string;
  description?: string;
  country?: string;
}

interface HomesGridProps {
  hotels?: HotelDisplay[]; // Make it optional
  loading?: boolean;
  error?: string | null;
  title?: string;
  subtitle?: string;
}

const HomesGrid: React.FC<HomesGridProps> = ({ 
  hotels: propHotels, 
  loading = false, 
  error = null,
  title = "Beautiful Homes & Rooms",
  subtitle = "Discover comfortable stays around the world"
}) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelDisplay[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Force currency to GBP/pounds
  const currencySymbol = "£";
  const brandBlue = "#32A6D7";
  const brandBlueLight = "#e6f4fa";

  // Popular destinations with CORRECT IATA codes for hotels
  const popularDestinations = [
    { city: "London", code: "LON", country: "United Kingdom" },
    { city: "Dubai", code: "DXB", country: "UAE" },
    { city: "New York", code: "NYC", country: "USA" },
    { city: "Tokyo", code: "TYO", country: "Japan" },
    { city: "Paris", code: "PAR", country: "France" },
    { city: "Singapore", code: "SIN", country: "Singapore" }
  ];

  // If hotels are provided as props, use them; otherwise fetch fallback
  useEffect(() => {
    if (propHotels && propHotels.length > 0) {
      setHotels(propHotels);
      setInternalLoading(false);
    } else {
      // Load fallback hotels when no props provided
      setInternalLoading(true);
      try {
        const fallbackHotels = generateFallbackHotels();
        setHotels(fallbackHotels);
        setInternalError(null);
      } catch (err: any) {
        console.error("Error generating fallback hotels:", err);
        setInternalError(err.message || "Failed to load hotels");
      } finally {
        setInternalLoading(false);
      }
    }
  }, [propHotels]);

  // Transform API response to HotelDisplay format
  const transformApiResponse = (apiData: any): HotelDisplay[] => {
    if (!apiData?.data?.data) return [];
    
    return apiData.data.data.map((item: any) => {
      const hotel = item.hotel;
      const offer = item.offers?.[0] || {};
      const price = offer.price || {};
      
      return {
        id: hotel.hotelId,
        name: hotel.name,
        location: `${hotel.cityCode} - ${hotel.name}`,
        cityName: hotel.cityCode,
        country: "United Kingdom", // You might want to derive this
        code: hotel.cityCode,
        price: parseFloat(price.base || price.total || "0"),
        discountedPrice: parseFloat(price.total) || undefined,
        rating: 4.5, // Default rating since API might not provide it
        reviews: Math.floor(Math.random() * 1000) + 100, // Placeholder
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
        amenities: offer.room?.description?.text?.split(/\s+/)?.slice(0, 3) || ["WiFi", "TV", "Airport Shuttle"],
        chainCode: hotel.chainCode,
        description: offer.room?.description?.text || ""
      };
    });
  };

  // Generate fallback hotels based on popular destinations
  const generateFallbackHotels = (): HotelDisplay[] => {
    // Luxury hotels database by destination
    const hotelsByDestination: Record<string, HotelDisplay[]> = {
      "LON": [
        {
          id: "lon-ritz-1",
          name: "The Ritz London",
          location: "London, United Kingdom",
          cityName: "London",
          country: "United Kingdom",
          code: "LON",
          price: 850,
          discountedPrice: 720,
          rating: 4.9,
          reviews: 1250,
          image: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&q=80&w=600",
          amenities: ["Spa", "Michelin Restaurant", "Afternoon Tea", "Concierge", "Butler Service"],
          chainCode: "RL",
          description: "Iconic 5-star hotel in Piccadilly with stunning views"
        },
        {
          id: "lon-savoy-2",
          name: "The Savoy",
          location: "London, United Kingdom",
          cityName: "London",
          country: "United Kingdom",
          code: "LON",
          price: 780,
          discountedPrice: 660,
          rating: 4.8,
          reviews: 2100,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
          amenities: ["River View", "Luxury Spa", "Fine Dining", "Theatre", "Afternoon Tea"],
          chainCode: "FAIRMONT",
          description: "Historic hotel on the Strand with river views"
        },
        {
          id: "lon-claridges-3",
          name: "Claridge's",
          location: "London, United Kingdom",
          cityName: "London",
          country: "United Kingdom",
          code: "LON",
          price: 920,
          discountedPrice: 820,
          rating: 4.9,
          reviews: 980,
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
          amenities: ["Art Deco", "Michelin Star", "Spa", "Butler Service", "Afternoon Tea"],
          chainCode: "MAYBOURNE",
          description: "Legendary Art Deco hotel in Mayfair"
        }
      ],
      "DXB": [
        {
          id: "dxb-burj-1",
          name: "Burj Al Arab Jumeirah",
          location: "Dubai, UAE",
          cityName: "Dubai",
          country: "UAE",
          code: "DXB",
          price: 1200,
          discountedPrice: 1050,
          rating: 5.0,
          reviews: 2340,
          image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600",
          amenities: ["Private Beach", "Helicopter Pad", "Underwater Restaurant", "Butler Service", "Infinity Pool"],
          chainCode: "JUMEIRAH",
          description: "World's only 7-star hotel on its own island"
        },
        {
          id: "dxb-atlantis-2",
          name: "Atlantis The Palm",
          location: "Dubai, UAE",
          cityName: "Dubai",
          country: "UAE",
          code: "DXB",
          price: 650,
          discountedPrice: 550,
          rating: 4.8,
          reviews: 4560,
          image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
          amenities: ["Aquaventure", "Dolphin Bay", "Private Beach", "Kids Club", "Water Park"],
          chainCode: "ATLANTIS",
          description: "Iconic resort on Palm Jumeirah with underwater suites"
        },
        {
          id: "dxb-address-3",
          name: "Address Boulevard",
          location: "Dubai, UAE",
          cityName: "Dubai",
          country: "UAE",
          code: "DXB",
          price: 480,
          discountedPrice: 420,
          rating: 4.7,
          reviews: 1870,
          image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600",
          amenities: ["Pool", "Spa", "Burj Khalifa View", "Fine Dining", "Shopping Mall Access"],
          chainCode: "ADDRESS",
          description: "Luxury hotel connected to Dubai Mall"
        }
      ],
      "NYC": [
        {
          id: "nyc-plaza-1",
          name: "The Plaza Hotel",
          location: "New York, USA",
          cityName: "New York",
          country: "USA",
          code: "NYC",
          price: 950,
          discountedPrice: 820,
          rating: 4.8,
          reviews: 3150,
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
          amenities: ["Central Park View", "Luxury Spa", "Fine Dining", "Historic Landmark", "Afternoon Tea"],
          chainCode: "FAIRMONT",
          description: "Legendary hotel facing Central Park"
        },
        {
          id: "nyc-ritz-2",
          name: "The Ritz-Carlton",
          location: "New York, USA",
          cityName: "New York",
          country: "USA",
          code: "NYC",
          price: 820,
          discountedPrice: 720,
          rating: 4.7,
          reviews: 1890,
          image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=600",
          amenities: ["Central Park View", "Spa", "Michelin Restaurant", "Butler Service", "Fitness Center"],
          chainCode: "RC",
          description: "Luxury in the heart of Manhattan"
        },
        {
          id: "nyc-peninsula-3",
          name: "The Peninsula",
          location: "New York, USA",
          cityName: "New York",
          country: "USA",
          code: "NYC",
          price: 890,
          discountedPrice: 780,
          rating: 4.8,
          reviews: 1430,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
          amenities: ["Rooftop Terrace", "Spa", "Michelin Star", "Business Center", "Chauffeur Service"],
          chainCode: "PENINSULA",
          description: "Elegant hotel on Fifth Avenue"
        }
      ],
      "TYO": [
        {
          id: "tyo-park-1",
          name: "Park Hyatt Tokyo",
          location: "Tokyo, Japan",
          cityName: "Tokyo",
          country: "Japan",
          code: "TYO",
          price: 680,
          discountedPrice: 590,
          rating: 4.8,
          reviews: 1870,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
          amenities: ["Mountain Views", "Japanese Garden", "Michelin Star", "Zen Spa", "Sky Bar"],
          chainCode: "HY",
          description: "Luxury hotel in Shinjuku featured in Lost in Translation"
        },
        {
          id: "tyo-aman-2",
          name: "Aman Tokyo",
          location: "Tokyo, Japan",
          cityName: "Tokyo",
          country: "Japan",
          code: "TYO",
          price: 950,
          discountedPrice: 850,
          rating: 4.9,
          reviews: 920,
          image: "https://images.unsplash.com/photo-1606402179428-a57976d71fa4?auto=format&fit=crop&q=80&w=600",
          amenities: ["Skyline Views", "Traditional Onsen", "Tea House", "Zen Garden", "Spa"],
          chainCode: "AMAN",
          description: "Serene luxury in Otemachi with traditional Japanese elements"
        },
        {
          id: "tyo-imperial-3",
          name: "The Imperial Hotel",
          location: "Tokyo, Japan",
          cityName: "Tokyo",
          country: "Japan",
          code: "TYO",
          price: 520,
          discountedPrice: 460,
          rating: 4.6,
          reviews: 3240,
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
          amenities: ["Historic", "Japanese Garden", "Multiple Restaurants", "Spa", "Shopping Arcade"],
          chainCode: "IH",
          description: "Historic hotel near the Imperial Palace"
        }
      ],
      "PAR": [
        {
          id: "par-plaza-1",
          name: "Hotel Plaza Athénée",
          location: "Paris, France",
          cityName: "Paris",
          country: "France",
          code: "PAR",
          price: 1100,
          discountedPrice: 950,
          rating: 4.9,
          reviews: 1420,
          image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=600",
          amenities: ["Eiffel Tower View", "Dior Spa", "Michelin Dining", "Fashion District", "Courtyard"],
          chainCode: "DORCHESTER",
          description: "Palace hotel on Avenue Montaigne"
        },
        {
          id: "par-meurice-2",
          name: "Le Meurice",
          location: "Paris, France",
          cityName: "Paris",
          country: "France",
          code: "PAR",
          price: 890,
          discountedPrice: 780,
          rating: 4.8,
          reviews: 1150,
          image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=600",
          amenities: ["Tuileries View", "Art Deco Spa", "Michelin Star", "Palace Hotel", "Afternoon Tea"],
          chainCode: "DORCHESTER",
          description: "Historic palace hotel with art-inspired decor"
        },
        {
          id: "par-ritz-3",
          name: "Ritz Paris",
          location: "Paris, France",
          cityName: "Paris",
          country: "France",
          code: "PAR",
          price: 1200,
          discountedPrice: 1050,
          rating: 5.0,
          reviews: 890,
          image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=600",
          amenities: ["Michelin Dining", "Spa", "Jardins", "Bar Hemingway", "Luxury Suites"],
          chainCode: "RITZ",
          description: "Legendary Place Vendôme palace hotel"
        }
      ],
      "SIN": [
        {
          id: "sin-mbs-1",
          name: "Marina Bay Sands",
          location: "Singapore",
          cityName: "Singapore",
          country: "Singapore",
          code: "SIN",
          price: 780,
          discountedPrice: 680,
          rating: 4.8,
          reviews: 4250,
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
          amenities: ["Infinity Pool", "SkyPark", "Casino", "Luxury Shopping", "Observation Deck"],
          chainCode: "MBS",
          description: "Iconic resort with infinity pool overlooking the city"
        },
        {
          id: "sin-raffles-2",
          name: "Raffles Singapore",
          location: "Singapore",
          cityName: "Singapore",
          country: "Singapore",
          code: "SIN",
          price: 850,
          discountedPrice: 750,
          rating: 4.9,
          reviews: 1870,
          image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
          amenities: ["Colonial Heritage", "Singapore Sling", "Butler Service", "Courtyard", "Luxury Spa"],
          chainCode: "ACCOR",
          description: "Historic luxury hotel where the Singapore Sling was invented"
        },
        {
          id: "sin-fullerton-3",
          name: "The Fullerton Hotel",
          location: "Singapore",
          cityName: "Singapore",
          country: "Singapore",
          code: "SIN",
          price: 580,
          discountedPrice: 520,
          rating: 4.7,
          reviews: 2980,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
          amenities: ["Heritage Building", "River View", "Pool", "Spa", "Multiple Restaurants"],
          chainCode: "FULLERTON",
          description: "Historic building at the mouth of the Singapore River"
        }
      ]
    };

    // Collect hotels from all destinations and flatten
    const allHotels: HotelDisplay[] = [];
    
    // Get 2 hotels from each destination for variety (total 12, but we'll take first 6 after shuffle)
    popularDestinations.forEach(dest => {
      const destHotels = hotelsByDestination[dest.code] || hotelsByDestination["LON"];
      // Take first 2 hotels from each destination
      const hotelsToAdd = destHotels.slice(0, 2).map(hotel => ({
        ...hotel,
        // Ensure each hotel has unique ID with timestamp to avoid React key issues
        id: `${hotel.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        // Randomize reviews slightly for realism
        reviews: Math.floor(hotel.reviews * (0.9 + Math.random() * 0.2))
      }));
      allHotels.push(...hotelsToAdd);
    });

    // Shuffle to mix hotels from different destinations
    const shuffled = [...allHotels].sort(() => 0.5 - Math.random());
    
    // Return first 6 hotels
    return shuffled.slice(0, 6);
  };

  const handleHotelClick = (hotel: HotelDisplay) => {
    // Calculate dates for search (tomorrow for check-in)
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 1); // Tomorrow
    
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 3); // 3 nights
    
    const checkInDate = checkIn.toISOString().split('T')[0];
    const checkOutDate = checkOut.toISOString().split('T')[0];
    
    // Get city name and code
    const cityName = hotel.cityName || hotel.location.split(',')[0] || "London";
    const cityCode = hotel.code || "LON";
    const country = hotel.country || "United Kingdom";
    
    // Format location
    const formattedLocation = `${cityName}, ${country}`;
    
    // Get guest count (default to 2)
    const guests = 2;
    const rooms = 1;
    
    console.log('🔍 Searching hotels in:', {
      location: formattedLocation,
      cityCode,
      checkInDate,
      checkOutDate,
      guests,
      rooms
    });
    
    // Construct URL with search parameters
    const params = new URLSearchParams({
      type: 'hotels',
      location: formattedLocation,
      cityCode: cityCode,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guests.toString(),
      rooms: rooms.toString(),
      currency: 'GBP'
    });
    
    // Navigate to search page with hotel parameters
    router.push(`/search?${params.toString()}`);
  };

  const handleSearchMore = () => {
    // Only regenerate if not showing search results
    if (!propHotels) {
      setInternalLoading(true);
      setTimeout(() => {
        const newHotels = generateFallbackHotels();
        setHotels(newHotels);
        setInternalLoading(false);
      }, 500);
    }
  };

  const formatPrice = (price: number) => `£${price.toFixed(2)}`;

  // Use props if provided, otherwise use internal state
  const isLoading = propHotels ? loading : internalLoading;
  const hasError = propHotels ? error : internalError;
  const displayHotels = propHotels || hotels;

  if (isLoading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-12">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {title}
            </h2>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse">
              <div className="h-64 bg-gray-200"></div>
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex justify-between pt-4">
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-12">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-red-500 mb-4">{hasError}</p>
          <button
            onClick={handleSearchMore}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {!propHotels && ( // Only show refresh button for fallback hotels
            <button
              onClick={handleSearchMore}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
              style={{
                backgroundColor: brandBlueLight,
                color: brandBlue,
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#32A6D7] border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </>
              ) : "Refresh"}
            </button>
          )}
          <button
            onClick={() => router.push("/search?type=hotels&currency=GBP")}
            className="font-semibold transition-colors duration-200 flex items-center gap-2 group"
            style={{ color: brandBlue }}
          >
            {t?.("homes.explore") || "Explore all"}
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayHotels.map((home) => (
          <div
            key={home.id}
            onClick={() => handleHotelClick(home)}
            className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
          >
            {/* Image Container */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={home.image}
                alt={home.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                width={400}
                height={256}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600";
                }}
              />

              {/* Favorite Button */}
              <button
                className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:bg-white hover:text-red-500 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                aria-label="Add to favorites"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>

              {/* Discount Badge */}
              {home.discountedPrice && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Save{" "}
                  {Math.round(
                    ((home.price - home.discountedPrice) / home.price) * 100
                  )}
                  %
                </div>
              )}
            </div>

            {/* Content Container */}
            <div className="p-6">
              <h3
                className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#32A6D7] transition-colors duration-200 text-lg"
              >
                {home.name}
              </h3>

              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500">{home.location}</p>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center px-3 py-1 rounded-full"
                  style={{ backgroundColor: brandBlueLight }}
                >
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(home.rating) ? "fill-current" : "text-gray-200"
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{ color: brandBlue }}
                  >
                    {home.rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  ({home.reviews.toLocaleString()} reviews)
                </span>
              </div>

              {/* Amenities Preview */}
              <div className="flex flex-wrap gap-2 mb-4">
                {home.amenities.slice(0, 3).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
                {home.amenities.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    +{home.amenities.length - 3} more
                  </span>
                )}
              </div>

              {/* Price & Explore Button */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  {home.discountedPrice && (
                    <span className="text-sm line-through text-gray-400 mr-2">
                      {formatPrice(home.price)}
                    </span>
                  )}
                  <span
                    className="text-xl font-bold"
                    style={{ color: brandBlue }}
                  >
                    {formatPrice(home.discountedPrice || home.price)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    /night
                  </span>
                </div>

                <button
                  className="px-4 py-2 font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: brandBlue,
                    color: "white",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a8bb5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = brandBlue;
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHotelClick(home);
                  }}
                  aria-label={`Explore ${home.name}`}
                >
                  Explore
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HomesGrid;