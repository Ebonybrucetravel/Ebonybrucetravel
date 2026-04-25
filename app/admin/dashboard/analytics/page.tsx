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

  // Generate mock data with pounds (fallback only)
  const getMockAnalyticsData = () => {
    return {
      totalRevenue: 42587.54, // Using your real revenue as baseline
      revenueChange: '+10.2%',
      totalBookings: 99, // Using your real booking count
      bookingsChange: '+7.8%',
      activeUsers: 10850,
      usersChange: '+6.9%',
      conversionRate: 3.4,
      conversionChange: '+1.8%',
      bookingsByProductType: {
        FLIGHT_INTERNATIONAL: { count: 30, revenue: 63482.96 },
        HOTEL: { count: 47, revenue: 37779.92 },
        CAR_RENTAL: { count: 22, revenue: 12219.40 }
      },
      bookingCategories: [
        { type: 'Flight', percentage: 30, color: '#33a8da', value: 30, icon: '✈️' },
        { type: 'Hotels', percentage: 48, color: '#f59e0b', value: 47, icon: '🏨' },
        { type: 'Car Rentals', percentage: 22, color: '#10b981', value: 22, icon: '🚗' },
      ],
      topLocations: generateMockLocations(),
      revenueData: generateMonthlyData(),
    };
  };

  const generateMockLocations = () => {
    const locationIcon = (
      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );

    return [
      { 
        name: 'London, UK', 
        bookings: 45, 
        revenue: 45000, 
        growth: '+14%', 
        flag: locationIcon,
        color: 'from-blue-500 to-cyan-500'
      },
      { 
        name: 'Manchester, UK', 
        bookings: 30, 
        revenue: 32000, 
        growth: '+11%', 
        flag: locationIcon,
        color: 'from-purple-500 to-pink-500'
      },
      { 
        name: 'Edinburgh, UK', 
        bookings: 24, 
        revenue: 24500, 
        growth: '+22%', 
        flag: locationIcon,
        color: 'from-amber-500 to-orange-500'
      },
    ];
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
            console.log('✅ Using real API data:', apiData);
          } else {
            throw new Error(response.message || 'Failed to fetch analytics');
          }
        } catch (apiErr) {
          console.log('⚠️ API failed, using mock data:', apiErr);
          apiData = getMockAnalyticsData();
          setUsingMockData(true);
        }
        
        // Transform API data to match AnalyticsView props
        const transformedData = transformApiData(apiData);
        setData(transformedData);
        
      } catch (err) {
        console.error('❌ Error:', err);
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

  // Transform API data to match the format expected by AnalyticsView
  const transformApiData = (apiData: any) => {
    // Extract product type data
    const flightData = apiData.bookingsByProductType?.FLIGHT_INTERNATIONAL || { count: 0, revenue: 0 };
    const hotelData = apiData.bookingsByProductType?.HOTEL || { count: 0, revenue: 0 };
    const carData = apiData.bookingsByProductType?.CAR_RENTAL || { count: 0, revenue: 0 };
    
    const totalBookings = apiData.totalBookings || 0;
    const totalRevenue = apiData.totalRevenue || 0;
    
    // Calculate percentages
    const flightPercentage = totalBookings > 0 ? Math.round((flightData.count / totalBookings) * 100) : 0;
    const hotelPercentage = totalBookings > 0 ? Math.round((hotelData.count / totalBookings) * 100) : 0;
    const carPercentage = totalBookings > 0 ? Math.round((carData.count / totalBookings) * 100) : 0;
    
    // Get payment status breakdown
    const completedPayments = apiData.paymentStatusBreakdown?.COMPLETED || 0;
    const pendingPayments = apiData.paymentStatusBreakdown?.PENDING || 0;
    
    return {
      stats: [
        { 
          label: 'Total Revenue', 
          value: formatPrice(totalRevenue), 
          change: '+0%', // API doesn't provide change yet
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        { 
          label: 'Total Bookings', 
          value: totalBookings.toLocaleString(), 
          change: '+0%', // API doesn't provide change yet
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        { 
          label: 'Completed Payments', 
          value: completedPayments.toLocaleString(), 
          change: '+0%', 
          color: 'text-purple-600', 
          bgColor: 'bg-purple-50',
          icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        { 
          label: 'Pending Payments', 
          value: pendingPayments.toLocaleString(), 
          change: '+0%', 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
      ],
      bookingCategories: [
        { 
          type: 'Flights', 
          percentage: flightPercentage, 
          color: '#33a8da', 
          value: flightData.count, 
          revenue: flightData.revenue,
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        },
        { 
          type: 'Hotels', 
          percentage: hotelPercentage, 
          color: '#f59e0b', 
          value: hotelData.count, 
          revenue: hotelData.revenue,
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
        },
        { 
          type: 'Car Rentals', 
          percentage: carPercentage, 
          color: '#10b981', 
          value: carData.count, 
          revenue: carData.revenue,
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" /></svg>
        },
      ],
      topLocations: extractTopLocations(apiData.recentBookings || []),
      revenueData: generateMonthlyData(), // Still using mock until API provides this
      recentBookings: (apiData.recentBookings || []).slice(0, 5).map((booking: any) => ({
        id: booking.id,
        reference: booking.reference,
        customer: booking.user?.name || 'Unknown',
        productType: booking.productType,
        amount: formatPrice(booking.totalAmount || 0),
        status: booking.status,
        date: new Date(booking.createdAt).toLocaleDateString(),
      })),
    };
  };

  // Extract location data from recent bookings
  const extractTopLocations = (recentBookings: any[]) => {
    // This is a placeholder - you'd need actual location data from API
    // Using enhanced mock data based on real booking distribution
    const totalBookings = recentBookings.length || 99;
    
    return [
      { 
        name: 'London, UK', 
        bookings: Math.round(totalBookings * 0.45), 
        revenue: formatPrice(42500), 
        growth: '+14%', 
        flag: '🇬🇧',
        color: 'from-blue-500 to-cyan-500'
      },
      { 
        name: 'Manchester, UK', 
        bookings: Math.round(totalBookings * 0.30), 
        revenue: formatPrice(32000), 
        growth: '+11%', 
        flag: '🇬🇧',
        color: 'from-purple-500 to-pink-500'
      },
      { 
        name: 'Edinburgh, UK', 
        bookings: Math.round(totalBookings * 0.25), 
        revenue: formatPrice(24500), 
        growth: '+22%', 
        flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
        color: 'from-amber-500 to-orange-500'
      },
    ];
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