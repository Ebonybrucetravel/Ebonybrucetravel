'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Newsletter from '@/components/Newsletter';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, logout, updateUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Admin routes: no main site nav/footer, full-screen admin UI
  const isAdminRoute = pathname?.startsWith('/admin');

  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  const isAuthRoute = authRoutes.includes(pathname);
  const authMode = pathname === '/register' ? 'register'
    : pathname === '/forgot-password' ? 'forgot-password'
    : pathname === '/reset-password' ? 'reset-password'
    : pathname === '/verify-email' ? 'verify-email'
    : 'login';

  // ✅ Read the token from the URL (query string + hash fallback)
  const [authToken, setAuthToken] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthRoute) return;

    let t = '';

    const params = new URLSearchParams(window.location.search);
    t = params.get('token') || '';

    if (!t && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      t = hashParams.get('token') || '';
    }

    console.log('🔍 [AppShell] Auth route:', pathname);
    console.log('🔍 [AppShell] Token from URL:', t ? t.substring(0, 16) + '...' : '(empty)');

    setAuthToken(t);
  }, [pathname, isAuthRoute]);

  const openAuth = (mode: 'login' | 'register') => {
    sessionStorage.setItem('authReturnTo', pathname);
    router.push(`/${mode}`);
  };

  const closeAuth = () => {
    const returnTo = sessionStorage.getItem('authReturnTo') || '/';
    sessionStorage.removeItem('authReturnTo');
    router.push(returnTo);
  };

  const handleAuthSuccess = (userData: { name: string; email: string; token?: string; expiresIn?: number }) => {
    if (updateUser) updateUser(userData);
    const returnTo = sessionStorage.getItem('authReturnTo') || '/';
    sessionStorage.removeItem('authReturnTo');
    window.location.href = returnTo;
  };



  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
  isLoggedIn={isLoggedIn}
  user={user ?? { name: '', email: '' }}
  onSignIn={() => openAuth('login')}
        onRegister={() => openAuth('register')}
        onLogoClick={() => router.push('/')}
        onTabClick={(tab) => router.push(`/${tab}`)}
        onProfileClick={() => router.push('/profile')}
        onSignOut={() => { logout(); router.push('/'); }}
        onProfileTabSelect={(tab: string) => router.push(`/profile?tab=${tab}`)}
      />

      <main className="flex-1">{children}</main>

      <Newsletter />
      <Footer
        onLogoClick={() => router.push('/')}
        onAdminClick={() => router.push('/admin')}
      />

      {isAuthRoute && (
        <AuthModal
          isOpen={isAuthRoute}
          initialMode={authMode}
          resetToken={authToken}
          onLoginSuccess={handleAuthSuccess}
          onClose={closeAuth}
        />
      )}
      
    </div>
  );
}