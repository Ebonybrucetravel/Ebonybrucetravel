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
            if (!res.ok)
                throw new Error(data.message ?? 'Login failed');
            const user = data.user ?? data.data?.user ?? data;
            if (user.role !== 'admin')
                throw new Error('Insufficient permissions');
            localStorage.setItem('adminToken', data.token ?? data.data?.token);
            router.push('/admin/dashboard');
        }
        catch (err: any) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-[60vh] flex items-center justify-center px-4">
      <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your admin credentials</p>
        </div>
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#33a8da] focus:border-transparent"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#33a8da] focus:border-transparent"/>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#33a8da] text-white font-bold rounded-lg hover:bg-[#2c98c7] disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        <button type="button" onClick={() => router.push('/')} className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm">
          ← Back to Home
        </button>
      </form>
    </div>);
}
