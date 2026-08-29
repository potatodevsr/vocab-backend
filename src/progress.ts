import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";
import {
    MASTERY_MASTERED,
    MASTERY_MAX,
    RECALL_DAYS_REQUIRED,
    REVIEW_INTERVAL_DAYS,
    STRONG_DAYS_REQUIRED,
    isRecallItem,
    isStrong,
    learnerDay,
} from "./mastery.js";

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



/** The ladder, extended past 30 days — `./mastery.js`. */
const reviewIntervalDays = (mastery: number) =>
    REVIEW_INTERVAL_DAYS[Math.min(Math.max(mastery, 0), MASTERY_MAX)];

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

/** Loose match: case/whitespace/punctuation-insensitive, same spirit as lib/text.ts's
 *  normalizeAnswer, reimplemented here because the Worker never trusts the client's own
 *  verdict on whether a re-typed answer was "close enough". */
const normalize = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, "");

const QUIZ_ANSWER_TYPES = ["meaning-choice", "reverse-choice", "spelling"] as const;

/**
 * What each legacy quiz question actually asks of the learner, in the mixed session's own
 * vocabulary (`backend/src/mastery.ts`).
 *
 * `meaning-choice` shows the word and four Thai glosses: recognition. `reverse-choice`
 * shows a gloss and four words — the same shape as the session's `choose-word`, so recall.
 * `spelling` is typed from nothing: recall.
 */
const QUIZ_ITEM_CATEGORY: Record<(typeof QUIZ_ANSWER_TYPES)[number], string> = {
    "meaning-choice": "choose-meaning",
    "reverse-choice": "choose-word",
    spelling: "spelling",
};
type QuizAnswerType = (typeof QUIZ_ANSWER_TYPES)[number];
const isQuizAnswerType = (v: unknown): v is QuizAnswerType =>
    typeof v === "string" && (QUIZ_ANSWER_TYPES as readonly string[]).includes(v);

/** Same order-of-magnitude ceiling as the mixed session's item-slot budget — a quiz body
 *  is never legitimately larger than this, so a bigger one is a bug or a probe. */
const MAX_QUIZ_ANSWERS = 50;

type QuizAnswer = { wordId: string; type: QuizAnswerType; answer: string };
const isQuizAnswer = (a: unknown): a is QuizAnswer => {
    const raw = a as { wordId?: unknown; type?: unknown; answer?: unknown } | null;
    return (
        !!raw &&
        typeof raw.wordId === "string" &&
        raw.wordId.length > 0 &&
        isQuizAnswerType(raw.type) &&
        typeof raw.answer === "string"
    );
};

/**
 * Applies one word's quiz result atomically, guarded by `lastQuizId` — the same
 * compare-and-set-in-SQL shape as `session.ts`'s `applyGradedWordReward`, for the same
 * reason: this must survive being called more than once for the same `(quizId, wordId)`
 * pair (a retried request, or a crash mid-loop on an earlier call) without ever
 * double-applying, and without a separate "read mastery, then write it" step D1 cannot
 * make safe.
 */
