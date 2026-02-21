'use client';

import { useState, useEffect } from 'react';
import { listCustomers, listBookings, listVouchers } from '@/lib/adminApi';

export function useAdminData<T>(
  fetchFn: () => Promise<any>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchFn();
        if (response.success && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  return { data, isLoading, error };
}

// Export fetch functions for different data types
export const fetchUsers = async () => {
  return await listCustomers({ page: 1, limit: 100 });
};

export const fetchBookings = async () => {
  return await listBookings({ page: 1, limit: 100 });
};

export const fetchCoupons = async () => {
  return await listVouchers({ page: 1, limit: 100 });
};