import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Mission } from '@prisma/client';

@Injectable()
export class MissionsService {
  constructor(private prisma: PrismaService) {}

  // Получить дневные миссии пользователя (включая завершенные)
  async getDailyMissions(userId: string) {
    console.log(`[DEBUG] Получение дневных миссий для пользователя: ${userId}`);

    try {
      // Проверяем, нужно ли обновить миссии (ежедневный сброс)
      await this.checkAndAssignDailyMissions(userId);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Получаем все миссии, назначенные сегодня (включая завершенные)
      const userMissions = await this.prisma.userMission.findMany({
        where: {
          userId,
          assignedAt: {
            gte: today,
          },
          isSkipped: false,
        },
        include: {
          mission: true,
        },
        orderBy: { assignedAt: 'asc' },
      });

      console.log(
        `[DEBUG] Найдено ${userMissions.length} активных миссий для пользователя ${userId}`
      );
      return userMissions.map(um => ({
        id: um.missionId,
        name: um.mission.name,
        description: um.mission.description,
        type: um.mission.type,
        targetValue: um.mission.targetValue,
        rewardXp: um.mission.rewardXp,
        progress: um.progress,
        assignedAt: um.assignedAt,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERROR] Ошибка в getDailyMissions:`, message);
      throw error;
    }
  }

  // Обновить прогресс миссии
  async updateMissionProgress(
    userId: string,
    missionId: string,
    increment: number = 1
  ) {
    console.log(
      `[DEBUG] Обновление прогресса миссии: userId=${userId}, missionId=${missionId}, increment=${increment}`
    );

    try {
      // Находим UserMission
      const userMission = await this.prisma.userMission.findUnique({
        where: {
          userId_missionId: { userId, missionId },
        },
        include: { mission: true },
      });

      if (!userMission) {
        console.log(
          `[DEBUG] UserMission не найдена: userId=${userId}, missionId=${missionId}`
        );
        throw new NotFoundException(
          'Миссия не найдена или не назначена пользователю.'
        );
      }

      if (userMission.isCompleted) {
        console.log(`[DEBUG] Миссия уже завершена: ${missionId}`);
        return { message: 'Миссия уже завершена.' };
      }

      // Обновляем прогресс
      const newProgress = Math.min(
        userMission.progress + increment,
        userMission.mission.targetValue
      );
      const isCompleted = newProgress >= userMission.mission.targetValue;

      await this.prisma.userMission.update({
        where: {
          userId_missionId: { userId, missionId },
        },
        data: {
          progress: newProgress,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
        include: { mission: true },
      });

      // Если завершена — начисляем награду
      if (isCompleted) {
        await this.grantMissionReward(userId, userMission.mission);
      }

      console.log(
        `[DEBUG] Прогресс обновлён: ${newProgress}/${userMission.mission.targetValue}, завершена=${isCompleted}`
      );
      return {
        message: isCompleted
          ? 'Миссия завершена! Награда получена.'
          : 'Прогресс обновлён.',
        progress: newProgress,
        target: userMission.mission.targetValue,
        isCompleted,
        rewardXp: isCompleted ? userMission.mission.rewardXp : 0,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERROR] Ошибка в updateMissionProgress:`, message);
      throw error;
    }
  }

  // Завершить миссию вручную (если нужно)
  async completeMission(userId: string, missionId: string) {
    console.log(
      `[DEBUG] Ручное завершение миссии: userId=${userId}, missionId=${missionId}`
    );

    try {
      const userMission = await this.prisma.userMission.findUnique({
        where: {
          userId_missionId: { userId, missionId },
        },
        include: { mission: true },
      });

      if (!userMission) {
        throw new NotFoundException('Миссия не найдена.');
      }

      if (userMission.isCompleted) {
        return { message: 'Миссия уже завершена.' };
      }

      // Завершаем с полным прогрессом
      await this.prisma.userMission.update({
        where: {
          userId_missionId: { userId, missionId },
        },
        data: {
          progress: userMission.mission.targetValue,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      // Начисляем награду
      await this.grantMissionReward(userId, userMission.mission);

      console.log(`[DEBUG] Миссия завершена вручную: ${missionId}`);
      return {
        message: 'Миссия завершена! Награда получена.',
        rewardXp: userMission.mission.rewardXp,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERROR] Ошибка в completeMission:`, message);
      throw error;
    }
  }

  // Проверка и назначение дневных миссий
  private async checkAndAssignDailyMissions(userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Получаем UserStats
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      throw new NotFoundException('Статистика пользователя не найдена.');
    }

    const lastReset = userStats.lastDailyReset
      ? new Date(
          userStats.lastDailyReset.getFullYear(),
          userStats.lastDailyReset.getMonth(),
          userStats.lastDailyReset.getDate()
        )
      : null;

    // Если уже сегодня сбрасывали — ничего не делаем
    if (lastReset && lastReset.getTime() === today.getTime()) {
      console.log(
        `[DEBUG] Миссии уже назначены сегодня для пользователя ${userId}`
      );
      return;
    }

    console.log(`[DEBUG] Сброс дневных миссий для пользователя ${userId}`);

    // Удаляем старые незавершённые миссии
    await this.prisma.userMission.deleteMany({
      where: {
        userId,
        isCompleted: false,
      },
    });

    // Получаем все активные миссии
    const activeMissions = await this.prisma.mission.findMany({
      where: { deletedAt: null },
    });

    console.log(
      `[DEBUG] Найдено ${activeMissions.length} активных миссий в БД`
    );

    if (activeMissions.length === 0) {
      console.log(`[DEBUG] Нет активных миссий для назначения`);
      return;
    }

    // Назначаем одну случайную активную миссию
    const numMissions = 1;
    const randomIndex = Math.floor(Math.random() * activeMissions.length);
    const selectedMissions = [activeMissions[randomIndex]];

    console.log(
      `[DEBUG] Выбрана случайная миссия: ${selectedMissions[0].name}`
    );

    // Назначаем пользователю
    const userMissionsData = selectedMissions.map(mission => ({
      userId,
      missionId: mission.id,
      assignedAt: now,
      progress: 0,
      isCompleted: false,
      isSkipped: false,
    }));

    await this.prisma.userMission.createMany({
      data: userMissionsData,
    });

    // Обновляем lastDailyReset
    await this.prisma.userStats.update({
      where: { userId },
      data: { lastDailyReset: today },
    });

    console.log(
      `[DEBUG] Назначено ${numMissions} миссий пользователю ${userId}`
    );
  }

  // Начисление награды за миссию
  private async grantMissionReward(userId: string, mission: Mission) {
    console.log(
      `[DEBUG] Начисление награды: userId=${userId}, xp=${mission.rewardXp}`
    );

    // Получаем текущую статистику пользователя
    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      throw new NotFoundException('Статистика пользователя не найдена.');
    }

    // Начисляем XP
    if (mission.rewardXp > 0) {
      const newTotalXp = userStats.totalXp + mission.rewardXp;
      const newLevel = Math.floor(newTotalXp / 100) + 1;

      await this.prisma.userStats.update({
        where: { userId },
        data: {
          totalXp: newTotalXp,
          currentLevel: newLevel,
        },
      });
    }

    // Если есть бейдж — разблокируем достижение
    if (mission.rewardBadgeId) {
      await this.prisma.userAchievement.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId: mission.rewardBadgeId,
          },
        },
        update: { unlockedAt: new Date() },
        create: {
          userId,
          achievementId: mission.rewardBadgeId,
          unlockedAt: new Date(),
        },
      });
    }
  }

  // Вспомогательная функция для перемешивания массива
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
