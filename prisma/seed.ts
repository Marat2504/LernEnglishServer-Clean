// prisma/seed.ts (полный файл — фикс runtime: findFirst вместо findUnique для null)
import { PrismaClient, MissionType } from '@prisma/client';

const prisma = new PrismaClient(); // Объявление prisma (TS OK)

async function main() {
  console.log('Запуск seed...');

  // ... ВАШ СУЩЕСТВУЮЩИЙ КОД SEED (если есть: создание пользователей, карточек и т.д.)
  // Пример: Создание тестового пользователя (если нужно; раскомментируйте)
  // const testUser  = await prisma.user.upsert({
  //   where: { email: 'test@example.com' },
  //   update: {},
  //   create: {
  //     email: 'test@example.com',
  //     passwordHash: '$2b$10$... (bcrypt hash)',
  //     username: 'TestUser ',
  //     currentLanguageLevel: 'A1',
  //   },
  // });
  // console.log('Тестовый пользователь создан/найден:', testUser .id);

  // Предустановленные теги (глобальные, userId: null)
  const predefinedTags = [
    { name: 'Greetings', isPredefined: true },
    { name: 'Numbers', isPredefined: true },
    { name: 'Colors', isPredefined: true },
    { name: 'Family', isPredefined: true },
    { name: 'Food', isPredefined: true },
    { name: 'Travel', isPredefined: true },
    { name: 'Daily Routine', isPredefined: true },
    { name: 'Shopping', isPredefined: true },
    { name: 'Health', isPredefined: true },
    { name: 'Weather', isPredefined: true },
  ];

  for (const tagData of predefinedTags) {
    // ФИКС RUNTIME: findFirst с where (null OK в scalar filter, не composite)
    // Для predefined: ищем по { userId: null, name: ... } (проверка существования)
    const existing = await prisma.tag.findFirst({
      where: {
        userId: null, // Nullable OK здесь (не unique constraint)
        name: tagData.name,
        deletedAt: null, // Только активные (игнорируем soft-deleted)
      },
    });

    if (!existing) {
      // Создание: Опускаем 'user' — userId станет null автоматически (relation optional)
      await prisma.tag.create({
        data: {
          name: tagData.name,
          isPredefined: true,
          // Нет 'user: { connect: ... }' — relation null (userId: null в БД)
        },
      });
      console.log(`Создан предустановленный тег: ${tagData.name}`);
    } else {
      console.log(`Тег "${tagData.name}" уже существует (пропускаем).`);
    }
  }

  // Миссии (ежедневные челленджи)
  const missions: Array<{
    id: string;
    name: string;
    description: string;
    type: MissionType;
    targetValue: number;
    rewardXp: number;
  }> = [
    {
      id: 'add-10-cards',
      name: 'Добавить 10 слов',
      description: 'Добавьте 10 новых карточек в словарь',
      type: MissionType.ADD_CARDS,
      targetValue: 10,
      rewardXp: 50,
    },
    {
      id: 'learn-5-words',
      name: 'Выучить 5 слов',
      description: 'Выучите 5 слов подряд в любом режиме',
      type: MissionType.LEARN_WORDS,
      targetValue: 5,
      rewardXp: 30,
    },
    {
      id: 'quiz-3-sessions',
      name: 'Завершить 3 теста',
      description: 'Завершите 3 сессии в режиме QUIZ',
      type: MissionType.QUIZ_MODE,
      targetValue: 3,
      rewardXp: 40,
    },
    {
      id: 'lightning-10-rounds',
      name: 'Молния: 10 раундов',
      description: 'Играйте 10 раундов в режиме Lightning',
      type: MissionType.LIGHTNING_MODE,
      targetValue: 10,
      rewardXp: 60,
    },
    {
      id: 'study-30-minutes',
      name: 'Изучить 30 минут',
      description: 'Проведите 30 минут в изучении слов',
      type: MissionType.LEARN_WORDS, // Или новый тип, но пока используем существующий
      targetValue: 30, // В минутах, но логика должна учитывать время
      rewardXp: 45,
    },
    {
      id: 'earn-100-xp',
      name: 'Заработать 100 XP',
      description: 'Наберите 100 очков опыта за день',
      type: MissionType.LEARN_WORDS, // Общий, или новый
      targetValue: 100,
      rewardXp: 50,
    },
    {
      id: 'add-cards-with-audio',
      name: 'Добавить 5 слов с аудио',
      description: 'Добавьте 5 карточек с аудио-произношением',
      type: MissionType.ADD_CARDS,
      targetValue: 5,
      rewardXp: 40,
    },
    {
      id: 'repeat-low-progress',
      name: 'Повторить слабые слова',
      description: 'Повторите 15 слов с низким прогрессом',
      type: MissionType.REPEAT_TAG,
      targetValue: 15,
      rewardXp: 55,
    },
    {
      id: 'complete-5-lightning',
      name: 'Молния: 5 раундов',
      description: 'Завершите 5 раундов в режиме Lightning',
      type: MissionType.LIGHTNING_MODE,
      targetValue: 5,
      rewardXp: 35,
    },
    {
      id: 'repeat-20-cards',
      name: 'Повторить 20 слов',
      description: 'Повторите 20 слов для закрепления',
      type: MissionType.REPEAT_TAG, // Или общий LEARN_WORDS, но REPEAT_TAG для повторений
      targetValue: 20,
      rewardXp: 70,
    },
  ];

  for (const missionData of missions) {
    const existing = await prisma.mission.findUnique({
      where: { id: missionData.id },
    });

    if (!existing) {
      await prisma.mission.create({
        data: missionData,
      });
      console.log(`Создана миссия: ${missionData.name}`);
    } else {
      console.log(`Миссия "${missionData.name}" уже существует (пропускаем).`);
    }
  }

  console.log('Seed завершён: предустановленные теги и миссии добавлены.');
}

main()
  .catch(e => {
    console.error('Ошибка seed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
