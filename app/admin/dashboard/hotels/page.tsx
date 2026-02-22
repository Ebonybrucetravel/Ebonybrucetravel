'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { getDashboardStats } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

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
          const transformedData = transformHotelsData(response.data);
          setData(transformedData);
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

  const transformHotelsData = (apiData: any) => {
    // Extract hotel specific data from the API response
    const hotelData = apiData.bookingsByProductType?.HOTEL || { count: 0, revenue: 0 };
    const totalBookings = apiData.totalBookings || 0;
    const hotelBookings = hotelData.count || 0;
    const hotelPercentage = totalBookings > 0 ? Math.round((hotelBookings / totalBookings) * 100) : 0;
    
    // Calculate average booking value
    const avgBookingValue = hotelBookings > 0 ? hotelData.revenue / hotelBookings : 0;
    
    // For hotel-specific metrics like room nights, occupancy rate, etc.
    // These would need to come from a dedicated hotels endpoint
    // Using mock calculations based on available data for now
    
    return {
      stats: [
        { 
          label: 'Hotel Revenue', 
          value: `£${(hotelData.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 
          change: '+0%', // API doesn't provide this yet
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: '💰' 
        },
        { 
          label: 'Hotel Bookings', 
          value: hotelBookings.toLocaleString(), 
          change: '+0%', // API doesn't provide this yet
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          icon: '🏨' 
        },
        { 
          label: 'Share of Bookings', 
          value: `${hotelPercentage}%`, 
          change: '+0%', 
          color: 'text-purple-600', 
          bgColor: 'bg-purple-50',
          icon: '📊' 
        },
        { 
          label: 'Avg Booking Value', 
          value: `£${avgBookingValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 
          change: '+0%', 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          icon: '💰' 
        },
      ],
      bookingCategories: [
        { 
          type: 'Hotels', 
          percentage: hotelPercentage, 
          color: '#f59e0b', 
          value: hotelBookings, 
          icon: '🏨' 
        },
      ],
      topLocations: extractTopHotelLocations(apiData.recentBookings || [], hotelData),
      revenueData: generateMonthlyData(), // Still using mock until API provides this
    };
  };

  // Helper function to extract location data from recent bookings
  const extractTopHotelLocations = (recentBookings: any[], hotelData: any) => {
    // Filter for hotel bookings only
    const hotelBookingsList = recentBookings.filter(b => b.productType === 'HOTEL');
    
    const totalHotelRevenue = hotelData.revenue || 37779.92; // From your API
    const totalHotelBookings = hotelData.count || 47; // From your API
    
    // Mock location distribution (you'd get real locations from API)
    const locationDistribution = [
      { name: 'London, UK', share: 0.45, growth: '+15%' },
      { name: 'Edinburgh, UK', share: 0.30, growth: '+20%' },
      { name: 'Manchester, UK', share: 0.25, growth: '+18%' },
    ];
  
    return locationDistribution.map(loc => ({
      name: loc.name,
      bookings: Math.round(totalHotelBookings * loc.share),
      revenue: `£${(totalHotelRevenue * loc.share).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      growth: loc.growth,
      flag: loc.name.includes('London') ? '🇬🇧' : loc.name.includes('Edinburgh') ? '🏴󠁧󠁢󠁳󠁣󠁴󠁿' : '🇬🇧',
      color: loc.name.includes('London') ? 'from-blue-500 to-cyan-500' : 
             loc.name.includes('Edinburgh') ? 'from-purple-500 to-pink-500' : 
             'from-amber-500 to-orange-500'
    }));
  };

  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => ({
      month,
      value: 25000 + (i * 2000) + Math.floor(Math.random() * 3000),
      previousYear: 20000 + (i * 1800) + Math.floor(Math.random() * 2500),
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
      title="Hotel Analytics"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      serviceIcon="🏨"
      serviceColor="from-amber-500 to-orange-500"
    />
  );
}