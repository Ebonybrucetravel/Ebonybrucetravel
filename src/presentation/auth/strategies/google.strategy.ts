import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/**
 * Google OAuth Strategy
 * Gracefully handles missing credentials - won't crash if GOOGLE_CLIENT_ID is not set
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly isEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || '/api/v1/auth/google/callback';

    // Always call super, but use dummy values if credentials are missing
    // Passport will still initialize, but we'll check in validate()
    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL,
      scope: ['email', 'profile'],
    });

    this.isEnabled = !!(clientID && clientSecret);

    if (!this.isEnabled) {
      this.logger.warn('Google OAuth is disabled - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
    } else {
      this.logger.log('Google OAuth strategy initialized successfully');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    if (!this.isEnabled) {
      this.logger.error('Google OAuth attempted but is disabled');
      return done(new Error('Google OAuth is not configured'), null);
    }

    try {
      const { id, name, emails, photos } = profile;
      const user = {
        provider: 'google',
        providerId: id,
        email: emails?.[0]?.value,
        name: name?.givenName && name?.familyName
          ? `${name.givenName} ${name.familyName}`
          : name?.displayName || profile.displayName,
        image: photos?.[0]?.value,
        accessToken,
      };

      // Find or create user
      const authenticatedUser = await this.authService.validateOrCreateOAuthUser(user);
      done(null, authenticatedUser);
    } catch (error) {
      this.logger.error('Google OAuth validation error:', error);
      done(error, null);
    }
  }
}
