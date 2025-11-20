import {
  IsEnum,
  IsArray,
  ValidateNested,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StudyMode } from '@prisma/client';

export class CardResultDto {
  @IsString()
  cardId: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentMs?: number; // Время на ответ в миллисекундах
}

export class SessionResultDto {
  @IsEnum(StudyMode)
  mode: StudyMode;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardResultDto)
  cardResults: CardResultDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalTimeSpentSec?: number; // Общее время сессии
}
