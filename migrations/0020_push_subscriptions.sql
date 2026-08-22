-- Web push, so a reminder can reach an installed PWA without going through an inbox.
--
-- One row per browser rather than per learner: the same account on a phone and a laptop is
-- two subscriptions, and revoking one must not silence the other. `endpoint` is the
-- identity — the push service issues it, and re-subscribing the same browser returns the
-- same value, so a unique index is what makes subscribe idempotent.
--
-- `p256dh`/`auth` are the client keys for encrypted payloads. Nothing sends a payload today
-- (the service worker fetches the text instead, which avoids implementing aes128gcm on a
-- Worker); they are stored because a browser hands them over exactly once.

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failedAt" DATETIME,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
