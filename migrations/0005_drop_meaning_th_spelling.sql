-- Removes the hand-typed letter breakdown added in 0004.
--
-- It never earned its keep: the breakdown is a pure function of `meaningTh`
-- (`Array.from("เกี่ยวกับ")` -> `เ ก ี ่ ย ว ก ั บ`), so `lib/thai-alphabet.ts` derives it
-- at render time. Deriving is exact and free; typing or picking it would have been ~21,000
-- admin actions across 2,367 distinct meanings, each one able to drop a letter and to
-- disagree with the word it came from.
--
-- No data is lost: the column was never populated in any environment.
ALTER TABLE "VocabWord" DROP COLUMN "meaningThSpelling";
