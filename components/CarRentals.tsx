'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';

const CarRentals: React.FC = () => {
  const { t, currency } = useLanguage();
  
  // Safely access currency with defaults
  const currencySymbol = currency?.symbol || '$';
  const currencyCode = currency?.code || 'USD';
  
  const cars = [
    { 
      id: '1', 
      name: 'Black SUV', 
      type: 'SUV', 
      seats: 7, 
      transmission: 'Automatic', 
      price: 70, 
      color: 'bg-blue-50', 
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600' 
    },
    { 
      id: '2', 
      name: 'Orange Sedan', 
      type: 'Sedan', 
      seats: 5, 
      transmission: 'Automatic', 
      price: 60, 
      color: 'bg-orange-50', 
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=600' 
    },
    { 
      id: '3', 
      name: 'White SUV', 
      type: 'SUV', 
      seats: 5, 
      transmission: 'Manual', 
      price: 50, 
      color: 'bg-blue-50', 
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=600' 
    },
    { 
      id: '4', 
      name: 'Blue SUV', 
      type: 'Luxury SUV', 
      seats: 7, 
      transmission: 'Automatic', 
      price: 90, 
      color: 'bg-blue-50', 
      image: 'https://images.unsplash.com/photo-1567818735868-e71b99932e29?auto=format&fit=crop&q=80&w=600' 
    },
    { 
      id: '5', 
      name: 'Red Crossover', 
      type: 'Crossover', 
      seats: 5, 
      transmission: 'Automatic', 
      price: 60, 
      color: 'bg-red-50', 
      image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=600' 
    },
    { 
      id: '6', 
      name: 'Black SUV', 
      type: 'Premium SUV', 
      seats: 7, 
      transmission: 'Automatic', 
      price: 70, 
      color: 'bg-blue-50', 
      image: 'https://images.unsplash.com/photo-1542362567-b055002b91f4?auto=format&fit=crop&q=80&w=600' 
    },
  ];

  // Format price with currency symbol
  const formatPrice = (price: number) => {
    return `${currencySymbol}${price}`;
  };

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t?.('cars.title') || 'Car Rentals'}
          </h2>
          <p className="text-gray-500 mt-1 text-sm md:text-base">
            {t?.('cars.subtitle') || 'Find the perfect vehicle for your journey'}
          </p>
        </div>
        <a 
          href="#" 
          className="text-blue-600 font-semibold hover:underline hover:text-blue-700 transition-colors duration-200 flex items-center gap-2 group"
        >
          {t?.('cars.seeMore') || 'See more cars'}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cars.map((car) => (
          <div 
            key={car.id} 
            className={`${car.color} rounded-3xl p-6 relative group cursor-pointer border border-transparent hover:border-gray-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}
          >
            {/* Header with price */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{car.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{car.type}</p>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold px-4 py-2 rounded-full text-sm shadow-lg">
                {formatPrice(car.price)}
                <span className="text-xs font-normal opacity-90 ml-1">/{t?.('cars.day') || 'day'}</span>
              </div>
            </div>
            
            {/* Car image */}
            <div className="h-48 relative overflow-hidden flex items-center justify-center mb-6">
              <img 
                src={car.image} 
                alt={`${car.name} - ${car.type}`} 
                className="max-w-[85%] max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                width={320}
                height={192}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600';
                }}
              />
              
              {/* Quick book button */}
              <button 
                className="absolute bottom-4 right-4 bg-white text-blue-600 px-4 py-2 rounded-full font-semibold shadow-lg hover:bg-blue-50 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                aria-label={`Rent ${car.name}`}
              >
                {t?.('cars.rentNow') || 'Rent Now'}
              </button>
            </div>
            
            {/* Car specifications */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
              <div className="text-center">
                <div className="bg-white rounded-xl p-3 mb-2 shadow-sm">
                  <svg 
                    className="w-5 h-5 text-gray-600 mx-auto" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 3.75a3.5 3.5 0 01-4.95 0l-4.72-4.72a3.5 3.5 0 014.95-4.95l.75.75.75-.75a3.5 3.5 0 014.95 4.95l-4.72 4.72z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">{car.seats} seats</span>
              </div>
              
              <div className="text-center">
                <div className="bg-white rounded-xl p-3 mb-2 shadow-sm">
                  <svg 
                    className="w-5 h-5 text-gray-600 mx-auto" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">{car.transmission}</span>
              </div>
              
              <div className="text-center">
                <div className="bg-white rounded-xl p-3 mb-2 shadow-sm">
                  <svg 
                    className="w-5 h-5 text-gray-600 mx-auto" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Unlimited miles</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CarRentals;