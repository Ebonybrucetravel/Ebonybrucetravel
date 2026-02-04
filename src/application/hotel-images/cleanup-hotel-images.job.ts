import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HotelImageCacheService } from './hotel-image-cache.service';
import { UsageTrackingService } from '@infrastructure/usage-tracking/usage-tracking.service';

@Injectable()
export class CleanupHotelImagesJob {
  private readonly logger = new Logger(CleanupHotelImagesJob.name);

  constructor(
    private hotelImageCacheService: HotelImageCacheService,
    private usageTrackingService: UsageTrackingService,
  ) {}

  /**
   * Clean up expired hotel images daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredImages() {
    this.logger.log('Starting daily cleanup of expired hotel images...');
    try {
      const deletedCount = await this.hotelImageCacheService.cleanupExpiredImages();
      this.logger.log(`Successfully cleaned up ${deletedCount} expired hotel images`);
    } catch (error) {
      this.logger.error('Error during hotel images cleanup:', error);
    }
  }

  /**
   * Reset monthly usage tracking on the 1st of each month at 12 AM
   */
  @Cron('0 0 1 * *') // 1st of every month at midnight
  async resetMonthlyUsage() {
    this.logger.log('Resetting monthly API usage tracking...');
    try {
      await this.usageTrackingService.resetMonthlyUsage();
      this.logger.log('Successfully reset monthly API usage tracking');
    } catch (error) {
      this.logger.error('Error resetting monthly usage:', error);
    }
  }
}

