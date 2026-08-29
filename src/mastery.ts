/**
 * What "strong" means, in one place.
 *
 * `docs/LEARNER-LIFECYCLE.md` §2.1 defines it as *two successful recalls on different
 * days*. The implementation had never enforced the day part: `progress.ts` counted a word
 * strong at `mastery >= 2` with a comment admitting the ladder "well approximates"
 * two-on-different-days, while `components/play/mastery-pips.tsx` drew the strong band at
 * `mastery >= 3`. So the product had two numbers, neither of which was the promise, and
 * the collection meter — "you own 347 of 3,000", the product's headline claim — counted
 * words a learner had answered twice in one sitting.
 *
 * The ladder stays exactly as it was: `mastery` is the SRS scheduling rung and nothing
 * here changes how reviews are spaced. What this module adds is *evidence*, stored
 * separately, and a single predicate every caller shares.
 *
 * ## The policy
 *
 * A word is strong when it has been **recalled** correctly on **two distinct days** —
 * recalled on both, not recognised on one of them.
 *
 * An earlier version of this module required two graded days with only *one* of them a
 * recall, and amended `docs/LEARNER-LIFECYCLE.md` to match. That was the definition being
 * bent to fit the code. The promise is "two successful recalls on different days", the
 * doc says so again, and this enforces it.
 *
 * - Recognition (`choose-meaning`) is picking the right gloss from four. It proves the
 *   learner can rule out three wrong answers, which is not the same as knowing the word.
 * - Recall (`choose-word`, `spelling`, `cloze`, `listen-choose`) is producing the word, or
 *   the meaning, with nothing to choose from.
 * - Warm-ups (`match-pairs`, `speed-round`) prove nothing and never credit a day. That was
 *   already true of the mastery ladder (`session.ts`, `applyWarmupWordReward`); it is
 *   restated here so both rules live together.
 *
 * ## Migrating existing rows
 *
 * `strongDays` and `recallDays` start at 0 for every row that already exists, and nothing
 * backfills them — the production migration path is additive by policy
 * (`scripts/validate-production-migrations.mjs`), and more importantly a backfill would be
 * a guess. The old `mastery >= 2` number is not evidence of two days: it cannot be, because
 * no day was ever recorded. Reinterpreting it as if it were is exactly the silent
 * reinterpretation `todo.md` rules out.
 *
 * The visible consequence is deliberate and one-time: an existing learner's collection
 * count drops to the words they demonstrate under the new policy, and climbs back as they
 * review. Their `mastery`, review schedule, streaks, unit progress and history are
 * untouched — what resets is the *claim*, which was never earned.
 *
 * **Rollback:** revert the callers. The three columns are additive and inert to anything
 * that does not read them, so a rollback needs no down-migration and loses no data.
 */

/**
 * Distinct days carrying *any* correct graded answer. Reported as exposure; it is not what
 * decides the claim, because a day of recognition is not a day of recall.
 */
export const STRONG_DAYS_REQUIRED = 2;

/** Distinct days carrying a correct **recall**. This is the bar. */
export const RECALL_DAYS_REQUIRED = 2;

/**
 * The rung at which the product calls a word *mastered*. Unchanged.
 *
 * Distinct from the scheduling ceiling below: "mastered" is a claim shown to a learner,
 * `MASTERY_MAX` is how far the ladder can keep stretching the interval afterwards.
 */
export const MASTERY_MASTERED = 5;

/**
 * The scheduling ceiling, and the interval ladder that goes with it.
 *
 * The ladder used to stop at rung 5 / 30 days, which is fine for one word and wrong for a
 * course. At a 30-day ceiling the steady-state review load of N mature words is N/30 per
 * day forever, and `pickSessionWords` fills the session with due words before it adds any
 * new ones — so a learner with a few hundred strong words in a level stops being taught
 * anything new, permanently, without being told why. Three rungs past "mastered" take the
 * interval to 60, 120 and 240 days, which is the maintenance state: a word at
 * `MASTERY_RETIRED` comes back roughly twice a year rather than twelve times.
 */
export const MASTERY_MAX = 8;

/** Days until the next review, indexed by rung. */
export const REVIEW_INTERVAL_DAYS = [1, 1, 3, 7, 14, 30, 60, 120, 240] as const;

/** The top rung: proven repeatedly, now on low-frequency maintenance. */
export const MASTERY_RETIRED = MASTERY_MAX;

/** How many of the eight session slots are held for words the learner has never seen. */
export const RESERVED_NEW_SLOTS = 3;

export const reviewIntervalDays = (mastery: number): number =>
    REVIEW_INTERVAL_DAYS[Math.min(Math.max(mastery, 0), MASTERY_MAX)];

/**
 * The item types that move the SRS ladder at all.
 *
 * Mirrors `isGradedForMastery` in `session.ts`, which is still the authority for the
 * session's own scheduling; listed here because the day policy needs the same boundary.
 */
export const GRADED_ITEM_TYPES = [
    "choose-meaning",
    "choose-word",
    "spelling",
    "cloze",
    "listen-choose",
] as const;

/** Graded items that require producing an answer rather than recognising one. */
export const RECALL_ITEM_TYPES = [
    "choose-word",
    "spelling",
    "cloze",
    "listen-choose",
] as const;

export type MasteryEvidence = {
    strongDays: number;
    recallDays: number;
};

/** Whether an item type may credit a day at all. */
export const isGradedItem = (type: string): boolean =>
    (GRADED_ITEM_TYPES as readonly string[]).includes(type);

