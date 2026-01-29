import { Controller, Post, Body, Get, UseGuards, Request, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '@common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Facebook OAuth endpoints - Commented out until FACEBOOK_APP_ID is configured
  // @Public()
  // @Get('facebook')
  // @UseGuards(AuthGuard('facebook'))
  // @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  // @ApiResponse({ status: 302, description: 'Redirects to Facebook for authentication' })
  // async facebookAuth() {
  //   // Guard redirects to Facebook
  // }

  // @Public()
  // @Get('facebook/callback')
  // @UseGuards(AuthGuard('facebook'))
  // @ApiOperation({ summary: 'Facebook OAuth callback' })
  // @ApiResponse({ status: 200, description: 'Facebook login successful' })
  // async facebookAuthCallback(@Req() req: any, @Res() res: Response) {
  //   const user = req.user;
  //   const token = await this.authService.generateOAuthToken(user);

  //   // Redirect to frontend with token (adjust URL as needed)
  //   const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  //   res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  // }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google for authentication' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Google login successful' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const token = await this.authService.generateOAuthToken(user);

    // Redirect to frontend with token (adjust URL as needed)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
  }
}
