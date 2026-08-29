-- Evidence that a word was recalled across time, not just answered twice.
--
-- `docs/LEARNER-LIFECYCLE.md` §2.1 defines "strong" as two successful recalls on different
-- days. Nothing recorded a day, so the API counted `mastery >= 2` and the UI drew the
-- strong band at `mastery >= 3` — two numbers, neither of them the promise. The collection
-- meter, which is the product's headline claim, counted words answered twice in one
-- sitting.
--
-- These columns record the evidence. `mastery` is untouched and keeps its job as the SRS
-- scheduling rung; the strong predicate moves to `backend/src/mastery.ts` and reads only
-- what is added here.
--
-- Additive on purpose, and deliberately not backfilled. The production migration path
-- forbids data rewrites (`scripts/validate-production-migrations.mjs`), and a backfill
-- would have to invent the days it claims to have observed. Existing rows therefore start
-- with no evidence: their `mastery`, schedule, streaks and history are unchanged, and only
-- the *claim* that a word is strong has to be re-earned.
--
-- Rollback needs no down-migration: revert the readers and these columns become inert.

ALTER TABLE UserWordProgress ADD COLUMN strongDays INTEGER NOT NULL DEFAULT 0;
ALTER TABLE UserWordProgress ADD COLUMN recallDays INTEGER NOT NULL DEFAULT 0;
ALTER TABLE UserWordProgress ADD COLUMN lastStrongDay TEXT;
ALTER TABLE UserWordProgress ADD COLUMN lastRecallDay TEXT;
ALTER TABLE UserWordProgress ADD COLUMN strongAt DATETIME;

-- The collection meter counts strong words per learner and level on every Today render.
CREATE INDEX IF NOT EXISTS UserWordProgress_userId_strongDays_idx
    ON UserWordProgress(userId, strongDays);
