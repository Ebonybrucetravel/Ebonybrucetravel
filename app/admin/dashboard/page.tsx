'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';
export default function AdminDashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin');
            return;
        }
        const fetchStats = async () => {
            try {
                const res = await fetch(`${config.apiBaseUrl}/api/v1/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.data ?? data);
                }
            }
            catch { }
            setLoading(false);
        };
        fetchStats();
    }, [router]);
    if (loading) {
        return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#33a8da]"/></div>;
    }
    return (<div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <button onClick={() => { localStorage.removeItem('adminToken'); router.push('/admin'); }} className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Total Bookings" value={stats?.totalBookings ?? 0}/>
        <StatCard title="Revenue" value={`£${(stats?.totalRevenue ?? 0).toLocaleString()}`}/>
        <StatCard title="Active Users" value={stats?.activeUsers ?? 0}/>
      </div>
    );
  }

      {!stats && (<div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-800 text-sm">
          Could not load dashboard stats. The admin API may not be available.
        </div>)}
    </div>);
}
function StatCard({ title, value }: {
    title: string;
    value: string | number;
}) {
    return (<div className="bg-white rounded-xl shadow p-6 border border-gray-100">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>);
}
