
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const ExclusiveOffers: React.FC = () => {
  const { t } = useLanguage();
  const offers = [
    {
      id: '1',
      title: 'Summer in Japan',
      description: 'Book early and save on flights to Japan this December',
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=800',
      badge: '30% OFF',
      ctaText: t('offers.bookNow')
    },
    {
      id: '2',
      title: 'Luxury Hotel Deals',
      description: 'Up to 50% off on 5-star hotels in the city',
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=800',
      ctaText: t('nav.hotels')
    },
    {
      id: '3',
      title: 'Road Trip Ready',
      description: 'Free upgrade on weekly car rentals in Europe.',
      image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
      ctaText: t('offers.bookNow')
    }
  ];

  return (
    <section>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{t('Exclusive Offers')}</h2>
        <a href="#" className="text-blue-600 font-semibold hover:underline">{t('View All')}</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {offers.map((offer) => (
          <div key={offer.id} className="group cursor-pointer rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition duration-300">
            <div className="relative h-48 overflow-hidden">
              <img src={offer.image} alt={offer.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              {offer.badge && <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">{offer.badge}</div>}
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{offer.title}</h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{offer.description}</p>
              <button className="flex items-center gap-1 text-blue-600 font-bold hover:gap-2 transition-all">
                {offer.ctaText}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExclusiveOffers;
