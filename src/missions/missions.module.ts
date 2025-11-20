import { Module, forwardRef } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  providers: [MissionsService],
  controllers: [MissionsController],
  exports: [MissionsService], // Экспорт для использования в других модулях
})
export class MissionsModule {}
