import { Controller, Post, Body, Get, UseGuards, Request, Req, Res, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import * as requestIp from 'request-ip';
import { Public } from '@common/decorators/public.decorator';
import { Throttle } from '@common/decorators/throttle.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AuthService } from '@application/auth/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Throttle(3, 60000) // 3 requests per minute for registration
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle(5, 60000) // 5 requests per minute for login
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    // Extract IP address and user agent for security notification
    const ipAddress = requestIp.getClientIp(req) || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await this.authService.login(loginDto);

    // Schedule delayed login notification with request context (fire and forget)
    // This is non-blocking and errors are caught internally
    if (result && result.user) {
      // Don't await - let it run in background
      // scheduleLoginNotificationWithContext already has internal error handling
      this.authService.scheduleLoginNotificationWithContext(
        result.user.email,
        result.user.name || 'Valued Customer',
        ipAddress,
        userAgent,
      ).catch((error) => {
        // This should rarely happen since scheduleLoginNotificationWithContext catches errors internally
        // But we catch here as a final safety net
        console.error('Unexpected error in login notification scheduling:', error);
      });
    }

    return result;
  }

  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Facebook for authentication' })
  @ApiResponse({ status: 400, description: 'Facebook OAuth not configured' })
  async facebookAuth() {
    // Guard redirects to Facebook
    // If OAuth is not configured, the strategy will handle the error gracefully
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 200, description: 'Facebook login successful' })
  @ApiResponse({ status: 401, description: 'Facebook authentication failed' })
  async facebookAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?error=authentication_failed`);
      }

      const user = req.user;
      const { accessToken, refreshToken } = await this.authService.generateOAuthToken(user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?error=authentication_failed`);
    }
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google for authentication' })
  @ApiResponse({ status: 400, description: 'Google OAuth not configured' })
  async googleAuth() {
    // Guard redirects to Google
    // If OAuth is not configured, the strategy will handle the error gracefully
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Google login successful' })
  @ApiResponse({ status: 401, description: 'Google authentication failed' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?error=authentication_failed`);
      }

      const user = req.user;
      const { accessToken, refreshToken } = await this.authService.generateOAuthToken(user);

      // Redirect to frontend with tokens
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?error=authentication_failed`);
    }
  }

  @Public()
  @Throttle(3, 60000) // 3 requests per minute
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent (if account exists)' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto);
    // Always return success (security best practice - don't reveal if email exists)
    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Public()
  @Throttle(5, 60000) // 5 requests per minute
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return {
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    };
  }

  @Public()
  @Throttle(10, 60000) // 10 requests per minute
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto);
    return {
      success: true,
      message: 'Email verified successfully.',
    };
  }
  @Public()
  @Throttle(10, 60000)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange a valid refresh token for a new access token and rotated refresh token.',
  })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } }, required: ['refreshToken'] } })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Revokes the provided refresh token. If no refresh token is provided, revokes all refresh tokens for the user. ' +
      'The client should also remove the access token from storage.',
  })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } }, required: false })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Request() req: any, @Body('refreshToken') refreshToken?: string) {
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    } else {
      await this.authService.revokeAllUserTokens(req.user.id);
    }
    return {
      success: true,
      message: 'Logout successful.',
    };
  }
}
