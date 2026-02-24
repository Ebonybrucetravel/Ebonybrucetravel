'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { listCustomers } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

interface User {
  id: string;
  name: string;
  email: string;
  registered: string;
  booking: number;
  points: string;
  status: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(20);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('adminToken');
        console.log('🔑 Token exists:', !!token);
        
        if (!token) {
          router.push('/admin');
          return;
        }
  
        const params: any = {
          page,
          limit,
        };
  
        // Map status filter to API params
        if (statusFilter !== 'All users') {
          params.status = statusFilter === 'Active Only' ? 'active' : 'suspended';
        }
  
        if (searchTerm) {
          params.search = searchTerm;
        }
  
        console.log('📡 Fetching users with params:', params);
  
        const response = await listCustomers(params);
        
        console.log('✅ API Response:', response);
        
        if (response.success && response.data) {
          // Transform API data to match your User interface
          const transformedUsers = response.data.map((item: any) => ({
            id: item.id,
            name: item.name || 'Unknown',
            email: item.email || 'N/A',
            registered: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: '2-digit', 
              year: 'numeric' 
            }) : 'N/A',
            booking: item.totalBookings || item.bookingCount || 0,
            points: (item.loyaltyPoints || item.points || 0).toLocaleString(),
            status: item.status === 'SUSPENDED' ? 'Suspended' : 'Active',
          }));
          
          setUsers(transformedUsers);
          setTotalPages(response.meta?.totalPages || 1);
          setTotalUsers(response.meta?.total || response.data.length);
        } else {
          setError(response.message || 'No data received from server');
        }
      } catch (err) {
        console.error('❌ Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };
  
    // Only debounce search, not page changes
    if (searchTerm) {
      const debounceTimer = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      fetchUsers();
    }
  }, [page, statusFilter, searchTerm, limit, router]); 

  // Apply client-side filtering only if needed (as backup)
  const filteredUsers = useMemo(() => {
    // Since we're doing server-side filtering, this is just a safety net
    return users.filter(u => {
      const matchesSearch = searchTerm === '' || 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All users' || 
        (statusFilter === 'Active Only' && u.status === 'Active') ||
        (statusFilter === 'Suspended' && u.status === 'Suspended');
      
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const downloadCSV = () => {
    if (!filteredUsers.length) return;
    
    const headers = ['Name', 'Email', 'Registered', 'Bookings', 'Points', 'Status'];
    const csvRows = [
      headers.join(','),
      ...filteredUsers.map(row => 
        [row.name, row.email, row.registered, row.booking, row.points, row.status]
          .map(value => `"${value}"`).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewUser = (userId: string) => {
    router.push(`/admin/dashboard/users/${userId}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handleStatusFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setPage(1); // Reset to first page on filter change
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Customers
          </h1>
          <p className="text-gray-500 mt-2">Manage platform customers and view their information</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadCSV}
            disabled={!filteredUsers.length}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
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
                onChange={handleSearchChange}
                placeholder="Search customers by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
              />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['All users', 'Active Only', 'Suspended'].map(filter => (
                <button
                  key={filter}
                  onClick={() => handleStatusFilterChange(filter)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === filter
                      ? 'bg-white text-[#33a8da] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {filter === 'All users' ? 'All Customers' : filter}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Showing {filteredUsers.length} of {totalUsers} customers
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33a8da] to-[#2c8fc0] flex items-center justify-center text-white font-bold">
                        {user.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{user.registered}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{user.booking}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-[#33a8da]">{user.points}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleViewUser(user.id)}
                      className="text-[#33a8da] hover:text-[#2c8fc0] text-sm font-medium transition-colors"
                    >
                      View Details
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
                      <p>No customers found</p>
                      {searchTerm && (
                        <button 
                          onClick={() => setSearchTerm('')}
                          className="text-sm text-[#33a8da] hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#33a8da] transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = page;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-[#33a8da] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-[#33a8da]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#33a8da] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}