-- Two independent additions that share one migration because they touch one table.
--
-- 1. Pre-generated audio (SPEC §5.6). R2 object keys, empty until the generation script
--    has run for that row. Empty is the only state the UI branches on.
-- 2. Curation state for the Thai content, kept separate from `status`.
--    `status` = may a learner see it. `reviewState` = has a human confirmed the Thai.
--    The import published 2,955 rows nobody proofread, so publishing cannot be taken as
--    review after the fact. Unreviewed rows stay usable in-app and stay out of the
--    search index until a human approves them.

ALTER TABLE "VocabWord" ADD COLUMN "audioKeyEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VocabWord" ADD COLUMN "audioKeyExample" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VocabWord" ADD COLUMN "reviewState" TEXT NOT NULL DEFAULT 'unreviewed';
ALTER TABLE "VocabWord" ADD COLUMN "reviewFlags" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "VocabWord" ADD COLUMN "reviewedAt" DATETIME;

CREATE INDEX "VocabWord_reviewState_idx" ON "VocabWord"("reviewState");
