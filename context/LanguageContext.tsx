'use client';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { translations } from '../translations';
type LanguageCode = 'EN' | 'FR' | 'ES' | 'DE' | 'ZH';
interface LanguageContextType {
    language: LanguageCode;
    setLanguage: (lang: LanguageCode) => void;
    currency: {
        code: string;
        symbol: string;
    };
    setCurrency: (currency: {
        code: string;
        symbol: string;
    }) => void;
    t: (key: string) => string;
}
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const geoMap: Record<string, {
    lang: LanguageCode;
    currency: {
        code: string;
        symbol: string;
    };
}> = {
    'NG': { lang: 'EN', currency: { code: 'NGN', symbol: '₦' } },
    'GB': { lang: 'EN', currency: { code: 'GBP', symbol: '£' } },
    'US': { lang: 'EN', currency: { code: 'USD', symbol: '$' } },
    'FR': { lang: 'FR', currency: { code: 'EUR', symbol: '€' } },
    'ES': { lang: 'ES', currency: { code: 'EUR', symbol: '€' } },
    'DE': { lang: 'DE', currency: { code: 'EUR', symbol: '€' } },
    'CN': { lang: 'ZH', currency: { code: 'EUR', symbol: '€' } },
};
export const LanguageProvider: React.FC<{
    children: ReactNode;
}> = ({ children }) => {
    const [language, setLanguageState] = useState<LanguageCode>('EN');
    const [currency, setCurrencyState] = useState({ code: 'GBP', symbol: '£' });
    const [hasInitialized, setHasInitialized] = useState(false);
    const setLanguage = (lang: LanguageCode) => {
        setLanguageState(lang);
        localStorage.setItem('eb_pref_lang', lang);
    };
    const setCurrency = (curr: {
        code: string;
        symbol: string;
    }) => {
        setCurrencyState(curr);
        localStorage.setItem('eb_pref_curr', JSON.stringify(curr));
    };
    useEffect(() => {
        const initSettings = async () => {
            const savedLang = localStorage.getItem('eb_pref_lang') as LanguageCode;
            const savedCurr = localStorage.getItem('eb_pref_curr');
            if (savedLang && savedCurr) {
                setLanguageState(savedLang);
                setCurrencyState(JSON.parse(savedCurr));
                setHasInitialized(true);
                return;
            }
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                const country = data.country_code;
                if (country && geoMap[country]) {
                    const detected = geoMap[country];
                    setLanguageState(detected.lang);
                    setCurrencyState(detected.currency);
                    console.log(`[Geo-Detection] Setting locale to ${country}: ${detected.lang}/${detected.currency.code}`);
                }
                else if (country) {
                    setLanguageState('EN');
                    setCurrencyState({ code: 'USD', symbol: '$' });
                }
            }
            catch (error) {
                console.warn('[Geo-Detection] Failed to detect location. Using defaults (Pounds).');
                setLanguageState('EN');
                setCurrencyState({ code: 'GBP', symbol: '£' });
            }
            finally {
                setHasInitialized(true);
            }
        };
        initSettings();
    }, []);
    const t = (key: string) => {
        const keys = key.split('.');
        let value = translations[language];
        if (!value)
            return key;
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            }
            else {
                return key;
            }
        }
        return typeof value === 'string' ? value : key;
    };
    return (<LanguageContext.Provider value={{ language, setLanguage, currency, setCurrency, t }}>
      
      {hasInitialized ? children : (<div className="fixed inset-0 bg-white z-[999] flex items-center justify-center">
           <div className="w-10 h-10 border-4 border-blue-50 border-t-[#33a8da] rounded-full animate-spin"></div>
        </div>)}
    </LanguageContext.Provider>);
};
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
