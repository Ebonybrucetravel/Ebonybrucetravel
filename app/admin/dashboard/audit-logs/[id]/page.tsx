'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listAuditLogs } from '@/lib/adminApi';

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

export default function AdminSecurity() {
  const router = useRouter();
  const [faStep, setFaStep] = useState<'info' | 'otp' | 'success'>('info');
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const response = await listAuditLogs({
          limit: 5
        });

        if (response.success && response.data) {
          setRecentLogs(response.data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching recent logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentLogs();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
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
      case 'CREATE_ADMIN_USER': return 'text-purple-600 bg-purple-50';
      case 'CHANGE_PASSWORD': return 'text-amber-600 bg-amber-50';
      case 'LOGIN': return 'text-green-600 bg-green-50';
      case 'LOGOUT': return 'text-gray-600 bg-gray-50';
      case 'CREATE': return 'text-blue-600 bg-blue-50';
      case 'UPDATE': return 'text-amber-600 bg-amber-50';
      case 'DELETE': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 p-6 lg:p-10 max-w-6xl">
      <div className="mb-12">
        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Security Center</h2>
        <p className="text-sm text-gray-400 font-bold mt-2 uppercase tracking-widest">Admin account protection</p>
      </div>

      {/* 2FA and Password Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl mb-6">🔐</div>
          <h3 className="text-lg font-black text-gray-900 mb-2">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">
            Add an extra layer of security to your administrative account. 2FA configuration is managed server-side.
          </p>
          <button
            type="button"
            onClick={() => setFaStep('otp')}
            className="w-full bg-[#33a8da] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#2c98c7] transition"
          >
            Configure 2FA
          </button>
        </div>
        <div className="bg-white rounded-[32px] p-10 shadow-sm border border-gray-100">
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl mb-6">🔑</div>
          <h3 className="text-lg font-black text-gray-900 mb-2">Password Rotation</h3>
          <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">
            It is recommended to update your password every 90 days. Use the password reset flow to change your key.
          </p>
          <a
            href="/reset-password"
            className="block w-full text-center border-2 border-gray-100 text-gray-400 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:border-gray-200 transition"
          >
            Change Password
          </a>
        </div>
      </div>

    

      {/* 2FA Modal */}
      {faStep === 'otp' && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setFaStep('info')}
        >
          <div
            className="bg-[#000814] w-full max-w-[440px] rounded-[40px] border border-white/10 p-16 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-10 border border-blue-500/20 text-3xl">
              📱
            </div>
            <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Security Check</h2>
            <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
              Two-factor authentication setup is managed by the backend. Contact your system administrator to enable 2FA.
            </p>
            <button
              onClick={() => setFaStep('info')}
              className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}