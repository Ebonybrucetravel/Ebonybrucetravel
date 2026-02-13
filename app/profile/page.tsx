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

  return (
    <Profile
      user={user}
      initialActiveTab={tab}
      onTabChange={(newTab: string) => router.push(`/profile?tab=${newTab}`, { scroll: false })}
      onBack={() => router.push('/')}
      onSignOut={() => { logout(); router.push('/'); }}
      onUpdateUser={updateUser}
      onBookItem={(item: any) => router.push('/search')}
    />
  );
}
