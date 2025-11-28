import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDialogDto {
  @ApiProperty({ description: 'Тема диалога', required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ description: 'Уровень сложности', required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;
}
