import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TagsModule } from '../tags/tags.module';
import { MissionsModule } from '../missions/missions.module'; // Импорт MissionsModule

@Module({
  imports: [PrismaModule, AuthModule, TagsModule, MissionsModule], // Добавляем MissionsModule
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
