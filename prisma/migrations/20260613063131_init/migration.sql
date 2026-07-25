-- CreateTable
CREATE TABLE "VocabWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceKey" TEXT NOT NULL,
    "sourceOrder" INTEGER NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "displayWord" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "homograph" INTEGER,
    "sense" TEXT,
    "partOfSpeech" TEXT NOT NULL,
    "meaningTh" TEXT NOT NULL DEFAULT '',
    "pronunciationTh" TEXT NOT NULL DEFAULT '',
    "ipa" TEXT NOT NULL DEFAULT '',
    "exampleEn" TEXT NOT NULL DEFAULT '',
    "exampleTh" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabWord_sourceKey_key" ON "VocabWord"("sourceKey");

-- CreateIndex
CREATE INDEX "VocabWord_level_idx" ON "VocabWord"("level");

-- CreateIndex
CREATE INDEX "VocabWord_slug_idx" ON "VocabWord"("slug");

-- CreateIndex
CREATE INDEX "VocabWord_sourceOrder_idx" ON "VocabWord"("sourceOrder");

-- CreateIndex
CREATE INDEX "VocabWord_status_idx" ON "VocabWord"("status");