const applyQuizWordReward = async (
    prisma: Variables["prisma"],
    userId: string,
    wordId: string,
    quizId: string,
    level: string,
    unit: number,
    isCorrect: boolean,
    now: Date,
    questionType: (typeof QUIZ_ANSWER_TYPES)[number],
    timezone: string | null,
): Promise<void> => {
    const isCorrectFlag = isCorrect ? 1 : 0;
    const initialMastery = isCorrect ? 1 : 0;
    const reviewDates = REVIEW_INTERVAL_DAYS.map((days) => new Date(now.getTime() + days * DAY_MS));

    /**
     * The question's *own* category decides what it proves.
     *
     * This used to pass the literal string `"spelling"` to `isRecallItem`, which is always
     * true — so a `meaning-choice`, which is recognition, credited a recall day. Every quiz
     * answer looked like production. `QUIZ_ITEM_CATEGORY` maps each of the three legacy
     * types onto the same categories the mixed session uses, so one policy covers both.
     *
     * Same in-SQL, same-day-idempotent shape as `session.ts`; `backend/src/mastery.ts`
     * explains why the day is computed in the statement rather than read first.
     */
    const today = learnerDay(now, timezone);
    const isRecallFlag = isCorrect && isRecallItem(QUIZ_ITEM_CATEGORY[questionType]) ? 1 : 0;

    await prisma.$executeRaw`
        INSERT INTO UserWordProgress
            (id, userId, wordId, level, unit, status, mastery, seenCount, knownCount,
             reviewCount, correctCount, incorrectCount, streak, lastSeenAt, lastCorrectAt,
             lastIncorrectAt, nextReviewAt, masteredAt, strongDays, recallDays,
             lastStrongDay, lastRecallDay, lastQuizId, createdAt, updatedAt)
        VALUES
            (${crypto.randomUUID()}, ${userId}, ${wordId}, ${level}, ${unit},
             ${isCorrect ? "known" : "review"}, ${initialMastery}, 1, 0, 0,
             ${isCorrect ? 1 : 0}, ${isCorrect ? 0 : 1}, ${isCorrect ? 1 : 0}, ${now},
             ${isCorrect ? now : null}, ${isCorrect ? null : now},
             ${reviewDates[initialMastery]},
             ${initialMastery >= MASTERY_MASTERED ? now : null},
             ${isCorrect ? 1 : 0}, ${isRecallFlag},
             ${isCorrect ? today : null}, ${isRecallFlag === 1 ? today : null},
             ${quizId}, ${now}, ${now})
        ON CONFLICT(userId, wordId) DO UPDATE SET
            status = ${isCorrect ? "known" : "review"},
            mastery = CASE WHEN ${isCorrectFlag} = 1
                           THEN MIN(mastery + 1, ${MASTERY_MAX})
                           ELSE MAX(mastery - 1, 0) END,
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
            lastQuizId = ${quizId},
            updatedAt = ${now}
        WHERE lastQuizId IS NULL OR lastQuizId != ${quizId}
    `;
};

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

    // The client reports *what it asked and what the learner picked* — never whether that
    // was right. `isCorrect`/`correctAnswer` are no longer accepted from the request body:
    // a client that could assert its own verdict could award itself mastery for free.
    // Correctness is decided here, against the real VocabWord row, from `type` + `answer`
    // alone. An invalid entry is rejected outright rather than silently dropped: a client
    // sending garbage deserves a 400 telling it so, not a quietly-shorter quiz.
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
        return c.json({ message: "answers must be a non-empty array" }, 400);
    }
    if (body.answers.length > MAX_QUIZ_ANSWERS) {
        return c.json({ message: `answers may not exceed ${MAX_QUIZ_ANSWERS} entries` }, 400);
    }
    if (!body.answers.every(isQuizAnswer)) {
        return c.json({ message: "every answer needs a wordId, a valid type and an answer" }, 400);
    }
    const submitted = body.answers as QuizAnswer[];

    const wordIds = submitted.map((a) => a.wordId);
    if (new Set(wordIds).size !== wordIds.length) {
        return c.json({ message: "duplicate wordId in answers" }, 400);
    }

    const prisma = c.get("prisma");

    const words = await prisma.vocabWord.findMany({
        where: { id: { in: wordIds } },
        select: { id: true, displayWord: true, meaningTh: true, status: true, level: true, unit: true },
    });
    const wordsById = new Map(words.map((w) => [w.id, w]));

    // Every submitted word must actually exist, be published, and belong to the level/
    // unit the quiz claims to be for — otherwise a client could submit ids from a
    // different unit (or a draft word never meant to be gradeable) to farm reward.
    const invalid = submitted.find((a) => {
        const word = wordsById.get(a.wordId);
        return !word || word.status !== "published" || word.level !== level || word.unit !== unit;
    });
    if (invalid) {
        return c.json(
            { message: "one or more words are not published in the requested level/unit" },
            400,
        );
    }

    const answers = submitted.map((a) => {
        const word = wordsById.get(a.wordId)!;
        const correctAnswer = a.type === "meaning-choice" ? word.meaningTh : word.displayWord;
        const isCorrect = normalize(a.answer) === normalize(correctAnswer);
        // `type` travels with the graded answer: the reward needs it to know whether the
        // learner recognised or recalled (`QUIZ_ITEM_CATEGORY`).
        return { wordId: a.wordId, type: a.type, isCorrect, answer: a.answer, correctAnswer };
    });

    // The score is computed here, never read from the request.
    const correct = answers.filter((a) => a.isCorrect).length;
    const now = new Date();

    const existing = await prisma.quizResult.findUnique({
        where: { id: quizId },
        select: { id: true, userId: true, score: true, total: true },
    });
    if (existing && existing.userId !== userId) {
        return c.json({ message: "Forbidden" }, 403);
    }

    if (!existing) {
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
    }

    // The learner's own day boundary, read once for the whole quiz (backend/src/mastery.ts).
    const quizLearner = await prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
    });
    const quizTimezone = quizLearner?.timezone ?? null;

    // Runs whether this is the first call or a retry: every write below is an atomic,
    // idempotent, per-word UPSERT (`applyQuizWordReward`), so a retry that finds
    // `existing` already true still finishes healing any word this quiz hadn't reached
    // yet — the bug this replaces was returning `duplicate: true` here immediately and
    // leaving those words' rewards permanently unapplied.
    for (const answer of answers) {
        await applyQuizWordReward(
            prisma, userId, answer.wordId, quizId, level, unit, answer.isCorrect, now,
            answer.type, quizTimezone,
        );

        // Best-effort audit row, healed independently of the reward it describes — same
        // split as session.ts's healSessionAttemptLedger and practice.ts's
        // healAttemptLedger, and for the same reason: it must never gate the reward.
        await prisma.$executeRaw`
            INSERT OR IGNORE INTO UserWordAttempt
                (id, userId, wordId, quizResultId, trialId, level, unit, activityType, result,
                 answer, correctAnswer, createdAt)
            VALUES
                (${crypto.randomUUID()}, ${userId}, ${answer.wordId}, ${quizId}, ${`quiz:${quizId}`},
                 ${level}, ${unit}, 'quiz', ${answer.isCorrect ? "correct" : "incorrect"},
                 ${answer.answer.slice(0, 200)}, ${answer.correctAnswer.slice(0, 200)}, ${now})
        `;
    }

    return c.json({
        ok: true,
        duplicate: !!existing,
        score: existing?.score ?? correct,
        total: existing?.total ?? answers.length,
    });
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
/**
 * Test-only: make the caller's own progress rows overdue.
 *
 * The suite cannot otherwise produce an overdue word. Scheduling is server-side and the
 * shortest interval is a day, so a review regression written against a fresh learner
 * either finds nothing due — and passes vacuously — or waits a day. The one that shipped
 * did the former: it scheduled words for tomorrow, asked for a review immediately, and
 * explicitly passed when the review came back empty. It could never have caught the defect
 * it was written for.
 *
 * Gated exactly like `POST /reminders/run`: `MAGIC_LINK_DEV_MODE` is set by the e2e
 * launcher and by nothing else, so this route does not exist in production. It is also
 * scoped to the caller — it can only backdate rows it already owns, so even if the flag
 * were ever set by mistake it grants a learner nothing they could not do by waiting.
 */
