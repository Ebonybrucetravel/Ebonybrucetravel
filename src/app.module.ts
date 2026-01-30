import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Common
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/throttle.guard';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { validate } from './config/env.validation';

// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module';
import { ExternalApisModule } from './infrastructure/external-apis/external-apis.module';
import { CacheModule } from './infrastructure/cache/cache.module';

// Domains
import { BookingModule } from './domains/booking/booking.module';
import { PaymentModule } from './domains/payment/payment.module';
import { MarkupModule } from './domains/markup/markup.module';

// Application
import { BookingApplicationModule } from './application/booking/booking-application.module';
import { PaymentApplicationModule } from './application/payment/payment-application.module';

// Presentation
import { AuthModule } from './presentation/auth/auth.module';
import { AdminModule } from './presentation/admin/admin.module';
import { UserModule } from './presentation/user/user.module';
import { HealthModule } from './presentation/health/health.module';
import { BookingController } from './presentation/booking/booking.controller';
import { PaymentController } from './presentation/payment/payment.controller';
import { MarkupController } from './presentation/markup/markup.controller';
import { DashboardController } from './presentation/dashboard/dashboard.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Infrastructure
    DatabaseModule,
    ExternalApisModule,
    CacheModule,

    // Domains
    BookingModule,
    PaymentModule,
    MarkupModule,

    // Application
    BookingApplicationModule,
    PaymentApplicationModule,

    // Presentation
    AuthModule,
    AdminModule,
    UserModule,
    HealthModule,
  ],
  controllers: [BookingController, PaymentController, MarkupController, DashboardController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Using default guard for now - custom guard needs proper DI setup
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
