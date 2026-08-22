/**
 * Import a word list from CSV — the path that makes "add TOEIC vocabulary" a data job.
 *
 * The `Wordlist` table exists so a second list cannot interleave itself into an existing
 * learner's course (`src/wordlists.ts`), and this is the other half of that: a list is
 * created **unpublished**, its words land as **drafts**, and neither is visible to anyone
 * until a human publishes them. There is no flag on this script to skip that — an import
 * that could go straight to learners is an import that eventually will, at 3am, from a
 * spreadsheet nobody proofread.
 *
 * CSV columns (header row required):
 *
 *   word          the headword, as written                      (required)
 *   level         A1 | A2 | B1 | B2                              (required)
 *   partOfSpeech  "n." / "v." / "prep., adv."                    (required)
 *   meaningTh     the Thai meaning                               (optional)
 *   pronunciationTh  the English word in Thai script             (optional)
 *   exampleEn     an example sentence containing the word        (optional)
 *   exampleTh     its Thai translation                           (optional)
 *   unit          integer; omitted means "number them in order"  (optional)
 *
 * Usage:
 *   node scripts/import-wordlist.mjs --file toeic.csv \
 *     --id toeic-900 --title "TOEIC 900" --title-th "คำศัพท์ TOEIC 900"
 *   node scripts/import-wordlist.mjs --file toeic.csv --id toeic-900 --dry
 *   node scripts/import-wordlist.mjs ... --remote
 *
 * Then: proofread in /admin/review and /admin/vocabulary, publish the words, and publish
 * the list itself in /admin/lists.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? fallback : argv[index + 1];
};

const FILE = flag("file");
const ID = flag("id");
const TITLE = flag("title") ?? ID;
const TITLE_TH = flag("title-th") ?? "";
const DESCRIPTION = flag("description") ?? "";
const DESCRIPTION_TH = flag("description-th") ?? "";
const UNIT_SIZE = Number(flag("unit-size", "20")) || 20;
const REMOTE = argv.includes("--remote");
const DRY = argv.includes("--dry");

if (!FILE || !ID) {
    console.error("--file and --id are required. See the header of this script.");
    process.exit(1);
}

/** Lists are addressed by id in URLs and in `VocabWord.wordlistId`; keep them boring. */
if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(ID)) {
    console.error("--id must be lowercase letters, digits and hyphens (e.g. toeic-900)");
    process.exit(1);
}

const sql = (value) =>
    value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

/**
 * A CSV reader that understands quoted fields, because Thai meanings contain commas and a
 * `split(",")` import corrupts exactly the rows nobody checks.
 */
const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];

        if (quoted) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    field += '"';
                    index += 1;
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

    return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
};

const slugify = (value) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const LEVELS = new Set(["A1", "A2", "B1", "B2"]);

