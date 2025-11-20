import { Module } from '@nestjs/common';
import { StudyService } from './study.service';
import { StudyController } from './study.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MissionsModule } from '../missions/missions.module'; // Импорт MissionsModule

@Module({
  imports: [PrismaModule, AuthModule, MissionsModule], // Добавляем MissionsModule
  controllers: [StudyController],
  providers: [StudyService],
  exports: [StudyService],
})
export class StudyModule {}
