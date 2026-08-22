/**
 * Draft an English example sentence for every published word that has none, through the
 * same admin write path the curation screen uses.
 *
 * Examples matter beyond the word page: the `cloze` item type (`src/session.ts`) is a
 * sentence with the word taken out of it, and it silently falls back to a meaning question
 * for any word without one. So an empty `exampleEn` column is not a cosmetic gap — it is a
 * question type that never fires.
 *
 * **These are drafts.** A 3B local model writes usable A1/A2 sentences and mediocre B2
 * ones, so the script refuses anything that fails a mechanical check (the word has to
 * appear as its own word, the sentence has to be one sentence, of sane length) and leaves
 * everything else empty rather than writing something a learner would have to un-learn.
 * What it writes still deserves a read in `/admin/vocabulary`.
 *
 * Thai translations are deliberately NOT generated. A machine-translated `exampleTh` is
 * exactly the kind of plausible-looking wrong Thai the review queue exists to catch, and
 * unlike a meaning it would arrive at 3,000-row scale with nobody having read one.
 *
 * Usage:
 *   ollama serve                                        # once, in another terminal
 *   node scripts/generate-examples.mjs --level A1 --limit 50
 *   node scripts/generate-examples.mjs --dry            # print drafts, write nothing
 *
 * Requires ADMIN_PASSWORD, like scripts/generate-audio.mjs.
 */

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

const OLLAMA_URL = process.env.OLLAMA_API_URL ?? "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? fallback : argv[index + 1];
};

const LEVEL = flag("level");
const LIMIT = Number(flag("limit", "0")) || 0;
const DRY = argv.includes("--dry");

/** Sentences that teach: short enough to read at a glance, long enough to give context. */
const MIN_WORDS = 4;
const MAX_WORDS = 14;

const login = async () => {
    if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is required");

    const res = await fetch(`${API_ORIGIN}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    });

    if (!res.ok) throw new Error(`admin login failed: ${res.status}`);
    const cookie = res.headers.get("set-cookie");
    if (!cookie) throw new Error("admin login returned no cookie");
    return cookie.split(";")[0];
};

const fetchWordsNeedingExamples = async (cookie) => {
    const out = [];
    const pageSize = 100;

    for (let skip = 0; ; skip += pageSize) {
        const query = new URLSearchParams({
            take: String(pageSize),
            skip: String(skip),
            orderBy: JSON.stringify([{ level: "asc" }, { unit: "asc" }, { sourceOrder: "asc" }]),
            ...(LEVEL ? { where: JSON.stringify({ level: { equals: LEVEL } }) } : {}),
        });

        const res = await fetch(`${API_ORIGIN}/vocabword/paginated?${query}`, {
            headers: { cookie },
        });
        if (!res.ok) throw new Error(`word list failed: ${res.status}`);

        const { data } = await res.json();
        if (!data?.length) break;

        for (const word of data) {
            if (word.status !== "published") continue;
            if (word.exampleEn?.trim()) continue;
            out.push(word);
        }

        if (data.length < pageSize) break;
        if (LIMIT && out.length >= LIMIT) break;
    }

    return LIMIT ? out.slice(0, LIMIT) : out;
};

const prompt = (word) =>
    [
        `Write one simple example sentence for the English word "${word.displayWord}" (${word.partOfSpeech}).`,
        `The learner is at CEFR level ${word.level}, so use only common words around them.`,
        `Rules: one sentence, ${MIN_WORDS}-${MAX_WORDS} words, must contain "${word.displayWord}" exactly as spelled, no quotation marks, no explanation.`,
        "Reply with the sentence and nothing else.",
    ].join(" ");

const draft = async (word) => {
    const res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            stream: false,
            messages: [{ role: "user", content: prompt(word) }],
        }),
    });

    if (!res.ok) throw new Error(`ollama responded ${res.status}`);

    const body = await res.json();
    return (body?.message?.content ?? "").trim();
};

/**
 * The mechanical gate. Nothing subjective here — it only rejects sentences that cannot be
 * used, and the cloze item's blanking rule (a whole-word match on the headword) is the
 * main thing being enforced, because a sentence that fails it makes the question type
 * silently disappear.
 */
const acceptable = (word, sentence) => {
    const text = sentence.replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
    if (!text) return null;

    // One sentence. A model that "helpfully" adds a second gets the first taken.
    const first = text.split(/(?<=[.!?])\s+/)[0];
    const words = first.split(" ").filter(Boolean);
    if (words.length < MIN_WORDS || words.length > MAX_WORDS) return null;

    const escaped = word.displayWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`\\b${escaped}\\b`, "i").test(first)) return null;

    // No stray markup, no leaked instructions.
    if (/[<>{}]|http/i.test(first)) return null;

    return first;
};

const save = async (cookie, word, exampleEn) => {
    const res = await fetch(`${API_ORIGIN}/vocabword`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ where: { id: word.id }, data: { exampleEn } }),
    });

    return res.ok;
};

const main = async () => {
    const cookie = await login();
    const pending = await fetchWordsNeedingExamples(cookie);

    console.log(`${pending.length} words without an example`);

    let written = 0;
    let rejected = 0;
    let failed = 0;

    for (const word of pending) {
        let sentence = null;

        // Two attempts, then move on: the failure is usually the model ignoring the
        // spelling rule, and a third try costs more than the word is worth here.
        for (let attempt = 0; attempt < 2 && !sentence; attempt += 1) {
            try {
                sentence = acceptable(word, await draft(word));
            } catch (error) {
                failed += 1;
                console.warn(`  ${word.displayWord}: ${error.message}`);
                break;
            }
        }

        if (!sentence) {
            rejected += 1;
            continue;
        }

        if (DRY) {
            console.log(`  ${word.displayWord.padEnd(16)} ${sentence}`);
            written += 1;
            continue;
        }

        if (await save(cookie, word, sentence)) written += 1;
        else failed += 1;
    }

    console.log(
        `\n${written} written, ${rejected} rejected by the quality gate, ${failed} failed`,
    );
    if (!DRY && written > 0) {
        console.log("These are drafts — read them in /admin/vocabulary before trusting them.");
    }
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
