'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { getDashboardStats } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { convertCurrencyLive, CURRENCY_SYMBOLS, preloadCommonCurrencies } from '@/lib/currency-service';


const formatCompactCurrency = (amount: number, currency: string = 'NGN') => {
  if (!amount) return `₦0`;
  

  let symbol = currency;
  if (currency === 'NGN') symbol = '₦';
  else if (currency === 'GBP') symbol = '£';
  else if (currency === 'USD') symbol = '$';
  else if (currency === 'EUR') symbol = '€';

  if (amount >= 1_000_000_000) return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
};

export default function AnalyticsPage() {
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
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
      
        console.log('🌍 Preloading currency exchange rates...');
        await preloadCommonCurrencies();

        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

    
        const dateParams = getDateRangeParams();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        console.log(`📡 Fetching REAL Analytics from API for: ${dateParams.startDate} to ${dateParams.endDate}`);
        
        const response = await fetch(`${baseUrl}/api/v1/dashboard/stats?startDate=${dateParams.startDate}&endDate=${dateParams.endDate}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        const apiData = await response.json();
        
        if (apiData.success && apiData.data) {
          console.log('✅ REAL DATA RECEIVED:', apiData.data);
          const transformedData = await transformApiData(apiData.data);
          setData(transformedData);
        } else {
          throw new Error(apiData.message || 'API returned unsuccessful response');
        }
        
      } catch (err: any) {
        console.error('❌ REAL API FAILED:', err);
        setError(err.message || 'Failed to load real analytics data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dateRange, router]);


  const transformApiData = async (apiData: any) => {

    const targetCurrency = apiData.targetCurrency || 'NGN'; 

    const flightData = apiData.bookingsByProductType?.FLIGHT_INTERNATIONAL || { count: 0, revenue: 0, currency: 'GBP' };
    const hotelData = apiData.bookingsByProductType?.HOTEL || { count: 0, revenue: 0, currency: 'GBP' };
    const carData = apiData.bookingsByProductType?.CAR_RENTAL || { count: 0, revenue: 0, currency: 'GBP' };
    
    const totalBookings = apiData.totalBookings || 0;
    const totalRevenue = apiData.totalRevenue || 0;
    const globalCurrency = apiData.currency || 'NGN';
    
    const flightPercentage = totalBookings > 0 ? Math.round((flightData.count / totalBookings) * 100) : 0;
    const hotelPercentage = totalBookings > 0 ? Math.round((hotelData.count / totalBookings) * 100) : 0;
    const carPercentage = totalBookings > 0 ? Math.round((carData.count / totalBookings) * 100) : 0;
    
    const completedPayments = apiData.paymentStatusBreakdown?.COMPLETED || 0;
    const pendingPayments = apiData.paymentStatusBreakdown?.PENDING || 0;

    const convertedTotalRevenue = await convertCurrencyLive(totalRevenue, globalCurrency, targetCurrency);
    const convertedFlightRevenue = await convertCurrencyLive(flightData.revenue, flightData.currency || 'GBP', targetCurrency);
    const convertedHotelRevenue = await convertCurrencyLive(hotelData.revenue, hotelData.currency || 'GBP', targetCurrency);
    const convertedCarRevenue = await convertCurrencyLive(carData.revenue, carData.currency || 'GBP', targetCurrency);


    const recentBookingsData = await Promise.all(
      (apiData.recentBookings || []).slice(0, 5).map(async (booking: any) => {
        const converted = await convertCurrencyLive(booking.totalAmount || 0, booking.currency || 'GBP', targetCurrency);
        return {
          id: booking.id,
          reference: booking.reference,
          customer: booking.user?.name || booking.customerName || 'Unknown',
          productType: booking.productType,
      
          amount: formatCompactCurrency(converted.convertedAmount, targetCurrency),
          status: booking.status,
          date: new Date(booking.createdAt).toLocaleDateString(),
        };
      })
    );


    const rawLocations = apiData.topLocations || [];
    
    const topLocationsData = await Promise.all(
      rawLocations.slice(0, 3).map(async (location: any) => {
        const convertedRevenue = await convertCurrencyLive(location.revenue || 0, location.currency || 'GBP', targetCurrency);
        return {
          name: location.name || location.city || 'Unknown',
          bookings: location.bookings || location.count || 0,
          revenue: formatCompactCurrency(convertedRevenue.convertedAmount, targetCurrency),
          growth: location.growth || '+0%',
          flag: location.flag || '📍',
          color: location.color || 'from-blue-500 to-cyan-500'
        };
      })
    );
    
    return {
      stats: [
        { 
          label: 'Total Revenue', 
          value: formatCompactCurrency(convertedTotalRevenue.convertedAmount, targetCurrency), 
          change: '+0%', 
          color: 'text-emerald-600', 
          bgColor: 'bg-emerald-50',
          icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        { 
          label: 'Total Bookings', 
          value: totalBookings.toLocaleString(), 
          change: '+0%', 
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
          revenue: formatCompactCurrency(convertedFlightRevenue.convertedAmount, targetCurrency), 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        },
        { 
          type: 'Hotels', 
          percentage: hotelPercentage, 
          color: '#f59e0b', 
          value: hotelData.count, 
          revenue: formatCompactCurrency(convertedHotelRevenue.convertedAmount, targetCurrency), 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
        },
        { 
          type: 'Car Rentals', 
          percentage: carPercentage, 
          color: '#10b981', 
          value: carData.count, 
          revenue: formatCompactCurrency(convertedCarRevenue.convertedAmount, targetCurrency), 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" /></svg>
        },
      ],
      topLocations: topLocationsData,
      revenueData: apiData.monthlyRevenue || [],
      recentBookings: recentBookingsData,
    };
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-red-600">
              <p className="font-semibold">Real API Error</p>
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