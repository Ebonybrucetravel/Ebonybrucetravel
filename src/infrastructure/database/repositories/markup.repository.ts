import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MarkupConfig } from '@domains/markup/entities/markup-config.entity';
import { ProductType } from '@prisma/client';
import { toNumber } from '@common/utils/decimal.util';

@Injectable()
export class MarkupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveMarkups(): Promise<MarkupConfig[]> {
    const now = new Date();
    const configs = await this.prisma.markupConfig.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return configs.map((config) => this.mapToMarkupConfig(config));
  }

  async findActiveMarkupByProductType(
    productType: ProductType,
    currency: string,
  ): Promise<MarkupConfig | null> {
    const now = new Date();
    const config = await this.prisma.markupConfig.findFirst({
      where: {
        productType,
        currency,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });

    return config ? this.mapToMarkupConfig(config) : null;
  }

  /**
   * Map Prisma markup config result to MarkupConfig entity
   * Converts Decimal types to numbers
   */
  private mapToMarkupConfig(prismaConfig: any): MarkupConfig {
    return {
      id: prismaConfig.id,
      productType: prismaConfig.productType,
      markupPercentage: toNumber(prismaConfig.markupPercentage),
      serviceFeeAmount: toNumber(prismaConfig.serviceFeeAmount),
      currency: prismaConfig.currency,
      isActive: prismaConfig.isActive,
      effectiveFrom: prismaConfig.effectiveFrom,
      effectiveTo: prismaConfig.effectiveTo,
      description: prismaConfig.description,
      createdBy: prismaConfig.createdBy,
      createdAt: prismaConfig.createdAt,
      updatedAt: prismaConfig.updatedAt,
    };
  }
}
