import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StudyService } from './study.service';
import { SessionResultDto } from './dto/session-result.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudyMode } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('study') // Группа в Swagger
@ApiBearerAuth() // JWT в Swagger
@Controller('study')
@UseGuards(JwtAuthGuard)
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  // Отправить результаты сессии изучения
  @Post('session-result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отправить результаты сессии изучения' })
  @ApiResponse({ status: 200, description: 'Результаты сохранены.' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные или карточки.',
  })
  async submitSessionResult(@Request() req, @Body() dto: SessionResultDto) {
    return this.studyService.submitSessionResult(req.user.id, dto);
  }

  // Получить прогресс изучения
  @Get('progress')
  @ApiOperation({
    summary: 'Получить прогресс изучения по карточкам',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: StudyMode,
    description: 'Фильтр по режиму изучения',
  })
  async getStudyProgress(@Request() req, @Query('mode') mode?: StudyMode) {
    return this.studyService.getStudyProgress(req.user.id, mode);
  }

  // Получить карточки для повторения
  @Get('cards-to-review')
  @ApiOperation({
    summary:
      'Получить карточки для повторения (невыученные или с низким прогрессом)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Максимальное количество карточек (по умолчанию 20)',
  })
  async getCardsToReview(@Request() req, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.studyService.getCardsToReview(req.user.id, limitNum);
  }
}
