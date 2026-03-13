import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthApplicationModule } from '@application/auth/auth-application.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule,
    AuthApplicationModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    // Always include OAuth strategies - they handle missing credentials gracefully
    FacebookStrategy,
    GoogleStrategy,
  ],
  exports: [AuthApplicationModule],
})
export class AuthModule { }

