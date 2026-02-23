import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * NestJS Prisma service using Prisma 7 driver adapter (@prisma/adapter-pg).
 * Connection URL is configured via DATABASE_URL; schema no longer holds url (see prisma.config.ts).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds

  constructor(private readonly configService: ConfigService) {
    const rawUrl = configService.get<string>('DATABASE_URL');
    const connectionString = PrismaService.normalizeDatabaseUrl(rawUrl);

    // Allow disabling TLS cert verification (e.g. Supabase pooler from Railway). Read from process.env
    // so it works even when not in the validated env schema (validated config strips unknown keys).
    const sslRejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? configService.get<string>('DATABASE_SSL_REJECT_UNAUTHORIZED');
    const disableSslVerify = /^(false|0|no|off)$/i.test(String(sslRejectUnauthorized ?? '').trim());
    if (disableSslVerify) {
      console.warn('[PrismaService] SSL certificate verification disabled (DATABASE_SSL_REJECT_UNAUTHORIZED). Connection still encrypted.');
    }

    const adapter = new PrismaPg({
      connectionString: connectionString || undefined,
      ...(disableSslVerify && { ssl: { rejectUnauthorized: false } }),
    });

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    const dbUrl = rawUrl;
    if (dbUrl) {
      this.logger.log(`Database URL configured: ${this.maskDatabaseUrl(dbUrl)}`);
    } else {
      this.logger.error('DATABASE_URL environment variable is not set!');
    }
  }

  async onModuleInit() {
    this.connectWithRetry().catch((error) => {
      this.logger.error('Background database connection failed:', error?.message);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async connectWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`❌ Failed to connect to database (attempt ${retryCount + 1}/${this.maxRetries})`);
      this.logger.error(`Error: ${errorMessage}`);

      const dbUrl = this.configService.get<string>('DATABASE_URL');
      if (dbUrl) {
        this.logger.warn(`Connection string: ${this.maskDatabaseUrl(dbUrl)}`);
        if (dbUrl.includes('supabase.co')) {
          this.logger.warn('⚠️  Supabase: use pooler (port 6543) and connection_limit in URL if needed.');
        }
      } else {
        this.logger.error('DATABASE_URL environment variable is missing!');
      }

      if (retryCount < this.maxRetries - 1) {
        const delay = this.retryDelay * (retryCount + 1);
        this.logger.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.connectWithRetry(retryCount + 1);
      }

      this.logger.error('⚠️  Database connection failed after all retries; app will continue but DB ops may fail.');
    }
  }

  private static normalizeDatabaseUrl(url: string | undefined): string {
    if (!url) return '';
    try {
      const isSupabase = url.includes('supabase.co');
      const hasLimit = /[?&]connection_limit=/.test(url);
      if (isSupabase && !hasLimit) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}connection_limit=5`;
      }
      return url;
    } catch {
      return url;
    }
  }

  private maskDatabaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const maskedPassword = urlObj.password ? '***' : '';
      return `${urlObj.protocol}//${urlObj.username}:${maskedPassword}@${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`;
    } catch {
      if (url.length > 20) {
        return `${url.substring(0, 10)}...${url.substring(url.length - 10)}`;
      }
      return '***';
    }
  }
}
