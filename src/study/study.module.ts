import { Module } from '@nestjs/common';
import { StudyService } from './study.service';
import { StudyController } from './study.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MissionsModule } from '../missions/missions.module'; // Импорт MissionsModule
import { AchievementsModule } from '../achievements/achievements.module'; // Импорт AchievementsModule

@Module({
  imports: [PrismaModule, AuthModule, MissionsModule, AchievementsModule], // Добавляем AchievementsModule
  controllers: [StudyController],
  providers: [StudyService],
  exports: [StudyService],
})
export class StudyModule {}