const main = () => {
    const rows = parseCsv(readFileSync(FILE, "utf8"));
    const [header, ...body] = rows;

    const columns = header.map((name) => name.trim());
    const at = (row, name) => {
        const index = columns.indexOf(name);
        return index === -1 ? "" : (row[index] ?? "").trim();
    };

    for (const required of ["word", "level", "partOfSpeech"]) {
        if (!columns.includes(required)) {
            console.error(`missing required column: ${required}`);
            process.exit(1);
        }
    }

    const words = [];
    const skipped = [];
    const seen = new Set();
    const perLevel = new Map();

    for (const row of body) {
        const word = at(row, "word");
        const level = at(row, "level").toUpperCase();
        const partOfSpeech = at(row, "partOfSpeech");

        if (!word || !LEVELS.has(level) || !partOfSpeech) {
            skipped.push({ word, reason: !word ? "no word" : !LEVELS.has(level) ? "bad level" : "no part of speech" });
            continue;
        }

        // One row per (word, part of speech) — the same shape the Oxford import settled on.
        const key = `${level}::${word.toLowerCase()}::${partOfSpeech}`;
        if (seen.has(key)) {
            skipped.push({ word, reason: "duplicate" });
            continue;
        }
        seen.add(key);

        const order = (perLevel.get(level) ?? 0) + 1;
        perLevel.set(level, order);

        const explicitUnit = Number(at(row, "unit"));
        const unit = Number.isInteger(explicitUnit) && explicitUnit > 0
            ? explicitUnit
            : Math.floor((order - 1) / UNIT_SIZE) + 1;

        words.push({
            id: `${ID}::${word.toLowerCase()}::${slugify(partOfSpeech)}::${level}`,
            sourceKey: `${ID}::${word.toLowerCase()}::${slugify(partOfSpeech)}::${level}`,
            sourceOrder: order,
            sourceName: ID,
            sourceTitle: TITLE,
            level,
            unit,
            word: word.toLowerCase(),
            displayWord: word,
            slug: slugify(word),
            partOfSpeech,
            meaningTh: at(row, "meaningTh"),
            pronunciationTh: at(row, "pronunciationTh"),
            exampleEn: at(row, "exampleEn"),
            exampleTh: at(row, "exampleTh"),
        });
    }

    console.log(`${words.length} words parsed from ${FILE}`);
    for (const [level, count] of [...perLevel].sort()) console.log(`  ${level}: ${count}`);
    if (skipped.length > 0) {
        console.log(`\n${skipped.length} rows skipped:`);
        for (const entry of skipped.slice(0, 10)) console.log(`  ${entry.word || "(blank)"} — ${entry.reason}`);
        if (skipped.length > 10) console.log(`  …and ${skipped.length - 10} more`);
    }

    if (words.length === 0) {
        console.error("\nnothing to import");
        process.exit(1);
    }

    const statements = [
        // The list itself: unpublished, so `GET /wordlists` does not offer it and nobody can
        // switch to it until a human says so.
        `INSERT INTO "Wordlist" (id, title, titleTh, description, descriptionTh, ordinal, isFree, isPublished, updatedAt)
         VALUES (${sql(ID)}, ${sql(TITLE)}, ${sql(TITLE_TH)}, ${sql(DESCRIPTION)}, ${sql(DESCRIPTION_TH)}, 10, 1, 0, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, titleTh=excluded.titleTh,
             description=excluded.description, descriptionTh=excluded.descriptionTh,
             updatedAt=CURRENT_TIMESTAMP;`,
    ];

    for (const word of words) {
        statements.push(
            `INSERT INTO VocabWord (id, sourceKey, sourceOrder, sourceName, sourceTitle, level, unit, word, displayWord, slug, homograph, sense, partOfSpeech, meaningTh, pronunciationTh, meaningThReading, meaningThRoman, ipa, exampleEn, exampleTh, posUsages, notes, status, reviewState, reviewFlags, audioKeyEn, audioKeyExample, wordlistId, createdAt, updatedAt) VALUES (` +
                [
                    sql(word.id), sql(word.sourceKey), word.sourceOrder, sql(word.sourceName),
                    sql(word.sourceTitle), sql(word.level), word.unit, sql(word.word),
                    sql(word.displayWord), sql(word.slug), "NULL", "NULL", sql(word.partOfSpeech),
                    sql(word.meaningTh), sql(word.pronunciationTh), "''", "''", "''",
                    sql(word.exampleEn), sql(word.exampleTh), "'[]'", "''",
                    // Draft and unreviewed: an import is a starting point, never a publish.
                    "'draft'", "'unreviewed'", "'[]'", "''", "''", sql(ID),
                    "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP",
                ].join(", ") +
                `) ON CONFLICT(id) DO UPDATE SET meaningTh=excluded.meaningTh,
                    pronunciationTh=excluded.pronunciationTh, exampleEn=excluded.exampleEn,
                    exampleTh=excluded.exampleTh, updatedAt=CURRENT_TIMESTAMP;`,
        );
    }

    if (DRY) {
        console.log(`\n--dry: ${statements.length} statements prepared, nothing written`);
        return;
    }

    const dir = mkdtempSync(join(tmpdir(), "wordlist-import-"));
    const file = join(dir, "import.sql");
    writeFileSync(file, statements.join("\n"));

    execFileSync(
        "pnpm",
        ["exec", "wrangler", "d1", "execute", "vocab", REMOTE ? "--remote" : "--local", "--file", file],
        { stdio: "inherit", maxBuffer: 64 * 1024 * 1024 },
    );

    console.log(`\nimported as draft. Next:
  1. proofread the Thai in /admin/review and /admin/vocabulary
  2. publish the words you trust (status -> published)
  3. publish the list itself in /admin/lists — until then nobody is offered it`);
};

main();
