import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDialogDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Тема диалога', required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ description: 'Уровень сложности', required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;
}
