import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCorrectionMessageDto {
  @ApiProperty({ description: 'Текст сообщения от пользователя' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
