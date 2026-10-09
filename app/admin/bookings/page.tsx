'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Booking {
  id: string;
  reference: string;
  status: string;
  productType: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function AdminBookingsListPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/bookings?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = await res.json();
        setBookings(json.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) return <div className="p-8">Loading bookings...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">All Bookings</h1>
      <table className="w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm">Reference</th>
            <th className="px-4 py-2 text-left text-sm">Customer</th>
            <th className="px-4 py-2 text-left text-sm">Type</th>
            <th className="px-4 py-2 text-left text-sm">Status</th>
            <th className="px-4 py-2 text-left text-sm">Amount</th>
            <th className="px-4 py-2 text-left text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="px-4 py-2 font-mono text-sm">{b.reference}</td>
              <td className="px-4 py-2 text-sm">
                {b.user?.name}<br />
                <span className="text-gray-500 text-xs">{b.user?.email}</span>
              </td>
              <td className="px-4 py-2 text-sm">{b.productType}</td>
              <td className="px-4 py-2 text-sm">{b.status}</td>
              <td className="px-4 py-2 text-sm">{b.currency} {b.totalAmount}</td>
              <td className="px-4 py-2 text-sm">
                <Link
                  href={`/admin/bookings/${b.id}`}
                  className="text-blue-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}