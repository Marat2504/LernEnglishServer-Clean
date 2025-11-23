import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Achievement } from '@prisma/client';

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  // Получить все достижения с статусом разблокировки для пользователя
  async getAllAchievements(userId: string) {
    console.log(
      `[DEBUG] Получение всех достижений для пользователя: ${userId}`
    );

    try {
      // Получить все достижения
      const achievements = await this.prisma.achievement.findMany({
        where: { deletedAt: null },
        orderBy: { category: 'asc' },
      });

      // Получить разблокированные достижения пользователя
      const userAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
        select: {
          achievementId: true,
          unlockedAt: true,
          progress: true,
        },
      });

      // Создать мапу для быстрого доступа
      const unlockedMap = new Map(
        userAchievements.map(ua => [ua.achievementId, ua])
      );

      // Сформировать результат
      const result = achievements.map(achievement => {
        const userAchievement = unlockedMap.get(achievement.id);
        return {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          threshold: achievement.threshold,
          category: achievement.category,
          isSecret: achievement.isSecret,
          isUnlocked: !!userAchievement?.unlockedAt,
          unlockedAt: userAchievement?.unlockedAt || null,
          progress: userAchievement?.progress || 0,
        };
      });

      console.log(
        `[DEBUG] Найдено ${result.length} достижений, из них разблокировано ${result.filter(a => a.isUnlocked).length}`
      );
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERROR] Ошибка в getAllAchievements:`, message);
      throw error;
    }
  }

  // Проверить и разблокировать достижения на основе текущей статистики
  async checkAndUnlockAchievements(userId: string) {
    console.log(
      `[DEBUG] Проверка и разблокировка достижений для пользователя: ${userId}`
    );

    try {
      // Получить статистику пользователя
      const userStats = await this.prisma.userStats.findUnique({
        where: { userId },
      });

      if (!userStats) {
        throw new NotFoundException('Статистика пользователя не найдена.');
      }

      // Получить общее количество сессий (считаем по cardProgress записям или добавим поле)
      // Пока используем общее количество уникальных сессий из cardProgress
      const totalSessions = await this.prisma.cardProgress.count({
        where: { userId },
      });

      // Получить все достижения
      const achievements = await this.prisma.achievement.findMany({
        where: { deletedAt: null },
      });

      // Получить текущие достижения пользователя
      const userAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
      });

      const unlockedMap = new Map(
        userAchievements.map(ua => [ua.achievementId, ua])
      );

      const newlyUnlocked: string[] = [];

      for (const achievement of achievements) {
        const userAchievement = unlockedMap.get(achievement.id);

        // Проверить условие разблокировки
        const isUnlocked = this.checkAchievementCondition(achievement, {
          ...userStats,
          totalSessions,
        });

        console.log(
          `[DEBUG] Checking ${achievement.name}: threshold=${achievement.threshold}, isUnlocked=${isUnlocked}`
        );

        if (isUnlocked && !userAchievement?.unlockedAt) {
          // Разблокировать достижение
          await this.prisma.userAchievement.upsert({
            where: {
              userId_achievementId: { userId, achievementId: achievement.id },
            },
            update: {
              unlockedAt: new Date(),
              progress: achievement.threshold || 0,
            },
            create: {
              userId,
              achievementId: achievement.id,
              unlockedAt: new Date(),
              progress: achievement.threshold || 0,
            },
          });

          newlyUnlocked.push(achievement.name);
          console.log(`[DEBUG] Разблокировано достижение: ${achievement.name}`);
        }

        // Всегда обновлять прогресс, даже если достижение не разблокировано или уже разблокировано
        if (achievement.threshold) {
          const currentProgress = this.getCurrentProgress(achievement, {
            ...userStats,
            totalSessions,
          });
          if (currentProgress !== (userAchievement?.progress || 0)) {
            await this.prisma.userAchievement.upsert({
              where: {
                userId_achievementId: {
                  userId,
                  achievementId: achievement.id,
                },
              },
              update: { progress: currentProgress },
              create: {
                userId,
                achievementId: achievement.id,
                progress: currentProgress,
              },
            });
            if (userAchievement?.progress !== currentProgress) {
              console.log(
                `[DEBUG] Обновлен прогресс для ${achievement.name}: ${currentProgress}`
              );
            }
          }
        }
      }

      console.log(
        `[DEBUG] Новые разблокированные достижения: ${newlyUnlocked.join(', ')}`
      );
      return {
        message:
          newlyUnlocked.length > 0
            ? `Разблокировано ${newlyUnlocked.length} новых достижений: ${newlyUnlocked.join(', ')}`
            : 'Нет новых достижений.',
        newlyUnlocked,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERROR] Ошибка в checkAndUnlockAchievements:`, message);
      throw error;
    }
  }

  // Вспомогательный метод для проверки условия достижения
  private checkAchievementCondition(
    achievement: Achievement,
    userStats: {
      totalWords: number;
      learnedWords: number;
      totalXp: number;
      currentLevel: number;
      totalSessions?: number;
      timeSpentSec: number;
    }
  ): boolean {
    if (!achievement.threshold || achievement.threshold === null) return false;

    switch (achievement.name) {
      // Карточки
      case 'Первая карточка':
        return userStats.totalWords >= achievement.threshold;
      case 'Создатель словаря':
        return userStats.totalWords >= achievement.threshold;
      case 'Мастер словаря':
        return userStats.totalWords >= achievement.threshold;

      // Изучение
      case 'Первый шаг':
        return userStats.learnedWords >= achievement.threshold;
      case 'Ученик':
        return userStats.learnedWords >= achievement.threshold;
      case 'Мастер слов':
        return userStats.learnedWords >= achievement.threshold;
      case 'Лингвист':
        return userStats.learnedWords >= achievement.threshold;

      // XP
      case 'Первый опыт':
        return userStats.totalXp >= achievement.threshold;
      case 'Скоростной ученик':
        return userStats.totalXp >= achievement.threshold;
      case 'Опытный':
        return userStats.totalXp >= achievement.threshold;
      case 'Мастер XP':
        return userStats.totalXp >= achievement.threshold;

      // Уровни
      case 'Уровень 2':
        return userStats.currentLevel >= achievement.threshold;
      case 'Уровень 5':
        return userStats.currentLevel >= achievement.threshold;
      case 'Уровень 10':
        return userStats.currentLevel >= achievement.threshold;

      // Сессии (предполагаем totalSessions в userStats)
      case 'Первая сессия':
        return (userStats.totalSessions || 0) >= achievement.threshold;
      case 'Регулярный ученик':
        return (userStats.totalSessions || 0) >= achievement.threshold;
      case 'Марафонец':
        return (userStats.totalSessions || 0) >= achievement.threshold;

      // Время
      case 'Первая минута':
        return userStats.timeSpentSec >= achievement.threshold;
      case 'Часовщик':
        return userStats.timeSpentSec >= achievement.threshold;
      case 'Дедикейт':
        return userStats.timeSpentSec >= achievement.threshold;

      default:
        return false;
    }
  }

  // Вспомогательный метод для получения текущего прогресса
  private getCurrentProgress(
    achievement: { name: string; category: string; threshold?: number | null },
    userStats: {
      totalWords: number;
      learnedWords: number;
      totalXp: number;
      currentLevel: number;
      totalSessions?: number;
      timeSpentSec: number;
    }
  ): number {
    switch (achievement.name) {
      // Карточки
      case 'Первая карточка':
      case 'Создатель словаря':
      case 'Мастер словаря':
        return userStats.totalWords;

      // Изучение
      case 'Первый шаг':
      case 'Ученик':
      case 'Мастер слов':
      case 'Лингвист':
        return userStats.learnedWords;

      // XP
      case 'Первый опыт':
      case 'Скоростной ученик':
      case 'Опытный':
      case 'Мастер XP':
        return userStats.totalXp;

      // Уровни
      case 'Уровень 2':
      case 'Уровень 5':
      case 'Уровень 10':
        return userStats.currentLevel;

      // Сессии
      case 'Первая сессия':
      case 'Регулярный ученик':
      case 'Марафонец':
        return userStats.totalSessions || 0;

      // Время
      case 'Первая минута':
      case 'Часовщик':
      case 'Дедикейт':
        return userStats.timeSpentSec;

      default:
        return 0;
    }
  }
}
