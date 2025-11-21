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

  // Достижения
  const achievements = [
    {
      name: 'Первая карточка',
      description: 'Создайте свою первую карточку слова.',
      icon: '📝',
      threshold: 1,
      category: 'Карточки',
      isSecret: false,
    },
    {
      name: 'Создатель словаря',
      description: 'Добавьте 10 карточек.',
      icon: '📚',
      threshold: 10,
      category: 'Карточки',
      isSecret: false,
    },
    {
      name: 'Мастер словаря',
      description: 'Добавьте 50 карточек.',
      icon: '📖',
      threshold: 50,
      category: 'Карточки',
      isSecret: false,
    },
    {
      name: 'Первый шаг',
      description: 'Выучите первое слово.',
      icon: '👶',
      threshold: 1,
      category: 'Изучение',
      isSecret: false,
    },
    {
      name: 'Ученик',
      description: 'Выучите 10 слов.',
      icon: '🎓',
      threshold: 10,
      category: 'Изучение',
      isSecret: false,
    },
    {
      name: 'Мастер слов',
      description: 'Выучите 50 слов.',
      icon: '🧠',
      threshold: 50,
      category: 'Изучение',
      isSecret: false,
    },
    {
      name: 'Лингвист',
      description: 'Выучите 100 слов.',
      icon: '🌍',
      threshold: 100,
      category: 'Изучение',
      isSecret: false,
    },
    {
      name: 'Первый опыт',
      description: 'Заработайте 10 XP.',
      icon: '⭐',
      threshold: 10,
      category: 'XP',
      isSecret: false,
    },
    {
      name: 'Скоростной ученик',
      description: 'Наберите 100 XP.',
      icon: '⚡',
      threshold: 100,
      category: 'XP',
      isSecret: false,
    },
    {
      name: 'Опытный',
      description: 'Наберите 500 XP.',
      icon: '🔥',
      threshold: 500,
      category: 'XP',
      isSecret: false,
    },
    {
      name: 'Мастер XP',
      description: 'Наберите 1000 XP.',
      icon: '💎',
      threshold: 1000,
      category: 'XP',
      isSecret: false,
    },
    {
      name: 'Уровень 2',
      description: 'Достигните 2 уровня.',
      icon: '⬆️',
      threshold: 2,
      category: 'Уровни',
      isSecret: false,
    },
    {
      name: 'Уровень 5',
      description: 'Достигните 5 уровня.',
      icon: '⭐',
      threshold: 5,
      category: 'Уровни',
      isSecret: false,
    },
    {
      name: 'Уровень 10',
      description: 'Достигните 10 уровня.',
      icon: '🏆',
      threshold: 10,
      category: 'Уровни',
      isSecret: false,
    },
    {
      name: 'Первая сессия',
      description: 'Завершите 1 сессию изучения.',
      icon: '🎯',
      threshold: 1,
      category: 'Сессии',
      isSecret: false,
    },
    {
      name: 'Регулярный ученик',
      description: 'Завершите 10 сессий изучения.',
      icon: '📅',
      threshold: 10,
      category: 'Сессии',
      isSecret: false,
    },
    {
      name: 'Марафонец',
      description: 'Завершите 50 сессий изучения.',
      icon: '🏃',
      threshold: 50,
      category: 'Сессии',
      isSecret: false,
    },
    {
      name: 'Первая минута',
      description: 'Проведите 1 минуту в изучении.',
      icon: '⏱️',
      threshold: 60,
      category: 'Время',
      isSecret: false,
    },
    {
      name: 'Часовщик',
      description: 'Проведите 1 час в изучении.',
      icon: '🕐',
      threshold: 3600,
      category: 'Время',
      isSecret: false,
    },
    {
      name: 'Дедикейт',
      description: 'Проведите 10 часов в изучении.',
      icon: '⏳',
      threshold: 36000,
      category: 'Время',
      isSecret: false,
    },
  ];

  for (const achievement of achievements) {
    const existing = await prisma.achievement.findUnique({
      where: { name: achievement.name },
    });

    if (!existing) {
      await prisma.achievement.create({
        data: achievement,
      });
      console.log(`Создано достижение: ${achievement.name}`);
    } else {
      console.log(
        `Достижение "${achievement.name}" уже существует (пропускаем).`
      );
    }
  }

  console.log(
    'Seed завершён: предустановленные теги, миссии и достижения добавлены.'
  );
}

main()
  .catch(e => {
    console.error('Ошибка seed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
