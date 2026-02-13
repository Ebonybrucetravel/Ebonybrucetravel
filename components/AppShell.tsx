'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Newsletter from '@/components/Newsletter';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import AIAssistant from '@/components/AIAssistant';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, logout, updateUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isAiOpen, setIsAiOpen] = useState(false);

  // ── Auth modal state (popup overlay, synced with route) ───
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  const isAuthRoute = authRoutes.includes(pathname);
  const authMode = pathname === '/register' ? 'register'
    : pathname === '/forgot-password' ? 'forgot-password'
    : pathname === '/reset-password' ? 'reset-password'
    : pathname === '/verify-email' ? 'verify-email'
    : 'login';

  // Store the page the user was on before opening auth
  useEffect(() => {
    if (!isAuthRoute && pathname !== '/') {
      sessionStorage.setItem('authReturnTo', pathname);
    }
  }, [pathname, isAuthRoute]);

  const openAuth = (mode: 'login' | 'register') => {
    // Remember current page before navigating to auth route
    sessionStorage.setItem('authReturnTo', pathname);
    router.push(`/${mode}`);
  };

  const closeAuth = () => {
    const returnTo = sessionStorage.getItem('authReturnTo') || '/';
    sessionStorage.removeItem('authReturnTo');
    router.push(returnTo);
  };

  const handleAuthSuccess = () => {
    const returnTo = sessionStorage.getItem('authReturnTo') || '/';
    sessionStorage.removeItem('authReturnTo');
    // Full navigation to refresh auth state
    window.location.href = returnTo;
  };

  // Derive active tab from the current pathname
  const activeTab: 'flights' | 'hotels' | 'cars' = pathname.startsWith('/hotels')
    ? 'hotels'
    : pathname.startsWith('/cars')
      ? 'cars'
      : 'flights';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        isLoggedIn={isLoggedIn}
        user={user ?? { name: '', email: '' }}
        activeTab={activeTab}
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

      {/* Auth popup overlay — shown when on an auth route */}
      {isAuthRoute && (
        <AuthModal
          initialMode={authMode as any}
          onSuccess={handleAuthSuccess}
          onClose={closeAuth}
        />
      )}

      {isLoggedIn && (
        <button
          onClick={() => setIsAiOpen(!isAiOpen)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#33a8da] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition z-50"
          aria-label="Open AI Assistant"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {isAiOpen && <AIAssistant onClose={() => setIsAiOpen(false)} user={user ?? undefined} />}
    </div>
  );
}
