import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DiscountType, LoyaltyTier, VoucherStatus } from '@prisma/client';

export interface CreateRewardRuleDto {
  name: string;
  description?: string;
  pointsRequired: number;
  discountType: DiscountType;
  discountValue: number;
  currency?: string;
  maxDiscountAmount?: number;
  applicableProducts?: string[];
  minBookingAmount?: number;
  isActive?: boolean;
  validityDays?: number;
  maxUsagePerUser?: number;
  maxTotalUsage?: number;
  requiredTier?: LoyaltyTier;
}

export interface UpdateRewardRuleDto extends Partial<CreateRewardRuleDto> {}

export interface UpsertTierConfigDto {
  tier: LoyaltyTier;
  minPoints: number;
  pointsMultiplier: number;
  description?: string;
  benefits?: string[];
}

export interface UpsertPointsEarningRuleDto {
  productType: string;
  pointsPerUnit: number;
  bonusPoints?: number;
  isActive?: boolean;
  minBookingAmount?: number;
}

@Injectable()
export class RewardsAdminService {
  private readonly logger = new Logger(RewardsAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // REWARD RULES (Points → Voucher conversion)
  // =====================================================

  async createRewardRule(dto: CreateRewardRuleDto) {
    // Validate discount value
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }
    if (dto.discountType === 'PERCENTAGE' && dto.discountValue <= 0) {
      throw new BadRequestException('Discount value must be positive');
    }
    if (dto.discountType === 'FIXED_AMOUNT' && !dto.currency) {
      throw new BadRequestException('Currency is required for fixed amount discounts');
    }
    if (dto.pointsRequired <= 0) {
      throw new BadRequestException('Points required must be positive');
    }

    const rule = await this.prisma.rewardRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        pointsRequired: dto.pointsRequired,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        currency: dto.currency,
        maxDiscountAmount: dto.maxDiscountAmount,
        applicableProducts: dto.applicableProducts || null,
        minBookingAmount: dto.minBookingAmount,
        isActive: dto.isActive ?? true,
        validityDays: dto.validityDays ?? 90,
        maxUsagePerUser: dto.maxUsagePerUser,
        maxTotalUsage: dto.maxTotalUsage,
        requiredTier: dto.requiredTier,
      },
    });

    this.logger.log(`Created reward rule: ${rule.name} (${rule.id})`);
    return this.formatRewardRule(rule);
  }

  async updateRewardRule(id: string, dto: UpdateRewardRuleDto) {
    const existing = await this.prisma.rewardRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Reward rule not found');
    }

    if (dto.discountType === 'PERCENTAGE' && (dto.discountValue || existing.discountValue.toNumber()) > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const updated = await this.prisma.rewardRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        pointsRequired: dto.pointsRequired,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        currency: dto.currency,
        maxDiscountAmount: dto.maxDiscountAmount,
        applicableProducts: dto.applicableProducts !== undefined ? dto.applicableProducts : undefined,
        minBookingAmount: dto.minBookingAmount,
        isActive: dto.isActive,
        validityDays: dto.validityDays,
        maxUsagePerUser: dto.maxUsagePerUser,
        maxTotalUsage: dto.maxTotalUsage,
        requiredTier: dto.requiredTier,
      },
    });

    return this.formatRewardRule(updated);
  }

  async deleteRewardRule(id: string) {
    const existing = await this.prisma.rewardRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Reward rule not found');
    }

    // Soft-delete by deactivating rather than hard delete (preserve voucher references)
    await this.prisma.rewardRule.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, message: 'Reward rule deactivated' };
  }

  async listRewardRules(options?: { activeOnly?: boolean }) {
    const where: any = {};
    if (options?.activeOnly) {
      where.isActive = true;
    }

    const rules = await this.prisma.rewardRule.findMany({
      where,
      orderBy: { pointsRequired: 'asc' },
      include: {
        _count: {
          select: {
            vouchers: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    return rules.map((rule) => ({
      ...this.formatRewardRule(rule),
      activeVouchersCount: (rule as any)._count?.vouchers || 0,
    }));
  }

  async getRewardRule(id: string) {
    const rule = await this.prisma.rewardRule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vouchers: true,
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Reward rule not found');
    }

    return {
      ...this.formatRewardRule(rule),
      totalVouchersIssued: (rule as any)._count?.vouchers || 0,
    };
  }

  // =====================================================
  // TIER CONFIGURATION
  // =====================================================

  async upsertTierConfig(dto: UpsertTierConfigDto) {
    const config = await this.prisma.loyaltyTierConfig.upsert({
      where: { tier: dto.tier },
      create: {
        tier: dto.tier,
        minPoints: dto.minPoints,
        pointsMultiplier: dto.pointsMultiplier,
        description: dto.description,
        benefits: dto.benefits || [],
      },
      update: {
        minPoints: dto.minPoints,
        pointsMultiplier: dto.pointsMultiplier,
        description: dto.description,
        benefits: dto.benefits || [],
      },
    });

    this.logger.log(`Upserted tier config: ${config.tier} (minPoints: ${config.minPoints})`);
    return {
      tier: config.tier,
      minPoints: config.minPoints,
      pointsMultiplier: Number(config.pointsMultiplier),
      description: config.description,
      benefits: config.benefits,
    };
  }

  async getAllTierConfigs() {
    const configs = await this.prisma.loyaltyTierConfig.findMany({
      orderBy: { minPoints: 'asc' },
    });

    return configs.map((c) => ({
      tier: c.tier,
      minPoints: c.minPoints,
      pointsMultiplier: Number(c.pointsMultiplier),
      description: c.description,
      benefits: c.benefits,
    }));
  }

  // =====================================================
  // POINTS EARNING RULES
  // =====================================================

  async upsertPointsEarningRule(dto: UpsertPointsEarningRuleDto) {
    const rule = await this.prisma.pointsEarningRule.upsert({
      where: { productType: dto.productType as any },
      create: {
        productType: dto.productType as any,
        pointsPerUnit: dto.pointsPerUnit,
        bonusPoints: dto.bonusPoints ?? 0,
        isActive: dto.isActive ?? true,
        minBookingAmount: dto.minBookingAmount,
      },
      update: {
        pointsPerUnit: dto.pointsPerUnit,
        bonusPoints: dto.bonusPoints,
        isActive: dto.isActive,
        minBookingAmount: dto.minBookingAmount,
      },
    });

    this.logger.log(
      `Upserted points earning rule: ${rule.productType} (${rule.pointsPerUnit} pts/unit)`,
    );
    return {
      productType: rule.productType,
      pointsPerUnit: rule.pointsPerUnit,
      bonusPoints: rule.bonusPoints,
      isActive: rule.isActive,
      minBookingAmount: rule.minBookingAmount ? Number(rule.minBookingAmount) : null,
    };
  }

  async getAllPointsEarningRules() {
    const rules = await this.prisma.pointsEarningRule.findMany({
      orderBy: { productType: 'asc' },
    });

    return rules.map((r) => ({
      productType: r.productType,
      pointsPerUnit: r.pointsPerUnit,
      bonusPoints: r.bonusPoints,
      isActive: r.isActive,
      minBookingAmount: r.minBookingAmount ? Number(r.minBookingAmount) : null,
    }));
  }

  // =====================================================
  // VOUCHER MANAGEMENT (Admin)
  // =====================================================

  async listVouchers(options?: {
    userId?: string;
    status?: VoucherStatus;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options?.userId) where.userId = options.userId;
    if (options?.status) where.status = options.status;

    const [vouchers, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          rewardRule: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      data: vouchers.map((v) => ({
        id: v.id,
        code: v.code,
        user: v.user,
        rewardRule: v.rewardRule.name,
        discountType: v.discountType,
        discountValue: Number(v.discountValue),
        currency: v.currency,
        maxDiscountAmount: v.maxDiscountAmount ? Number(v.maxDiscountAmount) : null,
        status: v.status,
        expiresAt: v.expiresAt,
        usedAt: v.usedAt,
        usedOnBookingId: v.usedOnBookingId,
        createdAt: v.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async cancelVoucher(voucherId: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (voucher.status === 'USED') {
      throw new BadRequestException('Cannot cancel a used voucher');
    }

    await this.prisma.voucher.update({
      where: { id: voucherId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, message: 'Voucher cancelled' };
  }

  // =====================================================
  // REWARDS DASHBOARD STATS (Admin)
  // =====================================================

  async getRewardsDashboardStats() {
    const [
      totalAccounts,
      tierDistribution,
      totalPointsInCirculation,
      activeVouchers,
      usedVouchers,
      activeRules,
    ] = await Promise.all([
      this.prisma.loyaltyAccount.count(),
      this.prisma.loyaltyAccount.groupBy({
        by: ['tier'],
        _count: { id: true },
      }),
      this.prisma.loyaltyAccount.aggregate({
        _sum: { balance: true },
      }),
      this.prisma.voucher.count({ where: { status: 'ACTIVE' } }),
      this.prisma.voucher.count({ where: { status: 'USED' } }),
      this.prisma.rewardRule.count({ where: { isActive: true } }),
    ]);

    return {
      totalLoyaltyAccounts: totalAccounts,
      tierDistribution: tierDistribution.reduce((acc, t) => {
        acc[t.tier] = t._count.id;
        return acc;
      }, {} as Record<string, number>),
      totalPointsInCirculation: totalPointsInCirculation._sum.balance || 0,
      vouchers: {
        active: activeVouchers,
        used: usedVouchers,
      },
      activeRewardRules: activeRules,
    };
  }

  /**
   * Seed default tier configs if none exist
   */
  async seedDefaultTierConfigs() {
    const existing = await this.prisma.loyaltyTierConfig.count();
    if (existing > 0) return;

    const defaults: UpsertTierConfigDto[] = [
      {
        tier: 'BRONZE',
        minPoints: 0,
        pointsMultiplier: 1.0,
        description: 'Welcome tier - earn 1x points on every booking',
        benefits: ['Earn 1 point per £1 spent', 'Access to basic rewards'],
      },
      {
        tier: 'SILVER',
        minPoints: 5000,
        pointsMultiplier: 1.25,
        description: 'Earn 1.25x points on every booking',
        benefits: ['Earn 1.25x points', 'Priority customer support', 'Early access to deals'],
      },
      {
        tier: 'GOLD',
        minPoints: 15000,
        pointsMultiplier: 1.5,
        description: 'Earn 1.5x points on every booking',
        benefits: ['Earn 1.5x points', 'Free cancellation on select bookings', 'Exclusive Gold rewards'],
      },
      {
        tier: 'PLATINUM',
        minPoints: 50000,
        pointsMultiplier: 2.0,
        description: 'Earn 2x points on every booking',
        benefits: ['Earn 2x points', 'Dedicated account manager', 'Complimentary upgrades', 'Platinum-only rewards'],
      },
    ];

    for (const config of defaults) {
      await this.upsertTierConfig(config);
    }

    this.logger.log('Seeded default loyalty tier configs');
  }

  /**
   * Seed default earning rules if none exist
   */
  async seedDefaultEarningRules() {
    const existing = await this.prisma.pointsEarningRule.count();
    if (existing > 0) return;

    const defaults: UpsertPointsEarningRuleDto[] = [
      { productType: 'FLIGHT_DOMESTIC', pointsPerUnit: 2, bonusPoints: 50 },
      { productType: 'FLIGHT_INTERNATIONAL', pointsPerUnit: 3, bonusPoints: 100 },
      { productType: 'HOTEL', pointsPerUnit: 2, bonusPoints: 25 },
      { productType: 'CAR_RENTAL', pointsPerUnit: 1, bonusPoints: 10 },
    ];

    for (const rule of defaults) {
      await this.upsertPointsEarningRule(rule);
    }

    this.logger.log('Seeded default points earning rules');
  }

  private formatRewardRule(rule: any) {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      pointsRequired: rule.pointsRequired,
      discountType: rule.discountType,
      discountValue: Number(rule.discountValue),
      currency: rule.currency,
      maxDiscountAmount: rule.maxDiscountAmount ? Number(rule.maxDiscountAmount) : null,
      applicableProducts: rule.applicableProducts,
      minBookingAmount: rule.minBookingAmount ? Number(rule.minBookingAmount) : null,
      isActive: rule.isActive,
      validityDays: rule.validityDays,
      maxUsagePerUser: rule.maxUsagePerUser,
      maxTotalUsage: rule.maxTotalUsage,
      currentUsageCount: rule.currentUsageCount,
      requiredTier: rule.requiredTier,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}

