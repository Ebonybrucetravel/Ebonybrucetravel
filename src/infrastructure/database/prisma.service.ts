import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds

  constructor(private readonly configService: ConfigService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
    });

    // Log connection string (masked for security)
    const dbUrl = configService.get<string>('DATABASE_URL');
    if (dbUrl) {
      const maskedUrl = this.maskDatabaseUrl(dbUrl);
      this.logger.log(`Database URL configured: ${maskedUrl}`);
    } else {
      this.logger.error('DATABASE_URL environment variable is not set!');
    }
  }

  async onModuleInit() {
    // Connect in background - don't block app startup
    // This allows the server to start listening immediately
    // while the database connection is being established
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

      // Log helpful troubleshooting info
      const dbUrl = this.configService.get<string>('DATABASE_URL');
      if (dbUrl) {
        const maskedUrl = this.maskDatabaseUrl(dbUrl);
        this.logger.warn(`Connection string: ${maskedUrl}`);
        
        // Check if it's a Supabase connection
        if (dbUrl.includes('supabase.co')) {
          this.logger.warn('⚠️  Supabase detected. Common issues:');
          this.logger.warn('   1. Ensure DATABASE_URL uses connection pooler (port 6543) for serverless');
          this.logger.warn('   2. Direct connection (port 5432) may not work in serverless environments');
          this.logger.warn('   3. Check Supabase dashboard: Settings → Database → Connection Pooling');
          this.logger.warn('   4. Use format: postgresql://user:pass@host:6543/db?pgbouncer=true');
        }
      } else {
        this.logger.error('DATABASE_URL environment variable is missing!');
      }

      // Retry logic
      if (retryCount < this.maxRetries - 1) {
        const delay = this.retryDelay * (retryCount + 1); // Exponential backoff
        this.logger.log(`Retrying connection in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.connectWithRetry(retryCount + 1);
      }

      // Final failure - log detailed error but don't crash the app
      this.logger.error('⚠️  Database connection failed after all retries');
      this.logger.error('⚠️  Application will continue but database operations will fail');
      this.logger.error('⚠️  Please check:');
      this.logger.error('   1. DATABASE_URL environment variable is set correctly');
      this.logger.error('   2. Database server is running and accessible');
      this.logger.error('   3. Network/firewall allows connections');
      this.logger.error('   4. Database credentials are correct');
      
      // Don't throw - allow app to start even if DB is temporarily unavailable
      // This is useful during development when DB might be paused
    }
  }

  private maskDatabaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const maskedPassword = urlObj.password ? '***' : '';
      return `${urlObj.protocol}//${urlObj.username}:${maskedPassword}@${urlObj.hostname}:${urlObj.port}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, just show first and last few chars
      if (url.length > 20) {
        return `${url.substring(0, 10)}...${url.substring(url.length - 10)}`;
      }
      return '***';
    }
  }
}
