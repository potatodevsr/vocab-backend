import { Hono } from "hono";
import { SignJWT, jwtVerify } from "jose";

import type { Bindings, Variables } from "./index.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * The public placement test (LEARNER-LIFECYCLE.md §3.4, SEO family O).
 *
 * It answers "where do I start" without a wall in front of it: no account, no cookie, no
 * row written. Twelve questions, three at each CEFR level, and the result is a
 * recommendation the learner can take or ignore.
 *
 * **Why a signed token instead of a database row.** A trial (`practice.ts`) writes rows
 * because its answers become real progress on a real account. A placement result becomes
 * nothing but a suggested starting point, so persisting it would mean a table of anonymous
 * quiz attempts to expire, rate-limit and eventually explain in a privacy policy — for a
 * number the learner is free to overrule anyway. The token carries the word ids so the
 * server can still grade authoritatively: the client never receives an answer key, and a
 * forged token fails the signature check.
 *
 * The one thing a tampered result could buy is starting at B2 — which is already a
 * supported choice, since every level page is public and linkable. Nothing here awards XP,
 * touches mastery or writes to an account.
 */

export const placement = new Hono<Env>();

const LEVELS = ["A1", "A2", "B1", "B2"] as const;
type Level = (typeof LEVELS)[number];

/** Three per level. Enough to be more than a coin toss, short enough to finish standing up. */
const PER_LEVEL = 3;
const OPTION_COUNT = 4;

/** Words to draw each level's questions and distractors from. */
const POOL_PER_LEVEL = 40;

/** The token is a scratchpad for one sitting, not a session. */
const TOKEN_TTL = "1h";

/**
 * How many of a level's three must be right for that level to count as "comfortable".
 * Two of three: one slip should not push a learner down a level, and a single lucky guess
 * out of four options should not push them up one.
 */
const PASS_MARK = 2;

const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const seedFrom = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0;
    }
    return hash;
};

const shuffled = <T>(items: T[], rand: () => number): T[] => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(rand() * (index + 1));
        [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
};

const secretOf = (c: { env: Bindings }) => new TextEncoder().encode(c.env.JWT_SECRET);

type Item = {
    index: number;
    level: Level;
    prompt: { displayWord: string; partOfSpeech: string };
    options: { meaningTh: string }[];
};

/** What the token carries: per item, the level and the index of the right option. */
type Key = { level: Level; correct: number }[];

const signKey = async (c: { env: Bindings }, key: Key) =>
    new SignJWT({ purpose: "placement", key })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(TOKEN_TTL)
        .sign(secretOf(c));

const readKey = async (c: { env: Bindings }, token: string): Promise<Key | null> => {
    try {
        const { payload } = await jwtVerify(token, secretOf(c));
        if (payload.purpose !== "placement" || !Array.isArray(payload.key)) return null;

        return payload.key.filter(
            (entry): entry is Key[number] =>
                typeof entry === "object" &&
                entry !== null &&
                LEVELS.includes((entry as Key[number]).level) &&
                Number.isInteger((entry as Key[number]).correct),
        );
    } catch {
        return null;
    }
};

/**
 * The recommendation.
 *
 * The learner starts at the first level they were *not* comfortable with — being able to
 * read A1 and A2 means A2 is behind them, not that A2 is where the work is. Everything
 * correct means the last level; nothing correct means the first. There is no "you failed"
 * branch, because there is nothing here to fail: the output is a starting point.
 */
const recommend = (
    correctByLevel: Record<Level, number>,
    totalByLevel: Record<Level, number>,
): Level => {
    // Only levels that actually appeared in this sitting can be judged. A level-scoped
    // test has one; a full one has all four.
    const asked = LEVELS.filter((level) => totalByLevel[level] > 0);

    for (const level of asked) {
        // Proportional, not a fixed count: a level-scoped sitting asks six questions and a
        // full one asks three, and "comfortable" has to mean the same thing in both.
        const needed = Math.ceil((totalByLevel[level] * PASS_MARK) / PER_LEVEL);
        if (correctByLevel[level] < needed) return level;
    }

    // Everything asked was comfortable. On a scoped test that means the next level up is
    // the honest recommendation; on a full one there is nothing above B2.
    const last = asked[asked.length - 1] ?? LEVELS[0];
    return LEVELS[Math.min(LEVELS.indexOf(last) + 1, LEVELS.length - 1)];
};

placement.post("/placement/start", async (c) => {
    const prisma = c.get("prisma");

    /**
     * Optional single-level mode, for `/english/test/[level]` ("are you ready for A2?").
     *
     * Same route rather than a second one: the only difference is which levels the
     * questions are drawn from, and duplicating the generator to change one filter is how
     * two code paths end up scoring differently for the same answers. A level-scoped
     * sitting asks twice as many questions from that level, because with nothing to
     * compare against, three is too thin a basis for a yes/no.
     */
    const body = (await c.req.json().catch(() => null)) as { level?: unknown } | null;
    const requested = typeof body?.level === "string" ? body.level.toUpperCase() : "";
    const scoped = LEVELS.includes(requested as Level) ? (requested as Level) : null;
    const levels = scoped ? [scoped] : [...LEVELS];
    const perLevel = scoped ? PER_LEVEL * 2 : PER_LEVEL;

    // One deterministic seed per sitting, so the same token always describes the same
    // twelve questions — which is what lets the grader re-derive nothing and simply read
    // the key it signed.
    const sitting = crypto.randomUUID();

    const items: Item[] = [];
    const key: Key = [];

    for (const level of levels) {
        const pool = await prisma.vocabWord.findMany({
            where: { level, status: "published", meaningTh: { not: "" } },
            orderBy: { sourceOrder: "asc" },
            take: POOL_PER_LEVEL,
            select: { id: true, displayWord: true, partOfSpeech: true, meaningTh: true },
        });

        // A level with too little published content is skipped rather than padded with
        // another level's words — a question labelled B2 has to be a B2 question.
        if (pool.length < OPTION_COUNT) continue;

        const rand = mulberry32(seedFrom(`${sitting}:${level}`));
        const targets = shuffled(pool, rand).slice(0, perLevel);

        for (const target of targets) {
            const distractors = shuffled(
                pool.filter((word) => word.id !== target.id),
                rand,
            ).slice(0, OPTION_COUNT - 1);

            const options = shuffled([target, ...distractors], rand);
            const correct = options.findIndex((option) => option.id === target.id);

            key.push({ level, correct });
            items.push({
                index: items.length,
                level,
                prompt: { displayWord: target.displayWord, partOfSpeech: target.partOfSpeech },
                options: options.map((option) => ({ meaningTh: option.meaningTh })),
            });
        }
    }

    if (items.length === 0) {
        return c.json({ message: "Not enough published content for a placement test" }, 422);
    }

    return c.json({ token: await signKey(c, key), itemCount: items.length, items });
});

placement.post("/placement/score", async (c) => {
    const body = (await c.req.json().catch(() => null)) as {
        token?: unknown;
        answers?: unknown;
    } | null;

    const token = typeof body?.token === "string" ? body.token : "";
    const key = token ? await readKey(c, token) : null;
    if (!key || key.length === 0) {
        return c.json({ message: "This placement test has expired — start a new one" }, 400);
    }

    const answers = Array.isArray(body?.answers) ? body.answers : [];

    const correctByLevel = Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<
        Level,
        number
    >;
    const totalByLevel = Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<
        Level,
        number
    >;

    key.forEach((entry, index) => {
        totalByLevel[entry.level] += 1;
        // An unanswered item is a wrong item, not a skipped one: the recommendation has to
        // describe what the learner demonstrated.
        if (answers[index] === entry.correct) correctByLevel[entry.level] += 1;
    });

    const correctCount = Object.values(correctByLevel).reduce((sum, value) => sum + value, 0);

    return c.json({
        recommendedLevel: recommend(correctByLevel, totalByLevel),
        correctCount,
        itemCount: key.length,
        levels: LEVELS.map((level) => ({
            level,
            correct: correctByLevel[level],
            total: totalByLevel[level],
        })),
    });
});
