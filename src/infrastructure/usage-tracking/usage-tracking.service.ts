import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface UsageLimit {
  service: 'google_places' | 'cloudinary';
  metric: 'requests' | 'storage_gb' | 'bandwidth_gb';
  limit: number;
  costPerUnit?: number; // Cost per unit (for Google Places)
}

/**
 * Free Tier Limits:
 * - Google Places API: $200/month credit = ~6,250 requests (at $0.032 per request with photos)
 * - Cloudinary: 25GB storage, 25GB bandwidth/month
 */
const FREE_TIER_LIMITS: UsageLimit[] = [
  {
    service: 'google_places',
    metric: 'requests',
    limit: 6250, // ~$200 credit at $0.032 per request
    costPerUnit: 0.032,
  },
  {
    service: 'cloudinary',
    metric: 'storage_gb',
    limit: 25, // 25GB free tier
  },
  {
    service: 'cloudinary',
    metric: 'bandwidth_gb',
    limit: 25, // 25GB bandwidth/month
  },
];

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get current month usage tracking record
   */
  async getCurrentUsage(
    service: string,
    metric: string,
  ): Promise<{ currentValue: number; limitValue: number; isLimitReached: boolean } | null> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const usage = await this.prisma.apiUsageTracking.findUnique({
      where: {
        service_metric_month_year: {
          service,
          metric,
          month,
          year,
        },
      },
    });

    if (!usage) {
      // Initialize if doesn't exist
      const limit = this.getLimit(service, metric);
      return {
        currentValue: 0,
        limitValue: limit,
        isLimitReached: false,
      };
    }

    return {
      currentValue: usage.currentValue.toNumber(),
      limitValue: usage.limitValue.toNumber(),
      isLimitReached: usage.isLimitReached,
    };
  }

  /**
   * Check if limit is reached (circuit breaker)
   */
  async isLimitReached(service: string, metric: string): Promise<boolean> {
    const usage = await this.getCurrentUsage(service, metric);
    if (!usage) return false;

    // Check if we're at 90% of limit (safety margin)
    const threshold = usage.limitValue * 0.9;
    return usage.currentValue >= threshold || usage.isLimitReached;
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    service: string,
    metric: string,
    amount: number = 1,
  ): Promise<{ currentValue: number; limitValue: number; isLimitReached: boolean }> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const limit = this.getLimit(service, metric);

    // Get or create usage record
    const existing = await this.prisma.apiUsageTracking.findUnique({
      where: {
        service_metric_month_year: {
          service,
          metric,
          month,
          year,
        },
      },
    });

    const newValue = existing
      ? existing.currentValue.toNumber() + amount
      : amount;

    // Check if limit reached (with 90% safety margin)
    const threshold = limit * 0.9;
    const isLimitReached = newValue >= threshold;

    if (existing) {
      await this.prisma.apiUsageTracking.update({
        where: { id: existing.id },
        data: {
          currentValue: new Prisma.Decimal(newValue),
          isLimitReached,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.apiUsageTracking.create({
        data: {
          service,
          metric,
          currentValue: new Prisma.Decimal(newValue),
          limitValue: new Prisma.Decimal(limit),
          month,
          year,
          isLimitReached,
        },
      });
    }

    if (isLimitReached) {
      this.logger.warn(
        `⚠️ ${service} ${metric} limit reached! Current: ${newValue.toFixed(2)}/${limit} (90% threshold)`,
      );
    }

    return {
      currentValue: newValue,
      limitValue: limit,
      isLimitReached,
    };
  }

  /**
   * Reset monthly usage (should be called on 1st of each month)
   */
  async resetMonthlyUsage(): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Reset all usage records for current month
    const usageRecords = await this.prisma.apiUsageTracking.findMany({
      where: {
        month,
        year,
      },
    });

    for (const record of usageRecords) {
      const limit = this.getLimit(record.service, record.metric);
      await this.prisma.apiUsageTracking.update({
        where: { id: record.id },
        data: {
          currentValue: new Prisma.Decimal(0),
          limitValue: new Prisma.Decimal(limit),
          isLimitReached: false,
          lastResetAt: new Date(),
        },
      });
    }

    this.logger.log(`Reset monthly usage for ${usageRecords.length} records`);
  }

  /**
   * Get limit for service and metric
   */
  private getLimit(service: string, metric: string): number {
    const limit = FREE_TIER_LIMITS.find(
      (l) => l.service === service && l.metric === metric,
    );
    return limit?.limit || 0;
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<
    Array<{
      service: string;
      metric: string;
      current: number;
      limit: number;
      percentage: number;
      isLimitReached: boolean;
    }>
  > {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const usageRecords = await this.prisma.apiUsageTracking.findMany({
      where: {
        month,
        year,
      },
    });

    return usageRecords.map((record) => {
      const current = record.currentValue.toNumber();
      const limit = record.limitValue.toNumber();
      const percentage = limit > 0 ? (current / limit) * 100 : 0;

      return {
        service: record.service,
        metric: record.metric,
        current,
        limit,
        percentage: Math.round(percentage * 100) / 100,
        isLimitReached: record.isLimitReached,
      };
    });
  }
}

