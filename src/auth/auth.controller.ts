import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('auth') // Группа в Swagger
@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true })) // Автоматическая валидация DTO
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth() // JWT в Swagger
  @ApiOperation({ summary: 'Получить статистику пользователя' })
  @ApiResponse({ status: 200, description: 'Статистика пользователя.' })
  @ApiResponse({ status: 401, description: 'Неавторизован.' })
  @ApiResponse({ status: 404, description: 'Статистика не найдена.' })
  async getUserStats(@Request() req) {
    return await this.authService.getUserStats(req.user.id);
  }
}
