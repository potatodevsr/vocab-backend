-- The end-of-unit checkpoint (docs/LEARNER-LIFECYCLE.md): a graded gate a learner passes to
-- be credited with the unit. Same server-authoritative shape as MixedSession/PracticeTrial —
-- wordIds/itemTypes/poolIds persisted so the answer path can re-derive the shuffle without
-- ever sending a "correct option" to the client. `passed` is null until completion, `awarded`
-- guards the one-time completion reward against crash-and-retry.

CREATE TABLE "UnitCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "wordIds" TEXT NOT NULL,
    "itemTypes" TEXT NOT NULL,
    "poolIds" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '[]',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "passed" BOOLEAN,
    "awarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitCheckpoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UnitCheckpoint_userId_idx" ON "UnitCheckpoint"("userId");
CREATE INDEX "UnitCheckpoint_userId_level_unit_idx" ON "UnitCheckpoint"("userId", "level", "unit");

-- The actual "at most one open checkpoint per learner per unit" guarantee — a partial unique
-- index, not just application logic, so a genuine concurrent double-start cannot create two
-- open rows no matter how the two requests interleave. Prisma's schema DSL has no
-- `@@unique(..., where: ...)`, so this constraint exists only here.
CREATE UNIQUE INDEX "UnitCheckpoint_one_open_per_unit" ON "UnitCheckpoint"("userId", "level", "unit") WHERE "completedAt" IS NULL;
