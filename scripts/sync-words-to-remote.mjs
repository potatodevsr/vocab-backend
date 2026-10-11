// Copies curated word content from local D1 to production D1.
//
// The curation loop runs locally (AI extraction and generation, then review in /admin), so
// production needs the result without the rest of the local database: users, progress and
// XP on production are real and are never touched. Only existing VocabWord rows are
// updated, keyed by `id`, and only to fill in what production is missing: a column is
// written only where production has nothing and local has a value. A value production
// already has is never replaced, even when local differs — those are counted in the
// report instead, so a later, deliberate run can decide about them.
//
// Rows that exist on one side only are reported, not created or deleted — the word list
// itself comes from the seed, and a missing id means the two databases were seeded from
// different data, which is a question for a human.
//
//   node scripts/sync-words-to-remote.mjs            # dry run: counts per column, SQL on disk
//   node scripts/sync-words-to-remote.mjs --write    # execute against production
//   add --repair-thai to either to also fix damaged meaningTh / pronunciationTh (see below)
//
// --repair-thai additionally replaces meaningTh / pronunciationTh that production *has*
// but that are worse than local's PDF re-read:
//   - production's value is OCR debris (Latin letters or digits, or no Thai at all);
//   - production's value differs only by a decomposed sara am (`ํา` for `ำ`);
//   - the row was never curated on production (no exampleEn there) and the text differs
//     by more than spacing.
// A row curated on production keeps its text apart from the lossless sara-am fix, and a
// spacing-only difference is never worth a write.
//
// A row a human approved on production (`reviewState = 'approved'`) is never touched.
//
// Review state follows the content: when a row gets content filled in and local has it
// flagged for review (an AI pass was unsure of it), production's row is flagged too, with
// the flags merged — otherwise doubtful AI text would go live as if nobody doubted it.
//
// Every run writes the update SQL and a rollback SQL (production's values before the
// change) to data/sync/. Back up first anyway:
//   pnpm exec wrangler d1 export vocab --remote --output data/sync/remote-backup.sql

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data/sync");
const WRITE = process.argv.includes("--write");
const REPAIR_THAI = process.argv.includes("--repair-thai");
const REPAIRABLE = ["meaningTh", "pronunciationTh"];
const CHUNK = 400;

const CONTENT = [
    "meaningTh",
    "pronunciationTh",
    "pronunciationRoman",
    "meaningThReading",
    "meaningThRoman",
    "ipa",
    "exampleEn",
    "exampleTh",
    "exampleThRoman",
    "posUsages",
    "letterBreakdown",
];
const COLUMNS = [...CONTENT, "reviewState", "reviewFlags"];
const blank = (value) => value == null || String(value).trim() === "" || value === "[]";
const THAI = /[\u0E00-\u0E7F]/;
const squash = (value) => String(value ?? "").replace(/\s+/g, "");

/** Should local's value replace production's existing one? Only under --repair-thai. */
export const shouldRepair = (column, prodValue, localValue, prodCurated) => {
    if (!REPAIRABLE.includes(column) || blank(localValue) || blank(prodValue)) return false;
    if (squash(prodValue) === squash(localValue)) return false;
    if (/[A-Za-z0-9]/.test(prodValue) || !THAI.test(prodValue)) return true;
    if (squash(prodValue.replace(/\u0E4D\u0E32/g, "\u0E33")) === squash(localValue)) return true;
    return !prodCurated;
};

const flagsOf = (value) => {
    try {
        return JSON.parse(value || "[]");
    } catch {
        return [];
    }
};

const d1 = (where, sql) => {
    const out = execFileSync(
        "pnpm",
        ["exec", "wrangler", "d1", "execute", "vocab", `--${where}`, "--json", "--command", sql],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
    );
    return JSON.parse(out.slice(out.indexOf("[")))[0]?.results ?? [];
};

