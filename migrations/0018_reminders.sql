-- Reminder and weekly-recap email settings, per learner.
--
-- Off by default and never opted in on the learner's behalf: the product promise is that a
-- streak is a memory aid, not a threat, and an email nobody asked for breaks that before
-- the first sentence.
--
-- `reminderHour` is an hour in the learner's own timezone (the `timezone` column), so the
-- cron runs hourly and computes each learner's local time. `lastReminderOn` / `lastRecapOn`
-- are local date strings and act as the idempotency key: D1 has no transactions, so "have
-- we already mailed this person today" has to be a comparison against a value the send
-- itself wrote, not a read-modify-write.

ALTER TABLE "User" ADD COLUMN "reminderOptIn" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "reminderHour" INTEGER;
ALTER TABLE "User" ADD COLUMN "lastReminderOn" TEXT;
ALTER TABLE "User" ADD COLUMN "lastRecapOn" TEXT;

CREATE INDEX "User_reminderOptIn_idx" ON "User"("reminderOptIn");
