'use client';

import React, { useState } from 'react';

export default function ProfilePage() {
  const [profileData, setProfileData] = useState({
    displayName: 'Miracle Chiamaka',
    adminEmail: 'miracle.c@ebonybruce.com',
    primaryTerminal: 'Lagos Main Hub (LOS)',
    authorizationLevel: 'Executive Access (Tier 1)',
    profileImage: 'https://ui-avatars.com/api/?name=Miracle+Chiamaka&background=33a8da&color=fff'
  });

  const handleEdit = (field: keyof typeof profileData) => {
    const currentValue = profileData[field];
    const fieldLabels: Record<keyof typeof profileData, string> = {
      displayName: 'Display Name',
      adminEmail: 'Admin Email',
      primaryTerminal: 'Primary Terminal',
      authorizationLevel: 'Authorization Level',
      profileImage: 'Profile Image URL'
    };

    const newValue = prompt(`Enter new ${fieldLabels[field]}:`, currentValue);
    if (newValue && newValue.trim() !== '') {
      setProfileData(prev => ({ ...prev, [field]: newValue.trim() }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, profileImage: imageUrl }));
    }
  };

  const handleSave = () => {
    // TODO: Implement API call
    alert('Profile saved successfully!');
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Profile Settings
          </h1>
          <p className="text-gray-500 mt-2">Manage your account information and preferences</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="flex flex-col md:flex-row items-center gap-8 pb-8 mb-8 border-b border-gray-100">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] p-1 shadow-xl">
                <div className="w-full h-full rounded-2xl bg-white overflow-hidden">
                  <img src={profileData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                </div>
              </div>
              <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{profileData.displayName}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="px-4 py-1.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white text-sm font-medium rounded-full">
                  Super Admin
                </span>
                <span className="text-sm text-gray-400">ID: #ADM-4421-XB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Display Name', field: 'displayName' as keyof typeof profileData, value: profileData.displayName },
              { label: 'Admin Email', field: 'adminEmail' as keyof typeof profileData, value: profileData.adminEmail },
              { label: 'Primary Terminal', field: 'primaryTerminal' as keyof typeof profileData, value: profileData.primaryTerminal },
              { label: 'Authorization Level', field: 'authorizationLevel' as keyof typeof profileData, value: profileData.authorizationLevel },
            ].map(({ label, field, value }) => (
              <div key={field} className="group">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{label}</label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center group-hover:border-[#33a8da] transition-all">
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                  <button 
                    onClick={() => handleEdit(field)}
                    className="text-xs text-[#33a8da] opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Multi-Factor Authentication Active</p>
                <p className="text-xs text-gray-500">Your account has enhanced security</p>
              </div>
            </div>
            <button 
              onClick={handleSave}
              className="px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium text-sm hover:shadow-xl hover:scale-105 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}