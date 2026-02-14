import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LoyaltyTier, LoyaltyTransactionType, ProductType } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a loyalty account for a user
   */
  async getOrCreateAccount(userId: string) {
    let account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      account = await this.prisma.loyaltyAccount.create({
        data: { userId },
      });
      this.logger.log(`Created loyalty account for user ${userId}`);
    }

    return account;
  }

  /**
   * Get user's loyalty summary (account + recent transactions)
   */
  async getLoyaltySummary(userId: string) {
    const account = await this.getOrCreateAccount(userId);

    const [recentTransactions, tierConfig, nextTierConfig] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.loyaltyTierConfig.findUnique({
        where: { tier: account.tier },
      }),
      this.getNextTierConfig(account.tier),
    ]);

    const pointsToNextTier = nextTierConfig
      ? Math.max(0, nextTierConfig.minPoints - account.totalEarned)
      : null;

    return {
      account: {
        balance: account.balance,
        totalEarned: account.totalEarned,
        tier: account.tier,
        tierBenefits: tierConfig?.benefits || [],
        tierDescription: tierConfig?.description || null,
        pointsMultiplier: tierConfig?.pointsMultiplier?.toNumber() || 1.0,
      },
      nextTier: nextTierConfig
        ? {
            tier: nextTierConfig.tier,
            pointsRequired: nextTierConfig.minPoints,
            pointsToGo: pointsToNextTier,
          }
        : null,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        points: t.points,
        balance: t.balance,
        description: t.description,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Get paginated transaction history
   */
  async getTransactionHistory(
    userId: string,
    options: { page?: number; limit?: number; type?: LoyaltyTransactionType },
  ) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options.type) {
      where.type = options.type;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Earn points from a completed booking
   * Called after payment is confirmed
   */
  async earnPointsFromBooking(
    userId: string,
    bookingId: string,
    productType: ProductType,
    totalAmount: number,
    currency: string,
  ): Promise<{ pointsEarned: number; newBalance: number }> {
    // Get earning rule for this product type
    const earningRule = await this.prisma.pointsEarningRule.findUnique({
      where: { productType },
    });

    if (!earningRule || !earningRule.isActive) {
      this.logger.log(`No active earning rule for ${productType}, skipping points`);
      return { pointsEarned: 0, newBalance: 0 };
    }

    // Check minimum booking amount
    if (
      earningRule.minBookingAmount &&
      totalAmount < earningRule.minBookingAmount.toNumber()
    ) {
      this.logger.log(
        `Booking amount ${totalAmount} below minimum ${earningRule.minBookingAmount} for points`,
      );
      return { pointsEarned: 0, newBalance: 0 };
    }

    // Calculate base points
    let pointsEarned = Math.floor(totalAmount * earningRule.pointsPerUnit) + earningRule.bonusPoints;

    // Apply tier multiplier
    const account = await this.getOrCreateAccount(userId);
    const tierConfig = await this.prisma.loyaltyTierConfig.findUnique({
      where: { tier: account.tier },
    });

    if (tierConfig && tierConfig.pointsMultiplier.toNumber() > 1) {
      pointsEarned = Math.floor(pointsEarned * tierConfig.pointsMultiplier.toNumber());
    }

    // Credit the points
    const result = await this.creditPoints(
      userId,
      pointsEarned,
      LoyaltyTransactionType.EARN,
      `Points earned from ${productType.replace('_', ' ').toLowerCase()} booking`,
      'BOOKING',
      bookingId,
    );

    this.logger.log(
      `User ${userId} earned ${pointsEarned} points from booking ${bookingId}. New balance: ${result.newBalance}`,
    );

    return { pointsEarned, newBalance: result.newBalance };
  }

  /**
   * Redeem points for a voucher
   */
  async redeemPointsForVoucher(
    userId: string,
    rewardRuleId: string,
  ): Promise<{ voucherCode: string; voucherId: string }> {
    const account = await this.getOrCreateAccount(userId);
    const rewardRule = await this.prisma.rewardRule.findUnique({
      where: { id: rewardRuleId },
    });

    if (!rewardRule || !rewardRule.isActive) {
      throw new NotFoundException('Reward rule not found or inactive');
    }

    // Check tier requirement
    if (rewardRule.requiredTier) {
      const tierOrder: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
      const userTierIndex = tierOrder.indexOf(account.tier);
      const requiredTierIndex = tierOrder.indexOf(rewardRule.requiredTier);
      if (userTierIndex < requiredTierIndex) {
        throw new BadRequestException(
          `This reward requires ${rewardRule.requiredTier} tier. Your current tier is ${account.tier}.`,
        );
      }
    }

    // Check points
    if (account.balance < rewardRule.pointsRequired) {
      throw new BadRequestException(
        `Insufficient points. You have ${account.balance} but need ${rewardRule.pointsRequired}.`,
      );
    }

    // Check max usage per user
    if (rewardRule.maxUsagePerUser) {
      const userUsageCount = await this.prisma.voucher.count({
        where: {
          userId,
          rewardRuleId,
          status: { not: 'CANCELLED' },
        },
      });
      if (userUsageCount >= rewardRule.maxUsagePerUser) {
        throw new BadRequestException('You have reached the maximum redemption limit for this reward.');
      }
    }

    // Check global max usage
    if (rewardRule.maxTotalUsage && rewardRule.currentUsageCount >= rewardRule.maxTotalUsage) {
      throw new BadRequestException('This reward has reached its maximum total redemptions.');
    }

    // Generate voucher code
    const voucherCode = `EBT-V-${this.generateVoucherCode()}`;

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rewardRule.validityDays);

    // Create voucher and debit points in a transaction
    const [voucher] = await this.prisma.$transaction([
      this.prisma.voucher.create({
        data: {
          userId,
          rewardRuleId,
          code: voucherCode,
          discountType: rewardRule.discountType,
          discountValue: rewardRule.discountValue,
          currency: rewardRule.currency,
          maxDiscountAmount: rewardRule.maxDiscountAmount,
          applicableProducts: rewardRule.applicableProducts,
          minBookingAmount: rewardRule.minBookingAmount,
          expiresAt,
        },
      }),
      this.prisma.rewardRule.update({
        where: { id: rewardRuleId },
        data: { currentUsageCount: { increment: 1 } },
      }),
    ]);

    // Debit points
    await this.debitPoints(
      userId,
      rewardRule.pointsRequired,
      LoyaltyTransactionType.REDEEM,
      `Redeemed for voucher: ${rewardRule.name}`,
      'VOUCHER_REDEMPTION',
      voucher.id,
    );

    this.logger.log(
      `User ${userId} redeemed ${rewardRule.pointsRequired} points for voucher ${voucherCode}`,
    );

    return { voucherCode, voucherId: voucher.id };
  }

  /**
   * Credit points to a user (internal)
   */
  private async creditPoints(
    userId: string,
    points: number,
    type: LoyaltyTransactionType,
    description: string,
    referenceType?: string,
    referenceId?: string,
  ) {
    const account = await this.getOrCreateAccount(userId);
    const newBalance = account.balance + points;
    const newTotalEarned = account.totalEarned + points;

    // Update account
    await this.prisma.loyaltyAccount.update({
      where: { userId },
      data: {
        balance: newBalance,
        totalEarned: newTotalEarned,
      },
    });

    // Record transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        userId,
        type,
        points,
        balance: newBalance,
        description,
        referenceType,
        referenceId,
      },
    });

    // Check and update tier
    await this.updateTier(userId, newTotalEarned);

    return { newBalance, totalEarned: newTotalEarned };
  }

  /**
   * Debit points from a user (internal)
   */
  private async debitPoints(
    userId: string,
    points: number,
    type: LoyaltyTransactionType,
    description: string,
    referenceType?: string,
    referenceId?: string,
  ) {
    const account = await this.getOrCreateAccount(userId);
    const newBalance = account.balance - points;

    if (newBalance < 0) {
      throw new BadRequestException('Insufficient points balance');
    }

    await this.prisma.loyaltyAccount.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await this.prisma.loyaltyTransaction.create({
      data: {
        userId,
        type,
        points: -points,
        balance: newBalance,
        description,
        referenceType,
        referenceId,
      },
    });

    return { newBalance };
  }

  /**
   * Admin: manually adjust points (credit or debit)
   */
  async adminAdjustPoints(
    userId: string,
    points: number,
    reason: string,
    adminUserId: string,
  ) {
    if (points === 0) {
      throw new BadRequestException('Points adjustment cannot be 0');
    }

    const type = points > 0 ? LoyaltyTransactionType.ADMIN_CREDIT : LoyaltyTransactionType.ADMIN_DEBIT;

    if (points > 0) {
      return this.creditPoints(userId, points, type, `Admin adjustment: ${reason}`, 'ADMIN_ADJUSTMENT', adminUserId);
    } else {
      return this.debitPoints(userId, Math.abs(points), type, `Admin adjustment: ${reason}`, 'ADMIN_ADJUSTMENT', adminUserId);
    }
  }

  /**
   * Check and update user's tier based on total earned points
   */
  private async updateTier(userId: string, totalEarned: number) {
    const tierConfigs = await this.prisma.loyaltyTierConfig.findMany({
      orderBy: { minPoints: 'desc' },
    });

    // Find the highest tier the user qualifies for
    const newTierConfig = tierConfigs.find((tc) => totalEarned >= tc.minPoints);

    if (newTierConfig) {
      const account = await this.prisma.loyaltyAccount.findUnique({
        where: { userId },
      });

      if (account && account.tier !== newTierConfig.tier) {
        await this.prisma.loyaltyAccount.update({
          where: { userId },
          data: { tier: newTierConfig.tier },
        });
        this.logger.log(
          `User ${userId} tier updated: ${account.tier} → ${newTierConfig.tier}`,
        );
      }
    }
  }

  /**
   * Get next tier config for display
   */
  private async getNextTierConfig(currentTier: LoyaltyTier) {
    const tierOrder: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const currentIndex = tierOrder.indexOf(currentTier);

    if (currentIndex >= tierOrder.length - 1) {
      return null; // Already at highest tier
    }

    const nextTier = tierOrder[currentIndex + 1];
    return this.prisma.loyaltyTierConfig.findUnique({
      where: { tier: nextTier },
    });
  }

  /**
   * Generate a short alphanumeric voucher code
   */
  private generateVoucherCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

