
'use client';
import React, { useState, useMemo } from 'react';
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
  baggage?: string;
  aircraft?: string;
  layoverDetails?: string;
}

interface SearchResultsProps {
  results: ResultItem[];
  searchParams: any;
  onClear: () => void;
  onSelect?: (item: ResultItem) => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results: initialResults, searchParams, onClear, onSelect }) => {
  const { currency } = useLanguage();
  const searchType = searchParams?.type || 'flights';
  
  // Local State for results and filters
  const [stopsFilter, setStopsFilter] = useState<string[]>(['Direct', '1 Stop', '2+ Stops']);
  const [priceRange, setPriceRange] = useState<number>(5000000); // 5M NGN default range
  const [cabinFilter, setCabinFilter] = useState<string>(searchParams?.cabinClass || 'Economy');
  const [sortBy, setSortBy] = useState<'match' | 'price' | 'time'>('match');
  const [isBooking, setIsBooking] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const firstSeg = searchParams?.segments?.[0];

  // Labels based on search type
  const getLabels = () => {
    switch(searchType) {
      case 'hotels':
        return { detail: 'Hotel Details', roadmap: 'Property Info', extra: 'Amenities', spec: 'Room Type', time: 'Check-in/out' };
      case 'cars':
        return { detail: 'Car Details', roadmap: 'Rental Policy', extra: 'Specs', spec: 'Car Model', time: 'Rental Window' };
      default:
        return { detail: 'Flight Details', roadmap: 'Journey Roadmap', extra: 'In-Flight Info', spec: 'Aircraft Type', time: 'Times' };
    }
  };
  const labels = getLabels();

  // Derived filtered & sorted results
  const filteredResults = useMemo(() => {
    let filtered = [...initialResults];

    // Filter by stops (only for flights)
    if (searchType === 'flights') {
      filtered = filtered.filter(item => {
        const stopText = item.stops || 'Direct';
        return stopsFilter.includes(stopText);
      });
    }

    // Filter by price
    filtered = filtered.filter(item => {
      const numericPrice = parseInt(item.price.replace(/[^\d]/g, ''));
      return numericPrice <= priceRange;
    });

    // Sort logic
    if (sortBy === 'price') {
      filtered.sort((a, b) => {
        const pA = parseInt(a.price.replace(/[^\d]/g, ''));
        const pB = parseInt(b.price.replace(/[^\d]/g, ''));
        return pA - pB;
      });
    } else if (sortBy === 'time' && searchType === 'flights') {
      filtered.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    }

    return filtered;
  }, [initialResults, stopsFilter, priceRange, sortBy, searchType]);

  const handleToggleStop = (stop: string) => {
    setStopsFilter(prev => 
      prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]
    );
  };

  const handleResetFilters = () => {
    setStopsFilter(['Direct', '1 Stop', '2+ Stops']);
    setPriceRange(5000000);
    setSortBy('match');
  };

  const handleSelectResult = (item: ResultItem) => {
    setIsBooking(item.id);
    setTimeout(() => {
      if (onSelect) {
        onSelect(item);
      } else {
        alert(`Selection confirmed! Proceeding with your ${searchType} booking.`);
      }
      setIsBooking(null);
    }, 800);
  };

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 6);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-[#f8fbfe] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Search Info Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white border-4 border-[#33a8da] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24">
                {searchType === 'flights' ? <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/> :
                 searchType === 'hotels' ? <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2zM3 21h18v-2H3v2z" /> :
                 <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />}
              </svg>
              <span className="font-bold text-gray-700">
                {searchType === 'flights' ? (firstSeg?.from || 'Origin') : searchType === 'hotels' ? (searchParams?.location || 'Location') : (searchParams?.carPickUp || 'Pick-up')}
              </span>
              {searchType === 'flights' && (
                <>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                  <span className="font-bold text-gray-700">{firstSeg?.to || 'Destination'}</span>
                </>
              )}
            </div>
            <div className="h-6 w-px bg-gray-100 hidden md:block"></div>
            <div className="flex items-center gap-2 text-gray-500 text-sm font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {searchType === 'flights' ? (firstSeg?.date || 'Anytime') : searchType === 'hotels' ? (searchParams?.checkIn || 'Check-in') : (searchParams?.carPickUpDate || 'Pick-up Date')}
            </div>
          </div>
          <button 
            onClick={onClear}
            className="px-6 py-2 border-2 border-[#33a8da] text-[#33a8da] font-black text-sm rounded-xl hover:bg-blue-50 transition uppercase tracking-tight"
          >
            Modify Search
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-[300px] space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Filters</h3>
            <button onClick={handleResetFilters} className="text-[#33a8da] text-xs font-bold uppercase tracking-tighter hover:underline">Reset All</button>
          </div>

          {searchType === 'flights' && (
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">Stops</h4>
              <div className="space-y-4">
                {['Direct', '1 Stop', '2+ Stops'].map((stop) => (
                  <label key={stop} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => handleToggleStop(stop)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${stopsFilter.includes(stop) ? 'bg-[#33a8da] border-[#33a8da]' : 'bg-white border-gray-200 group-hover:border-gray-300'}`}
                      >
                        {stopsFilter.includes(stop) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7"/></svg>}
                      </div>
                      <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900 transition">{stop}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Range */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">Price range</h4>
            <div className="relative pt-2">
              <input 
                type="range" 
                min="0" 
                max="5000000" 
                step="50000"
                value={priceRange}
                onChange={(e) => setPriceRange(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-100 rounded-full appearance-none accent-[#33a8da] cursor-pointer"
              />
              <div className="flex justify-between mt-4">
                <span className="text-[10px] font-bold text-gray-400">0</span>
                <span className="text-[10px] font-black text-[#33a8da]">{currency.symbol}{priceRange.toLocaleString()}+</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Results Column */}
        <div className="flex-1 space-y-4">
          
          {/* Results Summary & Sort */}
          <div className="bg-white rounded-[18px] px-8 py-4 shadow-sm border border-gray-100 flex items-center justify-between relative">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#33a8da] rounded-full animate-pulse"></span>
              <span className="text-sm font-black text-gray-900 tracking-tight">{filteredResults.length} {searchType} Found</span>
            </div>
            <div className="flex items-center gap-4 relative">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sort by:</span>
              <div className="relative">
                <button 
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="bg-gray-50 px-4 py-2 rounded-xl text-xs font-black text-gray-700 border border-gray-100 flex items-center gap-2 hover:bg-white transition"
                >
                  {sortBy === 'match' ? 'Best Match' : sortBy === 'price' ? 'Lowest Price' : 'Top Rated'} 
                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={3}/></svg>
                </button>
                {showSortDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                    <button onClick={() => { setSortBy('match'); setShowSortDropdown(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50">Best Match</button>
                    <button onClick={() => { setSortBy('price'); setShowSortDropdown(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50">Lowest Price</button>
                    <button onClick={() => { setSortBy('time'); setShowSortDropdown(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50">Recommended</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Result Cards */}
          {filteredResults.slice(0, visibleCount).map((item, idx) => (
            <div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-8">
                  <div className="flex flex-wrap items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center p-1 overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${item.provider}&background=f0f9ff&color=33a8da`} className="w-full h-full object-contain" alt="" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight">{item.provider}</h4>
                        <p className="text-[10px] font-bold text-gray-400">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">{Math.floor(Math.random() * 500) + 50} Reviews</span>
                      <div className="bg-yellow-400 text-white font-black text-[10px] px-2 py-0.5 rounded tracking-tighter">{(4 + Math.random()).toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-12 lg:gap-20">
                    <div className="text-center">
                      <p className="text-2xl font-black text-gray-900">{item.time || 'Available'}</p>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{labels.time}</p>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center">
                      <p className="text-[10px] font-bold text-gray-300 uppercase mb-2">{item.duration || 'Unlimited'}</p>
                      <div className="w-full h-[1.5px] bg-gray-100 relative">
                        <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] text-[#33a8da]">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            {searchType === 'flights' ? <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/> :
                             searchType === 'hotels' ? <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /> :
                             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />}
                          </svg>
                        </div>
                      </div>
                      <p className={`text-[10px] font-black uppercase mt-2 tracking-widest text-blue-500`}>
                        {searchType === 'flights' ? (item.stops || 'Direct') : 'Top Choice'}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-2xl font-black text-gray-900">{searchType === 'flights' ? (idx % 2 === 0 ? '14:45' : '05:25') : 'Flexible'}</p>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{searchType === 'flights' ? 'Arrival' : 'Policy'}</p>
                    </div>
                  </div>

                  <div className="mt-8">
                     <button onClick={() => toggleExpand(item.id)} className="px-4 py-1.5 bg-blue-50 text-[#33a8da] text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-blue-100 transition flex items-center gap-2">
                        {expandedId === item.id ? 'Hide Details' : labels.detail}
                        <svg className={`w-3 h-3 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={3}/></svg>
                      </button>
                  </div>
                </div>

                <div className="w-full md:w-[220px] bg-[#fdfdfd] border-l border-gray-100 flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-6">
                    <p className="text-2xl font-black text-gray-900">
                      {item.price.includes(currency.symbol) ? item.price : `${currency.symbol}${item.price.replace(/[^\d,.]/g, '')}`}
                    </p>
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                      {searchType === 'hotels' ? 'Per Night' : searchType === 'cars' ? 'Per Day' : 'Per Traveler'}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleSelectResult(item)}
                    disabled={isBooking === item.id}
                    className={`w-full text-white font-black py-3.5 rounded-xl transition shadow-lg active:scale-95 text-sm flex items-center justify-center gap-2 ${isBooking === item.id ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#33a8da] hover:bg-[#2c98c7] shadow-blue-500/10'}`}
                  >
                    {isBooking === item.id ? 'Processing...' : 'Select'}
                    {!isBooking && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>}
                  </button>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="border-t border-gray-100 bg-[#fafcfd] p-8 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div>
                      <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">{labels.roadmap}</h5>
                      <div className="space-y-4">
                        <p className="text-sm font-bold text-gray-700">{item.layoverDetails || 'Standard Policy Apply'}</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">Features</h5>
                      <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <p className="text-xs font-black text-gray-900">{item.baggage || 'Standard inclusions apply'}</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-6">{labels.extra}</h5>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#33a8da]">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{labels.spec}</p>
                              <p className="text-sm font-bold text-gray-900">{item.aircraft || 'Premium Quality'}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {visibleCount < filteredResults.length && (
            <button 
              onClick={handleShowMore}
              className="w-full bg-[#33a8da] text-white font-black py-5 rounded-[24px] hover:bg-[#2c98c7] transition shadow-xl shadow-blue-500/10 active:scale-[0.98] uppercase tracking-widest"
            >
              Show more {searchType}
            </button>
          )}

          {filteredResults.length === 0 && (
            <div className="bg-white rounded-[24px] p-20 text-center border border-dashed border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">No {searchType} found</h3>
              <p className="text-gray-400 mt-1">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResults;
