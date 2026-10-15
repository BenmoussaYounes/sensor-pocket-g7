import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { LoginDto } from './dto/login.dto';

type AuthPayload = {
  sub: string;
  group: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(input: LoginDto): {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
  } {
    const group = input.group?.trim();
    const password = input.password;

    if (!group || !password) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const accounts = this.getAccounts();
    const expectedPassword = Object.prototype.hasOwnProperty.call(
      accounts,
      group,
    )
      ? accounts[group]
      : undefined;
    // On compare toujours (même si le groupe n'existe pas) et à temps
    // constant : ni le temps de réponse ni le message ne révèlent si c'est le
    // groupe ou le mot de passe qui est faux.
    const matches = this.safeEqual(expectedPassword ?? '', password);
    if (!expectedPassword || !matches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload: AuthPayload = { sub: group, group };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    };
  }

  verify(token: string): AuthPayload {
    try {
      return this.jwtService.verify<AuthPayload>(token);
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }
  }

  private safeEqual(a: string, b: string): boolean {
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
  }

  private getAccounts(): Record<string, string> {
    const fromJson = process.env.AUTH_ACCOUNTS_JSON;
    if (fromJson) {
      try {
        const parsed = JSON.parse(fromJson) as Record<string, unknown>;
        return Object.entries(parsed).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            if (typeof value === 'string' && value.trim()) {
              acc[key.trim()] = value;
            }
            return acc;
          },
          {},
        );
      } catch {
        throw new UnauthorizedException(
          'Configuration AUTH_ACCOUNTS_JSON invalide',
        );
      }
    }

    const fallbackGroup = process.env.AUTH_GROUP?.trim();
    const fallbackPassword = process.env.AUTH_PASSWORD;
    if (fallbackGroup && fallbackPassword) {
      return { [fallbackGroup]: fallbackPassword };
    }

    return {};
  }
}
