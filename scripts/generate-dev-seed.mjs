// Rebuilds the DEV database.
//
//   node scripts/generate-dev-seed.mjs > seed/dev.sql
//
// Structure (ids, levels, part of speech, ordering) comes from data/vocab_review.csv,
// which is an export of the real VocabWord table. **Thai meanings do not.** The export's
// meaning column is corrupted in places — `about` carries `ละทิ้ง` (abandon's meaning),
// `ability` carries `ความสามารถึง`, `close` carries `ปิด2` — which is why the quiz could
// show a question with no correct answer among the options.
//
// So meanings are taken from data/memmoread_oxford_3000_thai_vocab_slim.json, the
// extraction source, which is correct for those words. Rules:
//   * the source is authoritative; the CSV's meaning is never trusted
//   * source text is de-spaced ("ล ะ ท ิ ้ ง" -> "ละทิ้ง") per glyph run
//   * a row is published ONLY if the source has a meaning for its word. No source entry
//     means draft — an unverified word must never reach a quiz.
//
// The source is keyed by word, not by sense, so two senses of one word share a meaning.
// That is a known limitation and still strictly better than a wrong meaning.
//
// PARTS OF SPEECH ARE MERGED. The CSV lists one row per (word, part of speech), so `about`
// arrives twice — once `prep.`, once `adv.` — with byte-identical Thai. That reads as a
// duplicate everywhere it is shown and doubles the curation work. Rows sharing
// (level, word, displayWord, slug, homograph, sense) collapse into one whose
// `partOfSpeech` is the joined list, in the order the CSV lists them, which is Oxford's
// own order: "prep., adv.".
//
// Measured against the 3,752-row export before writing this: of the 436 groups that
// collapse, **zero** disagree on `meaningTh` and **zero** disagree on `pronunciationTh`,
// so no meaning is lost in the merge. 9 groups disagree on `sourceOrder` (lowest wins) and
// 22 straddle a unit boundary, which is why units are recomputed below rather than
// inherited: unit membership must follow the merged list, or a lesson ends up short.
//
// This is NOT the e2e seed. e2e uses seed/e2e.sql against an isolated database.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = resolve(here, "../data/vocab_review.csv");
const SOURCE_PATH = resolve(
    here,
    "../data/memmoread_oxford_3000_thai_vocab_slim.json",
);

/** The extraction spaces every Thai glyph: "ล ะ ท ิ ้ ง" -> "ละทิ้ง". */
const despaceThai = (value) => {
    if (!value) return "";

    let out = String(value);
    let previous = null;

    while (out !== previous) {
        previous = out;
        out = out.replace(/([฀-๿])\s+([฀-๿])/g, "$1$2");
    }

    return out.trim();
};

/** word (lowercased) -> verified Thai meaning + pronunciation. */
const loadSourceMeanings = () => {
    const raw = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
    const rows = Array.isArray(raw) ? raw : raw.rows ?? raw.data ?? [];
    const map = new Map();

    for (const row of rows) {
        const word = String(row.vocab ?? "").trim().toLowerCase();
        if (!word || map.has(word)) continue;

        map.set(word, {
            meaningTh: despaceThai(row.meaningTh),
            pronunciationTh: despaceThai(row.pronunciationTh),
        });
    }

    return map;
};

/** Minimal RFC4180 parser — fields may contain commas and quotes. */
const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];

        if (quoted) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    quoted = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') quoted = true;
        else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (char !== "\r") field += char;
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
};

const sql = (value) =>
    value === null || value === undefined
        ? "NULL"
        : `'${String(value).replace(/'/g, "''")}'`;

const sourceMeanings = loadSourceMeanings();
const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
const header = rows[0];
const col = (name) => header.indexOf(name);

const idx = {
    id: col("id"),
    sourceKey: col("sourceKey"),
    sourceOrder: col("sourceOrder"),
    sourceName: col("sourceName"),
    sourceTitle: col("sourceTitle"),
    level: col("level"),
    word: col("word"),
    displayWord: col("displayWord"),
    slug: col("slug"),
    homograph: col("homograph"),
    sense: col("sense"),
    partOfSpeech: col("partOfSpeech"),
    meaningTh: col("meaningTh"),
    meaningThClean: col("meaningThClean"),
    pronunciationTh: col("pronunciationTh"),
    pronunciationThClean: col("pronunciationThClean"),
    ipa: col("ipa"),
    exampleEn: col("exampleEn"),
    exampleTh: col("exampleTh"),
    notes: col("notes"),
    createdAt: col("createdAt"),
    updatedAt: col("updatedAt"),
};

const UNIT_SIZE = 20;

/** First non-empty wins; the merge never overwrites a filled field with a blank one. */
const keep = (current, candidate) =>
    current && current.trim() !== "" ? current : (candidate ?? "").trim();

/**
 * What makes two CSV rows the same word. Deliberately excludes `sourceOrder` and
 * `partOfSpeech`: 9 groups disagree on the former, and the latter is the thing being
 * merged. Including either would leave duplicates behind.
 */
const groupKey = (level, word, displayWord, slug, homograph, sense) =>
    JSON.stringify([level, word, displayWord, slug, homograph, sense]);

const groups = new Map();
let csvRows = 0;

