-- Google sign-in, and magic links that can create an account.
--
-- Additive only, on purpose. Making `User.password` nullable would be the honest schema,
-- but SQLite cannot relax NOT NULL in place: it needs a drop-and-rename of a table five
-- foreign keys point at, and D1 has no transaction to make that atomic (backend/AGENTS.md).
-- So `password` keeps NOT NULL and carries '' for accounts that have never set one, and
-- the sign-up link lives in its own table rather than as a nullable column on
-- MagicLinkToken.

-- Google's `sub`. Stable for the life of the account, and never reassigned the way an
-- email address can be — matching on it is what stops a recycled address from inheriting
-- someone else's progress.
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- Partial index: SQLite treats every NULL as distinct, so a plain unique index would
-- permit them, but stating the predicate keeps the index off the password-only rows.
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId") WHERE "googleId" IS NOT NULL;

CREATE TABLE "PendingSignup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pendingTrialId" TEXT
);

CREATE UNIQUE INDEX "PendingSignup_tokenHash_key" ON "PendingSignup"("tokenHash");
CREATE INDEX "PendingSignup_email_createdAt_idx" ON "PendingSignup"("email", "createdAt");
CREATE INDEX "PendingSignup_expiresAt_idx" ON "PendingSignup"("expiresAt");
