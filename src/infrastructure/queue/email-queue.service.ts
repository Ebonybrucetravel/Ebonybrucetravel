import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendService, LoginNotificationEmailData } from '@infrastructure/email/resend.service';

interface QueuedEmail {
  id: string;
  data: LoginNotificationEmailData;
  scheduledFor: Date;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Simple in-memory email queue service for delayed notifications
 * 
 * NOTE: For production, consider using BullMQ/Redis for persistent queues
 * This implementation will lose queued emails on server restart
 */
@Injectable()
export class EmailQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly queue: Map<string, QueuedEmail> = new Map();

  constructor(
    private readonly resendService: ResendService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Schedule a delayed email notification
   * @param delayMs Delay in milliseconds
   * @param emailData Email data to send
   * @returns Queue job ID
   */
  scheduleEmail(delayMs: number, emailData: LoginNotificationEmailData): string {
    const jobId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scheduledFor = new Date(Date.now() + delayMs);

    const timeoutId = setTimeout(async () => {
      try {
        await this.resendService.sendLoginNotificationEmail(emailData);
        this.queue.delete(jobId);
        this.logger.log(`Delayed email sent successfully: ${jobId}`);
      } catch (error) {
        this.logger.error(`Failed to send queued email ${jobId}:`, error);
        // Keep in queue for potential retry (not implemented in this simple version)
      }
    }, delayMs);

    this.queue.set(jobId, {
      id: jobId,
      data: emailData,
      scheduledFor,
      timeoutId,
    });

    this.logger.log(
      `Email scheduled: ${jobId} for ${scheduledFor.toISOString()} (${Math.round(delayMs / 1000 / 60)} minutes)`,
    );

    return jobId;
  }

  /**
   * Cancel a scheduled email
   */
  cancelEmail(jobId: string): boolean {
    const job = this.queue.get(jobId);
    if (job && job.timeoutId) {
      clearTimeout(job.timeoutId);
      this.queue.delete(jobId);
      this.logger.log(`Cancelled scheduled email: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { total: number; jobs: Array<{ id: string; scheduledFor: Date }> } {
    return {
      total: this.queue.size,
      jobs: Array.from(this.queue.values()).map((job) => ({
        id: job.id,
        scheduledFor: job.scheduledFor,
      })),
    };
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    this.logger.log(`Clearing ${this.queue.size} queued emails on shutdown`);
    for (const job of this.queue.values()) {
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }
    }
    this.queue.clear();
  }
}