/** Whether an item type credits a *recall* day. */
export const isRecallItem = (type: string): boolean =>
    (RECALL_ITEM_TYPES as readonly string[]).includes(type);

/**
 * The one predicate. Every count, gate, badge and export reads this and nothing else.
 *
 * Takes the stored evidence rather than a whole row so a caller may pass a projection —
 * the guard shapes select these two columns and not the rest.
 */
export const isStrong = (evidence: MasteryEvidence): boolean =>
    evidence.recallDays >= RECALL_DAYS_REQUIRED &&
    evidence.strongDays >= STRONG_DAYS_REQUIRED;

/**
 * The day boundary: **the learner's own calendar**.
 *
 * "Two recalls on different days" is a claim about one person's learning, so the days have
 * to be theirs. An earlier version used a fixed Bangkok offset for everyone and called it
 * "learner-local", which was false in both halves — `User.timezone` was never read, and a
 * learner in Berlin got Bangkok's midnight, so two answers a few hours apart could count
 * as separate days while a genuine overnight gap could collapse into one.
 *
 * Same shape as `reminders.ts`'s `localParts`, and for the same reason: `Intl` with a
 * named zone is the only way to get a zone's civil date without shipping a tz database,
 * and a runtime that lacks it throws rather than lying. The fallback is Asia/Bangkok — the
 * audience's zone, and a better guess than UTC — so an unknown or missing zone degrades to
 * the previous behaviour rather than to something worse.
 *
 * `en-CA` yields `YYYY-MM-DD`, which compares as a string. That is the property the
 * same-day idempotency check depends on, so it is not a formatting preference.
 *
 * Cross-learner reporting is unaffected: every attempt still carries a UTC timestamp, and
 * aggregate reporting reads those. Only the *evidence* is counted in the learner's days.
 */
export const learnerDay = (now: Date, timezone: string | null | undefined): string => {
    const zone = timezone || "Asia/Bangkok";

    try {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: zone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(now);
    } catch {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(now);
    }
};

/**
 * The evidence a correct answer adds, given what the row already holds.
 *
 * Returns the *new* totals rather than mutating, so the caller can fold them into the one
 * atomic UPSERT that D1's lack of transactions forces on every writer here. Answering the
 * same word twice on the same day adds nothing the second time, which is the whole point.
 */
export const creditDay = (
    current: MasteryEvidence & { lastStrongDay: string | null; lastRecallDay: string | null },
    itemType: string,
    now: Date,
    timezone: string | null | undefined = null,
): MasteryEvidence & { lastStrongDay: string | null; lastRecallDay: string | null } => {
    const today = learnerDay(now, timezone);

    // A warm-up leaves *every* field alone, `lastStrongDay` included. It used to stamp the
    // day anyway, which meant a genuine graded answer later the same day found the day
    // already "used" and credited nothing. The SQL writers never call this helper — they
    // branch to `applyWarmupWordReward` — so it was drift between the model and production
    // rather than a live defect, which is exactly the kind that becomes one later.
    if (!isGradedItem(itemType)) return current;

    const newStrongDay = current.lastStrongDay !== today;
    const newRecallDay = isRecallItem(itemType) && current.lastRecallDay !== today;

    return {
        strongDays: current.strongDays + (newStrongDay ? 1 : 0),
        recallDays: current.recallDays + (newRecallDay ? 1 : 0),
        lastStrongDay: today,
        lastRecallDay: newRecallDay ? today : current.lastRecallDay,
    };
};

/**
 * recognition -> recall -> spelling -> listening -> cloze -> warm-ups.
 *
 * **Every graded slot comes before every warm-up, and that ordering is load-bearing.**
 * Not every session is eight items — a review is as long as the learner's due list, a
 * comeback is five, a nearly-finished unit is short — and a short session is
 * `slice(0, n)` of this array. With the warm-ups in the middle, `slice(0, 6)` contained
 * only *five* graded slots, so a six-word review put its sixth due word on `match-pairs`,
 * which cannot reschedule it: answered, and still due. Warm-ups last makes the graded
 * count `min(n, 6)` for every n, so a due set capped at six always fits.
 *
 * The cost is the mid-session breather moving to the end of a full eight-item session.
 * A wind-down is worth less than a review that actually clears.
 */
export const ITEM_TYPE_SCHEDULE = [
    "choose-meaning",
    "choose-meaning",
    "choose-word",
    "spelling",
    // Listening, once the corpus has audio. A word with no clip falls back to
    // `choose-meaning` in `buildItems`, so this slot is a silent no-op until the
    // generation script has reached that word rather than a broken item.
    "listen-choose",
    // The word in a sentence, with itself removed. Recognition and recall both ask what a
    // word means on its own; this asks where it belongs — which is the thing a learner
    // actually has to do to use it. Falls back to `choose-meaning` for a word with no
    // example sentence, exactly as the listening slot does with no clip.
    "cloze",
    "match-pairs",
    "speed-round",
] as const;

/**
 * How many of the first `count` slots can clear a due word.
 *
 * The whole point of the ordering above: this is `min(count, 6)` for every count, so a due
 * set capped at six always lands on a slot that reschedules it — in a full eight-item
 * session and in a six-item review alike. Before the reorder it was 5 at count 6, and a
 * six-word review wasted its last due word every time.
 */
export const gradedSlotCount = (count: number): number =>
    ITEM_TYPE_SCHEDULE.slice(0, count).filter((type) => isGradedItem(type)).length;
