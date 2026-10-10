// Writes the AI-made half of every word, in repeated passes:
//
//   about
//     meaningTh          เกี่ยวกับ                 <- from the memmoread PDF (ai-extract-memmoread.mjs)
//     pronunciationTh    เออะบ๊าวถึ                <- from the memmoread PDF
//     pronunciationRoman uh-BOUT                   <- generated here
//     meaningThReading   เกี่ยว-กับ                 <- generated here
//     meaningThRoman     Kiao-kap                  <- generated here
//     exampleEn          We are talking about work.
//     exampleTh          เรากำลังคุยกันเกี่ยวกับงาน
//     exampleThRoman     rao gam-lang khui gan giao-gap ngaan
//
// Unlike the PDF extraction this is writing, not reading, so it can be wrong in ways that
// look right. Three guards: every later pass re-reads the previous answer and corrects it;
// an item whose answer still changes between the last two passes is flagged
// `ai-unstable`; and `apply` runs mechanical checks (the headword must appear in the
// English sentence, the Thai must be Thai, the romanisations must be Latin) and flags
// `ai-check` on failure. Nothing is approved — a human still reads these in /admin.
//
// Batches of words are sent to `codex exec` and each answer is saved to
// data/ai-generate/pass-N/batch-NNN.json; a saved batch is never requested again, so an
// interrupted run is restarted, not repaired. The word list is snapshotted from local D1
// on the first pass so every pass sees the same input.
//
//   node scripts/ai-generate-word-content.mjs pass 1 --effort low
//   node scripts/ai-generate-word-content.mjs pass 2 --effort medium
//   node scripts/ai-generate-word-content.mjs pass 3 --effort medium      # unstable batches only
//   node scripts/ai-generate-word-content.mjs pass 4 --effort medium
//   node scripts/ai-generate-word-content.mjs report
//   node scripts/ai-generate-word-content.mjs apply [--write] [--remote] [--partial]
//
// Options: --limit N (first N words, for a trial), --batch 25, --concurrency 4,
//          --model gpt-5.6-sol

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { askCodex, pool } from "./lib/codex-exec.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "data/ai-generate");
const INPUT_PATH = join(OUT_DIR, "input.json");
const CODEX_CWD = join(OUT_DIR, "codex-cwd");

const argv = process.argv.slice(2);
const command = argv[0];
const option = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? fallback : argv[index + 1];
};
const flag = (name) => argv.includes(`--${name}`);

const MODEL = option("model", "gpt-5.6-sol");
const CONCURRENCY = Number(option("concurrency", "4"));
const BATCH = Number(option("batch", "25"));
const LIMIT = Number(option("limit", "0")) || 0;
const REMOTE = flag("remote");

const FIELDS = [
    "pronunciationRoman",
    "meaningThReading",
    "meaningThRoman",
    "exampleEn",
    "exampleTh",
    "exampleThRoman",
];

const SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
        items: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["id", ...FIELDS],
                properties: {
                    id: { type: "string" },
                    pronunciationRoman: { type: "string" },
                    meaningThReading: { type: "string" },
                    meaningThRoman: { type: "string" },
                    exampleEn: { type: "string" },
                    exampleTh: { type: "string" },
                    exampleThRoman: { type: "string" },
                },
            },
        },
    },
};

