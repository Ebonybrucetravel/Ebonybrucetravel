"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";
import { carApi, formatCarRentalSearchParams, searchAndTransformCarRentals } from "../lib/api";
import type { SearchResult } from "../lib/types";

// Define the car rental type from API response
interface CarDisplay {
  id: string;
  name: string;
  provider: string;
  vehicleCategory: string;
  vehicleDescription: string;
  price: number;
  discountedPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  providerLogo?: string;
  amenities: string[];
  seats: number;
  baggage: string;
  transmission: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  duration?: string;
  distance?: string;
  isRefundable?: boolean;
  originalCar?: SearchResult;
  cityName?: string;
  locationCode?: string;
  description?: string;
  vehicleCode?: string;
  location?: string;
}

// Define the transformed car type from searchAndTransformCarRentals
interface TransformedCar extends SearchResult {
  realData?: {
    price?: number;
    finalPrice?: number;
    offerId?: string;
    passengers?: number;
    seats?: number;
    baggage?: string;
    vehicleType?: string;
    vehicleCategory?: string;
    vehicleDescription?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    pickupDateTime?: string;
    dropoffDateTime?: string;
    duration?: string;
    distance?: string;
    [key: string]: any;
  };
}

const CarRentals: React.FC = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const [cars, setCars] = useState<CarDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Force currency to GBP/pounds
  const currencySymbol = "£";
  const brandBlue = "#32A6D7";
  const brandBlueLight = "#e6f4fa";

  // Your original car images
  const carImages = [
    { id: '1', name: 'Black SUV', image: 'https://thumbs.dreamstime.com/b/black-generic-suv-car-off-road-crossover-glossy-surface-white-background-front-view-isolated-path-black-generic-suv-123338690.jpg' },
    { id: '2', name: 'Orange Sedan', image: 'https://thumbs.dreamstime.com/b/car-front-view-white-isolated-background-clean-facing-forward-bright-perfect-transportation-related-design-promotion-381494208.jpg' },
    { id: '3', name: 'White SUV', image: 'https://png.pngtree.com/background/20250121/original/pngtree-premium-white-suv-car-for-the-whole-family-isolated-on-a-picture-image_13334725.jpg' },
    { id: '4', name: 'Blue SUV', image: 'https://thumbs.dreamstime.com/b/modern-blue-car-crossover-long-trips-back-view-d-render-modern-blue-car-crossover-long-trips-back-view-d-render-130333143.jpg' },
    { id: '5', name: 'Red Crossover', image: 'https://thumbs.dreamstime.com/b/red-suv-car-isolated-white-background-d-render-red-suv-car-isolated-106663738.jpg' },
    { id: '6', name: 'Black SUV', image: 'https://thumbs.dreamstime.com/b/black-suv-white-background-32768354.jpg' },
  ];

  // Popular routes (different pickup and dropoff locations)
  const popularRoutes = [
    { from: { city: "London", code: "LHR", country: "United Kingdom" }, to: { city: "Paris", code: "CDG", country: "France" } },
    { from: { city: "New York", code: "JFK", country: "USA" }, to: { city: "Los Angeles", code: "LAX", country: "USA" } },
    { from: { city: "Dubai", code: "DXB", country: "UAE" }, to: { city: "Abu Dhabi", code: "AUH", country: "UAE" } },
    { from: { city: "Manchester", code: "MAN", country: "United Kingdom" }, to: { city: "London", code: "LHR", country: "United Kingdom" } },
    { from: { city: "Los Angeles", code: "LAX", country: "USA" }, to: { city: "San Francisco", code: "SFO", country: "USA" } },
    { from: { city: "Paris", code: "CDG", country: "France" }, to: { city: "Amsterdam", code: "AMS", country: "Netherlands" } }
  ];

  useEffect(() => {
    fetchCarsFromAPI();
  }, []);

  const fetchCarsFromAPI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate dates (today + 7 days for pickup)
      const today = new Date();
      
      // Set pickup date to 7 days from now at 10:00 AM
      const pickupDate = new Date(today);
      pickupDate.setDate(today.getDate() + 7);
      pickupDate.setHours(10, 0, 0, 0);
      
      // Set dropoff date to 6 hours after pickup (minimum 4 hours required)
      const dropoffDate = new Date(pickupDate);
      dropoffDate.setHours(pickupDate.getHours() + 6); // 6 hours later
      
      // Format dates properly for API (ISO 8601)
      const pickupDateTime = pickupDate.toISOString();
      const dropoffDateTime = dropoffDate.toISOString();
      
      console.log('📅 Formatted dates for API:', { 
        pickupDateTime, 
        dropoffDateTime,
        durationHours: (dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60)
      });
      
      // Fetch cars for each popular route (take first 3 routes to get up to 6 cars)
      const carPromises = popularRoutes.slice(0, 3).map(async (route) => {
        try {
          // Format search params with GBP currency
          const searchParams = await formatCarRentalSearchParams(
            route.from.city,
            route.to.city,
            pickupDateTime,
            dropoffDateTime,
            "10:00",
            "16:00", // 6 hours later
            2 // 2 passengers
          );
          
          // Override currency to GBP
          searchParams.currency = 'GBP';
          
          console.log(`🚗 Searching cars from ${route.from.city} to ${route.to.city} with params:`, searchParams);
          
          // Search cars
          const result = await searchAndTransformCarRentals(
            searchParams,
            route.from.city,
            route.to.city
          );
          
          console.log(`✅ Results for ${route.from.city} to ${route.to.city}:`, result);
          
          if (result.success && result.results.length > 0) {
            // Get first 2 cars from each route to total 6
            return result.results.slice(0, 2).map((car: SearchResult, index: number) => {
              // Cast to TransformedCar to access realData
              const transformedCar = car as TransformedCar;
              const realData = transformedCar.realData || {};
              
              // Map to your original car images based on index
              const imageIndex = (popularRoutes.indexOf(route) * 2 + index) % carImages.length;
              
              // Extract vehicle info from realData
              const vehicleDescription = realData.vehicleDescription || 
                                         (car as any).vehicleDescription || 
                                         car.title || 
                                         getCarNameFromImage(imageIndex);
              
              const seats = realData.seats || 
                           (car as any).seats || 
                           getCarSeatsFromImage(imageIndex);
              
              const baggage = realData.baggage || 
                             (car as any).baggage || 
                             getCarBaggageFromImage(imageIndex);
              
              const vehicleCategory = realData.vehicleCategory || 
                                      (car as any).vehicleCategory || 
                                      getCarCategoryFromImage(imageIndex);
              
              return {
                id: car.id,
                name: vehicleDescription,
                provider: car.provider || "Premium Transfers",
                vehicleCategory: vehicleCategory,
                vehicleDescription: vehicleDescription,
                location: `${route.from.city} → ${route.to.city}`,
                cityName: route.from.city,
                locationCode: route.from.code,
                price: realData.price || 
                       realData.finalPrice || 
                       getCarPriceFromImage(imageIndex),
                discountedPrice: realData.finalPrice ? 
                  Math.round(realData.finalPrice * 0.9) : getDiscountedPriceFromImage(imageIndex),
                rating: car.rating || 4.5,
                reviews: Math.floor(Math.random() * 300) + 50,
                image: car.image || carImages[imageIndex].image,
                providerLogo: (car as any).providerLogo,
                amenities: car.amenities || getDefaultAmenitiesForCar(),
                seats: seats,
                baggage: `${baggage} bags`,
                transmission: (car as any).transmission || "Automatic",
                pickupLocation: route.from.code,
                dropoffLocation: route.to.code,
                pickupDateTime,
                dropoffDateTime,
                duration: realData.duration || (car as any).duration || "6 hours",
                distance: realData.distance || (car as any).distance,
                isRefundable: (car as any).isRefundable || true,
                vehicleCode: (car as any).vehicleCode,
                originalCar: car
              };
            });
          }
          
          // Fallback to default cars if API fails for this route
          console.log(`⚠️ No results for ${route.from.city} to ${route.to.city}, using fallback`);
          return getFallbackCarsForRoute(route, pickupDateTime, dropoffDateTime);
        } catch (err) {
          console.error(`Error fetching cars for ${route.from.city} to ${route.to.city}:`, err);
          return getFallbackCarsForRoute(route, pickupDateTime, dropoffDateTime);
        }
      });
      
      const results = await Promise.all(carPromises);
      const flattenedCars = results.flat().slice(0, 6); // Limit to 6 cars
      
      // If we don't have enough cars from API, fill with fallbacks
      if (flattenedCars.length < 6) {
        const fallbackCars = getFallbackCars().slice(0, 6 - flattenedCars.length);
        setCars([...flattenedCars, ...fallbackCars]);
      } else {
        setCars(flattenedCars);
      }
    } catch (err: any) {
      console.error("Error fetching cars:", err);
      setError(err.message || "Failed to load car rentals");
      
      // Set fallback cars if API fails
      setCars(getFallbackCars().slice(0, 6));
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to map to your original images
  const getCarNameFromImage = (index: number): string => {
    const names = ["Premium SUV", "Executive Sedan", "Luxury SUV", "Comfort SUV", "Sport Crossover", "Black SUV"];
    return names[index % names.length] || "Premium Car";
  };

  const getCarCategoryFromImage = (index: number): string => {
    const categories = ["SUV", "Sedan", "SUV", "SUV", "Crossover", "SUV"];
    return categories[index % categories.length] || "Standard";
  };

  const getCarPriceFromImage = (index: number): number => {
    const prices = [95, 75, 110, 85, 89, 99];
    return prices[index % prices.length] || 85;
  };

  const getDiscountedPriceFromImage = (index: number): number | undefined => {
    const prices = [85, 67, 99, 76, 80, 89]; // ~10% off
    return prices[index % prices.length];
  };

  const getCarSeatsFromImage = (index: number): number => {
    const seats = [5, 4, 7, 5, 4, 5];
    return seats[index % seats.length] || 5;
  };

  const getCarBaggageFromImage = (index: number): string => {
    const baggage = ["3", "2", "4", "3", "2", "3"];
    return baggage[index % baggage.length];
  };

  // Helper function to get default amenities
  const getDefaultAmenitiesForCar = (): string[] => {
    return [
      "Air Conditioning",
      "Professional Driver",
      "Meet & Greet",
      "Flight Tracking"
    ];
  };

  // Fallback cars for when API fails
  const getFallbackCarsForRoute = (route: any, pickupDateTime: string, dropoffDateTime: string) => {
    // Use your original car images
    return carImages.slice(0, 2).map((car, index) => ({
      id: `fallback-${route.from.code}-${route.to.code}-${index + 1}`,
      name: car.name,
      provider: index === 0 ? "GroundSpan" : "Sixt Ride",
      vehicleCategory: car.name.includes("SUV") ? "SUV" : "Sedan",
      vehicleDescription: car.name,
      location: `${route.from.city} → ${route.to.city}`,
      cityName: route.from.city,
      locationCode: route.from.code,
      price: car.name.includes("SUV") ? 95 : 75,
      discountedPrice: car.name.includes("SUV") ? 85 : 67,
      rating: 4.7,
      reviews: Math.floor(Math.random() * 400) + 100,
      image: car.image,
      amenities: getDefaultAmenitiesForCar(),
      seats: car.name.includes("SUV") ? 5 : 4,
      baggage: car.name.includes("SUV") ? "3 bags" : "2 bags",
      transmission: "Automatic",
      pickupLocation: route.from.code,
      dropoffLocation: route.to.code,
      pickupDateTime,
      dropoffDateTime,
      duration: "6 hours",
      distance: "294 MI",
      isRefundable: true,
      description: `Premium ${car.name} transfer from ${route.from.city} to ${route.to.city}`
    }));
  };

  const getFallbackCars = (): CarDisplay[] => {
    // Calculate dates for fallback
    const today = new Date();
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + 7);
    pickupDate.setHours(10, 0, 0, 0);
    
    const dropoffDate = new Date(pickupDate);
    dropoffDate.setHours(pickupDate.getHours() + 6); // 6 hours later
    
    const pickupDateTime = pickupDate.toISOString();
    const dropoffDateTime = dropoffDate.toISOString();
    
    return popularRoutes.slice(0, 6).map((route, index) => {
      const imageIndex = index % carImages.length;
      const car = carImages[imageIndex];
      
      return {
        id: `fallback-${index + 1}`,
        name: car.name,
        provider: index % 2 === 0 ? "GroundSpan" : "Sixt Ride",
        vehicleCategory: car.name.includes("SUV") ? "SUV" : 
                         car.name.includes("Sedan") ? "Sedan" : 
                         car.name.includes("Crossover") ? "Crossover" : "Standard",
        vehicleDescription: car.name,
        location: `${route.from.city} → ${route.to.city}`,
        cityName: route.from.city,
        locationCode: route.from.code,
        price: car.name.includes("SUV") ? 95 : 
               car.name.includes("Sedan") ? 75 : 
               car.name.includes("Crossover") ? 89 : 85,
        discountedPrice: car.name.includes("SUV") ? 85 : 
                         car.name.includes("Sedan") ? 67 : 
                         car.name.includes("Crossover") ? 80 : 76,
        rating: 4.8,
        reviews: 250 + index * 50,
        image: car.image,
        amenities: getDefaultAmenitiesForCar(),
        seats: car.name.includes("SUV") ? 5 : 4,
        baggage: car.name.includes("SUV") ? "3 bags" : "2 bags",
        transmission: "Automatic",
        pickupLocation: route.from.code,
        dropoffLocation: route.to.code,
        pickupDateTime,
        dropoffDateTime,
        duration: "6 hours",
        distance: "294 MI",
        isRefundable: true
      };
    });
  };

  const handleCarClick = (car: CarDisplay) => {
    // Format dates for search
    const today = new Date();
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + 7); // 7 days from now
    pickupDate.setHours(10, 0, 0, 0);
    
    const dropoffDate = new Date(pickupDate);
    dropoffDate.setHours(pickupDate.getHours() + 6); // 6 hours later
    
    const pickupDateStr = pickupDate.toISOString().split('T')[0];
    const dropoffDateStr = dropoffDate.toISOString().split('T')[0];
    
    // Format times
    const pickupTime = "10:00";
    const dropoffTime = "16:00"; // 6 hours later
    
    // Get pickup and dropoff locations
    const pickupCity = car.cityName || "London";
    const dropoffCity = car.location?.split('→')[1]?.trim() || "Paris";
    
    // Get location codes
    const pickupCode = car.pickupLocation || "LHR";
    const dropoffCode = car.dropoffLocation || "CDG";
    
    // Format location string for search
    const location = `${pickupCity} to ${dropoffCity}`;
    
    console.log('🔍 Navigating to car rental search with:', {
      location,
      pickupCode,
      dropoffCode,
      pickupDate: pickupDateStr,
      dropoffDate: dropoffDateStr,
      pickupTime,
      dropoffTime,
      passengers: car.seats || 2
    });
    
    // Navigate to search page with car rental parameters
    router.push(
      `/search?type=car-rentals&location=${encodeURIComponent(location)}&pickupCode=${pickupCode}&dropoffCode=${dropoffCode}&pickupDate=${pickupDateStr}&dropoffDate=${dropoffDateStr}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&passengers=${car.seats || 2}&currency=GBP`
    );
  };

  const handleSearchMore = async () => {
    setSearching(true);
    try {
      await fetchCarsFromAPI();
    } finally {
      setSearching(false);
    }
  };

  const formatPrice = (price: number) => `£${price.toFixed(2)}`;

  if (loading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-12 bg-white">
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
              Premium Transfers & Chauffeur Services
            </h2>
            <p className="text-gray-500 mt-2 text-base md:text-lg">
              Luxury point-to-point transfers with professional drivers
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm animate-pulse border border-gray-100">
              <div className="h-64 md:h-72 lg:h-80 bg-gray-200"></div>
              <div className="p-5">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="flex justify-between items-center mt-4">
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                  <div className="h-10 bg-gray-200 rounded w-20"></div>
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
      <section className="px-4 md:px-8 lg:px-16 py-12 bg-white">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Premium Transfers & Chauffeur Services
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
    <section className="px-4 md:px-8 lg:px-16 py-12 bg-white">
      <div className="flex justify-between items-end mb-8 md:mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            Premium Transfers & Chauffeur Services
          </h2>
          <p className="text-gray-500 mt-2 text-base md:text-lg">
            Luxury point-to-point transfers with professional drivers
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
            onClick={() => router.push("/search?type=car-rentals&currency=GBP")}
            className="font-semibold transition-colors duration-200 flex items-center gap-2 group"
            style={{ color: brandBlue }}
          >
            See More
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {cars.slice(0, 6).map((car) => (
          <div 
            key={car.id}
            onClick={() => handleCarClick(car)}
            className="group relative bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 cursor-pointer"
          >
            {/* Price tag – using your new blue color */}
            <div className="absolute top-4 right-4 z-10">
              <div 
                className="text-white font-bold px-5 py-2 rounded-full text-lg shadow-md flex items-center gap-1"
                style={{ backgroundColor: brandBlue }}
              >
                {currencySymbol}{car.discountedPrice || car.price}
                <span className="text-sm font-normal opacity-90">/trip</span>
              </div>
            </div>

            {/* Discount Badge */}
            {car.discountedPrice && (
              <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                Save {Math.round(((car.price - car.discountedPrice) / car.price) * 100)}%
              </div>
            )}

            {/* Pure white background image container */}
            <div className="h-64 md:h-72 lg:h-80 bg-white flex items-center justify-center p-6 md:p-8 overflow-hidden">
              <img
                src={car.image}
                alt={car.name}
                className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = carImages[0].image;
                }}
              />
            </div>

            {/* Car details */}
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-gray-900">{car.name}</h3>
                <span className="text-xs font-semibold text-gray-500">{car.provider}</span>
              </div>
              
              <p className="text-sm text-gray-500 mb-3">
                {car.vehicleCategory} • {car.seats} seats • {car.baggage}
                {car.duration && ` • ${car.duration}`}
              </p>
              
              {/* Route */}
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">{car.location}</span>
                {car.distance && <span className="text-gray-400">• {car.distance}</span>}
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center px-2 py-1 rounded-full" style={{ backgroundColor: brandBlueLight }}>
                  <div className="flex text-yellow-400 mr-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-3 h-3 ${i < Math.floor(car.rating) ? "fill-current" : "text-gray-200"}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs font-bold" style={{ color: brandBlue }}>{car.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-gray-400">({car.reviews} reviews)</span>
              </div>

              {/* Amenities Preview */}
              <div className="flex flex-wrap gap-1 mb-4">
                {car.amenities.slice(0, 3).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
                {car.amenities.length > 3 && (
                  <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    +{car.amenities.length - 3}
                  </span>
                )}
              </div>

              {/* Book Now Button */}
              <button
                className="w-full py-3 font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm"
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
                  handleCarClick(car);
                }}
              >
                Book Transfer
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CarRentals;