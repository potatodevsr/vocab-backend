import { Hono, type Context } from "hono";

import type { Bindings, Variables } from "./index.js";
import {
    ITEM_TYPE_SCHEDULE,
    MASTERY_MASTERED,
    MASTERY_MAX,
    RECALL_DAYS_REQUIRED,
    RESERVED_NEW_SLOTS,
    REVIEW_INTERVAL_DAYS,
    STRONG_DAYS_REQUIRED,
    isRecallItem,
    learnerDay,
    gradedSlotCount,
} from "./mastery.js";
import { DEFAULT_WORDLIST } from "./wordlists.js";

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

/**
 * A word is "previously strong" — safe to lead a comeback with — when it meets the
 * product's one definition of strong (`backend/src/mastery.ts`), not a rung of its own.
 *
 * It was `mastery >= 3`, which was a third threshold for the same idea: the API counted
 * the collection at 2 and the pips drew their band at 3. A comeback is meant to open with
 * words the learner can win, and "recalled on two different days" is a better answer to
 * that than any rung.
 */
const COMEBACK_STRONG_WHERE = {
    strongDays: { gte: STRONG_DAYS_REQUIRED },
    recallDays: { gte: RECALL_DAYS_REQUIRED },
} as const;

const SESSION_MODES = ["normal", "comeback", "review", "mistakes"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

/**
 * Mode is client-selected but never client-trusted for anything it decides: it only picks
 * *which* server-side selection strategy runs. An unknown/absent value is the default
 * eight-item session, so an old client that sends no mode keeps working unchanged.
 */
const parseMode = (value: unknown): SessionMode =>
    value === "comeback" || value === "review" || value === "mistakes" ? value : "normal";

export type SessionItemType = (typeof ITEM_TYPE_SCHEDULE)[number];

/**
 * Item types that feed the SRS ladder. match-pairs/speed-round are warm-up only (§4.1).
 *
 * Declared above `GRADED_SLOT_COUNT`, not below it: a `const` arrow is not hoisted, and
 * `GRADED_SLOT_COUNT`'s initializer runs at import. With the two the other way round the
 * Worker died at boot — `TypeError: isGradedForMastery is not a function`.
 */
const isGradedForMastery = (type: string) =>
    type === "choose-meaning" ||
    type === "choose-word" ||
    type === "spelling" ||
    type === "cloze" ||
    // Listening is recall, not a warm-up: the learner is given nothing but the sound and
    // has to produce the meaning, which is at least as strong a signal as reading the word.
    type === "listen-choose";

/**
 * How many of the eight slots can actually clear a due word.
 *
 * `match-pairs` and `speed-round` are warm-ups: `applyWarmupWordReward` leaves `mastery`,
 * `streak` and `nextReviewAt` untouched, so a due word placed on one is answered and still
 * due. Every selector caps its due set at this number.
 *
 * The cap alone is not the guarantee — the *ordering* above is. A cap of six is only safe
 * because the six graded slots are the first six, so a session of any length n has
 * `min(n, 6)` of them and a due set of at most six always lands on one. That invariant is
 * asserted in `e2e/unit/session-schedule.spec.ts` rather than left to a comment.
 */
const GRADED_SLOT_COUNT = gradedSlotCount(ITEM_TYPE_SCHEDULE.length);

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
    audioKeyEn: string;
    exampleEn: string;
};

const wordSelect = {
    id: true,
    displayWord: true,
    partOfSpeech: true,
    meaningTh: true,
    pronunciationTh: true,
    audioKeyEn: true,
    exampleEn: true,
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
        ? {
              displayWord: word.displayWord,
              partOfSpeech: word.partOfSpeech,
              pronunciationTh: word.pronunciationTh,
              // The clip is optional decoration here — the word is written on the card
              // anyway. On a `listen-choose` item it is the entire question, which is why
              // that branch sends it *without* `displayWord`.
              audioKeyEn: word.audioKeyEn,
          }
        : { meaningTh: word.meaningTh, partOfSpeech: word.partOfSpeech });

