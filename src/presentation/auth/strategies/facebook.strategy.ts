import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || '/api/v1/auth/facebook/callback',
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'displayName', 'photos', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
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
  }
}

