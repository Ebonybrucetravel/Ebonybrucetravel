// components/admin/CreateUserForm.tsx
'use client';

import React, { useState } from 'react';

interface CreateUserFormProps {
  onBack: () => void;
  onCreateUser: (userData: any) => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function CreateUserForm({ 
  onBack, 
  onCreateUser, 
  isSubmitting = false,
  error 
}: CreateUserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN', // API value (kept as ADMIN/SUPER_ADMIN)
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateUser(formData);
  };

  // Display names for UI
  const roles = [
    { 
      value: 'ADMIN', 
      label: 'Admin', 
      description: 'Can manage bookings, customers, and view analytics',
      icon: '👤',
      color: 'blue'
    },
    { 
      value: 'SUPER_ADMIN', 
      label: 'Super Admin', 
      description: 'Full system access including user management and permissions',
      icon: '👑',
      color: 'purple'
    },
  ];

  const getRoleStyle = (roleValue: string) => {
    const isSelected = formData.role === roleValue;
    const role = roles.find(r => r.value === roleValue);
    
    if (isSelected) {
      return role?.color === 'purple' 
        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
        : 'border-[#33a8da] bg-[#33a8da]/5 ring-2 ring-[#33a8da]/20';
    }
    return 'border-gray-200 hover:border-gray-300';
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
        disabled={isSubmitting}
      >
        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <span className="text-sm font-medium">Back to Admin Users</span>
      </button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Create New Admin
          </h1>
          <p className="text-gray-500 mt-2">Add a new administrator to the platform. Choose between Admin and Super Admin roles.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-gray-100">
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] disabled:opacity-50"
                placeholder="Enter admin's full name"
                disabled={isSubmitting}
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] disabled:opacity-50"
                placeholder="admin@example.com"
                disabled={isSubmitting}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] disabled:opacity-50 pr-12"
                  placeholder="Enter password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Minimum 8 characters</p>
            </div>

            {/* Admin Role Selection - Now clearly labeled */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Admin Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admin Option */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                  className={`relative p-5 rounded-xl border-2 transition-all text-left ${getRoleStyle('ADMIN')}`}
                  disabled={isSubmitting}
                >
                  {formData.role === 'ADMIN' && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-[#33a8da] rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Admin</h3>
                      <p className="text-xs text-gray-500">Standard Access</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Can manage bookings, customers, and view analytics</p>
                </button>

                {/* Super Admin Option */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'SUPER_ADMIN' })}
                  className={`relative p-5 rounded-xl border-2 transition-all text-left ${getRoleStyle('SUPER_ADMIN')}`}
                  disabled={isSubmitting}
                >
                  {formData.role === 'SUPER_ADMIN' && (
                    <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">
                      👑
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Super Admin</h3>
                      <p className="text-xs text-gray-500">Full Access</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">Full system access including user management and permissions</p>
                </button>
              </div>
            </div>

            {/* Phone Field (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] disabled:opacity-50"
                placeholder="+44 123 456 7890"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Admin...
                </>
              ) : (
                'Create Admin'
              )}
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Admin Role Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Admin Role Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium text-blue-800">Admin:</span>
              <p className="text-blue-600 mt-1">Standard administrator with access to manage bookings, customers, and view analytics</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Super Admin:</span>
              <p className="text-blue-600 mt-1">Full system access including user management, permissions, and all administrative functions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}