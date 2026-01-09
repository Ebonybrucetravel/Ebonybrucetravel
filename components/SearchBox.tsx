
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface Segment {
  from: string;
  to: string;
  date: string;
}

interface Travellers {
  adults: number;
  children: number;
  infants: number;
}

interface SearchBoxProps {
  onSearch: (data: any) => void;
  loading: boolean;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, loading }) => {
  const { t, currency } = useLanguage();
  const [activeTab, setActiveTab] = useState('flights');
  
  // Flight Specific State
  const [tripType, setTripType] = useState<'round-trip' | 'one-way' | 'multi-city'>('round-trip');
  const [cabinClass, setCabinClass] = useState('Economy');
  const [showCabinDropdown, setShowCabinDropdown] = useState(false);
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [stopsFilter, setStopsFilter] = useState('Any');
  const [maxPrice, setMaxPrice] = useState(2000);
  const [segments, setSegments] = useState<Segment[]>([
    { from: 'Lagos(LOS)', to: 'Abuja(ABJ)', date: '' }
  ]);
  const [returnDate, setReturnDate] = useState('');
  
  // Hotel Specific State
  const [hotelLocation, setHotelLocation] = useState('The Providence Hotel');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');

  // Car Rental State
  const [carPickUp, setCarPickUp] = useState('');
  const [carPickUpDate, setCarPickUpDate] = useState('');
  const [carPickUpTime, setCarPickUpTime] = useState('10:00');
  const [carDropOffDate, setCarDropOffDate] = useState('');
  const [carDropOffTime, setCarDropOffTime] = useState('10:00');
  const [differentLocation, setDifferentLocation] = useState(false);
  const [driverAged, setDriverAged] = useState(true);
  
  // Common State
  const [travellers, setTravellers] = useState<Travellers>({ adults: 2, children: 0, infants: 0 });
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);

  const travellerRef = useRef<HTMLDivElement>(null);
  const cabinRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (travellerRef.current && !travellerRef.current.contains(event.target as Node)) {
        setShowTravellerDropdown(false);
      }
      if (cabinRef.current && !cabinRef.current.contains(event.target as Node)) {
        setShowCabinDropdown(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFiltersDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (segments[0].date && returnDate && segments[0].date > returnDate) {
      setReturnDate(segments[0].date);
    }
  }, [segments[0].date, returnDate]);

  useEffect(() => {
    if (checkInDate && checkOutDate && checkInDate > checkOutDate) {
      setCheckOutDate(checkInDate);
    }
  }, [checkInDate, checkOutDate]);

  const handleTripTypeChange = (type: 'round-trip' | 'one-way' | 'multi-city') => {
    setTripType(type);
    if (type === 'multi-city') {
      if (segments.length === 1) {
        setSegments([...segments, { from: '', to: '', date: '' }]);
      }
    } else {
      setSegments([segments[0]]);
    }
  };

  const addSegment = () => {
    if (segments.length < 4) {
      setSegments([...segments, { from: '', to: '', date: '' }]);
    }
  };

  const removeSegment = (index: number) => {
    if (segments.length > 2) {
      setSegments(segments.filter((_, i) => i !== index));
    }
  };

  const handleSegmentChange = (index: number, field: keyof Segment, value: string) => {
    const newSegments = [...segments];
    newSegments[index][field] = value;
    setSegments(newSegments);
  };

  const handleSwap = (index: number) => {
    const newSegments = [...segments];
    const temp = newSegments[index].from;
    newSegments[index].from = newSegments[index].to;
    newSegments[index].to = temp;
    setSegments(newSegments);
  };

  const updateTraveller = (type: keyof Travellers, increment: boolean) => {
    setTravellers(prev => {
      const newValue = increment ? prev[type] + 1 : Math.max(0, prev[type] - 1);
      if (type === 'adults' && newValue < 1) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  const getTravellerSummary = () => {
    const parts = [];
    if (travellers.adults > 0) parts.push(`${travellers.adults} Adult${travellers.adults > 1 ? 's' : ''}`);
    if (travellers.children > 0) parts.push(`${travellers.children} Child${travellers.children > 1 ? 'ren' : ''}`);
    return parts.join(', ') || 'Select travellers';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      type: activeTab,
      ...(activeTab === 'flights' ? { 
          tripType, 
          segments, 
          returnDate: tripType === 'round-trip' ? returnDate : null, 
          cabinClass, 
          stops: stopsFilter,
          maxPrice: maxPrice,
          travellers: getTravellerSummary() 
        } : 
         activeTab === 'hotels' ? { location: hotelLocation, checkIn: checkInDate, checkOut: checkOutDate, travellers: getTravellerSummary() } :
         { carPickUp, carPickUpDate, carPickUpTime, carDropOffDate, carDropOffTime, differentLocation, driverAged })
    };
    onSearch(data);
  };

  const triggerPicker = (e: React.MouseEvent<HTMLInputElement>) => {
    try { if ('showPicker' in HTMLInputElement.prototype) (e.target as any).showPicker(); } 
    catch (err) { (e.target as HTMLInputElement).focus(); }
  };

  const renderTravellerDropdown = () => (
    showTravellerDropdown && (
      <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800">Adults</span><span className="text-[10px] text-gray-400 font-bold uppercase">Ages 12+</span></div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => updateTraveller('adults', false)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-6 text-center text-lg">{travellers.adults}</span>
              <button type="button" onClick={() => updateTraveller('adults', true)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div><span className="block font-bold text-gray-800">Children</span><span className="text-[10px] text-gray-400 font-bold uppercase">Ages 2-12</span></div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => updateTraveller('children', false)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">-</button>
              <span className="font-bold w-6 text-center text-lg">{travellers.children}</span>
              <button type="button" onClick={() => updateTraveller('children', true)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-bold text-gray-500">+</button>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-50">
            <button type="button" onClick={() => setShowTravellerDropdown(false)} className="w-full py-3 bg-[#33a8da] text-white rounded-lg font-bold hover:bg-[#2c98c7] transition-colors shadow-lg">Done</button>
          </div>
        </div>
      </div>
    )
  );

  const renderFlightSegmentRow = (segment: Segment, index: number) => {
    const isFirst = index === 0;
    const isMultiCity = tripType === 'multi-city';
    const isRangeSelected = tripType === 'round-trip' && index === 0 && segment.date && returnDate;

    return (
      <div key={index} className="bg-[#33a8da] rounded-[12px] p-1.5 flex flex-col lg:flex-row items-stretch gap-1 mb-2 shadow-sm animate-in slide-in-from-left duration-200">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-1">
          <div className="lg:col-span-3 bg-white p-4 flex items-center gap-4 relative rounded-l-[4px]">
            <svg className="w-7 h-7 text-[#33a8da]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5 leading-none">From</label>
              <input type="text" value={segment.from} onChange={(e) => handleSegmentChange(index, 'from', e.target.value)} className="w-full font-bold text-gray-900 focus:outline-none text-lg bg-transparent p-0" placeholder="Origin" />
            </div>
            <button type="button" onClick={() => handleSwap(index)} className="absolute right-[-18px] top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-100 rounded-full p-2 shadow-sm hover:bg-gray-50 transition hidden lg:block">
              <svg className="w-4 h-4 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L13 16M17 20L21 16" /></svg>
            </button>
          </div>
          <div className="lg:col-span-3 bg-white p-4 flex items-center gap-4 border-l border-gray-100">
            <svg className="w-7 h-7 text-[#33a8da] rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5 leading-none">To</label>
              <input type="text" value={segment.to} onChange={(e) => handleSegmentChange(index, 'to', e.target.value)} className="w-full font-bold text-gray-900 focus:outline-none text-lg bg-transparent p-0" placeholder="Destination" />
            </div>
          </div>
          <div className={`lg:col-span-3 p-4 flex items-center gap-4 relative cursor-pointer group hover:bg-gray-50 transition border-l border-gray-100 ${isRangeSelected ? 'bg-blue-50/50' : 'bg-white'}`}>
            <svg className="w-7 h-7 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <div className="flex-1 flex gap-2 min-w-0">
              <div className="flex-1 min-w-0 relative h-10 flex flex-col justify-center">
                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none truncate">Departure</label>
                <span className={`block font-bold text-sm leading-tight truncate ${segment.date ? 'text-gray-900' : 'text-gray-400'}`}>{segment.date ? new Date(segment.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Select Date'}</span>
                <input type="date" min={today} value={segment.date} onClick={triggerPicker} onChange={(e) => handleSegmentChange(index, 'date', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20 block" />
              </div>
              {tripType === 'round-trip' && index === 0 && (
                <div className="flex-1 min-w-0 border-l border-gray-100 pl-2 relative h-10 flex flex-col justify-center">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none truncate">Return</label>
                  <span className={`block font-bold text-sm leading-tight truncate ${returnDate ? 'text-gray-900' : 'text-gray-400'}`}>{returnDate ? new Date(returnDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Add Return'}</span>
                  <input type="date" min={segment.date || today} value={returnDate} onClick={triggerPicker} onChange={(e) => setReturnDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20 block" />
                </div>
              )}
            </div>
            {isRangeSelected && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#33a8da] rounded-b-[4px] animate-in slide-in-from-left duration-300"></div>}
          </div>
          <div className="lg:col-span-3 bg-white p-4 flex items-center gap-4 relative cursor-pointer group hover:bg-gray-50 transition border-l border-gray-100 rounded-r-[4px]" ref={travellerRef} onClick={() => setShowTravellerDropdown(!showTravellerDropdown)}>
            <svg className="w-7 h-7 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5 leading-none">Traveller</label>
              <span className="block font-bold text-gray-900 text-sm leading-tight truncate">{getTravellerSummary()}</span>
            </div>
            {renderTravellerDropdown()}
            {isMultiCity && index > 1 && (
              <button type="button" onClick={(e) => { e.stopPropagation(); removeSegment(index); }} className="absolute -right-3 -top-3 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-md z-30">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>
        {isFirst && (
          <button type="submit" disabled={loading} className="bg-black text-white px-10 py-5 font-bold text-xl rounded-[8px] hover:bg-gray-900 transition active:scale-95 lg:ml-1 min-w-[140px] shadow-lg flex items-center justify-center">
            {loading ? '...' : 'Search'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-visible">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-10 px-10 pt-6 border-b border-gray-100">
          {[
            { id: 'flights', label: 'Flights', icon: <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /> },
            { id: 'hotels', label: 'Hotels', icon: <path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2zm3-8h4c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM3 21h18v-2H3v2zM3 8c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10H3V8z" /> },
            { id: 'cars', label: 'Car Rentals', icon: <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42.99L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" /> }
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2.5 pb-5 transition-all relative ${activeTab === tab.id ? 'text-[#33a8da]' : 'text-gray-600 hover:text-blue-500 font-bold'}`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">{tab.icon}</svg>
              <span className="text-lg font-bold tracking-tight">{tab.label}</span>
              {activeTab === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-[#33a8da] rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300"></div>}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12">
          {activeTab === 'flights' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <div className="flex flex-wrap items-center gap-6">
                  {(['round-trip', 'one-way', 'multi-city'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => handleTripTypeChange(opt)} className="flex items-center gap-2.5 group">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${tripType === opt ? 'border-[#33a8da]' : 'border-gray-200 group-hover:border-gray-300'}`}>
                        {tripType === opt && <div className="w-3 h-3 bg-[#33a8da] rounded-full" />}
                      </div>
                      <span className={`text-sm font-bold capitalize transition-colors ${tripType === opt ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        {opt.replace('-', ' ')}
                      </span>
                    </button>
                  ))}
                  <div className="flex items-center gap-4 border-l border-gray-100 pl-6 h-8">
                    <div className="relative" ref={cabinRef}>
                      <button type="button" onClick={() => setShowCabinDropdown(!showCabinDropdown)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300 text-xs font-bold">
                        {cabinClass} <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth={3}/></svg>
                      </button>
                      {showCabinDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          {['Economy', 'Premium Economy', 'Business', 'First Class'].map((cls) => (
                            <button key={cls} type="button" onClick={() => { setCabinClass(cls); setShowCabinDropdown(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                              {cls}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="relative" ref={filtersRef}>
                      <button 
                        type="button" 
                        onClick={() => setShowFiltersDropdown(!showFiltersDropdown)} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${showFiltersDropdown ? 'border-[#33a8da] bg-blue-50 text-[#33a8da]' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        Filters
                      </button>
                      {showFiltersDropdown && (
                        <div className="absolute top-full right-0 lg:left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Stops</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {['Any', 'Non-stop', '1 Stop', '2+ Stops'].map((stop) => (
                                  <button 
                                    key={stop} 
                                    type="button" 
                                    onClick={() => setStopsFilter(stop)} 
                                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${stopsFilter === stop ? 'bg-[#33a8da] text-white border-[#33a8da]' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-200'}`}
                                  >
                                    {stop}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-end mb-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Price</h4>
                                <span className="text-xs font-black text-[#33a8da]">{currency.symbol}{maxPrice.toLocaleString()}</span>
                              </div>
                              <input 
                                type="range" 
                                min="100" 
                                max="10000" 
                                step="100"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#33a8da]"
                              />
                              <div className="flex justify-between mt-2">
                                <span className="text-[9px] font-bold text-gray-300">{currency.symbol}100</span>
                                <span className="text-[9px] font-bold text-gray-300">{currency.symbol}10,000+</span>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setShowFiltersDropdown(false)}
                              className="w-full py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
                            >
                              Apply Filters
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {segments.map((seg, idx) => renderFlightSegmentRow(seg, idx))}
                {tripType === 'multi-city' && segments.length < 4 && (
                  <button type="button" onClick={addSegment} className="flex items-center gap-2 text-[#33a8da] font-bold text-sm bg-blue-50 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition shadow-sm border border-blue-100">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add Another Flight
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'hotels' && (
            <div className="space-y-8">
              <div className="bg-[#33a8da] rounded-[12px] p-1.5 flex flex-col lg:flex-row items-stretch gap-1 shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-1 items-stretch">
                  <div className="md:col-span-4 bg-white p-4 flex items-center gap-4 hover:bg-gray-50 transition rounded-l-[4px] group">
                    <svg className="w-8 h-8 text-[#33a8da] transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M7 13c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2z" /></svg>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5 leading-none">Destination</label>
                      <input type="text" value={hotelLocation} onChange={(e) => setHotelLocation(e.target.value)} className="w-full font-bold text-gray-900 focus:outline-none text-lg bg-transparent p-0" placeholder="The Providence Hotel" />
                    </div>
                  </div>
                  <div className={`md:col-span-4 p-4 flex items-center gap-4 relative transition cursor-pointer group border-l border-gray-100 ${checkInDate && checkOutDate ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}>
                    <svg className="w-8 h-8 text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div className="flex-1 relative h-10 flex flex-col justify-center">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none">Stay Dates</label>
                      <span className="text-gray-900 font-bold text-sm leading-tight truncate">
                        {checkInDate ? (checkOutDate ? `${new Date(checkInDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} — ${new Date(checkOutDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}` : `${new Date(checkInDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} — Add Out`) : 'Select Dates'}
                      </span>
                      <div className="absolute inset-0 flex opacity-0 cursor-pointer">
                         <input type="date" min={today} className="flex-1" onChange={(e) => setCheckInDate(e.target.value)} onClick={triggerPicker} />
                         <input type="date" min={checkInDate || today} className="flex-1" onChange={(e) => setCheckOutDate(e.target.value)} onClick={triggerPicker} />
                      </div>
                    </div>
                    {checkInDate && checkOutDate && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#33a8da] rounded-b-[4px] animate-in slide-in-from-left duration-300"></div>}
                  </div>
                  <div ref={travellerRef} onClick={() => setShowTravellerDropdown(!showTravellerDropdown)} className="md:col-span-4 bg-white p-4 flex items-center gap-4 relative hover:bg-gray-50 transition cursor-pointer group border-l border-gray-100 rounded-r-[4px]">
                    <svg className="w-8 h-8 text-gray-700 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5 leading-none">Travellers</label>
                      <span className="block font-bold text-gray-900 text-sm leading-tight truncate">{getTravellerSummary()}</span>
                    </div>
                    {renderTravellerDropdown()}
                  </div>
                </div>
                <button type="submit" disabled={loading} className="bg-black text-white px-10 py-5 font-bold text-xl rounded-[8px] hover:bg-gray-900 transition active:scale-95 lg:ml-1 min-w-[140px] shadow-lg flex items-center justify-center">
                  {loading ? '...' : 'Search'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'cars' && (
            <div className="space-y-6">
              <div className="bg-[#33a8da] rounded-[12px] p-1.5 flex flex-col lg:flex-row items-stretch gap-1 shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-1 items-stretch">
                  <div className="md:col-span-4 bg-white p-4 flex items-center gap-4 hover:bg-gray-50 transition rounded-l-[4px] group">
                    <svg className="w-6 h-6 text-[#33a8da]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5 leading-none">Pick-up Location</label>
                      <input type="text" value={carPickUp} onChange={(e) => setCarPickUp(e.target.value)} className="w-full font-bold text-gray-900 focus:outline-none text-lg bg-transparent p-0" placeholder="Pick-up City" />
                    </div>
                  </div>
                  <div className={`md:col-span-3 p-4 flex items-center gap-3 relative transition group cursor-pointer border-l border-gray-100 ${carPickUpDate && carDropOffDate ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}>
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div className="flex-1 flex gap-2">
                       <div className="flex-1 min-w-0">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none">Pick-up</label>
                        <span className={`text-sm font-bold truncate block ${carPickUpDate ? 'text-gray-900' : 'text-gray-400'}`}>{carPickUpDate ? new Date(carPickUpDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Date'}</span>
                        <input type="date" min={today} value={carPickUpDate} onChange={(e) => setCarPickUpDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                      </div>
                      <div className="w-[1px] bg-gray-100 my-1"></div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none">Time</label>
                        <span className="text-sm font-bold text-gray-900 block">{carPickUpTime}</span>
                        <input type="time" value={carPickUpTime} onChange={(e) => setCarPickUpTime(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                      </div>
                    </div>
                    {carPickUpDate && carDropOffDate && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#33a8da] rounded-b-[4px] animate-in slide-in-from-left duration-300"></div>}
                  </div>
                  <div className={`md:col-span-3 p-4 flex items-center gap-3 relative transition group cursor-pointer border-l border-gray-100 rounded-r-[4px] ${carPickUpDate && carDropOffDate ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}>
                    <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none">Drop-off</label>
                        <span className={`text-sm font-bold truncate block ${carDropOffDate ? 'text-gray-900' : 'text-gray-400'}`}>{carDropOffDate ? new Date(carDropOffDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'Date'}</span>
                        <input type="date" min={carPickUpDate || today} value={carDropOffDate} onChange={(e) => setCarDropOffDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                      </div>
                      <div className="w-[1px] bg-gray-100 my-1"></div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 leading-none">Time</label>
                        <span className="text-sm font-bold text-gray-900 block">{carDropOffTime}</span>
                        <input type="time" value={carDropOffTime} onChange={(e) => setCarDropOffTime(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                      </div>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="bg-black text-white px-10 py-5 font-bold text-xl rounded-[8px] hover:bg-gray-900 transition active:scale-95 lg:ml-1 min-w-[140px] shadow-lg flex items-center justify-center">
                  {loading ? '...' : 'Search'}
                </button>
              </div>

              <div className="flex items-center gap-10 mt-2 px-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setDifferentLocation(!differentLocation)} className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${differentLocation ? 'bg-[#33a8da] border-[#33a8da]' : 'bg-white border-gray-300'}`}>
                    {differentLocation && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Different drop-off location</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setDriverAged(!driverAged)} className={`w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${driverAged ? 'bg-[#33a8da] border-[#33a8da]' : 'bg-white border-gray-300'}`}>
                    {driverAged && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}><path d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Driver Aged 30 - 65?</span>
                </label>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SearchBox;
