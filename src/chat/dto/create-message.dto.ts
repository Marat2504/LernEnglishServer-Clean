import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'Строковый ID диалога' })
  @IsNotEmpty()
  @IsString()
  dialogId: string;

  @ApiProperty({ description: 'Отправитель сообщения', enum: ['USER', 'AI'] })
  @IsNotEmpty()
  @IsIn(['USER', 'AI'])
  sender: 'USER' | 'AI';

  @ApiProperty({ description: 'Текст сообщения' })
  @IsNotEmpty()
  @IsString()
  text: string;

  @ApiProperty({ description: 'URL аудио файла', required: false })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiProperty({ description: 'Исправление сообщения ИИ', required: false })
  @IsOptional()
  @IsString()
  correction?: string;

  @ApiProperty({ description: 'Объяснение ИИ', required: false })
  @IsOptional()
  @IsString()
  explanation?: string;
}
