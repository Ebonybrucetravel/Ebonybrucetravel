import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface OttPayload {
    accessToken: string;
    refreshToken: string;
    user: any;
}


@Injectable()
export class OttService {
    private readonly logger = new Logger(OttService.name);

    private readonly ttlMs = 60 * 1000;

    constructor(private readonly jwtService: JwtService) {}
    generateOtt(payload: OttPayload): string {
        const code = this.jwtService.sign(
            { ...payload, _ott: true },
            { expiresIn: '60s' },
        );
        this.logger.debug(`Generated OTT code (${code.length} chars)`);
        return code;
    }

   
    consumeOtt(code: string): OttPayload {
        try {
            const decoded: any = this.jwtService.verify(code);

            if (!decoded || decoded._ott !== true) {
                this.logger.warn(`OTT code missing marker`);
                throw new UnauthorizedException('Invalid or expired one-time code');
            }

            const { _ott, iat, exp, ...payload } = decoded;
            return payload as OttPayload;
        } catch (err) {
            this.logger.warn(`Attempted to consume invalid or expired OTT code`);
            throw new UnauthorizedException('Invalid or expired one-time code');
        }
    }

   
    cleanExpired(): void {
       
    }
}