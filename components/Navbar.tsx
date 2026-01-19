'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';

// Import types from your context
type LanguageCode = 'EN' | 'FR' | 'ES' | 'DE' | 'ZH';
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NGN' | 'JPY' | 'CNY';

interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  defaultCurrencyCode: CurrencyCode;
}

interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'EN', name: 'English', flag: 'https://flagcdn.com/w20/us.png', defaultCurrencyCode: 'USD' },
  { code: 'FR', name: 'Français', flag: 'https://flagcdn.com/w20/fr.png', defaultCurrencyCode: 'EUR' },
  { code: 'ES', name: 'Español', flag: 'https://flagcdn.com/w20/es.png', defaultCurrencyCode: 'EUR' },
  { code: 'DE', name: 'Deutsch', flag: 'https://flagcdn.com/w20/de.png', defaultCurrencyCode: 'EUR' },
  { code: 'ZH', name: '中文', flag: 'https://flagcdn.com/w20/cn.png', defaultCurrencyCode: 'CNY' },
];

const currencies: Currency[] = [
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: 'https://flagcdn.com/w20/ng.png' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: 'https://flagcdn.com/w20/us.png' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: 'https://flagcdn.com/w20/eu.png' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: 'https://flagcdn.com/w20/gb.png' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: 'https://flagcdn.com/w20/jp.png' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: 'https://flagcdn.com/w20/cn.png' },
];

