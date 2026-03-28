"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "next/navigation";

// Define the car rental type
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
  cityName?: string;
  locationCode?: string;
  description?: string;
  vehicleCode?: string;
  location?: string;
}

interface CarRentalsProps {
  onSearch?: (data: any) => void;
}

const CarRentals: React.FC<CarRentalsProps> = ({ onSearch }) => {
  const { t, currency } = useLanguage();
  const router = useRouter();
  const [cars, setCars] = useState<CarDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = currency?.symbol || "£";
  const brandBlue = "#32A6D7";
  const brandBlueLight = "#e6f4fa";

  // Real car images from Unsplash
  const carImages = [
    { id: '1', name: 'Mercedes-Benz S-Class', image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800' },
    { id: '2', name: 'BMW 7 Series', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800' },
    { id: '3', name: 'Audi A8', image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=800' },
    { id: '4', name: 'Range Rover Velar', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&q=80&w=800' },
    { id: '5', name: 'Porsche Cayenne', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800' },
    { id: '6', name: 'Tesla Model S', image: 'https://images.unsplash.com/photo-1617788138017-80ad2915138d?auto=format&fit=crop&q=80&w=800' },
  ];

  // Popular routes (different pickup and dropoff locations)
  const popularRoutes = [
    { from: { city: "London", code: "LHR", country: "United Kingdom" }, to: { city: "Paris", code: "CDG", country: "France" } },
    { from: { city: "Dubai", code: "DXB", country: "UAE" }, to: { city: "Abu Dhabi", code: "AUH", country: "UAE" } },
    { from: { city: "New York", code: "JFK", country: "USA" }, to: { city: "Los Angeles", code: "LAX", country: "USA" } }
  ];

  useEffect(() => {
    setLoading(true);
    try {
      const fallbackCars = generateFallbackCars();
      setCars(fallbackCars);
      setError(null);
    } catch (err: any) {
      console.error("Error generating fallback cars:", err);
      setError(err.message || t('cars.errorFallback'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Generate fallback cars based on popular routes and car images
  const generateFallbackCars = (): CarDisplay[] => {
    const today = new Date();
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + 7);
    pickupDate.setHours(10, 0, 0, 0);

    const dropoffDate = new Date(pickupDate);
    dropoffDate.setHours(pickupDate.getHours() + 6);

    const pickupDateTime = pickupDate.toISOString();
    const dropoffDateTime = dropoffDate.toISOString();

    const allCars: CarDisplay[] = [];

    popularRoutes.forEach((route, routeIndex) => {
      const car = carImages[routeIndex % carImages.length];
      
      // Determine car type based on name
      const isLuxury = car.name.includes('Mercedes') || car.name.includes('BMW') || car.name.includes('Audi');
      const isSUV = car.name.includes('Range') || car.name.includes('Porsche');
      const isElectric = car.name.includes('Tesla');
      
      const basePrice = isLuxury ? 120 : isSUV ? 140 : isElectric ? 110 : 95;
      const discountedPrice = isLuxury ? 99 : isSUV ? 115 : isElectric ? 89 : 79;
      
      const seats = isSUV ? 5 : isElectric ? 5 : 4;
      const baggage = isSUV ? "3" : isElectric ? "2" : "2";
      
      const provider = routeIndex % 2 === 0 ? "GroundSpan" : "Sixt Ride";
      const rating = 4.7 + Math.random() * 0.3;
      const reviews = Math.floor(Math.random() * 400) + 200;

      allCars.push({
        id: `car-${routeIndex}-${Date.now()}`,
        name: car.name,
        provider: provider,
        vehicleCategory: isLuxury ? "Luxury Sedan" : isSUV ? "Luxury SUV" : isElectric ? "Electric" : "Premium",
        vehicleDescription: car.name,
        location: `${route.from.city} → ${route.to.city}`,
        cityName: route.from.city,
        locationCode: route.from.code,
        price: basePrice,
        discountedPrice: discountedPrice,
        rating: parseFloat(rating.toFixed(1)),
        reviews: reviews,
        image: car.image,
        amenities: getDefaultAmenitiesForCar(provider),
        seats: seats,
        baggage: `${baggage} ${t('cars.bags')}`,
        transmission: t('cars.automatic'),
        pickupLocation: route.from.code,
        dropoffLocation: route.to.code,
        pickupDateTime: pickupDateTime,
        dropoffDateTime: dropoffDateTime,
        duration: "6 hours",
        distance: getDistanceForRoute(route.from.city, route.to.city),
        isRefundable: true,
        description: `Premium ${car.name} transfer from ${route.from.city} to ${route.to.city}`
      });
    });

    return allCars;
  };

  // Helper function to get distance between cities (mock data)
  const getDistanceForRoute = (fromCity: string, toCity: string): string => {
    const distances: {[key: string]: string} = {
      "London-Paris": "294 MI",
      "Dubai-Abu Dhabi": "82 MI",
      "New York-Los Angeles": "2,789 MI"
    };
    const key = `${fromCity}-${toCity}`;
    return distances[key] || "200 MI";
  };

  // Helper function to get amenities based on provider
  const getDefaultAmenitiesForCar = (provider: string): string[] => {
    const baseAmenities = [
      t('cars.airConditioning'),
      t('cars.professionalDriver'),
      t('cars.meetGreet'),
      t('cars.flightTracking')
    ];
    if (provider === "GroundSpan") {
      return [...baseAmenities, t('cars.waterBottles'), t('cars.wifi')];
    } else {
      return [...baseAmenities, t('cars.phoneCharger'), t('cars.musicSystem')];
    }
  };

  const handleCarClick = (car: CarDisplay) => {
    const today = new Date();
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + 7);
    pickupDate.setHours(10, 0, 0, 0);

    const dropoffDate = new Date(pickupDate);
    dropoffDate.setHours(pickupDate.getHours() + 6);

    const pickupDateStr = pickupDate.toISOString().split('T')[0];
    const dropoffDateStr = dropoffDate.toISOString().split('T')[0];
    const pickupTime = "10:00";
    const dropoffTime = "16:00";

    let pickupCity = car.cityName || "London";
    let dropoffCity = "Paris";

    if (car.location && car.location.includes('→')) {
      const parts = car.location.split('→');
      if (parts.length > 1) {
        pickupCity = parts[0].trim();
        dropoffCity = parts[1].trim();
      }
    }

    const pickupCode = car.pickupLocation || "LHR";
    const dropoffCode = car.dropoffLocation || "CDG";

    // Use onSearch prop if provided
    if (onSearch) {
      // Pass the data with the exact property names that SearchBox expects
      onSearch({
        pickupLocationCode: pickupCode,      // ✅ Correct parameter name
        dropoffLocationCode: dropoffCode,    // ✅ Correct parameter name
      });
    } else {
      // Fallback to direct navigation
      const location = `${pickupCity} to ${dropoffCity}`;
      router.push(
        `/search?type=car-rentals&location=${encodeURIComponent(location)}&pickupCode=${pickupCode}&dropoffCode=${dropoffCode}&pickupDate=${pickupDateStr}&dropoffDate=${dropoffDateStr}&pickupTime=${pickupTime}&dropoffTime=${dropoffTime}&passengers=${car.seats || 2}&currency=GBP`
      );
    }
  };

  const handleSearchMore = () => {
    setLoading(true);
    setTimeout(() => {
      const newCars = generateFallbackCars();
      setCars(newCars);
      setLoading(false);
    }, 500);
  };

  const formatPrice = (price: number) => `${currencySymbol}${price.toFixed(2)}`;

  if (loading) {
    return (
      <section className="px-4 md:px-8 lg:px-16 py-12 bg-white">
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {t('cars.title')}
            </h2>
            <p className="text-gray-500 mt-1 text-sm md:text-base">
              {t('cars.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[1, 2, 3].map((i) => (
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
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            {t('cars.title')}
          </h2>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleSearchMore}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {t('cars.tryAgain')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12 bg-white -mb-4">
      <div className="flex justify-between items-end mb-6 md:mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {t('cars.title')}
          </h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            {t('cars.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSearchMore}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
            style={{
              backgroundColor: brandBlueLight,
              color: brandBlue,
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#32A6D7] border-t-transparent rounded-full animate-spin"></div>
                <span>{t('common.loading')}</span>
              </>
            ) : t('cars.refresh')}
          </button>
          <button
            onClick={() => router.push("/search?type=car-rentals&currency=GBP")}
            className="font-semibold transition-colors duration-200 flex items-center gap-2 group"
            style={{ color: brandBlue }}
          >
            {t('cars.seeMore')}
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {cars.map((car) => (
          <div
            key={car.id}
            onClick={() => handleCarClick(car)}
            className="group relative bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 cursor-pointer"
          >
            {/* Price tag */}
            <div className="absolute top-4 right-4 z-10">
              <div
                className="text-white font-bold px-5 py-2 rounded-full text-lg shadow-md flex items-center gap-1"
                style={{ backgroundColor: brandBlue }}
              >
                {currencySymbol}{car.discountedPrice || car.price}
                <span className="text-sm font-normal opacity-90">{t('cars.perTrip')}</span>
              </div>
            </div>

            {/* Discount Badge */}
            {car.discountedPrice && (
              <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {t('cars.save')} {Math.round(((car.price - car.discountedPrice) / car.price) * 100)}%
              </div>
            )}

            {/* Image container - full cover without padding */}
            <div className="h-64 md:h-72 lg:h-80 bg-gradient-to-br from-gray-900 to-gray-700 overflow-hidden">
              <img
                src={car.image}
                alt={car.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
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
                {car.vehicleCategory} • {car.seats} {t('cars.seats')} • {car.baggage}
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
                <span className="text-xs text-gray-400">({car.reviews.toLocaleString()} {t('cars.reviews')})</span>
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
                {t('cars.bookTransfer')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CarRentals;