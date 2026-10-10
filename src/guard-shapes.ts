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
    pronunciationRoman: true,
    meaningThReading: true,
    meaningThRoman: true,
    ipa: true,
    exampleEn: true,
    exampleTh: true,
    exampleThRoman: true,
    // JSON: the per-part-of-speech meanings and examples. Public because the word page
    // renders them — see the column comment in schema.prisma.
    posUsages: true,
    // JSON: the hand-corrected letter breakdown, when a curator has supplied one. Public
    // for the same reason — the word page is where it is rendered.
    letterBreakdown: true,
    sourceOrder: true,
    status: true,
    // The R2 keys the learner-facing player needs to build an audio URL. Public because
    // the audio itself is public content; an empty key simply means no player.
    audioKeyEn: true,
    audioKeyExample: true,
    // Public because the *web* repo decides indexability from it (lib/seo.ts): only an
    // approved row may be indexed. It says nothing a learner could not infer, and keeping
    // it admin-only would mean a second, admin-authenticated read on every public page.
    reviewState: true,
    // Powers <lastmod> in the sitemap — crawlers use it to decide what to re-fetch.
    updatedAt: true,
} as const;

/**
 * What an admin gets back, on reads *and* on writes.
 *
 * The update route must project this too, not `PUBLIC_WORD_FIELDS`. The admin table
 * replaces its row with whatever `update` returns, so a field that is writable but absent
 * from the response blanks its own cell the moment you save it — which is what `notes`
 * did before this constant existed.
 */
const ADMIN_WORD_FIELDS = {
    ...PUBLIC_WORD_FIELDS,
    notes: true,
    sourceKey: true,
    // Which heuristics fired, and when a human last signed the row off. Admin-only: the
    // queue is the only thing that reads them, and a public "we suspect this row is
    // wrong" marker on a page we are still serving helps nobody.
    reviewFlags: true,
    reviewedAt: true,
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
        // `level` and `unit` order the same way the admin list does. Both are already in
        // PUBLIC_WORD_FIELDS, so ordering by them exposes nothing a public read cannot
        // already select — and `lib/admin-api.ts` is one client serving both variants, so
        // an ordering the public shape rejects breaks anonymous callers outright.
        orderBy: { level: true, unit: true, sourceOrder: true },
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
            // The review queue is a filtered read of this same list: `reviewState=flagged`
            // ordered worst-first.
            reviewState: { equals: true },
            word: { contains: true, equals: true },
        },
        // `level` and `unit` are here so the curation list can be walked in the same
        // order a learner meets the words (A1 unit 1 first), rather than in the Oxford
        // list's global alphabetical order, which interleaves all four levels.
        orderBy: { level: true, unit: true, sourceOrder: true, updatedAt: true, reviewState: true },
        select: ADMIN_WORD_FIELDS,
        take: { max: 100, default: 50 },
        skip: true,
    },
} as const;

/**
 * The alphabet is public reference content — there is no draft state and nothing to hide,
 * so the learner and the admin select the same columns. `updatedAt` is the only addition,
 * and only because the curation screen sorts by it.
 */
const PUBLIC_LETTER_FIELDS = {
    id: true,
    kind: true,
    ordinal: true,
    char: true,
    name: true,
    roman: true,
    sound: true,
    soundFinal: true,
    vowelLength: true,
    clip: true,
} as const;

const ADMIN_LETTER_FIELDS = {
    ...PUBLIC_LETTER_FIELDS,
    updatedAt: true,
} as const;

/**
 * The whole table is 102 rows, and the per-character breakdown needs 70 of them at once
 * (every consonant, sign and tone mark) to name the letters of a single Thai word. A cap
 * below the table size would truncate that silently — the failure mode AGENTS.md rule 9
 * describes for words — so the ceiling sits above it deliberately. Nothing leaks: this is
 * content we publish on a reference page.
 */
const LETTER_TAKE = { max: 120, default: 120 } as const;

export const THAI_LETTER_SHAPES = {
    public: {
        where: { kind: { equals: true }, char: { equals: true } },
        orderBy: { kind: true, ordinal: true },
        select: PUBLIC_LETTER_FIELDS,
        take: LETTER_TAKE,
        skip: true,
    },
    admin: {
        where: {
            id: { equals: true },
            kind: { equals: true },
            char: { equals: true },
            name: { contains: true },
            roman: { contains: true },
        },
        orderBy: { kind: true, ordinal: true, updatedAt: true },
        select: ADMIN_LETTER_FIELDS,
        take: LETTER_TAKE,
        skip: true,
    },
} as const;

/**
 * The writable surface of a letter, shared by create and update.
 *
 * `char`, `kind` and `ordinal` are here because the curation screen adds and removes rows,
 * which is impossible without them. It is worth knowing what that costs: the per-character
 * breakdown resolves a letter *by its character*, so retyping `char` on an existing row
 * silently detaches it from every word that renders through it — the mark stops being
 * recognised rather than showing an error. `e2e/unit/thai-letters.spec.ts` pins the
 * characters the corpus actually uses so that damage cannot land unnoticed.
 */
const LETTER_WRITABLE_FIELDS = {
    kind: true,
    ordinal: true,
    char: true,
    name: true,
    roman: true,
    sound: true,
    soundFinal: true,
    vowelLength: true,
    clip: true,
} as const;

export const THAI_LETTER_CREATE_SHAPE = {
    admin: {
        data: LETTER_WRITABLE_FIELDS,
        select: ADMIN_LETTER_FIELDS,
    },
} as const;

/**
 * Note the `where` form: `update` and `delete` target a Prisma WhereUniqueInput, which
 * rejects operator objects. It must be `{ id: true }`, not `{ id: { equals: true } }` like
 * the read shapes above — guard returns a 400 explaining this if you get it wrong.
 */
export const THAI_LETTER_UPDATE_SHAPE = {
    admin: {
        where: { id: true },
        data: LETTER_WRITABLE_FIELDS,
        select: ADMIN_LETTER_FIELDS,
    },
} as const;

export const THAI_LETTER_DELETE_SHAPE = {
    admin: {
        where: { id: true },
        select: ADMIN_LETTER_FIELDS,
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
            pronunciationRoman: true,
            meaningThReading: true,
            meaningThRoman: true,
            ipa: true,
            exampleEn: true,
            exampleTh: true,
            exampleThRoman: true,
            posUsages: true,
            letterBreakdown: true,
            notes: true,
            status: true,
            // Writable so the queue can approve a row in the same PATCH that fixes its
            // Thai. `reviewedAt` is set by the admin client rather than a trigger because
            // D1 has none; the queue sends both together.
            reviewState: true,
            reviewFlags: true,
            reviewedAt: true,
            // Written by the audio generation script through the same admin path, so
            // there is one writer for the table rather than a second privileged surface.
            audioKeyEn: true,
            audioKeyExample: true,
        },
        select: ADMIN_WORD_FIELDS,
    },
} as const;
