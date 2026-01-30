import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Currency conversion service
 * Uses exchangerate-api.com (free tier: 1,500 requests/month)
 * Alternative: fixer.io, openexchangerates.org
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.exchangerate-api.com/v4';
  private readonly cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private readonly cacheTTL = 60 * 60 * 1000; // 1 hour cache

  // Supported currencies - includes all currencies from frontend dropdown
  // Frontend shows: NGN, USD, EUR, GBP, JPY, CNY
  // Additional African currencies: GHS, KES, ZAR
  // Can be easily extended - exchangerate-api.com supports 160+ currencies
  private readonly supportedCurrencies = [
    'GBP', // British Pound (default)
    'USD', // US Dollar
    'EUR', // Euro
    'NGN', // Nigerian Naira
    'JPY', // Japanese Yen
    'CNY', // Chinese Yuan
    'GHS', // Ghanaian Cedi
    'KES', // Kenyan Shilling
    'ZAR', // South African Rand
  ];

  // Currency conversion buffer to protect against rate fluctuations
  // Applied as a percentage increase to converted amounts
  // Default: 2.5% (configurable via CURRENCY_CONVERSION_BUFFER env var)
  private readonly conversionBuffer: number;

  constructor(private readonly configService: ConfigService) {
    // exchangerate-api.com doesn't require API key for free tier
    // But we can use EXCHANGE_RATE_API_KEY if provided
    this.apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');

    // Get conversion buffer from environment (default: 2.5%)
    // This protects against exchange rate fluctuations between display and payment
    const bufferEnv = this.configService.get<string>('CURRENCY_CONVERSION_BUFFER');
    this.conversionBuffer = bufferEnv ? parseFloat(bufferEnv) : 2.5;

    if (this.conversionBuffer < 0 || this.conversionBuffer > 10) {
      this.logger.warn(
        `Currency conversion buffer (${this.conversionBuffer}%) is outside recommended range (0-10%). Consider adjusting.`,
      );
    }

    this.logger.log(
      `Currency conversion buffer set to ${this.conversionBuffer}% to protect against rate fluctuations`,
    );
  }

  /**
   * Convert amount from one currency to another (pure conversion, no buffer)
   * @param amount Amount to convert
   * @param fromCurrency Source currency (ISO 4217 code)
   * @param toCurrency Target currency (ISO 4217 code)
   * @returns Converted amount at current exchange rate
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Validate currencies
    if (!this.isSupportedCurrency(fromCurrency) || !this.isSupportedCurrency(toCurrency)) {
      this.logger.warn(
        `Unsupported currency conversion: ${fromCurrency} to ${toCurrency}. Returning original amount.`,
      );
      return amount;
    }

    try {
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      return amount * exchangeRate;
    } catch (error) {
      this.logger.error(`Failed to convert ${amount} ${fromCurrency} to ${toCurrency}:`, error);
      // Return original amount on error (graceful degradation)
      return amount;
    }
  }

  /**
   * Calculate currency conversion fee/buffer as a separate line item
   * This protects against rate fluctuations and ensures payment success
   * @param convertedAmount The amount after base currency conversion
   * @param fromCurrency Source currency (ISO 4217 code)
   * @param toCurrency Target currency (ISO 4217 code)
   * @returns Object with base converted amount and conversion fee
   */
  calculateConversionFee(
    convertedAmount: number,
    fromCurrency: string,
    toCurrency: string,
  ): {
    baseAmount: number;
    conversionFee: number;
    totalWithFee: number;
  } {
    // No fee if same currency
    if (fromCurrency === toCurrency || this.conversionBuffer <= 0) {
      return {
        baseAmount: convertedAmount,
        conversionFee: 0,
        totalWithFee: convertedAmount,
      };
    }

    // Calculate conversion fee as percentage of converted amount
    // This protects against rate fluctuations between display and payment
    const conversionFee = (convertedAmount * this.conversionBuffer) / 100;
    const totalWithFee = convertedAmount + conversionFee;

    return {
      baseAmount: convertedAmount,
      conversionFee: Number(conversionFee.toFixed(2)),
      totalWithFee: Number(totalWithFee.toFixed(2)),
    };
  }

  /**
   * Get exchange rate between two currencies
   * Uses caching to reduce API calls
   */
  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.cache.get(cacheKey);

    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.rate;
    }

    try {
      // exchangerate-api.com free tier: base currency is USD
      // To convert from USD to any currency: GET /latest/USD
      // To convert between non-USD currencies: convert via USD
      let rate: number;

      if (fromCurrency === 'USD') {
        // Direct conversion from USD
        const response = await fetch(`${this.baseUrl}/latest/USD`);
        if (!response.ok) {
          throw new Error(`Exchange rate API error: ${response.status}`);
        }
        const data = await response.json();
        rate = data.rates[toCurrency];
        if (!rate) {
          throw new Error(`Exchange rate not found for ${toCurrency}`);
        }
      } else if (toCurrency === 'USD') {
        // Convert to USD (inverse)
        const response = await fetch(`${this.baseUrl}/latest/USD`);
        if (!response.ok) {
          throw new Error(`Exchange rate API error: ${response.status}`);
        }
        const data = await response.json();
        const fromRate = data.rates[fromCurrency];
        if (!fromRate) {
          throw new Error(`Exchange rate not found for ${fromCurrency}`);
        }
        rate = 1 / fromRate; // Inverse conversion
      } else {
        // Convert between two non-USD currencies via USD
        const response = await fetch(`${this.baseUrl}/latest/USD`);
        if (!response.ok) {
          throw new Error(`Exchange rate API error: ${response.status}`);
        }
        const data = await response.json();
        const fromRate = data.rates[fromCurrency];
        const toRate = data.rates[toCurrency];
        if (!fromRate || !toRate) {
          throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
        }
        rate = toRate / fromRate; // Convert via USD
      }

      // Cache the rate
      this.cache.set(cacheKey, { rate, timestamp: Date.now() });
      this.logger.debug(`Exchange rate ${fromCurrency} to ${toCurrency}: ${rate}`);

      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate ${fromCurrency} to ${toCurrency}:`, error);
      throw error;
    }
  }

  /**
   * Check if currency is supported
   */
  isSupportedCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Get list of supported currencies
   */
  getSupportedCurrencies(): string[] {
    return [...this.supportedCurrencies];
  }

  /**
   * Get the current conversion buffer percentage
   */
  getConversionBuffer(): number {
    return this.conversionBuffer;
  }

  /**
   * Get conversion details for transparency
   */
  getConversionDetails(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): {
    originalAmount: number;
    originalCurrency: string;
    exchangeRate: number;
    convertedAmount: number;
    conversionFeePercentage: number;
    conversionFee: number;
    totalWithFee: number;
    targetCurrency: string;
  } {
    // This is a synchronous method that returns structure
    // Actual conversion should use async convert() method
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      exchangeRate: 0, // Will be calculated in async convert()
      convertedAmount: 0,
      conversionFeePercentage: fromCurrency === toCurrency ? 0 : this.conversionBuffer,
      conversionFee: 0,
      totalWithFee: 0,
      targetCurrency: toCurrency,
    };
  }

  /**
   * Format currency amount with proper decimal places
   * JPY uses 0 decimal places, others use 2
   */
  formatAmount(amount: number, currency: string): string {
    // JPY (Japanese Yen) uses 0 decimal places
    if (currency.toUpperCase() === 'JPY') {
      return Math.round(amount).toString();
    }
    // Most other currencies use 2 decimal places
    return amount.toFixed(2);
  }
}

