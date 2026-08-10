import { Hono, type Context } from "hono";

import type { Bindings, Variables } from "./index.js";
import { MASTERY_MASTERED } from "./progress.js";

type Env = { Bindings: Bindings; Variables: Variables };
type Ctx = Context<Env>;

/**
 * The merged eight-item mixed session that replaces lesson→quiz
 * (LEARNER-LIFECYCLE.md §0, §3.5, §3.10, §4.1, §8 L2). Same server-authoritative shape as
 * `practice.ts`: the client is served items with no answer key, submits one selection (or
 * one typed spelling) per item, and the server is the only thing that ever decides
 * correctness or reward. The item-slot budget stays 8 so the §4.0 arithmetic
 * (~3 slots to "strong", ~6 to "mastered") is not silently changed by this feature.
 *
 * `itemTypes[i]` is chosen server-side, never by the client, so a client cannot bias its
 * own mix toward easier types. `match-pairs` and `speed-round` are scheduled as
 * warm-up-only per §4.1 ("never as proof of mastery"): answering them still fills their
 * item-slot and counts toward the session score, but does not move `mastery` or
 * `nextReviewAt` — only `choose-meaning`, `choose-word` and `spelling` do.
 */

const SESSION_ITEM_COUNT = 8;
const OPTION_COUNT = 4;
const POOL_SIZE = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A comeback session is deliberately short (LEARNER-LIFECYCLE.md §2 "returning") — a
 * returning learner is re-eased in with a handful of items they can win, not a full eight.
 * "Up to 5, minimum 3 when the content exists" keeps it a real session while staying under
 * the normal budget.
 */
const COMEBACK_MAX = 5;

/** A word is "previously strong" — safe to lead a comeback with — at mastery 3+ (§4.0). */
const COMEBACK_STRONG_MASTERY = 3;

