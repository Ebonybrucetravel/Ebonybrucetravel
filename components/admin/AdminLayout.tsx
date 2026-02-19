'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin, AdminUser } from '@/context/AdminContext';

const NAV_ITEMS: { path: string; label: string; icon: string; superAdminOnly?: boolean }[] = [
  { path: '/admin/dashboard/analytics', label: 'Analytics Dashboard', icon: '📊' },
  { path: '/admin/dashboard/bookings', label: 'Bookings', icon: '📅' },
  { path: '/admin/dashboard/customers', label: 'Customers', icon: '👥' },
  { path: '/admin/dashboard/admin-users', label: 'Admin Users', icon: '⚙️', superAdminOnly: true },
  { path: '/admin/dashboard/audit-logs', label: 'Audit Logs', icon: '📋', superAdminOnly: true },
  { path: '/admin/dashboard/rewards', label: 'Rewards & Vouchers', icon: '🏷️' },
  { path: '/admin/dashboard/cancellations', label: 'Cancellation Requests', icon: '🔄' },
];

interface AdminLayoutProps {
  onLogout: () => void;
  children: React.ReactNode;
}

export default function AdminLayout({ onLogout, children }: AdminLayoutProps) {
  const { user, isSuperAdmin } = useAdmin();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const visibleNav = NAV_ITEMS.filter((n) => !n.superAdminOnly || isSuperAdmin);

  const isActive = (path: string) => {
    if (path === '/admin/dashboard/bookings') {
      return pathname === path || pathname?.startsWith('/admin/dashboard/bookings/');
    }
    if (path === '/admin/dashboard/customers') {
      return pathname === path || pathname?.startsWith('/admin/dashboard/customers/');
    }
    return pathname === path;
  };

  const profileDisplay = (u: AdminUser | null) => {
    if (!u) return { name: 'Admin', role: '—', image: null };
    return {
      name: u.name || u.email?.split('@')[0] || 'Admin',
      role: u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin',
      image: u.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.email || 'A')}&background=f4d9c6&color=9a7d6a`,
    };
  };

  const profile = profileDisplay(user);

  return (
    <div className="flex bg-[#f8fbfe] min-h-screen">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          w-72 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 z-50
          transition-transform duration-300 ease-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0 fixed inset-y-0 left-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 flex items-center justify-between lg:justify-start gap-2">
          <Link href="/admin/dashboard/analytics" className="flex items-center gap-2">
            <div className="bg-[#001f3f] p-2 rounded shadow-lg flex-shrink-0">
              <span className="text-white font-bold italic text-sm">EB</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-gray-900 leading-none uppercase tracking-tighter">EBONY BRUCE</span>
              <span className="text-[8px] text-gray-400 uppercase tracking-widest font-black">Travels Admin</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {visibleNav.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl font-bold text-sm transition-all block ${
                isActive(item.path)
                  ? 'bg-[#33a8da] text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div className="pt-8 pb-4 px-6">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Account</span>
          </div>
          <Link
            href="/admin/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl font-bold text-xs transition-all ${
              pathname === '/admin/dashboard/profile' ? 'text-[#33a8da] bg-blue-50' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>👤</span>
            Profile
          </Link>
          <Link
            href="/admin/dashboard/security"
            onClick={() => setSidebarOpen(false)}
            className={`w-full flex items-center gap-4 px-6 py-3 rounded-xl font-bold text-xs transition-all ${
              pathname === '/admin/dashboard/security' ? 'text-[#33a8da] bg-blue-50' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>🛡️</span>
            Security
          </Link>
        </nav>

        <div className="p-6 mt-auto border-t border-gray-100">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-red-100 text-red-500 font-bold text-sm rounded-xl hover:bg-red-50 transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 w-full group focus-within:border-[#33a8da] transition-all">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#33a8da] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="bg-transparent border-none focus:ring-0 text-sm font-medium ml-2 w-full min-w-0"
              />
            </div>
          </div>

          <Link href="/admin/dashboard/profile" className="flex items-center gap-3 lg:gap-4 p-2 rounded-xl hover:bg-gray-50 transition">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-gray-900 leading-none">{profile.name}</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{profile.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#f4d9c6] border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
              <img src={profile.image || undefined} className="w-full h-full object-cover" alt="Profile" />
            </div>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto hide-scrollbar">{children}</main>
      </div>
    </div>
  );
}
