import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";
import { DEFAULT_WORDLIST } from "./wordlists.js";
/**
 * The unit list counts strong words with the same predicate as everything else.
 *
 * It was the last `mastery >= 3` in the codebase — a fourth threshold for one idea,
 * sitting behind the unit badges while the meter above them counted something different.
 * Expressed as SQL rather than `isStrong` because this is a `groupBy` over one learner's
 * whole level; the two must be read together (`backend/src/mastery.ts`).
 */
import { RECALL_DAYS_REQUIRED, STRONG_DAYS_REQUIRED } from "./mastery.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * Where a learner stands in a level: which units are open, which are done, which carry a
 * crown (SPEC §5.4.2 "Unit crowns + unlock gating", the last structural gap in the path).
 *
 * **Unlocking is a read, not a stored flag.** A `locked` column would be a second source of
 * truth that has to be flipped by whatever completes a unit, and with no transactions in D1
 * a missed flip is a learner stuck on a unit they finished. Instead the rule is evaluated
 * from the same completion ledger the checkpoint writes: unit 1 is always open, and unit
 * N+1 opens when unit N is complete.
 *
 * **The gate is deliberately soft.** A locked unit is not hidden and its public page is
 * still public — the whole corpus is browsable without an account, and pretending otherwise
 * on a page a crawler can read would be theatre. What locking changes is where the app
 * *sends* a learner: the path shows the next unit as the open one, and a session started
 * against a locked unit is answered with the unit they should be doing instead. Skipping
 * ahead stays possible for someone who insists (the level test exists precisely to let
 * them), it is just no longer the accidental default.
 */

export const units = new Hono<Env>();

/** A unit is complete when its checkpoint has been passed and the ledger row exists. */
const scopeOf = (level: string, unit: number) => `${level.toLowerCase()}:${unit}`;

/** Crowns are awarded per unit, once, by the checkpoint's exactly-once ledger insert. */
type UnitState = {
    unit: number;
    words: number;
    /** Words the learner can recall unaided — the same "strong" bar the meter uses. */
    strong: number;
    complete: boolean;
    /** Open to start now. Unit 1 always is; the rest follow the one before them. */
    unlocked: boolean;
    crown: boolean;
};

units.get("/progress/units", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const level = (c.req.query("level") ?? "A1").toUpperCase();
    const prisma = c.get("prisma");

    const learner = await prisma.user.findUnique({
        where: { id: userId },
        select: { wordlistId: true },
    });
    const wordlistId = learner?.wordlistId ?? DEFAULT_WORDLIST;

    const [wordCounts, strongCounts, completions] = await Promise.all([
        prisma.vocabWord.groupBy({
            by: ["unit"],
            where: { level, wordlistId, status: "published" },
            _count: { _all: true },
        }),
        prisma.$queryRaw<{ unit: number; strong: number }[]>`
            SELECT w.unit AS unit, COUNT(*) AS strong
            FROM UserWordProgress p
            JOIN VocabWord w ON w.id = p.wordId
            WHERE p.userId = ${userId} AND w.level = ${level}
              AND w.wordlistId = ${wordlistId}
              AND p.recallDays >= ${RECALL_DAYS_REQUIRED}
              AND p.strongDays >= ${STRONG_DAYS_REQUIRED}
            GROUP BY w.unit
        `,
        prisma.completionLedger.findMany({
            where: { userId, kind: "unit" },
            select: { scope: true },
        }),
    ]);

    const done = new Set(completions.map((row: { scope: string }) => row.scope));
    const strongByUnit = new Map(
        strongCounts.map((row) => [Number(row.unit), Number(row.strong)]),
    );

    const ordered = wordCounts
        .map((row: { unit: number | null; _count: { _all: number } }) => ({
            unit: row.unit ?? 1,
            words: row._count._all,
        }))
        .sort((a: { unit: number }, b: { unit: number }) => a.unit - b.unit);

    const states: UnitState[] = [];
    let previousComplete = true; // unit 1 has nothing before it

    for (const row of ordered) {
        const complete = done.has(scopeOf(level, row.unit));

        states.push({
            unit: row.unit,
            words: row.words,
            strong: strongByUnit.get(row.unit) ?? 0,
            complete,
            unlocked: previousComplete || complete,
            // A crown *is* a passed checkpoint. Keeping them the same fact rather than two
            // means a learner can never see a crown on a unit the app still calls open.
            crown: complete,
        });

        previousComplete = complete;
    }

    /** The unit the path should point at: the first open one that is not finished. */
    const nextUnit =
        states.find((state) => state.unlocked && !state.complete)?.unit ??
        states.find((state) => !state.complete)?.unit ??
        states[states.length - 1]?.unit ??
        1;

    return c.json({
        level,
        nextUnit,
        crowns: states.filter((state) => state.crown).length,
        units: states,
    });
});
