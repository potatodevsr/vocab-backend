import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * Serving and minting the pre-generated speech (SPEC §5.6).
 *
 * Two routes, and the asymmetry between them is the point:
 *
 * - `GET /audio/*` is public, cacheable forever, and does nothing but hand back an R2
 *   object. Learners hit it on every card.
 * - `POST /audio/generate` is admin-only, synthesises one clip through Workers AI, writes
 *   it to R2 and records the key on the word. It is driven by `scripts/generate-audio.mjs`
 *   in batches, never by a learner request — synthesising per request would put a
 *   multi-second model call in the middle of a lesson and bill for the same sentence
 *   thousands of times.
 *
 * Why pre-generated at all, when `speechSynthesis` is free: a listening question grades a
 * learner on what they heard, so every learner has to hear the *same* audio. A browser
 * voice differs per device, per OS version, and is missing outright on plenty of Android
 * phones in this audience.
 *
 * Both routes degrade rather than fail when the bucket is not bound (no R2 on the account,
 * a preview deploy). `GET` answers 404, `POST` answers 503, and the UI shows no player —
 * an empty `audioKeyEn` is already the "no audio" state, so nothing else has to branch.
 */

export const audio = new Hono<Env>();

/** Keys are `audio/en/{wordId}.mp3` — the prefix is fixed here, never taken from input. */
const AUDIO_PREFIX = "audio/";

/**
 * A year, immutable. The key contains the word id and the clip never changes for that id;
 * regenerating a word's audio writes a *new* key (`…-2.mp3`), so a cached response can
 * never be the wrong audio for the key that produced it.
 */
const CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Text-to-speech on Workers AI.
 *
 * Two models, tried in order, because they fail differently and the platform's catalogue
 * moves: Deepgram Aura-2 is the better English voice and streams raw mp3 bytes; MeloTTS is
 * the long-standing fallback and answers with base64 in a JSON envelope. `@cf/myshell-ai/
 * melotts` was the first choice until it started answering `3043: Internal server error`
 * for every request while still being listed as available — a model that is present in
 * `wrangler ai models` is not necessarily a model that runs.
 *
 * `TTS_MODEL` overrides the order for one deploy without a code change.
 */
const TTS_MODELS = ["@cf/deepgram/aura-2-en", "@cf/myshell-ai/melotts"] as const;

const decodeBase64 = (value: string): Uint8Array => {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

/**
 * Runs one model and normalises whatever it hands back into bytes.
 *
 * The two shapes are not a detail that can be hidden behind a type: Aura returns a
 * `ReadableStream` of mp3, MeloTTS returns `{ audio: "<base64>" }`, and a third model
 * added later will return a third thing. Anything unrecognised is treated as a failure
 * rather than written to R2 — an object of the wrong bytes is worse than no object,
 * because the key would then look generated and never be retried.
 */
const synthesise = async (
    ai: NonNullable<Bindings["AI"]>,
    model: string,
    text: string,
): Promise<Uint8Array | null> => {
    const input =
        model.includes("aura")
            ? { text, encoding: "mp3" }
            : { prompt: text, lang: "en" };

    const result = (await ai.run(model, input)) as unknown;

    if (result instanceof ReadableStream) {
        const bytes = new Uint8Array(await new Response(result).arrayBuffer());
        return bytes.byteLength > 0 ? bytes : null;
    }

    if (result instanceof ArrayBuffer) {
        return result.byteLength > 0 ? new Uint8Array(result) : null;
    }

    const audio = (result as { audio?: unknown } | null)?.audio;
    if (typeof audio === "string" && audio.length > 0) return decodeBase64(audio);

    return null;
};

audio.get("/audio/*", async (c) => {
    const bucket = c.env.AUDIO;
    if (!bucket) return c.json({ message: "Audio is not configured" }, 404);

    // Everything after the origin, minus the leading slash: `audio/en/{id}.mp3`.
    const key = new URL(c.req.url).pathname.slice(1);
    if (!key.startsWith(AUDIO_PREFIX)) return c.json({ message: "Not found" }, 404);

    const object = await bucket.get(key);
    if (!object) return c.json({ message: "Not found" }, 404);

    return new Response(object.body, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": CACHE_CONTROL,
            // Lets a browser range-request into the clip rather than refetching it.
            "Accept-Ranges": "bytes",
            ETag: object.httpEtag,
        },
    });
});

/**
 * Synthesise one clip and attach it to a word.
 *
 * Admin-only, and the *text* is read from the database rather than the request body: a
 * caller who could post arbitrary text would have a general-purpose TTS service billed to
 * this account. The body names a word and which of its two clips to make, nothing more.
 */
audio.post("/audio/generate", async (c) => {
    if (c.get("role") !== "admin") return c.json({ message: "Unauthorized" }, 401);

    const bucket = c.env.AUDIO;
    if (!bucket) return c.json({ message: "Audio is not configured" }, 503);
    if (!c.env.AI) return c.json({ message: "Workers AI is not bound" }, 503);

    const body = (await c.req.json().catch(() => null)) as {
        wordId?: unknown;
        kind?: unknown;
    } | null;

    const wordId = typeof body?.wordId === "string" ? body.wordId : "";
    const kind = body?.kind === "example" ? "example" : "word";
    if (!wordId) return c.json({ message: "wordId is required" }, 400);

    const prisma = c.get("prisma");
    const word = await prisma.vocabWord.findUnique({
        where: { id: wordId },
        select: { id: true, displayWord: true, exampleEn: true },
    });

    if (!word) return c.json({ message: "Not found" }, 404);

    const text = (kind === "example" ? word.exampleEn : word.displayWord).trim();
    if (!text) return c.json({ message: "Nothing to speak" }, 422);

    const models = c.env.TTS_MODEL ? [c.env.TTS_MODEL] : [...TTS_MODELS];

    let bytes: Uint8Array | null = null;
    let lastError = "";

    for (const model of models) {
        try {
            bytes = await synthesise(c.env.AI, model, text);
            if (bytes) break;
            lastError = `${model} returned no audio`;
        } catch (error) {
            // A model can be listed and still be down. Try the next one before giving up,
            // and report which one failed — a batch of 3,000 that dies silently on the
            // first word wastes an afternoon.
            lastError = `${model}: ${error instanceof Error ? error.message : "failed"}`;
        }
    }

    if (!bytes) return c.json({ message: `Synthesis failed — ${lastError}` }, 502);

    const key = `${AUDIO_PREFIX}en/${word.id}${kind === "example" ? "-example" : ""}.mp3`;
    await bucket.put(key, bytes, {
        httpMetadata: { contentType: "audio/mpeg", cacheControl: CACHE_CONTROL },
    });

    await prisma.vocabWord.update({
        where: { id: word.id },
        data: kind === "example" ? { audioKeyExample: key } : { audioKeyEn: key },
    });

    return c.json({ ok: true, key });
});
