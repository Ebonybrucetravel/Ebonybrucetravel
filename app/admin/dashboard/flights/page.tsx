'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { getDashboardStats } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

export default function FlightsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateRangeParams = () => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate = new Date();

    switch(dateRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        const dateParams = getDateRangeParams();
        const response = await getDashboardStats(dateParams);
        
        if (response.success && response.data) {
          // Filter for flights only
          const transformedData = transformFlightsData(response.data);
          setData(transformedData);
        } else {
          throw new Error(response.message || 'Failed to fetch flights data');
        }
      } catch (err) {
        console.error('Error fetching flights analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch flights data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange, router]);

  const transformFlightsData = (apiData: any) => {
    return {
      stats: [
        { 
          label: 'Flight Revenue', 
          value: `£${apiData.flightRevenue?.toLocaleString() || '0'}`, 
          change: apiData.flightRevenueChange || '+0%', 
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: '💰' 
        },
        { 
          label: 'Flight Bookings', 
          value: apiData.flightBookings?.toLocaleString() || '0', 
          change: apiData.flightBookingsChange || '+0%', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          icon: '📊' 
        },
        { 
          label: 'Airlines', 
          value: apiData.activeAirlines?.toLocaleString() || '0', 
          change: apiData.airlinesChange || '+0%', 
          color: 'text-purple-600', 
          bgColor: 'bg-purple-50',
          icon: '✈️' 
        },
        { 
          label: 'Load Factor', 
          value: apiData.loadFactor ? `${apiData.loadFactor}%` : '0%', 
          change: apiData.loadFactorChange || '+0%', 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          icon: '📈' 
        },
      ],
      bookingCategories: [
        { type: 'Flight', percentage: 100, color: '#33a8da', value: apiData.flightBookings || 0, icon: '✈️' },
      ],
      topLocations: apiData.topFlightRoutes || [
        { 
          name: 'London, UK', 
          bookings: 1200, 
          revenue: '£450,000', 
          growth: '+15%', 
          flag: '🇬🇧',
          color: 'from-blue-500 to-cyan-500'
        },
        { 
          name: 'Manchester, UK', 
          bookings: 850, 
          revenue: '£320,000', 
          growth: '+12%', 
          flag: '🇬🇧',
          color: 'from-purple-500 to-pink-500'
        },
        { 
          name: 'Edinburgh, UK', 
          bookings: 650, 
          revenue: '£245,000', 
          growth: '+25%', 
          flag: '🇬🇧',
          color: 'from-amber-500 to-orange-500'
        },
      ],
      revenueData: apiData.flightRevenueData || generateMonthlyData(),
    };
  };

  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => ({
      month,
      value: 35000 + (i * 2500) + Math.floor(Math.random() * 4000),
      previousYear: 30000 + (i * 2000) + Math.floor(Math.random() * 3500),
    }));
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600">
        <p className="font-semibold">Error</p>
        <p className="text-sm mt-1">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <AnalyticsView 
      data={data}
      title="Flight Analytics"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      serviceIcon="✈️"
      serviceColor="from-blue-500 to-cyan-500"
    />
  );
}