// lib/currency-service.ts

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
  timestamp: number;
}

// In-memory cache for the current session and in-flight promises
const ratesCache = new Map<string, ExchangeRates>();
const pendingRequests = new Map<string, Promise<ExchangeRates>>();

// Cache duration: 6 hours (reduces API calls significantly)
const CACHE_DURATION = 6 * 60 * 60 * 1000; 
const LS_CACHE_PREFIX = 'eb_rates_';

export const SUPPORTED_CURRENCIES = ['GBP', 'NGN', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'KES'];

// Your ExchangeRate-API key
const API_KEY = "bbbcb8f5a2eaf222da3fb787";
const BASE_URL = "https://v6.exchangerate-api.com/v6";

/**
 * Fetch real-time exchange rates using ExchangeRate-API with aggressive caching
 */
export async function fetchExchangeRates(baseCurrency: string = 'GBP'): Promise<ExchangeRates> {
  baseCurrency = baseCurrency.toUpperCase();
  
  // 1. Check in-memory cache
  const inMemory = ratesCache.get(baseCurrency);
  if (inMemory && (Date.now() - inMemory.timestamp) < CACHE_DURATION) {
    return inMemory;
  }

  // 2. Check localStorage cache (for cross-refresh persistence)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${LS_CACHE_PREFIX}${baseCurrency}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ExchangeRates;
        if ((Date.now() - parsed.timestamp) < CACHE_DURATION) {
          ratesCache.set(baseCurrency, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read from localStorage cache:', e);
    }
  }

  // 3. De-duplicate in-flight requests
  const pending = pendingRequests.get(baseCurrency);
  if (pending) return pending;

  // 4. Fetch from API
  const fetchPromise = (async () => {
    try {
      const url = `${BASE_URL}/${API_KEY}/latest/${baseCurrency}`;
      console.log(`🌍 API CALL: Fetching exchange rates for ${baseCurrency}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.result === 'success') {
        const rates: ExchangeRates = {
          base: data.base_code,
          rates: data.conversion_rates,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
        };
        
        // 5. Accuracy Check (No false data fallbacks)
        // If NGN rate is suspiciously low (garbage), we don't fix it with false data.
        // We log it and let the caller handle the failure.
        // NOTE: We only check this if the base is NOT NGN, because 1 NGN = 1 NGN is correct.
        if (baseCurrency !== 'NGN' && rates.rates.NGN && rates.rates.NGN < 100) {
          console.error(`❌ GARBAGE DATA DETECTED: NGN rate (${rates.rates.NGN}) for base ${baseCurrency} is unrealistic.`);
          throw new Error(`Currency conversion service returned invalid rates for NGN.`);
        }
        
        // Save to caches
        ratesCache.set(baseCurrency, rates);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`${LS_CACHE_PREFIX}${baseCurrency}`, JSON.stringify(rates));
          } catch (e) {}
        }
        
        return rates;
      } else {
        throw new Error(`API error: ${data['error-type'] || 'Unknown error'}`);
      }
    } finally {
      pendingRequests.delete(baseCurrency);
    }
  })();

  pendingRequests.set(baseCurrency, fetchPromise);
  return fetchPromise;
}

/**
 * Convert an amount from one currency to another
 */
export async function convertCurrencyLive(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<{ convertedAmount: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, rate: 1 };
  }
  
  if (amount === 0 || isNaN(amount)) {
    return { convertedAmount: 0, rate: 0 };
  }
  
  try {
    const rates = await fetchExchangeRates(fromCurrency);
    const rate = rates.rates[toCurrency];
    
    if (!rate || rate === 0) {
      throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);
    }
    
    return { convertedAmount: amount * rate, rate };
  } catch (error) {
    console.error('Currency conversion failed:', error);
    // Propagate error so UI can handle it properly
    throw error;
  }
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  'GBP': '£', 'NGN': '₦', 'USD': '$', 'EUR': '€', 
  'CAD': 'C$', 'AUD': 'A$', 'JPY': '¥', 'CNY': '¥', 
  'ZAR': 'R', 'KES': 'KSh'
};

/**
 * Format price with currency symbol
 */
export function formatPriceWithCurrency(amount: number, currencyCode: string): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  
  if (currencyCode === 'NGN' || currencyCode === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  if (amount >= 100) {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${symbol}${amount.toFixed(2)}`;
}

export async function getConversionRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;
  const rates = await fetchExchangeRates(fromCurrency);
  const rate = rates.rates[toCurrency];
  if (!rate || rate === 0) throw new Error(`No rate for ${fromCurrency} to ${toCurrency}`);
  return rate;
}

export async function areExchangeRatesAvailable(): Promise<boolean> {
  try {
    await fetchExchangeRates('USD');
    return true;
  } catch {
    return false;
  }
}