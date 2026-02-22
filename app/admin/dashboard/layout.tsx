'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: 'Miracle Chiamaka',
    profileImage: 'https://ui-avatars.com/api/?name=Miracle+Chiamaka&background=33a8da&color=fff'
  });

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/admin');
  };

  // Don't show sidebar on login page (though this layout shouldn't be used there)
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  const navigationItems = [
    {
      category: 'Services',
      items: [
        { href: '/admin/dashboard/flights', label: 'Flights', icon: '✈️', gradient: 'from-blue-500 to-cyan-500' },
        { href: '/admin/dashboard/hotels', label: 'Hotels', icon: '🏨', gradient: 'from-amber-500 to-orange-500' },
        { href: '/admin/dashboard/car-rentals', label: 'Car Rentals', icon: '🚗', gradient: 'from-emerald-500 to-teal-500' },
      ]
    },
    {
      category: 'Main',
      items: [
        { href: '/admin/dashboard/analytics', label: 'Analytics', icon: '📊', gradient: 'from-purple-500 to-pink-500' },
        { href: '/admin/dashboard/bookings', label: 'Bookings', icon: '📅', gradient: 'from-blue-500 to-cyan-500' },
        // Customers (platform users)
        { href: '/admin/dashboard/users', label: 'Customers', icon: '👥', gradient: 'from-green-500 to-emerald-500' },
        // Admin Users (system administrators)
        { href: '/admin/dashboard/admin-users', label: 'Admin Users', icon: '👑', gradient: 'from-purple-500 to-pink-500' },
        { href: '/admin/dashboard/rewards', label: 'Rewards', icon: '⭐', gradient: 'from-amber-500 to-orange-500' },
        { href: '/admin/dashboard/coupons', label: 'Coupons', icon: '🏷️', gradient: 'from-purple-500 to-pink-500' },
        { href: '/admin/dashboard/cancellations', label: 'Cancellations', icon: '❌', gradient: 'from-red-500 to-pink-500' },
      ]
    },
    {
      category: 'Account',
      items: [
        { href: '/admin/dashboard/profile', label: 'Profile', icon: '👤', gradient: 'from-blue-500 to-cyan-500' },
        { href: '/admin/dashboard/security', label: 'Security', icon: '🛡️', gradient: 'from-purple-500 to-pink-500' },
        { href: '/admin/dashboard/audit-logs', label: 'Audit Logs', icon: '📋', gradient: 'from-gray-500 to-gray-600' },
      ]
    }
  ];

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            <Link href="/admin/dashboard/analytics" className="relative w-12 h-12 md:w-14 md:h-14">
              <Image
                src="/images/logo1.png"
                alt="Ebony Bruce Travels Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/admin/dashboard/profile"
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da]/20 to-[#2c8fc0]/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 transition">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-gray-900">{profileData.displayName}</p>
                  <p className="text-xs text-gray-500">Super Admin</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-xl bg-white overflow-hidden">
                    <img src={profileData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Navigation */}
        <aside className="hidden md:block w-72 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-6 space-y-6">
            {navigationItems.map((section) => (
              <div key={section.category}>
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.category}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href === '/admin/dashboard/analytics' && pathname === '/admin/dashboard');
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative block w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                          isActive ? 'shadow-lg' : 'hover:shadow-md'
                        }`}
                      >
                        {isActive && (
                          <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                        <div className={`relative flex items-center gap-3 px-4 py-3 ${
                          isActive ? 'text-white' : 'text-gray-600'
                        }`}>
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-medium text-sm">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="pt-6 mt-6 border-t border-gray-100">
              <button 
                onClick={handleLogout}
                className="relative w-full group overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3 px-4 py-3 text-gray-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium text-sm">Sign Out</span>
                </div>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="fixed top-0 left-0 h-full w-80 bg-white/95 backdrop-blur-xl z-50 overflow-y-auto md:hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] rounded-2xl blur-lg opacity-50" />
                    <div className="relative w-full h-full bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] rounded-2xl p-2 shadow-lg">
                      <Image
                        src="/images/logo1.png"
                        alt="Ebony Bruce Travels Logo"
                        fill
                        className="object-contain p-1"
                        priority
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <nav className="p-4 space-y-6">
                {navigationItems.map((section) => (
                  <div key={section.category}>
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {section.category}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href;
                        
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`relative block w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                              isActive ? 'shadow-lg' : 'hover:shadow-md'
                            }`}
                          >
                            {isActive && (
                              <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                            )}
                            <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                            <div className={`relative flex items-center gap-3 px-4 py-3 ${
                              isActive ? 'text-white' : 'text-gray-600'
                            }`}>
                              <span className="text-lg">{item.icon}</span>
                              <span className="font-medium text-sm">{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-6 mt-6 border-t border-gray-100">
                  <button 
                    onClick={handleLogout}
                    className="relative w-full group overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-3 px-4 py-3 text-gray-600 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="font-medium text-sm">Sign Out</span>
                    </div>
                  </button>
                </div>
              </nav>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}