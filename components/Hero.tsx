'use client';
import React from 'react';
import SearchBox from './SearchBox';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onSearch: (data: any) => void;
  loading: boolean;
  activeSearchTab?: 'flights' | 'hotels' | 'cars';
  onTabChange?: (tab: 'flights' | 'hotels' | 'cars') => void;
}

const Hero: React.FC<HeroProps> = ({ 
  onSearch, 
  loading, 
  activeSearchTab = 'flights',
  onTabChange 
}) => {
  const { t } = useLanguage();
  
  return (
    <section className="relative min-h-[450px] md:min-h-[550px] flex items-center justify-center overflow-hidden py-4 md:py-6">
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/bg.jpg" 
          alt="Ebony Bruce Travels Background" 
          className="w-full h-full object-cover"
        />

      </div>
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mb-6 md:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 tracking-tight drop-shadow-lg">
            {t('Where Global Travel Becomes Easy')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl mx-auto font-medium opacity-95 leading-relaxed">
            {t('Discover flights, hotels, and car rentals at the best prices')}
          </p>
        </div>
        
        <div className="relative z-20 animate-in fade-in zoom-in-95 delay-300 duration-700 mb-4 md:mb-6">
          <SearchBox 
            onSearch={onSearch} 
            loading={loading} 
            activeTab={activeSearchTab}
            onTabChange={onTabChange}
          />
        </div>
        
        <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-8 animate-in fade-in delay-500 duration-1000">
          {/* Trust indicators - optional */}
        </div>
      </div>
    </section>
  );
};

export default Hero;