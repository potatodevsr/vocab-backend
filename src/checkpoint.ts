import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * The end-of-unit checkpoint (schema.prisma `UnitCheckpoint`): a fixed five-item graded
 * gate over words the learner has *already met* in the unit. Same server-authoritative
 * shape as `session.ts` and `practice.ts` — the client is served items with no answer key
 * (no word ids, no slugs, no "which option is right", and for a spelling item not even the
 * target word), submits one selection or one typed spelling per item, and the server is the
 * only thing that ever decides correctness. `wordIds[i]` is the target of item `i`,
 * `itemTypes[i]` picks that item's variant, and `poolIds` is the fixed candidate pool
 * distractors are drawn from — all persisted so the answer path can re-derive the exact
 * shuffle the client saw without ever transmitting a "correct option" field.
 *
 * The gate is deliberately narrow: only published, meaningful words the learner has a
 * `UserWordProgress` row for count, because a checkpoint proves a unit was *learned*, not
 * that its words exist. Fewer than five such words is not an error the learner caused — it
 * is "come back after more practice", so it answers 422 with how many more the learner needs
 * (`recoveryCount`) rather than minting a checkpoint it cannot fairly grade.
 */

const CHECKPOINT_ITEM_COUNT = 5;
const OPTION_COUNT = 4;
const POOL_SIZE = 60;

/**
 * The gate's two independent conditions (see `finalizeCheckpoint`): the learner must have
 * answered at least `CHECKPOINT_PASS_SCORE` of the five items correctly *and* every
 * published word in the unit must already sit at `CHECKPOINT_PASS_MASTERY` or above. A
 * checkpoint is proof the unit was learned, so a lucky five-in-a-row over a half-mastered
 * unit is deliberately not enough.
 */
const CHECKPOINT_PASS_SCORE = 4;
const CHECKPOINT_PASS_MASTERY = 3;

/** Levels a checkpoint can be run for — the Oxford 3000 CEFR bands. */
const VALID_LEVELS = new Set(["A1", "A2", "B1", "B2"]);

/**
 * The item mix is chosen server-side, never by the client, so a client cannot bias its own
 * gate toward the easier variants. recognition -> recall -> spelling -> recognition ->
 * recall, all five graded (no warm-up types in a gate).
 */
const ITEM_TYPE_SCHEDULE = [
    "choose-meaning",
    "choose-word",
    "spelling",
    "choose-meaning",
    "choose-word",
] as const;

// --- Deterministic option derivation, copied from session.ts so the answer path can
// --- re-derive the exact shuffle from the stored pool + checkpoint id, no answer key sent.

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

