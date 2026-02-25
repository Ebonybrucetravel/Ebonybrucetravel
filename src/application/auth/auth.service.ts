import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, Logger, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { QueueService } from '@infrastructure/queue/queue.service';
import { RegisterDto } from '@presentation/auth/dto/register.dto';
import { LoginDto } from '@presentation/auth/dto/login.dto';
import { ForgotPasswordDto } from '@presentation/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@presentation/auth/dto/reset-password.dto';
import { VerifyEmailDto } from '@presentation/auth/dto/verify-email.dto';

/** Default admin permissions granted to SUPER_ADMIN or ADMIN with empty permissions */
const DEFAULT_ADMIN_PERMISSIONS = {
    canManageBookings: true,
    canManageUsers: true,
    canManageMarkups: true,
    canViewReports: true,
    canCancelBookings: true,
    canViewAllBookings: true,
};

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private jwtService: JwtService,
        private prisma: PrismaService,
        private resendService: ResendService,
        private configService: ConfigService,
        private queueService: QueueService,
    ) { }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Validate user credentials — shared between login() and adminLogin().
     * Returns the full user record on success, throws on failure.
     */
    private async validateCredentials(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            this.logger.warn(`Login attempt with non-existent email: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.deletedAt) {
            this.logger.warn(`Login attempt for deleted account: ${email}`);
            throw new UnauthorizedException('Account has been deleted');
        }

        if ((user as any).suspendedAt) {
            this.logger.warn(`Login attempt for suspended account: ${email}`);
            throw new UnauthorizedException('Account has been suspended');
        }

        if (!user.password) {
            this.logger.warn(`Login attempt for OAuth-only account: ${email}`);
            throw new UnauthorizedException('Please use social login (Facebook/Google) for this account');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            this.logger.warn(`Invalid password attempt for: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        return user;
    }

    /**
     * Compute effective permissions for admin users.
     * SUPER_ADMIN always gets all permissions. ADMIN uses stored permissions or defaults.
     */
    private computeAdminPermissions(user: any): Record<string, boolean> | undefined {
        const role = user.role as string;
        if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') return undefined;

        if (role === 'SUPER_ADMIN') return { ...DEFAULT_ADMIN_PERMISSIONS };

        const stored = user.permissions as Record<string, boolean> | null | undefined;
        return stored && typeof stored === 'object' && Object.keys(stored).length > 0
            ? stored
            : { ...DEFAULT_ADMIN_PERMISSIONS };
    }

    /**
     * Build the auth response (user without sensitive fields + access token + refresh token).
     */
    private async buildAuthResponse(user: any) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = await this.generateRefreshToken(user.id);

        const { password, deletedAt, ...userWithoutPassword } = user;

        // Attach computed permissions for admin users
        const permissions = this.computeAdminPermissions(user);
        if (permissions) {
            (userWithoutPassword as any).permissions = permissions;
        }

        return {
            user: userWithoutPassword,
            token: accessToken,
            refreshToken,
        };
    }

    // ==================== REFRESH TOKENS ====================

    /**
     * Generate a hashed refresh token, store it in DB, and return the raw token.
     */
    private async generateRefreshToken(userId: string): Promise<string> {
        const rawToken = crypto.randomBytes(48).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30-day refresh token

        await this.prisma.refreshToken.create({
            data: {
                token: hashedToken,
                userId,
                expiresAt,
            },
        });

        return rawToken;
    }

    /**
     * Exchange a valid refresh token for a new access token + rotated refresh token.
     */
    async refreshAccessToken(rawRefreshToken: string) {
        const hashedToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: hashedToken },
            include: { user: true },
        });

        if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
            // If the token was already used (revoked), it may be a replay attack — revoke all tokens for safety
            if (storedToken?.revokedAt) {
                this.logger.warn(`Refresh token replay detected for user ${storedToken.userId}`);
                await this.prisma.refreshToken.updateMany({
                    where: { userId: storedToken.userId, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
            }
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = storedToken.user;
        if (user.deletedAt || (user as any).suspendedAt) {
            throw new UnauthorizedException('Account is no longer active');
        }

        // Revoke the used token (rotation)
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
        });

        // Issue new tokens
        return this.buildAuthResponse(user);
    }

    /**
     * Revoke a specific refresh token (logout).
     */
    async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
        const hashedToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        await this.prisma.refreshToken.updateMany({
            where: { token: hashedToken, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    /**
     * Revoke all refresh tokens for a user (logout everywhere).
     */
    async revokeAllUserTokens(userId: string): Promise<void> {
        await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    // ==================== REGISTRATION ====================

    async register(registerDto: RegisterDto) {
        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: registerDto.email },
            });

            if (existingUser) {
                throw new ConflictException('User with this email already exists');
            }

            const hashedPassword = await bcrypt.hash(registerDto.password, 10);

            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            const emailVerificationExpires = new Date();
            emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

            const user = await this.prisma.user.create({
                data: {
                    email: registerDto.email,
                    name: registerDto.name,
                    password: hashedPassword,
                    role: 'CUSTOMER',
                    provider: null,
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

            const payload = { sub: user.id, email: user.email, role: user.role };
            const token = this.jwtService.sign(payload);
            const refreshToken = await this.generateRefreshToken(user.id);

            this.logger.log(`User registered successfully: ${user.email}`);

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
                refreshToken,
            };
        } catch (error) {
            this.logger.error(`Registration failed for ${registerDto.email}:`, error);
            if (error instanceof ConflictException || error instanceof UnauthorizedException) {
                throw error;
            }
            throw new InternalServerErrorException('Registration failed. Please try again.');
        }
    }

    // ==================== LOGIN ====================

    async login(loginDto: LoginDto) {
        try {
            this.logger.debug(`Login attempt for: ${loginDto.email}`);
            const user = await this.validateCredentials(loginDto.email, loginDto.password);
            const result = await this.buildAuthResponse(user);
            this.logger.log(`User logged in successfully: ${user.email}`);
            return result;
        } catch (error) {
            this.logger.error(`Login failed for ${loginDto.email}:`, error);
            if (error instanceof UnauthorizedException) throw error;
            throw new InternalServerErrorException('Login failed. Please try again.');
        }
    }

    /**
     * Admin-only login. Same credential validation, but rejects non-admin roles.
     */
    async adminLogin(loginDto: LoginDto) {
        try {
            this.logger.debug(`Admin login attempt for: ${loginDto.email}`);
            const user = await this.validateCredentials(loginDto.email, loginDto.password);

            if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
                this.logger.warn(`Admin login rejected for non-admin role: ${loginDto.email}`);
                throw new ForbiddenException('Only administrators can sign in here.');
            }

            const result = await this.buildAuthResponse(user);
            this.logger.log(`Admin signed in successfully: ${user.email}`);
            return result;
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof ForbiddenException) throw error;
            this.logger.error(`Admin login failed for ${loginDto.email}:`, error);
            throw new InternalServerErrorException('Admin sign-in failed. Please try again.');
        }
    }

    // ==================== USER VALIDATION ====================

    async validateUser(email: string, password: string) {
        try {
            const user = await this.prisma.user.findUnique({ where: { email } });

            if (!user || user.deletedAt) return null;
            if (!user.password) return null;

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) return null;

            const { password: _, deletedAt: __, ...result } = user;
            return result;
        } catch (error) {
            this.logger.error(`Error validating user ${email}:`, error);
            return null;
        }
    }

    // ==================== OAUTH ====================

    /**
     * Validate or create OAuth user (Facebook/Google).
     * Only auto-links existing accounts when the provider confirms the email is verified.
     */
    async validateOrCreateOAuthUser(oauthUser: {
        provider: string;
        providerId: string;
        email?: string;
        name?: string;
        image?: string;
        accessToken?: string;
        emailVerified?: boolean;
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
                if (user.deletedAt) {
                    throw new UnauthorizedException('Account has been deleted');
                }

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

                    // Only auto-link if the provider confirms the email is verified
                    if (!oauthUser.emailVerified) {
                        this.logger.warn(
                            `OAuth account linking rejected: email ${oauthUser.email} not verified by ${oauthUser.provider}`,
                        );
                        throw new UnauthorizedException(
                            'An account with this email already exists. Please log in with your password first, then link your social account from your profile.',
                        );
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
                    password: null,
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
     * Generate JWT token for OAuth user (used by OAuth callback controllers).
     */
    async generateOAuthToken(user: any) {
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = await this.generateRefreshToken(user.id);
        return { accessToken, refreshToken };
    }

    // ==================== LOGIN NOTIFICATIONS ====================

    /**
     * Schedule delayed login notification email (10-20 minutes random delay).
     */
    private async scheduleLoginNotification(email: string, customerName: string, ipAddress?: string, userAgent?: string): Promise<void> {
        try {
            const minDelay = 10 * 60 * 1000;
            const maxDelay = 20 * 60 * 1000;
            const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

            this.logger.log(`Scheduling login notification email for ${email} in ${Math.round(randomDelay / 1000 / 60)} minutes`);

            const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
            const changePasswordUrl = `${frontendUrl}/change-password`;

            await this.queueService.scheduleEmail(randomDelay, {
                to: email,
                customerName,
                loginTime: new Date(),
                ipAddress,
                userAgent,
                changePasswordUrl,
            });
        } catch (error) {
            this.logger.error(`Error scheduling login notification for ${email}:`, error);
            throw error;
        }
    }

    async scheduleLoginNotificationWithContext(email: string, customerName: string, ipAddress?: string, userAgent?: string): Promise<void> {
        try {
            await this.scheduleLoginNotification(email, customerName, ipAddress, userAgent);
        } catch (error) {
            this.logger.error(`Failed to schedule login notification for ${email}:`, error);
        }
    }

    // ==================== PASSWORD RESET ====================

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email: forgotPasswordDto.email },
            });

            if (!user || user.deletedAt || (user as any).suspendedAt || user.provider) {
                return; // Don't reveal if user exists
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpires = new Date();
            resetExpires.setHours(resetExpires.getHours() + 1);

            await this.prisma.user.update({
                where: { id: user.id },
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
        } catch (error) {
            this.logger.error(`Failed to process forgot password for ${forgotPasswordDto.email}:`, error);
        }
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    resetPasswordToken: resetPasswordDto.token,
                    resetPasswordExpires: { gt: new Date() },
                },
            });

            if (!user || user.deletedAt) {
                throw new BadRequestException('Invalid or expired reset token');
            }

            const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                },
            });

            // Revoke all refresh tokens on password change for security
            await this.revokeAllUserTokens(user.id);

            this.logger.log(`Password reset successful for ${user.email}`);
        } catch (error) {
            this.logger.error('Password reset failed:', error);
            if (error instanceof BadRequestException) throw error;
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

    // ==================== EMAIL VERIFICATION ====================

    async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    emailVerificationToken: verifyEmailDto.token,
                    emailVerificationExpires: { gt: new Date() },
                },
            });

            if (!user || user.deletedAt) {
                throw new BadRequestException('Invalid or expired verification token');
            }

            if (user.emailVerified) {
                throw new BadRequestException('Email already verified');
            }

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
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException('Failed to verify email');
        }
    }
}
