import { Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { MarkupConfig } from '@domains/markup/entities/markup-config.entity';

@Injectable()
export class MarkupCalculationService {
 
  calculateTotal(
    basePrice: number,
    productType: ProductType,
    currency: string,
    markupConfig: MarkupConfig,
  ): {
    basePrice: number;
    markupAmount: number;
    serviceFee: number;
    taxAmount: number;
    totalAmount: number;
    markupPercentage: number;
    serviceFeePercentage: number;
    taxPercentage: number;
  } {
    // ✅ Markup percentage from config
    const markupPercentage = markupConfig.markupPercentage || 10;
    const markupAmount = (basePrice * markupPercentage) / 100;
    
    // ✅ Service fee is always 5%
    const serviceFeePercentage = 5;
    const serviceFee = (basePrice * serviceFeePercentage) / 100;
    
    // ✅ Tax is always 15%
    const taxPercentage = 15;
    const taxAmount = (basePrice * taxPercentage) / 100;
    
    // ✅ FIX: Calculate total - MUST include ALL components!
    const totalAmount = basePrice + markupAmount + serviceFee + taxAmount;

    return {
      basePrice,
      markupAmount: Number(markupAmount.toFixed(2)),
      serviceFee: Number(serviceFee.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      markupPercentage: Number(markupPercentage.toFixed(2)),
      serviceFeePercentage: Number(serviceFeePercentage.toFixed(2)),
      taxPercentage: Number(taxPercentage.toFixed(2)),
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