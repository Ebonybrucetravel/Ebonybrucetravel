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
  isInitialized: boolean;
  refresh: () => void;
  updateUser: (userData: Partial<AdminUser>) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user from localStorage
  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const raw = localStorage.getItem('adminUser');
      if (!raw) {
        setUserState(null);
        return;
      }
      const parsed = JSON.parse(raw) as AdminUser;
      const role = (parsed.role ?? '').toUpperCase() as AdminRole;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        setUserState(null);
        return;
      }
      setUserState({ ...parsed, role });
    } catch (error) {
      console.error('Failed to parse admin user:', error);
      setUserState(null);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Update user
  const updateUser = useCallback((userData: Partial<AdminUser>) => {
    setUserState(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminUser', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // FIXED: Proper logout that clears ALL admin-related storage
  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear admin user data
      localStorage.removeItem('adminUser');
      // Clear admin token if stored separately
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      // Clear any session storage
      sessionStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminUser');
      
      // Dispatch event for other tabs
      window.dispatchEvent(new CustomEvent('admin-logout'));
    }
    setUserState(null);
    
    // Optional: Redirect to admin login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  }, []);

  // Listen for logout events from other tabs
  useEffect(() => {
    const handleAdminLogout = () => {
      console.log('Admin logout event received from another tab');
      setUserState(null);
    };
    
    window.addEventListener('admin-logout', handleAdminLogout);
    
    return () => {
      window.removeEventListener('admin-logout', handleAdminLogout);
    };
  }, []);

  // Check permission
  const hasPermission = useCallback((permission: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions?.[permission] ?? false;
  }, [user]);

  // Check token validity on mount
  useEffect(() => {
    const validateToken = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      
      if (!token && user) {
        // Token missing but user exists - inconsistent state
        console.warn('Token missing but user found - logging out');
        logout();
      }
    };
    
    validateToken();
  }, [user, logout]);

  useEffect(() => {
    refresh();
    setIsLoading(false);
  }, [refresh]);

  const role = user?.role ?? null;
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Don't render children until initialized
  if (!isInitialized && isLoading) {
    return null; // or a loading spinner
  }

  return (
    <AdminContext.Provider
      value={{
        user,
        role,
        isSuperAdmin,
        isLoading,
        isInitialized,
        refresh,
        updateUser,
        logout,
        hasPermission,
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