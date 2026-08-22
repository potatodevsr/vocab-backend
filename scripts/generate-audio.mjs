/**
 * Fill in the missing speech, one word at a time, through the API's admin TTS route.
 *
 * This script is a *driver*, not a synthesiser: `POST /audio/generate` does the Workers AI
 * call, the R2 write and the database update inside the Worker, and this loop only decides
 * what to ask for and in what order. That split is deliberate — the text being spoken is
 * read from the database on the server, so nothing here can turn the account's TTS budget
 * into a general-purpose speech service, and there is exactly one code path that writes
 * audio whether it was triggered by a script or by a future admin button.
 *
 * Order is by CEFR level then unit: A1 unit 1 is what a beginner meets first, so it is
 * what gets audio first if the run is interrupted or the budget runs out.
 *
 * Usage:
 *   node scripts/generate-audio.mjs                     # local API on :4000
 *   node scripts/generate-audio.mjs --level A1 --limit 200
 *   node scripts/generate-audio.mjs --examples          # example sentences too
 *   API_ORIGIN=https://vocab-api.example.workers.dev \
 *     ADMIN_USERNAME=admin ADMIN_PASSWORD=… node scripts/generate-audio.mjs
 *
 * Resumable by construction: it only ever asks for words whose key is still empty, so
 * re-running after a failure picks up exactly where it stopped.
 */

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? fallback : argv[index + 1];
};

const LEVEL = flag("level");
const LIMIT = Number(flag("limit", "0")) || 0;
const WITH_EXAMPLES = argv.includes("--examples");
const DRY = argv.includes("--dry");

/**
 * One at a time on purpose. TTS is the expensive call in this system, D1 has a single
 * writer, and a failed batch of twenty is harder to reason about than a failed single.
 * A full 3,295-word run is a background job measured in hours, not a thing anyone waits on.
 */
const PAUSE_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const login = async () => {
    if (!ADMIN_PASSWORD) {
        throw new Error("ADMIN_PASSWORD is required (the admin account's password)");
    }

    const res = await fetch(`${API_ORIGIN}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    });

    if (!res.ok) throw new Error(`admin login failed: ${res.status}`);

    const cookie = res.headers.get("set-cookie");
    if (!cookie) throw new Error("admin login returned no cookie");

    // Just the name=value pair; the attributes are for a browser, not for us.
    return cookie.split(";")[0];
};

/** Pages through the admin word list, newest-empty-first, in learner order. */
const fetchWordsNeedingAudio = async (cookie) => {
    const out = [];
    const pageSize = 100;

    for (let skip = 0; ; skip += pageSize) {
        const where = { ...(LEVEL ? { level: { equals: LEVEL } } : {}) };
        const query = new URLSearchParams({
            take: String(pageSize),
            skip: String(skip),
            orderBy: JSON.stringify([{ level: "asc" }, { unit: "asc" }, { sourceOrder: "asc" }]),
            ...(Object.keys(where).length > 0 ? { where: JSON.stringify(where) } : {}),
        });

        const res = await fetch(`${API_ORIGIN}/vocabword/paginated?${query}`, {
            headers: { cookie },
        });
        if (!res.ok) throw new Error(`word list failed: ${res.status}`);

        const { data } = await res.json();
        if (!data?.length) break;

        for (const word of data) {
            // Published only: generating speech for a draft spends the budget on a row no
            // learner can reach, and drafts are where the wrong Thai still lives.
            if (word.status !== "published") continue;
            if (!word.audioKeyEn) out.push({ id: word.id, word: word.displayWord, kind: "word" });
            if (WITH_EXAMPLES && word.exampleEn && !word.audioKeyExample) {
                out.push({ id: word.id, word: word.displayWord, kind: "example" });
            }
        }

        if (data.length < pageSize) break;
        if (LIMIT && out.length >= LIMIT) break;
    }

    return LIMIT ? out.slice(0, LIMIT) : out;
};

const generate = async (cookie, item) => {
    const res = await fetch(`${API_ORIGIN}/audio/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify({ wordId: item.id, kind: item.kind }),
    });

    if (res.status === 503) {
        throw new Error(
            "the API has no AUDIO bucket or no AI binding — enable R2 and Workers AI, then redeploy",
        );
    }

    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, ...(await res.json()) };
};

const main = async () => {
    const cookie = await login();
    const pending = await fetchWordsNeedingAudio(cookie);

    console.log(`${pending.length} clips to generate at ${API_ORIGIN}`);
    if (DRY) {
        for (const item of pending.slice(0, 20)) console.log(`  ${item.kind} ${item.word}`);
        console.log("--dry: nothing generated");
        return;
    }

    let done = 0;
    let failed = 0;

    for (const item of pending) {
        const result = await generate(cookie, item);

        if (result.ok) {
            done += 1;
        } else {
            failed += 1;
            console.warn(`  failed ${item.kind} ${item.word} (${result.status})`);
        }

        if ((done + failed) % 25 === 0) {
            console.log(`  ${done + failed}/${pending.length} (${failed} failed)`);
        }

        await sleep(PAUSE_MS);
    }

    console.log(`\ndone: ${done} generated, ${failed} failed`);
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
