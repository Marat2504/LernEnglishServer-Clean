import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Создание нового диалога
  async createDialog(userId: string, topic?: string, difficulty?: string) {
    return this.prisma.chatDialog.create({
      data: {
        userId,
        topic,
        difficulty,
      },
    });
  }

  // Получение диалога по ID с сообщениями
  async getDialogById(dialogId: string) {
    return this.prisma.chatDialog.findUnique({
      where: { id: dialogId },
      include: { messages: true },
    });
  }

  // Добавление сообщения в диалог
  async addMessageToDialog(
    dialogId: string,
    sender: 'USER' | 'AI',
    text: string,
    audioUrl?: string,
    correction?: string,
    explanation?: string,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        dialogId,
        sender,
        text,
        audioUrl,
        correction,
        explanation,
      },
    });
  }

  // Реализуйте дополнительную логику взаимодействия с ИИ агентом здесь
}
