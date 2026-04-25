// components/admin/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

interface AdminSidebarProps {
  isMobileMenuOpen: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isMobileMenuOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = {
    services: [
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
    ],
    main: [
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
    ],
    wakanow: [
      { 
        href: '/admin/dashboard/wakanow', 
        label: 'Wakanow Dashboard', 
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
        gradient: 'from-indigo-500 to-purple-500' 
      },
      { 
        href: '/admin/dashboard/wakanow/book-for-user', 
        label: 'Book for Customer', 
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>, 
        gradient: 'from-violet-500 to-purple-500' 
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
    ],
    account: [
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
    ],
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-80 bg-white/95 backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:z-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo Section */}
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
            
            {/* Mobile Close Button */}
            <button 
              onClick={onClose}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
          {/* Services Section */}
          <div>
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Services
            </p>
            <div className="space-y-1">
              {navItems.services.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`relative block w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                    isActive(item.href) ? 'shadow-lg' : 'hover:shadow-md'
                  }`}
                >
                  {isActive(item.href) && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`relative flex items-center gap-3 px-4 py-3 ${
                    isActive(item.href) ? 'text-white' : 'text-gray-600'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Main Navigation */}
          <div className="pt-2 border-t border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Main
            </p>
            <div className="space-y-1">
              {navItems.main.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`relative block w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                    isActive(item.href) ? 'shadow-lg' : 'hover:shadow-md'
                  }`}
                >
                  {isActive(item.href) && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`relative flex items-center gap-3 px-4 py-3 ${
                    isActive(item.href) ? 'text-white' : 'text-gray-600'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Wakanow Section */}
          <div className="pt-2 border-t border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              Wakanow Admin
            </p>
            <div className="space-y-1">
              {navItems.wakanow.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`relative block w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                    isActive(item.href) ? 'shadow-lg' : 'hover:shadow-md'
                  }`}
                >
                  {isActive(item.href) && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`relative flex items-center gap-3 px-4 py-3 ${
                    isActive(item.href) ? 'text-white' : 'text-gray-600'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Account Section */}
          <div className="pt-2 border-t border-gray-100">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Account
            </p>
            <div className="space-y-1">
              {navItems.account.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`relative block w-full group overflow-hidden rounded-xl transition-all duration-300 ${
                    isActive(item.href) ? 'shadow-lg' : 'hover:shadow-md'
                  }`}
                >
                  {isActive(item.href) && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-100`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`relative flex items-center gap-3 px-4 py-3 ${
                    isActive(item.href) ? 'text-white' : 'text-gray-600'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="pt-6 mt-6 border-t border-gray-100">
            <button 
              onClick={() => {
                // Handle logout
                localStorage.removeItem('adminToken');
                window.location.href = '/admin/login';
                onClose();
              }} 
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

        {/* Admin Info Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-0.5">
              <div className="w-full h-full rounded-xl bg-white overflow-hidden">
                <img 
                  src="https://ui-avatars.com/api/?name=Miracle+Chiamaka&background=33a8da&color=fff" 
                  className="w-full h-full object-cover" 
                  alt="Profile" 
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Miracle Chiamaka</p>
              <p className="text-xs text-gray-500 truncate">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;