const SESSION_MODES = ["normal", "comeback", "review"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

/**
 * Mode is client-selected but never client-trusted for anything it decides: it only picks
 * *which* server-side selection strategy runs. An unknown/absent value is the default
 * eight-item session, so an old client that sends no mode keeps working unchanged.
 */
const parseMode = (value: unknown): SessionMode =>
    value === "comeback" || value === "review" ? value : "normal";

/** recognition(0) -> recall(choose-word) -> spelling -> due recall -> warm-ups -> revisit. */
const ITEM_TYPE_SCHEDULE = [
    "choose-meaning",
    "choose-meaning",
    "choose-word",
    "spelling",
    "choose-meaning",
    "match-pairs",
    "speed-round",
    "choose-meaning",
] as const;

export type SessionItemType = (typeof ITEM_TYPE_SCHEDULE)[number];

/** Item types that feed the SRS ladder. match-pairs/speed-round are warm-up only (§4.1). */
const isGradedForMastery = (type: string) =>
    type === "choose-meaning" || type === "choose-word" || type === "spelling";

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

const parseJsonArray = <T>(raw: string, guard: (v: unknown) => v is T): T[] => {
    try {
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value.filter(guard) : [];
    } catch {
        return [];
    }
};

const isString = (v: unknown): v is string => typeof v === "string";
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

type PoolEntry = { id: string; partOfSpeech: string };
const isPoolEntry = (v: unknown): v is PoolEntry =>
    typeof v === "object" &&
    v !== null &&
    typeof (v as PoolEntry).id === "string" &&
    typeof (v as PoolEntry).partOfSpeech === "string";

type PoolWord = {
    id: string;
    displayWord: string;
    partOfSpeech: string;
    meaningTh: string;
    pronunciationTh: string;
};

const wordSelect = {
    id: true,
    displayWord: true,
    partOfSpeech: true,
    meaningTh: true,
    pronunciationTh: true,
} as const;

/** Same derivation strategy as practice.ts: same-part-of-speech distractors preferred. */
const deriveOptionIds = (
    sessionId: string,
    index: number,
    targetId: string,
    pool: PoolEntry[],
): string[] => {
    const rand = mulberry32(seedFrom(`${sessionId}:${index}`));
    const targetPos = pool.find((entry) => entry.id === targetId)?.partOfSpeech;
    const others = pool.filter((entry) => entry.id !== targetId);
    const samePos = others.filter((entry) => entry.partOfSpeech === targetPos).map((e) => e.id);
    const rest = others.filter((entry) => entry.partOfSpeech !== targetPos).map((e) => e.id);
    const distractors = shuffled([...samePos, ...rest], rand).slice(0, OPTION_COUNT - 1);
    return shuffled([targetId, ...distractors], rand);
};

const promptFace = (word: PoolWord | undefined, direction: "meaning" | "word") =>
    word &&
    (direction === "meaning"
        ? { displayWord: word.displayWord, partOfSpeech: word.partOfSpeech, pronunciationTh: word.pronunciationTh }
        : { meaningTh: word.meaningTh, partOfSpeech: word.partOfSpeech });

const optionFace = (word: PoolWord | undefined, direction: "meaning" | "word") =>
    word &&
    (direction === "meaning"
        ? { meaningTh: word.meaningTh, partOfSpeech: word.partOfSpeech }
        : { displayWord: word.displayWord, partOfSpeech: word.partOfSpeech });

/**
 * Picks up to `SESSION_ITEM_COUNT` target words, due reviews first
 * (LEARNER-LIFECYCLE.md §3.6 "Due words or recent mistakes" is item one on the Today
 * card), then unseen words from the level/unit, then any remaining published word in the
 * level so a session is never short just because a unit is nearly finished.
 */
const pickSessionWords = async (
    prisma: Variables["prisma"],
    userId: string,
    level: string,
    unit: number | null,
): Promise<{ wordIds: string[]; dueWordIds: string[] }> => {
    const now = new Date();

    const due = await prisma.userWordProgress.findMany({
        where: { userId, level, nextReviewAt: { lte: now }, word: { status: "published" } },
        orderBy: { nextReviewAt: "asc" },
        take: SESSION_ITEM_COUNT,
        select: { wordId: true },
    });

    const dueWordIds = due.map((d) => d.wordId);
    const chosen = new Set(dueWordIds);

    if (chosen.size < SESSION_ITEM_COUNT) {
        const fresh = await prisma.vocabWord.findMany({
            where: {
                status: "published",
                meaningTh: { not: "" },
                level,
                ...(unit !== null ? { unit } : {}),
                wordProgresses: { none: { userId } },
            },
            orderBy: { sourceOrder: "asc" },
            take: SESSION_ITEM_COUNT,
            select: { id: true },
        });
        for (const w of fresh) {
            if (chosen.size >= SESSION_ITEM_COUNT) break;
            chosen.add(w.id);
        }
    }

    if (chosen.size < SESSION_ITEM_COUNT) {
        const any = await prisma.vocabWord.findMany({
            where: { status: "published", meaningTh: { not: "" }, level },
            orderBy: { sourceOrder: "asc" },
            take: SESSION_ITEM_COUNT * 2,
            select: { id: true },
        });
        for (const w of any) {
            if (chosen.size >= SESSION_ITEM_COUNT) break;
            chosen.add(w.id);
        }
    }

    return { wordIds: Array.from(chosen).slice(0, SESSION_ITEM_COUNT), dueWordIds };
};

/**
 * Comeback selection for a returning learner (LEARNER-LIFECYCLE.md §2): up to
 * `COMEBACK_MAX`, and at least three whenever the level has that many ready words, so the
 * set is never so short it isn't a session. Priority is confidence-first — words the
 * learner was already strong on (`mastery >= COMEBACK_STRONG_MASTERY`), then anything now
 * due, then a safe published fallback so the minimum is always reachable. Every target is a
 * real published word, and `itemTypes`/pool derivation are identical to the normal path, so
 * `/progress/session/answer` grades a comeback session with no special-casing.
 */
const pickComebackWords = async (
    prisma: Variables["prisma"],
    userId: string,
    level: string,
): Promise<{ wordIds: string[]; dueWordIds: string[] }> => {
    const now = new Date();

    const strong = await prisma.userWordProgress.findMany({
        where: {
            userId,
            level,
            mastery: { gte: COMEBACK_STRONG_MASTERY },
            word: { status: "published" },
        },
        orderBy: { lastSeenAt: "desc" },
        take: COMEBACK_MAX,
        select: { wordId: true },
    });

    const due = await prisma.userWordProgress.findMany({
        where: { userId, level, nextReviewAt: { lte: now }, word: { status: "published" } },
        orderBy: { nextReviewAt: "asc" },
        take: COMEBACK_MAX,
        select: { wordId: true },
    });
    const dueSet = new Set(due.map((d) => d.wordId));

    const chosen = new Set<string>();
    for (const s of strong) {
        if (chosen.size >= COMEBACK_MAX) break;
        chosen.add(s.wordId);
    }
    for (const d of due) {
        if (chosen.size >= COMEBACK_MAX) break;
        chosen.add(d.wordId);
    }

    if (chosen.size < COMEBACK_MAX) {
        const fallback = await prisma.vocabWord.findMany({
            where: { status: "published", meaningTh: { not: "" }, level },
            orderBy: { sourceOrder: "asc" },
            take: COMEBACK_MAX * 2,
            select: { id: true },
        });
        for (const w of fallback) {
            if (chosen.size >= COMEBACK_MAX) break;
            chosen.add(w.id);
        }
    }

    const wordIds = Array.from(chosen).slice(0, COMEBACK_MAX);
    return { wordIds, dueWordIds: wordIds.filter((id) => dueSet.has(id)) };
};

/**
 * Review selection (LEARNER-LIFECYCLE.md §3.6): only words whose SRS review is actually
 * due (`nextReviewAt <= now`), zero to eight of them. Unlike normal/comeback there is no
 * fallback — a review with nothing due is genuinely empty, and the caller returns a 200
 * empty result rather than minting a session over unrelated words.
 */
const pickReviewWords = async (
    prisma: Variables["prisma"],
    userId: string,
    level: string,
): Promise<{ wordIds: string[]; dueWordIds: string[] }> => {
    const now = new Date();
    const due = await prisma.userWordProgress.findMany({
        where: { userId, level, nextReviewAt: { lte: now }, word: { status: "published" } },
        orderBy: { nextReviewAt: "asc" },
        take: SESSION_ITEM_COUNT,
        select: { wordId: true },
    });
    const wordIds = due.map((d) => d.wordId);
    return { wordIds, dueWordIds: [...wordIds] };
};

export const session = new Hono<Env>();

/** Re-derives the served item list from a session record's stored fields — used both for
 *  a freshly created session and for resuming an already-open one, so both return the
 *  exact same shape from the exact same logic. */
const buildItems = (
    sessionId: string,
    targetIds: string[],
    itemTypes: string[],
    poolEntries: PoolEntry[],
    wordsById: Map<string, PoolWord>,
) =>
    targetIds.map((targetId, index) => {
        const type = itemTypes[index] ?? "choose-meaning";
        const direction = type === "choose-word" ? "word" : "meaning";
        if (type === "spelling") {
            // No options: the client renders a text field. The target word itself is
            // never sent — only what to translate from.
            return {
                index,
                type,
                prompt: { meaningTh: wordsById.get(targetId)?.meaningTh ?? "" },
            };
        }
        const optionIds = deriveOptionIds(sessionId, index, targetId, poolEntries);
        return {
            index,
            type,
            prompt: promptFace(wordsById.get(targetId), direction),
            options: optionIds.map((id) => optionFace(wordsById.get(id), direction)),
        };
    });

session.post("/progress/session/start", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req
        .json<{ level?: string; unit?: unknown; mode?: unknown }>()
        .catch(() => ({}));
    const level = typeof body.level === "string" ? body.level : "A1";
    const mode = parseMode(body.mode);
    // Review is level-wide ("everything due right now"), never scoped to one unit; normal
    // and comeback keep the requested unit (or null) as their scope.
    const unit = mode === "review" ? null : parseUnit(body.unit);

    const prisma = c.get("prisma");

    // Never mint a second open session: a learner who reloads, backgrounds the tab, or
    // double-taps "start" gets the same session handed back, not a competing one racing it
    // for the same words' rewards. Resume is now gated on *compatibility* — the open
    // session must match the requested mode and scope (level + unit), so a learner who
    // asks for a `review` while a `normal` session is open isn't served the normal set's
    // items under the review label. There is at most one open session per learner by
    // construction (partial unique index), so an incompatible open session falls through to
    // fresh selection below, where the index makes any create a resume of the existing row.
    const openSession = await prisma.mixedSession.findFirst({
        where: { userId, completedAt: null },
        orderBy: { createdAt: "desc" },
    });

    const isResumable =
        openSession !== null &&
        (openSession.mode ?? "normal") === mode &&
        openSession.level === level &&
        openSession.unit === unit;

    if (openSession && isResumable) {
        const targetIds = parseJsonArray(openSession.wordIds, isString);
        const itemTypes = parseJsonArray(openSession.itemTypes, isString);
        const poolEntries = parseJsonArray(openSession.poolIds, isPoolEntry);
        const dueWordIds = parseJsonArray(openSession.dueWordIds, isString);

        const poolWords = await prisma.vocabWord.findMany({
            where: { id: { in: poolEntries.map((p) => p.id) } },
            select: wordSelect,
        });
        const wordsById = new Map(poolWords.map((w) => [w.id, w]));

        return c.json({
            sessionId: openSession.id,
            level: openSession.level,
            unit: openSession.unit,
            mode: openSession.mode ?? "normal",
            itemCount: targetIds.length,
            dueCount: dueWordIds.length,
            items: buildItems(openSession.id, targetIds, itemTypes, poolEntries, wordsById),
        });
    }

    if (openSession) {
        return c.json({ message: "Finish or leave the open session before starting another mode" }, 409);
    }

    const { wordIds: targetIds, dueWordIds } =
        mode === "comeback"
            ? await pickComebackWords(prisma, userId, level)
            : mode === "review"
              ? await pickReviewWords(prisma, userId, level)
              : await pickSessionWords(prisma, userId, level, unit);

    // A review with nothing due is a valid, empty result — not an error and not a session.
    // The client is told there is nothing to review (sessionId null, no items) and no open
    // session is created, so the learner's next "start" is free to be a normal one.
    if (mode === "review" && targetIds.length === 0) {
        return c.json({
            sessionId: null,
            level,
            unit: null,
            mode,
            itemCount: 0,
            dueCount: 0,
            items: [],
        });
    }

    if (targetIds.length === 0) {
        return c.json({ message: "Not enough published content for a session" }, 422);
    }

    const pool: PoolWord[] = await prisma.vocabWord.findMany({
        where: { status: "published", meaningTh: { not: "" }, level },
        orderBy: { sourceOrder: "asc" },
        take: POOL_SIZE,
        select: wordSelect,
    });
    // The pool must always contain every target, even past POOL_SIZE truncation.
    const wordsById = new Map(pool.map((w) => [w.id, w]));
    const missingTargets = await prisma.vocabWord.findMany({
        where: { id: { in: targetIds.filter((id) => !wordsById.has(id)) } },
        select: wordSelect,
    });
    for (const w of missingTargets) wordsById.set(w.id, w);
    const poolEntries: PoolEntry[] = [...wordsById.values()].map((w) => ({
        id: w.id,
        partOfSpeech: w.partOfSpeech,
    }));

    const sessionId = crypto.randomUUID();
    const itemTypes = ITEM_TYPE_SCHEDULE.slice(0, targetIds.length);

    // A concurrent double-tap of "start" can race here: both requests pass the
    // `openSession` check above (neither has committed yet) and both attempt to create a
    // row. Only one MixedSession is meant to exist per open learner session, so let the
    // loser fall back to the resume path instead of silently minting a second row.
    try {
        await prisma.mixedSession.create({
            data: {
                id: sessionId,
                userId,
                level,
                unit,
                mode,
                wordIds: JSON.stringify(targetIds),
                itemTypes: JSON.stringify(itemTypes),
                poolIds: JSON.stringify(poolEntries),
                dueWordIds: JSON.stringify(dueWordIds),
            },
        });
    } catch {
        const fallback = await prisma.mixedSession.findFirst({
            where: { userId, completedAt: null },
            orderBy: { createdAt: "desc" },
        });
        if (!fallback) throw new Error("session create failed and no open session to resume");
        const fbTargetIds = parseJsonArray(fallback.wordIds, isString);
        const fbItemTypes = parseJsonArray(fallback.itemTypes, isString);
        const fbPoolEntries = parseJsonArray(fallback.poolIds, isPoolEntry);
        const fbDueWordIds = parseJsonArray(fallback.dueWordIds, isString);
        const fbPoolWords = await prisma.vocabWord.findMany({
            where: { id: { in: fbPoolEntries.map((p) => p.id) } },
            select: wordSelect,
        });
        const fbWordsById = new Map(fbPoolWords.map((w) => [w.id, w]));
        return c.json({
            sessionId: fallback.id,
            level: fallback.level,
            unit: fallback.unit,
            mode: fallback.mode ?? "normal",
            itemCount: fbTargetIds.length,
            dueCount: fbDueWordIds.length,
            items: buildItems(fallback.id, fbTargetIds, fbItemTypes, fbPoolEntries, fbWordsById),
        });
    }

    const items = buildItems(sessionId, targetIds, itemTypes, poolEntries, wordsById);

    return c.json({
        sessionId,
        level,
        unit,
        mode,
        itemCount: items.length,
        dueCount: dueWordIds.length,
        items,
    });
});

const normalizeSpelling = (value: string) => value.trim().toLowerCase();

session.post("/progress/session/answer", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req.json<{
        sessionId?: string;
        itemIndex?: unknown;
        selectedOptionIndex?: unknown;
        spelling?: unknown;
    }>();

    const sessionId = body.sessionId;
    const itemIndex = parseUnit(body.itemIndex);
    if (!sessionId || itemIndex === null) {
        return c.json({ message: "sessionId and itemIndex are required" }, 400);
    }

    const prisma = c.get("prisma");
    let record = await prisma.mixedSession.findUnique({ where: { id: sessionId } });
    if (!record || record.userId !== userId) {
        return c.json({ message: "Session not found" }, 404);
    }

    const targetIds = parseJsonArray(record.wordIds, isString);
    const itemTypes = parseJsonArray(record.itemTypes, isString);
    const poolEntries = parseJsonArray(record.poolIds, isPoolEntry);
    const dueWordIds = new Set(parseJsonArray(record.dueWordIds, isString));

    if (itemIndex < 0 || itemIndex >= targetIds.length) {
        return c.json({ message: "itemIndex out of range" }, 400);
    }

    const targetId = targetIds[itemIndex];
    const type = itemTypes[itemIndex] ?? "choose-meaning";
    const word = await prisma.vocabWord.findUnique({
        where: { id: targetId },
        select: wordSelect,
    });

    let correct: boolean;
    if (type === "spelling") {
        const typed = typeof body.spelling === "string" ? body.spelling : "";
        correct = word !== null && normalizeSpelling(typed) === normalizeSpelling(word.displayWord);
    } else {
        const selectedOptionIndex = parseUnit(body.selectedOptionIndex);
        if (selectedOptionIndex === null) {
            return c.json({ message: "selectedOptionIndex is required" }, 400);
        }
        const correctOptionIndex = deriveOptionIds(sessionId, itemIndex, targetId, poolEntries).indexOf(
            targetId,
        );
        correct = selectedOptionIndex === correctOptionIndex;
    }

    const respond = (answers: boolean[], done: boolean, duplicate: boolean) =>
        c.json({
            itemIndex,
            correct: answers[itemIndex],
            done,
            duplicate,
            ...(type === "spelling" && word ? { correctSpelling: word.displayWord } : {}),
            ...(done
                ? { correctCount: answers.filter(Boolean).length, total: targetIds.length }
                : {}),
        });

    // Same compare-and-swap pattern as practice.ts: D1 has no transactions, so the WHERE
    // clause on current answer-array length is the only concurrency guard available.
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const answers = parseJsonArray(record.answers, isBoolean);

        if (itemIndex < answers.length) {
            const done = record.completedAt !== null;
            // A retry landing here (double submit, or a client resuming after the
            // process died between marking the session done and finishing the reward
            // loop) must still be able to heal a partially-applied reward — replaying
            // the answer is the only signal the client can give that it isn't sure the
            // previous call finished. `applySessionReward` is itself idempotent per word
            // (atomic UPSERT guarded by `lastSessionRewardId`), so calling it again here
            // is always safe, never a double-apply.
            if (done) await applySessionReward(prisma, userId, sessionId);
            return respond(answers, done, true);
        }
        if (itemIndex !== answers.length) {
            return c.json({ message: "Items must be answered in order" }, 400);
        }

        const nextAnswers = [...answers, correct];
        const done = nextAnswers.length === targetIds.length;
        const correctCount = nextAnswers.filter(Boolean).length;
        const now = new Date();

        const updated = await prisma.$executeRaw`
            UPDATE MixedSession
            SET answers = ${JSON.stringify(nextAnswers)},
                correctCount = ${correctCount},
                completedAt = ${done ? now : null},
                updatedAt = ${now}
            WHERE id = ${sessionId} AND json_array_length(answers) = ${answers.length}
        `;

        if (updated === 1) {
            if (done) {
                await applySessionReward(prisma, userId, sessionId);
            }
            return respond(nextAnswers, done, false);
        }

        const reloaded = await prisma.mixedSession.findUnique({ where: { id: sessionId } });
        if (!reloaded) return c.json({ message: "Session not found" }, 404);
        record = reloaded;
    }

    return c.json({ message: "Could not record answer, please retry" }, 409);
});

const reviewIntervalDays = (mastery: number) =>
    [1, 1, 3, 7, 14, 30][Math.min(Math.max(mastery, 0), 5)];

/**
 * Applies one word's session result to its UserWordProgress row and marks that row with
 * this session's id, in a single atomic UPSERT — the same shape as practice.ts's
 * `applyWordReward`, and for the same reason: D1 gives no transaction to hold "read
 * mastery, then write it" together, so the whole read-modify-write has to happen as one
 * statement or a crash between the two steps (or a legitimate concurrent retry) can
 * double-apply or silently skip the reward. The `WHERE` on the `DO UPDATE` is the entire
 * idempotency mechanism: if `lastSessionRewardId` already equals this session's id, the
 * conflict branch matches zero rows (a no-op, not an error).
 *
 * `mastery`'s new value and the resulting `nextReviewAt` are both computed *inside* the
 * SQL from the row's own pre-update `mastery` column — never from a value read in a
 * separate query — which is what makes two concurrent calls for the same word safe: each
 * sees whatever `mastery` SQLite hands it at the moment it runs, atomically.
 *
 * match-pairs/speed-round items call `applyWarmupWordReward` instead: they still count as
 * "seen" but never move `mastery`/`streak`/`nextReviewAt` (§4.1 — "never as proof of
 * mastery").
 */
const applyGradedWordReward = async (
    prisma: Variables["prisma"],
    userId: string,
    wordId: string,
    sessionId: string,
    session: { level: string; unit: number | null },
    isCorrect: boolean,
    now: Date,
): Promise<void> => {
    const isCorrectFlag = isCorrect ? 1 : 0;
    const initialMastery = isCorrect ? 1 : 0;
    const reviewDates = [1, 1, 3, 7, 14, 30].map((days) => new Date(now.getTime() + days * DAY_MS));

    await prisma.$executeRaw`
        INSERT INTO UserWordProgress
            (id, userId, wordId, level, unit, status, mastery, seenCount, knownCount,
             reviewCount, correctCount, incorrectCount, streak, lastSeenAt, lastCorrectAt,
             lastIncorrectAt, nextReviewAt, masteredAt, lastSessionRewardId, createdAt, updatedAt)
        VALUES
            (${crypto.randomUUID()}, ${userId}, ${wordId}, ${session.level}, ${session.unit},
             ${isCorrect ? "known" : "review"}, ${initialMastery}, 1, 0, 0,
             ${isCorrect ? 1 : 0}, ${isCorrect ? 0 : 1}, ${isCorrect ? 1 : 0}, ${now},
             ${isCorrect ? now : null}, ${isCorrect ? null : now},
             ${reviewDates[initialMastery]},
             ${initialMastery >= MASTERY_MASTERED ? now : null},
             ${sessionId}, ${now}, ${now})
        ON CONFLICT(userId, wordId) DO UPDATE SET
            status = ${isCorrect ? "known" : "review"},
            mastery = CASE WHEN ${isCorrectFlag} = 1
                           THEN MIN(mastery + 1, ${MASTERY_MASTERED})
                           ELSE MAX(mastery - 1, 0) END,
            seenCount = seenCount + 1,
            correctCount = correctCount + ${isCorrect ? 1 : 0},
            incorrectCount = incorrectCount + ${isCorrect ? 0 : 1},
            streak = CASE WHEN ${isCorrectFlag} = 1 THEN streak + 1 ELSE 0 END,
            lastSeenAt = ${now},
            lastCorrectAt = CASE WHEN ${isCorrectFlag} = 1 THEN ${now} ELSE lastCorrectAt END,
            lastIncorrectAt = CASE WHEN ${isCorrectFlag} = 1 THEN lastIncorrectAt ELSE ${now} END,
            nextReviewAt = CASE
                (CASE WHEN ${isCorrectFlag} = 1
                      THEN MIN(mastery + 1, ${MASTERY_MASTERED})
                      ELSE MAX(mastery - 1, 0) END)
                WHEN 0 THEN ${reviewDates[0]}
                WHEN 1 THEN ${reviewDates[1]}
                WHEN 2 THEN ${reviewDates[2]}
                WHEN 3 THEN ${reviewDates[3]}
                WHEN 4 THEN ${reviewDates[4]}
                ELSE ${reviewDates[5]}
            END,
            masteredAt = CASE
                WHEN (CASE WHEN ${isCorrectFlag} = 1
                           THEN MIN(mastery + 1, ${MASTERY_MASTERED})
                           ELSE MAX(mastery - 1, 0) END) >= ${MASTERY_MASTERED}
                THEN ${now} ELSE masteredAt END,
            lastSessionRewardId = ${sessionId},
            updatedAt = ${now}
        WHERE lastSessionRewardId IS NULL OR lastSessionRewardId != ${sessionId}
    `;
};

/** match-pairs/speed-round: counts as seen, never moves mastery/streak/nextReviewAt. */
const applyWarmupWordReward = async (
    prisma: Variables["prisma"],
    userId: string,
    wordId: string,
    sessionId: string,
    session: { level: string; unit: number | null },
    isCorrect: boolean,
    now: Date,
): Promise<void> => {
    await prisma.$executeRaw`
        INSERT INTO UserWordProgress
            (id, userId, wordId, level, unit, status, mastery, seenCount, knownCount,
             reviewCount, correctCount, incorrectCount, streak, lastSeenAt, lastCorrectAt,
             lastIncorrectAt, nextReviewAt, masteredAt, lastSessionRewardId, createdAt, updatedAt)
        VALUES
            (${crypto.randomUUID()}, ${userId}, ${wordId}, ${session.level}, ${session.unit},
             ${isCorrect ? "known" : "review"}, 0, 1, 0, 0,
             ${isCorrect ? 1 : 0}, ${isCorrect ? 0 : 1}, 0, ${now},
             ${isCorrect ? now : null}, ${isCorrect ? null : now},
             ${new Date(now.getTime() + DAY_MS)}, null,
             ${sessionId}, ${now}, ${now})
        ON CONFLICT(userId, wordId) DO UPDATE SET
            status = ${isCorrect ? "known" : "review"},
            seenCount = seenCount + 1,
            correctCount = correctCount + ${isCorrect ? 1 : 0},
            incorrectCount = incorrectCount + ${isCorrect ? 0 : 1},
            lastSeenAt = ${now},
            lastCorrectAt = CASE WHEN ${isCorrect ? 1 : 0} = 1 THEN ${now} ELSE lastCorrectAt END,
            lastIncorrectAt = CASE WHEN ${isCorrect ? 1 : 0} = 1 THEN lastIncorrectAt ELSE ${now} END,
            lastSessionRewardId = ${sessionId},
            updatedAt = ${now}
        WHERE lastSessionRewardId IS NULL OR lastSessionRewardId != ${sessionId}
    `;
};

/**
 * Best-effort audit row for one word's session result. Never gates the reward (that lives
 * entirely in `applyGradedWordReward`/`applyWarmupWordReward` above) — this only fills in
 * the ledger if a prior call granted the reward but died before recording it, or races a
 * concurrent healer. Either way a missing/duplicate attempt here has zero effect on
 * progress. Mirrors `healAttemptLedger` in practice.ts.
 */
const healSessionAttemptLedger = async (
    prisma: Variables["prisma"],
    userId: string,
    wordId: string,
    sessionId: string,
    session: { level: string; unit: number | null },
    isCorrect: boolean,
): Promise<void> => {
    await prisma.$executeRaw`
        INSERT OR IGNORE INTO UserWordAttempt
            (id, userId, wordId, trialId, level, unit, activityType, result,
             answer, correctAnswer, createdAt)
        VALUES
            (${crypto.randomUUID()}, ${userId}, ${wordId}, ${`session:${sessionId}`},
             ${session.level}, ${session.unit}, 'session',
             ${isCorrect ? "correct" : "incorrect"}, '', '', ${new Date()})
    `;
};

/**
 * Applies every word in a completed session's answers, then marks the session's own
 * `rewardAppliedAt` — informational only (surfaced nowhere that gates correctness), since
 * the actual idempotency guarantee lives per-word on `UserWordProgress.lastSessionRewardId`
 * above. Safe to call any number of times for the same session, including concurrently:
 * every write it makes is itself an atomic, idempotent, per-word UPSERT.
 */
