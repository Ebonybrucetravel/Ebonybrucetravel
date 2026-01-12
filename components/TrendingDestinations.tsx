'use client';

import React, { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

const TrendingDestinations: React.FC = () => {
  const { t, currency } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const currencySymbol = currency?.symbol || '$';
  const currencyCode = currency?.code || 'USD';
  const brandBlue = '#32A6D7';           // Your custom blue
  const brandBlueDark = '#2a8bb5';       // Slightly darker hover variant
  const brandBlueLight = '#e6f4fa';      // Light background variant if needed

  const destinations = [
    { 
      id: '1', 
      name: 'Paris', 
      country: 'France', 
      price: 400, 
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=800',
      rating: 4.8,
      reviews: 320
    },
    { 
      id: '2', 
      name: 'Bali', 
      country: 'Indonesia', 
      price: 550, 
      image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=800',
      rating: 4.9,
      reviews: 450
    },
    { 
      id: '3', 
      name: 'New York', 
      country: 'USA', 
      price: 400, 
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800',
      rating: 4.7,
      reviews: 290
    },
    { 
      id: '4', 
      name: 'Venice', 
      country: 'Italy', 
      price: 650, 
      image: 'https://images.unsplash.com/photo-1514890547357-a9ee2887ad8e?auto=format&fit=crop&q=80&w=800',
      rating: 4.6,
      reviews: 180
    },
    { 
      id: '5', 
      name: 'Birmingham', 
      country: 'UK', 
      price: 320, 
      image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=800',
      rating: 4.5,
      reviews: 120
    },
    { 
      id: '6', 
      name: 'Tokyo', 
      country: 'Japan', 
      price: 700, 
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=800',
      rating: 4.8,
      reviews: 380
    },
  ];

  const formatPrice = (price: number) => `${currencySymbol}${price}`;

  const getSlidesPerView = () => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 640) return 1;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    return 4;
  };

  const slidesPerView = getSlidesPerView();
  const totalSlides = Math.ceil(destinations.length / slidesPerView);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section className="px-4 md:px-8 lg:px-16 py-16 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              {t?.('trending.title') || 'Trending Destinations'}
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl">
              {t?.('trending.subtitle') || 'Discover the most popular destinations for your next adventure'}
            </p>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={prevSlide}
              className={`p-3 border ${currentSlide === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'} rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[${brandBlue}] focus:ring-offset-2`}
              aria-label="Previous destinations"
              disabled={currentSlide === 0}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={nextSlide}
              className={`p-3 ${currentSlide === totalSlides - 1 ? 'bg-gray-800 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'} text-white rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[${brandBlue}] focus:ring-offset-2`}
              aria-label="Next destinations"
              disabled={currentSlide === totalSlides - 1}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Slider Container */}
        <div className="relative overflow-hidden">
          <div 
            ref={sliderRef}
            className="flex transition-transform duration-500 ease-out"
            style={{ 
              transform: `translateX(-${currentSlide * (100 / slidesPerView)}%)`,
              width: `${totalSlides * 100}%`
            }}
          >
            {destinations.map((dest) => (
              <div 
                key={dest.id} 
                className="px-3"
                style={{ width: `${100 / slidesPerView}%` }}
              >
                <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-white">
                  {/* Image Container */}
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={dest.image} 
                      alt={`${dest.name}, ${dest.country}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      width={400}
                      height={256}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=800';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Price Tag */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                      <span className="font-bold text-gray-900 text-lg">
                        {formatPrice(dest.price)}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">{currencyCode}</span>
                    </div>
                    
                    {/* Favorite Button */}
                    <button 
                      className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[${brandBlue}]"
                      aria-label="Add to favorites"
                    >
                      <svg 
                        className="w-5 h-5 text-gray-600 hover:text-red-500" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                        />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Content Container */}
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{dest.name}</h3>
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">{dest.country}</span>
                      </div>
                    </div>
                    
                    {/* Rating */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i} 
                              className={`w-4 h-4 ${i < Math.floor(dest.rating) ? 'text-yellow-400' : 'text-gray-300'}`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {dest.rating} <span className="text-gray-500">({dest.reviews} reviews)</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Book Now Button – using your brand blue */}
                    <button 
                      className="w-full py-3 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 group-hover:shadow-md"
                      style={{ 
                        backgroundColor: brandBlue,
                        '--tw-ring-color': `${brandBlue}66` // semi-transparent ring
                      } as React.CSSProperties}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = brandBlueDark;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = brandBlue;
                      }}
                      aria-label={`Book trip to ${dest.name}`}
                    >
                      <span>Book Now</span>
                      <svg 
                        className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Dots Indicator – active dot uses brand blue */}
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[${brandBlue}] ${
                index === currentSlide 
                  ? 'bg-[${brandBlue}] w-10' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
    
   \
  
      </div>
    </section>
  );
};

export default TrendingDestinations;