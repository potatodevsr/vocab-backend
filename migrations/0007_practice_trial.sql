-- Anonymous practice trial (docs/LEARNER-LIFECYCLE.md §3.2) and its claim-through-
-- magic-link binding (§3.3). See backend/src/practice.ts for how each column is used.

ALTER TABLE "MagicLinkToken" ADD COLUMN "pendingTrialId" TEXT;

-- Reward idempotency for a trial claim lives on UserWordProgress.trialClaimId (mutated
-- atomically with the counters/mastery it guards, in one UPSERT — see applyTrialClaim in
-- practice.ts). UserWordAttempt.trialId below is only a best-effort audit record, healed
-- in after that atomic write, not a gate the reward depends on.
ALTER TABLE "UserWordProgress" ADD COLUMN "trialClaimId" TEXT;

ALTER TABLE "UserWordAttempt" ADD COLUMN "trialId" TEXT;

CREATE INDEX "UserWordAttempt_trialId_idx" ON "UserWordAttempt"("trialId");

-- One audit row per (user, word, trial), so re-running the healing step is itself
-- idempotent. NULL trialId (every non-trial attempt) is exempt — SQLite treats each NULL
-- as distinct, so ordinary session/quiz attempts never collide.
CREATE UNIQUE INDEX "UserWordAttempt_userId_wordId_trialId_key" ON "UserWordAttempt"("userId", "wordId", "trialId");

CREATE TABLE "PracticeTrial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT,
    "unit" INTEGER,
    "wordIds" TEXT NOT NULL,
    "poolIds" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '[]',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "claimedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "PracticeTrial_expiresAt_idx" ON "PracticeTrial"("expiresAt");

-- Per-IP throttle for POST /practice/start; see checkStartRateLimit in practice.ts for
-- why this is keyed by IP rather than the client-clearable trial cookie.
CREATE TABLE "TrialRateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
