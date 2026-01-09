'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';

interface Language {
  code: 'EN' | 'FR' | 'ES' | 'DE' | 'ZH';
  name: string;
  flag: string;
  defaultCurrencyCode: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

interface NavbarProps {
  isLoggedIn?: boolean;
  user?: { name: string; email: string; profilePicture?: string };
  onSignIn?: () => void;
  onRegister?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
}

const languages: Language[] = [
  { code: 'EN', name: 'English', flag: '/flags/us.png', defaultCurrencyCode: 'USD' },
  { code: 'FR', name: 'Français', flag: '/flags/fr.png', defaultCurrencyCode: 'EUR' },
  { code: 'ES', name: 'Español', flag: '/flags/es.png', defaultCurrencyCode: 'EUR' },
  { code: 'DE', name: 'Deutsch', flag: '/flags/de.png', defaultCurrencyCode: 'EUR' },
  { code: 'ZH', name: '中文', flag: '/flags/cn.png', defaultCurrencyCode: 'CNY' },
];

const currencies: Currency[] = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '/flags/ng.png' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '/flags/us.png' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '/flags/eu.png' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '/flags/gb.png' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '/flags/jp.png' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '/flags/cn.png' },
];

const Navbar: React.FC<NavbarProps> = ({
  isLoggedIn,
  user,
  onSignIn,
  onRegister,
  onProfileClick,
  onLogoClick
}) => {
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();

  const selectedLang = languages.find(l => l.code === language) || languages[0];
  const selectedCurrency = currencies.find(c => c.code === currency?.code) || currencies[1];

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) setIsLangOpen(false);
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) setIsCurrencyOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang.code);
    const defaultCurr = currencies.find(c => c.code === lang.defaultCurrencyCode);
    if (defaultCurr) setCurrency(defaultCurr);
    setIsLangOpen(false);
  };

  const handleCurrencySelect = (curr: Currency) => {
    setCurrency(curr);
    setIsCurrencyOpen(false);
  };

  const getAvatarFallback = () => {
    if (user?.name) {
      const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=2563EB&color=fff`;
    }
    return 'https://ui-avatars.com/api/?name=US&background=2563EB&color=fff';
  };

  const avatarUrl = user?.profilePicture || getAvatarFallback();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => { onLogoClick?.(); setIsMobileMenuOpen(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onLogoClick?.(); setIsMobileMenuOpen(false); }}}
          >
            <Image src="/images/logo1.png" alt="Logo" width={120} height={40} />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <button className="text-blue-600 font-bold hover:text-blue-700 transition-colors">{t?.('nav.flights') || 'Flights'}</button>
            <a href="#" className="text-gray-500 hover:text-blue-600 font-bold transition-colors">{t?.('nav.hotels') || 'Hotels'}</a>
            <a href="#" className="text-gray-500 hover:text-blue-600 font-bold transition-colors">{t?.('nav.cars') || 'Cars'}</a>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Language */}
            <div className="hidden sm:flex items-center gap-2 relative" ref={langRef}>
              <button onClick={() => { setIsLangOpen(!isLangOpen); setIsCurrencyOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-gray-50">
                <Image src={selectedLang.flag} alt={selectedLang.name} width={20} height={14} className="rounded" />
                <span className="text-sm font-bold text-gray-700">{selectedLang.code}</span>
              </button>
              {isLangOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg z-50">
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => handleLanguageSelect(lang)} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 rounded">
                      <Image src={lang.flag} alt={lang.name} width={20} height={14} className="rounded" />
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency */}
            <div className="hidden sm:flex items-center gap-2 relative" ref={currencyRef}>
              <button onClick={() => { setIsCurrencyOpen(!isCurrencyOpen); setIsLangOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-gray-50">
                <Image src={selectedCurrency.flag} alt={selectedCurrency.name} width={20} height={14} className="rounded" />
                <span className="text-sm font-bold text-gray-700">{selectedCurrency.code}</span>
              </button>
              {isCurrencyOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg z-50">
                  {currencies.map(curr => (
                    <button key={curr.code} onClick={() => handleCurrencySelect(curr)} className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-50 rounded">
                      <Image src={curr.flag} alt={curr.name} width={20} height={14} className="rounded" />
                      <span>{curr.code} ({curr.symbol})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Section */}
            {isLoggedIn ? (
              <button onClick={onProfileClick} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <Image src={avatarUrl} alt={user?.name || 'User'} width={40} height={40} />
              </button>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <button onClick={onSignIn} className="px-4 py-2 text-sm font-bold text-gray-700 hover:text-blue-600">Sign In</button>
                <button onClick={onRegister} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-blue-700">Register</button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-gray-500 hover:text-blue-600">
              {isMobileMenuOpen ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              ) : (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-50 shadow-xl">
          {/* Add mobile menu items similar to desktop */}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
