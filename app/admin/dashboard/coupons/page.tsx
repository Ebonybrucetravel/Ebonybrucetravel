'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { listVouchers, cancelVoucher } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

interface Coupon {
  id: string;
  customer: string;
  code: string;
  expiry: string;
  minSpend: string;
  type: string;
  status: string;
}

export default function CouponsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    const fetchCoupons = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        const params: any = {
          page,
          limit,
        };

        if (statusFilter !== 'All') {
          params.status = statusFilter.toLowerCase();
        }

        if (searchTerm) {
          params.search = searchTerm;
        }

        const response = await listVouchers(params);
        
        if (response.success && response.data) {
          // Transform API data to match your Coupon interface
          const transformedCoupons = response.data.map((item: any) => ({
            id: item.id,
            customer: item.user?.name || item.customerName || 'Unknown',
            code: item.code || 'N/A',
            expiry: item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            }) : 'N/A',
            minSpend: item.minSpend ? `$${item.minSpend.toLocaleString()}` : '$0',
            type: item.type || 'All',
            status: item.status === 'active' ? 'Active' : 'Expired',
          }));
          
          setCoupons(transformedCoupons);
          setTotalPages(response.meta?.totalPages || 1);
        } else {
          // Fallback to mock data if API fails
          setCoupons(getMockCoupons());
        }
      } catch (err) {
        console.error('Error fetching coupons:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch coupons');
        // Fallback to mock data
        setCoupons(getMockCoupons());
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoupons();
  }, [page, statusFilter, searchTerm, router]);

  // Mock data function for development/fallback
  const getMockCoupons = (): Coupon[] => {
    return [
      { 
        id: 'c1', 
        customer: 'John Dane', 
        code: 'WINTER20', 
        expiry: '2026-12-30', 
        minSpend: '$50.00', 
        type: 'Flight', 
        status: 'Active' 
      },
      { 
        id: 'c2', 
        customer: 'Anna Lee', 
        code: 'SAVE50', 
        expiry: '2024-01-12', 
        minSpend: '$100.00', 
        type: 'Hotel', 
        status: 'Expired' 
      },
      { 
        id: 'c3', 
        customer: 'Michael Smith', 
        code: 'SUMMER25', 
        expiry: '2026-08-31', 
        minSpend: '$75.00', 
        type: 'Car Rental', 
        status: 'Active' 
      },
      { 
        id: 'c4', 
        customer: 'Sarah Jenkins', 
        code: 'WELCOME10', 
        expiry: '2026-12-31', 
        minSpend: '$25.00', 
        type: 'All', 
        status: 'Active' 
      },
    ];
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = searchTerm === '' || 
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchTerm, statusFilter]);

  const downloadCSV = () => {
    if (!filteredCoupons.length) return;
    
    const headers = ['Customer', 'Code', 'Expiry', 'Min Spend', 'Type', 'Status'];
    const csvRows = [
      headers.join(','),
      ...filteredCoupons.map(row => 
        [row.customer, row.code, row.expiry, row.minSpend, row.type, row.status]
          .map(value => `"${value}"`).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `coupons-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // TODO: Implement actual API call using your adminApi
    // const response = await createVoucher({
    //   customer: formData.get('customer'),
    //   code: formData.get('code'),
    //   expiresAt: formData.get('expiry'),
    //   minSpend: Number(formData.get('minSpend')),
    //   type: formData.get('type'),
    // });
    
    alert('Coupon created successfully!');
    setShowModal(false);
    // Refresh the list
    setPage(1);
  };

  const handleCancelCoupon = async (id: string) => {
    if (confirm('Are you sure you want to cancel this coupon?')) {
      try {
        await cancelVoucher(id);
        alert('Coupon cancelled successfully');
        // Refresh the list
        setPage(1);
      } catch (err) {
        alert('Failed to cancel coupon');
      }
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Coupons
          </h1>
          <p className="text-gray-500 mt-2">Manage promotional campaigns</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadCSV}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-[#33a8da] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button 
            onClick={() => setShowModal(true)} 
            className="px-6 py-2.5 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 4v16m8-8H4" />
            </svg>
            New Coupon
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
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by code or customer..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
              />
            </div>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {['All', 'Active', 'Expired'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === filter
                      ? 'bg-white text-[#33a8da] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Showing {filteredCoupons.length} coupons
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Min Spend</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCoupons.length > 0 ? filteredCoupons.map((coupon, i) => (
                <tr key={coupon.id || i} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{coupon.customer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[#33a8da]">{coupon.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{coupon.expiry}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{coupon.minSpend}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{coupon.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      coupon.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {coupon.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {coupon.status === 'Active' && (
                      <button
                        onClick={() => handleCancelCoupon(coupon.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <p>No coupons found</p>
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
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50 hover:border-[#33a8da] transition"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-50 hover:border-[#33a8da] transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <form onSubmit={handleCreateCoupon}>
              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Coupon</h2>
                  <p className="text-sm text-gray-500 mt-1">Generate a new promotional code</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Customer</label>
                  <input
                    name="customer"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
                  <input
                    name="code"
                    required
                    placeholder="SUMMER2024"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-[#33a8da] focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da] uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                    <input
                      name="expiry"
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Spend ($)</label>
                    <input
                      name="minSpend"
                      required
                      type="number"
                      placeholder="50"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                  <select
                    name="type"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}