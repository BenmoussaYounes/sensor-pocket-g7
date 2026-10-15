import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getJwtSecret, JWT_ALGORITHM } from './jwt-config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RouteRateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        algorithm: JWT_ALGORITHM,
        expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
      },
      verifyOptions: { algorithms: [JWT_ALGORITHM] },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RouteRateLimitGuard],
  exports: [AuthService, JwtAuthGuard, RouteRateLimitGuard],
})
export class AuthModule {}
