import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * The numbers the admin overview shows — content readiness on one side, learners on the
 * other.
 *
 * Two rules shape what is in here and what is not:
 *
 * 1. **Everything is derived on read.** No counter table, no nightly job. At this scale the
 *    queries are cheap, and a stored aggregate is a second source of truth that drifts the
 *    first time a write is interrupted — which, with no transactions in D1, is a matter of
 *    when.
 * 2. **No per-learner detail.** This is an operations screen, not a surveillance one: it
 *    answers "is the content ready" and "is anyone coming back", and it exposes no email,
 *    no name and nothing that identifies a person. `/user` already lists accounts for the
 *    cases where an admin genuinely needs one.
 *
 * The activation and return rates are the two the roadmap actually asks for
 * (`docs/LEARNER-LIFECYCLE.md` §1.1): a percentage without its denominator is a vanity
 * number, so both are returned as counts and the screen does the division.
 */

export const stats = new Hono<Env>();

const DAY_MS = 24 * 60 * 60 * 1000;

stats.get("/admin/stats", async (c) => {
    if (c.get("role") !== "admin") return c.json({ message: "Unauthorized" }, 401);

    const prisma = c.get("prisma");
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
        words,
        published,
        withMeaning,
        withExample,
        withAudio,
        flagged,
        approved,
        learners,
        learnersThisMonth,
        sessionsCompleted,
        sessionsThisWeek,
        activated,
        reminderOptIns,
        pushSubscriptions,
        lists,
    ] = await Promise.all([
        prisma.vocabWord.count(),
        prisma.vocabWord.count({ where: { status: "published" } }),
        prisma.vocabWord.count({ where: { status: "published", meaningTh: { not: "" } } }),
        prisma.vocabWord.count({ where: { status: "published", exampleEn: { not: "" } } }),
        prisma.vocabWord.count({ where: { status: "published", audioKeyEn: { not: "" } } }),
        prisma.vocabWord.count({ where: { reviewState: "flagged" } }),
        prisma.vocabWord.count({ where: { reviewState: "approved" } }),
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
        prisma.mixedSession.count({ where: { completedAt: { not: null } } }),
        prisma.mixedSession.count({ where: { completedAt: { gte: weekAgo } } }),
        // Activation, as the lifecycle doc defines it: an account that finished at least one
        // graded session. Counted through the session table so it cannot disagree with the
        // learner's own progress page.
        prisma.mixedSession
            .findMany({
                where: { completedAt: { not: null } },
                distinct: ["userId"],
                select: { userId: true },
            })
            .then((rows: { userId: string }[]) => rows.length),
        prisma.user.count({ where: { reminderOptIn: true } }),
        prisma.pushSubscription.count({ where: { failedAt: null } }),
        prisma.wordlist.count({ where: { isPublished: true } }),
    ]);

    /**
     * Learners who finished a session in the last week *and* had also finished one before
     * that week began — the honest reading of "came back", as opposed to counting a first
     * visit as a return.
     */
    const activeThisWeek = await prisma.mixedSession.findMany({
        where: { completedAt: { gte: weekAgo } },
        distinct: ["userId"],
        select: { userId: true },
    });

    const returning = activeThisWeek.length
        ? await prisma.mixedSession.findMany({
              where: {
                  userId: { in: activeThisWeek.map((row: { userId: string }) => row.userId) },
                  completedAt: { lt: weekAgo, not: null },
              },
              distinct: ["userId"],
              select: { userId: true },
          })
        : [];

    return c.json({
        content: {
            words,
            published,
            withMeaning,
            withExample,
            withAudio,
            flagged,
            approved,
            // Everything nobody has looked at. Not an error — the import default — but the
            // number that decides how much of the corpus is trusted rather than assumed.
            unreviewed: words - flagged - approved,
            publishedLists: lists,
        },
        learners: {
            total: learners,
            newThisMonth: learnersThisMonth,
            activated,
            activeThisWeek: activeThisWeek.length,
            returningThisWeek: returning.length,
            reminderOptIns,
            pushSubscriptions,
        },
        sessions: {
            completed: sessionsCompleted,
            thisWeek: sessionsThisWeek,
        },
    });
});
