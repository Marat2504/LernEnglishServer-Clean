// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

// Определяем интерфейс для JWT payload
interface JwtPayload {
  sub: string; // userId
  email: string;
  // Добавьте другие поля, если они есть в вашем токене
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET environment variable is not set! Check your .env file.'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  // Метод validate вызывается после успешной верификации токена
  async validate(payload: JwtPayload) {
    // <-- Используем JwtPayload
    // Используем AuthService для поиска пользователя по данным из токена
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException(
        'Пользователь не найден или токен недействителен.'
      );
    }
    // Возвращаем объект пользователя, который будет прикреплен к req.user
    return user; // Возвращает { id, email, username } для req.user
  }
}
