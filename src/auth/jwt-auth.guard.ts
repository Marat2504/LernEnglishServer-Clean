// src/auth/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Этот метод переопределяется для обработки ошибок аутентификации
  handleRequest(err: any, user: any, info: any) {
    // Если есть ошибка или пользователь не аутентифицирован
    if (err || !user) {
      // Выбрасываем исключение UnauthorizedException
      throw (
        err || new UnauthorizedException('Токен недействителен или отсутствует')
      );
    }
    // Если аутентификация успешна, возвращаем объект пользователя
    return user;
  }
}
