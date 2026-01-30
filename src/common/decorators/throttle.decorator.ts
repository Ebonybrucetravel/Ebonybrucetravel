import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleConfig {
  limit: number;
  ttl: number; // Time to live in milliseconds
}

export const Throttle = (limit: number, ttl: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttl } as ThrottleConfig);

