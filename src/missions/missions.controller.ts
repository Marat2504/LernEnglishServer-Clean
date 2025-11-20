import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('missions') // Группа в Swagger
@ApiBearerAuth() // JWT в Swagger
@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  // Получить дневные миссии пользователя
  @Get('daily')
  @ApiOperation({ summary: 'Получить текущие дневные миссии пользователя' })
  @ApiResponse({ status: 200, description: 'Список активных миссий.' })
  async getDailyMissions(@Request() req) {
    return this.missionsService.getDailyMissions(req.user.id);
  }

  // Обновить прогресс миссии (например, после действия)
  @Post(':id/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить прогресс миссии' })
  @ApiParam({ name: 'id', description: 'UUID миссии' })
  @ApiResponse({ status: 200, description: 'Прогресс обновлён.' })
  @ApiResponse({ status: 404, description: 'Миссия не найдена.' })
  async updateProgress(
    @Request() req,
    @Param('id', ParseUUIDPipe) missionId: string
  ) {
    return this.missionsService.updateMissionProgress(req.user.id, missionId);
  }

  // Завершить миссию вручную
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Завершить миссию вручную' })
  @ApiParam({ name: 'id', description: 'UUID миссии' })
  @ApiResponse({ status: 200, description: 'Миссия завершена.' })
  @ApiResponse({ status: 404, description: 'Миссия не найдена.' })
  async completeMission(
    @Request() req,
    @Param('id', ParseUUIDPipe) missionId: string
  ) {
    return this.missionsService.completeMission(req.user.id, missionId);
  }
}
