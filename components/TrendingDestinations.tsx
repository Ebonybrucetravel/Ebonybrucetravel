"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

interface TrendingDestinationsProps {
  onCityClick?: (city: { code: string; name: string; from?: { code: string; name: string } }) => void;
  defaultDeparture?: { code: string; name: string };
}

const TrendingDestinations: React.FC<TrendingDestinationsProps> = ({
  onCityClick,
  defaultDeparture,
}) => {
  const { t, currency } = useLanguage();
  const brandBlue = "#32A6D7";
  const [dynamicDeparture, setDynamicDeparture] = useState<{ code: string; name: string }>({ code: "LHR", name: "London" });

  // Function to get departure based on currency
  const getDepartureByCurrency = (currencyCode: string): { code: string; name: string } => {
    switch (currencyCode) {
      case 'GBP':
        return { code: 'LHR', name: 'London' };
      case 'EUR':
        return { code: 'CDG', name: 'Paris' };
      case 'NGN':
        return { code: 'LOS', name: 'Lagos' };
      case 'USD':
        return { code: 'JFK', name: 'New York' };
      case 'AED':
        return { code: 'DXB', name: 'Dubai' };
      case 'SGD':
        return { code: 'SIN', name: 'Singapore' };
      case 'JPY':
        return { code: 'HND', name: 'Tokyo' };
      case 'AUD':
        return { code: 'SYD', name: 'Sydney' };
      case 'CAD':
        return { code: 'YYZ', name: 'Toronto' };
      case 'CHF':
        return { code: 'ZRH', name: 'Zurich' };
      case 'ZAR':
        return { code: 'JNB', name: 'Johannesburg' };
      default:
        return { code: 'LHR', name: 'London' };
    }
  };

  // Set dynamic departure based on detected currency
  useEffect(() => {
    if (currency?.code) {
      const departure = getDepartureByCurrency(currency.code);
      setDynamicDeparture(departure);
      console.log(`[Trending Destinations] Dynamic departure set to: ${departure.code} - ${departure.name} (based on currency: ${currency.code})`);
    }
  }, [currency]);

  // Use the passed defaultDeparture prop if provided, otherwise use the dynamic one
  const finalDeparture = defaultDeparture || dynamicDeparture;

  // Destinations with unique airport codes for search
  const destinations = [
    {
      id: "1",
      city: "London",
      countryKey: "countries.uk",
      code: "LHR", // London Heathrow
      image:
        "https://images.unsplash.com/photo-1534800891164-a1d96b5114e7?q=80&w=759&auto=format&fit=crop",
      flights: "245",
      hotels: "850",
    },
    {
      id: "2",
      city: "Dubai",
      countryKey: "countries.uae",
      code: "DXB", // Dubai International
      image:
        "https://images.unsplash.com/photo-1609873983635-2ab84282942a?q=80&w=1937&auto=format&fit=crop",
      flights: "289",
      hotels: "620",
    },
    {
      id: "3",
      city: "New York",
      countryKey: "countries.usa",
      code: "JFK", // John F. Kennedy International
      image:
        "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?q=80&w=687&auto=format&fit=crop",
      flights: "425",
      hotels: "1200",
    },
    {
      id: "4",
      city: "Paris",
      countryKey: "countries.france",
      code: "CDG", // Charles de Gaulle Airport
      image:
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop",
      flights: "356",
      hotels: "890",
    },
  ];

  const handleCityClick = (city: { code: string; name: string }) => {
    if (onCityClick) {
      onCityClick({
        ...city,
        from: finalDeparture
      });
    }
  };

  return (
    <section className="px-4 md:px-8 lg:px-16 pt-8 pb-0 -mb-3">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
        {t('trending.title')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {destinations.map((destination) => (
          <div
            key={destination.id}
            className="group cursor-pointer rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300"
            onClick={() =>
              handleCityClick({
                code: destination.code,
                name: destination.city,
              })
            }
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={destination.image}
                alt={`${destination.city}, ${t(destination.countryKey)}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <h3 className="text-lg font-bold">{destination.city}</h3>
                <p className="text-xs opacity-90">{t(destination.countryKey)}</p>
              </div>
            </div>

            <div className="p-3">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  <span>{destination.flights} {t('nav.flights')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <span>{destination.hotels} {t('nav.hotels')}</span>
                </div>
              </div>

              <button
                className="mt-2 w-full py-1.5 text-xs font-semibold rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: brandBlue,
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2a8bb5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = brandBlue;
                }}
              >
                {t('trending.explore')} {destination.city}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingDestinations;