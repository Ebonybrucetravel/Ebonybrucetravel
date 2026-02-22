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
      { href: '/admin/dashboard/flights', label: 'Flights', icon: '✈️', gradient: 'from-blue-500 to-cyan-500' },
      { href: '/admin/dashboard/hotels', label: 'Hotels', icon: '🏨', gradient: 'from-amber-500 to-orange-500' },
      { href: '/admin/dashboard/car-rentals', label: 'Car Rentals', icon: '🚗', gradient: 'from-emerald-500 to-teal-500' },
    ],
    main: [
      { href: '/admin/dashboard/analytics', label: 'Analytics', icon: '📊', gradient: 'from-purple-500 to-pink-500' },
      { href: '/admin/dashboard/bookings', label: 'Bookings', icon: '📅', gradient: 'from-blue-500 to-cyan-500' },
      // Customers (platform users)
      { href: '/admin/dashboard/users', label: 'Customers', icon: '👥', gradient: 'from-green-500 to-emerald-500' },
      // Admin Users (system administrators)
      { href: '/admin/dashboard/admin-users', label: 'Admin Users', icon: '👑', gradient: 'from-purple-500 to-pink-500' },
      { href: '/admin/dashboard/rewards', label: 'Rewards', icon: '⭐', gradient: 'from-amber-500 to-orange-500' },
      { href: '/admin/dashboard/coupons', label: 'Coupons', icon: '🏷️', gradient: 'from-purple-500 to-pink-500' },
      { href: '/admin/dashboard/cancellations', label: 'Cancellations', icon: '❌', gradient: 'from-red-500 to-pink-500' },
    ],
    account: [
      { href: '/admin/dashboard/profile', label: 'Profile', icon: '👤', gradient: 'from-blue-500 to-cyan-500' },
      { href: '/admin/dashboard/security', label: 'Security', icon: '🛡️', gradient: 'from-purple-500 to-pink-500' },
      { href: '/admin/dashboard/audit-logs', label: 'Audit Logs', icon: '📋', gradient: 'from-gray-500 to-gray-600' },
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