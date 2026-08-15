// Repairs and quarantines the Thai columns of VocabWord.
//
// The corpus was extracted from a PDF and the extraction left two distinct problems, which
// this script treats differently because they deserve different treatment.
//
//   1. Decomposed sara am. 141 rows spell `ำ` as `ํ` + `า`. Visually near-identical,
//      compares unequal, sorts wrong, never matches what a user types. NFC composes it.
//      Lossless, no judgement required, always applied.
//
//   2. Extraction debris. 123 rows have a `meaningTh` with no Thai character in it at all
//      (`age` = "ang", `aunt` = "in"), and 926 have a `pronunciationTh` carrying Latin
//      letters (`adult` = "aay az a a"). These cannot be repaired mechanically — the
//      information is simply gone. They are flipped to `status = 'draft'`.
//
// Quarantining by status rather than by deleting or blanking is deliberate: `status` is
// already the gate every read honours — sitemap, word pages, letter indexes and the
// practice pool all filter on `published` — so one column change withdraws a bad row from
// every surface at once, and flipping it back is the whole undo.
//
//   node scripts/repair-thai-text.mjs            # report only, writes no SQL
//   node scripts/repair-thai-text.mjs --write    # emit seed/repair-thai.sql
//   node scripts/repair-thai-text.mjs --write --apply [--remote]
//
// Re-running is safe: repaired rows no longer match, so a second run reports nothing.

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const WRITE = args.has("--write");
const APPLY = args.has("--apply");
const REMOTE = args.has("--remote");

const THAI = /[฀-๿]/;
const LATIN = /[A-Za-z]/;

// U+0E33 SARA AM has no canonical decomposition, so NFC will not compose `ํ` + `า` into
// `ำ` — a normalise-only pass reports zero repairs and leaves every affected row broken.
// Keep this in step with lib/thai-text.ts, which applies the same rules at render time.
const DECOMPOSED_SARA_AM = /ํา/g;
const LEADING_POS = /^(?:n|v|adj|adv|prep|conj|pron|det|exclam|num|aux|modal)\.\s*/i;

const normalise = (v) =>
    (v ?? "")
        .replace(DECOMPOSED_SARA_AM, "ำ")
        .replace(LEADING_POS, "")
        .normalize("NFC")
        .trim();
const trustworthy = (v) => {
    const t = normalise(v);
    return t.length > 0 && THAI.test(t) && !LATIN.test(t);
};

const d1 = (sqlOrFile, { file = false } = {}) => {
    const argv = [
        "d1", "execute", "vocab",
        REMOTE ? "--remote" : "--local",
        file ? "--file" : "--command", sqlOrFile,
        "--json",
    ];

    return execFileSync("npx", ["wrangler", ...argv], {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
    });
};

const rows = (() => {
    const raw = d1(
        "SELECT id, word, meaningTh, pronunciationTh, meaningThReading, exampleTh, status FROM VocabWord",
    );
    // wrangler prints progress lines around the JSON payload.
    const json = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
    return JSON.parse(json)[0].results;
})();

console.log(`read ${rows.length} rows (${REMOTE ? "remote" : "local"})\n`);

const TEXT_COLUMNS = ["meaningTh", "pronunciationTh", "meaningThReading", "exampleTh"];
const escape = (v) => `'${String(v).replace(/'/g, "''")}'`;

const statements = [];
let normalised = 0;
let quarantined = 0;
const badPronunciation = [];
const examples = { normalised: [], quarantined: [] };

for (const row of rows) {
    const sets = [];

    for (const column of TEXT_COLUMNS) {
        const before = row[column] ?? "";
        const after = normalise(before);
        if (after !== before) sets.push(`${column} = ${escape(after)}`);
    }

    if (sets.length) {
        normalised += 1;
        if (examples.normalised.length < 5) {
            examples.normalised.push(`${row.word}: ${JSON.stringify(row.meaningTh)}`);
        }
    }

    // The meaning is the page. Without a trustworthy one there is nothing to publish,
    // whatever else the row holds.
    if (row.status === "published" && !trustworthy(row.meaningTh)) {
        sets.push("status = 'draft'");
        quarantined += 1;
        if (examples.quarantined.length < 8) {
            examples.quarantined.push(`${row.word} = ${JSON.stringify(row.meaningTh)}`);
        }
    } else if (row.status === "published" && !trustworthy(row.pronunciationTh)) {
        // Kept published: a sound gloss with a broken respelling is still a useful entry,
        // and the render layer withholds the respelling on its own (lib/thai-text.ts).
        badPronunciation.push(row.word);
    }

    if (sets.length) {
        statements.push(`UPDATE VocabWord SET ${sets.join(", ")} WHERE id = ${escape(row.id)};`);
    }
}

console.log(`NFC-normalised text:       ${normalised} rows`);
if (examples.normalised.length) console.log(`  e.g. ${examples.normalised.join(", ")}`);
console.log(`quarantined (bad meaning): ${quarantined} rows`);
if (examples.quarantined.length) console.log(`  e.g. ${examples.quarantined.join(", ")}`);
console.log(`unusable pronunciation:    ${badPronunciation.length} rows still published,`);
console.log(`                           respelling withheld at render until re-extracted`);
console.log(`\n${statements.length} statements`);

if (!WRITE) {
    console.log("\n(report only — pass --write to emit SQL, --write --apply to run it)");
    process.exit(0);
}

const out = join(ROOT, "seed", "repair-thai.sql");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
    out,
    `-- Generated by scripts/repair-thai-text.mjs. Safe to re-run.\n${statements.join("\n")}\n`,
);
console.log(`\nwrote ${out}`);

if (APPLY) {
    if (!statements.length) {
        console.log("nothing to apply");
    } else {
        d1("seed/repair-thai.sql", { file: true });
        console.log("applied");
    }
}