for (const row of rows.slice(1)) {
    if (row.length < header.length) continue;

    const level = row[idx.level]?.trim();
    if (!level) continue;

    csvRows += 1;

    // Meanings come from the verified source only — never from the CSV export.
    const verified = sourceMeanings.get(
        (row[idx.word] ?? "").trim().toLowerCase(),
    );
    const meaningTh = verified?.meaningTh ?? "";
    const pronunciationTh =
        verified?.pronunciationTh ||
        (row[idx.pronunciationThClean] || row[idx.pronunciationTh] || "").trim();

    const word = (row[idx.word] ?? "").trim();
    const displayWord = row[idx.displayWord] || word;
    const slug = row[idx.slug] || word;
    const homographRaw = row[idx.homograph]?.trim();
    const senseRaw = row[idx.sense]?.trim();
    const homograph = homographRaw ? Number(homographRaw) : null;
    const sense = senseRaw || null;
    const partOfSpeech = (row[idx.partOfSpeech] ?? "").trim();
    const sourceOrder = Number(row[idx.sourceOrder]) || 0;

    const key = groupKey(level, word, displayWord, slug, homograph, sense);
    const existing = groups.get(key);

    if (!existing) {
        groups.set(key, {
            id: row[idx.id],
            sourceKey: row[idx.sourceKey],
            sourceOrder,
            sourceName: row[idx.sourceName],
            sourceTitle: row[idx.sourceTitle],
            level,
            word,
            displayWord,
            slug,
            homograph,
            sense,
            // Kept in CSV order, which is Oxford's own listing order ("prep., adv.").
            partsOfSpeech: partOfSpeech ? [partOfSpeech] : [],
            meaningTh,
            pronunciationTh,
            ipa: (row[idx.ipa] ?? "").trim(),
            exampleEn: (row[idx.exampleEn] ?? "").trim(),
            exampleTh: (row[idx.exampleTh] ?? "").trim(),
            notes: (row[idx.notes] ?? "").trim(),
            createdAt: row[idx.createdAt] || "2026-01-01T00:00:00.000Z",
            updatedAt: row[idx.updatedAt] || "2026-01-01T00:00:00.000Z",
        });
        continue;
    }

    if (partOfSpeech && !existing.partsOfSpeech.includes(partOfSpeech)) {
        existing.partsOfSpeech.push(partOfSpeech);
    }

    // The surviving row keeps the earliest position, so a merged word sorts where its
    // first sense did rather than jumping to the back of the level.
    if (sourceOrder && (!existing.sourceOrder || sourceOrder < existing.sourceOrder)) {
        existing.sourceOrder = sourceOrder;
        existing.id = row[idx.id];
        existing.sourceKey = row[idx.sourceKey];
    }

    existing.meaningTh = keep(existing.meaningTh, meaningTh);
    existing.pronunciationTh = keep(existing.pronunciationTh, pronunciationTh);
    existing.ipa = keep(existing.ipa, row[idx.ipa]);
    existing.exampleEn = keep(existing.exampleEn, row[idx.exampleEn]);
    existing.exampleTh = keep(existing.exampleTh, row[idx.exampleTh]);
    existing.notes = keep(existing.notes, row[idx.notes]);
}

// Units are assigned AFTER merging, over the merged list, in the order words are served.
// Inheriting the CSV's unit would leave the 22 groups that straddle a boundary in a lesson
// that is now one word short.
const merged = [...groups.values()].sort(
    (a, b) =>
        a.level.localeCompare(b.level) ||
        a.sourceOrder - b.sourceOrder ||
        a.word.localeCompare(b.word),
);

const seenPerLevel = new Map();
const out = [
    "-- GENERATED by scripts/generate-dev-seed.mjs from data/vocab_review.csv",
    "DELETE FROM VocabWord;",
    "",
];

let published = 0;

for (const entry of merged) {
    const seen = seenPerLevel.get(entry.level) ?? 0;
    seenPerLevel.set(entry.level, seen + 1);
    const unit = Math.floor(seen / UNIT_SIZE) + 1;

    // No verified meaning -> stays draft, so it can never reach a learner or a quiz.
    const status = entry.meaningTh ? "published" : "draft";
    if (status === "published") published += 1;

    out.push(
        "INSERT INTO VocabWord (id, sourceKey, sourceOrder, sourceName, sourceTitle, level, unit, word, displayWord, slug, homograph, sense, partOfSpeech, meaningTh, pronunciationTh, ipa, exampleEn, exampleTh, notes, status, createdAt, updatedAt) VALUES (" +
            [
                sql(entry.id),
                sql(entry.sourceKey),
                entry.sourceOrder,
                sql(entry.sourceName),
                sql(entry.sourceTitle),
                sql(entry.level),
                unit,
                sql(entry.word),
                sql(entry.displayWord),
                sql(entry.slug),
                entry.homograph === null ? "NULL" : entry.homograph,
                entry.sense === null ? "NULL" : sql(entry.sense),
                sql(entry.partsOfSpeech.join(", ")),
                sql(entry.meaningTh),
                sql(entry.pronunciationTh),
                sql(entry.ipa),
                sql(entry.exampleEn),
                sql(entry.exampleTh),
                sql(entry.notes),
                sql(status),
                sql(entry.createdAt),
                sql(entry.updatedAt),
            ].join(", ") +
            ");",
    );
}

process.stderr.write(
    `[dev-seed] ${csvRows} CSV rows -> ${merged.length} words after merging parts of speech ` +
        `(${csvRows - merged.length} collapsed), ${published} published (verified meaning), ` +
        `${merged.length - published} draft (no source entry)\n`,
);
process.stdout.write(out.join("\n") + "\n");
