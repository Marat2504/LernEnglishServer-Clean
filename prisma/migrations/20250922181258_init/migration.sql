-- CreateEnum
CREATE TYPE "public"."StudyMode" AS ENUM ('SPEED', 'QUIZ', 'MATCHING', 'LISTENING', 'LIGHTNING', 'STORIES');

-- CreateEnum
CREATE TYPE "public"."MissionType" AS ENUM ('LEARN_WORDS', 'QUIZ_MODE', 'LIGHTNING_MODE', 'REPEAT_TAG', 'ADD_CARDS', 'READ_STORIES', 'ANSWER_STORY_QUESTIONS');

-- CreateEnum
CREATE TYPE "public"."MessageSender" AS ENUM ('USER', 'AI');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100),
    "avatarUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "currentLanguageLevel" VARCHAR(10) NOT NULL DEFAULT 'A1',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Card" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "englishWord" VARCHAR(255) NOT NULL,
    "russianTranslation" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "audioUrl" VARCHAR(500),
    "isLearned" BOOLEAN NOT NULL DEFAULT false,
    "difficultyLevel" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36),
    "name" VARCHAR(100) NOT NULL,
    "isPredefined" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CardTag" (
    "cardId" VARCHAR(36) NOT NULL,
    "tagId" VARCHAR(36) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardTag_pkey" PRIMARY KEY ("cardId","tagId")
);

-- CreateTable
CREATE TABLE "public"."CardProgress" (
    "id" VARCHAR(36) NOT NULL,
    "cardId" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "mode" "public"."StudyMode" NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserStats" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "learnedWords" INTEGER NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
    "wordsViewedToday" INTEGER NOT NULL DEFAULT 0,
    "wordsLearnedToday" INTEGER NOT NULL DEFAULT 0,
    "cardsAddedToday" INTEGER NOT NULL DEFAULT 0,
    "timeSpentTodaySec" INTEGER NOT NULL DEFAULT 0,
    "storiesReadToday" INTEGER NOT NULL DEFAULT 0,
    "lastDailyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Achievement" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "icon" VARCHAR(100) NOT NULL,
    "threshold" INTEGER,
    "category" VARCHAR(50) NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserAchievement" (
    "userId" VARCHAR(36) NOT NULL,
    "achievementId" VARCHAR(36) NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId","achievementId")
);

-- CreateTable
CREATE TABLE "public"."Mission" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."MissionType" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "rewardBadgeId" VARCHAR(36),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserMission" (
    "userId" VARCHAR(36) NOT NULL,
    "missionId" VARCHAR(36) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserMission_pkey" PRIMARY KEY ("userId","missionId")
);

