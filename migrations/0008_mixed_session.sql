-- The merged eight-item mixed session (docs/LEARNER-LIFECYCLE.md §0, §3.5, §8 L2), plus
-- the weekly-goal and timezone fields it needs on User. See backend/src/session.ts for how
-- each column is used.

ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
ALTER TABLE "User" ADD COLUMN "weeklyGoalDays" INTEGER;

CREATE TABLE "MixedSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER,
    "wordIds" TEXT NOT NULL,
    "itemTypes" TEXT NOT NULL,
    "poolIds" TEXT NOT NULL,
    "dueWordIds" TEXT NOT NULL DEFAULT '[]',
    "answers" TEXT NOT NULL DEFAULT '[]',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "rewardAppliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MixedSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MixedSession_userId_idx" ON "MixedSession"("userId");
CREATE INDEX "MixedSession_userId_completedAt_idx" ON "MixedSession"("userId", "completedAt");
CREATE INDEX "MixedSession_userId_createdAt_idx" ON "MixedSession"("userId", "createdAt");

-- The actual "at most one open session per learner" guarantee — a partial unique index,
-- not just application logic, so a genuine concurrent double POST /progress/session/start
-- cannot create two open rows no matter how the two requests interleave. Prisma's schema
-- DSL has no `@@unique(..., where: ...)`, so this constraint exists only here; `session.ts`
-- catches the resulting unique-constraint error and falls back to resuming the winner's
-- row (see `backend/src/session.ts`'s POST /progress/session/start).
CREATE UNIQUE INDEX "MixedSession_one_open_per_user" ON "MixedSession"("userId") WHERE "completedAt" IS NULL;
