import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface OttPayload {
    accessToken: string;
    refreshToken: string;
    user: any;
}

interface CacheEntry {
    payload: OttPayload;
    expiresAt: number;
}

/**
 * One-Time Token (OTT) Service
 * Temporarily stores OAuth tokens so they can be securely exchanged for a one-time code
 * rather than leaking them in the URL redirect.
 */
@Injectable()
export class OttService {
    private readonly logger = new Logger(OttService.name);
    private readonly cache = new Map<string, CacheEntry>();
    // 60 seconds is plenty of time for a browser redirect to complete and the client to fetch
    private readonly ttlMs = 60 * 1000;

    /**
     * Generates a random one-time code and stores the payload.
     */
    generateOtt(payload: OttPayload): string {
        const code = crypto.randomUUID();

        this.cache.set(code, {
            payload,
            expiresAt: Date.now() + this.ttlMs,
        });

        this.logger.debug(`Generated OTT code ${code}`);
        return code;
    }

    /**
     * Atomically pops the payload for the given code.
     * Throws UnauthorizedException if the code is invalid or expired.
     */
    consumeOtt(code: string): OttPayload {
        const entry = this.cache.get(code);

        if (!entry) {
            this.logger.warn(`Attempted to consume invalid OTT code: ${code}`);
            throw new UnauthorizedException('Invalid or expired one-time code');
        }

        // Atomically remove so it can only be used once
        this.cache.delete(code);

        if (Date.now() > entry.expiresAt) {
            this.logger.warn(`Attempted to consume expired OTT code: ${code}`);
            throw new UnauthorizedException('Invalid or expired one-time code');
        }

        return entry.payload;
    }

    /**
     * Periodically clean up expired codes to prevent memory leaks
     */
    cleanExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