-- CreateTable
CREATE TABLE "public"."Quote" (
    "id" VARCHAR(36) NOT NULL,
    "englishText" VARCHAR(500) NOT NULL,
    "russianTranslation" VARCHAR(500) NOT NULL,
    "grammarExplanation" TEXT,
    "miniChallenge" VARCHAR(255),
    "author" VARCHAR(100),
    "imageUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayDate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserFavoriteQuote" (
    "userId" VARCHAR(36) NOT NULL,
    "quoteId" VARCHAR(36) NOT NULL,
    "favoritedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteQuote_pkey" PRIMARY KEY ("userId","quoteId")
);

-- CreateTable
CREATE TABLE "public"."ChatDialog" (
    "id" VARCHAR(36) NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "topic" VARCHAR(100),
    "difficulty" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatDialog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" VARCHAR(36) NOT NULL,
    "dialogId" VARCHAR(36) NOT NULL,
    "sender" "public"."MessageSender" NOT NULL,
    "text" TEXT NOT NULL,
    "audioUrl" VARCHAR(500),
    "correction" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Story" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "englishText" TEXT NOT NULL,
    "imageUrl" VARCHAR(500),
    "difficultyLevel" VARCHAR(10) NOT NULL,
    "source" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StoryQuestion" (
    "id" VARCHAR(36) NOT NULL,
    "storyId" VARCHAR(36) NOT NULL,
    "questionText" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "option1" TEXT NOT NULL,
    "option2" TEXT NOT NULL,
    "option3" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StoryQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserStoryProgress" (
    "userId" VARCHAR(36) NOT NULL,
    "storyId" VARCHAR(36) NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "correctAnswersCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectAnswersCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserStoryProgress_pkey" PRIMARY KEY ("userId","storyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_currentLanguageLevel_idx" ON "public"."User"("currentLanguageLevel");

-- CreateIndex
CREATE INDEX "Card_userId_isLearned_idx" ON "public"."Card"("userId", "isLearned");

-- CreateIndex
CREATE INDEX "Card_difficultyLevel_idx" ON "public"."Card"("difficultyLevel");

-- CreateIndex
CREATE INDEX "Tag_isPredefined_idx" ON "public"."Tag"("isPredefined");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "public"."Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "CardProgress_userId_mode_idx" ON "public"."CardProgress"("userId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "CardProgress_cardId_userId_mode_key" ON "public"."CardProgress"("cardId", "userId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_userId_key" ON "public"."UserStats"("userId");

-- CreateIndex
CREATE INDEX "UserStats_userId_idx" ON "public"."UserStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_name_key" ON "public"."Achievement"("name");

-- CreateIndex
CREATE INDEX "Achievement_category_idx" ON "public"."Achievement"("category");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "public"."UserAchievement"("userId");

-- CreateIndex
CREATE INDEX "Mission_type_idx" ON "public"."Mission"("type");

-- CreateIndex
CREATE INDEX "UserMission_userId_isCompleted_idx" ON "public"."UserMission"("userId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_displayDate_key" ON "public"."Quote"("displayDate");

-- CreateIndex
CREATE INDEX "Quote_displayDate_idx" ON "public"."Quote"("displayDate");

-- CreateIndex
CREATE INDEX "ChatDialog_userId_idx" ON "public"."ChatDialog"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_dialogId_idx" ON "public"."ChatMessage"("dialogId");

-- CreateIndex
CREATE INDEX "ChatMessage_sender_idx" ON "public"."ChatMessage"("sender");

-- CreateIndex
CREATE INDEX "Story_difficultyLevel_idx" ON "public"."Story"("difficultyLevel");

-- CreateIndex
CREATE INDEX "Story_isApproved_idx" ON "public"."Story"("isApproved");

-- CreateIndex
CREATE INDEX "Story_isAiGenerated_idx" ON "public"."Story"("isAiGenerated");

-- CreateIndex
CREATE INDEX "StoryQuestion_storyId_idx" ON "public"."StoryQuestion"("storyId");

-- CreateIndex
CREATE INDEX "UserStoryProgress_userId_idx" ON "public"."UserStoryProgress"("userId");

-- CreateIndex
CREATE INDEX "UserStoryProgress_isCompleted_idx" ON "public"."UserStoryProgress"("isCompleted");

-- AddForeignKey
ALTER TABLE "public"."Card" ADD CONSTRAINT "Card_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CardTag" ADD CONSTRAINT "CardTag_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CardTag" ADD CONSTRAINT "CardTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CardProgress" ADD CONSTRAINT "CardProgress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CardProgress" ADD CONSTRAINT "CardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "public"."Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMission" ADD CONSTRAINT "UserMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMission" ADD CONSTRAINT "UserMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFavoriteQuote" ADD CONSTRAINT "UserFavoriteQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFavoriteQuote" ADD CONSTRAINT "UserFavoriteQuote_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatDialog" ADD CONSTRAINT "ChatDialog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChatMessage" ADD CONSTRAINT "ChatMessage_dialogId_fkey" FOREIGN KEY ("dialogId") REFERENCES "public"."ChatDialog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StoryQuestion" ADD CONSTRAINT "StoryQuestion_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStoryProgress" ADD CONSTRAINT "UserStoryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStoryProgress" ADD CONSTRAINT "UserStoryProgress_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
