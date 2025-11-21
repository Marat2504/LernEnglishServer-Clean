// src/cards/cards.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException, // Добавлен импорт
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { Prisma } from '@prisma/client';
import { TagsService } from '../tags/tags.service'; // Импорт для findOneTag
import { MissionsService } from '../missions/missions.service'; // Импорт для обновления прогресса миссий
import { AchievementsService } from '../achievements/achievements.service'; // Импорт для проверки достижений

@Injectable()
export class CardsService {
  constructor(
    private prisma: PrismaService,
    private tagsService: TagsService, // Инжектим TagsService для проверки тега
    private missionsService: MissionsService // Инжектим MissionsService для миссий
  ) {}

  async createCard(userId: string, dto: CreateCardDto) {
    const card = await this.prisma.card.create({
      data: {
        userId: userId,
        englishWord: dto.englishWord,
        russianTranslation: dto.russianTranslation,
        notes: dto.notes,
        audioUrl: dto.audioUrl,
        difficultyLevel: dto.difficultyLevel,
      },
    });

    // Проверяем и сбрасываем ежедневную статистику, если нужно
    await this.resetDailyStatsIfNeeded(userId);

    // Обновляем статистику пользователя (upsert для безопасности)
    await this.prisma.userStats.upsert({
      where: { userId: userId },
      update: {
        totalWords: { increment: 1 },
        cardsAddedToday: { increment: 1 },
      },
      create: {
        userId: userId,
        totalWords: 1,
        cardsAddedToday: 1,
      },
    });

    // Обновляем прогресс миссий типа ADD_CARDS
    try {
      await this.missionsService.updateMissionProgress(
        userId,
        'add-10-cards',
        1
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[ERROR] Ошибка обновления прогресса миссии ADD_CARDS: ${message}`
      );
      // Не бросаем ошибку, чтобы не ломать создание карточки
    }

    // Также обновляем миссии типа ADD_CARDS_WITH_AUDIO, если есть аудио
    if (dto.audioUrl) {
      try {
        await this.missionsService.updateMissionProgress(
          userId,
          'add-cards-with-audio',
          1
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[ERROR] Ошибка обновления прогресса миссии ADD_CARDS_WITH_AUDIO: ${message}`
        );
      }
    }

