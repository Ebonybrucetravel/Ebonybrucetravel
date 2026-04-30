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

// Add request queue to prevent parallel requests
let requestQueue: Array<{
  baseCurrency: string;
  resolve: (value: ExchangeRates) => void;
  reject: (reason: any) => void;
}> = [];
let isProcessingQueue = false;

// Cache duration: 6 hours (reduces API calls significantly)
const CACHE_DURATION = 6 * 60 * 60 * 1000; 
const LS_CACHE_PREFIX = 'eb_rates_';

export const SUPPORTED_CURRENCIES = ['GBP', 'NGN', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'KES'];

// Your ExchangeRate-API key
const API_KEY = "bbbcb8f5a2eaf222da3fb787";
const BASE_URL = "https://v6.exchangerate-api.com/v6";

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
let consecutiveRateLimits = 0;

/**
 * Process request queue one by one
 */
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const { baseCurrency, resolve, reject } = requestQueue.shift()!;
    
    try {
      // Add delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      
      const result = await performFetch(baseCurrency);
      lastRequestTime = Date.now();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }
  
  isProcessingQueue = false;
}

/**
 * Perform the actual API fetch
 */
async function performFetch(baseCurrency: string): Promise<ExchangeRates> {
  const url = `${BASE_URL}/${API_KEY}/latest/${baseCurrency}`;
  console.log(`🌍 API CALL: Fetching exchange rates for ${baseCurrency}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-cache',
  });
  
  if (response.status === 429) {
    consecutiveRateLimits++;
    console.warn(`Rate limited (429) for ${baseCurrency}. Consecutive: ${consecutiveRateLimits}`);
    
    // If we have cached data even if expired, use it
    const cached = ratesCache.get(baseCurrency);
    if (cached) {
      console.log(`Using stale cache for ${baseCurrency} due to rate limit`);
      return cached;
    }
    
    throw new Error(`Rate limit exceeded`);
  }
  
  consecutiveRateLimits = 0; // Reset on success
  
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
    
    // Accuracy check (internal only, no user message)
    if (baseCurrency !== 'NGN' && rates.rates.NGN && rates.rates.NGN < 100) {
      console.error(`GARBAGE DATA DETECTED: NGN rate (${rates.rates.NGN}) for base ${baseCurrency} is unrealistic.`);
      throw new Error(`Invalid rates`);
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
}

/**
 * Fetch real-time exchange rates using ExchangeRate-API with aggressive caching
 * Now uses request queue to prevent parallel API calls
 */
export async function fetchExchangeRates(baseCurrency: string = 'GBP'): Promise<ExchangeRates> {
  baseCurrency = baseCurrency.toUpperCase();
  
  // 1. Check in-memory cache
  const inMemory = ratesCache.get(baseCurrency);
  if (inMemory && (Date.now() - inMemory.timestamp) < CACHE_DURATION) {
    console.log(`Using in-memory cache for ${baseCurrency}`);
    return inMemory;
  }

  // 2. Check localStorage cache (for cross-refresh persistence)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${LS_CACHE_PREFIX}${baseCurrency}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ExchangeRates;
        if ((Date.now() - parsed.timestamp) < CACHE_DURATION) {
          console.log(`Using localStorage cache for ${baseCurrency}`);
          ratesCache.set(baseCurrency, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read from localStorage cache:', e);
    }
  }

  // 3. Check if there's already a pending request for this currency
  const pending = pendingRequests.get(baseCurrency);
  if (pending) {
    console.log(`Waiting for pending request for ${baseCurrency}`);
    return pending;
  }

  // 4. Queue the request to prevent parallel API calls
  return new Promise((resolve, reject) => {
    requestQueue.push({ baseCurrency, resolve, reject });
    processQueue();
  });
}

/**
 * Preload all common currencies at once (but with queue)
 */
export async function preloadCommonCurrencies(): Promise<void> {
  const commonCurrencies = ['USD', 'GBP', 'NGN', 'EUR'];
  console.log(`Preloading common currencies: ${commonCurrencies.join(', ')}`);
  
  // Load sequentially, not in parallel
  for (const currency of commonCurrencies) {
    try {
      await fetchExchangeRates(currency);
      // Small delay between preload requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.warn(`Failed to preload ${currency}:`, error);
    }
  }
  
  console.log('Preloading complete');
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