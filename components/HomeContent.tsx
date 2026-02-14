'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import Hero from '@/components/Hero';
import Partners from '@/components/Partners';
import ExclusiveOffers from '@/components/ExclusiveOffers';
import TrendingDestinations from '@/components/TrendingDestinations';
import HomesGrid from '@/components/HomesGrid';
import CarRentals from '@/components/CarRentals';
import SpecializedServices from '@/components/SpecializedServices';
import type { SearchParams } from '@/lib/types';
interface HomeContentProps {
    activeTab: 'flights' | 'hotels' | 'cars';
}
export default function HomeContent({ activeTab }: HomeContentProps) {
    const router = useRouter();
    const { search, isSearching } = useSearch();
    const handleSearch = async (params: SearchParams) => {
        await search(params);
        router.push('/search');
    };
    const handleTabChange = (tab: 'flights' | 'hotels' | 'cars') => {
        router.push(`/${tab}`);
    };
    return (<>
      <Hero onSearch={handleSearch} loading={isSearching} activeSearchTab={activeTab} onTabChange={handleTabChange}/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-32">
        <Partners />
        <ExclusiveOffers onTypeClick={handleTabChange}/>
        <TrendingDestinations onCityClick={(city) => handleSearch({
            type: 'flights',
            segments: [{ from: 'LOS', to: city.code || 'ABV', date: new Date().toISOString().split('T')[0] }],
            passengers: 1,
            cabinClass: 'economy',
        } as SearchParams)}/>
        <HomesGrid />
        <CarRentals />
        <SpecializedServices onServiceClick={(s) => router.push(`/content/${s}`)}/>
      </div>
    </>);
}
