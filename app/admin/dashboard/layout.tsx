'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import AdminLayout from '@/components/admin/AdminLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (!token || !user) {
      router.push('/admin');
      return;
    }
    try {
      const parsed = JSON.parse(user);
      const role = (parsed.role ?? '').toUpperCase();
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        router.push('/admin');
        return;
      }
    } catch {
      router.push('/admin');
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fbfe]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da]" />
      </div>
    );
  }

  return (
    <AdminProvider>
      <AdminLayout onLogout={handleLogout}>{children}</AdminLayout>
    </AdminProvider>
  );
}
