// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from './jwt-auth.guard'; // <-- НОВЫЙ ИМПОРТ
import { MissionsModule } from '../missions/missions.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
    }),
    MissionsModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard], // <-- ДОБАВЛЕН JwtAuthGuard
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard], // <-- ДОБАВЛЕН JwtAuthGuard для использования в других модулях
})
export class AuthModule {}
