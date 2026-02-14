'use client';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { SearchProvider } from '@/context/SearchContext';
export default function Providers({ children }: {
    children: ReactNode;
}) {
    return (<LanguageProvider>
      <AuthProvider>
        <SearchProvider>
          {children}
          <Toaster position="top-center" toastOptions={{
            duration: 4000,
            style: { background: '#1e293b', color: '#f8fafc', borderRadius: '12px' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#f8fafc' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } },
        }}/>
        </SearchProvider>
      </AuthProvider>
    </LanguageProvider>);
}
