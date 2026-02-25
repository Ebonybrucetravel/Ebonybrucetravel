import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { EmailModule } from '@infrastructure/email/email.module';
import { QueueModule } from '@infrastructure/queue/queue.module';

@Module({
    imports: [
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
                    signOptions: { expiresIn: '15m' },
                };
            },
        }),
        DatabaseModule,
        EmailModule,
        QueueModule,
    ],
    providers: [AuthService],
    exports: [AuthService, JwtModule],
})
export class AuthApplicationModule { }
