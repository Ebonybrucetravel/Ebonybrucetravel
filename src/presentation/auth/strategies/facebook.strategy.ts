import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/**
 * Facebook OAuth Strategy
 * Gracefully handles missing credentials - won't crash if FACEBOOK_APP_ID is not set
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);
  private readonly isEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('FACEBOOK_APP_ID');
    const clientSecret = configService.get<string>('FACEBOOK_APP_SECRET');
    const callbackURL = configService.get<string>('FACEBOOK_CALLBACK_URL') || '/api/v1/auth/facebook/callback';

    // Always call super, but use dummy values if credentials are missing
    // Passport will still initialize, but we'll check in validate()
    super({
      clientID: clientID || 'disabled',
      clientSecret: clientSecret || 'disabled',
      callbackURL,
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'displayName', 'photos', 'email'],
    });

    this.isEnabled = !!(clientID && clientSecret);

    if (!this.isEnabled) {
      this.logger.warn('Facebook OAuth is disabled - FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not configured');
    } else {
      this.logger.log('Facebook OAuth strategy initialized successfully');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    if (!this.isEnabled) {
      this.logger.error('Facebook OAuth attempted but is disabled');
      return done(new Error('Facebook OAuth is not configured'), null);
    }

    try {
      const { id, name, emails, photos, displayName } = profile;
      const user = {
        provider: 'facebook',
        providerId: id,
        email: emails?.[0]?.value,
        name: name?.givenName && name?.familyName
          ? `${name.givenName} ${name.familyName}`
          : displayName || 'User',
        image: photos?.[0]?.value,
        accessToken,
      };

      // Find or create user
      const authenticatedUser = await this.authService.validateOrCreateOAuthUser(user);
      done(null, authenticatedUser);
    } catch (error) {
      this.logger.error('Facebook OAuth validation error:', error);
      done(error, null);
    }
  }
}
