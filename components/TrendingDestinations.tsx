// TrendingDestinations.tsx
'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

// Add interface for props
interface TrendingDestinationsProps {
  onCityClick?: (city: { code: string; name: string }) => void;
}

const TrendingDestinations: React.FC<TrendingDestinationsProps> = ({ onCityClick }) => {
  const { t } = useLanguage();
  const brandBlue = '#32A6D7';

  const destinations = [
    {
      id: '1',
      city: 'London',
      country: 'United Kingdom',
      code: 'LHR', // Heathrow - busiest in Europe
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=800',
      flights: '245',
      hotels: '850'
    },
    {
      id: '2',
      city: 'Dubai',
      country: 'UAE',
      code: 'DXB', // Dubai International - busiest for international travel
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800',
      flights: '289',
      hotels: '620'
    },
    {
      id: '3',
      city: 'New York',
      country: 'USA',
      code: 'JFK', // John F. Kennedy - busiest US international gateway
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800',
      flights: '425',
      hotels: '1200'
    },
    {
      id: '4',
      city: 'Tokyo',
      country: 'Japan',
      code: 'HND', // Haneda - busiest in Asia
      image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&q=80&w=800',
      flights: '312',
      hotels: '750'
    }
  ];

  // Handle city click
  const handleCityClick = (city: { code: string; name: string }) => {
    if (onCityClick) {
      onCityClick(city);
    }
  };

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
        {t('Trending Destinations') || 'Trending Destinations'}
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {destinations.map((destination) => (
          <div 
            key={destination.id} 
            className="group cursor-pointer rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300"
            onClick={() => handleCityClick({ code: destination.code, name: destination.city })}
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={destination.image} 
                alt={`${destination.city}, ${destination.country}`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-bold">{destination.city}</h3>
                <p className="text-sm opacity-90">{destination.country}</p>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>{destination.flights} flights</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{destination.hotels} hotels</span>
                </div>
              </div>
              
              <button 
                className="mt-3 w-full py-2 text-sm font-semibold rounded-lg transition-all duration-300"
                style={{ 
                  backgroundColor: brandBlue,
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a8bb5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = brandBlue;
                }}
              >
                Explore {destination.city}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingDestinations;