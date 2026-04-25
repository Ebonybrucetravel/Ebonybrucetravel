'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface AdminUser {
  displayName?: string;
  name?: string;
  email?: string;
  role?: string;
  profileImage?: string;
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState<AdminUser>({
    displayName: 'Loading...',
    profileImage: 'https://ui-avatars.com/api/?name=Loading&background=33a8da&color=fff'
  });

  // Load user data from localStorage
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userStr = localStorage.getItem('adminUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          console.log('Loaded user data:', user); // Debug log
          
          // Extract name from various possible fields
          const displayName = user.displayName || user.name || user.email?.split('@')[0] || 'Admin';
          
          // Create avatar with user's initials
          const initials = displayName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
          
          const profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || displayName)}&background=33a8da&color=fff`;
          
          setProfileData({
            displayName,
            email: user.email,
            role: user.role || 'ADMIN',
            profileImage
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

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

  // Don't show sidebar on login page
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  const navigationItems = [
    {
      category: 'Services',
      items: [
        { 
          href: '/admin/dashboard/flights', 
          label: 'Flights', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>, 
          gradient: 'from-blue-500 to-cyan-500' 
        },
        { 
          href: '/admin/dashboard/hotels', 
          label: 'Hotels', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>, 
          gradient: 'from-amber-500 to-orange-500' 
        },
        { 
          href: '/admin/dashboard/car-rentals', 
          label: 'Car Rentals', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8a2 2 0 012 2v9a1 1 0 01-1 1H7a1 1 0 01-1-1V9a2 2 0 012-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M9 12h.01M15 12h.01M8 16h8" /></svg>, 
          gradient: 'from-emerald-500 to-teal-500' 
        },
      ]
    },
    {
      category: 'Main',
      items: [
        { 
          href: '/admin/dashboard/analytics', 
          label: 'Analytics', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
          gradient: 'from-purple-500 to-pink-500' 
        },
        { 
          href: '/admin/dashboard/bookings', 
          label: 'Bookings', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
          gradient: 'from-blue-500 to-cyan-500' 
        },
        { 
          href: '/admin/dashboard/users', 
          label: 'Customers', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>, 
          gradient: 'from-green-500 to-emerald-500' 
        },
        { 
          href: '/admin/dashboard/markups', 
          label: 'Markups', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
          gradient: 'from-yellow-500 to-amber-500' 
        },
        { 
          href: '/admin/dashboard/admin-users', 
          label: 'Admin Users', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, 
          gradient: 'from-purple-500 to-pink-500' 
        },
        { 
          href: '/admin/dashboard/rewards', 
          label: 'Rewards', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>, 
          gradient: 'from-amber-500 to-orange-500' 
        },
        { 
          href: '/admin/dashboard/coupons', 
          label: 'Coupons', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>, 
          gradient: 'from-purple-500 to-pink-500' 
        },
        { 
          href: '/admin/dashboard/cancellations', 
          label: 'Cancellations', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
          gradient: 'from-red-500 to-pink-500' 
        },
      ]
    },
    {
      category: 'Wakanow Admin',
      items: [
        { 
          href: '/admin/dashboard/wakanow', 
          label: 'Wakanow Dashboard', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
          gradient: 'from-indigo-500 to-purple-500' 
        },
        { 
          href: '/admin/dashboard/wakanow/tickets', 
          label: 'Issue Tickets', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>, 
          gradient: 'from-blue-500 to-indigo-500' 
        },
        { 
          href: '/admin/dashboard/wakanow/wallet', 
          label: 'Wallet Balance', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>, 
          gradient: 'from-green-500 to-emerald-500' 
        },
        { 
          href: '/admin/dashboard/wakanow/bookings', 
          label: 'Wakanow Bookings', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>, 
          gradient: 'from-cyan-500 to-blue-500' 
        },
      ]
    },
    {
      category: 'Account',
      items: [
        { 
          href: '/admin/dashboard/profile', 
          label: 'Profile', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, 
          gradient: 'from-blue-500 to-cyan-500' 
        },
        { 
          href: '/admin/dashboard/security', 
          label: 'Security', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, 
          gradient: 'from-purple-500 to-pink-500' 
        },
        { 
          href: '/admin/dashboard/audit-logs', 
          label: 'Audit Logs', 
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
          gradient: 'from-gray-500 to-gray-600' 
        },
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
            
            <Link href="/admin/dashboard/analytics" className="relative w-24 h-24 md:w-32 md:h-32 -my-4">
              <Image
                src="/images/logo1.png"
                alt="Ebony Bruce Travels Logo"
                fill
                className="object-contain"
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
                  <p className="text-xs text-gray-500 capitalize">{profileData.role?.toLowerCase().replace('_', ' ') || 'Admin'}</p>
                  {profileData.email && (
                    <p className="text-xs text-gray-400 truncate max-w-[150px]">{profileData.email}</p>
                  )}
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-xl bg-white overflow-hidden">
                    <img 
                      src={profileData.profileImage} 
                      className="w-full h-full object-cover" 
                      alt={profileData.displayName}
                    />
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
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] rounded-2xl blur-lg opacity-50" />
                    <div className="relative w-full h-full bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] rounded-2xl p-2 shadow-lg">
                      <Image
                        src="/images/logo1.png"
                        alt="Ebony Bruce Travels Logo"
                        fill
                        className="object-contain"
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
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-0.5 shadow-lg">
                    <div className="w-full h-full rounded-xl bg-white overflow-hidden">
                      <img 
                        src={profileData.profileImage} 
                        className="w-full h-full object-cover" 
                        alt={profileData.displayName}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{profileData.displayName}</p>
                    <p className="text-xs text-gray-500 capitalize">{profileData.role?.toLowerCase().replace('_', ' ') || 'Admin'}</p>
                  </div>
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
                            className={`relative block w-full rounded-xl transition-all duration-300 ${
                              isActive ? 'shadow-lg' : ''
                            }`}
                          >
                            {isActive && (
                              <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100 rounded-xl`} />
                            )}
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
                    className="relative w-full rounded-xl transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 opacity-100 rounded-xl" />
                    <div className="relative flex items-center gap-3 px-4 py-3 text-white">
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