'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';

const HomesGrid: React.FC = () => {
  const { t, currency } = useLanguage();
  
  // Safely access currency with defaults
  const currencySymbol = currency?.symbol || '$';
  const currencyCode = currency?.code || 'USD';
  
  const homes = [
    {
      id: '1',
      name: 'Passi Al Colosseo B&B - Apartments For Rent In Rome.',
      location: 'Rome, Italy',
      price: 110.00,
      discountedPrice: 95.00,
      rating: 5,
      reviews: 200,
      image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '2',
      name: 'Ranczo W Dolinie',
      location: 'Rome, Italy',
      price: 120.00,
      discountedPrice: 105.00,
      rating: 5,
      reviews: 180,
      image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '3',
      name: 'Luxury Suite Colosseum',
      location: 'Rome, Italy',
      price: 150.00,
      discountedPrice: 130.00,
      rating: 5,
      reviews: 45,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '4',
      name: 'La Gaffe - Bed And Breakfast',
      location: 'Rome, Italy',
      price: 100.00,
      discountedPrice: 85.00,
      rating: 4,
      reviews: 120,
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '5',
      name: 'The Hayden Pub & Rooms',
      location: 'Rome, Italy',
      price: 130.00,
      discountedPrice: 110.00,
      rating: 5,
      reviews: 320,
      image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '6',
      name: 'P&J Luxury Apartments',
      location: 'Rome, Italy',
      price: 140.00,
      discountedPrice: 120.00,
      rating: 5,
      reviews: 250,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600'
    }
  ];

  // Format price with currency symbol
  const formatPrice = (price: number) => {
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t?.('homes.title') || 'Beautiful Homes & Rooms'}
          </h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            {t?.('homes.subtitle') || 'Discover comfortable stays around the world'}
          </p>
        </div>
        <a 
          href="#" 
          className="text-blue-600 font-semibold hover:underline hover:text-blue-700 transition-colors duration-200 flex items-center gap-2 group"
        >
          {t?.('homes.explore') || 'Explore all'}
          <svg 
            className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {homes.map((home) => (
          <div 
            key={home.id} 
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
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600';
                }}
              />
              
              {/* Favorite Button */}
              <button 
                className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:bg-white hover:text-red-500 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                aria-label="Add to favorites"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
              
              {/* Discount Badge */}
              {home.discountedPrice && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  Save {Math.round(((home.price - home.discountedPrice) / home.price) * 100)}%
                </div>
              )}
            </div>
            
            {/* Content Container */}
            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200 text-lg">
                {home.name}
              </h3>
              
              <div className="flex items-center gap-2 mb-3">
                <svg 
                  className="w-4 h-4 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-500">{home.location}</p>
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                  <div className="flex text-yellow-400 mr-2">
                    {[...Array(5)].map((_, i) => (
                      <svg 
                        key={i} 
                        className={`w-3.5 h-3.5 ${i < home.rating ? 'fill-current' : 'text-gray-200'}`} 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-blue-700">{home.rating}.0</span>
                </div>
                <span className="text-xs text-gray-400">({home.reviews} reviews)</span>
              </div>
              
              {/* Price */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  {home.discountedPrice && (
                    <span className="text-sm line-through text-gray-400 mr-2">
                      {formatPrice(home.price)}
                    </span>
                  )}
                  <span className="text-xl font-bold text-blue-600">
                    {formatPrice(home.discountedPrice || home.price)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">/{t?.('homes.night') || 'night'}</span>
                </div>
                
                <button 
                  className="px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                  aria-label={`Book ${home.name}`}
                >
                  {t?.('homes.book') || 'Book Now'}
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