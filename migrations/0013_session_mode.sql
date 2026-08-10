-- Persist the session mode (normal | comeback | review) on MixedSession so
-- /progress/session/start resumes an open session only when its mode matches the request,
-- and so the shorter comeback set and due-only review set are distinguishable from the
-- default eight-item session. See backend/src/session.ts.

ALTER TABLE "MixedSession" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'normal';
