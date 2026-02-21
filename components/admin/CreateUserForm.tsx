
'use client';

import React, { useState } from 'react';

interface CreateUserFormProps {
  onBack: () => void;
  onCreateUser: (userData: any) => void;
}

export default function CreateUserForm({ onBack, onCreateUser }: CreateUserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    phone: '',
    country: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create user object with additional fields
      const newUser = {
        ...formData,
        id: `u${Date.now()}`,
        registered: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: '2-digit', 
          year: 'numeric' 
        }),
        booking: 0,
        points: '0',
        status: 'Active',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=33a8da&color=fff`
      };
      
      // Pass to parent handler
      await onCreateUser(newUser);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'user',
        phone: '',
        country: '',
      });
      
    } catch (error) {
      console.error('Failed to create user:', error);
      setErrors({ submit: 'Failed to create user. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    if (window.confirm('Reset all form fields?')) {
      setFormData({
        name: '',
        email: '',
        role: 'user',
        phone: '',
        country: '',
      });
      setErrors({});
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Back button with improved styling */}
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#33a8da] group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="text-sm font-medium">Back to Users</span>
        </button>

        {/* Header with reset button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Create New User
            </h1>
            <p className="text-gray-500 mt-2">Add a new user to the platform</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Form
          </button>
        </div>

        {/* Error message */}
        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 space-y-6">
          {/* Name field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => {
                setFormData({...formData, name: e.target.value});
                if (errors.name) setErrors({...errors, name: ''});
              }}
              placeholder="John Doe"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 transition-all ${
                errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#33a8da]'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({...formData, email: e.target.value});
                if (errors.email) setErrors({...errors, email: ''});
              }}
              placeholder="john@example.com"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 transition-all ${
                errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#33a8da]'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Phone field (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] transition-all"
            />
          </div>

          {/* Country field (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] transition-all"
            >
              <option value="">Select country</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="NG">Nigeria</option>
              <option value="AE">UAE</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Role field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] transition-all appearance-none cursor-pointer"
              >
                <option value="user">Regular User</option>
                <option value="admin">Administrator</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {formData.role === 'admin' ? 'Admins have full access to the dashboard' : 'Regular users can only book and manage their own profile'}
            </p>
          </div>

          {/* Preview Card */}
          <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white font-bold">
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{formData.name || 'New User'}</p>
                <p className="text-xs text-gray-500">{formData.email || 'email@example.com'}</p>
              </div>
              <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                formData.role === 'admin' 
                  ? 'bg-purple-50 text-purple-600' 
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {formData.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white hover:shadow-lg hover:shadow-[#33a8da]/25'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating User...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create User
              </>
            )}
          </button>
        </form>

        {/* Help text */}
        <p className="mt-4 text-xs text-center text-gray-400">
          New users will receive a welcome email with login instructions
        </p>
      </div>
    </div>
  );
}