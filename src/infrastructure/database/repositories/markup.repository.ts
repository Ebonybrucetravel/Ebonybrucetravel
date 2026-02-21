import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MarkupConfig } from '@domains/markup/entities/markup-config.entity';
import { ProductType } from '@prisma/client';
import { toNumber } from '@common/utils/decimal.util';

@Injectable()
export class MarkupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Find all configs (active and inactive) for admin listing */
  async findAll(options?: { productType?: ProductType; currency?: string }): Promise<MarkupConfig[]> {
    const where: any = {};
    if (options?.productType) where.productType = options.productType;
    if (options?.currency) where.currency = options.currency;
    const configs = await this.prisma.markupConfig.findMany({
      where,
      orderBy: [{ productType: 'asc' }, { currency: 'asc' }, { effectiveFrom: 'desc' }],
    });
    return configs.map((c) => this.mapToMarkupConfig(c));
  }

  async findById(id: string): Promise<MarkupConfig | null> {
    const config = await this.prisma.markupConfig.findUnique({ where: { id } });
    return config ? this.mapToMarkupConfig(config) : null;
  }

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

  async create(data: {
    productType: ProductType;
    markupPercentage: number;
    serviceFeeAmount: number;
    currency: string;
    description?: string;
    createdBy?: string;
  }) {
    const now = new Date();
    const config = await this.prisma.markupConfig.create({
      data: {
        productType: data.productType,
        markupPercentage: data.markupPercentage,
        serviceFeeAmount: data.serviceFeeAmount,
        currency: data.currency,
        description: data.description,
        createdBy: data.createdBy,
        isActive: true,
        effectiveFrom: now,
      },
    });
    return this.mapToMarkupConfig(config);
  }

  /** End current config and create a new one (audit-friendly); or update in place if no future bookings depend on it */
  async update(
    id: string,
    data: {
      markupPercentage?: number;
      serviceFeeAmount?: number;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.markupConfig.findUnique({ where: { id } });
    if (!existing) return null;
    const updated = await this.prisma.markupConfig.update({
      where: { id },
      data: {
        ...(data.markupPercentage != null && { markupPercentage: data.markupPercentage }),
        ...(data.serviceFeeAmount != null && { serviceFeeAmount: data.serviceFeeAmount }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return this.mapToMarkupConfig(updated);
  }

  /** Deactivate by setting effectiveTo = now (keeps history) */
  async deactivate(id: string) {
    const existing = await this.prisma.markupConfig.findUnique({ where: { id } });
    if (!existing) return null;
    const updated = await this.prisma.markupConfig.update({
      where: { id },
      data: { isActive: false, effectiveTo: new Date() },
    });
    return this.mapToMarkupConfig(updated);
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
