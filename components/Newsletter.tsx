
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const Newsletter: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="bg-white py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{t('STAY UPDATED ON TRAVEL DEALS')}</h2>
        <p className="text-gray-500 mb-10 tracking-widest text-sm font-bold uppercase">{t('JOIN 50,000+ TRAVELERS')}</p>
        <form className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto p-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner" onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="Email" className="flex-1 bg-transparent px-6 py-4 focus:outline-none text-gray-900 font-medium" />
          <button type="submit" className="bg-blue-600 text-white font-bold px-10 py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
            {t('subscribe')}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