interface NavbarProps {
  isLoggedIn?: boolean;
  user?: { name: string; email: string; profilePicture?: string };
  activeTab?: 'flights' | 'hotels' | 'cars';
  onSignIn?: () => void;
  onRegister?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
  onTabClick?: (tab: 'flights' | 'hotels' | 'cars') => void;
  onMenuClick?: () => void;
  onSignOut?: () => void;
  onProfileTabSelect?: (tabId: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  isLoggedIn,
  user,
  activeTab = 'flights',
  onSignIn,
  onRegister,
  onProfileClick,
  onLogoClick,
  onTabClick,
  onMenuClick,
  onSignOut,
  onProfileTabSelect
}) => {
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();

  const selectedLang = languages.find((l) => l.code === language) || languages[0];
  const currencyCode = currency.code as CurrencyCode;
  const selectedCurrency = currencies.find((c) => c.code === currencyCode) || currencies[1];

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang.code);
    const matchingCurrency = currencies.find((c) => c.code === lang.defaultCurrencyCode);
    if (matchingCurrency) {
      setCurrency({
        code: matchingCurrency.code,
        symbol: matchingCurrency.symbol,
        name: matchingCurrency.name,
      });
    }
    setIsLangOpen(false);
  };

  const handleCurrencySelect = (curr: Currency) => {
    setCurrency({
      code: curr.code,
      symbol: curr.symbol,
      name: curr.name,
    });
    setIsCurrencyOpen(false);
  };

  const handleTabClick = (tab: 'flights' | 'hotels' | 'cars') => {
    if (onTabClick) {
      onTabClick(tab);
    }
    setIsMobileMenuOpen(false);
  };

  const handleProfileDropdownItemClick = (tabId: string) => {
    if (onProfileTabSelect) onProfileTabSelect(tabId);
    setIsProfileMenuOpen(false);
  };

  const getAvatarFallback = (): string => {
    if (user?.name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=32A6D7&color=fff`;
    }
    return 'https://ui-avatars.com/api/?name=User&background=32A6D7&color=fff';
  };

  const avatarUrl = user?.profilePicture || getAvatarFallback();

  // Profile menu items from new code
  const profileMenuItems = [
    { id: 'details', label: 'My Profile', icon: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { id: 'bookings', label: 'My Bookings', icon: <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745V20a2 2 0 002 2h14a2 2 0 002-2v-6.745zM16 8V5a3 3 0 00-6 0v3h6z" /> },
    { id: 'saved', label: 'Saved Items', icon: <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /> },
    { id: 'payment', label: 'Payment Methods', icon: <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
    { id: 'rewards', label: 'Rewards & Points', icon: <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
    { id: 'travelers', label: 'Other Travelers', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m16 0h2a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4h-2m-1-10a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" /> },
    { id: 'preferences', label: 'Preferences', icon: <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /> },
    { id: 'security', label: 'Security Settings', icon: <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /> },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-4">
          {/* Logo Section */}
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer group bg-transparent border-none p-0 m-0 focus:outline-none"
            onClick={() => onLogoClick?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onLogoClick?.();
              }
            }}
          >
            <Image
              src="/images/logo1.png"
              alt="Ebony Bruce Travels Logo"
              width={100}
              height={40}
              className="object-contain"
            />
          </button>

          {/* Desktop Navigation */}
          <div className={`hidden lg:flex items-center space-x-8 ${!isLoggedIn ? 'flex-1 justify-center' : ''}`}>
            {['flights', 'hotels', 'cars'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab as any)}
                className={`font-bold text-sm uppercase tracking-tight relative py-1 transition-colors duration-200 ${
                  activeTab === tab ? 'text-[#32A6D7]' : 'text-gray-500 hover:text-[#32A6D7]'
                }`}
              >
                {t?.('nav.flights') || tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#32A6D7] rounded-full animate-in fade-in duration-300"></span>
                )}
              </button>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Language & Currency Selectors */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => { setIsLangOpen(!isLangOpen); setIsCurrencyOpen(false); setIsProfileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${
                    isLangOpen ? 'bg-blue-50 border-blue-100' : 'bg-transparent border-transparent hover:bg-gray-50'
                  }`}
                  aria-label="Select language"
                  aria-expanded={isLangOpen}
                >
                  {/* Use regular img tag for external images */}
                  <img
                    src={selectedLang.flag}
                    className="w-5 h-3.5 rounded shadow-sm"
                    alt={`${selectedLang.name} flag`}
                  />
                  <span className="text-xs font-bold text-gray-700 hidden md:inline">{selectedLang.code}</span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isLangOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 space-y-1">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageSelect(lang)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all ${
                            language === lang.code ? 'bg-blue-50 text-[#32A6D7]' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Use regular img tag for external images */}
                            <img
                              src={lang.flag}
                              className="w-6 h-4 rounded"
                              alt={`${lang.name} flag`}
                            />
                            <span className="text-xs font-bold">{lang.name}</span>
                          </div>
                          {language === lang.code && (
                            <svg className="w-4 h-4 text-[#32A6D7]" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Currency Selector */}
              <div className="relative" ref={currencyRef}>
                <button
                  onClick={() => { setIsCurrencyOpen(!isCurrencyOpen); setIsLangOpen(false); setIsProfileMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${
                    isCurrencyOpen ? 'bg-blue-50 border-blue-100' : 'bg-transparent border-transparent hover:bg-gray-50'
                  }`}
                  aria-label="Select currency"
                  aria-expanded={isCurrencyOpen}
                >
                  {/* Use regular img tag for external images */}
                  <img
                    src={selectedCurrency.flag}
                    className="w-5 h-3.5 rounded shadow-sm"
                    alt={`${selectedCurrency.name} flag`}
                  />
                  <span className="text-xs font-bold text-gray-700">{selectedCurrency.code}</span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${isCurrencyOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCurrencyOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 space-y-1">
                      {currencies.map((curr) => (
                        <button
                          key={curr.code}
                          onClick={() => handleCurrencySelect(curr)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all ${
                            currencyCode === curr.code ? 'bg-blue-50 text-[#32A6D7]' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Use regular img tag for external images */}
                            <img
                              src={curr.flag}
                              className="w-6 h-4 rounded"
                              alt={`${curr.name} flag`}
                            />
                            <div className="flex flex-col items-start">
                              <span className="text-xs font-bold">{curr.code}</span>
                              <span className="text-[10px] text-gray-400">{curr.name}</span>
                            </div>
                          </div>
                          {currencyCode === curr.code && (
                            <svg className="w-4 h-4 text-[#32A6D7]" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User/Auth Section */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2 relative" ref={profileRef}>
                <button 
                  onClick={onMenuClick}
                  className="lg:hidden p-2.5 bg-gray-50 text-gray-500 hover:text-[#32A6D7] rounded-xl transition-all active:scale-95"
                  aria-label="Toggle menu"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={`w-11 h-11 rounded-full bg-gradient-to-br from-[#32A6D7] to-[#2c95c2] flex items-center justify-center border-2 shadow-md hover:scale-105 transition-all overflow-hidden ${
                    isProfileMenuOpen ? 'border-blue-400 scale-105 ring-4 ring-blue-50' : 'border-white'
                  }`}
                  aria-label="User profile"
                >
                  <img
                    src={avatarUrl}
                    alt={user?.name || 'User avatar'}
                    className="w-full h-full object-cover"
                    width={44}
                    height={44}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getAvatarFallback();
                    }}
                  />
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute top-full right-0 mt-3 w-72 bg-white border border-gray-100 rounded-[28px] shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-4">
                    <div className="p-6 bg-[#f8fbfe] border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden">
                          <img
                            src={avatarUrl}
                            alt={user?.name || 'User avatar'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate tracking-tight">
                            {user?.name || 'Ebony Bruce'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold truncate tracking-wider uppercase">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2 max-h-[440px] overflow-y-auto hide-scrollbar space-y-0.5">
                      {profileMenuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleProfileDropdownItemClick(item.id)}
                          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-[#f0f9ff] group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-[#33a8da] transition-all">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              {item.icon}
                            </svg>
                          </div>
                          <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">
                            {item.label}
                          </span>
                        </button>
                      ))}
                      <div className="pt-2 mt-2 border-t border-gray-50 px-2 pb-2">
                        <button
                          onClick={() => { onSignOut?.(); setIsProfileMenuOpen(false); }}
                          className="w-full flex items-center gap-4 px-2 py-3 rounded-xl transition-all hover:bg-red-50 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-50/30 flex items-center justify-center text-red-400 group-hover:text-red-600 transition-all">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </div>
                          <span className="text-xs font-bold text-red-500 group-hover:text-red-600">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 text-sm font-bold text-gray-700 hover:text-[#32A6D7] transition uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2 rounded-lg"
                >
                  {t?.('nav.signIn') || 'Sign In'}
                </button>
                <button
                  onClick={onRegister}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#32A6D7] to-[#2c95c2] text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all uppercase tracking-tight active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
                >
                  {t?.('nav.register') || 'Register'}
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 text-gray-400 hover:text-[#32A6D7] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
                  aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Menu (Un-authed) */}
      {isMobileMenuOpen && !isLoggedIn && (
        <div className="lg:hidden bg-white border-t border-gray-50 animate-in slide-in-from-top duration-300 shadow-xl overflow-hidden">
          <div className="px-6 py-8 space-y-4">
            {['flights', 'hotels', 'cars'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab as any)}
                className={`w-full flex items-center px-4 py-4 font-bold rounded-2xl transition ${
                  activeTab === tab ? 'bg-blue-50 text-[#32A6D7]' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t?.('nav.flights') || tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  onSignIn?.();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-4 font-bold text-gray-700 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
              >
                {t?.('nav.signIn') || 'Sign In'}
              </button>
              <button
                onClick={() => {
                  onRegister?.();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-4 font-bold text-white bg-gradient-to-r from-[#32A6D7] to-[#2c95c2] rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                {t?.('nav.register') || 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;