const STYLE = `You write content for a vocabulary app that teaches English to Thai speakers.
For each word, produce six fields:

1. pronunciationRoman — how the English word is said, as a simple English respelling for
   learners. Syllables joined with hyphens, the stressed syllable in CAPITALS, everything
   else lowercase. Follow the IPA given (American English). Examples:
   about = uh-BOUT, water = WAW-ter, computer = kuhm-PYOO-ter, cat = KAT, ice cream = AIS kreem.

2. meaningThReading — how the Thai meaning is read aloud, syllable by syllable, written
   in Thai script with hyphens between syllables, for a foreigner learning Thai. Spell
   each syllable as it sounds (hidden vowels written out, silent letters dropped).
   Examples: วัฒนธรรม = วัด-ทะ-นะ-ทำ, เกี่ยวกับ = เกี่ยว-กับ, สมุด = สะ-หมุด.
   Several meanings separated by commas keep the commas.

3. meaningThRoman — the Thai meaning romanised by the Royal Thai General System (Royal
   Institute): no tone marks, hyphens between syllables of one word, first letter of
   each word capitalised. Examples: วัฒนธรรม = Wat-tha-na-tham, เกี่ยวกับ = Kiao-kap.

4. exampleEn — one short, natural English sentence (5-12 words) a learner at the word's
   CEFR level can read. It must contain the headword in exactly the form given (so the
   word can be blanked out for a fill-in question), used as the given part of speech and
   in the sense of the given Thai meaning. Everyday situations, no names of real people,
   nothing violent or sensitive.

5. exampleTh — a natural Thai translation of exampleEn, the way a Thai speaker would say
   it, not word-for-word. Use the given Thai meaning (or its natural form in context) for
   the headword.

6. exampleThRoman — exampleTh romanised for a reader who cannot read Thai. Hyphens join
   the syllables of one Thai word, spaces separate words, no tone marks, lowercase.
   Consonants: ก g, ข ค ฆ kh, ง ng, จ j, ฉ ช ฌ ch, ซ ศ ษ ส s, ด ฎ d, ต ฏ t, ถ ท ธ th,
   น ณ n, บ b, ป p, ผ พ ภ ph, ฝ ฟ f, ม m, ย ญ y, ร r, ล ฬ l, ว w, ห ฮ h. Final stops
   are k, t, p. Vowels: อะ a, อา aa, อิ i, อี ii, อึ ue, อือ uue, อุ u, อู uu, เอะ e,
   เอ ee, แอ ae, โอ o, เอาะ/ออ o, เออ oe, เอีย ia, เอือ uea, อัว ua, ไอ ใอ ai, เอา ao,
   อำ am, เอียว iao. Example:
   เรากำลังคุยกันเกี่ยวกับงาน = rao gam-lang khui gan giao-gap ngaan.

Return one item per input word, with its id unchanged.`;

const firstPrompt = (words) => `${STYLE}

Words (id, headword, part of speech, CEFR level, Thai meaning, IPA):
${JSON.stringify(words, null, 1)}`;

const recheckPrompt = (words, previous) => `${STYLE}

Another writer produced the answers below. Check every field of every item and return the
corrected set. Look for: a respelling that does not match the IPA or stresses the wrong
syllable; an English sentence that does not contain the headword in exactly the given
form, uses another part of speech or sense, is unnatural, or is above the CEFR level; a
Thai sentence that is unnatural, mistranslates, or misses the Thai meaning; a
romanisation that does not match the Thai sentence syllable for syllable or breaks the
spelling rules.

Change an answer only when it is wrong. Do not rephrase a correct, natural sentence for
style, and do not respell a romanisation that already follows the rules: an answer that
changes for no reason is treated as unreliable. Where an answer is already right, return
it unchanged, character for character.

Words:
${JSON.stringify(words, null, 1)}

Previous answers:
${JSON.stringify(previous, null, 1)}`;

// ---------------------------------------------------------------------------------------

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

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const passDir = (pass) => join(OUT_DIR, `pass-${pass}`);
const batchPath = (pass, index) => join(passDir(pass), `batch-${String(index).padStart(3, "0")}.json`);

const loadInput = () => {
    if (!existsSync(INPUT_PATH)) {
        mkdirSync(OUT_DIR, { recursive: true });
        const rows = d1(
            `SELECT id, displayWord AS word, partOfSpeech AS pos, level, meaningTh, ipa
             FROM VocabWord WHERE wordlistId = 'oxford-3000' ORDER BY sourceOrder`,
        );
        writeFileSync(INPUT_PATH, JSON.stringify(rows, null, 1));
        console.log(`snapshotted ${rows.length} words to ${INPUT_PATH}`);
    }
    const words = readJson(INPUT_PATH);
    return LIMIT ? words.slice(0, LIMIT) : words;
};

const batches = (words) =>
    Array.from({ length: Math.ceil(words.length / BATCH) }, (_, i) => words.slice(i * BATCH, (i + 1) * BATCH));

const normalise = (item) =>
    Object.fromEntries(FIELDS.map((field) => [field, String(item?.[field] ?? "").normalize("NFC").replace(/\s+/g, " ").trim()]));
const same = (a, b) => a && b && FIELDS.every((field) => a[field] === b[field]);

const answersOf = (pass, index) => {
    const path = batchPath(pass, index);
    if (!existsSync(path)) return null;
    return new Map(readJson(path).items.map((item) => [item.id, normalise(item)]));
};

// ---------------------------------------------------------------------------------------

