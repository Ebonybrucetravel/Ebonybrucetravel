'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { getDashboardStats } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { convertCurrencyLive, preloadCommonCurrencies } from '@/lib/currency-service';

function getDisplayCurrency(): string {
  if (typeof window === 'undefined') return 'NGN';

  const candidates = [
    'selectedCurrency',
    'preferredCurrency',
    'currency',
    'currencyCode',
    'app_currency',
    'locale_currency',
  ];

  for (const key of candidates) {
    const v = localStorage.getItem(key);
    if (v) {
      const upper = v.toUpperCase();
      if (['NGN', 'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'KES'].includes(upper)) {
        return upper;
      }
    }
  }

  const rawLocale = localStorage.getItem('locale');
  if (rawLocale?.includes('/')) {
    const code = rawLocale.split('/')[1]?.toUpperCase();
    if (code && ['NGN', 'GBP', 'USD', 'EUR'].includes(code)) return code;
  }

  const geo = localStorage.getItem('geo_country') || localStorage.getItem('country');
  if (geo === 'NG') return 'NGN';
  if (geo === 'US') return 'USD';
  if (geo === 'GB') return 'GBP';

  return 'NGN';
}

const CURRENCY_SYMBOLS_MAP: Record<string, string> = {
  NGN: '₦', GBP: '£', USD: '$', EUR: '€',
  CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥', ZAR: 'R', KES: 'KSh',
};

const formatCompactCurrency = (amount: number, currency: string = 'NGN') => {
  const symbol = CURRENCY_SYMBOLS_MAP[currency] || currency + ' ';
  if (!amount) return `${symbol}0`;
  if (amount >= 1_000_000_000) return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
};

export default function HotelsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateRangeParams = () => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate = new Date();
    switch (dateRange) {
      case 'week': startDate.setDate(now.getDate() - 7); break;
      case 'month': startDate.setMonth(now.getMonth() - 1); break;
      case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
      case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
    }
    return { startDate: startDate.toISOString().split('T')[0], endDate };
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await preloadCommonCurrencies();

        const token = localStorage.getItem('adminToken');
        if (!token) { router.push('/admin'); return; }

        const dateParams = getDateRangeParams();
        const response = await getDashboardStats(dateParams);

        if (response.success && response.data) {
          const transformed = await transformHotelsData(response.data);
          setData(transformed);
        } else {
          throw new Error(response.message || 'Failed to fetch hotels data');
        }
      } catch (err) {
        console.error('Error fetching hotels analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch hotels data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange, router]);

  const transformHotelsData = async (apiData: any) => {
    const targetCurrency = getDisplayCurrency() || apiData.targetCurrency || 'NGN';

    const hotelData = apiData.bookingsByProductType?.HOTEL || { count: 0, revenue: 0, currency: targetCurrency };
    const totalBookings = apiData.totalBookings || 0;
    const hotelBookings = hotelData.count || 0;
    const hotelPercentage = totalBookings > 0 ? Math.round((hotelBookings / totalBookings) * 100) : 0;

    const convertedRevenue = await convertCurrencyLive(
      hotelData.revenue || 0,
      hotelData.currency || targetCurrency,
      targetCurrency,
    );
    const avgBookingValue = hotelBookings > 0 ? convertedRevenue.convertedAmount / hotelBookings : 0;

    return {
      stats: [
        {
          label: 'Hotel Revenue',
          value: formatCompactCurrency(convertedRevenue.convertedAmount, targetCurrency),
          change: '+0%',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          icon: '💰',
        },
        {
          label: 'Hotel Bookings',
          value: hotelBookings.toLocaleString(),
          change: '+0%',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
            </svg>
          ),
        },
        {
          label: 'Share of Bookings',
          value: `${hotelPercentage}%`,
          change: '+0%',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          icon: '📊',
        },
        {
          label: 'Avg Booking Value',
          value: formatCompactCurrency(avgBookingValue, targetCurrency),
          change: '+0%',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          icon: '💰',
        },
      ],
      bookingCategories: [
        {
          type: 'Hotels',
          percentage: hotelPercentage,
          color: '#f59e0b',
          value: hotelBookings,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
            </svg>
          ),
        },
      ],
      topLocations: await extractTopHotelLocations(apiData.recentBookings || [], targetCurrency),
      revenueData: apiData.monthlyRevenue || [],
    };
  };

  const extractTopHotelLocations = async (recentBookings: any[], targetCurrency: string) => {
    const filtered = recentBookings.filter((b) => b.productType === 'HOTEL');

    const locationMap = new Map<string, { name: string; bookings: number; revenue: number; currency: string }>();

    for (const b of filtered) {
      const bd = b.bookingData || {};
      const city = bd.city || bd.hotelCity || bd.location || bd.destinationCity || bd.destinationCode;
      if (!city) continue;

      const existing = locationMap.get(city) || {
        name: city,
        bookings: 0,
        revenue: 0,
        currency: b.currency || targetCurrency,
      };
      existing.bookings += 1;
      existing.revenue += Number(b.totalAmount || 0);
      locationMap.set(city, existing);
    }

    const locations = Array.from(locationMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 3);
    if (locations.length === 0) return [];

    return Promise.all(
      locations.map(async (loc, i) => {
        const converted = await convertCurrencyLive(loc.revenue, loc.currency, targetCurrency);
        return {
          name: loc.name,
          bookings: loc.bookings,
          revenue: formatCompactCurrency(converted.convertedAmount, targetCurrency),
          growth: '+0%',
          flag: '🌍',
          color:
            i === 0 ? 'from-blue-500 to-cyan-500' :
            i === 1 ? 'from-purple-500 to-pink-500' :
            'from-amber-500 to-orange-500',
        };
      }),
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600">
        <p className="font-semibold">Error</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <AnalyticsView
  data={data}
  title="Hotel Analytics"
  dateRange={dateRange}
  onDateRangeChange={setDateRange}
  serviceIcon={
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
    </svg>
  }
  serviceColor="from-amber-500 to-orange-500"
  currency={getDisplayCurrency()}
/>
  );
}