const sql = (value) => (value == null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

/**
 * Decide what to write. Pure: takes the two row maps (id -> row), returns statements and
 * counts. Exported so the fill-only rules can be tested without a database.
 */
export const planSync = (local, remote, { repairThai = REPAIR_THAI } = {}) => {
    const updates = [];
    const rollback = [];
    const approvedOnRemote = [];
    let flaggedForReview = 0;
    const filled = new Map(CONTENT.map((c) => [c, 0]));
    const keptDifferent = new Map(CONTENT.map((c) => [c, 0]));
    const repaired = new Map(REPAIRABLE.map((c) => [c, 0]));
    for (const [id, l] of local) {
        const r = remote.get(id);
        if (!r) continue;
        if (r.reviewState === "approved") {
            if (CONTENT.some((c) => blank(r[c]) && !blank(l[c]))) approvedOnRemote.push(id);
            continue;
        }

        const set = {};
        for (const c of CONTENT) {
            if (blank(l[c]) || l[c] === r[c]) continue;
            if (blank(r[c])) {
                set[c] = l[c];
                filled.set(c, filled.get(c) + 1);
            } else if (repairThai && shouldRepair(c, r[c], l[c], !blank(r.exampleEn))) {
                set[c] = l[c];
                repaired.set(c, repaired.get(c) + 1);
            } else {
                keptDifferent.set(c, keptDifferent.get(c) + 1);
            }
        }
        if (Object.keys(set).length === 0) continue;

        if (l.reviewState === "flagged") {
            const merged = [...new Set([...flagsOf(r.reviewFlags), ...flagsOf(l.reviewFlags)])];
            set.reviewState = "flagged";
            set.reviewFlags = JSON.stringify(merged);
            flaggedForReview++;
        }

        const cols = Object.keys(set);
        updates.push(`UPDATE VocabWord SET ${cols.map((c) => `${c}=${sql(set[c])}`).join(", ")} WHERE id=${sql(id)};`);
        rollback.push(`UPDATE VocabWord SET ${cols.map((c) => `${c}=${sql(r[c])}`).join(", ")} WHERE id=${sql(id)};`);
    }

    return { updates, rollback, approvedOnRemote, flaggedForReview, filled, keptDifferent, repaired };
};

const main = () => {
    const select = `SELECT id, ${COLUMNS.join(", ")} FROM VocabWord`;
    const local = new Map(d1("local", select).map((row) => [row.id, row]));

    const remoteColumns = d1("remote", `SELECT name FROM pragma_table_info('VocabWord')`).map((c) => c.name);
    const missing = COLUMNS.filter((c) => !remoteColumns.includes(c));
    if (missing.length) {
        throw new Error(
            `production VocabWord has no ${missing.join(", ")} — run \`wrangler d1 migrations apply vocab --remote\` first`,
        );
    }
    const remote = new Map(d1("remote", select).map((row) => [row.id, row]));
    console.log(`local ${local.size} words, production ${remote.size} words`);

    const { updates, rollback, approvedOnRemote, flaggedForReview, filled, keptDifferent, repaired } = planSync(local, remote);

    // Belt and braces: this script only ever emits single-row UPDATEs of VocabWord.
    for (const statement of updates) {
        if (!/^UPDATE VocabWord SET .+ WHERE id='[^']*';$/s.test(statement)) {
            throw new Error(`refusing to run an unexpected statement: ${statement.slice(0, 80)}`);
        }
    }

    const onlyLocal = [...local.keys()].filter((id) => !remote.has(id));
    const onlyRemote = [...remote.keys()].filter((id) => !local.has(id));

    console.log(`\nrows to update: ${updates.length}`);
    console.log("  empty fields filled, per column:");
    for (const [c, n] of filled) if (n) console.log(`    ${c.padEnd(20)} ${n}`);
    if (REPAIR_THAI) {
        console.log("  existing Thai replaced (--repair-thai), per column:");
        for (const [c, n] of repaired) console.log(`    ${c.padEnd(20)} ${n}`);
    }
    console.log(`  rows also flagged for review (AI was unsure): ${flaggedForReview}`);
    console.log("not changed — production already has a value that differs from local:");
    for (const [c, n] of keptDifferent) if (n) console.log(`    ${c.padEnd(20)} ${n}`);
    console.log(`approved on production (skipped): ${approvedOnRemote.length}${approvedOnRemote.length ? `  e.g. ${approvedOnRemote.slice(0, 5).join(", ")}` : ""}`);
    console.log(`only in local (not copied):      ${onlyLocal.length}${onlyLocal.length ? `  e.g. ${onlyLocal.slice(0, 5).join(", ")}` : ""}`);
    console.log(`only in production (untouched):  ${onlyRemote.length}${onlyRemote.length ? `  e.g. ${onlyRemote.slice(0, 5).join(", ")}` : ""}`);

    mkdirSync(OUT_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const files = [];
    for (let i = 0; i < updates.length; i += CHUNK) {
        const file = join(OUT_DIR, `sync-${stamp}-${String(i / CHUNK).padStart(2, "0")}.sql`);
        writeFileSync(file, updates.slice(i, i + CHUNK).join("\n"));
        files.push(file);
    }
    const rollbackPath = join(OUT_DIR, `rollback-${stamp}.sql`);
    writeFileSync(rollbackPath, rollback.join("\n"));
    console.log(`\n${files.length} SQL file(s) in ${OUT_DIR}\nrollback: ${rollbackPath}`);

    if (!WRITE) return console.log("\nno --write: nothing executed");
    for (const file of files) {
        console.log(`executing ${file}`);
        execFileSync("pnpm", ["exec", "wrangler", "d1", "execute", "vocab", "--remote", "--file", file], {
            cwd: ROOT,
            stdio: "inherit",
        });
    }
    console.log("done");
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
