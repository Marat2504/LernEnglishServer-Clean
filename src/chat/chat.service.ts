import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private blackboxApiKey = 'sk-_SUxXFbCbWCHpgzDLlJP3w'; // Вставлен ваш ключ API здесь
  private blackboxApiUrl = 'https://api.blackbox.ai/v1/chat/completions';

  constructor(private readonly prisma: PrismaService) {}

  // Создание нового диалога
  async createDialog(userId: string, topic?: string, difficulty?: string) {
    this.logger.log(
      `Создание нового диалога для userId=${userId}, topic=${topic}, difficulty=${difficulty}`
    );
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
    explanation?: string
  ) {
    this.logger.log(
      `Добавление сообщения в диалог ${dialogId}, отправитель: ${sender}, текст: ${text}`
    );
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

  // Вызов Blackbox.ai API для генерации ответа ИИ
  async callBlackboxAi(inputText: string): Promise<string> {
    try {
      this.logger.log(`Вызов Blackbox.ai с запросом: ${inputText}`);
      // Пример тела запроса, соответствующего API Blackbox.ai v1/chat/completions
      const requestBody = {
        model: 'blackboxai/openai/gpt-4',
        messages: [
          {
            role: 'user',
            content: inputText,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
        stream: false,
      };
      const response = await axios.post(this.blackboxApiUrl, requestBody, {
        headers: {
          Authorization: `Bearer ${this.blackboxApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Извлечение текста ответа из соответствующей структуры данных
      const data = response.data as {
        choices?: { message?: { content?: string } }[];
      };
      const aiText =
        data.choices &&
        data.choices.length > 0 &&
        data.choices[0].message?.content
          ? data.choices[0].message.content
          : '';
      this.logger.log(`Ответ Blackbox.ai: ${aiText}`);
      return aiText;
    } catch (error: unknown) {
      let errMsg = 'Unknown error';
      if (error instanceof Error) {
        errMsg = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          errMsg = JSON.stringify(error);
        } catch {
          errMsg = String(error);
        }
      }
      this.logger.error('Ошибка вызова Blackbox.ai', errMsg);
      return 'Извините, произошла ошибка при обработке запроса.';
    }
  }

  // Обработка сообщения пользователя с ответом от ИИ и сохранением ответа
  async handleUserMessage(
    dialogId: string,
    userText: string
  ): Promise<{ userMessage: any; aiMessage: any }> {
    this.logger.log(
      `Обработка пользовательского сообщения в диалоге ${dialogId}: ${userText}`
    );
    // Сохраняем сообщение пользователя
    const userMessage = await this.addMessageToDialog(
      dialogId,
      'USER',
      userText
    );

    // Получаем ответ ИИ с помощью Blackbox.ai
    const aiResponseText = await this.callBlackboxAi(userText);

    // Сохраняем ответ ИИ
    const aiMessage = await this.addMessageToDialog(
      dialogId,
      'AI',
      aiResponseText
    );

    return { userMessage, aiMessage };
  }
}
