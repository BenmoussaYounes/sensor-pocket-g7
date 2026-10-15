import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const RATE_LIMIT_KEY = 'route_rate_limit';

export const RouteRateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs } satisfies RateLimitConfig);

@Injectable()
export class RouteRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config =
      this.reflector.get<RateLimitConfig>(
        RATE_LIMIT_KEY,
        context.getHandler(),
      ) ||
      this.reflector.get<RateLimitConfig>(RATE_LIMIT_KEY, context.getClass());

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const route = request.route?.path ?? request.path;
    const method = request.method;
    const userId = (request as Request & { user?: { sub?: string } }).user?.sub;
    const clientId = userId || request.ip || 'anonymous';
    const key = `${method}:${route}:${clientId}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    const previous = this.buckets.get(key) || [];
    const recent = previous.filter((timestamp) => timestamp >= windowStart);

    if (recent.length >= config.limit) {
      throw new HttpException(
        `Limite atteinte (${config.limit} requêtes sur ${Math.round(config.windowMs / 60000)} min)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.buckets.set(key, recent);
    return true;
  }
}
