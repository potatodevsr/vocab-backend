-- The letter-by-letter make-up of meaningTh, each character named the traditional way:
--   meaningTh         วัฒนธรรม
--   meaningThSpelling ว แหวน, ไม้หันอากาศ, ฒ ผู้เฒ่า, น หนู, ธ ธง, ร เรือ, ร เรือ, ม ม้า
--
-- A separate migration rather than an edit to 0003: that one is already applied to the
-- local dev D1, and wrangler tracks migrations by file, so an edited 0003 would never
-- re-run — the file would claim a column the database does not have.
ALTER TABLE "VocabWord" ADD COLUMN "meaningThSpelling" TEXT NOT NULL DEFAULT '';
