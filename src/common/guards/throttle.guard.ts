import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_KEY, ThrottleConfig } from '../decorators/throttle.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: any,
    storageService: any,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    const throttleConfig = this.reflector.get<ThrottleConfig>(THROTTLE_KEY, context.getHandler());

    if (throttleConfig) {
      return throttleConfig.limit;
    }

    // Default limit from global config (100)
    return 100;
  }

  protected async getTTL(context: ExecutionContext): Promise<number> {
    const throttleConfig = this.reflector.get<ThrottleConfig>(THROTTLE_KEY, context.getHandler());

    if (throttleConfig) {
      return throttleConfig.ttl;
    }

    // Default TTL from global config (60000ms = 1 minute)
    return 60000;
  }
}
