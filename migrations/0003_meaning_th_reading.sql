-- How the Thai meaning is itself read, for a foreign learner learning Thai:
--   meaningTh        วัฒนธรรม
--   meaningThReading วัด-ทะ-นะ-ทำ
--   meaningThRoman   Wat-tha-na-tham
--
-- Distinct from pronunciationTh, which is the reverse direction (the English word spelled
-- out in Thai script for a Thai learner).
ALTER TABLE "VocabWord" ADD COLUMN "meaningThReading" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VocabWord" ADD COLUMN "meaningThRoman" TEXT NOT NULL DEFAULT '';
