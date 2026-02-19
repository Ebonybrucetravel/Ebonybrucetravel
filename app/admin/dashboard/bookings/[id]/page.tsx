'use client';

import { useParams, useRouter } from 'next/navigation';
import AdminBookingDetails from '@/components/admin/AdminBookingDetails';

export default function AdminBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  if (!id) {
    router.replace('/admin/dashboard/bookings');
    return null;
  }

  return (
    <AdminBookingDetails
      bookingId={id}
      onBack={() => router.push('/admin/dashboard/bookings')}
    />
  );
}
