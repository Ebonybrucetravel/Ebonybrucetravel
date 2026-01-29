import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        password: hashedPassword, // Required for email/password registration
        role: 'CUSTOMER',
        provider: null, // Email/password users don't have OAuth provider
        providerId: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      user,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is deleted
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // OAuth users don't have passwords
    if (!user.password) {
      throw new UnauthorizedException('Please use social login (Facebook/Google) for this account');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Return user (without password) and token
    const { password, deletedAt, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    // OAuth users don't have passwords
    if (!user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, deletedAt: __, ...result } = user;
    return result;
  }

  /**
   * Validate or create OAuth user (Facebook/Google)
   */
  async validateOrCreateOAuthUser(oauthUser: {
    provider: string;
    providerId: string;
    email?: string;
    name?: string;
    image?: string;
    accessToken?: string;
  }) {
    // First, try to find user by provider + providerId
    let user = await this.prisma.user.findFirst({
      where: {
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      },
    });

    if (user) {
      // Update user info if needed (e.g., profile picture changed)
      if (oauthUser.image && user.image !== oauthUser.image) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { image: oauthUser.image },
        });
      }
      const { password, deletedAt, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }

    // If not found by provider, check if email exists (account linking)
    if (oauthUser.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: oauthUser.email },
      });

      if (existingUser) {
        // Link OAuth account to existing user
        user = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            image: oauthUser.image || existingUser.image,
          },
        });
        const { password, deletedAt, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
    }

    // Create new OAuth user
    if (!oauthUser.email) {
      throw new Error(`Email is required for ${oauthUser.provider} authentication`);
    }

    user = await this.prisma.user.create({
      data: {
        email: oauthUser.email,
        name: oauthUser.name,
        image: oauthUser.image,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
        password: null, // OAuth users don't have passwords
        role: 'CUSTOMER',
      },
    });

    const { password, deletedAt, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT token for OAuth user
   */
  async generateOAuthToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }
}
