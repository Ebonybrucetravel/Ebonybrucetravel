'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const Partners: React.FC = () => {
  const { t } = useLanguage();
  
  const partners = [
    { name: 'Air Peace', logo: '/logos/air-peace.png' },
    { name: 'Emirates', logo: '/logos/emirates.png' },
    { name: 'Marriott', logo: '/logos/marriott.png' },
    { name: 'Hertz', logo: '/logos/hertz.png' },
    { name: 'Ibom Air', logo: '/logos/ibom-air.png' },
    { name: 'Hilton', logo: '/logos/hilton.png' },
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t?.('Global Partners') || 'Global Partners'}
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            {t?.('Trusted by the best in travel') || 'Trusted by the best in travel'}
          </p>
        </div>
        
        {/* Single horizontal line */}
        <div className="flex items-center justify-center space-x-8 md:space-x-12 lg:space-x-16 overflow-x-auto pb-4 hide-scrollbar">
          {partners.map((partner) => (
            <div 
              key={partner.name}
              className="flex-shrink-0"
            >
              <img 
                src={partner.logo} 
                alt={`${partner.name} logo`}
                className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 hover:scale-110"
              />
            </div>
          ))}
        </div>
      </div>
      
      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default Partners;