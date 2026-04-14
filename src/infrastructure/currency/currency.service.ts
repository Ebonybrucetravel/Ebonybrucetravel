import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private readonly cacheTTL = 60 * 60 * 1000;

  private readonly supportedCurrencies = [
    'GBP',
    'USD',
    'EUR',
    'NGN',
    'JPY',
    'CNY',
    'GHS',
    'KES',
    'ZAR',
  ];

  private readonly conversionBuffer: number;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');
    
    if (this.apiKey) {
      this.baseUrl = `https://v6.exchangerate-api.com/v6/${this.apiKey}`;
      this.logger.log('Using exchangerate-api.com v6 API with API key');
    } else {
      this.baseUrl = 'https://api.exchangerate-api.com/v4';
      this.logger.log('Using exchangerate-api.com v4 API (free tier, no API key)');
    }

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

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

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
      return amount;
    }
  }

  calculateConversionFee(
    convertedAmount: number,
    fromCurrency: string,
    toCurrency: string,
  ): {
    baseAmount: number;
    conversionFee: number;
    totalWithFee: number;
  } {
    if (fromCurrency === toCurrency || this.conversionBuffer <= 0) {
      return {
        baseAmount: convertedAmount,
        conversionFee: 0,
        totalWithFee: convertedAmount,
      };
    }

    const conversionFee = (convertedAmount * this.conversionBuffer) / 100;
    const totalWithFee = convertedAmount + conversionFee;

    return {
      baseAmount: convertedAmount,
      conversionFee: Number(conversionFee.toFixed(2)),
      totalWithFee: Number(totalWithFee.toFixed(2)),
    };
  }

  private async fetchWithRetry(url: string, retries = 3, backoff = 1000): Promise<Response> {
    try {
      return await fetch(url, { headers: { Connection: 'close' } });
    } catch (error: any) {
      if (retries > 0) {
        this.logger.warn(`Currency fetch dropped (retrying in ${backoff}ms): ${error.message || String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return this.fetchWithRetry(url, retries - 1, backoff * 2);
      }
      throw error;
    }
  }

  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.rate;
    }

    try {
      let rate: number;

      if (fromCurrency === 'USD') {
        const response = await this.fetchWithRetry(`${this.baseUrl}/latest/USD`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Exchange rate API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const rates = data.conversion_rates || data.rates;
        if (!data || !rates) {
          this.logger.error(`Invalid API response structure:`, JSON.stringify(data).substring(0, 200));
          throw new Error(`Invalid API response structure: rates not found`);
        }
        rate = rates[toCurrency];
        if (!rate) {
          throw new Error(`Exchange rate not found for ${toCurrency}`);
        }
      } else if (toCurrency === 'USD') {
        const response = await this.fetchWithRetry(`${this.baseUrl}/latest/USD`);
        if (!response.ok) {
          throw new Error(`Exchange rate API error: ${response.status}`);
        }
        const data = await response.json();
        const rates = data.conversion_rates || data.rates;
        if (!data || !rates) {
          throw new Error(`Invalid API response structure: rates not found`);
        }
        const fromRate = rates[fromCurrency];
        if (!fromRate) {
          throw new Error(`Exchange rate not found for ${fromCurrency}`);
        }
        rate = 1 / fromRate;
      } else {
        const response = await this.fetchWithRetry(`${this.baseUrl}/latest/USD`);
        if (!response.ok) {
          throw new Error(`Exchange rate API error: ${response.status}`);
        }
        const data = await response.json();
        const rates = data.conversion_rates || data.rates;
        if (!data || !rates) {
          throw new Error(`Invalid API response structure: rates not found`);
        }
        const fromRate = rates[fromCurrency];
        const toRate = rates[toCurrency];
        if (!fromRate || !toRate) {
          throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
        }
        rate = toRate / fromRate;
      }

      this.cache.set(cacheKey, { rate, timestamp: Date.now() });
      this.logger.debug(`Exchange rate ${fromCurrency} to ${toCurrency}: ${rate}`);

      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate ${fromCurrency} to ${toCurrency}:`, error);
      throw error;
    }
  }

  isSupportedCurrency(currency: string): boolean {
    return this.supportedCurrencies.includes(currency.toUpperCase());
  }

  getSupportedCurrencies(): string[] {
    return [...this.supportedCurrencies];
  }

  getConversionBuffer(): number {
    return this.conversionBuffer;
  }

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
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      exchangeRate: 0,
      convertedAmount: 0,
      conversionFeePercentage: fromCurrency === toCurrency ? 0 : this.conversionBuffer,
      conversionFee: 0,
      totalWithFee: 0,
      targetCurrency: toCurrency,
    };
  }

  formatAmount(amount: number, currency: string): string {
    if (currency.toUpperCase() === 'JPY') {
      return Math.round(amount).toString();
    }
    return amount.toFixed(2);
  }
}

