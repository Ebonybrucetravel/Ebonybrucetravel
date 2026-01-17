import { ProductType } from '@prisma/client';

export class MarkupConfig {
  id: string;
  productType: ProductType;
  markupPercentage: number;
  serviceFeeAmount: number;
  currency: string;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  description?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

