'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { translations } from '../translations';
import { fetchExchangeRates, convertCurrencyLive, formatPriceWithCurrency, SUPPORTED_CURRENCIES } from '../lib/currency-service';

type LanguageCode = 'EN' | 'FR' | 'ES' | 'DE' | 'ZH';

interface CurrencyInfo {
    code: string;
    symbol: string;
}

interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    currency: CurrencyInfo;
    setCurrency: (currency: CurrencyInfo) => void;
    t: (key: string) => string;
    convertPrice: (amount: number, fromCurrency: string) => Promise<number>;
    formatPrice: (amount: number, fromCurrency?: string) => Promise<string>;
    isLoadingRates: boolean;
    refreshRates: () => Promise<void>;
    ratesError: string | null;
    usingLiveRates: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Country to language/currency mapping
const geoMap: Record<string, { lang: LanguageCode; currency: { code: string; symbol: string } }> = {
    'NG': { lang: 'EN', currency: { code: 'NGN', symbol: '₦' } },
    'GB': { lang: 'EN', currency: { code: 'GBP', symbol: '£' } },
    'US': { lang: 'EN', currency: { code: 'USD', symbol: '$' } },
    'FR': { lang: 'FR', currency: { code: 'EUR', symbol: '€' } },
    'ES': { lang: 'ES', currency: { code: 'EUR', symbol: '€' } },
    'DE': { lang: 'DE', currency: { code: 'EUR', symbol: '€' } },
    'CN': { lang: 'ZH', currency: { code: 'CNY', symbol: '¥' } },
    'CA': { lang: 'EN', currency: { code: 'CAD', symbol: 'C$' } },
    'AU': { lang: 'EN', currency: { code: 'AUD', symbol: 'A$' } },
    'JP': { lang: 'EN', currency: { code: 'JPY', symbol: '¥' } },
    'ZA': { lang: 'EN', currency: { code: 'ZAR', symbol: 'R' } },
    'KE': { lang: 'EN', currency: { code: 'KES', symbol: 'KSh' } },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
    'GBP': '£',
    'NGN': '₦',
    'USD': '$',
    'EUR': '€',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CNY': '¥',
    'ZAR': 'R',
    'KES': 'KSh',
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<LanguageCode>('EN');
    const [currency, setCurrencyState] = useState<CurrencyInfo>({ code: 'GBP', symbol: '£' });
    const [hasInitialized, setHasInitialized] = useState(false);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [ratesError, setRatesError] = useState<string | null>(null);
    const [usingLiveRates, setUsingLiveRates] = useState(true);
    const hasInitializedRef = useRef(false);

    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem('eb_pref_lang', lang);
    };

    const setCurrency = (curr: CurrencyInfo) => {
        setCurrencyState(curr);
        localStorage.setItem('eb_pref_curr', JSON.stringify({ code: curr.code, symbol: curr.symbol }));
        refreshRates();
    };

    const fetchLiveRates = useCallback(async (baseCurrency: string) => {
        try {
            // Use the currency-service.ts to fetch rates (no client-side cache here - let service handle it)
            const ratesData = await fetchExchangeRates(baseCurrency);
            
            if (ratesData && ratesData.rates) {
                setRatesError(null);
                setUsingLiveRates(true);
                
                console.log(`✅ Exchange rates from currency-service: 1 ${baseCurrency} =`, {
                    NGN: ratesData.rates.NGN || 'N/A',
                    USD: ratesData.rates.USD || 'N/A',
                    EUR: ratesData.rates.EUR || 'N/A',
                });
                
                return ratesData.rates;
            }
            
            throw new Error('Failed to fetch rates from currency-service');
        } catch (error) {
            console.error('Failed to fetch exchange rates:', error);
            setUsingLiveRates(false);
            setRatesError(`Unable to fetch live exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error; // Re-throw - no fallbacks
        }
    }, []);

    const refreshRates = useCallback(async () => {
        setIsLoadingRates(true);
        setRatesError(null);
        
        try {
            // This will throw if fails - no fallback
            await fetchLiveRates(currency.code);
            console.log('✅ Rates refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh rates:', error);
            // Don't set empty rates - keep previous rates or let components handle the error
        } finally {
            setIsLoadingRates(false);
        }
    }, [currency.code, fetchLiveRates]);

    const convertPrice = useCallback(async (amount: number, fromCurrency: string): Promise<number> => {
        if (fromCurrency === currency.code) return amount;
        if (amount === 0 || isNaN(amount)) return 0;
        
        try {
            // This will throw if rates aren't available
            const { convertedAmount } = await convertCurrencyLive(amount, fromCurrency, currency.code);
            return convertedAmount;
        } catch (error) {
            console.error('Currency conversion failed:', error);
            throw new Error(`Unable to convert currency: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }, [currency.code]);

    const formatPrice = useCallback(async (amount: number, fromCurrency?: string): Promise<string> => {
        try {
            let finalAmount = amount;
            let displayCurrency = currency.code;
            
            if (fromCurrency && fromCurrency !== currency.code) {
                finalAmount = await convertPrice(amount, fromCurrency);
                displayCurrency = currency.code;
            }
            
            // This will throw if formatting fails
            return formatPriceWithCurrency(finalAmount, displayCurrency);
        } catch (error) {
            console.error('Price formatting failed:', error);
            // Return a simple fallback format instead of throwing
            const symbol = CURRENCY_SYMBOLS[currency.code] || currency.code;
            return `${symbol}${amount.toFixed(2)}`;
        }
    }, [currency, convertPrice]);

    // Location detection
    const detectLocation = useCallback(async (): Promise<{ country: string } | null> => {
        const apis = [
            {
                name: 'ipapi.co',
                url: 'https://ipapi.co/json/',
                timeout: 5000,
                parse: (data: any) => ({ country: data.country_code })
            },
            {
                name: 'ipwho.is',
                url: 'https://ipwho.is/',
                timeout: 5000,
                parse: (data: any) => ({ country: data.country_code })
            },
            {
                name: 'ip-api.com',
                url: 'https://ip-api.com/json/',
                timeout: 5000,
                parse: (data: any) => ({ country: data.countryCode })
            }
        ];

        for (const api of apis) {
            try {
                console.log(`📍 Trying location detection via ${api.name}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), api.timeout);
                const response = await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) continue;
                const data = await response.json();
                const result = api.parse(data);
                if (result && result.country) {
                    console.log(`✅ Location detected via ${api.name}: ${result.country}`);
                    return result;
                }
            } catch (err) {
                console.log(`${api.name} failed:`, err);
                continue;
            }
        }
        return null;
    }, []);

    useEffect(() => {
        const initSettings = async () => {
            if (hasInitializedRef.current) return;
            hasInitializedRef.current = true;
            
            const savedLang = localStorage.getItem('eb_pref_lang') as LanguageCode;
            const savedCurr = localStorage.getItem('eb_pref_curr');
            
            if (savedLang && savedCurr) {
                try {
                    const parsedCurr = JSON.parse(savedCurr);
                    setLanguageState(savedLang);
                    setCurrencyState({ code: parsedCurr.code, symbol: parsedCurr.symbol });
                    setHasInitialized(true);
                    
                    // Try to fetch rates, but don't block UI if it fails
                    try {
                        await refreshRates();
                    } catch (error) {
                        console.error('Initial rate fetch failed:', error);
                        setRatesError('Unable to load exchange rates. Please check your connection.');
                    }
                    return;
                } catch (e) {
                    console.error('Failed to parse saved currency:', e);
                }
            }
            
            // Try location detection
            let location = null;
            try {
                location = await detectLocation();
            } catch (err) {
                console.error('Location detection error:', err);
            }
            
            if (location?.country && geoMap[location.country]) {
                const detected = geoMap[location.country];
                setLanguageState(detected.lang);
                setCurrencyState(detected.currency);
                console.log(`[Geo-Detection] Setting locale to ${location.country}: ${detected.lang}/${detected.currency.code}`);
            } else {
                setLanguageState('EN');
                setCurrencyState({ code: 'GBP', symbol: '£' });
                console.log('[Geo-Detection] No location detected, using defaults (GBP)');
            }
            
            setHasInitialized(true);
            
            // Try to fetch initial rates
            try {
                await refreshRates();
            } catch (error) {
                console.error('Initial rate fetch failed:', error);
                setRatesError('Unable to load exchange rates. Please check your connection.');
            }
        };
        
        initSettings();
        
        // Refresh rates every 5 minutes
        const interval = setInterval(() => {
            refreshRates().catch(error => {
                console.error('Scheduled rate refresh failed:', error);
            });
        }, 300000); // 5 minutes
        
        return () => clearInterval(interval);
    }, [refreshRates, detectLocation]);

    const t = (key: string) => {
        const keys = key.split('.');
        let value: any = translations[language];
        if (!value) return key;
        for (const k of keys) {
            if (value && value[k] !== undefined) value = value[k];
            else return key;
        }
        return typeof value === 'string' ? value : key;
    };

    return (
        <LanguageContext.Provider value={{ 
            language, setLanguage, currency, setCurrency, t,
            convertPrice, formatPrice, isLoadingRates, refreshRates, ratesError, usingLiveRates
        }}>
            {hasInitialized ? (
                <>
                    {ratesError && (
                        <div className="fixed top-16 left-0 right-0 z-50 bg-red-50 border-b border-red-200 py-2 px-4 text-center">
                            <p className="text-sm text-red-800">⚠️ {ratesError}</p>
                        </div>
                    )}
                    {children}
                </>
            ) : (
                <div className="fixed inset-0 bg-white z-[999] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin"></div>
                </div>
            )}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};