'use client';

import React, { createContext, useContext, useState } from 'react';

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface LanguageContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  language: string;
  setLanguage: (language: string) => void;
}

const defaultCurrency: Currency = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar'
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [language, setLanguage] = useState('en');

  return (
    <LanguageContext.Provider value={{ currency, setCurrency, language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}