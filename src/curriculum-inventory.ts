/**
 * The one answer to "which units exist".
 *
 * Before this route, four places each worked it out for themselves and all four used the
 * same wrong sum: `ceil(published rows / UNIT_SIZE)`. That is only correct if every unit
 * holds exactly `UNIT_SIZE` rows, and the corpus does not — stored units hold **3 to 20**
 * published rows, because de-duplication removed entries after the units were numbered.
 * A1 has 758 published rows across 45 real units; dividing by 20 claims 38, so the level
 * page listed 38, `/learn` clamped a request for unit 45 back to 38, and neither sitemap
 * offered the rest. 171 published rows across the four levels sat outside the official
 * path while their unit pages answered 200 to anyone who guessed the URL.
 *
 * Unit numbers are consecutive (`1…45`, `1…44`, `1…41`, `1…37`); sparse numbering was
 * never the problem, so "count the units" cannot be replaced with "find the maximum"
 * either. The only correct source is the distinct stored `(level, unit)` pairs and the
 * rows actually in each one, which is what this returns.
 *
 * **Public and unauthenticated, deliberately.** The whole published corpus is already
 * readable without an account — that is what the SEO surface is — and the consumers that
 * were wrong are the ones with no learner: the level hub, `generateStaticParams`, the XML
 * sitemap and the HTML sitemap. `/progress/units` remains the *authenticated* view and
 * keeps its own job: it layers one learner's strong counts, crowns and unlock state over
 * this same shape. Neither derives unit membership independently any more.
 *
 * **Navigation, not eligibility.** This counts `status = "published"` and nothing else. It
 * deliberately does not apply the learning-content trust policy: a unit whose rows are not
 * yet fit to *grade* is still a unit that exists, and hiding it here would re-create the
 * same class of defect from the other direction. What may be taught is decided at item
 * selection, not by the map.
 */
/** One stored unit: its number, and how many published rows it really holds. */
export type UnitInventory = {
    unit: number;
    words: number;
};

export type LevelInventory = {
    level: string;
    /** Published rows in the level — the sum of its units, never a separate count. */
    words: number;
    /** How many units the level really has. Not `ceil(words / UNIT_SIZE)`. */
    unitCount: number;
    /** The lowest and highest stored unit number, for callers validating a request. */
    firstUnit: number;
    lastUnit: number;
    units: UnitInventory[];
};

export type CurriculumInventory = {
    wordlistId: string;
    words: number;
    levels: LevelInventory[];
};

/**
 * CEFR order, so a caller never has to sort by hand and two callers cannot disagree.
 * A level outside this list still appears, after the known ones, in alphabetical order —
 * an imported wordlist is not required to use CEFR bands.
 */
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

const levelRank = (level: string) => {
    const index = LEVEL_ORDER.indexOf(level.toUpperCase());
    return index === -1 ? LEVEL_ORDER.length : index;
};

type Row = { level: string | null; unit: number | null; words: number | bigint };

/**
 * The one Prisma capability this needs, named structurally.
 *
 * Typing the parameter as `Variables["prisma"]` would make this module import
 * `./index.js`, and `e2e/unit/curriculum.spec.ts` imports this file — which dragged the
 * whole Worker type graph, generated Prisma guard client included, into the web repo's
 * `next build` type check and failed it. `mastery.ts` is importable from a test for the
 * same reason: pure logic keeps no runtime or env dependencies.
 */
type RawReader = {
    $queryRaw: <T>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
};

/**
 * `$queryRaw` rather than `groupBy(["level", "unit"])`.
 *
 * Two-key `groupBy` through the D1 adapter returns `_count` shapes that have to be
 * unpacked anyway, and this is one round trip whose SQL says exactly what it means. The
 * `COALESCE` matches `units.ts`: `unit` is nullable in the schema and a row without one is
 * treated as unit 1 rather than dropped, so no published row can fall out of the map here
 * either.
 *
 * **This is a `prisma-guard` bypass, and it is a narrow one. Do not read it as a
 * precedent.** `$queryRaw` runs outside the guard extension entirely: no forced
 * `status = "published"`, no `select` shape, no `take` cap. Four properties make that
 * acceptable *here* and nowhere else by default:
 *
 * 1. **Published-only, written into the SQL.** The `WHERE status = 'published'` literal is
 *    the same filter `VOCAB_WORD_SHAPES.public` forces (`guard-shapes.ts`), and no caller
 *    can influence it — there is no request-supplied `where` on this route at all.
 * 2. **Fully parameterised.** `wordlistId` is the only value from the request and it
 *    arrives as a tagged-template binding, never string concatenation. A caller cannot
 *    change the shape of the statement, only which wordlist is counted.
 * 3. **It selects no columns.** The result is `(level, unit, COUNT(*))` — three aggregate
 *    values. There is no row content to over-expose, so the `select` shape the guard would
 *    have applied has nothing to protect: the only thing leaked by this query is how many
 *    published words are in each unit, which is the number the public level pages print.
 * 4. **The output is bounded by the corpus, not by the caller.** One row per stored
 *    `(level, unit)` pair — 167 for the Oxford 3000 — so the missing `take` cap cannot be
 *    turned into an unbounded read.
 *
 * Any future raw query that selects row columns, that interpolates instead of binding, or
 * that can be steered by a request body belongs behind the generated router and its guard
 * shape instead. If this query ever needs to grow a `select`, it stops qualifying.
 */
export const readInventory = async (
    prisma: RawReader,
    wordlistId: string,
): Promise<CurriculumInventory> => {
    const rows = await prisma.$queryRaw<Row[]>`
        SELECT level, COALESCE(unit, 1) AS unit, COUNT(*) AS words
        FROM VocabWord
        WHERE status = 'published' AND wordlistId = ${wordlistId}
        GROUP BY level, COALESCE(unit, 1)
    `;

    const byLevel = new Map<string, UnitInventory[]>();

    for (const row of rows) {
        const level = (row.level ?? "").toUpperCase();
        if (!level) continue;

        const list = byLevel.get(level) ?? [];
        list.push({ unit: Number(row.unit ?? 1), words: Number(row.words) });
        byLevel.set(level, list);
    }

    const levels: LevelInventory[] = [...byLevel.entries()]
        .map(([level, units]) => {
            const ordered = units.sort((a, b) => a.unit - b.unit);

            return {
                level,
                words: ordered.reduce((total, entry) => total + entry.words, 0),
                unitCount: ordered.length,
                firstUnit: ordered[0]?.unit ?? 1,
                lastUnit: ordered[ordered.length - 1]?.unit ?? 1,
                units: ordered,
            };
        })
        .sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.level.localeCompare(b.level));

    return {
        wordlistId,
        words: levels.reduce((total, level) => total + level.words, 0),
        levels,
    };
};
