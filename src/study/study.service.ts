import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionResultDto } from './dto/session-result.dto';
import { StudyMode } from '@prisma/client';
import { MissionsService } from '../missions/missions.service'; // Импорт для обновления прогресса миссий

@Injectable()
export class StudyService {
  constructor(
    private prisma: PrismaService,
    private missionsService: MissionsService // Инжектим MissionsService для миссий
  ) {}

  async submitSessionResult(userId: string, dto: SessionResultDto) {
    const { mode, cardResults, totalTimeSpentSec } = dto;

    // Валидация: проверить что все cardId принадлежат пользователю и активны
    const cardIds = cardResults.map(r => r.cardId);
    const userCards = await this.prisma.card.findMany({
      where: {
        id: { in: cardIds },
        userId: userId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const userCardIds = userCards.map(c => c.id);
    const invalidCardIds = cardIds.filter(id => !userCardIds.includes(id));

    if (invalidCardIds.length > 0) {
      throw new BadRequestException(
        `Карточки с ID ${invalidCardIds.join(', ')} не найдены или недоступны.`
      );
    }

    // Обновить прогресс для каждой карточки
    const progressUpdates: Array<{
      cardId: string;
      isCorrect: boolean;
      newCorrectAnswers: number;
      newIncorrectAnswers: number;
      isLearned: boolean;
      xpGained: number;
    }> = [];
    let totalXpGained = 0;
    let learnedWordsCount = 0;

    for (const result of cardResults) {
      const { cardId, isCorrect } = result;

      // Найти или создать CardProgress для этой карточки и режима
      const existingProgress = await this.prisma.cardProgress.findUnique({
        where: {
          cardId_userId_mode: {
            cardId,
            userId,
            mode,
          },
        },
      });

      let newCorrectAnswers: number;
      let newIncorrectAnswers: number;

      if (existingProgress) {
        // Обновить существующий прогресс
        newCorrectAnswers = isCorrect ? existingProgress.correctAnswers + 1 : 0; // Сброс при ошибке
        newIncorrectAnswers = isCorrect
          ? existingProgress.incorrectAnswers
          : existingProgress.incorrectAnswers + 1;
      } else {
        // Создать новый прогресс
        newCorrectAnswers = isCorrect ? 1 : 0;
        newIncorrectAnswers = isCorrect ? 0 : 1;
      }

      // Проверить достижение "выучено" (10 подряд правильных)
      const isLearned = newCorrectAnswers >= 10;

      // Обновить или создать CardProgress
      await this.prisma.cardProgress.upsert({
        where: {
          cardId_userId_mode: {
            cardId,
            userId,
            mode,
          },
        },
        update: {
          correctAnswers: newCorrectAnswers,
          incorrectAnswers: newIncorrectAnswers,
          lastAttempt: new Date(),
        },
        create: {
          cardId,
          userId,
          mode,
          correctAnswers: newCorrectAnswers,
          incorrectAnswers: newIncorrectAnswers,
          lastAttempt: new Date(),
        },
      });

      // Если карточка только что стала выученной, обновить Card.isLearned
      if (
        isLearned &&
        (!existingProgress || existingProgress.correctAnswers < 10)
      ) {
        await this.prisma.card.update({
          where: { id: cardId },
          data: { isLearned: true },
        });
        learnedWordsCount++;
      }

      // Рассчитать XP (например, 10 за правильный ответ, 5 за неправильный)
      const xpForAnswer = isCorrect ? 10 : 5;
      totalXpGained += xpForAnswer;

      progressUpdates.push({
        cardId,
        isCorrect,
        newCorrectAnswers,
        newIncorrectAnswers,
        isLearned,
        xpGained: xpForAnswer,
      });
    }

    // Проверяем и сбрасываем ежедневную статистику, если нужно
    await this.resetDailyStatsIfNeeded(userId);

    // Обновить UserStats
    const userStatsUpdate = await this.prisma.userStats.upsert({
      where: { userId },
      update: {
        totalXp: { increment: totalXpGained },
        learnedWords: { increment: learnedWordsCount },
        wordsViewedToday: { increment: cardResults.length },
        timeSpentSec: totalTimeSpentSec
          ? { increment: totalTimeSpentSec }
          : undefined,
        timeSpentTodaySec: totalTimeSpentSec
          ? { increment: totalTimeSpentSec }
          : undefined,
      },
      create: {
        userId,
        totalXp: totalXpGained,
        learnedWords: learnedWordsCount,
        wordsViewedToday: cardResults.length,
        timeSpentSec: totalTimeSpentSec || 0,
        timeSpentTodaySec: totalTimeSpentSec || 0,
      },
    });

    // Рассчитать новый уровень (экспоненциальная прогрессия)
    const newTotalXp = userStatsUpdate.totalXp;
    let newLevel = 1;
    let xpForNextLevel = 300; // XP для уровня 2
    while (newTotalXp >= xpForNextLevel) {
      newLevel++;
      xpForNextLevel += 300 + (newLevel - 2) * 200; // +200 за каждый уровень
    }

    // Обновить уровень, если изменился
    if (newLevel !== userStatsUpdate.currentLevel) {
      await this.prisma.userStats.update({
        where: { userId },
        data: { currentLevel: newLevel },
      });

      // Обновить уровень языка на основе игрового уровня
      const languageLevelMapping: Record<number, string> = {
        5: 'A1',
        10: 'A2',
        15: 'B1',
        20: 'B2',
        25: 'C1',
        30: 'C2',
      };

      const newLanguageLevel = languageLevelMapping[newLevel];
      if (newLanguageLevel) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { currentLanguageLevel: newLanguageLevel },
        });
      }
    }

    // Обновляем прогресс миссий на основе сессии
    try {
      // Получить активные миссии пользователя
      const activeMissions = await this.prisma.userMission.findMany({
        where: {
          userId,
          isCompleted: false,
          isSkipped: false,
        },
        include: { mission: true },
      });

      const missionIds = activeMissions.map(um => um.missionId);

      // Миссия LEARN_WORDS: за каждое правильное слово (если назначена)
      const correctAnswers = cardResults.filter(r => r.isCorrect).length;
      if (correctAnswers > 0 && missionIds.includes('learn-5-words')) {
        await this.missionsService.updateMissionProgress(
          userId,
          'learn-5-words',
          correctAnswers
        );
      }

      // Миссия QUIZ_MODE: если режим QUIZ и сессия завершена (если назначена)
      if (mode === StudyMode.QUIZ && missionIds.includes('quiz-3-sessions')) {
        await this.missionsService.updateMissionProgress(
          userId,
          'quiz-3-sessions',
          1
        );
      }

      // Миссия LIGHTNING_MODE: если режим LIGHTNING (если назначена)
      if (
        mode === StudyMode.LIGHTNING &&
        missionIds.includes('lightning-10-rounds')
      ) {
        await this.missionsService.updateMissionProgress(
          userId,
          'lightning-10-rounds',
          1
        );
      }

      // Миссия REPEAT_TAG: за повторение слов (любая сессия, если назначена)
      if (cardResults.length > 0 && missionIds.includes('repeat-20-cards')) {
        await this.missionsService.updateMissionProgress(
          userId,
          'repeat-20-cards',
          cardResults.length
        );
      }

      // Миссия EARN_100_XP: за заработанный XP (если назначена)
      if (totalXpGained > 0 && missionIds.includes('earn-100-xp')) {
        await this.missionsService.updateMissionProgress(
          userId,
          'earn-100-xp',
          totalXpGained
        );
      }

      // Миссия STUDY_30_MINUTES: за время изучения (если назначена)
      if (
        totalTimeSpentSec &&
        totalTimeSpentSec >= 60 &&
        missionIds.includes('study-30-minutes')
      ) {
        // Минимум 1 минута
        const minutes = Math.floor(totalTimeSpentSec / 60);
        await this.missionsService.updateMissionProgress(
          userId,
          'study-30-minutes',
          minutes
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[ERROR] Ошибка обновления прогресса миссий в сессии: ${message}`
      );
      // Не бросаем ошибку, чтобы не ломать сохранение результатов
    }

    return {
      message: 'Результаты сессии сохранены.',
      totalXpGained,
      learnedWordsCount,
      progressUpdates,
    };
  }

  async getStudyProgress(userId: string, mode?: StudyMode) {
    const where: { userId: string; mode?: StudyMode } = { userId };
    if (mode) {
      where.mode = mode;
    }

    const progress = await this.prisma.cardProgress.findMany({
      where,
      include: {
        card: {
          select: {
            id: true,
            englishWord: true,
            russianTranslation: true,
            difficultyLevel: true,
            isLearned: true,
          },
        },
      },
      orderBy: { lastAttempt: 'desc' },
    });

    return progress;
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

  async getCardsToReview(userId: string, limit: number = 20) {
    // Карточки для повторения: невыученные или с низким прогрессом
    const cards = await this.prisma.card.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { isLearned: false },
          {
            cardProgress: {
              some: {
                correctAnswers: { lt: 5 }, // Менее 5 правильных подряд
              },
            },
          },
        ],
      },
      include: {
        cardProgress: {
          select: {
            mode: true,
            correctAnswers: true,
            incorrectAnswers: true,
            lastAttempt: true,
          },
        },
        cardTags: {
          where: { tag: { deletedAt: null } },
          select: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'asc' }, // Сначала старые
      take: limit,
    });

    return cards;
  }
}
