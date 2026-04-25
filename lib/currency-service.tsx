// lib/currency-service.ts

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
  timestamp: number;
}

// Cache rates for 5 minutes per base currency
const ratesCache = new Map<string, { rates: ExchangeRates; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

export const SUPPORTED_CURRENCIES = ['GBP', 'NGN', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'KES'];

// Your ExchangeRate-API key
const API_KEY = "bbbcb8f5a2eaf222da3fb787";
const BASE_URL = "https://v6.exchangerate-api.com/v6";

/**
 * Fetch real-time exchange rates using ExchangeRate-API
 * No CORS issues - the API supports CORS natively
 */
export async function fetchExchangeRates(baseCurrency: string = 'GBP'): Promise<ExchangeRates> {
  // Normalize currency code to uppercase
  baseCurrency = baseCurrency.toUpperCase();
  
  const cached = ratesCache.get(baseCurrency);
  // Return cached rates if still fresh
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📊 Using cached exchange rates (base: ${cached.rates.base})`);
    return cached.rates;
  }

  try {
    // Use ExchangeRate-API directly (supports CORS)
    const url = `${BASE_URL}/${API_KEY}/latest/${baseCurrency}`;
    console.log(`🌍 Fetching exchange rates from ExchangeRate-API for ${baseCurrency}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if the response was successful
    if (data.result === 'success') {
      const rates: ExchangeRates = {
        base: data.base_code,
        rates: data.conversion_rates,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
      };
      
      console.log(`✅ Exchange rates fetched successfully: 1 ${baseCurrency} =`, {
        NGN: rates.rates.NGN || 'N/A',
        USD: rates.rates.USD || 'N/A',
        EUR: rates.rates.EUR || 'N/A',
        GBP: rates.rates.GBP || 'N/A',
      });
      
      // Cache the successful response
      ratesCache.set(baseCurrency, { rates, timestamp: Date.now() });
      
      return rates;
    } else {
      throw new Error(`API error: ${data['error-type'] || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    
    // If we have expired cached rates, use them as last resort
    const cached = ratesCache.get(baseCurrency);
    if (cached) {
      console.warn('⚠️ Using expired cached rates as last resort');
      return cached.rates;
    }
    
    throw new Error(`Unable to fetch exchange rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
    
    const convertedAmount = amount * rate;
    return { convertedAmount, rate };
  } catch (error) {
    console.error('Currency conversion failed:', error);
    throw error;
  }
}

/**
 * Format price with currency symbol
 */
export function formatPriceWithCurrency(amount: number, currencyCode: string): string {
  const symbols: Record<string, string> = {
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
  
  const symbol = symbols[currencyCode] || currencyCode;
  
  if (currencyCode === 'NGN') {
    const roundedAmount = Math.round(amount);
    return `${symbol}${roundedAmount.toLocaleString()}`;
  }
  
  if (currencyCode === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  if (amount >= 100) {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get conversion rate between currencies
 */
export async function getConversionRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;
  
  const rates = await fetchExchangeRates(fromCurrency);
  const rate = rates.rates[toCurrency];
  
  if (!rate || rate === 0) {
    throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);
  }
  
  return rate;
}

/**
 * Check if exchange rates are available
 */
export async function areExchangeRatesAvailable(): Promise<boolean> {
  try {
    await fetchExchangeRates('USD');
    return true;
  } catch (error) {
    console.error('Exchange rates not available:', error);
    return false;
  }
}