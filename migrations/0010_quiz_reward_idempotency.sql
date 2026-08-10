-- Per-progress-row idempotency marker for the legacy /progress/quiz verb
-- (backend/src/progress.ts), mirroring UserWordProgress.lastSessionRewardId's role for
-- session.ts's applyGradedWordReward. See that column's comment in schema.prisma.

ALTER TABLE "UserWordProgress" ADD COLUMN "lastQuizId" TEXT;
