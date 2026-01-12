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
  defaultCurrencyCode: CurrencyCode; // This should match the CurrencyCode type
}

interface Currency {
  code: CurrencyCode; // Changed from string to CurrencyCode
  name: string;
  symbol: string;
  flag: string;
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

interface NavbarProps {
  isLoggedIn?: boolean;
  user?: { name: string; email: string; profilePicture?: string };
  onSignIn?: () => void;
  onRegister?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
  onSearchClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  isLoggedIn,
  user,
  onSignIn,
  onRegister,
  onProfileClick,
  onLogoClick,
  onSearchClick,
}) => {
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();

  // Cast language to LanguageCode since useLanguage returns LanguageCode
  const selectedLang = languages.find((l) => l.code === language) || languages[0];
  
  // Cast currency.code to CurrencyCode
  const currencyCode = currency.code as CurrencyCode;
  const selectedCurrency = currencies.find((c) => c.code === currencyCode) || currencies[1];

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
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
        code: matchingCurrency.code, // This now matches CurrencyCode type
        symbol: matchingCurrency.symbol,
        name: matchingCurrency.name,
      });
    }
    setIsLangOpen(false);
  };

  const handleCurrencySelect = (curr: Currency) => {
    setCurrency({
      code: curr.code, // This now matches CurrencyCode type
      symbol: curr.symbol,
      name: curr.name,
    });
    setIsCurrencyOpen(false);
  };

  const getAvatarFallback = (): string => {
    if (user?.name) {
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=2563EB&color=fff`;
    }
    return 'https://ui-avatars.com/api/?name=US&background=2563EB&color=fff';
  };

  const avatarUrl = user?.profilePicture || getAvatarFallback();

  // Handle search click on Flights button
  const handleFlightsClick = () => {
    if (onSearchClick) {
      onSearchClick();
    } else if (onLogoClick) {
      onLogoClick();
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer group bg-transparent border-none p-0 m-0 focus:outline-none"
            onClick={() => {
              onLogoClick?.();
              setIsMobileMenuOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onLogoClick?.();
                setIsMobileMenuOpen(false);
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
          <div className="hidden lg:flex items-center space-x-8">
            <button
              onClick={handleFlightsClick}
              className="text-[#32A6D7] font-bold hover:text-[#2b91c1] transition-colors duration-200 relative py-1 group"
            >
              {t?.('nav.flights') || 'Flights'}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#32A6D7] rounded-full group-hover:w-full transition-all duration-300"></span>
            </button>
            <a
              href="#"
              className="text-gray-500 hover:text-[#32A6D7] font-bold transition-colors duration-200 relative py-1 group"
            >
              {t?.('nav.hotels') || 'Hotels'}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#32A6D7] rounded-full group-hover:w-full transition-all duration-300"></span>
            </a>
            <a
              href="#"
              className="text-gray-500 hover:text-[#32A6D7] font-bold transition-colors duration-200 relative py-1 group"
            >
              {t?.('nav.cars') || 'Cars'}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#32A6D7] rounded-full group-hover:w-full transition-all duration-300"></span>
            </a>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Language & Currency Selectors */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => {
                    setIsLangOpen(!isLangOpen);
                    setIsCurrencyOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border ${
                    isLangOpen
                      ? 'bg-blue-50 border-blue-100 ring-2 ring-blue-50'
                      : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-100'
                  }`}
                  aria-label="Select language"
                  aria-expanded={isLangOpen}
                >
                  <Image
                    src={selectedLang.flag}
                    className="rounded shadow-sm"
                    alt={`${selectedLang.name} flag`}
                    width={20}
                    height={14}
                  />
                  <span className="text-sm font-bold text-gray-700 hidden md:inline">
                    {selectedLang.code}
                  </span>
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
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-50 ring-1 ring-black/5">
                    <div className="p-2 space-y-1">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageSelect(lang)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all ${
                            language === lang.code ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Image
                              src={lang.flag}
                              className="rounded shadow-sm"
                              alt={`${lang.name} flag`}
                              width={24}
                              height={16}
                            />
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-bold">{lang.name}</span>
                              <span className="text-xs text-gray-500">{lang.code}</span>
                            </div>
                          </div>
                          {language === lang.code && (
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
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
                  onClick={() => {
                    setIsCurrencyOpen(!isCurrencyOpen);
                    setIsLangOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border ${
                    isCurrencyOpen
                      ? 'bg-blue-50 border-blue-100 ring-2 ring-blue-50'
                      : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-100'
                  }`}
                  aria-label="Select currency"
                  aria-expanded={isCurrencyOpen}
                >
                  <Image
                    src={selectedCurrency.flag}
                    className="rounded shadow-sm"
                    alt={`${selectedCurrency.name} flag`}
                    width={20}
                    height={14}
                  />
                  <span className="text-sm font-bold text-gray-700">{selectedCurrency.code}</span>
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
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-50 ring-1 ring-black/5">
                    <div className="p-2 space-y-1">
                      {currencies.map((curr) => (
                        <button
                          key={curr.code}
                          onClick={() => handleCurrencySelect(curr)}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all ${
                            currencyCode === curr.code ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Image
                              src={curr.flag}
                              className="rounded"
                              alt={`${curr.name} flag`}
                              width={20}
                              height={14}
                            />
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-bold">{curr.code}</span>
                              <span className="text-xs text-gray-500">{curr.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{curr.symbol}</span>
                            {currencyCode === curr.code && (
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User/Auth Section */}
            {isLoggedIn ? (
              <button
                onClick={onProfileClick}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-white shadow-lg hover:scale-105 transition-transform duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                aria-label="User profile"
              >
                <img
                  src={avatarUrl}
                  alt={user?.name || 'User avatar'}
                  className="w-full h-full object-cover"
                  width={40}
                  height={40}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = getAvatarFallback();
                  }}
                />
              </button>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 text-sm font-bold text-gray-700 hover:text-[#32A6D7] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2 rounded-lg"
                >
                  {t?.('nav.signIn') || 'Sign In'}
                </button>
                <button
                  onClick={onRegister}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#32A6D7] to-[#2c95c2] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#32A6D7]/10 hover:shadow-xl hover:from-[#2c95c2] hover:to-[#2684ad] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
                >
                  {t?.('nav.register') || 'Register'}
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-[#32A6D7] transition-colors duration-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-50 animate-in slide-in-from-top duration-300 overflow-hidden shadow-xl">
          <div className="px-4 py-6 space-y-1">
            <button
              onClick={() => {
                handleFlightsClick();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center px-4 py-4 text-left font-bold text-gray-900 bg-[#f0f9ff] rounded-xl hover:bg-[#e1f3ff] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {t?.('nav.flights') || 'Flights'}
            </button>
            <a
              href="#"
              className="w-full flex items-center px-4 py-4 text-left font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {t?.('nav.hotels') || 'Hotels'}
            </a>
            <a
              href="#"
              className="w-full flex items-center px-4 py-4 text-left font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
            >
              <svg className="w-5 h-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-.553.894L15 19m-3-9V4a1 1 0 00-1-1H5a1 1 0 00-1 1v6m8 0v10M4 10v10m8 0H4"
                />
              </svg>
              {t?.('nav.cars') || 'Cars'}
            </a>

            {!isLoggedIn && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
                <button
                  onClick={() => {
                    onSignIn?.();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-4 font-bold text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
                >
                  {t?.('nav.signIn') || 'Sign In'}
                </button>
                <button
                  onClick={() => {
                    onRegister?.();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-4 font-bold text-white bg-gradient-to-r from-[#32A6D7] to-[#2c95c2] rounded-xl shadow-lg shadow-[#32A6D7]/10 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#32A6D7] focus:ring-offset-2"
                >
                  {t?.('nav.register') || 'Register'}
                </button>
              </div>
            )}

            {/* Mobile Language & Currency */}
            <div className="flex items-center justify-between pt-6 px-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-2 font-bold text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 rounded-lg p-2"
                >
                  <Image
                    src={selectedLang.flag}
                    className="w-5 h-3.5 rounded"
                    alt={`${selectedLang.name} flag`}
                    width={20}
                    height={14}
                  />
                  {selectedLang.code}
                </button>
                <button
                  onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                  className="font-bold text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 rounded-lg p-2"
                >
                  {selectedCurrency.code} ({selectedCurrency.symbol})
                </button>
              </div>
              <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest">
                Global Travel
              </span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;