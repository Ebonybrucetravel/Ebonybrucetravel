'use client';

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { listBookings } from '@/lib/adminApi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface AnalyticsViewProps {
  data: any;
  title: string;
  dateRange: string;
  onDateRangeChange: (range: any) => void;
  serviceIcon?: string;
  serviceColor?: string;
  serviceType?: string; 
}

export function AnalyticsView({ 
  data, 
  title, 
  dateRange, 
  onDateRangeChange, 
  serviceIcon, 
  serviceColor,
  serviceType 
}: AnalyticsViewProps) {
  const router = useRouter();
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  useEffect(() => {
    const fetchRecentBookings = async () => {
      setIsLoadingBookings(true);
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        // Pass serviceType as productType in the options object
        const options: any = {
          limit: 10, // Get only 10 most recent bookings
        };
        
        if (serviceType) {
          options.productType = serviceType;
        }

        const response = await listBookings(options);
        if (response.success && response.data) {
          // Sort by createdAt to get most recent first
          const sorted = response.data.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentBookings(sorted);
        }
      } catch (error) {
        console.error('Error fetching recent bookings:', error);
      } finally {
        setIsLoadingBookings(false);
      }
    };

    fetchRecentBookings();
  }, [serviceType]);

  const downloadCSV = () => {
    if (!data?.stats) return;
    
    const headers = ['Label', 'Value', 'Change'];
    const csvRows = [
      headers.join(','),
      ...data.stats.map((stat: any) => 
        [stat.label, stat.value, stat.change]
          .map(value => `"${value}"`).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Prepare chart data
  const lineChartData = {
    labels: data?.revenueData?.map((d: any) => d.month) || [],
    datasets: [
      {
        label: 'This Year',
        data: data?.revenueData?.map((d: any) => d.value) || [],
        borderColor: '#33a8da',
        backgroundColor: 'rgba(51, 168, 218, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#33a8da',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Last Year',
        data: data?.revenueData?.map((d: any) => d.previousYear) || [],
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
          boxHeight: 6,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'white',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatPrice(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#e2e8f0',
          drawBorder: false,
        },
        ticks: {
          callback: (value: any) => {
            if (value >= 1000000) {
              return `£${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `£${(value / 1000).toFixed(1)}k`;
            }
            return `£${value}`;
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutData = {
    labels: data?.bookingCategories?.map((c: any) => c.type) || [],
    datasets: [
      {
        data: data?.bookingCategories?.map((c: any) => c.percentage) || [],
        backgroundColor: data?.bookingCategories?.map((c: any) => c.color) || [],
        borderColor: 'white',
        borderWidth: 3,
        hoverOffset: 15,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value}% (${percentage}% of total)`;
          },
        },
      },
    },
    cutout: '70%',
  };

  const getServiceIcon = (type: string) => {
    switch(type) {
      case 'flight': return '✈️';
      case 'hotel': return '🏨';
      case 'car': return '🚗';
      default: return '📅';
    }
  };

  const getServiceColor = (type: string) => {
    switch(type) {
      case 'flight': return 'from-blue-500 to-cyan-500';
      case 'hotel': return 'from-amber-500 to-orange-500';
      case 'car': return 'from-emerald-500 to-teal-500';
      default: return 'from-purple-500 to-pink-500';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const handleViewAllBookings = () => {
    // Navigate to bookings page with optional filter
    if (serviceType) {
      router.push(`/admin/dashboard/bookings?type=${serviceType}`);
    } else {
      router.push('/admin/dashboard/bookings');
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          {serviceIcon && (
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${serviceColor} flex items-center justify-center text-3xl text-white shadow-lg`}>
              {serviceIcon}
            </div>
          )}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-gray-500 mt-2">Comprehensive overview of your business performance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as any)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button 
            onClick={downloadCSV}
            className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {data?.stats?.map((stat: any, index: number) => (
          <div
            key={index}
            className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
                <span className={`text-sm font-semibold ${stat.color} bg-opacity-10 ${stat.bgColor} px-3 py-1 rounded-full`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
              <p className="text-sm text-gray-500">Monthly revenue comparison</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#33a8da]" />
                <span className="text-xs text-gray-600">2026</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-600">2025</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Booking Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Distribution</h3>
          <p className="text-sm text-gray-500 mb-6">Breakdown by service type</p>
          <div className="h-64">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Grid - Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Locations</h3>
          <div className="space-y-4">
            {data?.topLocations?.map((location: any, index: number) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${location.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className="relative p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl">
                        {location.flag}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{location.name}</h4>
                        <p className="text-sm text-gray-500">{location.bookings?.toLocaleString()} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{location.revenue}</p>
                      <p className="text-sm text-emerald-600 font-medium">{location.growth}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity - Now with real booking data */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600">Live</span>
            </span>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {isLoadingBookings ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-[#33a8da] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentBookings.length > 0 ? (
              recentBookings.map((booking: any, index: number) => (
                <div 
                  key={booking.id || index} 
                  className="relative group cursor-pointer hover:bg-gray-50 transition-colors rounded-xl"
                  onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-start gap-3 p-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getServiceColor(booking.productType || booking.serviceType)} bg-opacity-10 flex items-center justify-center text-lg`}>
                      {getServiceIcon(booking.productType || booking.serviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {booking.customerName || booking.user?.name || 'Guest'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {booking.productType === 'flight' && `Flight to ${booking.destination || booking.flight?.destination || 'Unknown'}`}
                        {booking.productType === 'hotel' && `Hotel in ${booking.destination || booking.hotel?.location || 'Unknown'}`}
                        {booking.productType === 'car' && `Car rental in ${booking.destination || booking.car?.location || 'Unknown'}`}
                        {!booking.productType && !booking.serviceType && 'New booking created'}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs font-medium text-[#33a8da]">
                          {booking.totalAmount ? `£${Number(booking.totalAmount).toLocaleString()}` : ''}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatTimeAgo(booking.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                No recent bookings found
              </div>
            )}
          </div>

          <button 
            onClick={handleViewAllBookings}
            className="w-full mt-4 py-3 text-sm font-medium text-[#33a8da] hover:text-[#2c8fc0] border-t border-gray-100 hover:bg-gray-50 transition rounded-b-2xl"
          >
            View All Bookings
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}