import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import Link from 'next/link';

interface SpecializedServicesProps {
  onServiceClick?: (service: string) => void;
}

const SpecializedServices: React.FC<SpecializedServicesProps> = ({ onServiceClick }) => {
  const { t } = useLanguage();

  const handleServiceClick = (service: string, e: React.MouseEvent) => {
    if (onServiceClick) {
      e.preventDefault();
      onServiceClick(service);
    }
  };

  return (
    <section className="text-center py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('services.title')}</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          {t('services.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Travel Services (Non-Flight) */}
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group hover:-translate-y-2 duration-300">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h1.5a2.5 2.5 0 012.5 2.5V14a2 2 0 002 2h.5m-2-12h1.5a2 2 0 012 2v.5a2 2 0 01-2 2h-1a2 2 0 00-2 2v1a2 2 0 01-2 2h-1a2 2 0 00-2 2v1a2 2 0 01-2 2h-1" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Travel Services (Non-Flight)</h3>
          <p className="text-gray-500 text-sm mb-6">
            We specialize in organizing and managing tours, excursions, and event ticketing. 
            We do not book or manage flight reservations or offer immigration services.
          </p>
          
          <Link 
            href="/services/travel-services"
            onClick={(e) => handleServiceClick('Travel Services', e)}
            className="inline-flex items-center text-[#33a8da] font-bold text-sm group-hover:gap-2 transition-all"
          >
            Learn More
            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* DHL Franchised Logistics */}
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group hover:-translate-y-2 duration-300 scale-105 z-10">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-200 transition">
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">DHL Franchised Logistics</h3>
          <p className="text-gray-500 text-sm mb-6">
            As an authorized DHL franchise partner, we offer courier and international parcel services. 
            This includes handling document and package shipments, offering tracking support, and providing 
            clients with a secure and efficient logistics solution.
          </p>
          
          <Link 
            href="/services/dhl-logistics"
            onClick={(e) => handleServiceClick('DHL Logistics', e)}
            className="inline-flex items-center text-[#33a8da] font-bold text-sm group-hover:gap-2 transition-all"
          >
            Learn More
            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Speedy Admission Processing */}
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl transition-all group hover:-translate-y-2 duration-300">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-red-200 transition">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Speedy Admission Processing</h3>
          <p className="text-gray-500 text-sm mb-6">
            We offer advisory services for students seeking admission to international educational institutions. 
            This includes academic counseling and course matching.
          </p>
          
          <Link 
            href="/services/admission-processing"
            onClick={(e) => handleServiceClick('Admission Processing', e)}
            className="inline-flex items-center text-[#33a8da] font-bold text-sm group-hover:gap-2 transition-all"
          >
            Learn More
            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpecializedServices;