import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * Gameplay verbs. Hand-written on purpose (docs/SPEC.md §5.3): the caller reports *what
 * happened*, the server decides what it is worth. Nothing here trusts a `userId`, a
 * score, or a mastery value from the request body.
 *
 * D1 has no transactions, so every route must be safe to run twice: the client supplies
 * the session id, and a replay is detected by primary-key collision rather than by
 * counting rows.
 */
export const progress = new Hono<Env>();

const requireUserId = (c: { get: (k: "userId") => string | undefined }) =>
    c.get("userId");

const DAY_MS = 24 * 60 * 60 * 1000;

/** A word counts as mastered at the top of the interval ladder. */
export const MASTERY_MASTERED = 5;

/** SM-2 lite: correct answers push the next review further out, a lapse resets it. */
const reviewIntervalDays = (mastery: number) =>
    [1, 1, 3, 7, 14, 30][Math.min(Math.max(mastery, 0), 5)];

const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];

/**
 * `Number(null)`, `Number("")`, `Number(false)` and `Number([])` are all 0, which
 * `Number.isInteger` happily accepts — so coercing first would record those bodies as
 * unit 0. The value has to already be an integer.
 */
const parseUnit = (value: unknown): number | null =>
    typeof value === "number" && Number.isInteger(value) ? value : null;

progress.post("/progress/lesson", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req.json<{
        sessionId?: string;
        level?: string;
        unit?: number;
        knownWordIds?: unknown;
        reviewWordIds?: unknown;
        durationSec?: number;
    }>();

    const sessionId = body.sessionId;
    const level = body.level;
    const unit = parseUnit(body.unit);

    if (!sessionId || !level || unit === null) {
        return c.json({ message: "sessionId, level and unit are required" }, 400);
    }

    const prisma = c.get("prisma");
    const known = asStringArray(body.knownWordIds);
    const review = asStringArray(body.reviewWordIds);
    const total = known.length + review.length;

    const existing = await prisma.learningSession.findUnique({
        where: { id: sessionId },
        select: { id: true, userId: true },
    });

    // Replay of a session we already recorded — return success without double-counting.
    if (existing) {
        if (existing.userId !== userId) {
            return c.json({ message: "Forbidden" }, 403);
        }
        return c.json({ ok: true, duplicate: true });
    }

    const now = new Date();

    await prisma.learningSession.create({
        data: {
            id: sessionId,
            userId,
            level,
            unit,
            mode: "learn",
            totalWords: total,
            completedWords: total,
            endedAt: now,
            durationSec: Number.isFinite(body.durationSec)
                ? Number(body.durationSec)
                : null,
        },
    });

    for (const [wordIds, status] of [
        [known, "known"],
        [review, "review"],
    ] as const) {
        for (const wordId of wordIds) {
            const isKnown = status === "known";

            await prisma.userWordProgress.upsert({
                where: { userId_wordId: { userId, wordId } },
                create: {
                    userId,
                    wordId,
                    level,
                    unit,
                    status,
                    seenCount: 1,
                    knownCount: isKnown ? 1 : 0,
                    reviewCount: isKnown ? 0 : 1,
                    lastSeenAt: now,
                    nextReviewAt: new Date(now.getTime() + DAY_MS),
                },
                update: {
                    status,
                    seenCount: { increment: 1 },
                    knownCount: isKnown ? { increment: 1 } : undefined,
                    reviewCount: isKnown ? undefined : { increment: 1 },
                    lastSeenAt: now,
                },
            });
        }
    }

    // A lesson is one ROUND of a unit, not the whole unit, so unit progress is derived
    // from what is actually stored rather than from this request. Counting also makes it
    // idempotent: repeating a round cannot inflate the tallies, which matters because D1
    // gives us no transaction to lean on.
    const [unitWordCount, studied, learned, needsReview] = await Promise.all([
        prisma.vocabWord.count({ where: { level, unit, status: "published" } }),
        prisma.userWordProgress.count({ where: { userId, level, unit } }),
        prisma.userWordProgress.count({
            where: { userId, level, unit, status: "known" },
        }),
        prisma.userWordProgress.count({
            where: { userId, level, unit, status: "review" },
        }),
    ]);

    const unitComplete = unitWordCount > 0 && studied >= unitWordCount;

    await prisma.userUnitProgress.upsert({
        where: { userId_level_unit: { userId, level, unit } },
        create: {
            userId,
            level,
            unit,
            totalWords: unitWordCount,
            currentIndex: studied,
            learnedCount: learned,
            reviewCount: needsReview,
            lastStudiedAt: now,
            completedAt: unitComplete ? now : null,
        },
        update: {
            totalWords: unitWordCount,
            currentIndex: studied,
            learnedCount: learned,
            reviewCount: needsReview,
            lastStudiedAt: now,
            // `undefined` leaves an earlier completion in place rather than clearing it.
            completedAt: unitComplete ? now : undefined,
        },
    });

    return c.json({ ok: true, duplicate: false });
});

progress.post("/progress/quiz", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req.json<{
        quizId?: string;
        level?: string;
        unit?: number;
        answers?: unknown;
    }>();

    const quizId = body.quizId;
    const level = body.level;
    const unit = parseUnit(body.unit);

    if (!quizId || !level || unit === null) {
        return c.json({ message: "quizId, level and unit are required" }, 400);
    }

    type Answer = { wordId: string; isCorrect: boolean; answer?: string; correctAnswer?: string };

    const answers: Answer[] = Array.isArray(body.answers)
        ? (body.answers as Answer[]).filter(
              (a) => a && typeof a.wordId === "string" && typeof a.isCorrect === "boolean",
          )
        : [];

    const prisma = c.get("prisma");

    const existing = await prisma.quizResult.findUnique({
        where: { id: quizId },
        select: { id: true, userId: true },
    });

    if (existing) {
        if (existing.userId !== userId) return c.json({ message: "Forbidden" }, 403);
        return c.json({ ok: true, duplicate: true });
    }

    // The score is computed here, never read from the request.
    const correct = answers.filter((a) => a.isCorrect).length;
    const now = new Date();

    await prisma.quizResult.create({
        data: {
            id: quizId,
            userId,
            level,
            unit,
            score: correct,
            total: answers.length,
            correctCount: correct,
            incorrectCount: answers.length - correct,
            endedAt: now,
        },
    });

    for (const answer of answers) {
        await prisma.userWordAttempt.create({
            data: {
                userId,
                wordId: answer.wordId,
                quizResultId: quizId,
                level,
                unit,
                activityType: "quiz",
                result: answer.isCorrect ? "correct" : "incorrect",
                answer: String(answer.answer ?? "").slice(0, 200),
                correctAnswer: String(answer.correctAnswer ?? "").slice(0, 200),
            },
        });

        const current = await prisma.userWordProgress.findUnique({
            where: { userId_wordId: { userId, wordId: answer.wordId } },
            select: { mastery: true, streak: true },
        });

        const mastery = answer.isCorrect
            ? Math.min((current?.mastery ?? 0) + 1, MASTERY_MASTERED)
            : Math.max((current?.mastery ?? 0) - 1, 0);

        const nextReviewAt = new Date(
            now.getTime() + reviewIntervalDays(mastery) * DAY_MS,
        );

        await prisma.userWordProgress.upsert({
            where: { userId_wordId: { userId, wordId: answer.wordId } },
            create: {
                userId,
                wordId: answer.wordId,
                level,
                unit,
                status: answer.isCorrect ? "known" : "review",
                mastery,
                seenCount: 1,
                correctCount: answer.isCorrect ? 1 : 0,
                incorrectCount: answer.isCorrect ? 0 : 1,
                streak: answer.isCorrect ? 1 : 0,
                lastSeenAt: now,
                lastCorrectAt: answer.isCorrect ? now : null,
                lastIncorrectAt: answer.isCorrect ? null : now,
                nextReviewAt,
                masteredAt: mastery >= MASTERY_MASTERED ? now : null,
            },
            update: {
                // Without this a lapse left the word marked "known" forever: status was
                // only ever set on create, so demotion silently never happened.
                status: answer.isCorrect ? "known" : "review",
                mastery,
                seenCount: { increment: 1 },
                correctCount: answer.isCorrect ? { increment: 1 } : undefined,
                incorrectCount: answer.isCorrect ? undefined : { increment: 1 },
                streak: answer.isCorrect ? { increment: 1 } : 0,
                lastSeenAt: now,
                lastCorrectAt: answer.isCorrect ? now : undefined,
                lastIncorrectAt: answer.isCorrect ? undefined : now,
                nextReviewAt,
                masteredAt: mastery >= MASTERY_MASTERED ? now : undefined,
            },
        });
    }

    return c.json({ ok: true, duplicate: false, score: correct, total: answers.length });
});

