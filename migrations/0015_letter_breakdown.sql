-- A hand-corrected letter breakdown for a word's Thai meaning, as JSON:
--   [{ "text": "แ‑ะ", "letterId": "sound-sara-ae" }]
--
-- Empty for every existing row, and empty is the normal case: the breakdown is derived
-- from `meaningTh` (web repo, lib/thai-letters.ts) so it cannot drop a character. This
-- column only carries the words where the derivation guesses the syllable boundary wrong
-- — Thai does not write that boundary, so no rule reads every word correctly.

ALTER TABLE "VocabWord" ADD COLUMN "letterBreakdown" TEXT NOT NULL DEFAULT '';
