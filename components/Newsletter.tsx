import React from 'react';
import { useLanguage } from '../context/LanguageContext';
const Newsletter: React.FC = () => {
    const { t } = useLanguage();
    return (<section className="bg-white py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">{t('STAY UPDATED ON TRAVEL DEALS')}</h2>
        <p className="text-gray-500 mb-10 tracking-widest text-sm font-bold uppercase">{t('JOIN 50,000+ TRAVELERS')}</p>
        <form className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="Your email address" className="flex-1 px-6 py-4 focus:outline-none text-gray-900 font-medium placeholder-gray-400 border-2 border-gray-200 rounded-xl focus:border-[#32A6D7] transition-colors duration-200"/>
          <button type="submit" className="bg-[#32A6D7] text-white font-bold px-10 py-4 rounded-xl hover:bg-[#2B94C6] transition-colors duration-200">
            {t('subscribe')}
          </button>
        </form>
      </div>
    </section>);
};
export default Newsletter;
