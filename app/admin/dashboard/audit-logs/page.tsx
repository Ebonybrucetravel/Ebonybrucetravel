'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listAuditLogs } from '@/lib/adminApi';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';

// Update interface to match your actual API response
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filter, setFilter] = useState<string>('all');
  const logsPerPage = 20;

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin');
          return;
        }

        const response = await listAuditLogs({
          page,
          limit: logsPerPage
        });

        if (response.success && response.data) {
          setAuditLogs(response.data);
          setTotalLogs(response.meta?.total || response.data.length);
        } else {
          throw new Error(response.message || 'Failed to fetch audit logs');
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch audit logs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, [page, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getActionIcon = (action: string) => {
    switch(action) {
      case 'CREATE_ADMIN_USER': return '👑';
      case 'CHANGE_PASSWORD': return '🔑';
      case 'LOGIN': return '🔓';
      case 'LOGOUT': return '🚪';
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      default: return '📋';
    }
  };

  const getActionColor = (action: string) => {
    switch(action) {
      case 'CREATE_ADMIN_USER': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'CHANGE_PASSWORD': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'LOGIN': return 'text-green-600 bg-green-50 border-green-200';
      case 'LOGOUT': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'CREATE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'UPDATE': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredLogs = filter === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.action === filter);

  if (isLoading) return <LoadingSpinner />;
  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600">
        <p className="font-semibold">Error loading audit logs</p>
        <p className="text-sm mt-1">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Audit Logs</h2>
            <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">
              Complete history of all actions ({totalLogs} total)
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard/security')}
            className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-200 transition flex items-center gap-2"
          >
            ← Back to Security
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500">Filter by action:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
          >
            <option value="all">All Actions</option>
            <option value="CREATE_ADMIN_USER">Create Admin</option>
            <option value="CHANGE_PASSWORD">Change Password</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider">Action</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider">Entity</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider">IP Address</th>
                <th className="text-left py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <tr 
                  key={log.id} 
                  className="hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => router.push(`/admin/dashboard/audit-logs/${log.id}`)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${getActionColor(log.action)} flex items-center justify-center text-base border`}>
                        {getActionIcon(log.action)}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <span className="text-sm text-gray-900">{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-xs text-gray-400 block mt-0.5 font-mono">
                          {log.entityId.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <span className="text-sm text-gray-900">{log.user?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-400 block mt-0.5">{log.user?.email}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      log.user?.role === 'SUPER_ADMIN' 
                        ? 'bg-purple-50 text-purple-600 border border-purple-200'
                        : log.user?.role === 'ADMIN'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {log.user?.role || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">{log.ipAddress || 'N/A'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-500">{formatDate(log.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              📭
            </div>
            <h4 className="text-base font-black text-gray-900 mb-2">No Logs Found</h4>
            <p className="text-sm text-gray-400 font-medium">
              No audit logs match your current filter
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalLogs > logsPerPage && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition ${
                page === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-400 font-medium">
              Page {page} of {Math.ceil(totalLogs / logsPerPage)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(totalLogs / logsPerPage)}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition ${
                page >= Math.ceil(totalLogs / logsPerPage)
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}