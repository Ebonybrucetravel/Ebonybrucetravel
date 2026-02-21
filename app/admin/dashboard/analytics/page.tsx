'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { getDashboardStats } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { formatPrice } from '@/lib/utils';

export default function AnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  // Calculate date range based on selection
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

  // Generate mock data with pounds
  const getMockAnalyticsData = () => {
    return {
      totalRevenue: 984500,
      revenueChange: '+10.2%',
      totalBookings: 32450,
      bookingsChange: '+7.8%',
      activeUsers: 10850,
      usersChange: '+6.9%',
      conversionRate: 3.4,
      conversionChange: '+1.8%',
      flightBookings: 14600,
      hotelBookings: 11200,
      carBookings: 6650,
      bookingCategories: [
        { type: 'Flight', percentage: 45, color: '#33a8da', value: 14600, icon: '✈️' },
        { type: 'Hotels', percentage: 35, color: '#f59e0b', value: 11200, icon: '🏨' },
        { type: 'Car Rentals', percentage: 20, color: '#10b981', value: 6650, icon: '🚗' },
      ],
      topLocations: [
        { 
          name: 'London, UK', 
          bookings: 1450, 
          revenue: 425000, 
          growth: '+14%', 
          flag: '🇬🇧',
          color: 'from-blue-500 to-cyan-500'
        },
        { 
          name: 'Manchester, UK', 
          bookings: 980, 
          revenue: 298000, 
          growth: '+11%', 
          flag: '🇬🇧',
          color: 'from-purple-500 to-pink-500'
        },
        { 
          name: 'Edinburgh, UK', 
          bookings: 720, 
          revenue: 215000, 
          growth: '+22%', 
          flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
          color: 'from-amber-500 to-orange-500'
        },
      ],
      revenueData: generateMonthlyData(),
    };
  };

  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => ({
      month,
      value: 35000 + (i * 2800) + Math.floor(Math.random() * 4500),
      previousYear: 29000 + (i * 2200) + Math.floor(Math.random() * 3800),
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        const dateParams = getDateRangeParams();
        
        // Try to fetch from API
        let apiData = null;
        try {
          const response = await getDashboardStats(dateParams);
          if (response.success && response.data) {
            apiData = response.data;
            setUsingMockData(false);
          } else {
            throw new Error(response.message || 'Failed to fetch analytics');
          }
        } catch (apiErr) {
          console.log('API failed, using mock data:', apiErr);
          apiData = getMockAnalyticsData();
          setUsingMockData(true);
        }
        
        // Transform API data to match AnalyticsView props
        const transformedData = transformApiData(apiData);
        setData(transformedData);
        
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
        // Fallback to mock data on error
        const mockData = getMockAnalyticsData();
        setData(transformApiData(mockData));
        setUsingMockData(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange, router]);

  // Transform API data to match the format expected by AnalyticsView (with £ currency)
  const transformApiData = (apiData: any) => {
    return {
      stats: [
        { 
          label: 'Total Revenue', 
          value: formatPrice(apiData.totalRevenue || 0), 
          change: apiData.revenueChange || '+0%', 
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: '💰' 
        },
        { 
          label: 'Total Bookings', 
          value: (apiData.totalBookings || 0).toLocaleString(), 
          change: apiData.bookingsChange || '+0%', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          icon: '📊' 
        },
        { 
          label: 'Active Users', 
          value: (apiData.activeUsers || 0).toLocaleString(), 
          change: apiData.usersChange || '+0%', 
          color: 'text-purple-600', 
          bgColor: 'bg-purple-50',
          icon: '👥' 
        },
        { 
          label: 'Conversion Rate', 
          value: apiData.conversionRate ? `${apiData.conversionRate}%` : '0%', 
          change: apiData.conversionChange || '+0%', 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          icon: '🎯' 
        },
      ],
      bookingCategories: apiData.bookingCategories || [
        { type: 'Flight', percentage: 45, color: '#33a8da', value: apiData.flightBookings || 0, icon: '✈️' },
        { type: 'Hotels', percentage: 35, color: '#f59e0b', value: apiData.hotelBookings || 0, icon: '🏨' },
        { type: 'Car Rentals', percentage: 20, color: '#10b981', value: apiData.carBookings || 0, icon: '🚗' },
      ],
      topLocations: apiData.topLocations?.map((loc: any) => ({
        ...loc,
        revenue: formatPrice(typeof loc.revenue === 'number' ? loc.revenue : parseFloat(loc.revenue.replace(/[^0-9.-]+/g, '')) || 0),
      })) || [
        { 
          name: 'London, UK', 
          bookings: 1200, 
          revenue: formatPrice(450000), 
          growth: '+15%', 
          flag: '🇬🇧',
          color: 'from-blue-500 to-cyan-500'
        },
        { 
          name: 'Manchester, UK', 
          bookings: 850, 
          revenue: formatPrice(320000), 
          growth: '+12%', 
          flag: '🇬🇧',
          color: 'from-purple-500 to-pink-500'
        },
        { 
          name: 'Edinburgh, UK', 
          bookings: 650, 
          revenue: formatPrice(245000), 
          growth: '+25%', 
          flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
          color: 'from-amber-500 to-orange-500'
        },
      ],
      revenueData: apiData.revenueData || generateMonthlyData(),
    };
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {usingMockData && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center gap-3 text-blue-700">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">
              Running in demo mode with sample data (values shown in £ GBP)
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-red-600">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <AnalyticsView 
        data={data}
        title="Global Analytics"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
    </div>
  );
}