progress.post("/progress/test/backdate", async (c) => {
    if (c.env.MAGIC_LINK_DEV_MODE !== "true") return c.json({ message: "Not found" }, 404);

    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = (await c.req.json().catch(() => ({}))) as { days?: unknown };
    const days = typeof body.days === "number" && body.days > 0 ? Math.trunc(body.days) : 1;
    const when = new Date(Date.now() - days * DAY_MS);

    const updated = await c.get("prisma").$executeRaw`
        UPDATE UserWordProgress
        SET nextReviewAt = ${when}, lastSeenAt = ${when}
        WHERE userId = ${userId} AND nextReviewAt IS NOT NULL
    `;

    return c.json({ ok: true, updated });
});

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
            strongDays: true,
            recallDays: true,
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

    // `strong` is decided here, once, and sent as a verdict. The pips used to re-derive it
    // in the browser from `mastery >= 3` while the collection meter counted `mastery >= 2`,
    // so the same word could be strong in one place on the screen and not in another.
    return c.json({
        words: rows.map((row) => ({ ...row, strong: isStrong(row) })),
        total: rows.length,
    });
});

/** Everything the profile page needs, in one round trip. */
progress.get("/progress/summary", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const prisma = c.get("prisma");

    const [
        legacyLessons,
        mixedLessons,
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
            prisma.mixedSession.count({ where: { userId, completedAt: { not: null } } }),
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
        lessons: legacyLessons + mixedLessons,
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

/** LEARNER-LIFECYCLE.md §9 decision 9: A1 is the default, complete course. */
const DEFAULT_COURSE_LEVEL = "A1";
const ALL_LEVELS = ["A1", "A2", "B1", "B2"];

/**
 * §2.1 "strong": two successful recalls on different days.
 *
 * It used to be approximated by `mastery >= 2` — the ladder rung — with the UI drawing the
 * same band at 3. Neither was the promise, and the collection meter counted words answered
 * twice in one sitting. The evidence columns and the one predicate now live in
 * `./mastery.js`; this is the same test expressed as a Prisma filter so a count stays a
 * count rather than becoming a full read.
 */
const STRONG_WHERE = {
    strongDays: { gte: STRONG_DAYS_REQUIRED },
    recallDays: { gte: RECALL_DAYS_REQUIRED },
} as const;

/**
 * §9 decision 10, resolved: the week starts **Sunday**, in Thailand local time — the
 * primary audience's own week (Buddhist-era calendars and Thai bank/government weeks
 * both run Sunday-first), not the ISO default. `Asia/Bangkok` is UTC+7 year-round with no
 * DST, so a fixed-offset shift is a fully correct, server-safe substitute for real IANA
 * timezone support (`Intl.DateTimeFormat` with a timeZone name is not guaranteed
 * available in every Workers runtime) — there is no seasonal transition to get wrong.
 * `User.timezone` is stored per learner for display/profile purposes, but the weekly-goal
 * boundary itself intentionally does not vary per learner: a per-user boundary would mean
 * two learners' "this week" cover different UTC windows, which is unobservable to either
 * of them but breaks any cross-learner reporting.
 */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * The goal a learner is measured against before they have chosen one (SPEC §5.4.3: "5 of 7
 * days", adjustable to 3 or 7). Used only for the weekly streak — the goal *prompt* still
 * waits for two completed sessions before asking.
 */
const DEFAULT_WEEKLY_GOAL_DAYS = 5;

const startOfWeekBangkok = (now: Date) => {
    const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
    const d = new Date(
        Date.UTC(bangkokNow.getUTCFullYear(), bangkokNow.getUTCMonth(), bangkokNow.getUTCDate()),
    );
    d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // getUTCDay(): Sunday = 0
    return new Date(d.getTime() - BANGKOK_OFFSET_MS);
};

/**
 * Lifecycle state (LEARNER-LIFECYCLE.md §2): base state is a function of how long the
 * learner has been away, then completion milestones override it. `absenceDays === null`
 * (no completed activity yet) is treated as `active`, same as a fresh return.
 */
type LifecycleState =
    | "active"
    | "at-risk"
    | "returning"
    | "level-complete"
    | "course-complete"
    | "maintenance";

const baseLifecycleState = (absenceDays: number | null): LifecycleState => {
    if (absenceDays === null || absenceDays <= 2) return "active"; // §2 Active (0–2 local days)
    if (absenceDays <= 6) return "at-risk"; // §2 At risk (3–6)
    return "returning"; // §2 Returning (≥7)
};

/**
 * A completion milestone outranks any absence-based state (LEARNER-LIFECYCLE.md §2, §3.9):
 * a whole collection done → maintenance, the course done → course-complete, a single level
 * done → level-complete. Collection outranks course outranks level.
 */
const completionOverride = (kinds: Set<string>): LifecycleState | null => {
    if (kinds.has("collection")) return "maintenance";
    if (kinds.has("course")) return "course-complete";
    if (kinds.has("level")) return "level-complete";
    return null;
};

/** Closed set of home CTAs (LEARNER-LIFECYCLE.md §2 "Home/primary CTA"). */
type RecommendedAction =
    | "start"
    | "resume"
    | "comeback"
    | "review"
    | "next-level"
    | "maintenance";

/**
 * Resolves the single home CTA from lifecycle state and the concrete facts of the card.
 * Precedence (§2 "due review first", "a returning learner does not land on a generic page"):
 * an open session to resume beats everything, then completion milestones, then a comeback
 * nudge for anyone who has been away, then due reviews, then starting fresh.
 */
const recommendedActionFor = (
    lifecycleState: LifecycleState,
    hasOpenSession: boolean,
    dueCount: number,
): RecommendedAction => {
    if (hasOpenSession) return "resume";
    if (lifecycleState === "maintenance" || lifecycleState === "course-complete") return "maintenance";
    if (lifecycleState === "level-complete") return "next-level";
    if (lifecycleState === "at-risk" || lifecycleState === "returning") return "comeback";
    if (dueCount > 0) return "review";
    return "start";
};

/**
 * Everything the authenticated home / Today card needs in one round trip
 * (LEARNER-LIFECYCLE.md §3.6): due review priority, an in-progress session to resume,
 * the next new-word unit, weekly goal progress (computed on read, never a stored
 * counter — SPEC.md §5.4.3), the collection meter, and the learner's lifecycle state
 * (§2) with its derived home CTA.
 */
progress.get("/progress/today", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const prisma = c.get("prisma");
    const now = new Date();
    const weekStart = startOfWeekBangkok(now);

    const [
        user,
        dueCount,
        inProgressSession,
        nextUnitRow,
        activeDays,
        collectionByLevel,
        sessionsCompleted,
        lastMixedSession,
        lastLearningSession,
        lastQuizResult,
        completions,
    ] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { weeklyGoalDays: true },
        }),
        prisma.userWordProgress.count({
            where: { userId, nextReviewAt: { lte: now } },
        }),
        prisma.mixedSession.findFirst({
            where: { userId, completedAt: null },
            orderBy: { createdAt: "desc" },
            select: { id: true, level: true, unit: true, createdAt: true },
        }),
        prisma.userUnitProgress.findFirst({
            where: {
                userId,
                level: DEFAULT_COURSE_LEVEL,
                completedAt: null,
            },
            orderBy: { unit: "asc" },
            select: { unit: true },
        }),
        // One row per (userId, calendar day) would be a stored counter, which SPEC.md
        // §5.4.3 explicitly avoids — this derives active days straight from ledger rows.
        //
        // 120 days rather than this week: the same rows carry both the weekly goal and the
        // two streaks, and a second query for the streaks would be a second definition of
        // "an active day" waiting to disagree with the first. `+7 hours` is the Bangkok
        // day boundary the weekly goal already uses.
        prisma.$queryRaw<{ day: string }[]>`
            SELECT DISTINCT date(datetime(completedAt, '+7 hours')) as day FROM MixedSession
            WHERE userId = ${userId} AND completedAt IS NOT NULL
              AND completedAt >= datetime('now', '-120 days')
            ORDER BY day DESC
        `,
        collectionMeter(prisma, userId),
        prisma.mixedSession.count({ where: { userId, completedAt: { not: null } } }),
        // Latest completed activity across all three session kinds — absence is measured
        // from whichever finished most recently (LEARNER-LIFECYCLE.md §2, §3.7).
        prisma.mixedSession.findFirst({
            where: { userId, completedAt: { not: null } },
            orderBy: { completedAt: "desc" },
            select: { completedAt: true },
        }),
        prisma.learningSession.findFirst({
            where: { userId, endedAt: { not: null } },
            orderBy: { endedAt: "desc" },
            select: { endedAt: true },
        }),
        prisma.quizResult.findFirst({
            where: { userId, endedAt: { not: null } },
            orderBy: { endedAt: "desc" },
            select: { endedAt: true },
        }),
        prisma.completionLedger.findMany({
            where: { userId, kind: { in: ["level", "course", "collection"] } },
            select: { kind: true },
        }),
    ]);

    // absenceDays: whole local days since the most recent completed activity, or null when
    // the learner has never finished one. Elapsed-day math (floor) matches the §2 buckets.
    const lastActiveAt = [
        lastMixedSession?.completedAt,
        lastLearningSession?.endedAt,
        lastQuizResult?.endedAt,
    ].reduce<Date | null>((latest, ts) => (ts && (!latest || ts > latest) ? ts : latest), null);
    const absenceDays =
        lastActiveAt === null
            ? null
            : Math.max(0, Math.floor((now.getTime() - lastActiveAt.getTime()) / DAY_MS));

    const lifecycleState =
        completionOverride(new Set(completions.map((row) => row.kind))) ??
        baseLifecycleState(absenceDays);
    const recommendedAction = recommendedActionFor(
        lifecycleState,
        inProgressSession !== null,
        dueCount,
    );

    /**
     * Both streaks, from the one activity list.
     *
     * The weekly streak counts back over whole Bangkok weeks, each of which has to meet the
     * learner's own goal (default 5 of 7 — SPEC §5.4.3). The current week is only allowed
     * to *extend* the streak, never to break it: it is still in progress, and a Tuesday
     * cannot be judged on a Monday.
     */
    const activeDayList = activeDays.map((row: { day: string }) => row.day);
    const bangkokDayKey = (date: Date) =>
        new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);

    const todayKey = bangkokDayKey(now);
    const yesterdayKey = bangkokDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const dailyStreak = streaksFrom(activeDayList, todayKey, yesterdayKey);

    const goalDays = user?.weeklyGoalDays ?? DEFAULT_WEEKLY_GOAL_DAYS;
    const activeDaysThisWeek = activeDayList.filter(
        (day: string) => day >= bangkokDayKey(weekStart),
    );

    let weeklyStreak = 0;
    for (let back = 0; back < 26; back += 1) {
        const start = new Date(weekStart.getTime() - back * 7 * 24 * 60 * 60 * 1000);
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        const inWeek = activeDayList.filter(
            (day: string) => day >= bangkokDayKey(start) && day < bangkokDayKey(end),
        ).length;

        if (inWeek >= goalDays) {
            weeklyStreak += 1;
            continue;
        }

        // The current week is still open — a short week now is not a broken streak yet.
        if (back === 0) continue;
        break;
    }

    return c.json({
        dueCount,
        inProgressSession,
        absenceDays,
        lifecycleState,
        recommendedAction,
        nextUnit:
            nextUnitRow?.unit ?? (await prisma.vocabWord.findFirst({
                where: { level: DEFAULT_COURSE_LEVEL, status: "published" },
                orderBy: { unit: "asc" },
                select: { unit: true },
            }))?.unit ?? null,
        defaultLevel: DEFAULT_COURSE_LEVEL,
        weeklyGoal: {
            goalDays: user?.weeklyGoalDays ?? null,
            // The weekly-goal prompt only appears client-side after the second completed
            // session (§3.4); this flag lets the Today card know it may ask.
            eligibleToSetGoal: sessionsCompleted >= 2,
            activeDaysThisWeek: activeDaysThisWeek.length,
            weekStart: weekStart.toISOString(),
        },
        streak: {
            /** Consecutive active days, ending today or yesterday (SPEC §5.4.3). */
            days: dailyStreak,
            /** Consecutive weeks meeting the goal — the headline number for this audience. */
            weeks: weeklyStreak,
            /** Whether today already counts, so the UI can say "keep it" rather than "you have". */
            activeToday: activeDayList.includes(todayKey),
        },
        collection: collectionByLevel,
    });
});

/**
 * Daily and weekly streaks, derived from the session ledger.
 *
 * SPEC §5.4.3 makes the **weekly** streak the headline and the daily one secondary, for
 * this audience specifically: a daily streak punishes one bad Tuesday, and the learners
 * here are working adults. Both are computed on read from the same distinct-active-days
 * query the weekly goal already uses — no counter column, nothing to repair after a
 * deploy, and no nightly job to get the rollover wrong.
 *
 * "Today not yet practised" does **not** break the daily streak. A streak that resets at
 * midnight before the learner has had their evening is a threat, not a memory aid
 * (LEARNER-LIFECYCLE.md §1.2): the count runs back from today when today is active, and
 * from yesterday otherwise, so it only breaks once a whole day has genuinely been missed.
 */
const streaksFrom = (activeDays: string[], today: string, yesterday: string) => {
    const days = new Set(activeDays);

    let daily = 0;
    let cursor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;

    while (cursor && days.has(cursor)) {
        daily += 1;
        const [year, month, day] = cursor.split("-").map(Number);
        const previous = new Date(Date.UTC(year, month - 1, day - 1));
        cursor = previous.toISOString().slice(0, 10);
    }

    return daily;
};

const collectionMeter = async (prisma: Variables["prisma"], userId: string) => {
    const perLevel = await Promise.all(
        ALL_LEVELS.map(async (level) => {
            const [total, strong, mastered] = await Promise.all([
                prisma.vocabWord.count({ where: { level, status: "published" } }),
                prisma.userWordProgress.count({
                    where: { userId, level, ...STRONG_WHERE },
                }),
                prisma.userWordProgress.count({
                    where: { userId, level, mastery: { gte: MASTERY_MASTERED } },
                }),
            ]);
            return { level, total, strong, mastered };
        }),
    );

    return {
        courseLevel: DEFAULT_COURSE_LEVEL,
        levels: perLevel,
        totalStrong: perLevel.reduce((sum, l) => sum + l.strong, 0),
        totalMastered: perLevel.reduce((sum, l) => sum + l.mastered, 0),
    };
};

/**
 * A cell that begins with `=`, `+`, `-` or `@` is a formula-injection vector: a spreadsheet
 * opening the CSV would evaluate it. Prefix a single apostrophe so it is read as text. Run
 * this *before* RFC 4180 quoting, on the raw value.
 */
const csvGuardFormula = (value: string): string =>
    /^[=+\-@]/.test(value) ? `'${value}` : value;

/**
 * RFC 4180 field escaping: a field containing a comma, a double-quote, CR or LF is wrapped
 * in double-quotes with every internal quote doubled. Everything else is emitted verbatim.
 */
const csvField = (raw: unknown): string => {
    const value = csvGuardFormula(raw === null || raw === undefined ? "" : String(raw));
    return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

const EXPORT_WORD_COLUMNS = [
    "displayWord",
    "level",
    "unit",
    "mastery",
    // Why the word is called strong, not just that it is: the two evidence counters and
    // the moment the predicate first became true.
    "strong",
    "strongDays",
    "recallDays",
    "strongAt",
    "lastSeenAt",
    "nextReviewAt",
    "correctCount",
    "incorrectCount",
] as const;

/**
 * A learner's own data export (GDPR-style takeout). Scoped to the caller: only this user's
 * account fields and their own word progress, joined to the public word for a readable
 * `displayWord`. Never returns an id, a password hash, or a token of any kind — the JSON
 * and CSV shapes are hand-picked field lists, not a row dump. `format=json` (default) or
 * `format=csv`; anything else is a 400.
 */
/**
 * Day-by-day activity, for the progress page's calendar.
 *
 * Derived on read from the session ledger — like the weekly goal (SPEC.md §5.4.3), and for
 * the same reason: a stored per-day counter is a second source of truth that drifts the
 * first time a write is interrupted, and D1 has no transaction to prevent that.
 *
 * Days are Bangkok days, matching `startOfWeekBangkok`: a learner's calendar must not
 * disagree with the week their goal is measured against.
 */
progress.get("/progress/history", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const requested = Number(c.req.query("days") ?? "84");
    // Twelve weeks by default, a year at most: the calendar is a grid on a phone, and an
    // unbounded range is an unbounded scan of one learner's whole history.
    const days = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 7), 365) : 84;

    const prisma = c.get("prisma");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await prisma.$queryRaw<{ day: string; sessions: number; items: number }[]>`
        SELECT date(datetime(completedAt, '+7 hours')) AS day,
               COUNT(*) AS sessions,
               COALESCE(SUM(json_array_length(answers)), 0) AS items
        FROM MixedSession
        WHERE userId = ${userId} AND completedAt IS NOT NULL AND completedAt >= ${since}
        GROUP BY day
        ORDER BY day
    `;

    return c.json({
        days,
        entries: rows.map((row) => ({
            day: row.day,
            sessions: Number(row.sessions),
            items: Number(row.items),
        })),
    });
});

progress.get("/progress/export", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const format = c.req.query("format") ?? "json";
    if (format !== "json" && format !== "csv") {
        return c.json({ message: "format must be json or csv" }, 400);
    }

    const prisma = c.get("prisma");

    const [user, rows] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, username: true, timezone: true },
        }),
        prisma.userWordProgress.findMany({
            where: { userId },
            select: {
                level: true,
                unit: true,
                mastery: true,
                strongDays: true,
                recallDays: true,
                strongAt: true,
                lastSeenAt: true,
                nextReviewAt: true,
                correctCount: true,
                incorrectCount: true,
                word: { select: { displayWord: true } },
            },
        }),
    ]);

    if (!user) return c.json({ message: "Unauthorized" }, 401);

    // Sort in memory so the ordering holds identically for JSON and CSV, and so a null unit
    // sorts after real units rather than however the DB happens to collate it.
    const words = rows
        .map((r) => ({
            displayWord: r.word?.displayWord ?? "",
            level: r.level,
            unit: r.unit,
            mastery: r.mastery,
            // The evidence, exported alongside the rung so a learner's own copy of their
            // data says why a word is called strong rather than only that it is.
            strongDays: r.strongDays,
            recallDays: r.recallDays,
            strong: isStrong(r),
            strongAt: r.strongAt ? r.strongAt.toISOString() : null,
            lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null,
            nextReviewAt: r.nextReviewAt ? r.nextReviewAt.toISOString() : null,
            correctCount: r.correctCount,
            incorrectCount: r.incorrectCount,
        }))
        .sort((a, b) => {
            if (a.level !== b.level) return a.level < b.level ? -1 : 1;
            const au = a.unit ?? Number.POSITIVE_INFINITY;
            const bu = b.unit ?? Number.POSITIVE_INFINITY;
            if (au !== bu) return au - bu;
            return a.displayWord.localeCompare(b.displayWord);
        });

    const summary = {
        total: words.length,
        strong: words.filter((w) => isStrong(w)).length,
        mastered: words.filter((w) => w.mastery >= MASTERY_MASTERED).length,
    };

    const exportedAt = new Date().toISOString();

    if (format === "csv") {
        const lines = [
            EXPORT_WORD_COLUMNS.join(","),
            ...words.map((w) => EXPORT_WORD_COLUMNS.map((col) => csvField(w[col])).join(",")),
        ];
        // RFC 4180 records are CRLF-terminated.
        return c.body(lines.join("\r\n"), 200, {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="vocab-progress.csv"',
        });
    }

    return c.json({
        exportedAt,
        learner: {
            email: user.email,
            username: user.username,
            timezone: user.timezone,
        },
        summary,
        words,
    });
});

/**
 * Sets the weekly goal (§3.4/§4.2): asked only after the second completed session, and
 * enforced here — not just hidden in the UI — so the request can't be replayed early by
 * hand. `days` is clamped to a real week.
 */
progress.post("/progress/goal", async (c) => {
    const userId = requireUserId(c);
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = await c.req.json<{ days?: unknown }>().catch(() => ({}));
    const days = parseUnit(body.days);
    if (days === null || days < 1 || days > 7) {
        return c.json({ message: "days must be an integer from 1 to 7" }, 400);
    }

    const prisma = c.get("prisma");
    const sessionsCompleted = await prisma.mixedSession.count({
        where: { userId, completedAt: { not: null } },
    });
    if (sessionsCompleted < 2) {
        return c.json({ message: "Weekly goal unlocks after two completed sessions" }, 403);
    }

    await prisma.user.update({ where: { id: userId }, data: { weeklyGoalDays: days } });
    return c.json({ ok: true, goalDays: days });
});
