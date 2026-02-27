// components/admin/AdminHeader.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
      <div className="px-4 md:px-8 py-3 flex items-center justify-between">
        {/* Left side - Mobile menu button and logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Logo */}
          <Link href="/admin/analytics" className="relative group">
            <div className="relative w-12 h-12 md:w-14 md:h-14">
              <Image
                src="/images/logo1.png"
                alt="Ebony Bruce Travels Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Center - Search bar */}
        <div className="hidden md:flex items-center flex-1 max-w-2xl mx-8">
          <div className="relative w-full group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da]/20 to-[#2c8fc0]/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <svg className="w-5 h-5 text-gray-400 absolute left-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search dashboard..." 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Right side - Profile */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#33a8da]/20 to-[#2c8fc0]/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 transition">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-gray-900">Miracle Chiamaka</p>
                  <p className="text-xs text-gray-500">Super Admin</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-xl bg-white overflow-hidden">
                    <img 
                      src="https://ui-avatars.com/api/?name=Miracle+Chiamaka&background=33a8da&color=fff" 
                      className="w-full h-full object-cover" 
                      alt="Profile" 
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <Link
                  href="/admin/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setShowProfileMenu(false)}
                >
                  Profile Settings
                </Link>
                <Link
                  href="/admin/security"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setShowProfileMenu(false)}
                >
                  Security
                </Link>
                <hr className="my-2 border-gray-100" />
                <button
                  onClick={() => {
                    // Handle logout
                    setShowProfileMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]" 
          />
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;