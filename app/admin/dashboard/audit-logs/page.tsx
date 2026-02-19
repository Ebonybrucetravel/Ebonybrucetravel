'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';
import AdminAuditLogs from '@/components/admin/AdminAuditLogs';

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading } = useAdmin();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace('/admin/dashboard/analytics');
    }
  }, [isSuperAdmin, isLoading, router]);

  if (isLoading || !isSuperAdmin) return null;
  return <AdminAuditLogs />;
}
