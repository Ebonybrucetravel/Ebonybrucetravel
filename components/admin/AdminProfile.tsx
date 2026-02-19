'use client';

import React from 'react';
import { useAdmin } from '@/context/AdminContext';

export default function AdminProfile() {
  const { user } = useAdmin();

  const profile = {
    name: user?.name || user?.email?.split('@')[0] || 'Admin',
    email: user?.email || '—',
    role: user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin',
    phone: user?.phone || '—',
    image:
      user?.image ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.email || 'A')}&background=f4d9c6&color=9a7d6a`,
  };

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10 bg-[#f8fbfe]">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Profile Account</h2>
          <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">Admin identity settings</p>
        </div>

        <div className="bg-white rounded-[32px] p-8 lg:p-12 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row items-center gap-8 mb-12 pb-12 border-b border-gray-50">
            <div className="w-32 h-32 rounded-[40px] bg-[#f4d9c6] overflow-hidden border-4 border-white shadow-xl flex-shrink-0">
              <img src={profile.image} className="w-full h-full object-cover" alt="Profile" />
            </div>
            <div>
              <h3 className="text-2xl lg:text-3xl font-black text-gray-900 leading-none mb-3">{profile.name}</h3>
              <span className="inline-block bg-blue-50 text-[#33a8da] text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                {profile.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Display Name
              </label>
              <div className="p-5 bg-gray-50 rounded-2xl">
                <span className="text-base font-bold text-gray-900">{profile.name}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Admin Email
              </label>
              <div className="p-5 bg-gray-50 rounded-2xl">
                <span className="text-base font-bold text-gray-900">{profile.email}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Phone
              </label>
              <div className="p-5 bg-gray-50 rounded-2xl">
                <span className="text-base font-bold text-gray-900">{profile.phone}</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
                Role
              </label>
              <div className="p-5 bg-gray-50 rounded-2xl">
                <span className="text-base font-bold text-gray-900">{profile.role}</span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-400">
            Profile information is managed by Super Admins. Contact your administrator to update your details.
          </p>
        </div>
      </div>
    </div>
  );
}
