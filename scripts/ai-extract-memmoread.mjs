// Re-reads the memmoread Oxford 3000 PDF with a vision model, in repeated passes, and
// writes the result into VocabWord's Thai columns.
//
// Why a vision model: the PDF has no text layer, and Tesseract loses Thai vowels and tone
// marks — 123 meanings came out with no Thai at all (`age` = "ang") and 926 pronunciations
// came out as Latin debris (`adult` = "aay az a a"). This is a reading task, not a
// translation task: the model copies what is printed, so no training is needed.
//
// Why several passes: one read can still drop a vowel and produce a plausible word
// (`ความสามารถึง`). Pass 1 transcribes; every later pass looks at the same image again
// together with the previous answer and confirms or corrects it. Passes 3+ only re-read
// strips where the last two passes still disagree. A row that keeps changing is not
// trusted — it is flagged `ai-unstable` for a human in /admin/review.
//
// Nothing here approves a row (AGENTS.md rule 12). Agreement only orders the review queue.
//
// Each request is one horizontal strip of one page, answered by `codex exec` and saved to
// data/ai-extract/pass-N/page-PP-sS.json. A strip with a saved answer is never requested
// again, so an interrupted run is restarted, not repaired.
//
//   node scripts/ai-extract-memmoread.mjs crop
//   node scripts/ai-extract-memmoread.mjs pass 1 --effort low
//   node scripts/ai-extract-memmoread.mjs pass 2 --effort medium
//   node scripts/ai-extract-memmoread.mjs pass 3 --effort medium
//   node scripts/ai-extract-memmoread.mjs pass 4 --effort medium
//   node scripts/ai-extract-memmoread.mjs eval                   # score passes on golden.json
//   node scripts/ai-extract-memmoread.mjs report                 # stability, no writes
//   node scripts/ai-extract-memmoread.mjs apply [--write] [--remote]
//
// Options: --pages 2-5 (subset), --concurrency 4, --model gpt-5.6-sol

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PDF_PATH = join(ROOT, "data/memmoread-oxford-3000.pdf");
const OUT_DIR = join(ROOT, "data/ai-extract");
const STRIP_DIR = join(OUT_DIR, "strips");
// codex runs with an empty working root so the model has nothing to read or edit.
const CODEX_CWD = join(OUT_DIR, "codex-cwd");
const SCHEMA_PATH = join(OUT_DIR, "schema.json");

// Section divider pages (a full-page "A2" etc.) carry no table. Everything between two
// dividers belongs to the level the first one names.
const LEVEL_PAGES = [
    { level: "A1", from: 2, to: 18 },
    { level: "A2", from: 20, to: 36 },
    { level: "B1", from: 38, to: 54 },
    { level: "B2", from: 56, to: 69 },
];

// Page geometry at 300 dpi (2483 × 3512). The table body runs from just under the header
// to the bottom rule. Strips overlap by more than one row height (~66px), so every row is
// whole in at least one strip; the prompt tells the model to skip rows cut by an edge.
const DPI = 300;
const PAGE_WIDTH = 2483;
const TABLE_TOP = 135;
const TABLE_BOTTOM = 3440;
const STRIPS_PER_PAGE = 4;
const OVERLAP = 80;

const argv = process.argv.slice(2);
const command = argv[0];
const option = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? fallback : argv[index + 1];
};
const flag = (name) => argv.includes(`--${name}`);

const MODEL = option("model", "gpt-5.6-sol");
const CONCURRENCY = Number(option("concurrency", "4"));

const parsePages = () => {
    const all = LEVEL_PAGES.flatMap(({ from, to }) =>
        Array.from({ length: to - from + 1 }, (_, i) => from + i),
    );
    const range = option("pages", null);
    if (!range) return all;
    const [a, b = a] = range.split("-").map(Number);
    return all.filter((page) => page >= a && page <= b);
};

const levelOf = (page) => LEVEL_PAGES.find(({ from, to }) => page >= from && page <= to)?.level;

