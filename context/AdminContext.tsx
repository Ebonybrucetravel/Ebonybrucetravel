'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  phone?: string | null;
  image?: string | null;
  permissions?: Record<string, boolean>;
}

interface AdminContextValue {
  user: AdminUser | null;
  role: AdminRole | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  refresh: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    try {
      const raw = localStorage.getItem('adminUser');
      if (!raw) {
        setUser(null);
        return;
      }
      const parsed = JSON.parse(raw) as AdminUser;
      const role = (parsed.role ?? '').toUpperCase() as AdminRole;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        setUser(null);
        return;
      }
      setUser({ ...parsed, role });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    setIsLoading(false);
  }, [refresh]);

  const role = user?.role ?? null;
  const isSuperAdmin = role === 'SUPER_ADMIN';

  return (
    <AdminContext.Provider
      value={{
        user,
        role,
        isSuperAdmin,
        isLoading,
        refresh,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
