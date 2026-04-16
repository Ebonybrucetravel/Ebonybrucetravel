'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { translations } from '../translations';

type LanguageCode = 'EN' | 'FR' | 'ES' | 'DE' | 'ZH';

interface CurrencyInfo {
    code: string;
    symbol: string;
    rate?: number;
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
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const EXCHANGE_RATE_API_KEY = '3e81e0869142e650fa67416f0bbe3017';

const geoMap: Record<string, {
    lang: LanguageCode;
    currency: { code: string; symbol: string };
}> = {
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

let cachedRates: Record<string, number> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 3600000;

const FALLBACK_RATES: Record<string, Record<string, number>> = {
    'GBP': { 'NGN': 1900, 'USD': 1.25, 'EUR': 1.17, 'CAD': 1.35, 'AUD': 1.50, 'JPY': 150, 'CNY': 9.0, 'ZAR': 18.5, 'KES': 160 },
    'NGN': { 'GBP': 0.00053, 'USD': 0.00066, 'EUR': 0.00062, 'CAD': 0.00071, 'AUD': 0.00079, 'JPY': 0.079, 'CNY': 0.0047, 'ZAR': 0.0097, 'KES': 0.084 },
    'USD': { 'GBP': 0.80, 'NGN': 1520, 'EUR': 0.94, 'CAD': 1.08, 'AUD': 1.20, 'JPY': 120, 'CNY': 7.2, 'ZAR': 14.8, 'KES': 128 },
    'EUR': { 'GBP': 0.85, 'NGN': 1610, 'USD': 1.06, 'CAD': 1.15, 'AUD': 1.28, 'JPY': 128, 'CNY': 7.7, 'ZAR': 15.8, 'KES': 136 },
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
    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(FALLBACK_RATES['GBP']);
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

    const fetchLiveRates = useCallback(async (baseCurrency: string): Promise<Record<string, number>> => {
        if (Object.keys(cachedRates).length > 0 && (Date.now() - lastFetchTime) < CACHE_DURATION) {
            console.log(`📊 Using cached exchange rates (base: ${baseCurrency})`);
            return cachedRates;
        }

        const apis = [
            {
                name: 'exchangerate.host (with key)',
                url: `https://api.exchangerate.host/live?access_key=${EXCHANGE_RATE_API_KEY}&source=${baseCurrency}&currencies=USD,NGN,EUR,CAD,AUD,JPY,CNY,ZAR,KES`
            },
            {
                name: 'exchangerate.host (no key)',
                url: `https://api.exchangerate.host/latest?base=${baseCurrency}`
            },
            {
                name: 'Frankfurter API',
                url: `https://api.frankfurter.app/latest?from=${baseCurrency}`
            }
        ];

        for (const api of apis) {
            try {
                console.log(`🌍 Trying ${api.name} for ${baseCurrency}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const response = await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    console.log(`${api.name} returned ${response.status}, trying next...`);
                    continue;
                }
                
                const data = await response.json();
                let rates: Record<string, number> = {};
                
                if (data.rates) {
                    rates = data.rates;
                } else if (data.quotes) {
                    for (const [key, value] of Object.entries(data.quotes)) {
                        if (key.startsWith(baseCurrency)) {
                            const currencyCode = key.substring(3);
                            rates[currencyCode] = value as number;
                        }
                    }
                }
                
                if (Object.keys(rates).length > 0) {
                    if (!rates['NGN'] && baseCurrency === 'GBP') rates['NGN'] = 1900;
                    if (!rates['NGN'] && baseCurrency === 'USD') rates['NGN'] = 1520;
                    if (!rates['NGN'] && baseCurrency === 'EUR') rates['NGN'] = 1610;
                    
                    cachedRates = rates;
                    lastFetchTime = Date.now();
                    
                    console.log(`✅ Exchange rates updated via ${api.name}`);
                    return rates;
                }
            } catch (err) {
                console.log(`${api.name} failed:`, err);
                continue;
            }
        }
        
        console.warn('⚠️ All APIs failed, using fallback rates');
        return FALLBACK_RATES[baseCurrency] || FALLBACK_RATES['GBP'];
    }, []);

    const refreshRates = useCallback(async () => {
        setIsLoadingRates(true);
        try {
            const rates = await fetchLiveRates(currency.code);
            setExchangeRates(rates);
        } catch (error) {
            console.error('Failed to refresh rates:', error);
        } finally {
            setIsLoadingRates(false);
        }
    }, [currency.code, fetchLiveRates]);

    const convertPrice = useCallback(async (amount: number, fromCurrency: string): Promise<number> => {
        if (fromCurrency === currency.code) return amount;
        if (amount === 0 || isNaN(amount)) return 0;
        
        try {
            let rates = exchangeRates;
            if (Object.keys(rates).length === 0) {
                rates = await fetchLiveRates(fromCurrency);
            }
            
            if (rates[currency.code]) {
                return amount * rates[currency.code];
            }
            
            if (FALLBACK_RATES[fromCurrency] && FALLBACK_RATES[fromCurrency][currency.code]) {
                return amount * FALLBACK_RATES[fromCurrency][currency.code];
            }
            
            return amount;
        } catch (error) {
            console.error('Currency conversion failed:', error);
            return amount;
        }
    }, [currency.code, exchangeRates, fetchLiveRates]);

    const formatPrice = useCallback(async (amount: number, fromCurrency?: string): Promise<string> => {
        let finalAmount = amount;
        if (fromCurrency && fromCurrency !== currency.code) {
            finalAmount = await convertPrice(amount, fromCurrency);
        }
        
        const symbol = CURRENCY_SYMBOLS[currency.code] || currency.symbol;
        
        let formattedAmount: string;
        if (currency.code === 'JPY') {
            formattedAmount = Math.round(finalAmount).toLocaleString();
        } else if (currency.code === 'NGN') {
            if (finalAmount >= 1000) {
                formattedAmount = Math.round(finalAmount).toLocaleString();
            } else {
                formattedAmount = finalAmount.toFixed(2);
            }
        } else if (finalAmount >= 100) {
            formattedAmount = Math.round(finalAmount).toLocaleString();
        } else {
            formattedAmount = finalAmount.toFixed(2);
        }
        
        return `${symbol}${formattedAmount}`;
    }, [currency, convertPrice]);

    // Location detection function
    const detectLocation = useCallback(async (): Promise<{ country: string; currency: string; symbol: string } | null> => {
        // List of CORS-friendly IP APIs to try in order
        const apis = [
            {
                name: 'ipwho.is',
                url: 'https://ipwho.is/',
                parse: (data: any) => ({ country: data.country_code, currency: data.currency_code, symbol: data.currency_symbol })
            },
            {
                name: 'ipapi.co',
                url: 'https://ipapi.co/json/',
                parse: (data: any) => ({ country: data.country_code, currency: data.currency_code, symbol: data.currency_symbol })
            },
            {
                name: 'ip-api.com',
                url: 'https://ip-api.com/json/',
                parse: (data: any) => ({ country: data.countryCode, currency: '', symbol: '' })
            },
            {
                name: 'geoplugin.net',
                url: 'http://www.geoplugin.net/json.gp',
                parse: (data: any) => ({ country: data.geoplugin_countryCode, currency: '', symbol: '' })
            }
        ];

        for (const api of apis) {
            try {
                console.log(`📍 Trying location detection via ${api.name}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const response = await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                const result = api.parse(data);
                
                if (result.country) {
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
                const parsedCurr = JSON.parse(savedCurr);
                setLanguageState(savedLang);
                setCurrencyState({ code: parsedCurr.code, symbol: parsedCurr.symbol });
                setHasInitialized(true);
                await refreshRates();
                return;
            }
            
            // Try to detect location
            const location = await detectLocation();
            
            if (location && location.country && geoMap[location.country]) {
                const detected = geoMap[location.country];
                setLanguageState(detected.lang);
                setCurrencyState({ code: detected.currency.code, symbol: detected.currency.symbol });
                console.log(`[Geo-Detection] Setting locale to ${location.country}: ${detected.lang}/${detected.currency.code}`);
            } else if (location && location.country) {
                // Country found but not in geoMap - use defaults based on region
                setLanguageState('EN');
                setCurrencyState({ code: 'USD', symbol: '$' });
                console.log(`[Geo-Detection] Country ${location.country} not in map, using USD`);
            } else {
                // Fallback to GBP
                console.log('[Geo-Detection] No location detected, using defaults (GBP)');
                setLanguageState('EN');
                setCurrencyState({ code: 'GBP', symbol: '£' });
            }
            
            setHasInitialized(true);
            await refreshRates();
        };
        
        initSettings();
        
        const interval = setInterval(refreshRates, CACHE_DURATION);
        return () => clearInterval(interval);
    }, [refreshRates, detectLocation]);

    const t = (key: string) => {
        const keys = key.split('.');
        let value: any = translations[language];
        if (!value) return key;
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                return key;
            }
        }
        return typeof value === 'string' ? value : key;
    };

    return (
        <LanguageContext.Provider value={{ 
            language, 
            setLanguage, 
            currency, 
            setCurrency, 
            t,
            convertPrice,
            formatPrice,
            isLoadingRates,
            refreshRates,
        }}>
            {hasInitialized ? children : (
                <div className="fixed inset-0 bg-white z-[999] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin"></div>
                </div>
            )}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};