const pad = (n) => String(n).padStart(2, "0");
const stripName = (page, strip) => `page-${pad(page)}-s${strip}`;
const passDir = (pass) => join(OUT_DIR, `pass-${pass}`);
const resultPath = (pass, page, strip) => join(passDir(pass), `${stripName(page, strip)}.json`);
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["rows"],
    properties: {
        rows: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["vocab", "pos", "meaningTh", "pronunciationTh", "ipa"],
                properties: {
                    vocab: { type: "string" },
                    pos: { type: "string" },
                    meaningTh: { type: ["string", "null"] },
                    pronunciationTh: { type: ["string", "null"] },
                    ipa: { type: ["string", "null"] },
                },
            },
        },
    },
};

const TABLE_DESCRIPTION = `The attached image is a horizontal strip of a table from an English-Thai vocabulary book.
Columns, left to right: Vocab (English headword), Part of Speech, Meaning (Thai meaning),
คำอ่าน (how the English word sounds, written in Thai script), IPA.`;

// Conventions of this particular book. Without them the model misreads the same glyph the
// same way on every pass — `แอ๊ ถึ` came back as `ถ์` from pass 1 and was "corrected" to
// `ถี่` by pass 2, so rechecking alone cannot fix it. Verified against the page images.
const CONVENTIONS = `Conventions of this book (use them to read ambiguous glyphs, never to invent text):
- In คำอ่าน, an English final consonant sound is written as a consonant with sara ue ( ึ ),
  as its own syllable: about = เออะ บ๊าว ถึ, ask = แอ๊ สึ ขึ, back = แบ ขึ, bath = แบ ตึ.
  It is not ถี่, ถ์, ขี or ขี้ — check for a short open circle above the consonant.
- A final r or l sound is a bare consonant syllable: actor = แอ๊ ขึ เถ่อ ร, cool = คู ล.
- IPA uses ɪ ʊ ʌ ə ɜː ɔː ɑː æ e iː uː ŋ θ ð ʃ ʒ tʃ dʒ, ˈ for primary stress and ˌ for
  secondary stress, written before the stressed syllable. Never a Latin capital I for ɪ.`;

const RULES = `${CONVENTIONS}

Rules:
- Only rows that are fully visible. Skip the header row and any row cut off at the top or bottom edge.
- Copy characters exactly as printed. Every Thai vowel and tone mark matters: a missing or
  wrong mark makes a different word.
- Keep the spaces between syllables in คำอ่าน and between symbols in IPA, as printed.
- Use null for a cell you cannot read with confidence. Never guess, never fill from memory.
- Do not run any commands.`;

const firstPrompt = () => `${TABLE_DESCRIPTION}

Transcribe every row, top to bottom.

${RULES}`;

const recheckPrompt = (previous) => `${TABLE_DESCRIPTION}

Another reader transcribed this strip as the JSON below. It may contain mistakes: a missing
or wrong Thai vowel or tone mark, a merged or split syllable, a skipped row, a row taken
from outside the strip, or a wrong IPA symbol. Look at the image again, character by
character, and return the corrected transcription of every row. Where the previous value is
right, return it unchanged.

Previous transcription:
${JSON.stringify(previous, null, 1)}

${RULES}`;

// ---------------------------------------------------------------------------------------
// Normalisation and comparison