/** Same derivation strategy as session.ts: same-part-of-speech distractors preferred. */
const deriveOptionIds = (
    checkpointId: string,
    index: number,
    targetId: string,
    pool: PoolEntry[],
): string[] => {
    const rand = mulberry32(seedFrom(`${checkpointId}:${index}`));
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
 * Re-derives the served item list from a checkpoint's stored fields — used both for a
 * freshly created checkpoint and for resuming an already-open one, so both return the exact
 * same shape from the exact same logic. Never emits a word id, slug, the correct option
 * index, or (for spelling) the target word itself.
 */
const buildItems = (
    checkpointId: string,
    targetIds: string[],
    itemTypes: string[],
    poolEntries: PoolEntry[],
    wordsById: Map<string, PoolWord>,
) =>
    targetIds.map((targetId, index) => {
        const type = itemTypes[index] ?? "choose-meaning";
        const direction = type === "choose-word" ? "word" : "meaning";
        if (type === "spelling") {
            // No options: the client renders a text field. The target word itself is never
            // sent — only what to translate from.
            return {
                index,
                type,
                prompt: { meaningTh: wordsById.get(targetId)?.meaningTh ?? "" },
            };
        }
        const optionIds = deriveOptionIds(checkpointId, index, targetId, poolEntries);
        return {
            index,
            type,
            prompt: promptFace(wordsById.get(targetId), direction),
            options: optionIds.map((id) => optionFace(wordsById.get(id), direction)),
        };
    });

export const checkpoint = new Hono<Env>();

/** Loads the pool words for a set of pool entries into an id -> word map. */
const loadPoolWords = async (
    prisma: Variables["prisma"],
    poolEntries: PoolEntry[],
): Promise<Map<string, PoolWord>> => {
    const poolWords = await prisma.vocabWord.findMany({
        where: { id: { in: poolEntries.map((p) => p.id) } },
        select: wordSelect,
    });
    return new Map(poolWords.map((w) => [w.id, w]));
};

const normalizeSpelling = (value: string) => value.trim().toLowerCase();

/**
 * The mastery half of the gate, and the source of `recoveryCount`. Counts every published
 * word in the unit and, of those, how many the learner already holds at
 * `CHECKPOINT_PASS_MASTERY`+. `recoveryCount` is the remainder — words still below the bar
 * or with no `UserWordProgress` row at all (a missing row is mastery 0 by definition, so it
 * is caught by the difference without a separate query). Read-only: it never writes
 * progress, so grading a checkpoint can never lower a mastery the learner earned.
 */
const computeGate = async (
    prisma: Variables["prisma"],
    userId: string,
    level: string,
    unit: number,
): Promise<{ recoveryCount: number; allMastered: boolean }> => {
    const [publishedCount, masteredCount] = await Promise.all([
        prisma.vocabWord.count({ where: { status: "published", level, unit } }),
        prisma.userWordProgress.count({
            where: {
                userId,
                mastery: { gte: CHECKPOINT_PASS_MASTERY },
                word: { status: "published", level, unit },
            },
        }),
    ]);
    const recoveryCount = Math.max(0, publishedCount - masteredCount);
    return { recoveryCount, allMastered: recoveryCount === 0 };
};

/**
 * Decides (once) whether a completed checkpoint passed, and awards the unit exactly once.
 * Safe to call any number of times for the same checkpoint, including concurrently and as a
 * replay after a crash — the guarantees live in the database, not here:
 *
 *  - `passed` is sticky: whatever the row already stores wins, so a later replay whose
 *    mastery snapshot has since drifted cannot flip a decided checkpoint.
 *  - The award is the `CompletionLedger` unique index (`@@unique([userId, kind, scope])`).
 *    `INSERT OR IGNORE` inserts at most one row per (user, unit) no matter how many finals
 *    race; only the request whose insert actually landed (`rowsAffected === 1`) reports
 *    `awarded: true`. Every other concurrent or replayed final sees the row already there
 *    and reports `awarded: false` — so a genuine double-award is impossible.
 *
 * `awarded` on the checkpoint row is a sticky mirror of "the ledger row exists", set true
 * by whichever call inserts it and never cleared.
 */
const finalizeCheckpoint = async (
    prisma: Variables["prisma"],
    userId: string,
    checkpointId: string,
): Promise<{ passed: boolean; awarded: boolean; recoveryCount: number }> => {
    const record = await prisma.unitCheckpoint.findUnique({ where: { id: checkpointId } });
    if (!record) return { passed: false, awarded: false, recoveryCount: 0 };

    const answers = parseJsonArray(record.answers, isBoolean);
    const correctCount = answers.filter(Boolean).length;
    const gate = await computeGate(prisma, userId, record.level, record.unit);
    const passed = record.passed ?? (correctCount >= CHECKPOINT_PASS_SCORE && gate.allMastered);

    let awardedThisCall = false;
    if (passed) {
        // kind "unit", scope "<lowercased level>:<unit>" — the identifier of this one
        // completable unit. INSERT OR IGNORE against the unique index is the whole
        // exactly-once mechanism; the winner is whoever's row landed.
        const scope = `${record.level.toLowerCase()}:${record.unit}`;
        const inserted = await prisma.$executeRaw`
            INSERT OR IGNORE INTO CompletionLedger (id, userId, kind, scope, createdAt)
            VALUES (${crypto.randomUUID()}, ${userId}, 'unit', ${scope}, ${new Date()})
        `;
        awardedThisCall = inserted === 1;
    }

    const now = new Date();
    // Persist the decision idempotently: `passed` settles to its once-decided value,
    // `awarded` only ever climbs to true (never back down), and `completedAt` is left as
    // whatever the answering CAS already stamped.
    await prisma.$executeRaw`
        UPDATE UnitCheckpoint
        SET passed = ${passed},
            awarded = CASE WHEN ${awardedThisCall ? 1 : 0} = 1 THEN 1 ELSE awarded END,
            completedAt = COALESCE(completedAt, ${now}),
            updatedAt = ${now}
        WHERE id = ${record.id}
    `;

    return { passed, awarded: awardedThisCall, recoveryCount: gate.recoveryCount };
};

checkpoint.post("/progress/checkpoint/start", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req.json<{ level?: unknown; unit?: unknown }>().catch(() => ({}));
    const level = typeof body.level === "string" ? body.level : "";
    const unit = parseUnit(body.unit);

    if (!VALID_LEVELS.has(level)) {
        return c.json({ message: "level must be one of A1, A2, B1, B2" }, 400);
    }
    if (unit === null || unit <= 0) {
        return c.json({ message: "unit must be a positive integer" }, 400);
    }

    const prisma = c.get("prisma");

    // Never mint a second open checkpoint for the same unit: a learner who reloads,
    // backgrounds the tab, or double-taps "start" gets the same checkpoint handed back, not
    // a competing one racing it. At most one open checkpoint per (userId, level, unit) is
    // enforced by a partial unique index (schema.prisma `UnitCheckpoint`), so the create
    // below can also fall back to this resume path if it loses a concurrent race.
    const open = await prisma.unitCheckpoint.findFirst({
        where: { userId, level, unit, completedAt: null },
        orderBy: { createdAt: "desc" },
    });

    if (open) {
        const targetIds = parseJsonArray(open.wordIds, isString);
        const itemTypes = parseJsonArray(open.itemTypes, isString);
        const poolEntries = parseJsonArray(open.poolIds, isPoolEntry);
        const wordsById = await loadPoolWords(prisma, poolEntries);
        return c.json({
            checkpointId: open.id,
            level: open.level,
            unit: open.unit,
            itemCount: targetIds.length,
            answeredCount: parseJsonArray(open.answers, isBoolean).length,
            items: buildItems(open.id, targetIds, itemTypes, poolEntries, wordsById),
        });
    }

    // A checkpoint gates on words the learner has actually met in this unit — published,
    // with a real meaning, and carrying a UserWordProgress row for this learner. Fetch the
    // first five deterministically (source order); fewer than five means "not ready yet".
    const met = await prisma.vocabWord.findMany({
        where: {
            status: "published",
            meaningTh: { not: "" },
            level,
            unit,
            wordProgresses: { some: { userId } },
        },
        orderBy: { sourceOrder: "asc" },
        take: CHECKPOINT_ITEM_COUNT,
        select: { id: true },
    });

    if (met.length < CHECKPOINT_ITEM_COUNT) {
        return c.json(
            {
                message: "Not enough learned words in this unit for a checkpoint yet",
                recoveryCount: CHECKPOINT_ITEM_COUNT - met.length,
            },
            422,
        );
    }

    const targetIds = met.map((w) => w.id);
    const itemTypes = ITEM_TYPE_SCHEDULE.slice(0, CHECKPOINT_ITEM_COUNT);

    // Distractors are drawn from the whole level, not just the unit, so a five-word unit
    // still has real alternatives to choose between.
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

    const checkpointId = crypto.randomUUID();

    // A concurrent double-tap of "start" can race here: both requests pass the `open` check
    // above (neither has committed yet) and both attempt to create a row. Only one open
    // checkpoint per unit is meant to exist, so let the loser fall back to resuming the row
    // that won instead of silently minting a second.
    try {
        await prisma.unitCheckpoint.create({
            data: {
                id: checkpointId,
                userId,
                level,
                unit,
                wordIds: JSON.stringify(targetIds),
                itemTypes: JSON.stringify(itemTypes),
                poolIds: JSON.stringify(poolEntries),
            },
        });
    } catch {
        const fallback = await prisma.unitCheckpoint.findFirst({
            where: { userId, level, unit, completedAt: null },
            orderBy: { createdAt: "desc" },
        });
        if (!fallback) throw new Error("checkpoint create failed and no open checkpoint to resume");
        const fbTargetIds = parseJsonArray(fallback.wordIds, isString);
        const fbItemTypes = parseJsonArray(fallback.itemTypes, isString);
        const fbPoolEntries = parseJsonArray(fallback.poolIds, isPoolEntry);
        const fbWordsById = await loadPoolWords(prisma, fbPoolEntries);
        return c.json({
            checkpointId: fallback.id,
            level: fallback.level,
            unit: fallback.unit,
            itemCount: fbTargetIds.length,
            answeredCount: parseJsonArray(fallback.answers, isBoolean).length,
            items: buildItems(fallback.id, fbTargetIds, fbItemTypes, fbPoolEntries, fbWordsById),
        });
    }

    return c.json({
        checkpointId,
        level,
        unit,
        itemCount: CHECKPOINT_ITEM_COUNT,
        answeredCount: 0,
        items: buildItems(checkpointId, targetIds, [...itemTypes], poolEntries, wordsById),
    });
});

