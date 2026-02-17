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

  // ✅ COMPLETE transformation - convert ALL nullable fields to undefined
  const transformedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    // Handle all optional fields with null coalescing
    image: user.image ?? undefined,
    profilePicture: user.profilePicture ?? undefined,
    avatar: user.avatar ?? undefined,
    dateOfBirth: user.dateOfBirth ?? undefined,
    dob: user.dob ?? undefined,
    gender: user.gender ?? undefined,
    phone: user.phone ?? undefined,
    address: user.address ?? undefined,
    city: user.city ?? undefined,
    country: user.country ?? undefined,
    postalCode: user.postalCode ?? undefined,
    provider: user.provider,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    token: user.token ?? undefined,
    isVerified: user.isVerified,
  };

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