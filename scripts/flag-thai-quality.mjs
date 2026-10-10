/**
 * Score every VocabWord's Thai content and write the suspicious ones into the review
 * queue (`reviewState = 'flagged'`, `reviewFlags = [...]`).
 *
 * Why heuristics rather than a proofread: the corpus is 3,295 rows imported from an OCR'd
 * PDF, and OCR damage is not random — it clusters into a handful of shapes that a rule can
 * name (a tone mark stranded after a space, a Latin `l` inside a Thai word, one meaning
 * pasted across forty entries). Naming them turns "somebody should read 3,295 rows" into
 * "somebody should read the 300 rows a rule already doubts", which is a job that finishes.
 *
 * What this script deliberately does NOT do is approve anything. A row with no flags stays
 * `unreviewed` — a clean-looking meaning can still be the wrong meaning, and only a human
 * moves a row to `approved`. The consequence for indexing is spelled out in
 * `web:lib/seo.ts`: flagged rows are `noindex` until reviewed, clean rows keep the
 * indexing they already had, so running this script removes pages from the index rather
 * than adding any.
 *
 * Usage:
 *   node scripts/flag-thai-quality.mjs                # local D1, writes flags
 *   node scripts/flag-thai-quality.mjs --dry          # report only, no writes
 *   node scripts/flag-thai-quality.mjs --remote       # production D1
 *   node scripts/flag-thai-quality.mjs --report out.csv
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = new Set(process.argv.slice(2));
const REMOTE = args.has("--remote");
const DRY = args.has("--dry");
const reportFlag = process.argv.indexOf("--report");
const REPORT_PATH = reportFlag === -1 ? null : process.argv[reportFlag + 1];

const THAI = /[฀-๿]/;
/** Tone marks and above/below vowels — these may never begin a word or follow a space. */
const COMBINING = /[ัิ-ฺ็-๎]/;
/** The four vowels written *before* the consonant they are pronounced after. */
const LEADING_VOWEL = /[เ-ไ]/;

