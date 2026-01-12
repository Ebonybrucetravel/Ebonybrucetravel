'use client';
import React from 'react';
import SearchBox from './SearchBox';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onSearch: (data: any) => void;
  loading: boolean;
}

const Hero: React.FC<HeroProps> = ({ onSearch, loading }) => {
  const { t } = useLanguage();
  
  return (
    <section className="relative min-h-[750px] flex items-center justify-center overflow-hidden py-20">
      <div className="absolute inset-0 z-0">
        {/* High-quality travel background image */}
        <img 
          src="/images/bg.jpg" 
          alt="Ebony Bruce Travels Background" 
          className="w-full h-full object-cover"
         
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mb-16">
          {/* Responsive Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 tracking-tight drop-shadow-lg">
            {t('Where Global Travel Becomes Easy')}
          </h1>
          {/* Responsive Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-gray-100 max-w-2xl mx-auto font-medium opacity-95 leading-relaxed">
            {t('Discover flights, hotels, and car rentals at the best prices')}
          </p>
        </div>
        
        {/* Search Box Container - RESTORED to original desktop margins/padding */}
        <div className="relative z-20 animate-in fade-in zoom-in-95 delay-300 duration-700">
          <SearchBox onSearch={onSearch} loading={loading} />
        </div>
        
        {/* Optional Features/Trust Indicators - Kept responsive but not interfering with SearchBox */}
        <div className="mt-20 flex flex-wrap justify-center gap-8 animate-in fade-in delay-500 duration-1000">
          <div className="flex items-center gap-3">
            
          </div>
          
          <div className="flex items-center gap-3">
                      </div>
          
          <div className="flex items-center gap-3">
          
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;