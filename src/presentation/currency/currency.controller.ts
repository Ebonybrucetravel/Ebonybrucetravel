import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrencyService } from '../../infrastructure/currency/currency.service';

const COUNTRY_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  NG: { code: 'NGN', symbol: '₦' },
  GB: { code: 'GBP', symbol: '£' },
  US: { code: 'USD', symbol: '$' },
  CA: { code: 'CAD', symbol: 'C$' },
  AU: { code: 'AUD', symbol: 'A$' },
  FR: { code: 'EUR', symbol: '€' },
  DE: { code: 'EUR', symbol: '€' },
  ES: { code: 'EUR', symbol: '€' },
  IT: { code: 'EUR', symbol: '€' },
  NL: { code: 'EUR', symbol: '€' },
  BE: { code: 'EUR', symbol: '€' },
  PT: { code: 'EUR', symbol: '€' },
  IE: { code: 'EUR', symbol: '€' },
  AT: { code: 'EUR', symbol: '€' },
  FI: { code: 'EUR', symbol: '€' },
  GR: { code: 'EUR', symbol: '€' },
  CN: { code: 'CNY', symbol: '¥' },
  JP: { code: 'JPY', symbol: '¥' },
  ZA: { code: 'ZAR', symbol: 'R' },
  KE: { code: 'KES', symbol: 'KSh' },
  GH: { code: 'GHS', symbol: 'GH₵' },
};

const DEFAULT_CURRENCY = { code: 'GBP', symbol: '£' };

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get all exchange rates for a base currency (server-cached 24h)' })
  @ApiQuery({ name: 'base', required: false, description: 'Base currency (default: USD)' })
  @ApiResponse({ status: 200, description: 'Exchange rates successfully retrieved.' })
  async getRates(@Query('base') base?: string) {
    const baseCurrency = (base || 'USD').toUpperCase();
    return this.currencyService.getAllRates(baseCurrency);
  }

  @Get('detect')
  @ApiOperation({
    summary: 'Detect currency from visitor IP and return full rates in one call',
  })
  @ApiResponse({
    status: 200,
    description: 'Detected default currency + full USD-based rate map.',
  })
  async detect(@Req() req: Request) {
    // Resolve IP — works behind proxies/load balancers
    const ip =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '';

    const country = (req.headers['cf-ipcountry'] as string) || null;

    // Fetch all rates from USD as pivot (single external API call, cached 24h)
    const ratesData = await this.currencyService.getAllRates('USD');

    // Derive the detected currency
    let detectedCurrency = DEFAULT_CURRENCY;
    if (country && COUNTRY_CURRENCY_MAP[country.toUpperCase()]) {
      detectedCurrency = COUNTRY_CURRENCY_MAP[country.toUpperCase()];
    }

    return {
      detectedCurrency,
      country: country || null,
      ...ratesData,
    };
  }
}
