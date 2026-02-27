'use client';

import { useParams, useRouter } from 'next/navigation';
import AdminCustomerProfile from '@/components/admin/AdminCustomerProfile';

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  if (!id) {
    router.replace('/admin/dashboard/customers');
    return null;
  }

  return (
    <AdminCustomerProfile
      customerId={id}
      onBack={() => router.push('/admin/dashboard/customers')}
    />
  );
}