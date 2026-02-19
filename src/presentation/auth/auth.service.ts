import { Injectable, UnauthorizedException, ConflictException, Logger, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { QueueService } from '@infrastructure/queue/queue.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private resendService: ResendService,
    private configService: ConfigService,
    private queueService: QueueService,
  ) {}

  async register(registerDto: RegisterDto) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24); // 24 hours

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          name: registerDto.name,
          password: hashedPassword, // Required for email/password registration
          role: 'CUSTOMER',
          provider: null, // Email/password users don't have OAuth provider
          providerId: null,
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires,
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

      this.logger.log(`User registered successfully: ${user.email}`);

      // Send registration welcome email with verification link (async, don't wait)
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${emailVerificationToken}`;
      
      this.resendService.sendRegistrationEmail({
        to: user.email,
        customerName: user.name || 'Valued Customer',
        email: user.email,
        verificationUrl,
      }).catch((error) => {
        this.logger.error(`Failed to send registration email to ${user.email}:`, error);
      });

      return {
        user,
        token,
      };
    } catch (error) {
      this.logger.error(`Registration failed for ${registerDto.email}:`, error);
      if (error instanceof ConflictException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Registration failed. Please try again.');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      this.logger.debug(`Login attempt for: ${loginDto.email}`);
      
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
      });

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is deleted
      if (user.deletedAt) {
        this.logger.warn(`Login attempt for deleted account: ${loginDto.email}`);
        throw new UnauthorizedException('Account has been deleted');
      }

      // Check if user is suspended (admin action)
      if ((user as any).suspendedAt) {
        this.logger.warn(`Login attempt for suspended account: ${loginDto.email}`);
        throw new UnauthorizedException('Account has been suspended');
      }

      // OAuth users don't have passwords
      if (!user.password) {
        this.logger.warn(`Login attempt for OAuth-only account: ${loginDto.email}`);
        throw new UnauthorizedException('Please use social login (Facebook/Google) for this account');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

      if (!isPasswordValid) {
        this.logger.warn(`Invalid password attempt for: ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT token
      const payload = { sub: user.id, email: user.email, role: user.role };
      const token = this.jwtService.sign(payload);

      // Return user (without password) and token
      const { password, deletedAt, ...userWithoutPassword } = user;

      // So admin frontend does not show "insufficient permissions": SUPER_ADMIN/ADMIN get effective permissions
      const role = user.role as string;
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        const stored = user.permissions as Record<string, boolean> | null | undefined;
        (userWithoutPassword as any).permissions =
          role === 'SUPER_ADMIN'
            ? {
                canManageBookings: true,
                canManageUsers: true,
                canManageMarkups: true,
                canViewReports: true,
                canCancelBookings: true,
                canViewAllBookings: true,
              }
            : stored && typeof stored === 'object' && Object.keys(stored).length > 0
              ? stored
              : {
                  canManageBookings: true,
                  canManageUsers: true,
                  canManageMarkups: true,
                  canViewReports: true,
                  canCancelBookings: true,
                  canViewAllBookings: true,
                };
      }

      this.logger.log(`User logged in successfully: ${user.email}`);

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      this.logger.error(`Login failed for ${loginDto.email}:`, error);
      this.logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log the actual error details for debugging in production
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Login internal error details: ${errorMessage}`);
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }

  async validateUser(email: string, password: string) {
    try {
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
    } catch (error) {
      this.logger.error(`Error validating user ${email}:`, error);
      return null;
    }
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
    try {
      // First, try to find user by provider + providerId
      let user = await this.prisma.user.findFirst({
        where: {
          provider: oauthUser.provider,
          providerId: oauthUser.providerId,
        },
      });

      if (user) {
        // Check if user is deleted
        if (user.deletedAt) {
          throw new UnauthorizedException('Account has been deleted');
        }

        // Update user info if needed (e.g., profile picture changed)
        if (oauthUser.image && user.image !== oauthUser.image) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { image: oauthUser.image },
          });
        }
        const { password, deletedAt, ...userWithoutPassword } = user;
        this.logger.log(`OAuth user found: ${user.email} (${oauthUser.provider})`);
        return userWithoutPassword;
      }

      // If not found by provider, check if email exists (account linking)
      if (oauthUser.email) {
        const existingUser = await this.prisma.user.findUnique({
          where: { email: oauthUser.email },
        });

        if (existingUser) {
          if (existingUser.deletedAt) {
            throw new UnauthorizedException('Account has been deleted');
          }

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
          this.logger.log(`OAuth account linked to existing user: ${user.email}`);
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
      this.logger.log(`New OAuth user created: ${user.email} (${oauthUser.provider})`);
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(`OAuth validation failed for ${oauthUser.provider}:`, error);
      if (error instanceof UnauthorizedException || error instanceof Error) {
        throw error;
      }
      throw new InternalServerErrorException('OAuth authentication failed');
    }
  }

  /**
   * Generate JWT token for OAuth user
   */
  async generateOAuthToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  /**
   * Schedule delayed login notification email (10-20 minutes random delay)
   * This is a security feature to notify users of sign-in attempts
   * Uses queue service instead of setTimeout for better reliability
   */
  private async scheduleLoginNotification(email: string, customerName: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      // Random delay between 10-20 minutes (600,000 - 1,200,000 ms)
      const minDelay = 10 * 60 * 1000; // 10 minutes
      const maxDelay = 20 * 60 * 1000; // 20 minutes
      const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      this.logger.log(`Scheduling login notification email for ${email} in ${Math.round(randomDelay / 1000 / 60)} minutes`);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const changePasswordUrl = `${frontendUrl}/change-password`; // Frontend change password page

      // Use queue service (BullMQ/Redis if available, otherwise in-memory)
      await this.queueService.scheduleEmail(randomDelay, {
        to: email,
        customerName,
        loginTime: new Date(),
        ipAddress,
        userAgent,
        changePasswordUrl,
      });
    } catch (error) {
      // Log error but don't throw - this is a non-critical feature
      this.logger.error(`Error scheduling login notification for ${email}:`, error);
      throw error; // Re-throw to be caught by scheduleLoginNotificationWithContext
    }
  }

  /**
   * Schedule login notification with request context (called from controller)
   * This method is designed to never throw - all errors are caught and logged
   */
  async scheduleLoginNotificationWithContext(email: string, customerName: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await this.scheduleLoginNotification(email, customerName, ipAddress, userAgent);
    } catch (error) {
      // Log error but don't throw - login should succeed even if notification scheduling fails
      this.logger.error(`Failed to schedule login notification for ${email}:`, error);
    }
  }

  /**
   * Send forgot password email with reset token
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: forgotPasswordDto.email },
      });

      // Don't reveal if user exists (security best practice)
      if (!user || user.deletedAt || (user as any).suspendedAt || user.provider) {
        // OAuth users or non-existent users - silently return
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

      // Save reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
        },
      });

      // Send reset email
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await this.resendService.sendPasswordResetEmail({
        to: user.email,
        customerName: user.name || 'Valued Customer',
        resetUrl,
        expiresIn: '1 hour',
      });
    } catch (error) {
      this.logger.error(`Failed to process forgot password for ${forgotPasswordDto.email}:`, error);
      // Don't throw - security best practice
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          resetPasswordToken: resetPasswordDto.token,
          resetPasswordExpires: {
            gt: new Date(), // Token not expired
          },
        },
      });

      if (!user || user.deletedAt) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

      // Update password and clear reset token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      this.logger.log(`Password reset successful for ${user.email}`);
    } catch (error) {
      this.logger.error('Password reset failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  /**
   * Admin: send password reset link to a user by ID (for customer support).
   */
  async sendPasswordResetLinkForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.deletedAt || (user as any).suspendedAt) {
      throw new NotFoundException('User not found or cannot receive reset link');
    }
    if (user.provider) {
      throw new BadRequestException('OAuth users cannot receive password reset link');
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await this.resendService.sendPasswordResetEmail({
      to: user.email,
      customerName: user.name || 'Valued Customer',
      resetUrl,
      expiresIn: '1 hour',
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          emailVerificationToken: verifyEmailDto.token,
          emailVerificationExpires: {
            gt: new Date(), // Token not expired
          },
        },
      });

      if (!user || user.deletedAt) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      if (user.emailVerified) {
        throw new BadRequestException('Email already verified');
      }

      // Mark email as verified
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        },
      });

      this.logger.log(`Email verified for ${user.email}`);
    } catch (error) {
      this.logger.error('Email verification failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to verify email');
    }
  }
}
