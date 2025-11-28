import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  Delete,
  Put,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateDialogDto } from './dto/create-dialog.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateCorrectionMessageDto } from './dto/create-correction-message.dto';
import { UpdateDialogDto } from './dto/update-dialog.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({ summary: 'Получить список диалогов пользователя' })
  @ApiResponse({ status: 200, description: 'Список диалогов с пагинацией.' })
  @Get('dialogs/:userId')
  async getUserDialogs(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    // Ограничения для безопасности
    const safeLimit = Math.min(Math.max(limitNum, 5), 50); // 5-50 диалогов

    return this.chatService.getUserDialogs(userId, pageNum, safeLimit);
  }

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

  @ApiOperation({
    summary: 'Обновить параметры диалога',
    description:
      'Позволяет обновить тему, уровень сложности или уровень языка существующего диалога. Все поля опциональны - можно обновить только нужные параметры.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID диалога для обновления',
    type: 'string',
  })
  @ApiBody({
    type: UpdateDialogDto,
    description: 'Параметры для обновления диалога',
    examples: {
      'Обновить тему': {
        summary: 'Обновление только темы диалога',
        value: {
          topic: 'Обсуждение путешествий по Европе',
        },
      },
      'Обновить уровень сложности': {
        summary: 'Обновление уровня сложности',
        value: {
          difficulty: 'C1',
        },
      },
      'Обновить все параметры': {
        summary: 'Обновление всех параметров диалога',
        value: {
          topic: 'Бизнес английский',
          difficulty: 'B2',
          languageLevel: 'B2',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Диалог успешно обновлен.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID диалога' },
        userId: { type: 'string', description: 'UUID пользователя' },
        topic: { type: 'string', description: 'Тема диалога' },
        difficulty: { type: 'string', description: 'Уровень сложности' },
        languageLevel: { type: 'string', description: 'Уровень языка' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Диалог не найден.' })
  @Put('dialog/:id')
  async updateDialog(
    @Param('id') dialogId: string,
    @Body() updateDialogDto: UpdateDialogDto
  ) {
    const { topic, difficulty, languageLevel } = updateDialogDto;
    return this.chatService.updateDialog(dialogId, {
      topic,
      difficulty,
      languageLevel,
    });
  }

  @ApiOperation({ summary: 'Удалить диалог со всеми его сообщениями' })
  @ApiResponse({ status: 200, description: 'Диалог успешно удален.' })
  @Delete('dialog/:id')
  async deleteDialog(@Param('id') dialogId: string) {
    return this.chatService.deleteDialog(dialogId);
  }

  // Дополнительно можно добавить эндпоинты для управления диалогами
}
