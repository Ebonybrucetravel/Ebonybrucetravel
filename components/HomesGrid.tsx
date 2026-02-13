"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";
import { hotelApi, formatHotelSearchParams, searchAndTransformHotels } from "../lib/api";
import type { HotelOffer, SearchResult } from "../lib/types";

// Define the hotel type from API response
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
  originalHotel?: SearchResult;
  cityName?: string;
  description?: string;
}

// Define the transformed hotel type from searchAndTransformHotels
interface TransformedHotel extends SearchResult {
  realData?: {
    price?: number;
    finalPrice?: number;
    hotelId?: string;
    guests?: number;
    [key: string]: any;
  };
}

const HomesGrid: React.FC = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const [hotels, setHotels] = useState<HotelDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

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

  useEffect(() => {
    fetchHotelsFromAPI();
  }, []);

  const fetchHotelsFromAPI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate dates (today + 7 days for check-in, +10 days for check-out)
      const today = new Date();
      const checkIn = new Date(today);
      checkIn.setDate(today.getDate() + 7);
      
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkIn.getDate() + 3);
      
      const checkInDate = checkIn.toISOString().split('T')[0];
      const checkOutDate = checkOut.toISOString().split('T')[0];
      
      console.log('📅 Search dates:', { checkInDate, checkOutDate });
      
      // Fetch hotels for each popular destination - only try first 3 to avoid rate limiting
      const hotelPromises = popularDestinations.slice(0, 3).map(async (dest) => {
        try {
          console.log(`🏨 Searching hotels in ${dest.city} with code ${dest.code}...`);
          
          // Create search params directly without using formatHotelSearchParams
          const searchParams = {
            cityCode: dest.code,
            checkInDate,
            checkOutDate,
            adults: 2,
            roomQuantity: 1,
            currency: 'GBP',
            bestRateOnly: true
          };
          
          console.log('📤 Search params:', searchParams);
          
          // Search hotels
          const result = await searchAndTransformHotels(
            searchParams,
            dest.city
          );
          
          console.log(`✅ Results for ${dest.city}:`, result);
          
          if (result.success && result.results.length > 0) {
            // Get first 2 hotels from each destination
            return result.results.slice(0, 2).map((hotel: SearchResult) => {
              // Cast to TransformedHotel to access realData
              const transformedHotel = hotel as TransformedHotel;
              
              // Parse price from string (e.g., "£95/night" -> 95)
              let priceValue = 200;
              if (hotel.price) {
                const priceMatch = hotel.price.match(/[0-9.]+/);
                if (priceMatch) {
                  priceValue = parseFloat(priceMatch[0]);
                }
              }
              
              return {
                id: hotel.id,
                name: hotel.title,
                location: `${dest.city}, ${dest.country}`,
                cityName: dest.city,
                code: dest.code,
                price: transformedHotel.realData?.price || 
                       transformedHotel.realData?.finalPrice || 
                       priceValue,
                discountedPrice: transformedHotel.realData?.finalPrice ? 
                  Math.round(transformedHotel.realData.finalPrice * 0.85) : undefined,
                rating: hotel.rating || 4.5,
                reviews: Math.floor(Math.random() * 500) + 100,
                image: hotel.image || getFallbackImageForCity(dest.city),
                amenities: hotel.amenities || getDefaultAmenitiesForCity(dest.city),
                chainCode: transformedHotel.realData?.hotelId?.substring(0, 2),
                originalHotel: hotel
              };
            });
          }
          
          // Fallback to default hotels if API fails for this destination
          console.log(`⚠️ No results for ${dest.city}, using fallback`);
          return getFallbackHotelsForDestination(dest, checkInDate, checkOutDate);
        } catch (err) {
          console.error(`Error fetching hotels for ${dest.city}:`, err);
          return getFallbackHotelsForDestination(dest, checkInDate, checkOutDate);
        }
      });
      
      const results = await Promise.all(hotelPromises);
      const flattenedHotels = results.flat().slice(0, 6); // Limit to 6 hotels
      
      // If we have no hotels from API, use all fallbacks
      if (flattenedHotels.length === 0 || flattenedHotels.every(h => h.id.startsWith('fallback'))) {
        console.log('Using all fallback hotels');
        setHotels(getFallbackHotels().slice(0, 6));
      } else {
        setHotels(flattenedHotels);
      }
    } catch (err: any) {
      console.error("Error fetching hotels:", err);
      setError(err.message || "Failed to load hotels");
      
      // Set fallback hotels if API fails
      setHotels(getFallbackHotels().slice(0, 6));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get fallback images
  const getFallbackImageForCity = (city: string): string => {
    const images: Record<string, string> = {
      "London": "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&q=80&w=600",
      "Dubai": "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600",
      "New York": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
      "Tokyo": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
      "Paris": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=600",
      "Singapore": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600"
    };
    return images[city] || images["London"];
  };

  // Helper function to get default amenities
  const getDefaultAmenitiesForCity = (city: string): string[] => {
    const amenities: Record<string, string[]> = {
      "London": ["Free Wi-Fi", "Restaurant", "Bar", "24-hour front desk"],
      "Dubai": ["Private Beach", "Pool", "Spa", "Butler Service"],
      "New York": ["Central Location", "Concierge", "Fitness Center", "Business Center"],
      "Tokyo": ["Japanese Garden", "Hot Spring", "Tea House", "Massage"],
      "Paris": ["Eiffel Tower View", "Concierge", "Bar", "Restaurant"],
      "Singapore": ["Infinity Pool", "Sky Bar", "Casino", "Shopping"]
    };
    return amenities[city] || amenities["London"];
  };

  // Fallback hotels for when API fails
  const getFallbackHotelsForDestination = (dest: any, checkInDate: string, checkOutDate: string) => {
    const hotelsByDest: Record<string, any[]> = {
      "LON": [
        {
          name: "The Ritz London",
          price: 850,
          amenities: ["Spa", "Michelin Restaurant", "Afternoon Tea", "Concierge"],
          image: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&q=80&w=600",
          description: "Iconic 5-star hotel in Piccadilly"
        },
        {
          name: "The Savoy",
          price: 780,
          amenities: ["River View", "Luxury Spa", "Fine Dining", "Theatre"],
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
          description: "Historic hotel on the Strand"
        }
      ],
      "DXB": [
        {
          name: "Burj Al Arab Jumeirah",
          price: 1200,
          amenities: ["Private Beach", "Helicopter Pad", "Underwater Restaurant", "Butler Service"],
          image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600",
          description: "World's only 7-star hotel"
        },
        {
          name: "Atlantis The Palm",
          price: 650,
          amenities: ["Aquaventure", "Dolphin Bay", "Private Beach", "Kids Club"],
          image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
          description: "Iconic resort on Palm Jumeirah"
        }
      ],
      "NYC": [
        {
          name: "The Plaza Hotel",
          price: 950,
          amenities: ["Central Park View", "Luxury Spa", "Fine Dining", "Historic Landmark"],
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
          description: "Legendary hotel facing Central Park"
        },
        {
          name: "The Ritz-Carlton",
          price: 820,
          amenities: ["Central Park View", "Spa", "Michelin Restaurant", "Butler Service"],
          image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&q=80&w=600",
          description: "Luxury in the heart of Manhattan"
        }
      ],
      "TYO": [
        {
          name: "Park Hyatt Tokyo",
          price: 680,
          amenities: ["Mountain Views", "Japanese Garden", "Michelin Star", "Zen Spa"],
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
          description: "Luxury hotel in Shinjuku"
        },
        {
          name: "Aman Tokyo",
          price: 950,
          amenities: ["Skyline Views", "Traditional Onsen", "Tea House", "Zen Garden"],
          image: "https://images.unsplash.com/photo-1606402179428-a57976d71fa4?auto=format&fit=crop&q=80&w=600",
          description: "Serene luxury in Otemachi"
        }
      ],
      "PAR": [
        {
          name: "Hotel Plaza Athénée",
          price: 1100,
          amenities: ["Eiffel Tower View", "Dior Spa", "Michelin Dining", "Fashion District"],
          image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=600",
          description: "Palace hotel on Avenue Montaigne"
        },
        {
          name: "Le Meurice",
          price: 890,
          amenities: ["Tuileries View", "Art Deco Spa", "Michelin Star", "Palace Hotel"],
          image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=600",
          description: "Historic palace hotel in Paris"
        }
      ],
      "SIN": [
        {
          name: "Marina Bay Sands",
          price: 780,
          amenities: ["Infinity Pool", "SkyPark", "Casino", "Luxury Shopping"],
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
          description: "Iconic resort with infinity pool"
        },
        {
          name: "Raffles Singapore",
          price: 850,
          amenities: ["Colonial Heritage", "Singapore Sling", "Butler Service", "Courtyard"],
          image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600",
          description: "Historic luxury hotel"
        }
      ]
    };
    
    const destHotels = hotelsByDest[dest.code] || hotelsByDest["LON"];
    
    return destHotels.map((hotel, index) => ({
      id: `fallback-${dest.code}-${index + 1}`,
      name: hotel.name,
      location: `${dest.city}, ${dest.country}`,
      cityName: dest.city,
      code: dest.code,
      price: hotel.price,
      discountedPrice: Math.round(hotel.price * 0.85),
      rating: 4.8,
      reviews: Math.floor(Math.random() * 1000) + 500,
      image: hotel.image,
      amenities: hotel.amenities,
      chainCode: hotel.name.substring(0, 2).toUpperCase(),
      description: hotel.description
    }));
  };

  const getFallbackHotels = (): HotelDisplay[] => {
    return [
      {
        id: "1",
        name: "The Ritz London",
        location: "London, United Kingdom",
        cityName: "London",
        code: "LON",
        price: 850.0,
        discountedPrice: 720.0,
        rating: 5,
        reviews: 1250,
        image: "https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&q=80&w=600",
        amenities: ["Spa", "Michelin Restaurant", "Afternoon Tea", "Concierge"],
        chainCode: "RL"
      },
      {
        id: "2",
        name: "Burj Al Arab Jumeirah",
        location: "Dubai, UAE",
        cityName: "Dubai",
        code: "DXB",
        price: 1200.0,
        discountedPrice: 1050.0,
        rating: 5,
        reviews: 2340,
        image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=600",
        amenities: ["Private Beach", "Helicopter Pad", "Underwater Restaurant", "Butler Service"],
        chainCode: "JUMEIRAH"
      },
      {
        id: "3",
        name: "The Plaza Hotel",
        location: "New York, USA",
        cityName: "New York",
        code: "NYC",
        price: 950.0,
        discountedPrice: 820.0,
        rating: 5,
        reviews: 3150,
        image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
        amenities: ["Central Park View", "Luxury Spa", "Fine Dining", "Historic Landmark"],
        chainCode: "FAIRMONT"
      },
      {
        id: "4",
        name: "Park Hyatt Tokyo",
        location: "Tokyo, Japan",
        cityName: "Tokyo",
        code: "TYO",
        price: 680.0,
        discountedPrice: 590.0,
        rating: 5,
        reviews: 1870,
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600",
        amenities: ["Mountain Views", "Japanese Garden", "Michelin Star", "Zen Spa"],
        chainCode: "HY"
      },
      {
        id: "5",
        name: "Hotel Plaza Athénée",
        location: "Paris, France",
        cityName: "Paris",
        code: "PAR",
        price: 1100.0,
        discountedPrice: 950.0,
        rating: 5,
        reviews: 1420,
        image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&q=80&w=600",
        amenities: ["Eiffel Tower View", "Dior Spa", "Michelin Dining", "Fashion District"],
        chainCode: "DORCHESTER"
      },
      {
        id: "6",
        name: "Marina Bay Sands",
        location: "Singapore",
        cityName: "Singapore",
        code: "SIN",
        price: 780.0,
        discountedPrice: 680.0,
        rating: 5,
        reviews: 4250,
        image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
        amenities: ["Infinity Pool", "SkyPark", "Casino", "Luxury Shopping"],
        chainCode: "MBS"
      }
    ];
  };

  // Helper function to extract city code
  const getCityCodeFromHotel = (hotel: HotelDisplay): string => {
    return hotel.code || "LON";
  };

  const handleHotelClick = (hotel: HotelDisplay) => {
    // Calculate dates for search (same as SearchBox default)
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 1); // Tomorrow
    
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + 3); // 3 nights
    
    const checkInDate = checkIn.toISOString().split('T')[0];
    const checkOutDate = checkOut.toISOString().split('T')[0];
    
    // Get city name and code
    const cityName = hotel.cityName || "London";
    const cityCode = hotel.code || "LON";
    
    // Format location
    const locationParts = hotel.location.split(',');
    const country = locationParts.length > 1 ? locationParts[1].trim() : 'United Kingdom';
    const formattedLocation = `${cityName}, ${country}`;
    
    // Get guest count
    const guests = 2;
    
    console.log('🔍 Navigating to hotel search with:', {
      location: formattedLocation,
      cityCode,
      checkInDate,
      checkOutDate,
      guests,
      rooms: 1
    });
    
    // Navigate to search page
    router.push(
      `/search?type=hotels&location=${encodeURIComponent(formattedLocation)}&cityCode=${cityCode}&checkIn=${checkInDate}&checkOut=${checkOutDate}&guests=${guests}&rooms=1&currency=GBP`
    );
  };

  const handleSearchMore = async () => {
    setSearching(true);
    try {
      await fetchHotelsFromAPI();
    } finally {
      setSearching(false);
    }
  };

  const formatPrice = (price: number) => `£${price.toFixed(2)}`;

  if (loading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-12">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t?.("homes.title") || "Beautiful Homes & Rooms"}
            </h2>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              Loading amazing stays...
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

  if (error) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-12">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {t?.("homes.title") || "Beautiful Homes & Rooms"}
          </h2>
          <p className="text-red-500 mb-4">{error}</p>
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
            {t?.("homes.title") || "Beautiful Homes & Rooms"}
          </h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            {t?.("homes.subtitle") ||
              "Discover comfortable stays around the world"}
          </p>
        </div>
        <div className="flex items-center gap-4">
        <button
  onClick={handleSearchMore}
  disabled={searching}
  className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
  style={{
    backgroundColor: brandBlueLight,
    color: brandBlue,
  }}
>
  {searching ? (
    <>
      <div className="w-4 h-4 border-2 border-[#32A6D7] border-t-transparent rounded-full animate-spin"></div>
      <span>Loading...</span>
    </>
  ) : "Refresh"}
</button>
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
              stroke={brandBlue}
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
        {hotels.map((home) => (
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