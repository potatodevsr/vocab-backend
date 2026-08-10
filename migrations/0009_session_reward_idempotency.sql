-- Per-progress-row idempotency marker for the mixed session's reward application
-- (backend/src/session.ts, applySessionReward), mirroring UserWordProgress.trialClaimId's
-- role for practice.ts's applyWordReward. See that column's comment in schema.prisma.

ALTER TABLE "UserWordProgress" ADD COLUMN "lastSessionRewardId" TEXT;
