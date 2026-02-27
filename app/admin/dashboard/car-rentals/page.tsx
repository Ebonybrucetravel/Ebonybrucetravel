'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { getDashboardStats } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

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
          const transformedData = transformCarData(response.data);
          setData(transformedData);
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

  const transformCarData = (apiData: any) => {
    // Extract car rental specific data from the API response
    const carRentalData = apiData.bookingsByProductType?.CAR_RENTAL || { count: 0, revenue: 0 };
    const totalBookings = apiData.totalBookings || 0;
    const carBookings = carRentalData.count || 0;
    const carPercentage = totalBookings > 0 ? Math.round((carBookings / totalBookings) * 100) : 0;
  
    // Calculate derived metrics
    const avgRentalValue = carBookings > 0 ? carRentalData.revenue / carBookings : 0;
    
    return {
      stats: [
        { 
          label: 'Car Rental Revenue', 
          value: `£${(carRentalData.revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 
          change: '+0%', // API doesn't provide this yet
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: '💰' 
        },
        { 
          label: 'Car Rentals', 
          value: carBookings.toLocaleString(), 
          change: '+0%', // API doesn't provide this yet
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          icon: '🚗' 
        },
        { 
          label: 'Share of Bookings', 
          value: `${carPercentage}%`, 
          change: '+0%', 
          color: 'text-purple-600', 
          bgColor: 'bg-purple-50',
          icon: '📊' 
        },
        { 
          label: 'Avg Booking Value', 
          value: `£${avgRentalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 
          change: '+0%', 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          icon: '💰' 
        },
      ],
      bookingCategories: [
        { 
          type: 'Car Rentals', 
          percentage: carPercentage, 
          color: '#10b981', 
          value: carBookings, 
          icon: '🚗' 
        },
      ],
      // Pass carRentalData to the location extractor
      topLocations: extractTopLocations(apiData.recentBookings || [], carRentalData),
      revenueData: generateMonthlyData(), // Still using mock until API provides this
    };
  };
  
  // Helper function to extract location data from recent bookings
  const extractTopLocations = (recentBookings: any[], carRentalData: any) => {
    // Filter for car rentals only
    const carBookings = recentBookings.filter(b => b.productType === 'CAR_RENTAL');
    
    // In a real implementation, you'd extract locations from booking data
    // For now, using enhanced mock data based on actual car rental count
    const totalCarRevenue = carRentalData.revenue || 12219.4;
    const totalCarBookings = carRentalData.count || 22;
    
    // Distribute bookings across locations (mock distribution)
    const locationDistribution = [
      { name: 'London, UK', share: 0.45, growth: '+12%' },
      { name: 'Manchester, UK', share: 0.30, growth: '+8%' },
      { name: 'Birmingham, UK', share: 0.25, growth: '+15%' },
    ];
  
    return locationDistribution.map(loc => ({
      name: loc.name,
      bookings: Math.round(totalCarBookings * loc.share),
      revenue: `£${(totalCarRevenue * loc.share).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      growth: loc.growth,
      flag: loc.name.includes('London') ? '🇬🇧' : loc.name.includes('Manchester') ? '🇬🇧' : '🇬🇧',
      color: loc.name.includes('London') ? 'from-blue-500 to-cyan-500' : 
             loc.name.includes('Manchester') ? 'from-purple-500 to-pink-500' : 
             'from-amber-500 to-orange-500'
    }));
  };

  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, i) => ({
      month,
      value: 15000 + (i * 1500) + Math.floor(Math.random() * 2000),
      previousYear: 12000 + (i * 1200) + Math.floor(Math.random() * 1800),
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
      title="Car Rental Analytics"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      serviceIcon="🚗"
      serviceColor="from-emerald-500 to-teal-500"
    />
  );
}