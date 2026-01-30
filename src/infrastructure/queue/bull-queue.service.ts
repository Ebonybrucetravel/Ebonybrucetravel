import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ResendService, LoginNotificationEmailData } from '@infrastructure/email/resend.service';

export const EMAIL_QUEUE = 'email-queue';

@Injectable()
export class BullQueueService implements OnModuleInit {
  private readonly logger = new Logger(BullQueueService.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
    private readonly resendService: ResendService,
  ) {}

  onModuleInit() {
    // Process delayed login notification emails
    this.emailQueue.process('login-notification', async (job) => {
      const emailData: LoginNotificationEmailData = job.data;
      try {
        await this.resendService.sendLoginNotificationEmail(emailData);
        this.logger.log(`Delayed login notification email sent to ${emailData.to}`);
      } catch (error) {
        this.logger.error(`Failed to send queued email to ${emailData.to}:`, error);
        throw error; // Bull will retry based on retry configuration
      }
    });

    this.logger.log('BullMQ email queue processor initialized');
  }

  /**
   * Schedule a delayed email notification using BullMQ
   * @param delayMs Delay in milliseconds
   * @param emailData Email data to send
   * @returns Queue job ID
   */
  async scheduleEmail(delayMs: number, emailData: LoginNotificationEmailData): Promise<string> {
    const job = await this.emailQueue.add(
      'login-notification',
      emailData,
      {
        delay: delayMs,
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5 second delay
        },
        removeOnComplete: true, // Remove completed jobs
        removeOnFail: false, // Keep failed jobs for inspection
      },
    );

    this.logger.log(
      `Email scheduled via BullMQ: ${job.id} for ${new Date(Date.now() + delayMs).toISOString()} (${Math.round(delayMs / 1000 / 60)} minutes)`,
    );

    return job.id.toString();
  }

  /**
   * Cancel a scheduled email
   */
  async cancelEmail(jobId: string): Promise<boolean> {
    try {
      const job = await this.emailQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled scheduled email: ${jobId}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to cancel email ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}

