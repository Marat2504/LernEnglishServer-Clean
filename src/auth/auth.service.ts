import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MissionsService } from '../missions/missions.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private missionsService: MissionsService
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        username: dto.username || dto.email.split('@')[0],
        currentLanguageLevel: 'A1',
      },
      select: { id: true, email: true, username: true, createdAt: true },
    });

    await this.prisma.userStats.create({
      data: { userId: user.id },
    });

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  // Этот метод используется в JwtStrategy для валидации токена
  async validateUser(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, username: true },
    });
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    return user;
  }

  async getUserStats(userId: string) {
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      throw new NotFoundException('Статистика пользователя не найдена');
    }

    // Получаем уровень языка пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLanguageLevel: true },
    });

    return {
      userId,
      totalXp: userStats.totalXp,
      currentLevel: userStats.currentLevel,
      totalWords: userStats.totalWords,
      learnedWords: userStats.learnedWords,
      wordsViewedToday: userStats.wordsViewedToday,
      wordsLearnedToday: userStats.wordsLearnedToday,
      cardsAddedToday: userStats.cardsAddedToday,
      timeSpentSec: userStats.timeSpentSec,
      timeSpentTodaySec: userStats.timeSpentTodaySec,
      storiesReadToday: userStats.storiesReadToday,
      lastDailyReset: userStats.lastDailyReset,
      currentLanguageLevel: user?.currentLanguageLevel || 'A1',
    };
  }
}
