'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard/analytics');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fbfe]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#33a8da]" />
    </div>
  );
}
