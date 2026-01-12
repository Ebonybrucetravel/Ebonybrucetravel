'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const SpecializedServices: React.FC = () => {
  const { t } = useLanguage();
  const brandBlue = '#32A6D7';

  return (
    <section className="text-center py-12 px-4 md:px-8 lg:px-16">
      <div className="mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t('Our Services') || 'Our Specialized Services'}
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-base md:text-lg">
          {t('We offer more than just bookings.') || 'We go beyond travel bookings — discover our premium specialized services'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-200 transition-colors">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            {t('International and Local Logistics') || 'International & Local Logistics'}
          </h3>
          <p className="text-gray-600 text-sm md:text-base mb-6 leading-relaxed">
            Global shipping and localized logistics services powered by our official DHL franchise partnership.
          </p>
          <a 
            href="#" 
            className="font-bold text-sm md:text-base transition-colors inline-flex items-center gap-1 group-hover:gap-2"
            style={{ color: brandBlue }}
          >
            {t('Learn More') || 'Learn More'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group scale-105 z-10 relative">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-red-200 transition-colors">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
            {t('Educational Consultancy') || 'Educational Consultancy'}
          </h3>
          <p className="text-gray-600 text-sm md:text-base mb-6 leading-relaxed">
            Expert guidance to secure your international university admissions with unprecedented speed and precision.
          </p>
          <a 
            href="#" 
            className="font-bold text-sm md:text-base transition-colors inline-flex items-center gap-1 group-hover:gap-2"
            style={{ color: brandBlue }}
          >
            {t('Learn More') || 'Learn More'}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default SpecializedServices;