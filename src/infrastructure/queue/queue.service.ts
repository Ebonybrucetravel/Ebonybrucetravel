import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginNotificationEmailData } from '@infrastructure/email/resend.service';
import { BullQueueService } from './bull-queue.service';
import { EmailQueueService } from './email-queue.service';

// Token for optional BullQueueService injection
export const BULL_QUEUE_SERVICE = Symbol('BULL_QUEUE_SERVICE');

/**
 * Unified queue service that uses BullMQ/Redis when available,
 * falls back to in-memory queue when Redis is not configured
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly useRedis: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailQueueService: EmailQueueService,
    @Optional() @Inject(BULL_QUEUE_SERVICE) private readonly bullQueueService?: BullQueueService,
  ) {
    // Check if Redis is configured and BullQueueService is available
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.useRedis = !!(redisUrl && this.bullQueueService);

    if (this.useRedis) {
      this.logger.log('Using BullMQ/Redis for email queue');
    } else {
      this.logger.warn(
        'Redis not configured. Using in-memory queue (emails will be lost on server restart). Set REDIS_URL to enable persistent queues.',
      );
    }
  }

  /**
   * Schedule a delayed email notification
   */
  async scheduleEmail(delayMs: number, emailData: LoginNotificationEmailData): Promise<string> {
    if (this.useRedis && this.bullQueueService) {
      return await this.bullQueueService.scheduleEmail(delayMs, emailData);
    } else {
      return this.emailQueueService.scheduleEmail(delayMs, emailData);
    }
  }

  /**
   * Cancel a scheduled email
   */
  async cancelEmail(jobId: string): Promise<boolean> {
    if (this.useRedis && this.bullQueueService) {
      return await this.bullQueueService.cancelEmail(jobId);
    } else {
      return this.emailQueueService.cancelEmail(jobId);
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<any> {
    if (this.useRedis && this.bullQueueService) {
      return await this.bullQueueService.getQueueStatus();
    } else {
      return this.emailQueueService.getQueueStatus();
    }
  }
}