const runPass = async (pass, effort) => {
    const words = loadInput();
    const groups = batches(words);
    mkdirSync(passDir(pass), { recursive: true });

    const jobs = [];
    let carried = 0;
    groups.forEach((group, index) => {
        if (existsSync(batchPath(pass, index))) return;
        if (pass > 1) {
            const previous = answersOf(pass - 1, index);
            if (!previous) throw new Error(`pass ${pass - 1} has no answer for batch ${index}`);
            if (pass >= 3) {
                const before = answersOf(pass - 2, index);
                const settled = group.every((word) => same(previous.get(word.id), before?.get(word.id)));
                if (settled) {
                    const saved = readJson(batchPath(pass - 1, index));
                    writeFileSync(batchPath(pass, index), JSON.stringify({ ...saved, carried: true }, null, 1));
                    carried++;
                    return;
                }
            }
        }
        jobs.push({ index, group, name: `batch-${index}` });
    });

    console.log(
        `pass ${pass} (${MODEL}, effort ${effort}): ${jobs.length} batches of ≤${BATCH} words to write` +
            (pass >= 3 ? `, ${carried} carried forward` : ""),
    );

    const { done, failed } = await pool(jobs, CONCURRENCY, async ({ index, group, name }) => {
        const started = Date.now();
        const prompt =
            pass === 1
                ? firstPrompt(group)
                : recheckPrompt(group, readJson(batchPath(pass - 1, index)).items);
        const answer = await askCodex({ prompt, schema: SCHEMA, cwd: CODEX_CWD, model: MODEL, effort });
        const ids = new Set(group.map((word) => word.id));
        const items = answer.items.filter((item) => ids.has(item.id));
        if (items.length !== group.length) {
            throw new Error(`answered ${items.length} of ${group.length} words`);
        }
        writeFileSync(batchPath(pass, index), JSON.stringify({ batch: index, model: MODEL, effort, items }, null, 1));
        console.log(`  ${name}  ${items.length} words  ${((Date.now() - started) / 1000).toFixed(0)}s`);
    });

    console.log(`pass ${pass}: ${done} written, ${failed} failed${failed ? " — re-run the same command" : ""}`);
    if (failed) process.exitCode = 1;
};

// ---------------------------------------------------------------------------------------

const passesOnDisk = () =>
    existsSync(OUT_DIR)
        ? readdirSync(OUT_DIR)
              .map((name) => Number(name.match(/^pass-(\d+)$/)?.[1]))
              .filter(Boolean)
              .sort((a, b) => a - b)
        : [];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const THAI = /[฀-๿]/;

/** Mechanical checks. Each returns a reason string or null. */
const CHECKS = [
    (word, a) =>
        new RegExp(`(^|[^A-Za-z])${escapeRegExp(word.word)}([^A-Za-z]|$)`, "i").test(a.exampleEn)
            ? null
            : "headword missing from exampleEn",
    (word, a) => (/^[A-Za-z]+(-[A-Za-z]+)*( [A-Za-z]+(-[A-Za-z]+)*)*$/.test(a.pronunciationRoman) && /[A-Z]/.test(a.pronunciationRoman) ? null : "pronunciationRoman shape"),
    (word, a) => (THAI.test(a.exampleTh) && !/[A-Za-z]/.test(a.exampleTh) ? null : "exampleTh not Thai"),
    (word, a) => (a.exampleThRoman && !THAI.test(a.exampleThRoman) ? null : "exampleThRoman not Latin"),
    (word, a) => (a.meaningThRoman && !THAI.test(a.meaningThRoman) ? null : "meaningThRoman not Latin"),
    (word, a) => (THAI.test(a.meaningThReading) && !/[A-Za-z]/.test(a.meaningThReading) ? null : "meaningThReading not Thai"),
    (word, a) => {
        const n = a.exampleEn.split(/\s+/).length;
        return n >= 3 && n <= 16 ? null : "exampleEn length";
    },
];

// --partial: use whatever is on disk while passes are still running — each word's latest
// answer, words with none skipped, and no `ai-unstable-gen` flag (stability needs the last
// two passes). Meant for looking at the content in /admin early; re-run `apply` after the
// last pass to overwrite with the checked answers.
const PARTIAL = flag("partial");

