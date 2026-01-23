import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { MarkupConfig } from '../entities/markup-config.entity';

@Injectable()
export class MarkupCalculationService {
  /**
   * Calculate markup and total amount for a booking
   */
  calculateTotal(
    basePrice: number,
    productType: ProductType,
    currency: string,
    markupConfig: MarkupConfig,
  ): {
    basePrice: number;
    markupAmount: number;
    serviceFee: number;
    totalAmount: number;
  } {
    const markupAmount = (basePrice * markupConfig.markupPercentage) / 100;
    const serviceFee = markupConfig.serviceFeeAmount;
    const totalAmount = basePrice + markupAmount + serviceFee;

    return {
      basePrice,
      markupAmount: Number(markupAmount.toFixed(2)),
      serviceFee: Number(serviceFee.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  }

  /**
   * Get active markup configuration for a product type
   */
  getActiveMarkup(
    productType: ProductType,
    currency: string,
    configs: MarkupConfig[],
  ): MarkupConfig | null {
    const now = new Date();
    return (
      configs.find(
        (config) =>
          config.productType === productType &&
          config.currency === currency &&
          config.isActive &&
          config.effectiveFrom <= now &&
          (config.effectiveTo === null || config.effectiveTo >= now),
      ) || null
    );
  }
}
