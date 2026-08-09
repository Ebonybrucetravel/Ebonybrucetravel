

import { ProductType } from '@prisma/client';

export class MarkupConfig {
  id: string;
  productType: ProductType;
  markupPercentage: number;        
  serviceFeePercentage: number;    
  taxPercentage: number;           
  currency: string;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  description?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}