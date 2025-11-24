import { ApiProperty } from '@nestjs/swagger';

export class CreateCorrectionResponseDto {
  @ApiProperty({ description: 'Исправленный текст пользователя' })
  correctedText: string;

  @ApiProperty({ description: 'Объяснение исправлений' })
  explanation: string;

  @ApiProperty({ description: 'Ответ ИИ на сообщение пользователя' })
  aiResponse: string;
}
