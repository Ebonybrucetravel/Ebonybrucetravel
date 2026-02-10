'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

// Add interface for props
interface ExclusiveOffersProps {
  onTypeClick?: (type: 'flights' | 'hotels' | 'cars') => void;
}

const ExclusiveOffers: React.FC<ExclusiveOffersProps> = ({ onTypeClick }) => {
  const { t } = useLanguage();
  const brandBlue = '#32A6D7';           // Your custom blue
  const brandBlueDark = '#2a8bb5';       // Darker hover variant

  const offers = [
    {
      id: '1',
      title: 'Summer in Japan',
      description: 'Book early and save on flights to Japan this December',
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
      badge: '30% OFF',
      ctaText: t('Book Now') || 'Book Now',
      type: 'flights' as const // Add type for each offer
    },
    {
      id: '2',
      title: 'Luxury Hotel Deals',
      description: 'Up to 50% off on 5-star hotels in the city',
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
      ctaText: t('nav.hotels') || 'View Hotels',
      type: 'hotels' as const // Add type for each offer
    },
    {
      id: '3',
      title: 'Road Trip Ready',
      description: 'Free upgrade on weekly car rentals in Europe.',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      ctaText: t('Book Now') || 'Book Now',
      type: 'cars' as const // Add type for each offer
    }
  ];

  // Handle click on an offer
  const handleOfferClick = (type: 'flights' | 'hotels' | 'cars') => {
    // Call the onTypeClick prop if it exists
    if (onTypeClick) {
      onTypeClick(type);
    }
    
    // You can also keep any existing logic here
    console.log(`Offer type clicked: ${type}`);
  };

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          {t('Exclusive Offers') || 'Exclusive Offers'}
        </h2>
        <a 
          href="#" 
          className="font-semibold transition-colors duration-200 flex items-center gap-1 group"
          style={{ color: brandBlue }}
        >
          {t('View All') || 'View All'}
          <svg 
            className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke={brandBlue}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {offers.map((offer) => (
          <div 
            key={offer.id} 
            className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            onClick={() => handleOfferClick(offer.type)} // Add click handler
          >
            <div className="relative h-48 md:h-56 overflow-hidden">
              <img 
                src={offer.image} 
                alt={offer.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              {offer.badge && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                  {offer.badge}
                </div>
              )}
            </div>
            <div className="p-5 md:p-6">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[${brandBlue}] transition-colors">
                {offer.title}
              </h3>
              <p className="text-gray-600 text-sm md:text-base mb-4 line-clamp-2">
                {offer.description}
              </p>
              <button 
                className="flex items-center gap-2 font-bold transition-all duration-300 group-hover:gap-3"
                style={{ color: brandBlue }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = brandBlueDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = brandBlue;
                }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent double triggering
                  handleOfferClick(offer.type);
                }}
              >
                {offer.ctaText}
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExclusiveOffers;