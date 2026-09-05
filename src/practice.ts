import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { SignJWT, jwtVerify } from "jose";

import type { Bindings, Variables } from "./index.js";
import { readJsonBody } from "./helpers/json-body.js";
import {
    MASTERY_MASTERED,
    MASTERY_MAX,
    RECALL_DAYS_REQUIRED,
    STRONG_DAYS_REQUIRED,
    learnerDay,
} from "./mastery.js";

type Env = { Bindings: Bindings; Variables: Variables };
type Ctx = Context<Env>;

/**
 * Anonymous practice trial (LEARNER-LIFECYCLE.md §3.2-3.3): five graded items answered
 * before any account exists, then claimed into a real account without ever trusting a
 * client-reported score. `/practice/start` and `/practice/answer` write no user
 * progress — only `/practice/claim` (or the magic-link verify handoff in index.ts) does.
 *
 * The client never learns a word's id or slug for any option, prompt included: it
 * answers by option *position*, not by echoing an identifier back. Both are drawn from
 * the same public word data a word page already shows, but returning the raw id would let
 * a client "solve" the item by string-matching the prompt's id against an option's id
 * instead of reading either — the shuffle hides position, but an id in the payload
 * defeats that trivially. The server re-derives the same deterministic shuffle at
 * `/practice/answer` and at claim time from `wordIds`/`poolIds` alone, so nothing about
 * which option is correct is ever written to a response.
 */

const TRIAL_ITEM_COUNT = 5;
const TRIAL_OPTION_COUNT = 4;
const TRIAL_TTL_DAYS = 30;
const TRIAL_POOL_SIZE = 60;
const TRIAL_START_LIMIT_PER_HOUR = 20;

const TRIAL_ID_COOKIE = "trial_id";
export const TRIAL_CLAIM_COOKIE = "trial_claim";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const secretOf = (c: { env: Bindings }) =>
    new TextEncoder().encode(c.env.JWT_SECRET);

/** Deterministic per-item shuffle so a refresh never reshuffles an in-progress item, and
 *  so the server can re-derive the exact same option order the client was shown. */
const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const seedFrom = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
    }
    return hash;
};

const shuffled = <T>(items: T[], rand: () => number): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const parseUnit = (value: unknown): number | null =>
    typeof value === "number" && Number.isInteger(value) ? value : null;

const parseAnswers = (raw: string): boolean[] => {
    try {
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value.filter((v) => typeof v === "boolean") : [];
    } catch {
        return [];
    }
};

type PoolEntry = { id: string; partOfSpeech: string };

const parsePool = (raw: string): PoolEntry[] => {
    try {
        const value = JSON.parse(raw);
        return Array.isArray(value)
            ? value.filter(
                  (v): v is PoolEntry =>
                      v && typeof v.id === "string" && typeof v.partOfSpeech === "string",
              )
            : [];
    } catch {
        return [];
    }
};

const parseWordIds = (raw: string): string[] => {
    try {
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
    } catch {
        return [];
    }
};

/**
 * Re-derivable at `/start`, `/answer` and claim time alike from nothing but
 * `(trialId, itemIndex, targetId, poolIds)` — same-part-of-speech distractors preferred,
 * falling back to the rest of the pool, then shuffled into final option order.
 */
const deriveOptionIds = (
    trialId: string,
    index: number,
    targetId: string,
    pool: PoolEntry[],
): string[] => {
    const rand = mulberry32(seedFrom(`${trialId}:${index}`));
    const targetPos = pool.find((entry) => entry.id === targetId)?.partOfSpeech;
    const others = pool.filter((entry) => entry.id !== targetId);
    const samePos = others.filter((entry) => entry.partOfSpeech === targetPos).map((e) => e.id);
    const rest = others.filter((entry) => entry.partOfSpeech !== targetPos).map((e) => e.id);
    const distractors = shuffled([...samePos, ...rest], rand).slice(0, TRIAL_OPTION_COUNT - 1);
    return shuffled([targetId, ...distractors], rand);
};

