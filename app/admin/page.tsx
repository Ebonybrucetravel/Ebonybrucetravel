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
      const res = await fetch(`${config.apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Login failed');
      
      const user = data.user ?? data.data?.user ?? data;
      const role = (user.role ?? '').toUpperCase();
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        throw new Error('Insufficient permissions');
      }
      
      const token = data.token ?? data.data?.token;
      if (!token) throw new Error('No token received');
      
      // Set token in localStorage and cookie
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      
      // Set cookie for middleware
      document.cookie = `adminToken=${token}; path=/; max-age=86400; SameSite=Strict`;
      
      router.push('/admin/dashboard/analytics');
    } catch (err: unknown) {
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
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#33a8da] focus:border-transparent"
            placeholder="admin@ebonybruce.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#33a8da] focus:border-transparent"
            placeholder="••••••••••••"
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
        >
          Return to site
        </button>
      </form>
    </div>
  );
}