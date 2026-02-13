'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { AuthProvider } from '@/context/AuthContext';
import { SearchProvider } from '@/context/SearchContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SearchProvider>{children}</SearchProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