const applySessionReward = async (
    prisma: Variables["prisma"],
    userId: string,
    sessionId: string,
): Promise<void> => {
    const record = await prisma.mixedSession.findUnique({ where: { id: sessionId } });
    if (!record) return;

    const targetIds = parseJsonArray(record.wordIds, isString);
    const itemTypes = parseJsonArray(record.itemTypes, isString);
    const answers = parseJsonArray(record.answers, isBoolean);
    const now = new Date();
    const sessionMeta = { level: record.level, unit: record.unit };

    for (const [index, wordId] of targetIds.entries()) {
        const isCorrect = answers[index] ?? false;
        const type = itemTypes[index] ?? "choose-meaning";

        if (isGradedForMastery(type)) {
            await applyGradedWordReward(prisma, userId, wordId, sessionId, sessionMeta, isCorrect, now);
        } else {
            await applyWarmupWordReward(prisma, userId, wordId, sessionId, sessionMeta, isCorrect, now);
        }
        await healSessionAttemptLedger(prisma, userId, wordId, sessionId, sessionMeta, isCorrect);
    }

    // Purely a status marker for callers that inspect it (none currently gate on it) —
    // whichever concurrent call wins this flip, the per-word rewards above are already
    // correct and complete either way.
    await prisma.$executeRaw`
        UPDATE MixedSession SET rewardAppliedAt = ${now} WHERE id = ${sessionId} AND rewardAppliedAt IS NULL
    `;
};

/** Read-only status check used by the completion screen / Today card after a refresh. */
session.get("/progress/session/:id", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const record = await c.get("prisma").mixedSession.findUnique({
        where: { id: c.req.param("id") },
    });
    if (!record || record.userId !== userId) return c.json({ message: "Not found" }, 404);

    const answers = parseJsonArray(record.answers, isBoolean);
    return c.json({
        sessionId: record.id,
        level: record.level,
        unit: record.unit,
        answeredCount: answers.length,
        total: parseJsonArray(record.wordIds, isString).length,
        correctCount: record.correctCount,
        done: record.completedAt !== null,
    });
});
