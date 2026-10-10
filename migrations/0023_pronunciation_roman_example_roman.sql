-- Two romanisations the content pipeline (scripts/ai-generate-word-content.mjs) writes:
--   pronunciationRoman  uh-BOUT
--       How the *English* headword sounds, as an English respelling with the stressed
--       syllable in capitals. The Latin-script sibling of pronunciationTh.
--   exampleThRoman      rao gam-lang khui gan giao-gap ngaan
--       exampleTh read aloud for a learner who cannot read Thai yet.
ALTER TABLE "VocabWord" ADD COLUMN "pronunciationRoman" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VocabWord" ADD COLUMN "exampleThRoman" TEXT NOT NULL DEFAULT '';
