import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateDialogDto } from './dto/create-dialog.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateCorrectionMessageDto } from './dto/create-correction-message.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Создать новый диалог' })
  @ApiResponse({ status: 201, description: 'Диалог успешно создан.' })
  @Post('dialog')
  async createDialog(@Body() createDialogDto: CreateDialogDto) {
    const { userId, topic, difficulty } = createDialogDto;
    return this.chatService.createDialog(userId, topic, difficulty);
  }

  @ApiOperation({ summary: 'Получить диалог с сообщениями по ID с пагинацией' })
  @ApiResponse({
    status: 200,
    description: 'Диалог с сообщениями и информацией о пагинации.',
  })
  @Get('dialog/:id')
  async getDialog(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    // Ограничения для безопасности
    const safeLimit = Math.min(Math.max(limitNum, 10), 100); // 10-100 сообщений

    return this.chatService.getDialogById(id, pageNum, safeLimit);
  }

  @ApiOperation({ summary: 'Добавить сообщение в диалог' })
  @ApiResponse({ status: 201, description: 'Сообщение добавлено.' })
  @Post('dialog/:id/message')
  async addMessage(
    @Param('id') dialogId: string,
    @Body() createMessageDto: CreateMessageDto
  ) {
    const { sender, text, audioUrl, correction, explanation } =
      createMessageDto;
    return this.chatService.addMessageToDialog(
      dialogId,
      sender,
      text,
      audioUrl,
      correction,
      explanation
    );
  }

  @ApiOperation({
    summary: 'Отправить сообщение пользователя и получить ответ ИИ',
  })
  @ApiResponse({
    status: 201,
    description: 'Сообщение обработано и ответ ИИ добавлен.',
  })
  @Post('dialog/:id/message/send')
  async sendMessageAndGetResponse(
    @Param('id') dialogId: string,
    @Body('text') userText: string
  ) {
    return this.chatService.handleUserMessage(dialogId, userText);
  }

  @ApiOperation({
    summary:
      'Отправить сообщение пользователя, получить ответ ИИ и дополнительный разбор текста (коррекция и пояснения)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Сообщение обработано, ответ ИИ добавлен, дополнительно возвращена коррекция.',
  })
  @Post('dialog/:id/message/send-with-correction')
  async sendMessageAndGetResponseWithCorrection(
    @Param('id') dialogId: string,
    @Body() createCorrectionMessageDto: CreateCorrectionMessageDto
  ) {
    const { text } = createCorrectionMessageDto;
    return this.chatService.handleUserMessageWithCorrection(dialogId, text);
  }

  // Дополнительно можно добавить эндпоинты для управления диалогами
}
