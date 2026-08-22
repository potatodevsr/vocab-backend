import { Hono } from "hono";

import type { Bindings, Variables } from "./index.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * The lists a learner can study, and the one they are studying.
 *
 * Today there is exactly one — the Oxford 3000 course — and the UI is written to notice
 * that: a picker offering a single choice is a decision the learner does not have. What
 * this module buys is the shape, so the second list (an exam pack, a themed set) is an
 * import plus a row, not a change to how sessions pick words.
 *
 * **Entitlement lives here, in one function.** `canStudyList` returns true for every
 * published list because everything is free (SPEC.md open question 2 is open). When that
 * changes it changes in one place — the alternative, a paid check sprinkled through every
 * read, is how a paywall ends up half-applied and either leaky or annoying.
 */

export const wordlists = new Hono<Env>();

export const DEFAULT_WORDLIST = "oxford-3000";

type ListRow = {
    id: string;
    title: string;
    titleTh: string;
    description: string;
    descriptionTh: string;
    isFree: boolean;
};

/**
 * Whether this learner may study this list.
 *
 * `userId` is unused today and stays in the signature on purpose: every caller already
 * passes what a real entitlement check would need, so turning one on is a change to this
 * function's body and nothing else.
 */
export const canStudyList = (list: Pick<ListRow, "isFree">, _userId: string | null): boolean =>
    list.isFree;

/** Public: what is on offer. No account needed — this is a shop window, not a setting. */
wordlists.get("/wordlists", async (c) => {
    const rows = (await c.get("prisma").wordlist.findMany({
        where: { isPublished: true },
        orderBy: { ordinal: "asc" },
        select: {
            id: true,
            title: true,
            titleTh: true,
            description: true,
            descriptionTh: true,
            isFree: true,
        },
    })) as ListRow[];

    const counts = await c.get("prisma").vocabWord.groupBy({
        by: ["wordlistId"],
        where: { status: "published" },
        _count: { _all: true },
    });

    const countOf = new Map(
        counts.map((row: { wordlistId: string; _count: { _all: number } }) => [
            row.wordlistId,
            row._count._all,
        ]),
    );

    return c.json({
        lists: rows.map((row) => ({
            ...row,
            // The published count, not the imported one: a list is as big as what a
            // learner can actually reach.
            wordCount: countOf.get(row.id) ?? 0,
        })),
    });
});

/**
 * Every list, published or not, for the curation screen.
 *
 * Separate from the public catalogue rather than a variant of it: the public route must
 * never leak an unpublished list, and the safest way to guarantee that is for the query
 * that can see drafts to live behind its own admin check.
 */
wordlists.get("/wordlists/admin", async (c) => {
    if (c.get("role") !== "admin") return c.json({ message: "Unauthorized" }, 401);

    const prisma = c.get("prisma");

    const rows = await prisma.wordlist.findMany({ orderBy: { ordinal: "asc" } });

    const counts = await prisma.vocabWord.groupBy({
        by: ["wordlistId", "status"],
        _count: { _all: true },
    });

    const countOf = (id: string, status: string) =>
        counts.find(
            (row: { wordlistId: string; status: string }) =>
                row.wordlistId === id && row.status === status,
        )?._count._all ?? 0;

    return c.json({
        lists: rows.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            title: row.title as string,
            titleTh: row.titleTh as string,
            description: row.description as string,
            descriptionTh: row.descriptionTh as string,
            ordinal: row.ordinal as number,
            isFree: row.isFree as boolean,
            isPublished: row.isPublished as boolean,
            publishedWords: countOf(row.id as string, "published"),
            draftWords: countOf(row.id as string, "draft"),
        })),
    });
});

/**
 * Publish, unpublish, reorder or reprice a list.
 *
 * The one rule worth enforcing here rather than in the UI: a list with no published words
 * cannot be published. Offering a learner a list that renders an empty course is the
 * failure the draft state exists to prevent.
 */
wordlists.post("/wordlists/admin/:id", async (c) => {
    if (c.get("role") !== "admin") return c.json({ message: "Unauthorized" }, 401);

    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => null)) as {
        isPublished?: unknown;
        isFree?: unknown;
        ordinal?: unknown;
    } | null;

    const prisma = c.get("prisma");
    const list = await prisma.wordlist.findUnique({ where: { id }, select: { id: true } });
    if (!list) return c.json({ message: "Not found" }, 404);

    if (body?.isPublished === true) {
        const published = await prisma.vocabWord.count({
            where: { wordlistId: id, status: "published" },
        });
        if (published === 0) {
            return c.json({ message: "This list has no published words yet" }, 422);
        }
    }

    const updated = await prisma.wordlist.update({
        where: { id },
        data: {
            ...(typeof body?.isPublished === "boolean" ? { isPublished: body.isPublished } : {}),
            ...(typeof body?.isFree === "boolean" ? { isFree: body.isFree } : {}),
            ...(Number.isInteger(body?.ordinal) ? { ordinal: body!.ordinal as number } : {}),
        },
        select: { id: true, isPublished: true, isFree: true, ordinal: true },
    });

    return c.json(updated);
});

/** Which list the signed-in learner is on. */
wordlists.get("/wordlists/current", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const user = await c.get("prisma").user.findUnique({
        where: { id: userId },
        select: { wordlistId: true },
    });

    return c.json({ wordlistId: user?.wordlistId ?? DEFAULT_WORDLIST });
});

/**
 * Switch lists.
 *
 * Progress is per word, not per list, so switching keeps everything already learned and
 * simply changes what the next session draws from — a learner may move between lists as
 * often as they like without being punished for it (LEARNER-LIFECYCLE.md §1.2: a learner
 * may pause, change goal or restart placement without losing learned-word history).
 */
wordlists.post("/wordlists/current", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = (await c.req.json().catch(() => null)) as { wordlistId?: unknown } | null;
    const wordlistId = typeof body?.wordlistId === "string" ? body.wordlistId : "";
    if (!wordlistId) return c.json({ message: "wordlistId is required" }, 400);

    const list = (await c.get("prisma").wordlist.findUnique({
        where: { id: wordlistId },
        select: { id: true, isPublished: true, isFree: true },
    })) as (ListRow & { isPublished: boolean }) | null;

    if (!list || !list.isPublished) return c.json({ message: "Not found" }, 404);
    if (!canStudyList(list, userId)) return c.json({ message: "Not available on your plan" }, 402);

    await c.get("prisma").user.update({
        where: { id: userId },
        data: { wordlistId },
    });

    return c.json({ wordlistId });
});