checkpoint.post("/progress/checkpoint/answer", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req
        .json<{
            checkpointId?: string;
            itemIndex?: unknown;
            selectedOptionIndex?: unknown;
            spelling?: unknown;
        }>()
        .catch(() => ({}) as Record<string, unknown>);

    const checkpointId = typeof body.checkpointId === "string" ? body.checkpointId : "";
    const itemIndex = parseUnit(body.itemIndex);
    if (!checkpointId || itemIndex === null) {
        return c.json({ message: "checkpointId and itemIndex are required" }, 400);
    }

    const prisma = c.get("prisma");
    let record = await prisma.unitCheckpoint.findUnique({ where: { id: checkpointId } });
    if (!record || record.userId !== userId) {
        return c.json({ message: "Checkpoint not found" }, 404);
    }

    const targetIds = parseJsonArray(record.wordIds, isString);
    const itemTypes = parseJsonArray(record.itemTypes, isString);
    const poolEntries = parseJsonArray(record.poolIds, isPoolEntry);

    if (itemIndex < 0 || itemIndex >= targetIds.length) {
        return c.json({ message: "itemIndex out of range" }, 400);
    }

    const targetId = targetIds[itemIndex];
    const type = itemTypes[itemIndex] ?? "choose-meaning";

    // Correctness is derived here and nowhere else, straight from the stored target and
    // pool plus the word's own row in the DB — the client's request carries a selection or
    // a typed spelling, never a "correct" flag and never a word id to match against.
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
        const correctOptionIndex = deriveOptionIds(
            checkpointId,
            itemIndex,
            targetId,
            poolEntries,
        ).indexOf(targetId);
        correct = selectedOptionIndex === correctOptionIndex;
    }

    const respond = (
        answers: boolean[],
        done: boolean,
        duplicate: boolean,
        outcome?: { passed: boolean; awarded: boolean; recoveryCount: number },
    ) =>
        c.json({
            itemIndex,
            correct: answers[itemIndex],
            done,
            duplicate,
            ...(type === "spelling" && word ? { correctSpelling: word.displayWord } : {}),
            ...(done && outcome
                ? {
                      correctCount: answers.filter(Boolean).length,
                      total: targetIds.length,
                      passed: outcome.passed,
                      awarded: outcome.awarded,
                      recoveryCount: outcome.recoveryCount,
                  }
                : {}),
        });

    // Same compare-and-swap pattern as session.ts: D1 has no transactions, so the WHERE
    // clause on the current answer-array length is the only concurrency guard available —
    // it is what makes a concurrent double-submit of the same item unable to be counted
    // twice, and unable to append two entries.
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const answers = parseJsonArray(record.answers, isBoolean);

        if (itemIndex < answers.length) {
            // A replay: return the stored original answer, not a re-grade. If the
            // checkpoint is already complete this replay still heals the completion —
            // `finalizeCheckpoint` is idempotent, so it hands back the settled
            // pass/award (award only if *this* call is the one that inserts the ledger).
            const done = record.completedAt !== null;
            if (done) {
                const outcome = await finalizeCheckpoint(prisma, userId, checkpointId);
                return respond(answers, true, true, outcome);
            }
            return respond(answers, false, true);
        }
        if (itemIndex !== answers.length) {
            return c.json({ message: "Items must be answered in order" }, 400);
        }

        const nextAnswers = [...answers, correct];
        const done = nextAnswers.length === targetIds.length;
        const correctCount = nextAnswers.filter(Boolean).length;
        const now = new Date();

        const updated = await prisma.$executeRaw`
            UPDATE UnitCheckpoint
            SET answers = ${JSON.stringify(nextAnswers)},
                correctCount = ${correctCount},
                completedAt = ${done ? now : null},
                updatedAt = ${now}
            WHERE id = ${checkpointId} AND json_array_length(answers) = ${answers.length}
        `;

        if (updated === 1) {
            if (done) {
                const outcome = await finalizeCheckpoint(prisma, userId, checkpointId);
                return respond(nextAnswers, true, false, outcome);
            }
            return respond(nextAnswers, false, false);
        }

        const reloaded = await prisma.unitCheckpoint.findUnique({ where: { id: checkpointId } });
        if (!reloaded) return c.json({ message: "Checkpoint not found" }, 404);
        record = reloaded;
    }

    return c.json({ message: "Could not record answer, please retry" }, 409);
});

