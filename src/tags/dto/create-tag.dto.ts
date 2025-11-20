import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger'; // Для Swagger docs (опционально)

export class CreateTagDto {
  @ApiPropertyOptional({ description: 'Имя тега' })
  @IsString()
  @MinLength(1, { message: 'Имя тега должно быть не короче 1 символа' })
  name: string;

  @ApiPropertyOptional({
    description: 'Предустановленный тег (глобальный)?',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPredefined должно быть boolean (true/false)' })
  isPredefined?: boolean; // Опционально, default false в сервисе
}
