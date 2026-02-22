// app/admin/dashboard/admin-users/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { listAdminUsers } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  phone?: string;
  lastActive?: string;
  status: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    const fetchAdminUsers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        console.log('📡 Fetching admin users...');
        
        let response;
        try {
          response = await listAdminUsers();
          console.log('✅ API Response:', response);
        } catch (apiErr) {
          console.log('⚠️ API failed, using mock data:', apiErr);
          setUsingMockData(true);
          setUsers(getMockAdminUsers());
          setIsLoading(false);
          return;
        }
        
        if (response.success && response.data) {
          const transformedUsers = response.data.map((item: any) => ({
            id: item.id,
            name: item.name || 'Unknown',
            email: item.email || 'N/A',
            role: item.role || 'ADMIN',
            phone: item.phone || 'N/A',
            lastActive: item.lastActiveAt ? new Date(item.lastActiveAt).toLocaleDateString() : 'Never',
            status: item.status || 'active',
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: '2-digit', 
              year: 'numeric' 
            }) : 'N/A',
          }));
          
          setUsers(transformedUsers);
          setUsingMockData(false);
        } else {
          setUsingMockData(true);
          setUsers(getMockAdminUsers());
        }
      } catch (err) {
        console.error('❌ Error fetching admin users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch admin users');
        setUsingMockData(true);
        setUsers(getMockAdminUsers());
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminUsers();
  }, [router]);

  const getMockAdminUsers = (): AdminUser[] => {
    return [
      {
        id: '1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'SUPER_ADMIN',
        phone: '+44 123 456 7890',
        lastActive: '2026-02-22',
        status: 'active',
        createdAt: 'Jan 15, 2026'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'ADMIN',
        phone: '+44 123 456 7891',
        lastActive: '2026-02-21',
        status: 'active',
        createdAt: 'Jan 20, 2026'
      },
      {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        role: 'ADMIN',
        phone: '+44 123 456 7892',
        lastActive: '2026-02-19',
        status: 'inactive',
        createdAt: 'Feb 01, 2026'
      }
    ];
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = searchTerm === '' || 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleViewUser = (userId: string) => {
    router.push(`/admin/dashboard/admin-users/${userId}`);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {usingMockData && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center gap-3 text-blue-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">Using demo data - API endpoint not available</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Admin Users
          </h1>
          <p className="text-gray-500 mt-2">Manage system administrators and their permissions</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => router.push('/admin/dashboard/admin-users/create')} 
            className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Admin
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
              />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setRoleFilter('All')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  roleFilter === 'All'
                    ? 'bg-white text-[#33a8da] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRoleFilter('ADMIN')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  roleFilter === 'ADMIN'
                    ? 'bg-white text-[#33a8da] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setRoleFilter('SUPER_ADMIN')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  roleFilter === 'SUPER_ADMIN'
                    ? 'bg-white text-[#33a8da] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Super Admin
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Showing {filteredUsers.length} admin users
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                        user.role === 'SUPER_ADMIN' 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-br from-[#33a8da] to-[#2c8fc0]'
                      }`}>
                        {user.role === 'SUPER_ADMIN' ? '👑' : user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'SUPER_ADMIN'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{user.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{user.lastActive}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{user.createdAt}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewUser(user.id)}
                      className="text-[#33a8da] hover:text-[#2c8fc0] text-sm font-medium transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p>No admin users found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}