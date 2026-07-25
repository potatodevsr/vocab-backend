-- CreateTable
CREATE TABLE "LearningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LearningSession_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabWord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LearningSession_userId_idx" ON "LearningSession"("userId");

-- CreateIndex
CREATE INDEX "LearningSession_wordId_idx" ON "LearningSession"("wordId");

-- CreateIndex
CREATE INDEX "QuizResult_userId_idx" ON "QuizResult"("userId");
