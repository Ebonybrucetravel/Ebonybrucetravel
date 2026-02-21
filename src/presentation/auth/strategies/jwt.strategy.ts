import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@infrastructure/database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret && process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET is required in production environment');
        }
        return secret || 'CbWF7ge7Qse7xl4oHZR1sj8VL8LI8tWZ2iLnZR+3rgc=';
      })(),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        deletedAt: true,
        permissions: true,
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    const result: any = { id: user.id, email: user.email, role: user.role };
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      result.permissions = (user.permissions as Record<string, boolean>) || null;
    }
    return result;
  }
}
