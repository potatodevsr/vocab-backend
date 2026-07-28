import type { Context } from "hono";
import { force } from "prisma-guard";

/**
 * Caller resolution order in the generated router is
 *   guard.resolveVariant(c) -> the `x-api-variant` HEADER -> undefined
 *
 * so this must never return undefined: falling through hands variant selection to a
 * client-controlled header, and anyone could ask for the `admin` shape. Always a
 * definite string. See AGENTS.md rule 2.
 */
export const resolveVariant = (c: Context): string =>
    c.get("role") === "admin" ? "admin" : "public";

/** Fields safe to expose to a learner. Notably absent everywhere: `password`. */
const PUBLIC_USER_FIELDS = {
    id: true,
    username: true,
    email: true,
    firstName: true,
    lastName: true,
    createdAt: true,
} as const;

export const USER_SHAPES = {
    admin: {
        where: {
            id: { equals: true },
            email: { contains: true, equals: true },
            username: { contains: true, equals: true },
            firstName: { contains: true },
            lastName: { contains: true },
            OR: {
                email: { contains: true },
                username: { contains: true },
                firstName: { contains: true },
                lastName: { contains: true },
            },
        },
        orderBy: { createdAt: true, username: true },
        select: PUBLIC_USER_FIELDS,
        take: { max: 100, default: 50 },
        skip: true,
    },
    // A learner has no business listing other users at all; the route is admin-gated,
    // but the shape is the backstop if that hook is ever removed.
    public: {
        where: { id: { equals: true } },
        select: { id: true, username: true },
        take: { max: 1, default: 1 },
    },
} as const;

const PUBLIC_WORD_FIELDS = {
    id: true,
    level: true,
    unit: true,
    word: true,
    displayWord: true,
    slug: true,
    homograph: true,
    sense: true,
    partOfSpeech: true,
    meaningTh: true,
    pronunciationTh: true,
    ipa: true,
    exampleEn: true,
    exampleTh: true,
    sourceOrder: true,
    status: true,
    // Powers <lastmod> in the sitemap — crawlers use it to decide what to re-fetch.
    updatedAt: true,
} as const;

export const VOCAB_WORD_SHAPES = {
    // Learners only ever see published words — the filter is forced, not merely defaulted,
    // so a crafted `where` cannot surface drafts.
    public: {
        where: {
            level: { equals: true },
            unit: { equals: true },
            slug: { equals: true },
            status: { equals: force("published") },
        },
        orderBy: { sourceOrder: true },
        select: PUBLIC_WORD_FIELDS,
        take: { max: 100, default: 100 },
        // Public reads may page. The sitemap has to walk every published word, and
        // paging through content we are deliberately publishing leaks nothing.
        skip: true,
    },
    admin: {
        where: {
            id: { equals: true },
            level: { equals: true },
            unit: { equals: true },
            slug: { equals: true },
            status: { equals: true },
            word: { contains: true, equals: true },
        },
        orderBy: { sourceOrder: true, updatedAt: true },
        select: { ...PUBLIC_WORD_FIELDS, notes: true, sourceKey: true },
        take: { max: 100, default: 50 },
        skip: true,
    },
} as const;

/**
 * What an admin may write through the generated `update` route.
 *
 * Note the `where` form: `update` targets a Prisma WhereUniqueInput, which rejects
 * operator objects. It must be `{ id: true }`, not `{ id: { equals: true } }` like the
 * read shapes above — guard returns a 400 explaining this if you get it wrong.
 */
export const VOCAB_WORD_UPDATE_SHAPE = {
    admin: {
        where: { id: true },
        data: {
            meaningTh: true,
            pronunciationTh: true,
            ipa: true,
            exampleEn: true,
            exampleTh: true,
            notes: true,
            status: true,
        },
        select: PUBLIC_WORD_FIELDS,
    },
} as const;