// The DB stores Thai without the PDF's per-syllable spacing (`เออะบ้าวถึ`), NFC-composed
// so a decomposed sara am (`ํ` + `า`) compares equal to `ำ`.
const thai = (value) => (value == null ? null : value.normalize("NFC").replace(/\s+/g, ""));
// IPA keeps its spacing out of the DB too; models write the stress mark as an apostrophe.
const ipa = (value) =>
    value == null
        ? null
        : value.normalize("NFC").replace(/['’]/g, "ˈ").replace(/\s+/g, "").trim();
// The book numbers homographs (`close2`, `lead¹`); the DB tells them apart by POS instead.
const vocabKey = (value) =>
    value.trim().toLowerCase().replace(/[’]/g, "'").replace(/[0-9¹²³]+$/, "").replace(/\s+/g, " ");
const posKey = (value) =>
    value
        .toLowerCase()
        .replace(/ɑ/g, "a")
        .split(/[\s,/]+/)
        .filter(Boolean)
        .sort()
        .join(",");

const normaliseRow = (row) => ({
    vocab: row.vocab.trim(),
    pos: row.pos.replace(/ɑ/g, "a").replace(/\s+/g, " ").trim(),
    meaningTh: thai(row.meaningTh),
    pronunciationTh: thai(row.pronunciationTh),
    ipa: ipa(row.ipa),
});

const rowKey = (row) => `${vocabKey(row.vocab)}|${posKey(row.pos)}`;
const sameRow = (a, b) =>
    a.meaningTh === b.meaningTh && a.pronunciationTh === b.pronunciationTh && a.ipa === b.ipa;

// ---------------------------------------------------------------------------------------
// crop

const crop = (pages) => {
    mkdirSync(STRIP_DIR, { recursive: true });
    const height = (TABLE_BOTTOM - TABLE_TOP) / STRIPS_PER_PAGE;

    for (const page of pages) {
        for (let strip = 0; strip < STRIPS_PER_PAGE; strip++) {
            const out = join(STRIP_DIR, stripName(page, strip));
            if (existsSync(`${out}.png`)) continue;

            const y = Math.max(0, Math.round(TABLE_TOP + strip * height - OVERLAP));
            const h = Math.round(height + OVERLAP * 2);
            execFileSync("pdftoppm", [
                "-r", String(DPI), "-f", String(page), "-l", String(page),
                "-x", "0", "-y", String(y), "-W", String(PAGE_WIDTH), "-H", String(h),
                "-png", "-singlefile", PDF_PATH, out,
            ]);
        }
        console.log(`cropped page ${page}`);
    }
};

// ---------------------------------------------------------------------------------------
// pass

// stdin must be closed: `codex exec` reads a piped stdin to EOF and appends it to the
// prompt, so an open pipe (execFile's default) waits forever.
const runCodex = (args) =>
    new Promise((resolvePromise, reject) => {
        const child = spawn("codex", args, { stdio: ["ignore", "ignore", "pipe"] });
        let stderr = "";
        child.stderr.on("data", (chunk) => {
            stderr = (stderr + chunk).slice(-4000);
        });
        const timer = setTimeout(() => child.kill("SIGTERM"), 10 * 60 * 1000);
        child.on("error", reject);
        child.on("close", (code, signal) => {
            clearTimeout(timer);
            if (code === 0) resolvePromise();
            else reject(new Error(`codex exited ${code ?? signal}: ${stderr.trim().split("\n").at(-1) ?? ""}`));
        });
    });

const askCodex = async ({ image, prompt, effort, out }) => {
    const tmp = `${out}.tmp`;
    await runCodex(
        [
            "exec",
            "--ignore-user-config",
            "--ephemeral",
            "--skip-git-repo-check",
            "-s", "read-only",
            "-C", CODEX_CWD,
            "-m", MODEL,
            "-c", `model_reasoning_effort="${effort}"`,
            "-i", image,
            "--output-schema", SCHEMA_PATH,
            "-o", tmp,
            prompt,
        ],
    );
    const parsed = JSON.parse(readFileSync(tmp, "utf8"));
    rmSync(tmp);
    if (!Array.isArray(parsed.rows)) throw new Error("answer has no rows array");
    return parsed;
};

// A strip still needs a re-read when the last two passes disagree on any row, or on which
// rows the strip holds at all.
const stripUnstable = (pass, page, strip) => {
    const a = readJson(resultPath(pass - 1, page, strip)).rows.map(normaliseRow);
    const b = readJson(resultPath(pass - 2, page, strip)).rows.map(normaliseRow);
    if (a.length !== b.length) return true;
    const byKey = new Map(b.map((row) => [rowKey(row), row]));
    return a.some((row) => {
        const other = byKey.get(rowKey(row));
        return !other || !sameRow(row, other) || row.meaningTh == null || row.pronunciationTh == null;
    });
};

const runPass = async (pass, pages, effort) => {
    mkdirSync(passDir(pass), { recursive: true });
    mkdirSync(CODEX_CWD, { recursive: true });
    writeFileSync(SCHEMA_PATH, JSON.stringify(SCHEMA));

    const jobs = [];
    let carried = 0;

    for (const page of pages) {
        for (let strip = 0; strip < STRIPS_PER_PAGE; strip++) {
            const out = resultPath(pass, page, strip);
            if (existsSync(out)) continue;

            const image = join(STRIP_DIR, `${stripName(page, strip)}.png`);
            if (!existsSync(image)) throw new Error(`missing ${image} — run \`crop\` first`);

            if (pass > 1) {
                const previousPath = resultPath(pass - 1, page, strip);
                if (!existsSync(previousPath)) {
                    throw new Error(`pass ${pass - 1} has no answer for ${stripName(page, strip)}`);
                }
                // From pass 3 on, a strip the last two passes agree on is carried forward
                // unread, so every pass directory stays complete for `apply`.
                if (pass >= 3 && !stripUnstable(pass, page, strip)) {
                    const previous = readJson(previousPath);
                    writeFileSync(out, JSON.stringify({ ...previous, carried: true }, null, 1));
                    carried++;
                    continue;
                }
            }
            jobs.push({ page, strip, image, out });
        }
    }

    console.log(
        `pass ${pass} (${MODEL}, effort ${effort}): ${jobs.length} strips to read` +
            (pass >= 3 ? `, ${carried} carried forward` : ""),
    );

    let done = 0;
    let failed = 0;
    const worker = async () => {
        for (let job = jobs.shift(); job; job = jobs.shift()) {
            const name = stripName(job.page, job.strip);
            const prompt =
                pass === 1
                    ? firstPrompt()
                    : recheckPrompt(readJson(resultPath(pass - 1, job.page, job.strip)).rows);
            const started = Date.now();
            try {
                const answer = await askCodex({ image: job.image, prompt, effort, out: job.out });
                writeFileSync(
                    job.out,
                    JSON.stringify(
                        { page: job.page, strip: job.strip, model: MODEL, effort, rows: answer.rows },
                        null,
                        1,
                    ),
                );
                done++;
                console.log(
                    `  ${name}  ${answer.rows.length} rows  ${((Date.now() - started) / 1000).toFixed(0)}s  [${done} done]`,
                );
            } catch (error) {
                failed++;
                console.error(`  ${name}  FAILED: ${String(error.message ?? error).split("\n")[0]}`);
            }
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log(`pass ${pass}: ${done} read, ${failed} failed${failed ? " — re-run the same command" : ""}`);
    if (failed) process.exitCode = 1;
};

// ---------------------------------------------------------------------------------------
// merge — one row per (level, vocab, pos), with its history across passes

const passesOnDisk = () =>
    readdirSync(OUT_DIR)
        .map((name) => Number(name.match(/^pass-(\d+)$/)?.[1]))
        .filter(Boolean)
        .sort((a, b) => a - b);

const mergePass = (pass, pages) => {
    const rows = new Map();
    for (const page of pages) {
        for (let strip = 0; strip < STRIPS_PER_PAGE; strip++) {
            const path = resultPath(pass, page, strip);
            if (!existsSync(path)) throw new Error(`pass ${pass} is incomplete: ${stripName(page, strip)}`);
            for (const raw of readJson(path).rows) {
                const row = { ...normaliseRow(raw), page, level: levelOf(page) };
                const key = `${row.level}|${rowKey(row)}`;
                // The same row can appear in two overlapping strips; keep the fuller read.
                const current = rows.get(key);
                const filled = (r) => [r.meaningTh, r.pronunciationTh, r.ipa].filter(Boolean).length;
                if (!current || filled(row) > filled(current)) rows.set(key, row);
            }
        }
    }
    return rows;
};

const buildHistory = (pages) => {
    const passes = passesOnDisk();
    if (passes.length === 0) throw new Error("no passes on disk");
    const merged = passes.map((pass) => mergePass(pass, pages));
    const last = merged.at(-1);

    return [...last.entries()].map(([key, row]) => {
        const history = merged.map((m) => m.get(key) ?? null);
        const previous = history.at(-2);
        // Stable = the final answer equals the one before it and every field was read.
        const stable =
            passes.length >= 2 &&
            previous != null &&
            sameRow(row, previous) &&
            row.meaningTh != null &&
            row.pronunciationTh != null;
        const agreeing = history.filter((h) => h && sameRow(h, row)).length;
        return { key, ...row, stable, agreeing, passes: passes.length };
    });
};

// ---------------------------------------------------------------------------------------
// apply

const REMOTE = flag("remote");

const d1 = (sql) => {
    const out = execFileSync(
        "pnpm",
        ["exec", "wrangler", "d1", "execute", "vocab", REMOTE ? "--remote" : "--local", "--json", "--command", sql],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );
    return JSON.parse(out.slice(out.indexOf("[")))[0]?.results ?? [];
};

const d1File = (file) =>
    execFileSync(
        "pnpm",
        ["exec", "wrangler", "d1", "execute", "vocab", REMOTE ? "--remote" : "--local", "--file", file],
        { cwd: ROOT, encoding: "utf8", stdio: "inherit", maxBuffer: 64 * 1024 * 1024 },
    );

const sql = (value) => `'${String(value).replace(/'/g, "''")}'`;
const AI_FLAG = "ai-unstable";

const apply = (pages) => {
    const extracted = buildHistory(pages);
    const words = d1(
        `SELECT id, word, level, partOfSpeech, meaningTh, pronunciationTh, ipa, reviewState, reviewFlags
         FROM VocabWord WHERE wordlistId = 'oxford-3000'`,
    );
    console.log(`${extracted.length} rows read from the PDF, ${words.length} words in ${REMOTE ? "remote" : "local"} D1`);

    // Index the PDF by (level, word); a word can sit twice in one level with two POS.
    const byLevelWord = new Map();
    const byWord = new Map();
    for (const row of extracted) {
        const lw = `${row.level}|${vocabKey(row.vocab)}`;
        byLevelWord.set(lw, [...(byLevelWord.get(lw) ?? []), row]);
        byWord.set(vocabKey(row.vocab), [...(byWord.get(vocabKey(row.vocab)) ?? []), row]);
    }

    const updates = [];
    const rollback = [];
    const unmatched = [];
    const used = new Set();
    let unchanged = 0;
    let unstable = 0;

    for (const word of words) {
        if (word.reviewState === "approved") continue;

        const candidates = byLevelWord.get(`${word.level}|${vocabKey(word.word)}`) ?? [];
        let match =
            candidates.find((row) => posKey(row.pos) === posKey(word.partOfSpeech)) ??
            (candidates.length === 1 ? candidates[0] : null);
        // Same word, other level: the pronunciation and IPA are the word's, not the
        // sense's, so they carry over; the meaning may not, so it is left alone.
        const soundOnly = !match;
        if (!match) match = (byWord.get(vocabKey(word.word)) ?? []).find((row) => row.stable) ?? null;
        if (!match) {
            unmatched.push(`${word.level} ${word.word} (${word.partOfSpeech})`);
            continue;
        }
        used.add(match.key);

        const next = {
            meaningTh: soundOnly ? word.meaningTh : match.meaningTh ?? word.meaningTh,
            pronunciationTh: match.pronunciationTh ?? word.pronunciationTh,
            ipa: match.ipa ?? word.ipa,
        };

        const flags = JSON.parse(word.reviewFlags || "[]").filter((f) => f !== AI_FLAG);
        if (!match.stable) {
            flags.push(AI_FLAG);
            unstable++;
        }
        const reviewState = flags.length > 0 ? "flagged" : word.reviewState === "flagged" ? "unreviewed" : word.reviewState;

        const same =
            next.meaningTh === word.meaningTh &&
            next.pronunciationTh === word.pronunciationTh &&
            next.ipa === word.ipa &&
            JSON.stringify(flags) === (word.reviewFlags || "[]") &&
            reviewState === word.reviewState;
        if (same) {
            unchanged++;
            continue;
        }

        updates.push(
            `UPDATE VocabWord SET meaningTh=${sql(next.meaningTh)}, pronunciationTh=${sql(next.pronunciationTh)}, ` +
                `ipa=${sql(next.ipa)}, reviewState=${sql(reviewState)}, reviewFlags=${sql(JSON.stringify(flags))} ` +
                `WHERE id=${sql(word.id)};`,
        );
        rollback.push(
            `UPDATE VocabWord SET meaningTh=${sql(word.meaningTh)}, pronunciationTh=${sql(word.pronunciationTh)}, ` +
                `ipa=${sql(word.ipa)}, reviewState=${sql(word.reviewState)}, reviewFlags=${sql(word.reviewFlags)} ` +
                `WHERE id=${sql(word.id)};`,
        );
    }

    const unused = extracted.filter((row) => !used.has(row.key)).map((row) => `${row.level} p${row.page} ${row.vocab} (${row.pos})`);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = REMOTE ? "remote" : "local";
    const updatePath = join(OUT_DIR, `apply-${target}-${stamp}.sql`);
    const rollbackPath = join(OUT_DIR, `rollback-${target}-${stamp}.sql`);
    writeFileSync(updatePath, updates.join("\n"));
    writeFileSync(rollbackPath, rollback.join("\n"));
    writeFileSync(
        join(OUT_DIR, `apply-${target}-${stamp}.json`),
        JSON.stringify({ updates: updates.length, unchanged, unstable, unmatched, unusedPdfRows: unused }, null, 2),
    );

    console.log(`updates:            ${updates.length}`);
    console.log(`unchanged:          ${unchanged}`);
    console.log(`flagged ${AI_FLAG}:  ${unstable}`);
    console.log(`DB words not in PDF: ${unmatched.length}`);
    console.log(`PDF rows not in DB:  ${unused.length}`);
    console.log(`SQL:      ${updatePath}`);
    console.log(`rollback: ${rollbackPath}`);

    if (!flag("write")) {
        console.log("\nno --write: nothing executed");
        return;
    }
    if (updates.length === 0) return;
    console.log(`\nexecuting ${updates.length} updates against ${target} D1…`);
    d1File(updatePath);
};

// ---------------------------------------------------------------------------------------

const report = (pages) => {
    const rows = buildHistory(pages);
    const stable = rows.filter((r) => r.stable).length;
    console.log(`passes on disk: ${passesOnDisk().join(", ")}`);
    console.log(`rows: ${rows.length}, stable: ${stable}, unstable: ${rows.length - stable}`);
    for (const level of LEVEL_PAGES.map((l) => l.level)) {
        const inLevel = rows.filter((r) => r.level === level);
        console.log(`  ${level}: ${inLevel.length} rows, ${inLevel.filter((r) => !r.stable).length} unstable`);
    }
    const missing = rows.filter((r) => r.meaningTh == null || r.pronunciationTh == null);
    if (missing.length) console.log(`unreadable cells in ${missing.length} rows: ${missing.slice(0, 20).map((r) => r.vocab).join(", ")}`);
};

// Scores every pass against data/ai-extract/golden.json — hand-checked rows. Grow that file
// before trusting a new prompt or effort level on the whole book.
const evaluate = (pages) => {
    const golden = readJson(join(OUT_DIR, "golden.json")).rows.filter((g) => pages.includes(g.page));
    const fields = [
        ["meaningTh", thai],
        ["pronunciationTh", thai],
        ["ipa", ipa],
    ];
    for (const pass of passesOnDisk()) {
        const rows = [...mergePass(pass, [...new Set(golden.map((g) => g.page))]).values()];
        const scores = fields.map(([field, norm]) => {
            const checked = golden.filter((g) => g[field] != null);
            const wrong = checked.filter((g) => {
                const row = rows.find((r) => r.page === g.page && vocabKey(r.vocab) === vocabKey(g.vocab));
                return !row || row[field] !== norm(g[field]);
            });
            return { field, right: checked.length - wrong.length, of: checked.length, wrong: wrong.map((g) => g.vocab) };
        });
        console.log(
            `pass ${pass}: ` +
                scores.map((s) => `${s.field} ${s.right}/${s.of}${s.wrong.length ? ` (wrong: ${s.wrong.join(", ")})` : ""}`).join("  "),
        );
    }
};

const main = async () => {
    const pages = parsePages();
    if (command === "eval") return evaluate(pages);
    if (command === "crop") return crop(pages);
    if (command === "pass") {
        const pass = Number(argv[1]);
        if (!Number.isInteger(pass) || pass < 1) throw new Error("usage: pass <n> --effort low|medium");
        return runPass(pass, pages, option("effort", pass === 1 ? "low" : "medium"));
    }
    if (command === "report") return report(pages);
    if (command === "apply") return apply(pages);
    console.error("usage: crop | pass <n> [--effort low|medium] | report | apply [--write] [--remote]");
    process.exitCode = 1;
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
