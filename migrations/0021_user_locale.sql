-- Which interface language a learner reads.
--
-- Needed by the surfaces that have no request to infer it from: the reminder email a cron
-- sends, and the notification text the service worker fetches when a push arrives. Both
-- were hard-coded Thai — correct for most of this audience and wrong for the
-- English-interface learner, who would get a Thai notification about a course they read in
-- English.
--
-- Defaults to `th` because that is the primary audience (AGENTS.md rule 3), and because
-- every existing row was created under that assumption.

ALTER TABLE "User" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'th';
