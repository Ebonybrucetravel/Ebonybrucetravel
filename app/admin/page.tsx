'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // FIXED: Use admin auth endpoint instead of regular user auth
      const res = await fetch(`${config.apiBaseUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message ?? 'Login failed');
      }
      
      // Handle response structure - adjust based on your API
      const responseData = data.data || data;
      const user = responseData.user || responseData;
      const token = responseData.token || responseData.accessToken;
      
      if (!token) {
        throw new Error('No token received');
      }
      
      // Verify user has admin role
      const role = (user.role ?? '').toUpperCase();
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        throw new Error('Insufficient permissions - admin access required');
      }
      
      // Store admin data
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      
      // Set cookie for middleware (more secure options)
      document.cookie = `adminToken=${token}; path=/; max-age=86400; SameSite=Strict; secure=${window.location.protocol === 'https:'}`;
      
      // Dispatch event for other tabs
      window.dispatchEvent(new CustomEvent('admin-login', { detail: { user } }));
      
      // Redirect to admin dashboard
      router.push('/admin/dashboard/analytics');
      
    } catch (err: unknown) {
      console.error('Admin login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fbfe] flex items-center justify-center px-4">
      <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your admin credentials</p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#33a8da] focus:border-transparent transition-all"
            placeholder="admin@ebonybruce.com"
            disabled={loading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#33a8da] focus:border-transparent transition-all"
            placeholder="••••••••••••"
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#33a8da] text-white font-bold py-3 rounded-lg hover:bg-[#2c98c7] transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Authorizing…</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>
        
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium text-sm transition"
          disabled={loading}
        >
          Return to site
        </button>
      </form>
    </div>
  );
}