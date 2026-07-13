'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Profile from '@/components/Profile';

export default function ProfilePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLoggedIn, isLoading, user, logout, updateUser } = useAuth();
  const tab = params.get('tab') ?? 'details';

  // Not logged in → redirect to login
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      sessionStorage.setItem('authReturnTo', '/profile');
      router.push('/login');
    }
  }, [isLoading, isLoggedIn, router]);

  if (isLoading || !isLoggedIn || !user) return null;

  // ✅ Helper function to safely extract primitive values
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      // Handle {code, dateTime} objects
      if (value.code !== undefined) {
        return String(value.code);
      }
      if (value.dateTime !== undefined) {
        return String(value.dateTime);
      }
      if (value.name !== undefined) {
        return String(value.name);
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      // For any other object, return empty string
      return '';
    }
    return '';
  };

  // ✅ Helper for provider
  const safeProvider = (value: any): "email" | "google" | "facebook" | undefined => {
    const str = safeString(value).toLowerCase();
    if (str === 'email' || str === 'google' || str === 'facebook') {
      return str as "email" | "google" | "facebook";
    }
    return undefined;
  };

  // ✅ Helper for role
  const safeRole = (value: any): "user" | "admin" | "ADMIN" | "SUPER_ADMIN" | undefined => {
    const str = safeString(value).toUpperCase();
    if (str === 'USER') return 'user';
    if (str === 'ADMIN') return 'ADMIN';
    if (str === 'SUPER_ADMIN') return 'SUPER_ADMIN';
    return undefined;
  };

  // ✅ Transform user - ensure ALL fields are primitives
  const transformedUser = {
    id: safeString(user?.id) || '',
    name: safeString(user?.name) || safeString(user?.email)?.split('@')[0] || 'Guest',
    email: safeString(user?.email) || '',
    image: safeString(user?.image) || undefined,
    profilePicture: safeString(user?.profilePicture) || undefined,
    avatar: safeString(user?.avatar) || undefined,
    dateOfBirth: safeString(user?.dateOfBirth) || undefined,
    dob: safeString(user?.dob) || undefined,
    gender: safeString(user?.gender) || undefined,
    phone: safeString(user?.phone) || undefined,
    address: safeString(user?.address) || undefined,
    city: safeString(user?.city) || undefined,
    country: safeString(user?.country) || undefined,
    postalCode: safeString(user?.postalCode) || undefined,
    provider: safeProvider(user?.provider),
    role: safeRole(user?.role),
    createdAt: safeString(user?.createdAt) || undefined,
    updatedAt: safeString(user?.updatedAt) || undefined,
    token: safeString(user?.token) || undefined,
    isVerified: Boolean(user?.isVerified),
  };

  // ✅ DEBUG: Check if any field is still an object
  console.log('✅ Checking transformedUser for objects:');
  Object.keys(transformedUser).forEach(key => {
    const value = (transformedUser as any)[key];
    if (value && typeof value === 'object') {
      console.error(`❌ Field "${key}" is still an object:`, value);
    }
  });

  return (
    <Profile
      user={transformedUser}
      initialActiveTab={tab}
      onTabChange={(newTab: string) => router.push(`/profile?tab=${newTab}`, { scroll: false })}
      onBack={() => router.push('/')}
      onSignOut={() => { logout(); router.push('/'); }}
      onUpdateUser={updateUser}
      onBookItem={(item: any) => router.push('/search')}
    />
  );
}