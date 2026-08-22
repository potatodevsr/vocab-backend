-- Word lists as a first-class thing, so that "add an exam vocabulary pack" is an import
-- rather than a refactor.
--
-- Until now the corpus was implicitly one list: `VocabWord.sourceName` recorded where a row
-- came from, but nothing could enumerate the lists, nothing could scope a session to one,
-- and a second import would have interleaved itself into every learner's A1 unit 1.
--
-- `isFree` is an entitlement seam and nothing more — every list ships free today. The check
-- lives in one function (src/wordlists.ts) so answering the pricing question later is a
-- change there rather than an audit of every read.

CREATE TABLE "Wordlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "titleTh" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionTh" TEXT NOT NULL DEFAULT '',
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Wordlist_isPublished_ordinal_idx" ON "Wordlist"("isPublished", "ordinal");

-- The course itself. Named for the list, not for the import that produced it, so the
-- American/British sourcing question stays where it belongs (`sourceName`).
INSERT INTO "Wordlist" ("id", "title", "titleTh", "description", "descriptionTh", "ordinal", "isFree", "isPublished", "updatedAt")
VALUES (
    'oxford-3000',
    'The Oxford 3000',
    'คลังคำ Oxford 3000',
    'The 3,000 English words that carry most of the language, by CEFR level.',
    'คำศัพท์ภาษาอังกฤษ 3,000 คำที่ใช้บ่อยที่สุด จัดตามระดับ CEFR',
    0,
    1,
    1,
    CURRENT_TIMESTAMP
);

ALTER TABLE "VocabWord" ADD COLUMN "wordlistId" TEXT NOT NULL DEFAULT 'oxford-3000';
CREATE INDEX "VocabWord_wordlistId_level_unit_idx" ON "VocabWord"("wordlistId", "level", "unit");

ALTER TABLE "User" ADD COLUMN "wordlistId" TEXT NOT NULL DEFAULT 'oxford-3000';
