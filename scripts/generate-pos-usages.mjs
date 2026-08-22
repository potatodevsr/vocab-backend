/**
 * Draft one example sentence *per part of speech* for the words that carry more than one.
 *
 * 260 of the 3,295 words are a list — `across` is `"prep., adv."` — and today every sense
 * of such a word shares a single Thai meaning and a single example. That is the defect
 * behind two separate problems: word pages that read as near-duplicates of each other
 * (`docs/SPEC.md` §9.6), and quiz options that cannot tell two senses apart.
 *
 * This fixes the half a machine can be trusted with. Each part of speech gets its own
 * English sentence, written to `posUsages` in the order `partOfSpeech` lists them, which is
 * the order `lib/pos.ts` aligns on. **`meaningTh` is left empty on purpose** — a
 * per-sense Thai gloss is exactly the plausible-looking wrong Thai the review queue exists
 * to catch, and it would arrive at scale with nobody having read one. The admin form shows
 * the empty box next to a sentence that demonstrates the sense, which is the most useful
 * thing to hand a curator.
 *
 * Existing values are never overwritten: a sense a human has already written is left alone.
 *
 * Usage:
 *   ollama serve
 *   node scripts/generate-pos-usages.mjs --limit 20 --dry
 *   ADMIN_PASSWORD=… node scripts/generate-pos-usages.mjs --level A1
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

const MIN_WORDS = 4;
const MAX_WORDS = 14;

/** How a part-of-speech marker reads to a model that has never seen this corpus. */
const POS_NAMES = {
    "n.": "noun",
    "v.": "verb",
    "adj.": "adjective",
    "adv.": "adverb",
    "prep.": "preposition",
    "conj.": "conjunction",
    "pron.": "pronoun",
    "det.": "determiner",
    "exclam.": "exclamation",
    "num.": "number",
    "modal": "modal verb",
    "aux.": "auxiliary verb",
};

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

/** Words with more than one part of speech, published, in learner order. */
const fetchMultiPosWords = async (cookie) => {
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

            const parts = String(word.partOfSpeech)
                .split(",")
                .map((part) => part.trim())
                .filter(Boolean);

            if (parts.length < 2) continue;

            // Already curated? Leave it. "Curated" means every part has a sentence.
            let existing = [];
            try {
                existing = JSON.parse(word.posUsages || "[]");
            } catch {
                existing = [];
            }

            const covered = parts.every((pos) =>
                existing.some((entry) => entry?.pos === pos && entry?.exampleEn?.trim()),
            );
            if (covered) continue;

            out.push({ ...word, parts, existing });
        }

        if (data.length < pageSize) break;
        if (LIMIT && out.length >= LIMIT) break;
    }

    return LIMIT ? out.slice(0, LIMIT) : out;
};

const draft = async (word, pos) => {
    const name = POS_NAMES[pos] ?? pos.replace(/\.$/, "");

    const prompt = [
        `Write one simple example sentence using the English word "${word.displayWord}" specifically as a ${name}.`,
        `The learner is at CEFR level ${word.level}, so keep the other words common.`,
        `Rules: one sentence, ${MIN_WORDS}-${MAX_WORDS} words, must contain "${word.displayWord}" exactly as spelled, no quotation marks, no explanation.`,
        "Reply with the sentence and nothing else.",
    ].join(" ");

    const res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            stream: false,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) throw new Error(`ollama responded ${res.status}`);
    return ((await res.json())?.message?.content ?? "").trim();
};

/** Same mechanical gate as `generate-examples.mjs`: nothing subjective, only unusable-or-not. */
const acceptable = (word, sentence) => {
    const text = sentence.replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
    if (!text) return null;

    const first = text.split(/(?<=[.!?])\s+/)[0];
    const words = first.split(" ").filter(Boolean);
    if (words.length < MIN_WORDS || words.length > MAX_WORDS) return null;

    const escaped = word.displayWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`\\b${escaped}\\b`, "i").test(first)) return null;
    if (/[<>{}]|http/i.test(first)) return null;

    return first;
};

const save = async (cookie, word, usages) => {
    const data = {
        posUsages: JSON.stringify(usages),
        // Entry 0 owns the single-example columns — the admin form writes them together, so
        // the script keeps them together too. Only when the row has nothing there already.
        ...(word.exampleEn?.trim() ? {} : { exampleEn: usages[0]?.exampleEn ?? "" }),
    };

    const res = await fetch(`${API_ORIGIN}/vocabword`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ where: { id: word.id }, data }),
    });

    return res.ok;
};

const main = async () => {
    const cookie = await login();
    const words = await fetchMultiPosWords(cookie);

    console.log(`${words.length} multi-sense words without a sentence per sense`);

    let written = 0;
    let rejected = 0;
    let failed = 0;

    for (const word of words) {
        const usages = [];

        for (const pos of word.parts) {
            const previous = word.existing.find((entry) => entry?.pos === pos) ?? {};

            if (previous.exampleEn?.trim()) {
                usages.push(previous);
                continue;
            }

            let sentence = null;
            for (let attempt = 0; attempt < 2 && !sentence; attempt += 1) {
                try {
                    sentence = acceptable(word, await draft(word, pos));
                } catch (error) {
                    console.warn(`  ${word.displayWord} (${pos}): ${error.message}`);
                    break;
                }
            }

            usages.push({
                pos,
                // Deliberately not generated — see the header.
                meaningTh: previous.meaningTh ?? "",
                exampleEn: sentence ?? previous.exampleEn ?? "",
                exampleTh: previous.exampleTh ?? "",
            });
        }

        const produced = usages.filter((entry) => entry.exampleEn).length;
        if (produced < word.parts.length) rejected += 1;
        if (produced === 0) continue;

        if (DRY) {
            console.log(`  ${word.displayWord} (${word.partOfSpeech})`);
            for (const entry of usages) console.log(`      ${entry.pos.padEnd(8)} ${entry.exampleEn}`);
            written += 1;
            continue;
        }

        if (await save(cookie, word, usages)) written += 1;
        else failed += 1;
    }

    console.log(
        `\n${written} words written, ${rejected} with at least one sense the gate refused, ${failed} failed`,
    );
    if (!DRY && written > 0) {
        console.log("Thai meanings per sense are still blank by design — fill them in /admin/vocabulary.");
    }
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