/**
 * The example sentence with the target word blanked out.
 *
 * Whole-word, case-insensitive, and it refuses to blank anything it is not sure of: if the
 * headword does not appear as its own word in the sentence — inflected ("ran" in an
 * example for "run"), part of a compound, or simply absent — this returns null and the
 * item falls back to a type that does not need it. A cloze whose blank is in the wrong
 * place teaches the wrong thing, and there is no way for the learner to tell.
 */
const clozeFrom = (word: PoolWord | undefined): string | null => {
    const sentence = (word?.exampleEn ?? "").trim();
    const target = (word?.displayWord ?? "").trim();
    if (!sentence || !target) return null;

    // Escape the headword: a few Oxford entries contain regex-significant characters.
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (!pattern.test(sentence)) return null;

    return sentence.replace(pattern, "____");
};

const optionFace = (word: PoolWord | undefined, direction: "meaning" | "word") =>
    word &&
    (direction === "meaning"
        ? { meaningTh: word.meaningTh, partOfSpeech: word.partOfSpeech }
        : { displayWord: word.displayWord, partOfSpeech: word.partOfSpeech });

/**
 * Places due words on graded slots and everything else on what is left.
 *
 * Order-preserving within each group, so selection stays deterministic: the same inputs
 * produce the same session, which is what lets `/answer` and a resumed `/start` re-derive
 * an identical item list without storing one.
 */
