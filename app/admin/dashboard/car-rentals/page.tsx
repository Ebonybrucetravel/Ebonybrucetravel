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

export default function CarRentalsPage() {
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
          const transformed = await transformCarData(response.data);
          setData(transformed);
        } else {
          throw new Error(response.message || 'Failed to fetch car rentals data');
        }
      } catch (err) {
        console.error('Error fetching car rentals analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch car rentals data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dateRange, router]);

  const transformCarData = async (apiData: any) => {
    const targetCurrency = getDisplayCurrency() || apiData.targetCurrency || 'NGN';

    const carData = apiData.bookingsByProductType?.CAR_RENTAL || { count: 0, revenue: 0, currency: targetCurrency };
    const totalBookings = apiData.totalBookings || 0;
    const carBookings = carData.count || 0;
    const carPercentage = totalBookings > 0 ? Math.round((carBookings / totalBookings) * 100) : 0;

    const convertedRevenue = await convertCurrencyLive(
      carData.revenue || 0,
      carData.currency || targetCurrency,
      targetCurrency,
    );
    const avgRentalValue = carBookings > 0 ? convertedRevenue.convertedAmount / carBookings : 0;

    return {
      stats: [
        {
          label: 'Car Rental Revenue',
          value: formatCompactCurrency(convertedRevenue.convertedAmount, targetCurrency),
          change: '+0%',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          icon: '💰',
        },
        {
          label: 'Car Rentals',
          value: carBookings.toLocaleString(),
          change: '+0%',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" />
            </svg>
          ),
        },
        {
          label: 'Share of Bookings',
          value: `${carPercentage}%`,
          change: '+0%',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          icon: '📊',
        },
        {
          label: 'Avg Booking Value',
          value: formatCompactCurrency(avgRentalValue, targetCurrency),
          change: '+0%',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          icon: '💰',
        },
      ],
      bookingCategories: [
        {
          type: 'Car Rentals',
          percentage: carPercentage,
          color: '#10b981',
          value: carBookings,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" />
            </svg>
          ),
        },
      ],
      topLocations: await extractTopLocations(apiData.recentBookings || [], targetCurrency),
      revenueData: apiData.monthlyRevenue || [],
    };
  };

  const extractTopLocations = async (recentBookings: any[], targetCurrency: string) => {
    const filtered = recentBookings.filter((b) => b.productType === 'CAR_RENTAL');

    const locationMap = new Map<string, { name: string; bookings: number; revenue: number; currency: string }>();

    for (const b of filtered) {
      const bd = b.bookingData || {};
      const city = bd.pickupCity || bd.city || bd.location || bd.destinationCity || bd.destinationCode;
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
      title="Car Rental Analytics"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      serviceIcon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" /></svg>}
      serviceColor="from-emerald-500 to-teal-500"
    />
  );
}