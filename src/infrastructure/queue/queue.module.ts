import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailQueueService } from './email-queue.service';
import { BullQueueService, EMAIL_QUEUE } from './bull-queue.service';
import { QueueService, BULL_QUEUE_SERVICE } from './queue.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    EmailModule,
    // Conditionally register BullModule if Redis is configured
    ...(process.env.REDIS_URL
      ? [
          BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
              const redisUrl = configService.get<string>('REDIS_URL');
              
              // If REDIS_URL is provided (Railway format), use it directly
              if (redisUrl) {
                return {
                  redis: redisUrl, // ioredis will parse the connection string
                };
              }
              
              // Otherwise, use individual connection parameters
              return {
                redis: {
                  host: configService.get<string>('REDIS_HOST') || 'localhost',
                  port: configService.get<number>('REDIS_PORT') || 6379,
                  password: configService.get<string>('REDIS_PASSWORD'),
                },
              };
            },
          }),
          BullModule.registerQueue({
            name: EMAIL_QUEUE,
          }),
        ]
      : []),
  ],
  providers: [
    EmailQueueService,
    // Conditionally provide BullQueueService if Redis is configured
    ...(process.env.REDIS_URL
      ? [
          BullQueueService,
          {
            provide: BULL_QUEUE_SERVICE,
            useExisting: BullQueueService,
          },
        ]
      : []),
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule {}

