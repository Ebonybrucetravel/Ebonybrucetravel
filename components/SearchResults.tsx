"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { HotelListImage } from "./HotelListImage";
interface SearchResult {
    id: string;
    provider: string;
    title: string;
    subtitle: string;
    price: string;
    totalPrice?: string;
    time?: string;
    duration?: string;
    stops?: string;
    rating?: number;
    image?: string;
    primaryImageUrl?: string | null;
    amenities?: string[];
    features?: string[];
    type?: "flights" | "hotels" | "car-rentals";
    isRefundable?: boolean;
    realData?: any;
}
interface SearchResultsProps {
    results: SearchResult[];
    searchParams: any;
    searchError?: string | null;
    onClear: () => void;
    onSelect?: (item: SearchResult) => void;
    isLoading?: boolean;
}
const SearchResults: React.FC<SearchResultsProps> = ({ results: initialResults, searchParams, searchError, onClear, onSelect, isLoading = false, }) => {
    const { currency } = useLanguage();
    const searchType = (searchParams?.type || "flights").toLowerCase() as "flights" | "hotels" | "car-rentals";
    const [priceRange, setPriceRange] = useState<number>(2000000);
    const [sortBy, setSortBy] = useState<"match" | "price" | "rating">("match");
    const [visibleCount, setVisibleCount] = useState(6);
    const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
    const [stopsFilter, setStopsFilter] = useState<string[]>([]);
    const [airlinesFilter, setAirlinesFilter] = useState<string[]>([]);
    const [starRatings, setStarRatings] = useState<number[]>([]);
    const [amenitiesFilter, setAmenitiesFilter] = useState<string[]>([]);
    const [carTypeFilter, setCarTypeFilter] = useState<string[]>([]);
    const [transmissionFilter, setTransmissionFilter] = useState<string[]>([]);
    const uniqueAirlines = useMemo(() => Array.from(new Set(initialResults.filter(r => r.type === 'flights').map(r => r.provider))), [initialResults]);
    const uniqueCarTypes = useMemo(() => Array.from(new Set(initialResults.filter(r => r.type === 'car-rentals').flatMap(r => r.features || []).filter(f => !f.includes('Seats')))), [initialResults]);
    const filteredResults = useMemo(() => {
        let filtered = [...initialResults];
        filtered = filtered.filter((item) => {
            const numericPrice = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
            return numericPrice <= priceRange;
        });
        if (searchType === "flights") {
            if (stopsFilter.length > 0) {
                filtered = filtered.filter(item => stopsFilter.includes(item.stops || "Direct"));
            }
            if (airlinesFilter.length > 0) {
                filtered = filtered.filter(item => airlinesFilter.includes(item.provider));
            }
        }
        else if (searchType === "hotels") {
            if (starRatings.length > 0) {
                filtered = filtered.filter(item => starRatings.includes(Math.floor(item.rating || 0)));
            }
            if (amenitiesFilter.length > 0) {
                filtered = filtered.filter(item => amenitiesFilter.every(a => item.amenities?.includes(a)));
            }
        }
        else if (searchType === "car-rentals") {
            if (carTypeFilter.length > 0) {
                filtered = filtered.filter(item => item.features?.some(f => carTypeFilter.includes(f)));
            }
            if (transmissionFilter.length > 0) {
                filtered = filtered.filter(item => item.amenities?.some(a => transmissionFilter.includes(a)));
            }
        }
        if (sortBy === "price") {
            filtered.sort((a, b) => {
                const pA = parseFloat(a.price.replace(/[^\d.]/g, '')) || 0;
                const pB = parseFloat(b.price.replace(/[^\d.]/g, '')) || 0;
                return pA - pB;
            });
        }
        else if (sortBy === "rating") {
            filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        return filtered;
    }, [initialResults, searchType, priceRange, sortBy, stopsFilter, airlinesFilter, starRatings, amenitiesFilter, carTypeFilter, transmissionFilter]);
    const toggleFilter = (set: React.Dispatch<React.SetStateAction<any[]>>, current: any[], value: any) => {
        set(current.includes(value) ? current.filter(i => i !== value) : [...current, value]);
    };
    const clearAllFilters = () => {
        setPriceRange(2000000);
        setStopsFilter([]);
        setAirlinesFilter([]);
        setStarRatings([]);
        setAmenitiesFilter([]);
        setCarTypeFilter([]);
        setTransmissionFilter([]);
    };
    const renderFilterSection = (title: string, content: React.ReactNode) => (<div className="py-6 border-b border-gray-100 last:border-0">
      <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.15em] mb-4">{title}</h4>
      <div className="space-y-3">{content}</div>
    </div>);
    const renderCheckbox = (label: string, isChecked: boolean, onChange: () => void) => (<label key={label} className="flex items-center gap-3 cursor-pointer group">
      <div onClick={onChange} className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${isChecked ? 'bg-[#33a8da] border-[#33a8da]' : 'border-gray-200 group-hover:border-[#33a8da]'}`}>
        {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M5 13l4 4L19 7"/></svg>}
      </div>
      <span className={`text-xs font-bold ${isChecked ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700'}`}>{label}</span>
    </label>);
    const renderHotelCard = (item: SearchResult) => {
        const starRating = Math.floor(item.rating || 4);
        const isHotelFromSearch = item.type === 'hotels' && item.id;
        return (<div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-[320px] h-64 md:h-auto overflow-hidden relative flex-shrink-0">
            {item.primaryImageUrl ? (<img src={item.primaryImageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={item.title}/>) : isHotelFromSearch ? (<HotelListImage hotelId={item.id} hotelName={item.title} fallbackSrc={item.image || undefined} alt={item.title} className="w-full h-full"/>) : (<img src={item.image || `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600`} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" alt={item.title}/>)}
            <button onClick={(e) => { e.stopPropagation(); setSavedItems(p => { const n = new Set(p); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; }); }} className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition backdrop-blur-md ${savedItems.has(item.id) ? "bg-red-500 text-white" : "bg-white/40 text-gray-400 hover:bg-white"}`}>
              <svg className="w-5 h-5" fill={savedItems.has(item.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeWidth={2}/></svg>
            </button>
          </div>
          <div className="flex-1 p-8">
            <h3 className="text-xl font-black text-gray-900 group-hover:text-[#33a8da] transition">{item.title}</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">{item.subtitle}</p>
            <div className="flex items-center gap-4 mt-4 mb-6">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => <svg key={i} className={`w-3.5 h-3.5 ${i < starRating ? "fill-current" : "text-gray-200"}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
              </div>
            </div>
            <div className="flex items-end justify-between pt-6 border-t border-gray-50">
              <div>
                <p className="text-2xl font-black text-[#33a8da]">{item.price}</p>
              </div>
              <button 
                onClick={() => onSelect?.(item)} 
                className="bg-[#33a8da] text-white font-black px-8 py-3 rounded-xl transition hover:bg-[#2c98c7] uppercase text-[11px]"
              >
                Book Hotel
              </button>
            </div>
          </div>
        </div>
      </div>);
    };
    const renderFlightCard = (item: SearchResult) => (<div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col md:flex-row p-8 gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-6">
            <img src={item.image || `https://ui-avatars.com/api/?name=${item.provider}`} className="w-10 h-10 object-contain rounded" alt=""/>
            <div><h4 className="text-sm font-black text-gray-900">{item.provider}</h4><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.subtitle}</p></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center"><p className="text-2xl font-black text-gray-900">{item.realData?.departureTime?.split('T')[1]?.substring(0, 5) || "08:00"}</p><p className="text-[10px] font-black text-gray-400 uppercase">Depart</p></div>
            <div className="flex-1 px-8"><div className="w-full h-[1.5px] bg-gray-100 relative"><div className="absolute left-1/2 -translate-x-1/2 -top-[6px] text-[#33a8da]"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg></div></div></div>
            <div className="text-center"><p className="text-2xl font-black text-gray-900">{item.realData?.arrivalTime?.split('T')[1]?.substring(0, 5) || "10:15"}</p><p className="text-[10px] font-black text-gray-400 uppercase">Arrive</p></div>
          </div>
        </div>
      </div>
    </div>);
    const renderCarCard = (item: SearchResult) => (<div key={item.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition overflow-hidden group animate-in fade-in slide-in-from-bottom-2">
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:w-[320px] h-56 bg-gray-50 flex items-center justify-center p-8">
          <img src={item.image} className="max-w-full max-h-full object-contain group-hover:scale-105 transition" alt={item.title}/>
        </div>
        <div className="flex-1 p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 group-hover:text-[#33a8da] transition">{item.title}</h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase mt-1">{item.provider} • {item.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mb-8">
            {item.amenities?.map((a, i) => (<div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 bg-[#33a8da] rounded-full"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">{a}</span>
              </div>))}
          </div>
          <div className="flex items-end justify-between pt-6 border-t border-gray-50">
            <div><p className="text-2xl font-black text-[#33a8da]">{item.price}</p><p className="text-[9px] font-bold text-gray-400">Total for duration</p></div>
            <button onClick={() => onSelect?.(item)} className="bg-[#33a8da] text-white font-black px-8 py-3 rounded-xl transition hover:bg-[#2c98c7] uppercase text-[11px]">Rent Now</button>
          </div>
        </div>
      </div>
    </div>);
    if (isLoading) {
        return (<div className="bg-[#f8fbfe] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#33a8da] mb-6"></div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-2">
              {isLoadingOffers ? 'Loading flight offers...' : 'Searching...'}
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              {isLoadingOffers ? 'Fetching the best flight options for you' : 'Finding the best options for you'}
            </p>
          </div>
        </div>
      </div>);
    }
    return (<div className="bg-[#f8fbfe] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-[300px] shrink-0 space-y-6">
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Filters</h4>
              <button 
                onClick={clearAllFilters} 
                className="text-[9px] font-black text-[#33a8da] uppercase tracking-widest hover:underline"
              >
                Clear all
              </button>
            </div>

            
            {renderFilterSection("Price Range", (<>
                <input type="range" min="0" max="2000000" step="50000" value={priceRange} onChange={(e) => setPriceRange(parseInt(e.target.value))} className="w-full h-1 bg-gray-100 rounded-full appearance-none accent-[#33a8da] cursor-pointer"/>
                <div className="flex justify-between mt-4">
                  <span className="text-[10px] font-bold text-gray-400">{currency.symbol}0</span>
                  <span className="text-[10px] font-black text-[#33a8da] uppercase">{currency.symbol}{priceRange.toLocaleString()}</span>
                </div>
              </>))}

            
            {searchType === "flights" && (<>
                {renderFilterSection("Stops", (<>
                    {["Direct", "1 Stop", "2+ Stops"].map(stop => renderCheckbox(stop, stopsFilter.includes(stop), () => toggleFilter(setStopsFilter, stopsFilter, stop)))}
                  </>))}
                {renderFilterSection("Airlines", (<>
                    {uniqueAirlines.map(airline => renderCheckbox(airline, airlinesFilter.includes(airline), () => toggleFilter(setAirlinesFilter, airlinesFilter, airline)))}
                  </>))}
              </>)}

            
            {searchType === "hotels" && (<>
                {renderFilterSection("Star Rating", (<>
                    {[5, 4, 3].map(stars => renderCheckbox(`${stars} Stars`, starRatings.includes(stars), () => toggleFilter(setStarRatings, starRatings, stars)))}
                  </>))}
                {renderFilterSection("Amenities", (<>
                    {["Free Wi-Fi", "Swimming Pool", "Spa", "Fitness center"].map(amenity => renderCheckbox(amenity, amenitiesFilter.includes(amenity), () => toggleFilter(setAmenitiesFilter, amenitiesFilter, amenity)))}
                  </>))}
              </>)}

            
            {searchType === "car-rentals" && (<>
                {renderFilterSection("Vehicle Type", (<>
                    {uniqueCarTypes.map(type => renderCheckbox(type, carTypeFilter.includes(type), () => toggleFilter(setCarTypeFilter, carTypeFilter, type)))}
                  </>))}
                {renderFilterSection("Transmission", (<>
                    {["Automatic", "Manual"].map(trans => renderCheckbox(trans, transmissionFilter.includes(trans), () => toggleFilter(setTransmissionFilter, transmissionFilter, trans)))}
                  </>))}
              </>)}
          </div>
        </aside>

        {/* Results Section */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
              {filteredResults.length} {filteredResults.length === 1 ? 'option' : 'options'} found
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)} 
                className="bg-transparent border-none text-[10px] font-black uppercase text-[#33a8da] focus:ring-0 cursor-pointer"
              >
                <option value="match">Best Match</option>
                <option value="price">Lowest Price</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredResults.length > 0 ? filteredResults.slice(0, visibleCount).map(item => {
            if (item.type?.includes('car'))
                return renderCarCard(item);
            if (item.type === 'hotels')
                return renderHotelCard(item);
            return renderFlightCard(item);
        }) : (<div className="bg-white rounded-[32px] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                   <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase">No matching results</h3>
                <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">Try adjusting your filters to find more options.</p>
              </div>)}
          </div>
          {filteredResults.length > visibleCount && (<div className="pt-10 flex justify-center"><button onClick={() => setVisibleCount(p => p + 6)} className="px-16 py-4 bg-[#33a8da] text-white font-black rounded-2xl shadow-xl hover:bg-[#2c98c7] transition uppercase text-xs">Show More</button></div>)}
        </div>
      </div>
    </div>);
};
export default SearchResults;
