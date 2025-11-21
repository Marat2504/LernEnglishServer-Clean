import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('achievements')
@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all achievements for the user' })
  @ApiResponse({
    status: 200,
    description: 'List of achievements with unlock status.',
  })
  getAll(@Request() req: any) {
    return this.achievementsService.getAllAchievements(req.user.userId);
  }

  @Post('check')
  @ApiOperation({
    summary: 'Check and unlock achievements based on user stats',
  })
  @ApiResponse({
    status: 200,
    description: 'Achievements checked and unlocked.',
  })
  checkAndUnlock(@Request() req: any) {
    return this.achievementsService.checkAndUnlockAchievements(req.user.userId);
  }
}
