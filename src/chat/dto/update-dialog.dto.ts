import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDialogDto {
  @ApiProperty({ description: 'Тема диалога', required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ description: 'Уровень сложности', required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({ description: 'Уровень языка', required: false })
  @IsOptional()
  @IsString()
  languageLevel?: string;
}
