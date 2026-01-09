
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ResultItem {
  id: string;
  provider: string;
  title: string;
  subtitle: string;
  price: string;
  time?: string;
  duration?: string;
  stops?: string;
  rating?: number;
  image?: string;
}

interface SearchResultsProps {
  results: ResultItem[];
  searchParams: any;
  onClear: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, searchParams, onClear }) => {
  const { t, currency } = useLanguage();
  if (!results || results.length === 0) return null;

  const firstSeg = searchParams.segments?.[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 capitalize">
            {searchParams.tripType?.replace('-', ' ')} {t(`nav.${searchParams.type}`)}
          </h2>
          <p className="text-gray-500 mt-1 font-medium">
            {searchParams.tripType === 'multi-city' ? (
               <span>Multi-city route found</span>
            ) : (
              <span>{firstSeg?.from} to {firstSeg?.to} • {firstSeg?.date}</span>
            )}
            {searchParams.returnDate ? ` — ${searchParams.returnDate}` : ''}
            <span className="mx-2 text-gray-300">|</span>
            <span>{searchParams.travellers}</span>
          </p>
        </div>
        <button 
          onClick={onClear}
          className="text-blue-600 font-bold hover:underline flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl transition hover:bg-blue-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          New Search
        </button>
      </div>

      <div className="grid gap-4">
        {results.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center font-bold text-blue-600 text-lg uppercase">
                  {item.provider.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 font-medium">{item.provider} • {item.subtitle}</p>
                </div>
              </div>
              
              {searchParams.type === 'flights' && (
                <div className="flex items-center gap-12 mt-6">
                  <div className="text-center">
                    <p className="text-xl font-black text-gray-900">{item.time?.split('-')[0].trim() || '08:00 AM'}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase">{firstSeg?.from?.match(/\((.*?)\)/)?.[1] || 'LOS'}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{item.duration}</p>
                    <div className="w-full h-[2px] bg-gray-100 relative">
                      <div className="absolute left-1/2 -translate-x-1/2 -top-[3px] w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">{item.stops}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-gray-900">{item.time?.split('-')[1].trim() || '09:15 AM'}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase">{firstSeg?.to?.match(/\((.*?)\)/)?.[1] || 'ABJ'}</p>
                  </div>
                </div>
              )}

              {(searchParams.type === 'hotels' || searchParams.type === 'cars') && (
                <div className="flex items-center gap-2 mt-2">
                   <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className={`w-4 h-4 ${i < (item.rating || 5) ? 'fill-current' : 'text-gray-200'}`} viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400 font-bold">{item.rating || 5}.0 Rating</span>
                </div>
              )}
            </div>

            <div className="w-full md:w-auto md:border-l border-gray-100 md:pl-8 flex md:flex-col items-center justify-between gap-4">
              <div className="text-center md:text-right">
                <p className="text-xs text-gray-400 font-bold uppercase">Best Price</p>
                <p className="text-3xl font-black text-blue-600">{currency.symbol}{item.price.replace(/[^\d.]/g, '')}</p>
              </div>
              <button className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 whitespace-nowrap active:scale-95">
                Select
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
