import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { EmailModule } from '@infrastructure/email/email.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET is required in production environment');
          }
          console.warn(
            '⚠️  JWT_SECRET not set. Using default dev secret. This is insecure for production!',
          );
        }
        return {
          secret: secret || 'dev-secret-key-change-in-production',
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
    DatabaseModule,
    EmailModule,
    QueueModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    // Always include OAuth strategies - they handle missing credentials gracefully
    // If credentials are missing, they'll log a warning but won't crash the app
    // The strategies check isEnabled in their validate() methods
    FacebookStrategy,
    GoogleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
