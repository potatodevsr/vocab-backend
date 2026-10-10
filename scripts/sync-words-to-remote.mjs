// Copies curated word content from local D1 to production D1.
//
// The curation loop runs locally (AI extraction and generation, then review in /admin), so
// production needs the result without the rest of the local database: users, progress and
// XP on production are real and are never touched. Only the content columns of existing
// VocabWord rows are compared, and only rows that differ are updated, keyed by `id`.
//
// Rows that exist on one side only are reported, not created or deleted — the word list
// itself comes from the seed, and a missing id means the two databases were seeded from
// different data, which is a question for a human.
//
//   node scripts/sync-words-to-remote.mjs            # dry run: counts per column, SQL on disk
//   node scripts/sync-words-to-remote.mjs --write    # execute against production
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
const CHUNK = 400;

const COLUMNS = [
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
    "notes",
    "reviewState",
    "reviewFlags",
    "reviewedAt",
];

const d1 = (where, sql) => {
    const out = execFileSync(
        "pnpm",
        ["exec", "wrangler", "d1", "execute", "vocab", `--${where}`, "--json", "--command", sql],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 },
    );
    return JSON.parse(out.slice(out.indexOf("[")))[0]?.results ?? [];
};

const sql = (value) => (value == null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

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

    const updates = [];
    const rollback = [];
    const perColumn = new Map(COLUMNS.map((c) => [c, 0]));
    for (const [id, l] of local) {
        const r = remote.get(id);
        if (!r) continue;
        const changed = COLUMNS.filter((c) => (l[c] ?? null) !== (r[c] ?? null));
        if (!changed.length) continue;
        for (const c of changed) perColumn.set(c, perColumn.get(c) + 1);
        updates.push(`UPDATE VocabWord SET ${changed.map((c) => `${c}=${sql(l[c])}`).join(", ")} WHERE id=${sql(id)};`);
        rollback.push(`UPDATE VocabWord SET ${changed.map((c) => `${c}=${sql(r[c])}`).join(", ")} WHERE id=${sql(id)};`);
    }

    const onlyLocal = [...local.keys()].filter((id) => !remote.has(id));
    const onlyRemote = [...remote.keys()].filter((id) => !local.has(id));

    console.log(`\nrows to update: ${updates.length}`);
    for (const [c, n] of perColumn) if (n) console.log(`  ${c.padEnd(20)} ${n}`);
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

main();
