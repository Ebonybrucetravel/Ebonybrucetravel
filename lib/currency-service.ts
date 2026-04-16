// lib/currency-service.ts

export interface ExchangeRates {
    base: string;
    rates: Record<string, number>;
    date: string;
    timestamp: number;
  }
  
  // Cache rates for 1 hour (3600000 ms) to avoid excessive API calls
  let cachedRates: ExchangeRates | null = null;
  let lastFetchTime = 0;
  const CACHE_DURATION = 3600000; // 1 hour
  
  // Fallback rates in case API fails
  const FALLBACK_RATES: Record<string, number> = {
    'GBP': 1,
    'NGN': 1900,
    'USD': 1.25,
    'EUR': 1.17,
    'CAD': 1.35,
    'AUD': 1.50,
    'JPY': 150,
    'CNY': 9.0,
    'ZAR': 18.5,
    'KES': 160,
  };
  
  /**
   * Fetch real-time exchange rates from exchangerate.host
   * Free API - no API key required, unlimited requests
   */
  export async function fetchExchangeRates(baseCurrency: string = 'GBP'): Promise<ExchangeRates> {
    // Return cached rates if still fresh
    if (cachedRates && (Date.now() - lastFetchTime) < CACHE_DURATION) {
      console.log(`📊 Using cached exchange rates (base: ${cachedRates.base}, date: ${cachedRates.date})`);
      return cachedRates;
    }
  
    try {
      console.log(`🌍 Fetching live exchange rates from exchangerate.host (base: ${baseCurrency})`);
      
      // Using exchangerate.host - completely free, no API key needed
      const response = await fetch(`https://api.exchangerate.host/latest?base=${baseCurrency}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error?.info || 'Failed to fetch exchange rates');
      }
      
      cachedRates = {
        base: data.base,
        rates: data.rates,
        date: data.date,
        timestamp: Date.now(),
      };
      lastFetchTime = Date.now();
      
      console.log(`✅ Exchange rates updated: 1 ${data.base} =`, {
        NGN: data.rates.NGN,
        USD: data.rates.USD,
        EUR: data.rates.EUR,
      });
      
      return cachedRates;
    } catch (error) {
      console.error('❌ Failed to fetch exchange rates:', error);
      
      // Return fallback rates
      return {
        base: baseCurrency,
        rates: FALLBACK_RATES,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
      };
    }
  }
  
  /**
   * Convert an amount from one currency to another using live rates
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
      // Fetch rates with fromCurrency as base
      const rates = await fetchExchangeRates(fromCurrency);
      const rate = rates.rates[toCurrency];
      
      if (!rate) {
        console.warn(`No rate found for ${toCurrency}, using fallback`);
        // Try reverse conversion
        const reverseRates = await fetchExchangeRates(toCurrency);
        const reverseRate = reverseRates.rates[fromCurrency];
        if (reverseRate) {
          return { convertedAmount: amount / reverseRate, rate: 1 / reverseRate };
        }
        return { convertedAmount: amount, rate: 1 };
      }
      
      return { convertedAmount: amount * rate, rate };
    } catch (error) {
      console.error('Currency conversion failed:', error);
      return { convertedAmount: amount, rate: 1 };
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
    const formattedAmount = amount.toLocaleString(undefined, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    });
    
    // For NGN, format without decimal places
    if (currencyCode === 'NGN') {
      return `${symbol}${Math.round(amount).toLocaleString()}`;
    }
    
    return `${symbol}${formattedAmount}`;
  }