    return card;
  }

  async findAllCards(userId: string, filterTags?: string[]) {
    // filterTags: массив имён тегов
    const where: Prisma.CardWhereInput = {
      userId,
      deletedAt: null,
    };
    // Фильтр по тегам (если переданы)
    if (filterTags && filterTags.length > 0) {
      where.cardTags = {
        some: {
          tag: {
            name: { in: filterTags },
            deletedAt: null,
          },
        },
      };
    }
    return this.prisma.card.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cardTags: {
          where: {
            tag: { deletedAt: null }, // Фильтр на уровне cardTags
          },
          select: {
            assignedAt: true, // Используем assignedAt (из схемы)
            tag: {
              select: {
                id: true,
                name: true,
                isPredefined: true,
              },
            },
          },
        },
      },
    });
  }

  async findCardById(userId: string, cardId: string) {
    return this.prisma.card.findUnique({
      where: {
        id: cardId,
        userId: userId,
        deletedAt: null,
      },
      include: {
        cardTags: {
          where: { tag: { deletedAt: null } },
          select: {
            assignedAt: true, // assignedAt из схемы
            tag: {
              select: {
                id: true,
                name: true,
                isPredefined: true,
              },
            },
          },
        },
      },
    });
  }

  async updateCard(
    userId: string,
    cardId: string,
    updateDto: Partial<CreateCardDto>
  ) {
    const existingCard = await this.prisma.card.findUnique({
      where: {
        id: cardId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existingCard) {
      throw new NotFoundException(
        `Карточка с ID "${cardId}" не найдена или вы не имеете к ней доступа.`
      );
    }

    return this.prisma.card.update({
      where: { id: cardId },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
    });
  }

  async deleteCard(userId: string, cardId: string) {
    const existingCard = await this.prisma.card.findUnique({
      where: {
        id: cardId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existingCard) {
      throw new NotFoundException(
        `Карточка с ID "${cardId}" не найдена или вы не имеете к ней доступа.`
      );
    }

    // Soft delete
    const deletedCard = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Обновить статистику (уменьшить totalWords)
    await this.prisma.userStats.update({
      where: { userId: userId },
      data: { totalWords: { decrement: 1 } },
    });

    return deletedCard;
  }

  async findDeletedCards(userId: string) {
    return this.prisma.card.findMany({
      where: {
        userId: userId,
        deletedAt: { not: null },
      },
      orderBy: {
        deletedAt: 'desc',
      },
      include: {
        cardTags: {
          where: { tag: { deletedAt: null } },
          select: {
            assignedAt: true, // assignedAt
            tag: {
              select: {
                id: true,
                name: true,
                isPredefined: true,
              },
            },
          },
        },
      },
    });
  }

  async restoreCard(userId: string, cardId: string) {
    // Шаг 1: Проверяем существование удалённой карточки
    const deletedCard = await this.prisma.card.findUnique({
      where: {
        id: cardId,
        userId: userId,
        deletedAt: { not: null }, // Ищем только удалённые (deletedAt не null)
      },
    });

    if (!deletedCard) {
      throw new NotFoundException(
        `Удалённая карточка с ID "${cardId}" не найдена или вы не имеете к ней доступа.`
      );
    }

    try {
      // Шаг 2: Восстанавливаем (soft undelete)
      const restoredCard = await this.prisma.card.update({
        where: {
          id: cardId,
          userId: userId,
          deletedAt: { not: null }, // Убеждаемся, что обновляем только удалённую
        },
        data: {
          deletedAt: null, // Сбрасываем метку удаления
          updatedAt: new Date(), // Обновляем timestamp
        },
      });

      // Шаг 3: Обновляем статистику (возвращаем totalWords)
      await this.prisma.userStats.update({
        where: { userId: userId },
        data: { totalWords: { increment: 1 } },
      });

      return {
        message: 'Карточка успешно восстановлена.',
        card: restoredCard, // Возвращаем восстановленную карточку
      };
    } catch (error) {
      console.error('Ошибка при восстановлении карточки:', error);
      throw new BadRequestException(
        'Не удалось восстановить карточку. Попробуйте позже.'
      );
    }
  }

  // Привязать тег к карточке
  async addTagToCard(userId: string, cardId: string, tagId: string) {
    console.log(
      `[DEBUG] Привязка тега к карточке: cardId="${cardId}", tagId="${tagId}", userId="${userId}"`
    );

    try {
      // Шаг 1: Проверяем карточку (существует, ваша, active)
      const card = await this.prisma.card.findUnique({
        where: {
          id: cardId,
          userId, // Только ваша
          deletedAt: null, // Active
        },
      });

      if (!card) {
        console.log(`[DEBUG] Карточка ${cardId} не найдена или недоступна`);
        throw new NotFoundException(
          `Карточка с ID "${cardId}" не найдена или недоступна.`
        );
      }

      // Шаг 2: Проверяем тег (существует, доступен: свой/глобальный, active)
      // Используем инжектированный TagsService
      const tag = await this.tagsService.findOneTag(userId, tagId); // Бросит 404, если недоступен/deleted

      // Шаг 3: Проверяем дубликат
      const existingLink = await this.prisma.cardTag.findUnique({
        where: {
          cardId_tagId: { cardId, tagId },
        },
      });

      if (existingLink) {
        console.log(
          `[DEBUG] Привязка уже существует: cardId=${cardId}, tagId=${tagId}`
        );
        throw new ConflictException(
          `Тег "${tag.name}" уже привязан к этой карточке.`
        );
      }

      // Шаг 4: Создаём связь
      const cardTag = await this.prisma.cardTag.create({
        data: {
          cardId,
          tagId,
        },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              isPredefined: true,
            },
          },
          // Опционально: Добавьте card для полноты (но card уже загружен выше)
          card: {
            select: {
              id: true,
              englishWord: true,
              russianTranslation: true,
              userId: true,
            }, // Используем поля из схемы (englishWord/russianTranslation)
          },
        },
      });

      console.log(
        `[DEBUG] Тег "${tag.name}" привязан к карточке "${card.englishWord}": cardTag ID=${cardId}-${tagId}` // Фикс: Нет cardTag.id (composite PK), используем cardId-tagId; englishWord вместо front
      );
      return {
        message: 'Тег успешно привязан к карточке.',
        cardTag, // Возвращаем связь + tag/card
      };
    } catch (error) {
      console.error(`[ERROR] Ошибка в addTagToCard:`, error.message);
      throw error; // Re-throw (NotFound, Conflict и т.д.)
    }
  }

  // Отвязать тег от карточки
  async removeTagFromCard(userId: string, cardId: string, tagId: string) {
    console.log(
      `[DEBUG] Отвязка тега от карточки: cardId="${cardId}", tagId="${tagId}", userId="${userId}"`
    );

    try {
      // Шаг 1: Проверяем существование связи
      const existingLink = await this.prisma.cardTag.findUnique({
        where: {
          cardId_tagId: { cardId, tagId },
        },
      });

      if (!existingLink) {
        console.log(
          `[DEBUG] Связь не найдена: cardId=${cardId}, tagId=${tagId}`
        );
        throw new NotFoundException(
          `Связь тега с ID "${tagId}" и карточки "${cardId}" не найдена.`
        );
      }

      // Шаг 2: Проверяем карточку (принадлежит пользователю, active)
      const card = await this.prisma.card.findUnique({
        where: {
          id: cardId,
          userId,
          deletedAt: null,
        },
      });

      if (!card) {
        console.log(`[DEBUG] Карточка ${cardId} недоступна`);
        throw new NotFoundException(`Карточка с ID "${cardId}" не доступна.`);
      }

      // Шаг 3: Проверяем тег (доступен, active) — для consistency
      // Используем инжектированный TagsService
      const tag = await this.tagsService.findOneTag(userId, tagId); // Бросит 404 если недоступен

      // Шаг 4: Удаляем связь (не тег/карту)
      const deletedCardTag = await this.prisma.cardTag.delete({
        where: {
          cardId_tagId: { cardId, tagId },
        },
        include: {
          tag: { select: { name: true } }, // Для лога (tag.name)
        },
      });

      console.log(
        `[DEBUG] Тег "${tag.name}" отвязан от карточки "${card.englishWord || 'N/A'}": deleted ID=${cardId}-${tagId}` // Фикс: Нет deletedCardTag.id; englishWord вместо front
      );
      return {
        message: 'Тег успешно отвязан от карточки.',
      };
    } catch (error) {
      console.error(`[ERROR] Ошибка в removeTagFromCard:`, error.message);
      throw error;
    }
  }

  // Получить теги для конкретной карточки
  async findTagsForCard(userId: string, cardId: string) {
    console.log(
      `[DEBUG] Получение тегов для карточки: cardId="${cardId}", userId="${userId}"`
    );

    try {
      // Шаг 1: Проверяем карточку
      const card = await this.prisma.card.findUnique({
        where: {
          id: cardId,
          userId,
          deletedAt: null,
        },
      });

      if (!card) {
        console.log(`[DEBUG] Карточка ${cardId} не найдена`);
        throw new NotFoundException(`Карточка с ID "${cardId}" не найдена.`);
      }

      // Шаг 2: Получаем связи с активными тегами
      const cardTags = await this.prisma.cardTag.findMany({
        where: {
          cardId,
          tag: {
            deletedAt: null, // Только активные теги
          },
        },
        select: {
          assignedAt: true, // assignedAt из схемы (время привязки)
          tag: {
            select: {
              id: true,
              name: true,
              isPredefined: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' }, // Новые привязки сверху (assignedAt из схемы)
      });

      console.log(
        `[DEBUG] Найдено ${cardTags.length} тегов для карточки ${cardId}`
      );
      return {
        cardId,
        tags: cardTags.map(ct => ({
          ...ct.tag, // ct.tag доступен благодаря select
          assignedAt: ct.assignedAt, // assignedAt из ct (время привязки)
        })),
      };
    } catch (error) {
      console.error(`[ERROR] Ошибка в findTagsForCard:`, error.message);
      throw error;
    }
  }

  // Метод для сброса ежедневной статистики, если прошел новый день
  private async resetDailyStatsIfNeeded(userId: string) {
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
      select: { lastDailyReset: true },
    });

    if (!userStats) return;

    const now = new Date();
    const lastReset = userStats.lastDailyReset;
    const isNewDay =
      !lastReset ||
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();

    if (isNewDay) {
      await this.prisma.userStats.update({
        where: { userId },
        data: {
          wordsViewedToday: 0,
          wordsLearnedToday: 0,
          cardsAddedToday: 0,
          timeSpentTodaySec: 0,
          storiesReadToday: 0,
          lastDailyReset: now,
        },
      });
    }
  }

  // Обновить статус выученности карточки (ручное переключение)
  async updateLearnedStatus(
    userId: string,
    cardId: string,
    isLearned: boolean
  ) {
    console.log(
      `[DEBUG] Обновление статуса выученности: cardId="${cardId}", userId="${userId}", isLearned=${isLearned}`
    );

    try {
      // Шаг 1: Проверяем карточку (существует, ваша, active)
      const card = await this.prisma.card.findUnique({
        where: {
          id: cardId,
          userId,
          deletedAt: null,
        },
      });

      if (!card) {
        console.log(`[DEBUG] Карточка ${cardId} не найдена или недоступна`);
        throw new NotFoundException(
          `Карточка с ID "${cardId}" не найдена или недоступна.`
        );
      }

      // Шаг 2: Обновляем статус isLearned
      const updatedCard = await this.prisma.card.update({
        where: { id: cardId },
        data: {
          isLearned,
          updatedAt: new Date(),
        },
      });

      // Шаг 3: Обновляем прогресс по всем режимам
      // Если isLearned = true, устанавливаем correctAnswers = 10 для всех режимов
      // Если isLearned = false, сбрасываем correctAnswers = 0 для всех режимов
      const progressUpdateData = isLearned
        ? { correctAnswers: 10, incorrectAnswers: 0, lastAttempt: new Date() }
        : { correctAnswers: 0, incorrectAnswers: 0, lastAttempt: new Date() };

      // Обновляем все CardProgress для этой карточки и пользователя
      await this.prisma.cardProgress.updateMany({
        where: {
          cardId,
          userId,
        },
        data: progressUpdateData,
      });

      // Шаг 4: Обновляем статистику пользователя
      if (isLearned && !card.isLearned) {
        // Стала выученной: +1 learnedWords
        await this.prisma.userStats.update({
          where: { userId },
          data: { learnedWords: { increment: 1 } },
        });
      } else if (!isLearned && card.isLearned) {
        // Стала невыученной: -1 learnedWords
        await this.prisma.userStats.update({
          where: { userId },
          data: { learnedWords: { decrement: 1 } },
        });
      }

      console.log(
        `[DEBUG] Статус выученности обновлён: cardId=${cardId}, isLearned=${isLearned}`
      );
      return {
        message: `Карточка ${isLearned ? 'отмечена как выученная' : 'отмечена как невыученная'}.`,
        card: updatedCard,
      };
    } catch (error) {
      console.error(`[ERROR] Ошибка в updateLearnedStatus:`, error.message);
      throw error;
    }
  }
}
