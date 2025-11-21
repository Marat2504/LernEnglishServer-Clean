// src/tags/dto/restore-tag.dto.ts
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RestoreTagDto {
  @ApiPropertyOptional({
    description: 'Принудительно восстановить (игнорировать проверки)',
    default: false,
  })
  @IsOptional()
  force?: boolean; // Опционально: для админов (пока не используем)
}
