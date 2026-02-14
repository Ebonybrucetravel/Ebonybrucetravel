'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import SearchResults from '@/components/SearchResults';
export default function SearchPage() {
    const router = useRouter();
    const { searchResults, searchParams, isSearching, searchError, selectItem, clearSearch } = useSearch();
    const handleSelect = (item: any) => {
        selectItem(item);
        const routeMap: Record<string, string> = {
            hotels: '/hotels/' + item.id,
            'car-rentals': '/cars/' + item.id,
            flights: '/flights/' + item.id,
        };
        router.push(routeMap[item.type ?? 'flights'] ?? '/flights/' + item.id);
    };
    const handleClear = () => {
        clearSearch();
        router.push('/');
    };
    if (searchResults.length === 0 && !isSearching) {
        return (<div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {searchParams ? 'No results' : 'No Search Results'}
        </h1>
        <p className="text-gray-600 mb-8">
          {searchError || (searchParams ? 'No options found for your search. Try different dates or locations.' : 'Please start a search from the home page.')}
        </p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] transition">
          Go Home
        </button>
      </div>);
    }
    return (<SearchResults results={searchResults} searchParams={searchParams} searchError={searchError} onClear={handleClear} onSelect={handleSelect} isLoading={isSearching}/>);
}