/** Read-only status check used by the checkpoint screen after a refresh. Rebuilds the
 *  leak-free item list (no word ids, no correct-option index, no spelling target) so a
 *  resumed checkpoint renders identically to a fresh one. */
checkpoint.get("/progress/checkpoint/:id", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const prisma = c.get("prisma");
    const record = await prisma.unitCheckpoint.findUnique({
        where: { id: c.req.param("id") },
    });
    if (!record || record.userId !== userId) return c.json({ message: "Not found" }, 404);

    const targetIds = parseJsonArray(record.wordIds, isString);
    const itemTypes = parseJsonArray(record.itemTypes, isString);
    const poolEntries = parseJsonArray(record.poolIds, isPoolEntry);
    const answers = parseJsonArray(record.answers, isBoolean);
    const wordsById = await loadPoolWords(prisma, poolEntries);
    const gate = await computeGate(prisma, userId, record.level, record.unit);

    return c.json({
        checkpointId: record.id,
        level: record.level,
        unit: record.unit,
        answeredCount: answers.length,
        itemCount: targetIds.length,
        correctCount: record.correctCount,
        done: record.completedAt !== null,
        passed: record.passed ?? false,
        awarded: record.awarded,
        recoveryCount: gate.recoveryCount,
        items: buildItems(record.id, targetIds, itemTypes, poolEntries, wordsById),
    });
});
