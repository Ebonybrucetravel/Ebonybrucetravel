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
    return {
      stats: [
        { 
          label: 'Car Rental Revenue', 
          value: `£${apiData.carRevenue?.toLocaleString() || '0'}`, 
          change: apiData.carRevenueChange || '+0%', 
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: '💰' 
        },
        { 
          label: 'Rental Days', 
          value: apiData.rentalDays?.toLocaleString() || '0', 
          change: apiData.rentalDaysChange || '+0%', 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50',
          icon: '🚗' 
        },
        { 
          label: 'Fleet Utilization', 
          value: apiData.fleetUtilization ? `${apiData.fleetUtilization}%` : '0%', 
          change: apiData.utilizationChange || '+0%', 
          color: 'text-purple-600', 
          bgColor: 'bg-purple-50',
          icon: '📊' 
        },
        { 
          label: 'Avg Rental Duration', 
          value: apiData.averageRentalDuration ? `${apiData.averageRentalDuration} days` : '0 days', 
          change: apiData.durationChange || '+0%', 
          color: 'text-amber-600', 
          bgColor: 'bg-amber-50',
          icon: '⏱️' 
        },
      ],
      bookingCategories: [
        { type: 'Car Rentals', percentage: 100, color: '#10b981', value: apiData.carBookings || 0, icon: '🚗' },
      ],
      topLocations: apiData.topCarLocations || [
        { 
          name: 'London, UK', 
          bookings: 650, 
          revenue: '£245,000', 
          growth: '+15%', 
          flag: '🇬🇧',
          color: 'from-blue-500 to-cyan-500'
        },
        { 
          name: 'Manchester, UK', 
          bookings: 450, 
          revenue: '£180,000', 
          growth: '+12%', 
          flag: '🇬🇧',
          color: 'from-purple-500 to-pink-500'
        },
        { 
          name: 'Birmingham, UK', 
          bookings: 350, 
          revenue: '£145,000', 
          growth: '+10%', 
          flag: '🇬🇧',
          color: 'from-amber-500 to-orange-500'
        },
      ],
      revenueData: apiData.carRevenueData || generateMonthlyData(),
    };
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