const assignSlots = (
    targetIds: string[],
    dueWordIds: string[],
    itemTypes: readonly string[],
): string[] => {
    const due = new Set(dueWordIds);
    const dueQueue = targetIds.filter((id) => due.has(id));
    const restQueue = targetIds.filter((id) => !due.has(id));

    const graded: number[] = [];
    const warmUp: number[] = [];

    itemTypes.forEach((type, index) => {
        (isGradedForMastery(type) ? graded : warmUp).push(index);
    });

    const slots: string[] = new Array(targetIds.length);

    /**
     * Due words take graded slots, and **only** graded slots.
     *
     * `applyWarmupWordReward` deliberately leaves `mastery`, `streak` and `nextReviewAt`
     * alone, so a due word in a warm-up slot is spent: answered, and still due tomorrow.
     * An earlier version let the overflow fall through into the warm-ups "which is still
     * better than the reverse" — it is not. A review session picking eight due words put
     * two of them somewhere that could never clear them, every time, and the learner had
     * no way to see it. The selectors now cap the due set at the graded-slot count
     * (`GRADED_SLOT_COUNT`), which is what makes the guarantee hold; this loop places
     * them and never reaches past the graded slots to do it.
     */
    for (const index of graded) {
        const id = dueQueue.shift();
        if (id === undefined) break;
        slots[index] = id;
    }

    // Unreachable while the selectors cap at `GRADED_SLOT_COUNT`. If one ever stops, the
    // extras are treated as ordinary words rather than silently prioritised into a slot
    // that cannot clear them.
    restQueue.unshift(...dueQueue.splice(0, dueQueue.length));

    for (let index = 0; index < slots.length; index += 1) {
        if (slots[index] === undefined) {
            const id = restQueue.shift();
            if (id !== undefined) slots[index] = id;
        }
    }

    // Anything left over (more words than slots cannot happen, but be total anyway).
    return slots.map((id, index) => id ?? targetIds[index]);
};

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
    wordlistId: string,
): Promise<{ wordIds: string[]; dueWordIds: string[] }> => {
    const now = new Date();

    /**
     * How many unseen words are still waiting in the scope this session is for.
     *
     * Asked first, because it decides how many slots the due queue may take. This is the
     * fix for the starvation the audit found: selection was due-first with `take: 8`, so
     * once a level produced eight due words a day the learner never saw a new one again —
     * silently, with no message and no way to ask for one. Reviews still come first, they
     * just no longer take every seat.
     */
    const unseenCount = await prisma.vocabWord.count({
        where: {
            status: "published",
            meaningTh: { not: "" },
            level,
            wordlistId,
            ...(unit !== null ? { unit } : {}),
            wordProgresses: { none: { userId } },
        },
    });

    const reserved = Math.min(unseenCount, RESERVED_NEW_SLOTS);
    // Never more due words than there are slots that can clear them.
    const dueBudget = Math.min(Math.max(SESSION_ITEM_COUNT - reserved, 0), GRADED_SLOT_COUNT);

    /**
     * Due selection follows the session's own scope.
     *
     * A learner who opens unit 4 is asking to study unit 4. Pulling their whole level's
     * backlog into that session replaced the thing they asked for with something else and
     * called it the same lesson. Unit-scoped due words come first; the level-wide backlog
     * is still reachable, deliberately, through `mode=review`.
     */
    const dueScope = {
        userId,
        level,
        nextReviewAt: { lte: now },
        word: { status: "published", wordlistId },
    } as const;

    const due = dueBudget
        ? await prisma.userWordProgress.findMany({
              where: unit !== null ? { ...dueScope, unit } : dueScope,
              orderBy: { nextReviewAt: "asc" },
              take: dueBudget,
              select: { wordId: true },
          })
        : [];

    const dueWordIds = due.map((d) => d.wordId);
    const chosen = new Set(dueWordIds);

    if (chosen.size < SESSION_ITEM_COUNT) {
        const fresh = await prisma.vocabWord.findMany({
            where: {
                status: "published",
                meaningTh: { not: "" },
                level,
                wordlistId,
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

    /**
     * Anything still short is filled from the wider due queue — a unit with nothing new
     * left should not hand back a three-item session when the level has reviews waiting.
     */
    if (chosen.size < SESSION_ITEM_COUNT) {
        const widerDue = await prisma.userWordProgress.findMany({
            where: dueScope,
            orderBy: { nextReviewAt: "asc" },
            take: SESSION_ITEM_COUNT,
            select: { wordId: true },
        });

        for (const row of widerDue) {
            if (chosen.size >= SESSION_ITEM_COUNT) break;
            // Same cap: a top-up may not push the due set past the graded slots either.
            if (dueWordIds.length >= GRADED_SLOT_COUNT) break;
            if (chosen.has(row.wordId)) continue;
            chosen.add(row.wordId);
            dueWordIds.push(row.wordId);
        }
    }

    if (chosen.size < SESSION_ITEM_COUNT) {
        const any = await prisma.vocabWord.findMany({
            where: { status: "published", meaningTh: { not: "" }, level, wordlistId },
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
 * The mistake bank, as a session.
 *
 * `/review` used to list a learner's wrong answers and then send "practise these" to
 * `/quiz?level=…&unit=…` for the unit the *first* mistake happened to belong to — so the
 * button under a list of twelve words across four units practised twenty other words and
 * possibly none of the twelve.
 *
 * The word ids stay server-side, exactly like every other selection here: the client asks
 * for `mode=mistakes` and the server decides which words that means. A client that could
 * name its own words could choose the ones it already knows.
 *
 * Deliberately not scoped to a level or a unit — a mistake is a mistake wherever it
 * happened, and a learner who has moved to A2 still needs the A1 word they keep missing.
 */
const pickMistakeWords = async (
    prisma: Variables["prisma"],
    userId: string,
    wordlistId: string,
): Promise<{ wordIds: string[]; dueWordIds: string[] }> => {
    const now = new Date();

    const rows = await prisma.userWordProgress.findMany({
        where: {
            userId,
            OR: [{ status: "review" }, { incorrectCount: { gt: 0 } }],
            word: { status: "published", meaningTh: { not: "" }, wordlistId },
        },
        // Worst first, then least recently seen: the words costing the learner the most.
        orderBy: [{ incorrectCount: "desc" }, { lastSeenAt: "asc" }],
        take: SESSION_ITEM_COUNT,
        select: { wordId: true, nextReviewAt: true },
    });

    const isDue = (row: { nextReviewAt: Date | null }) =>
        row.nextReviewAt !== null && row.nextReviewAt <= now;

    /**
     * If more of the set is due than there are slots that can clear it, the session gets
     * shorter rather than parking overdue words on warm-up slots that leave them due —
     * the same trade `pickReviewWords` makes, for the same reason.
     */
    const selected =
        rows.filter(isDue).length > GRADED_SLOT_COUNT
            ? rows.slice(0, GRADED_SLOT_COUNT)
            : rows;

    return {
        wordIds: selected.map((row) => row.wordId),
        // A mistake that is also due is reported as due, so the Today card's count and this
        // session agree about what was cleared.
        dueWordIds: selected.filter(isDue).map((row) => row.wordId),
    };
};

/**
 * Comeback selection for a returning learner (LEARNER-LIFECYCLE.md §2): up to
 * `COMEBACK_MAX`, and at least three whenever the level has that many ready words, so the
 * set is never so short it isn't a session. Priority is confidence-first — words the
 * learner was already strong on (the shared predicate), then anything now
 * due, then a safe published fallback so the minimum is always reachable. Every target is a
 * real published word, and `itemTypes`/pool derivation are identical to the normal path, so
 * `/progress/session/answer` grades a comeback session with no special-casing.
 */
const pickComebackWords = async (
    prisma: Variables["prisma"],
    userId: string,
    level: string,
    wordlistId: string,
): Promise<{ wordIds: string[]; dueWordIds: string[] }> => {
    const now = new Date();

    const strong = await prisma.userWordProgress.findMany({
        where: {
            userId,
            level,
            ...COMEBACK_STRONG_WHERE,
            word: { status: "published" },
        },
        orderBy: { lastSeenAt: "desc" },
        take: COMEBACK_MAX,
        select: { wordId: true },
    });

    const due = await prisma.userWordProgress.findMany({
        where: {
            userId,
            level,
            nextReviewAt: { lte: now },
            word: { status: "published", wordlistId },
        },
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
            where: { status: "published", meaningTh: { not: "" }, level, wordlistId },
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
 * due (`nextReviewAt <= now`). Unlike normal/comeback there is no fallback — a review with
 * nothing due is genuinely empty, and the caller returns a 200 empty result rather than
 * minting a session over unrelated words.
 *
 * **At most `GRADED_SLOT_COUNT` of them**, not eight. It used to take eight, and the two
 * that landed on the warm-up slots were answered and left exactly as due as before — every
 * single full review session burned two overdue words. A shorter session that clears
 * everything it shows beats a full one that cannot.
 */
const pickReviewWords = async (
    prisma: Variables["prisma"],
    userId: string,
    level: string,
    wordlistId: string,
): Promise<{ wordIds: string[]; dueWordIds: string[] }> => {
    const now = new Date();
    const due = await prisma.userWordProgress.findMany({
        where: {
            userId,
            level,
            nextReviewAt: { lte: now },
            word: { status: "published", wordlistId },
        },
        orderBy: { nextReviewAt: "asc" },
        take: GRADED_SLOT_COUNT,
        select: { wordId: true },
    });
    const wordIds = due.map((d) => d.wordId);
    return { wordIds, dueWordIds: [...wordIds] };
};

export const session = new Hono<Env>();

/** Re-derives the served item list from a session record's stored fields — used both for
 *  a freshly created session and for resuming an already-open one, so both return the
 *  exact same shape from the exact same logic. */
/**
 * What an item *actually* asks, once the corpus has had its say.
 *
 * A listening item is only a listening item if there is a clip; a cloze is only a cloze if
 * the sentence yields a usable blank. Both degrade to `choose-meaning`, which is
 * recognition — and the reward path used to read the *scheduled* type, so a degraded
 * listening slot credited a recall day for a question the learner answered by recognising
 * a gloss. That is the difference between the product's central claim being true and
 * looking true.
 *
 * Called once at session creation; the effective types are what gets stored, so
 * `buildItems`, `/answer` and the reward all read the same answer without re-deriving it.
 */
const effectiveItemType = (scheduled: string, word: PoolWord | undefined): string => {
    if (scheduled === "listen-choose" && !word?.audioKeyEn) return "choose-meaning";
    if (scheduled === "cloze" && !clozeFrom(word)) return "choose-meaning";
    return scheduled;
};

const buildItems = (
    sessionId: string,
    targetIds: string[],
    itemTypes: string[],
    poolEntries: PoolEntry[],
    wordsById: Map<string, PoolWord>,
) =>
    targetIds.map((targetId, index) => {
        const scheduled = itemTypes[index] ?? "choose-meaning";
        /**
         * A listening item is only a listening item if there is something to listen to.
         * Audio is generated word by word (`scripts/generate-audio.mjs`), so for most of
         * the corpus's life this slot has to degrade rather than serve a question whose
         * prompt is silence. The fallback is derived from stored data, not chosen at
         * random, so `/answer` re-derives exactly the same type for the same session.
         */
        const cloze = scheduled === "cloze" ? clozeFrom(wordsById.get(targetId)) : null;
        const type =
            scheduled === "listen-choose" && !wordsById.get(targetId)?.audioKeyEn
                ? "choose-meaning"
                : scheduled === "cloze" && !cloze
                  ? "choose-meaning"
                  : scheduled;
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

        if (type === "cloze" && cloze) {
            // Options are words, not meanings: the question is which word fills the gap.
            // The sentence itself carries no `displayWord` field, so nothing on the card
            // spells the answer.
            return {
                index,
                type,
                prompt: { clozeEn: cloze, partOfSpeech: wordsById.get(targetId)?.partOfSpeech ?? "" },
                options: optionIds.map((id) => optionFace(wordsById.get(id), "word")),
            };
        }

        if (type === "listen-choose") {
            const word = wordsById.get(targetId);
            // Deliberately no `displayWord` and no `pronunciationTh`: sending either would
            // put the answer on the card. The learner hears the word and picks its meaning.
            return {
                index,
                type,
                prompt: { audioKeyEn: word?.audioKeyEn ?? "", partOfSpeech: word?.partOfSpeech ?? "" },
                options: optionIds.map((id) => optionFace(wordsById.get(id), "meaning")),
            };
        }

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
    // Review is level-wide ("everything due right now") and mistakes is level- *and*
    // course-wide ("everything you keep getting wrong"), so neither is scoped to a unit;
    // normal and comeback keep the requested unit (or null) as their scope.
    const unit = mode === "review" || mode === "mistakes" ? null : parseUnit(body.unit);

    const prisma = c.get("prisma");

    // Never mint a second open session: a learner who reloads, backgrounds the tab, or
    // double-taps "start" gets the same session handed back, not a competing one racing it
    // for the same words' rewards. Resume is now gated on *compatibility* — the open
    // session must match the requested mode and scope (level + unit), so a learner who
    // asks for a `review` while a `normal` session is open isn't served the normal set's
    // items under the review label. There is at most one open session per learner by
    // construction (partial unique index), so an incompatible open session falls through to
    // fresh selection below, where the index makes any create a resume of the existing row.
    /**
     * Which list this learner is studying (`wordlists.ts`). Every selection query below is
     * scoped to it, so publishing a second list cannot interleave its words into an
     * existing learner's course — the failure mode that made the list a first-class thing
     * rather than a `sourceName` string.
     */
    const learner = await prisma.user.findUnique({
        where: { id: userId },
        select: { wordlistId: true },
    });
    const wordlistId = learner?.wordlistId ?? DEFAULT_WORDLIST;

    /**
     * Unit order is **guidance, not enforcement**, and this is where that was decided.
     *
     * An earlier version of this route silently served unit 1 to a learner who asked for
     * unit 7. It broke three existing tests, and the tests were right: "each unit serves
     * its own twenty words" is the invariant behind AGENTS.md rule 9, and a lesson that
     * teaches unit 1 while the learner navigated to unit 7 is a quiet lie no amount of
     * response metadata makes honest.
     *
     * So the order lives where a learner can act on it instead: `/progress/units` says
     * which unit is next and which are still closed, the Today card and the level page
     * point there, and `units.ts` explains why a locked unit is still readable. Someone who
     * navigates past the frontier on purpose gets exactly the unit they asked for — that is
     * what the public level test exists to let them do.
     */

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
            ? await pickComebackWords(prisma, userId, level, wordlistId)
            : mode === "review"
              ? await pickReviewWords(prisma, userId, level, wordlistId)
              : mode === "mistakes"
                ? await pickMistakeWords(prisma, userId, wordlistId)
                : await pickSessionWords(prisma, userId, level, unit, wordlistId);

    // A review with nothing due, or a mistake session with no mistakes left, is a valid
    // empty result — not an error and not a session. The client is told there is nothing
    // to do (sessionId null, no items) and no open session is created, so the learner's
    // next "start" is free to be a normal one.
    if ((mode === "review" || mode === "mistakes") && targetIds.length === 0) {
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
        where: { status: "published", meaningTh: { not: "" }, level, wordlistId },
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
    const scheduledTypes = ITEM_TYPE_SCHEDULE.slice(0, targetIds.length);

    /**
     * A due word must land on a slot that can clear it.
     *
     * `match-pairs` and `speed-round` are warm-ups: `applyWarmupWordReward` deliberately
     * leaves `mastery`, `streak` and `nextReviewAt` alone (§4.1, "never as proof of
     * mastery"). A due word placed in one of those slots is therefore *spent* — it fills a
     * seat, the learner answers it, and it is still due tomorrow. With the old due-first
     * selection a saturated learner could meet the same overdue word in a warm-up slot day
     * after day and never clear it.
     *
     * Reordering rather than rescheduling: the schedule's teaching shape (recognition,
     * then recall, then spelling, warm-ups in the middle) is deliberate and stays exactly
     * as authored. Only *which word* sits on each slot changes.
     */
    const orderedTargetIds = assignSlots(targetIds, dueWordIds, scheduledTypes);

    // Resolved after the words are placed, because whether a slot can be a listening or
    // cloze item depends on which word landed on it.
    const itemTypes = scheduledTypes.map((scheduled, index) =>
        effectiveItemType(scheduled, wordsById.get(orderedTargetIds[index])),
    );

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
                wordIds: JSON.stringify(orderedTargetIds),
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

    const items = buildItems(sessionId, orderedTargetIds, itemTypes, poolEntries, wordsById);

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

/**
 * The ladder now runs past "mastered" (`backend/src/mastery.ts`): 60, 120 and 240 days.
 * A word the learner keeps getting right stops competing for session slots with the words
 * they have never seen, which is the whole reason the ceiling moved.
 */
const reviewIntervalDays = (mastery: number) =>
    REVIEW_INTERVAL_DAYS[Math.min(Math.max(mastery, 0), MASTERY_MAX)];

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
    itemType: string,
    timezone: string | null,
): Promise<void> => {
    const isCorrectFlag = isCorrect ? 1 : 0;
    const initialMastery = isCorrect ? 1 : 0;
    const reviewDates = REVIEW_INTERVAL_DAYS.map((days) => new Date(now.getTime() + days * DAY_MS));

    /**
     * The evidence half (`backend/src/mastery.ts`). Computed inside the SQL from the row's
     * own pre-update columns, for the same reason `mastery` is: D1 gives no transaction to
     * hold "read the last day, then write it" together, so a crash or a concurrent retry
     * between the two steps would credit a day twice or skip one.
     *
     * Only a *correct* answer credits anything, a second correct answer on the same local
     * day credits nothing, and a recognition never credits a recall day.
     */
    const today = learnerDay(now, timezone);
    const isRecallFlag = isCorrect && isRecallItem(itemType) ? 1 : 0;
    const initialStrongDays = isCorrect ? 1 : 0;
    const initialRecallDays = isRecallFlag;

    await prisma.$executeRaw`
        INSERT INTO UserWordProgress
            (id, userId, wordId, level, unit, status, mastery, seenCount, knownCount,
             reviewCount, correctCount, incorrectCount, streak, lastSeenAt, lastCorrectAt,
             lastIncorrectAt, nextReviewAt, masteredAt, strongDays, recallDays,
             lastStrongDay, lastRecallDay, strongAt, lastSessionRewardId, createdAt, updatedAt)
        VALUES
            (${crypto.randomUUID()}, ${userId}, ${wordId}, ${session.level}, ${session.unit},
             ${isCorrect ? "known" : "review"}, ${initialMastery}, 1, 0, 0,
             ${isCorrect ? 1 : 0}, ${isCorrect ? 0 : 1}, ${isCorrect ? 1 : 0}, ${now},
             ${isCorrect ? now : null}, ${isCorrect ? null : now},
             ${reviewDates[initialMastery]},
             ${initialMastery >= MASTERY_MASTERED ? now : null},
             ${initialStrongDays}, ${initialRecallDays},
             ${isCorrect ? today : null}, ${isRecallFlag === 1 ? today : null},
             ${null},
             ${sessionId}, ${now}, ${now})
        ON CONFLICT(userId, wordId) DO UPDATE SET
            status = ${isCorrect ? "known" : "review"},
            mastery = CASE WHEN ${isCorrectFlag} = 1
                           THEN MIN(mastery + 1, ${MASTERY_MAX})
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
                      THEN MIN(mastery + 1, ${MASTERY_MAX})
                      ELSE MAX(mastery - 1, 0) END)
                WHEN 0 THEN ${reviewDates[0]}
                WHEN 1 THEN ${reviewDates[1]}
                WHEN 2 THEN ${reviewDates[2]}
                WHEN 3 THEN ${reviewDates[3]}
                WHEN 4 THEN ${reviewDates[4]}
                WHEN 5 THEN ${reviewDates[5]}
                WHEN 6 THEN ${reviewDates[6]}
                WHEN 7 THEN ${reviewDates[7]}
                ELSE ${reviewDates[8]}
            END,
            masteredAt = CASE
                WHEN masteredAt IS NULL
                 AND (CASE WHEN ${isCorrectFlag} = 1
                           THEN MIN(mastery + 1, ${MASTERY_MAX})
                           ELSE MAX(mastery - 1, 0) END) >= ${MASTERY_MASTERED}
                THEN ${now} ELSE masteredAt END,
            strongDays = CASE
                WHEN ${isCorrectFlag} = 1 AND (lastStrongDay IS NULL OR lastStrongDay != ${today})
                THEN strongDays + 1 ELSE strongDays END,
            recallDays = CASE
                WHEN ${isRecallFlag} = 1 AND (lastRecallDay IS NULL OR lastRecallDay != ${today})
                THEN recallDays + 1 ELSE recallDays END,
            strongAt = CASE
                WHEN strongAt IS NULL
                 AND (CASE WHEN ${isCorrectFlag} = 1 AND (lastStrongDay IS NULL OR lastStrongDay != ${today})
                           THEN strongDays + 1 ELSE strongDays END) >= ${STRONG_DAYS_REQUIRED}
                 AND (CASE WHEN ${isRecallFlag} = 1 AND (lastRecallDay IS NULL OR lastRecallDay != ${today})
                           THEN recallDays + 1 ELSE recallDays END) >= ${RECALL_DAYS_REQUIRED}
                THEN ${now} ELSE strongAt END,
            lastStrongDay = CASE WHEN ${isCorrectFlag} = 1 THEN ${today} ELSE lastStrongDay END,
            lastRecallDay = CASE WHEN ${isRecallFlag} = 1 THEN ${today} ELSE lastRecallDay END,
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

    // One read for the whole reward pass: "different days" are the learner's days
    // (`backend/src/mastery.ts`), so the boundary has to come from their profile.
    const learner = await prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
    });
    const timezone = learner?.timezone ?? null;

    for (const [index, wordId] of targetIds.entries()) {
        const isCorrect = answers[index] ?? false;
        const type = itemTypes[index] ?? "choose-meaning";

        if (isGradedForMastery(type)) {
            await applyGradedWordReward(
                prisma, userId, wordId, sessionId, sessionMeta, isCorrect, now, type, timezone,
            );
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
