'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import AdminUsers from '@/components/admin/AdminUsers';

export default function AdminUsersPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading } = useAdmin();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/admin/dashboard/analytics');
    }
  }, [isSuperAdmin, isLoading, router]);

  if (isLoading || !isSuperAdmin) return null;
  return <AdminUsers />;
}