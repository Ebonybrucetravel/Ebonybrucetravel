'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ExclusiveOffersProps {
  onTypeClick?: (type: 'flights' | 'hotels' | 'cars') => void;
}

const ExclusiveOffers: React.FC<ExclusiveOffersProps> = ({ onTypeClick }) => {
  const { t } = useLanguage();
  const brandBlue = '#32A6D7';
  const brandBlueDark = '#2a8bb5';

  const offers = [
    {
      id: '1',
      title: t('offers.japan.title'),
      description: t('offers.japan.description'),
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
      badge: '30% OFF',
      ctaText: t('offers.bookNow'),
      type: 'flights' as const
    },
    {
      id: '2',
      title: t('offers.hotel.title'),
      description: t('offers.hotel.description'),
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
      ctaText: t('nav.hotels'),
      type: 'hotels' as const
    },
    {
      id: '3',
      title: t('offers.car.title'),
      description: t('offers.car.description'),
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      ctaText: t('offers.bookNow'),
      type: 'cars' as const
    }
  ];

  const handleOfferClick = (type: 'flights' | 'hotels' | 'cars') => {
    if (onTypeClick) onTypeClick(type);
    console.log(`Offer type clicked: ${type}`);
  };

  return (
    <section className="px-4 md:px-8 lg:px-16 pt-2.5 pb-0 -mb-2">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
          {t('offers.title')}
        </h2>
        <a
          href="#"
          className="font-semibold transition-colors duration-200 flex items-center gap-1 group text-sm"
          style={{ color: brandBlue }}
        >
          {t('offers.viewAll')}
          <svg
            className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke={brandBlue}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="group cursor-pointer rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => handleOfferClick(offer.type)}
          >
            <div className="relative h-36 md:h-40 overflow-hidden">
              <img
                src={offer.image}
                alt={offer.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              {offer.badge && (
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                  {offer.badge}
                </div>
              )}
            </div>
            <div className="p-3 md:p-4">
              <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-[${brandBlue}] transition-colors">
                {offer.title}
              </h3>
              <p className="text-gray-500 text-xs md:text-sm mb-2 line-clamp-2">
                {offer.description}
              </p>
              <button
                className="flex items-center gap-1.5 font-semibold text-xs transition-all duration-300 group-hover:gap-2"
                style={{ color: brandBlue }}
                onMouseEnter={(e) => { e.currentTarget.style.color = brandBlueDark; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = brandBlue; }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOfferClick(offer.type);
                }}
              >
                {offer.ctaText}
                <svg
                  className="w-3.5 h-3.5"
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