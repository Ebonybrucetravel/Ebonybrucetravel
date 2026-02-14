'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import FlightDetails from '@/components/FlightDetails';
export default function FlightDetailsPage() {
    const router = useRouter();
    const { selectedItem, searchParams } = useSearch();
    if (!selectedItem) {
        return (<div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Flight Not Found</h1>
        <p className="text-gray-600 mb-8">Please select a flight from the search results.</p>
        <button onClick={() => router.push('/search')} className="px-6 py-3 bg-[#33a8da] text-white font-bold rounded-lg">Back to Search</button>
      </div>);
    }
    return (<FlightDetails item={selectedItem} searchParams={searchParams} onBack={() => router.push('/search')} onBook={() => router.push('/booking/review')}/>);
}