/** Signs the httpOnly claim cookie set once a trial completes. Never a bearer in a URL. */
const signTrialClaim = async (c: { env: Bindings }, trialId: string, expiresAt: Date) => {
    const ttlSeconds = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return new SignJWT({ purpose: "trial_claim", trialId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${ttlSeconds}s`)
        .sign(secretOf(c));
};

export const verifyTrialClaim = async (
    c: { env: Bindings },
    token: string,
): Promise<string | null> => {
    try {
        const { payload } = await jwtVerify(token, secretOf(c));
        if (payload.purpose === "trial_claim" && typeof payload.trialId === "string") {
            return payload.trialId;
        }
        return null;
    } catch {
        return null;
    }
};

const wordSelect = {
    id: true,
    displayWord: true,
    partOfSpeech: true,
    meaningTh: true,
    pronunciationTh: true,
} as const;

type PoolWord = {
    id: string;
    displayWord: string;
    partOfSpeech: string;
    meaningTh: string;
    pronunciationTh: string;
};

// Never an id, never a slug — and the prompt and its options must not share a single
// field value either, or a client (or a naive test) "solves" the item by string-matching
// instead of reading either side. The prompt is the question ("what does this word
// mean?"), so it carries the word text and how to read it, never its own meaning. Options
// carry the candidate meanings only. `partOfSpeech` is safe on both: several options
// legitimately share it by construction (§3.10.8's same-part-of-speech distractors).
const promptFace = (word: PoolWord | undefined) =>
    word && {
        displayWord: word.displayWord,
        partOfSpeech: word.partOfSpeech,
        pronunciationTh: word.pronunciationTh,
    };

const optionFace = (word: PoolWord | undefined) =>
    word && {
        meaningTh: word.meaningTh,
        partOfSpeech: word.partOfSpeech,
    };

const buildStartItems = (
    trialId: string,
    targetIds: string[],
    poolEntries: PoolEntry[],
    wordsById: Map<string, PoolWord>,
) =>
    targetIds.map((targetId, index) => {
        const optionIds = deriveOptionIds(trialId, index, targetId, poolEntries);
        return {
            index,
            prompt: promptFace(wordsById.get(targetId)),
            options: optionIds.map((id) => optionFace(wordsById.get(id))),
        };
    });

const bytesToHex = (bytes: Uint8Array) =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const hashIp = async (ip: string) =>
    bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip))));

/**
 * Server-side throttle, keyed by IP rather than the trial cookie the client controls and
 * can simply clear. `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` is one atomic SQLite
 * statement — the increment and the read-back happen together, so D1's lack of
 * transactions never lets two concurrent requests both see the pre-increment count.
 *
 * `cf-connecting-ip` is only set by the Cloudflare edge, so it is absent in `wrangler dev
 * --local` and in the e2e stack. There is no other trustworthy per-caller signal in that
 * environment (`x-forwarded-for` is client-suppliable), so this is a deliberate no-op
 * off the edge rather than one shared "unknown" bucket that would throttle local dev and
 * the whole e2e suite against itself.
 */
const checkStartRateLimit = async (c: Ctx): Promise<boolean> => {
    // Current Wrangler versions synthesize cf-connecting-ip even under --local, making
    // all browser contexts one caller. The isolated e2e Worker opts out explicitly;
    // production never receives this binding and still enforces the edge-IP throttle.
    if (c.env.E2E_MODE === "true") return true;

    const ip = c.req.header("cf-connecting-ip");
    if (!ip) return true;

    const windowStart = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    const id = `${await hashIp(ip)}:${windowStart}`;

    const rows = await c.get("prisma").$queryRaw<{ count: number }[]>`
        INSERT INTO TrialRateLimit (id, count, createdAt)
        VALUES (${id}, 1, ${new Date()})
        ON CONFLICT(id) DO UPDATE SET count = count + 1
        RETURNING count
    `;

    const count = rows[0]?.count ?? 0;
    return count <= TRIAL_START_LIMIT_PER_HOUR;
};

export const practice = new Hono<Env>();

practice.post("/practice/start", async (c) => {
    const withinLimit = await checkStartRateLimit(c);
    if (!withinLimit) {
        return c.json({ message: "Too many trials started — try again later" }, 429);
    }

    // No account and no active trial: creating a second one before the first finishes
    // would let a client farm distinct items without ever completing one.
    const existingTrialId = getCookie(c, TRIAL_ID_COOKIE);
    if (existingTrialId) {
        const existing = await c.get("prisma").practiceTrial.findUnique({
            where: { id: existingTrialId },
            select: { completedAt: true, expiresAt: true },
        });
        if (existing && !existing.completedAt && existing.expiresAt > new Date()) {
            return c.json({ message: "A trial is already in progress" }, 429);
        }
    }

    const body = await readJsonBody<{ level: string; unit: unknown }>(c);
    const level = typeof body.level === "string" ? body.level : undefined;
    const unit = parseUnit(body.unit);

    /**
     * A unit number means nothing on its own.
     *
     * Unit 4 exists in all four levels, so `{ unit: 4 }` alone selects A1 unit 4 *and* A2
     * unit 4 *and* B1 unit 4 *and* B2 unit 4 — and the distractor supplement below, with
     * no level to filter on, then drew wrong answers from the whole corpus. That produced
     * an A2 prompt answered by A1 meanings, defeating the "distractors come from the same
     * published level" rule the supplement exists to honour.
     *
     * Rejecting the combination is the fix rather than inferring a level from the rows:
     * every real caller already sends both (`components/practice/practice-session.tsx`
     * scopes by `{ level, unit }`), a bare `unit` has no defensible meaning across four
     * levels, and guessing one would silently pick a scope the caller never asked for.
     */
    if (unit !== null && level === undefined) {
        return c.json({ message: "unit requires a level" }, 400);
    }

    const prisma = c.get("prisma");

    /**
     * What the trial is *about* — only ever the rows inside the requested scope.
     *
     * Every word promoted to a prompt comes from here, so a unit's trial teaches that unit
     * and nothing else. This is the invariant that the distractor supplement below must
     * not touch.
     */
    const targetPool: PoolWord[] = await prisma.vocabWord.findMany({
        where: {
            status: "published",
            meaningTh: { not: "" },
            ...(level ? { level } : {}),
            ...(unit !== null ? { unit } : {}),
        },
        orderBy: { sourceOrder: "asc" },
        take: TRIAL_POOL_SIZE,
        select: wordSelect,
    });

    /**
     * Wrong answers may come from outside the unit. Questions may not.
     *
     * Real units hold **3 to 20** published rows (`curriculum-inventory.ts`), and an item
     * needs four options, so every unit smaller than four could not build a single
     * question and the endpoint answered 422 — while the unit page went on advertising
     * "practise this unit" and linking to it. A1 Unit 32 has three words: a public CTA on
     * an indexed page led to an error screen, in production, for anyone who clicked it.
     *
     * The honest reading is that the unit was never short of *content*, only of plausible
     * wrong answers, and a wrong answer is not curriculum. So the shortfall is filled from
     * the rest of the same published level — words the learner is already entitled to see
     * on any public page — and the target list stays exactly what it was. A three-word
     * unit therefore starts a three-item trial with four options each, and 422 is left for
     * the case it is actually true of: a scope that cannot be filled even from the wider
     * pool.
     *
     * The supplement is only read when it is needed, so the common case still runs one
     * query. It is stored in `poolIds` alongside the targets, which is what lets
     * `/practice/answer` and the claim path re-derive the identical option order later —
     * the distractors are part of the trial's recorded shape, not a render-time decision.
     */
    const needed = Math.min(TRIAL_OPTION_COUNT, TRIAL_ITEM_COUNT);
    const needsSupplement =
        unit !== null && targetPool.length > 0 && targetPool.length < needed;
    const distractorPool: PoolWord[] = needsSupplement
        ? await prisma.vocabWord.findMany({
              where: {
                  status: "published",
                  meaningTh: { not: "" },
                  // Guaranteed present whenever `unit` narrowed the scope — the guard at
                  // the top rejects a unit without a level — so a supplemented trial can
                  // only ever borrow from the level its own prompts belong to.
                  ...(level ? { level } : {}),
                  // `unit: { not: unit }` is the whole exclusion: it cannot return a row
                  // already in `targetPool`, so the two lists concatenate without a
                  // de-duplication pass and without an `id` filter the guard shapes have
                  // never needed to allow.
                  unit: { not: unit },
              },
              orderBy: { sourceOrder: "asc" },
              take: TRIAL_POOL_SIZE,
              select: wordSelect,
          })
        : [];

    const pool: PoolWord[] = [...targetPool, ...distractorPool];

    // Two different failures, one status. No targets at all means the scope teaches
    // nothing; too small a combined pool means no item could offer distinguishable
    // options even after widening. Either way the caller is told the scope is unusable
    // rather than handed a broken session.
    if (targetPool.length === 0 || pool.length < needed) {
        return c.json({ message: "Not enough published content for a trial" }, 422);
    }

    const trialId = crypto.randomUUID();
    const rand = mulberry32(seedFrom(trialId));
    const targetIds = shuffled(
        targetPool.map((w) => w.id),
        rand,
    ).slice(0, Math.min(TRIAL_ITEM_COUNT, targetPool.length));

    const poolEntries: PoolEntry[] = pool.map((w) => ({ id: w.id, partOfSpeech: w.partOfSpeech }));
    const expiresAt = new Date(Date.now() + TRIAL_TTL_DAYS * DAY_MS);

    await prisma.practiceTrial.create({
        data: {
            id: trialId,
            level: level ?? null,
            unit,
            wordIds: JSON.stringify(targetIds),
            poolIds: JSON.stringify(poolEntries),
            expiresAt,
        },
    });

    setCookie(c, TRIAL_ID_COOKIE, trialId, {
        httpOnly: true,
        secure: c.req.url.startsWith("https"),
        sameSite: "Lax",
        path: "/",
        maxAge: TRIAL_TTL_DAYS * 24 * 60 * 60,
    });

    const wordsById = new Map(pool.map((w) => [w.id, w]));
    const items = buildStartItems(trialId, targetIds, poolEntries, wordsById);

    return c.json({ trialId, itemCount: items.length, items });
});

practice.post("/practice/answer", async (c) => {
    const trialId = getCookie(c, TRIAL_ID_COOKIE);
    if (!trialId) return c.json({ message: "No trial in progress" }, 400);

    const body = await c.req.json<{ itemIndex?: unknown; selectedOptionIndex?: unknown }>();
    const itemIndex = parseUnit(body.itemIndex);
    const selectedOptionIndex = parseUnit(body.selectedOptionIndex);

    if (itemIndex === null || selectedOptionIndex === null) {
        return c.json({ message: "itemIndex and selectedOptionIndex are required" }, 400);
    }

    const prisma = c.get("prisma");
    let trial = await prisma.practiceTrial.findUnique({ where: { id: trialId } });

    if (!trial || trial.expiresAt <= new Date()) {
        return c.json({ message: "Trial not found or expired" }, 404);
    }

    const targetIds = parseWordIds(trial.wordIds);
    const poolEntries = parsePool(trial.poolIds);

    if (itemIndex < 0 || itemIndex >= targetIds.length) {
        return c.json({ message: "itemIndex out of range" }, 400);
    }

    const targetId = targetIds[itemIndex];
    const correctOptionIndex = deriveOptionIds(trialId, itemIndex, targetId, poolEntries).indexOf(
        targetId,
    );

    const respond = (answers: boolean[], done: boolean, duplicate: boolean) => {
        const correct = answers[itemIndex];
        return c.json({
            itemIndex,
            correct,
            correctOptionIndex,
            done,
            duplicate,
            ...(done ? { correctCount: answers.filter(Boolean).length, total: targetIds.length } : {}),
        });
    };

    // Grading loop, retried once against a concurrent writer. `json_array_length` in the
    // WHERE clause makes the UPDATE a compare-and-swap on "how many items have been
    // answered so far" — the only optimistic-concurrency guard D1's lack of transactions
    // leaves available. A miss means someone else advanced the row first; re-read it and
    // decide again, exactly like the replay branch below.
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const answers = parseAnswers(trial.answers);

        // Replay of an already-graded item (retry, double submit) returns the stored
        // verdict rather than re-scoring.
        if (itemIndex < answers.length) {
            return respond(answers, trial.completedAt !== null, true);
        }

        if (itemIndex !== answers.length) {
            return c.json({ message: "Items must be answered in order" }, 400);
        }

        const correct = selectedOptionIndex === correctOptionIndex;
        const nextAnswers = [...answers, correct];
        const done = nextAnswers.length === targetIds.length;
        const correctCount = nextAnswers.filter(Boolean).length;
        const now = new Date();

        const updated = await prisma.$executeRaw`
            UPDATE PracticeTrial
            SET answers = ${JSON.stringify(nextAnswers)},
                correctCount = ${correctCount},
                completedAt = ${done ? now : null},
                updatedAt = ${now}
            WHERE id = ${trialId} AND json_array_length(answers) = ${answers.length}
        `;

        if (updated === 1) {
            if (done) {
                const claimToken = await signTrialClaim(c, trialId, trial.expiresAt);
                setCookie(c, TRIAL_CLAIM_COOKIE, claimToken, {
                    httpOnly: true,
                    secure: c.req.url.startsWith("https"),
                    sameSite: "Lax",
                    path: "/",
                    maxAge: Math.max(
                        60,
                        Math.floor((trial.expiresAt.getTime() - now.getTime()) / 1000),
                    ),
                });
            }
            return respond(nextAnswers, done, false);
        }

        // Lost the race — reload and try again with the row's actual current state.
        const reloaded = await prisma.practiceTrial.findUnique({ where: { id: trialId } });
        if (!reloaded) return c.json({ message: "Trial not found or expired" }, 404);
        trial = reloaded;
    }

    return c.json({ message: "Could not record answer, please retry" }, 409);
});

/**
 * Applies one word's trial result to its UserWordProgress row and marks that row with
 * this trial's id, in a single atomic UPSERT. The `WHERE` on the `DO UPDATE` is the
 * entire idempotency mechanism: if `trialClaimId` already equals this `trialId`, the
 * conflict branch matches zero rows (a no-op, not an error), so the affected-row count
 * from `$executeRaw` tells the caller whether the reward was actually just granted.
 *
 * This has to be one statement, not "read mastery, then write it": D1 gives no
 * transaction to hold those two steps together, so anything split across them is a
 * window where a crash (or the retry meant to recover from one) can double-apply or
 * silently skip the reward. A single `INSERT ... ON CONFLICT DO UPDATE ... WHERE` is
 * atomic in SQLite on its own, no transaction required.
 */
const applyWordReward = async (
    prisma: Variables["prisma"],
    userId: string,
    wordId: string,
    trialId: string,
    trial: { level: string | null; unit: number | null },
    isCorrect: boolean,
    now: Date,
    timezone: string | null,
): Promise<boolean> => {
    const initialMastery = isCorrect ? 1 : 0;
    const isCorrectFlag = isCorrect ? 1 : 0;
    const status = isCorrect ? "known" : "review";

    /**
     * A claimed trial credits a strong day but never a recall day: every trial item is
     * recognition — a word, and four Thai meanings to choose from. That is deliberate
     * (LEARNER-LIFECYCLE.md §3.2 wants the first two items winnable), and it is exactly the
     * distinction `backend/src/mastery.ts` draws: recognising a gloss among four is not
     * evidence the learner can produce the word, so a trial alone can never make a word
     * strong. It takes a second day, and a real recall, in a saved session.
     */
    const today = learnerDay(now, timezone);

    const updated = await prisma.$executeRaw`
        INSERT INTO UserWordProgress
            (id, userId, wordId, level, unit, status, mastery, seenCount, knownCount,
             reviewCount, correctCount, incorrectCount, streak, lastSeenAt, lastCorrectAt,
             lastIncorrectAt, nextReviewAt, masteredAt, strongDays, recallDays,
             lastStrongDay, trialClaimId, createdAt, updatedAt)
        VALUES
            (${crypto.randomUUID()}, ${userId}, ${wordId}, ${trial.level ?? ""}, ${trial.unit},
             ${status}, ${initialMastery}, 1, 0, 0,
             ${isCorrect ? 1 : 0}, ${isCorrect ? 0 : 1}, ${isCorrect ? 1 : 0}, ${now},
             ${isCorrect ? now : null}, ${isCorrect ? null : now},
             ${new Date(now.getTime() + DAY_MS)},
             ${initialMastery >= MASTERY_MASTERED ? now : null},
             ${isCorrect ? 1 : 0}, 0, ${isCorrect ? today : null},
             ${trialId}, ${now}, ${now})
        ON CONFLICT(userId, wordId) DO UPDATE SET
            status = ${status},
            mastery = CASE WHEN ${isCorrectFlag} = 1
                           THEN MIN(mastery + 1, ${MASTERY_MAX})
                           ELSE MAX(mastery - 1, 0) END,
            strongDays = CASE
                WHEN ${isCorrectFlag} = 1 AND (lastStrongDay IS NULL OR lastStrongDay != ${today})
                THEN strongDays + 1 ELSE strongDays END,
            strongAt = CASE
                WHEN strongAt IS NULL
                 AND (CASE WHEN ${isCorrectFlag} = 1 AND (lastStrongDay IS NULL OR lastStrongDay != ${today})
                           THEN strongDays + 1 ELSE strongDays END) >= ${STRONG_DAYS_REQUIRED}
                 AND recallDays >= ${RECALL_DAYS_REQUIRED}
                THEN ${now} ELSE strongAt END,
            lastStrongDay = CASE WHEN ${isCorrectFlag} = 1 THEN ${today} ELSE lastStrongDay END,
            seenCount = seenCount + 1,
            correctCount = correctCount + ${isCorrect ? 1 : 0},
            incorrectCount = incorrectCount + ${isCorrect ? 0 : 1},
            streak = CASE WHEN ${isCorrectFlag} = 1 THEN streak + 1 ELSE 0 END,
            lastSeenAt = ${now},
            lastCorrectAt = CASE WHEN ${isCorrectFlag} = 1 THEN ${now} ELSE lastCorrectAt END,
            lastIncorrectAt = CASE WHEN ${isCorrectFlag} = 1 THEN lastIncorrectAt ELSE ${now} END,
            masteredAt = CASE
                WHEN masteredAt IS NULL
                 AND (CASE WHEN ${isCorrectFlag} = 1
                           THEN MIN(mastery + 1, ${MASTERY_MAX})
                           ELSE MAX(mastery - 1, 0) END) >= ${MASTERY_MASTERED}
                THEN ${now} ELSE masteredAt END,
            trialClaimId = ${trialId},
            updatedAt = ${now}
        WHERE trialClaimId IS NULL OR trialClaimId != ${trialId}
    `;

    return updated === 1;
};

/**
 * Best-effort audit row for one word's trial result. Never gates the reward (that lives
 * entirely in `applyWordReward` above) — this only fills in the ledger if a prior call
 * granted the reward but died before recording it, or races a concurrent healer. Either
 * way a missing/duplicate attempt here has zero effect on progress.
 */
const healAttemptLedger = async (
    prisma: Variables["prisma"],
    userId: string,
    wordId: string,
    trialId: string,
    trial: { level: string | null; unit: number | null },
    isCorrect: boolean,
) => {
    const existing = await prisma.userWordAttempt.findUnique({
        where: { userId_wordId_trialId: { userId, wordId, trialId } },
        select: { id: true },
    });
    if (existing) return;

    // One statement avoids throwing/logging a Prisma constraint error when two claim
    // retries heal the same audit row concurrently. The audit remains independent of
    // the reward write above.
    await prisma.$executeRaw`
        INSERT OR IGNORE INTO UserWordAttempt
            (id, userId, wordId, trialId, level, unit, activityType, result,
             answer, correctAnswer, createdAt)
        VALUES
            (${crypto.randomUUID()}, ${userId}, ${wordId}, ${trialId},
             ${trial.level ?? ""}, ${trial.unit}, 'trial',
             ${isCorrect ? "correct" : "incorrect"}, '', '', ${new Date()})
    `;
};

/**
 * Replays a completed trial's answers into real progress, then marks the trial claimed.
 * Shared by `/practice/claim` and the magic-link verify handoff (index.ts) so both grant
 * the identical, server-computed reward — never a client-reported score.
 *
 * Retry-safe with no transaction: each word's reward is applied by one atomic UPSERT
 * (`applyWordReward`) whose own `WHERE` clause is the idempotency check, not a
 * ledger row written beforehand. If the isolate dies partway through the loop, the next
 * call re-enters, re-derives the same per-word results from the trial's stored answers,
 * and for each word either performs the still-pending atomic write or finds the guard
 * already satisfied and skips straight to healing that word's audit row — never a
 * double-applied mastery bump, never a silently dropped one. `claimedAt` is only a
 * fast-path/status marker for the caller (`applied` vs `duplicate`); it plays no part in
 * the reward's correctness.
 */
export const applyTrialClaim = async (
    c: Ctx,
    userId: string,
    trialId: string,
): Promise<{ applied: boolean; correctCount: number; total: number } | null> => {
    const prisma = c.get("prisma");
    const trial = await prisma.practiceTrial.findUnique({ where: { id: trialId } });

    if (!trial || !trial.completedAt || trial.expiresAt <= new Date()) return null;

    const targetIds = parseWordIds(trial.wordIds);
    const answers = parseAnswers(trial.answers);
    const total = targetIds.length;
    const correctCount = answers.filter(Boolean).length;

    if (trial.claimedAt) {
        return { applied: false, correctCount, total };
    }

    const now = new Date();
    const trialMeta = { level: trial.level, unit: trial.unit };

    // The claimant's own day boundary, read once (backend/src/mastery.ts). A trial is
    // claimed at signup, so this is usually the very first day of their evidence.
    const claimant = await prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
    });
    const claimTimezone = claimant?.timezone ?? null;

    for (const [index, wordId] of targetIds.entries()) {
        const isCorrect = answers[index] ?? false;

        // Whether this call is the one that actually grants the reward or finds it
        // already granted by an earlier, partial run, the ledger still needs healing —
        // that's the point of keeping the two steps independent.
        await applyWordReward(
            prisma, userId, wordId, trialId, trialMeta, isCorrect, now, claimTimezone,
        );
        await healAttemptLedger(prisma, userId, wordId, trialId, trialMeta, isCorrect);
    }

    // Every word has an up-to-date UserWordProgress row and a healed audit row. Whether
    // *this* call is the one that gets to report `applied: true` comes down to who wins
    // this conditional flip — a concurrent caller doing the identical work above would
    // still land here having applied nothing new, and this is the only check that can
    // tell the two apart.
    const flipped = await prisma.$executeRaw`
        UPDATE PracticeTrial
        SET claimedAt = ${now}
        WHERE id = ${trialId} AND claimedAt IS NULL
    `;

    return { applied: flipped === 1, correctCount, total };
};

practice.post("/practice/claim", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const claimCookie = getCookie(c, TRIAL_CLAIM_COOKIE);
    if (!claimCookie) return c.json({ message: "No completed trial to claim" }, 400);

    const trialId = await verifyTrialClaim(c, claimCookie);
    if (!trialId) return c.json({ message: "Invalid or expired trial claim" }, 400);

    const result = await applyTrialClaim(c, userId, trialId);
    // Keep the signed claim as an inert retry receipt until its normal expiry. Deleting
    // it before the client receives this response makes a lost 200 impossible to retry
    // idempotently. `claimedAt` ensures the retained receipt cannot grant reward twice.
    deleteCookie(c, TRIAL_ID_COOKIE, { path: "/" });

    if (!result) return c.json({ message: "Trial not found, expired, or not completed" }, 404);

    return c.json({
        ok: true,
        duplicate: !result.applied,
        correctCount: result.correctCount,
        total: result.total,
    });
});
