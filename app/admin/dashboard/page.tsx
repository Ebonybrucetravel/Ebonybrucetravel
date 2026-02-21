'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the analytics dashboard
    router.replace('/admin/dashboard/analytics');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fbfe] to-[#e6f0f9]">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#33a8da]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#2c8fc0]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Loading Container */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20 flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="w-24 h-24 bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] rounded-2xl shadow-lg flex items-center justify-center animate-bounce">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>

        {/* Loading Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#33a8da] rounded-full border-t-transparent animate-spin"></div>
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
          <p className="text-sm text-gray-500">Redirecting to analytics...</p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
}