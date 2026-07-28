-- CreateTable
CREATE TABLE "VocabWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceKey" TEXT NOT NULL,
    "sourceOrder" INTEGER NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER,
    "word" TEXT NOT NULL,
    "displayWord" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "homograph" INTEGER,
    "sense" TEXT,
    "partOfSpeech" TEXT NOT NULL,
    "meaningTh" TEXT NOT NULL DEFAULT '',
    "pronunciationTh" TEXT NOT NULL DEFAULT '',
    "ipa" TEXT NOT NULL DEFAULT '',
    "exampleEn" TEXT NOT NULL DEFAULT '',
    "exampleTh" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LearningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER,
    "mode" TEXT NOT NULL DEFAULT 'learn',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "completedWords" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserUnitProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL DEFAULT 0,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "learnedCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "lastStudiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserUnitProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserWordProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'new',
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "knownCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" DATETIME,
    "lastCorrectAt" DATETIME,
    "lastIncorrectAt" DATETIME,
    "nextReviewAt" DATETIME,
    "masteredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserWordProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserWordProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabWord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserWordAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "sessionId" TEXT,
    "quizResultId" TEXT,
    "level" TEXT NOT NULL,
    "unit" INTEGER,
    "activityType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "correctAnswer" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserWordAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserWordAttempt_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabWord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserWordAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LearningSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserWordAttempt_quizResultId_fkey" FOREIGN KEY ("quizResultId") REFERENCES "QuizResult" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabWord_sourceKey_key" ON "VocabWord"("sourceKey");

-- CreateIndex
CREATE INDEX "VocabWord_level_idx" ON "VocabWord"("level");

-- CreateIndex
CREATE INDEX "VocabWord_level_unit_idx" ON "VocabWord"("level", "unit");

-- CreateIndex
CREATE INDEX "VocabWord_slug_idx" ON "VocabWord"("slug");

-- CreateIndex
CREATE INDEX "VocabWord_sourceOrder_idx" ON "VocabWord"("sourceOrder");

-- CreateIndex
CREATE INDEX "VocabWord_status_idx" ON "VocabWord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "LearningSession_userId_idx" ON "LearningSession"("userId");

-- CreateIndex
CREATE INDEX "LearningSession_userId_startedAt_idx" ON "LearningSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "LearningSession_userId_level_unit_idx" ON "LearningSession"("userId", "level", "unit");

-- CreateIndex
CREATE INDEX "QuizResult_userId_idx" ON "QuizResult"("userId");

-- CreateIndex
CREATE INDEX "QuizResult_userId_createdAt_idx" ON "QuizResult"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuizResult_userId_level_unit_idx" ON "QuizResult"("userId", "level", "unit");

-- CreateIndex
CREATE INDEX "UserUnitProgress_userId_idx" ON "UserUnitProgress"("userId");

-- CreateIndex
CREATE INDEX "UserUnitProgress_level_unit_idx" ON "UserUnitProgress"("level", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "UserUnitProgress_userId_level_unit_key" ON "UserUnitProgress"("userId", "level", "unit");

-- CreateIndex
CREATE INDEX "UserWordProgress_userId_idx" ON "UserWordProgress"("userId");

-- CreateIndex
CREATE INDEX "UserWordProgress_wordId_idx" ON "UserWordProgress"("wordId");

-- CreateIndex
CREATE INDEX "UserWordProgress_userId_status_idx" ON "UserWordProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserWordProgress_userId_nextReviewAt_idx" ON "UserWordProgress"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "UserWordProgress_userId_level_unit_idx" ON "UserWordProgress"("userId", "level", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "UserWordProgress_userId_wordId_key" ON "UserWordProgress"("userId", "wordId");

-- CreateIndex
CREATE INDEX "UserWordAttempt_userId_idx" ON "UserWordAttempt"("userId");

-- CreateIndex
CREATE INDEX "UserWordAttempt_wordId_idx" ON "UserWordAttempt"("wordId");

-- CreateIndex
CREATE INDEX "UserWordAttempt_sessionId_idx" ON "UserWordAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "UserWordAttempt_quizResultId_idx" ON "UserWordAttempt"("quizResultId");

-- CreateIndex
CREATE INDEX "UserWordAttempt_activityType_idx" ON "UserWordAttempt"("activityType");

-- CreateIndex
CREATE INDEX "UserWordAttempt_createdAt_idx" ON "UserWordAttempt"("createdAt");
