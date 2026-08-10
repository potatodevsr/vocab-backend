-- Exactly-once completion of a unit, level, course or collection (see the CompletionLedger
-- model in prisma/schema.prisma). A completion is worth a one-time reward, so it must fire
-- once and only once even under the crash-and-retry, no-transactions reality of D1
-- (backend/AGENTS.md "Worker constraints").
--
-- The guarantee is the UNIQUE INDEX below, not application logic: a genuine concurrent
-- double-award for the same (userId, kind, scope) can insert at most one row no matter how
-- the two requests interleave. The completion verb inserts here first and treats the
-- unique-constraint violation as "already granted" — the loser of the race applies no reward.

CREATE TABLE "CompletionLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompletionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompletionLedger_userId_kind_scope_key" ON "CompletionLedger"("userId", "kind", "scope");
CREATE INDEX "CompletionLedger_userId_idx" ON "CompletionLedger"("userId");