/**
 * Per-word state for a set of words, so a lesson can show mastery pips without the client
 * inventing them. Scoped to the caller: ids are echoed back only if that learner has
 * progress on them.
 */
progress.get("/progress/words", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const raw = c.req.query("ids") ?? "";
    const ids = raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100);

    if (ids.length === 0) return c.json({ words: [] });

    const words = await c.get("prisma").userWordProgress.findMany({
        where: { userId, wordId: { in: ids } },
        select: {
            wordId: true,
            status: true,
            mastery: true,
            seenCount: true,
            correctCount: true,
            incorrectCount: true,
            nextReviewAt: true,
        },
    });

    return c.json({ words });
});

/**
 * The mistakes bank: words this learner has got wrong or flagged for review, worst first.
 * `MASTERY_MASTERED` is the ceiling, so anything below it can still come back.
 */
progress.get("/progress/mistakes", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    // The word itself comes back on the same query. Resolving it client-side meant
    // fetching a handful of units and silently dropping any mistake outside them, so the
    // count and the list could disagree.
    const rows = await c.get("prisma").userWordProgress.findMany({
        where: {
            userId,
            OR: [{ status: "review" }, { incorrectCount: { gt: 0 } }],
            word: { status: "published" },
        },
        orderBy: [{ incorrectCount: "desc" }, { lastSeenAt: "desc" }],
        take: 50,
        select: {
            wordId: true,
            level: true,
            unit: true,
            status: true,
            mastery: true,
            incorrectCount: true,
            word: {
                select: {
                    displayWord: true,
                    partOfSpeech: true,
                    meaningTh: true,
                    pronunciationTh: true,
                    slug: true,
                },
            },
        },
    });

    return c.json({ words: rows, total: rows.length });
});

/** Everything the profile page needs, in one round trip. */
progress.get("/progress/summary", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const prisma = c.get("prisma");

    const [
        lessons,
        quizzes,
        wordsSeen,
        wordsKnown,
        wordsMastered,
        mistakes,
        unitsCompleted,
        recentQuizzes,
        lastSession,
    ] = await Promise.all([
            prisma.learningSession.count({ where: { userId } }),
            prisma.quizResult.count({ where: { userId } }),
            prisma.userWordProgress.count({ where: { userId } }),
            prisma.userWordProgress.count({ where: { userId, status: "known" } }),
            prisma.userWordProgress.count({
                where: { userId, mastery: { gte: MASTERY_MASTERED } },
            }),
            prisma.userWordProgress.count({
                where: {
                    userId,
                    OR: [{ status: "review" }, { incorrectCount: { gt: 0 } }],
                },
            }),
            prisma.userUnitProgress.count({
                where: { userId, completedAt: { not: null } },
            }),
            prisma.quizResult.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    level: true,
                    unit: true,
                    score: true,
                    total: true,
                    createdAt: true,
                },
            }),
            prisma.learningSession.findFirst({
                where: { userId },
                orderBy: { startedAt: "desc" },
                select: { level: true, unit: true, startedAt: true },
            }),
        ]);

    const scored = recentQuizzes.reduce(
        (acc, quiz) => ({
            score: acc.score + quiz.score,
            total: acc.total + quiz.total,
        }),
        { score: 0, total: 0 },
    );

    return c.json({
        lessons,
        quizzes,
        wordsSeen,
        wordsKnown,
        wordsMastered,
        mistakes,
        unitsCompleted,
        recentAccuracy:
            scored.total > 0 ? Math.round((scored.score / scored.total) * 100) : null,
        lastSession,
        recentQuizzes,
    });
});