const results = () => {
    const words = loadInput();
    const passes = passesOnDisk();
    if (passes.length === 0) throw new Error("no passes on disk");
    const groups = batches(words);
    return words.flatMap((word) => {
        const index = groups.findIndex((group) => group.includes(word));
        const history = passes.map((pass) => answersOf(pass, index)?.get(word.id) ?? null);
        const final = PARTIAL ? history.filter(Boolean).at(-1) : history.at(-1);
        if (!final) {
            if (PARTIAL) return [];
            throw new Error(`pass ${passes.at(-1)} is incomplete (batch ${index})`);
        }
        const stable = PARTIAL || (passes.length >= 2 && same(final, history.at(-2)));
        const problems = CHECKS.map((check) => check(word, final)).filter(Boolean);
        return [{ word, final, stable, problems }];
    });
};

const report = () => {
    const rows = results();
    const unstable = rows.filter((r) => !r.stable);
    const failing = rows.filter((r) => r.problems.length);
    console.log(`passes on disk: ${passesOnDisk().join(", ")}`);
    console.log(`words: ${rows.length}, stable: ${rows.length - unstable.length}, unstable: ${unstable.length}, failing checks: ${failing.length}`);
    const reasons = new Map();
    for (const r of failing) for (const p of r.problems) reasons.set(p, (reasons.get(p) ?? 0) + 1);
    for (const [reason, count] of reasons) console.log(`  ${reason}: ${count}`);
    for (const r of rows.slice(0, 5)) console.log(`  ${r.word.word}: ${JSON.stringify(r.final)}`);
};

const sql = (value) => `'${String(value).replace(/'/g, "''")}'`;

const apply = () => {
    const rows = results();
    const columns = d1(`SELECT name FROM pragma_table_info('VocabWord')`).map((c) => c.name);
    const missing = FIELDS.filter((field) => !columns.includes(field));
    if (missing.length) throw new Error(`VocabWord has no ${missing.join(", ")} — apply the migration first`);

    const current = new Map(
        d1(`SELECT id, reviewState, reviewFlags, ${FIELDS.join(", ")} FROM VocabWord`).map((row) => [row.id, row]),
    );

    const updates = [];
    const rollback = [];
    let flaggedCount = 0;
    for (const { word, final, stable, problems } of rows) {
        const row = current.get(word.id);
        if (!row || row.reviewState === "approved") continue;

        const flags = JSON.parse(row.reviewFlags || "[]").filter((f) => f !== "ai-check" && f !== "ai-unstable-gen");
        if (problems.length) flags.push("ai-check");
        if (!stable) flags.push("ai-unstable-gen");
        if (problems.length || !stable) flaggedCount++;
        const reviewState = flags.length ? "flagged" : row.reviewState === "flagged" ? "unreviewed" : row.reviewState;

        const set = [...FIELDS.map((f) => `${f}=${sql(final[f])}`), `reviewState=${sql(reviewState)}`, `reviewFlags=${sql(JSON.stringify(flags))}`];
        const back = [...FIELDS.map((f) => `${f}=${sql(row[f] ?? "")}`), `reviewState=${sql(row.reviewState)}`, `reviewFlags=${sql(row.reviewFlags)}`];
        updates.push(`UPDATE VocabWord SET ${set.join(", ")} WHERE id=${sql(word.id)};`);
        rollback.push(`UPDATE VocabWord SET ${back.join(", ")} WHERE id=${sql(word.id)};`);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = REMOTE ? "remote" : "local";
    const updatePath = join(OUT_DIR, `apply-${target}-${stamp}.sql`);
    const rollbackPath = join(OUT_DIR, `rollback-${target}-${stamp}.sql`);
    writeFileSync(updatePath, updates.join("\n"));
    writeFileSync(rollbackPath, rollback.join("\n"));
    console.log(`updates: ${updates.length}, flagged for review: ${flaggedCount}`);
    console.log(`SQL:      ${updatePath}\nrollback: ${rollbackPath}`);

    if (!flag("write")) return console.log("\nno --write: nothing executed");
    if (updates.length) d1File(updatePath);
};

const main = async () => {
    if (command === "pass") {
        const pass = Number(argv[1]);
        if (!Number.isInteger(pass) || pass < 1) throw new Error("usage: pass <n> --effort low|medium");
        return runPass(pass, option("effort", pass === 1 ? "low" : "medium"));
    }
    if (command === "report") return report();
    if (command === "apply") return apply();
    console.error("usage: pass <n> [--effort low|medium] | report | apply [--write] [--remote]");
    process.exitCode = 1;
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
