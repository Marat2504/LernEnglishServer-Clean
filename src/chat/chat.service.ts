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
  async createDialog(
    userId: string,
    topic?: string,
    difficulty?: string,
    languageLevel?: string
  ) {
    this.logger.log(
      `Создание нового диалога для userId=${userId}, topic=${topic}, difficulty=${difficulty}, languageLevel=${languageLevel}`
    );
    return this.prisma.chatDialog.create({
      data: {
        userId,
        topic,
        difficulty,
        languageLevel,
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
  async callBlackboxAi(messages: any[]): Promise<string> {
    try {
      this.logger.log(
        `Вызов Blackbox.ai с messages: ${JSON.stringify(messages)}`
      );
      // Пример тела запроса, соответствующего API Blackbox.ai v1/chat/completions
      const requestBody = {
        model: 'blackboxai/openai/gpt-4',
        messages,
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

    // Получаем последние 5 сообщений в диалоге для контекста, кроме текущего
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: {
        dialogId,
        NOT: {
          text: userText, // Исключаем нынешнее сообщение, чтобы не дублировать
          sender: 'USER',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Формируем массив сообщений для ИИ, переворачивая порядок на нормальный и добавляя роли
    const messagesForAI = recentMessages
      .slice()
      .reverse()
      .map(msg => ({
        role: msg.sender === 'USER' ? 'user' : 'assistant',
        content: msg.text,
      }));

    // Получаем информацию о диалоге (чтобы взять уровень языка)
    const dialogInfo = await this.prisma.chatDialog.findUnique({
      where: { id: dialogId },
    });

    // Добавляем системное сообщение с подсказкой про уровень языка
    if (dialogInfo?.languageLevel) {
      messagesForAI.unshift({
        role: 'system',
        content: `You are chatting with a user whose English level is ${dialogInfo.languageLevel}. Please adjust your language accordingly.`,
      });
    }

    // Добавляем текущее сообщение пользователя в сообщения для ИИ
    messagesForAI.push({
      role: 'user',
      content: userText,
    });

    // Получаем ответ ИИ
    const aiResponseText = await this.callBlackboxAi(messagesForAI);

    // Сохраняем ответ ИИ
    const aiMessage = await this.addMessageToDialog(
      dialogId,
      'AI',
      aiResponseText
    );

    return { userMessage, aiMessage };
  }

  // Новый метод для проверки и объяснения ошибок в пользовательском сообщении
  async handleUserMessageWithCorrection(
    dialogId: string,
    userText: string
  ): Promise<{
    userMessage: any;
    aiMessage: any;
    correction: { correctedText: string; explanation: string };
  }> {
    this.logger.log(
      `Обработка сообщения с коррекцией в диалоге ${dialogId}: ${userText}`
    );

    // Формируем отдельный prompt для коррекции и объяснений
    const correctionPrompt = [
      {
        role: 'system',
        content:
          'Ты помощник по изучению английского языка. Проверь правильность следующего сообщения пользователя, исправь ошибки и подробно объясни их НА РУССКОМ ЯЗЫКЕ. ' +
          'Ответь в формате JSON с полями correctedText и explanation.',
      },
      { role: 'user', content: userText },
    ];

    // Получаем коррекционный ответ ИИ
    const correctionResponseRaw = await this.callBlackboxAi(correctionPrompt);

    // Парсим JSON с исправлениями
    let correction: { correctedText: string; explanation: string } = {
      correctedText: '',
      explanation: '',
    };
    try {
      correction = JSON.parse(correctionResponseRaw);
    } catch (e) {
      this.logger.error('Ошибка парсинга JSON ответа на коррекцию', e);
      correction = {
        correctedText: userText,
        explanation: 'Не удалось получить пояснения от ИИ.',
      };
    }

    // Сохраняем сообщение пользователя сразу с исправлением и пояснением
    const userMessage = await this.addMessageToDialog(
      dialogId,
      'USER',
      userText,
      undefined,
      correction.correctedText,
      correction.explanation
    );

    // Получаем последние 5 сообщений в диалоге для контекста, исключая сообщения с correction, а также исключая текущее сообщение
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: {
        dialogId,
        correction: null,
        NOT: {
          id: userMessage.id,
          sender: 'USER',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Формируем массив сообщений для регулярного ответа ИИ
    const messagesForAI = recentMessages
      .slice()
      .reverse()
      .map(msg => ({
        role: msg.sender === 'USER' ? 'user' : 'assistant',
        content: msg.text,
      }));

    // Получаем информацию о диалоге для уровня языка
    const dialogInfo = await this.prisma.chatDialog.findUnique({
      where: { id: dialogId },
    });

    if (dialogInfo?.languageLevel) {
      messagesForAI.unshift({
        role: 'system',
        content: `You are chatting with a user whose English level is ${dialogInfo.languageLevel}. Please adjust your language accordingly.`,
      });
    }

    // Добавляем текущее сообщение в сообщения для ИИ
    messagesForAI.push({
      role: 'user',
      content: userText,
    });

    // Получаем обычный ответ ИИ (без коррекции)
    const aiResponseText = await this.callBlackboxAi(messagesForAI);

    // Сохраняем ответ ИИ
    const aiMessage = await this.addMessageToDialog(
      dialogId,
      'AI',
      aiResponseText
    );

    return { userMessage, aiMessage, correction };
  }
}
