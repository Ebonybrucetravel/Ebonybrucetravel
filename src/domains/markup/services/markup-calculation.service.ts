import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { MarkupConfig } from '@domains/markup/entities/markup-config.entity';

@Injectable()
export class MarkupCalculationService {
  /**
   * Calculate markup and total amount for a booking
   * Markup is from the config, Service Fee is fixed at 5%
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
    markupPercentage: number;
    serviceFeePercentage: number;
  } {
    // ✅ Markup percentage from config
    const markupPercentage = markupConfig.markupPercentage || 10;
    const markupAmount = (basePrice * markupPercentage) / 100;
    
    // ✅ Service fee is always 5%
    const serviceFeePercentage = 5;
    const serviceFee = (basePrice * serviceFeePercentage) / 100;
    
    // ✅ Calculate total
    const totalAmount = basePrice + markupAmount + serviceFee;

    return {
      basePrice,
      markupAmount: Number(markupAmount.toFixed(2)),
      serviceFee: Number(serviceFee.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      markupPercentage: Number(markupPercentage.toFixed(2)),
      serviceFeePercentage: Number(serviceFeePercentage.toFixed(2)),
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