const d1 = (sql) => {
    const out = execFileSync(
        "pnpm",
        [
            "exec",
            "wrangler",
            "d1",
            "execute",
            "vocab",
            REMOTE ? "--remote" : "--local",
            "--json",
            "--command",
            sql,
        ],
        { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );

    // wrangler prints its banner before the JSON body on some versions.
    const start = out.indexOf("[");
    const parsed = JSON.parse(out.slice(start));
    return parsed[0]?.results ?? [];
};

const d1File = (sql) => {
    const dir = mkdtempSync(join(tmpdir(), "flag-thai-"));
    const file = join(dir, "flags.sql");
    writeFileSync(file, sql);
    execFileSync(
        "pnpm",
        [
            "exec",
            "wrangler",
            "d1",
            "execute",
            "vocab",
            REMOTE ? "--remote" : "--local",
            "--file",
            file,
        ],
        { encoding: "utf8", stdio: "inherit", maxBuffer: 64 * 1024 * 1024 },
    );
};

const escape = (value) => `'${String(value).replace(/'/g, "''")}'`;

/**
 * Each rule returns a flag code or null. Order is presentation order in the queue, so the
 * cheapest-to-judge damage comes first.
 */
const RULES = [
    {
        code: "no-thai",
        // A meaning with no Thai character at all is not a meaning. Usually an OCR page
        // header or a stray English gloss that landed in the wrong column.
        test: (row) => row.meaningTh.trim().length > 0 && !THAI.test(row.meaningTh),
    },
    {
        code: "empty-meaning",
        // Published with nothing to teach. The quiz already refuses these; the word page
        // renders a blank card.
        test: (row) => row.status === "published" && row.meaningTh.trim().length === 0,
    },
    {
        code: "latin-in-thai",
        // `l` for `ล`, `o` for `อ`, digits for tone marks — the classic OCR substitutions.
        test: (row) => THAI.test(row.meaningTh) && /[A-Za-z0-9]/.test(row.meaningTh),
    },
    {
        code: "glyph-spacing",
        // `ค ว า ม` — the PDF's per-glyph spacing survived the de-spacing pass. Detected as
        // two or more single-character Thai runs in a row.
        test: (row) => /(?:[฀-๿]\s){2,}[฀-๿]/.test(row.meaningTh),
    },
    {
        code: "orphan-mark",
        // A tone mark or above-vowel with no consonant under it: at the start of the
        // string, or straight after a space. Always damage, never valid Thai.
        test: (row) =>
            COMBINING.test(row.meaningTh.charAt(0)) ||
            /\s[ัิ-ฺ็-๎]/.test(row.meaningTh),
    },
    {
        code: "double-mark",
        // Two tone marks stacked on one consonant. Thai never writes this.
        test: (row) => /[่-๋]{2,}/.test(row.meaningTh),
    },
    {
        code: "dangling-vowel",
        // A leading vowel (เ แ โ ใ ไ) with nothing after it — the consonant it belongs to
        // was dropped in the scan.
        test: (row) => LEADING_VOWEL.test(row.meaningTh.trim().slice(-1)),
    },
    {
        code: "length-outlier",
        // A one-character meaning is almost always a fragment; a very long one is usually
        // two entries that ran together across a column break.
        test: (row) => {
            const length = row.meaningTh.trim().length;
            return length > 0 && (length === 1 || length > 90);
        },
    },
    {
        code: "missing-pronunciation",
        // Published without the Thai reading of the English word. The lesson card has
        // nothing to show under the headword.
        test: (row) =>
            row.status === "published" && row.pronunciationTh.trim().length === 0,
    },
];

/**
 * Cross-row rule: one meaning shared by many unrelated headwords. A handful of true
 * synonyms exist (`start`/`begin`), so the threshold is deliberately above that — at five
 * or more it is a copy error, not a coincidence.
 */
const DUPE_THRESHOLD = 5;

const main = () => {
    const rows = d1(
        `SELECT id, displayWord, level, unit, status, reviewState, reviewFlags, meaningTh, pronunciationTh
         FROM VocabWord ORDER BY sourceOrder`,
    );

    console.log(`read ${rows.length} rows from ${REMOTE ? "remote" : "local"} D1`);

    const byMeaning = new Map();
    for (const row of rows) {
        const key = (row.meaningTh ?? "").trim();
        if (!key) continue;
        byMeaning.set(key, (byMeaning.get(key) ?? 0) + 1);
    }

    const flagged = [];
    const counts = new Map();

    for (const row of rows) {
        const normalized = {
            ...row,
            meaningTh: row.meaningTh ?? "",
            pronunciationTh: row.pronunciationTh ?? "",
        };

        const flags = RULES.filter((rule) => rule.test(normalized)).map((rule) => rule.code);

        const meaning = normalized.meaningTh.trim();
        if (meaning && (byMeaning.get(meaning) ?? 0) >= DUPE_THRESHOLD) {
            flags.push("meaning-dupe");
        }

        // `ai-*` flags come from scripts/ai-extract-memmoread.mjs, which compared several
        // reads of the source page. No rule here can re-derive them from the text, so they
        // are carried over rather than cleared on every run.
        let previous = [];
        try {
            previous = JSON.parse(row.reviewFlags || "[]");
        } catch {}
        flags.push(...previous.filter((code) => code.startsWith("ai-")));

        for (const flag of flags) counts.set(flag, (counts.get(flag) ?? 0) + 1);
        if (flags.length > 0) flagged.push({ row: normalized, flags });
    }

    console.log(`\nflagged ${flagged.length} of ${rows.length} rows`);
    for (const [code, count] of [...counts].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${code.padEnd(22)} ${count}`);
    }

    if (REPORT_PATH) {
        const csv = [
            "id,word,level,unit,status,flags,meaningTh",
            ...flagged.map(({ row, flags }) =>
                [
                    row.id,
                    row.displayWord,
                    row.level,
                    row.unit ?? "",
                    row.status,
                    flags.join(" "),
                    JSON.stringify(row.meaningTh),
                ].join(","),
            ),
        ].join("\n");
        writeFileSync(REPORT_PATH, csv);
        console.log(`\nreport written to ${REPORT_PATH}`);
    }

    if (DRY) {
        console.log("\n--dry: nothing written");
        return;
    }

    // A row a human already approved is never re-flagged by a heuristic: the human read
    // the actual Thai, the rule only read its shape. Re-flagging would undo review work
    // every time this script runs.
    const flaggedIds = new Set(flagged.map(({ row }) => row.id));
    const statements = [];

    for (const { row, flags } of flagged) {
        if (row.reviewState === "approved") continue;
        statements.push(
            `UPDATE VocabWord SET reviewState='flagged', reviewFlags=${escape(
                JSON.stringify(flags),
            )} WHERE id=${escape(row.id)};`,
        );
    }

    // Rows that used to be flagged and are clean now (a curator fixed the text) fall back
    // to `unreviewed`, not to `approved` — clean shape is not the same as correct meaning.
    for (const row of rows) {
        if (row.reviewState === "flagged" && !flaggedIds.has(row.id)) {
            statements.push(
                `UPDATE VocabWord SET reviewState='unreviewed', reviewFlags='[]' WHERE id=${escape(row.id)};`,
            );
        }
    }

    if (statements.length === 0) {
        console.log("\nno changes");
        return;
    }

    console.log(`\nwriting ${statements.length} updates…`);
    d1File(statements.join("\n"));
    console.log("done");
};

main();
