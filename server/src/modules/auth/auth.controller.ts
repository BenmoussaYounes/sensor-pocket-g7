import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RouteRateLimit, RouteRateLimitGuard } from './rate-limit.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  // 5 tentatives/min par IP : sans ça, /auth/login se brute-force à volonté.
  @UseGuards(RouteRateLimitGuard)
  @RouteRateLimit(5, 60_000)
  @ApiOperation({ summary: 'Authentifie un groupe et renvoie un JWT court' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['group', 'password'],
      properties: {
        group: { type: 'string', example: 'groupe7' },
        password: { type: 'string', example: 'motDePasseFort' },
      },
    },
  })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
