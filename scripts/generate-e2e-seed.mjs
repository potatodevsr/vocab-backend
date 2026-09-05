// Generates a deterministic SQL seed for e2e runs.
//
//   node scripts/generate-e2e-seed.mjs > seed/e2e.sql
//
// Determinism is the point: same rows, same ids, same order, every run — including a
// fixed PBKDF2 salt for the admin, so the file is byte-identical between regenerations.

// Must match src/password.ts — the Workers runtime caps PBKDF2 at 100,000 iterations.
const ITERATIONS = 100_000;
const FIXED_SALT = new Uint8Array([
    226, 12, 91, 44, 178, 3, 240, 155, 17, 88, 201, 66, 129, 34, 7, 190,
]);

const toBase64 = (bytes) => Buffer.from(bytes).toString("base64");

const hashPassword = async (password) => {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: FIXED_SALT, iterations: ITERATIONS },
        key,
        256,
    );
    return `pbkdf2$${ITERATIONS}$${toBase64(FIXED_SALT)}$${toBase64(new Uint8Array(bits))}`;
};

const sql = (value) => (value === null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

const PARTS = ["noun", "verb", "adjective"];
const STAMP = "2026-01-01T00:00:00.000Z";

/**
 * Two words carry more than one part of speech, because 260 of the real ones do and each
 * sense needs its own meaning and example (`across`: "walk across the street" vs "the shop
 * is across the street"). They cover the two halves of that feature:
 *
 *   word19 — already curated. Read-only: the word page must show both senses.
 *   word20 — the reserved mutable word, deliberately left empty so the admin spec can
 *            fill both blocks and prove the JSON round-trips.
 */
const MULTI_POS = {
    19: {
        partOfSpeech: "prep., adv.",
        usages: [
            {
                pos: "prep.",
                meaningTh: "ข้ามจากฝั่งหนึ่งไปอีกฝั่งหนึ่ง",
                exampleEn: "She walked across the street.",
                exampleTh: "เธอเดินข้ามถนน",
            },
            {
                pos: "adv.",
                meaningTh: "อยู่ฝั่งตรงข้าม",
                exampleEn: "The shop is across from the station.",
                exampleTh: "ร้านค้าอยู่ตรงข้ามสถานี",
            },
        ],
    },
    20: { partOfSpeech: "n., v.", usages: [] },
};

/**
 * Unit 1 (order 1-20):  complete + published — the happy path.
 * Unit 2 (order 21-40): only 3 words carry a Thai meaning, so the quiz's
 *                       "not enough ready words" branch stays covered.
 * Unit 3 (order 41-45): draft — must never reach a learner. Proves the guard shape's
 *                       forced `status = published` filter actually holds.
 *
 * Review state rides on top of that and is independent of it (see `reviewState` in
 * prisma/schema.prisma). Two words carry it:
 *
 *   word22 — flagged, read-only. Proves a doubted row still renders for a learner and
 *            still leaves the search index.
 *   word23 — flagged, and the one the admin review queue is allowed to approve. A write
 *            fixture, so no read-only test may assert on its review state.
 */
const AUDIO_WORDS = new Set([1, 5]);

const FLAGGED = {
    22: ["latin-in-thai"],
    23: ["meaning-dupe", "length-outlier"],
};
const words = [];

for (let index = 0; index < 45; index += 1) {
    const order = index + 1;
    const unit = Math.floor(index / 20) + 1;
    const isDraft = order > 40;
    const hasMeaning = order <= 20 || (order > 20 && order <= 23);
    const word = `word${order}`;
    const multi = MULTI_POS[order];

    words.push({
        id: `e2e-a1-${String(order).padStart(4, "0")}`,
        sourceKey: `a1-${word}`,
        sourceOrder: order,
        sourceName: "oxford-3000",
        sourceTitle: "The Oxford 3000 by CEFR level",
        level: "A1",
        unit,
        word,
        displayWord: word,
        slug: word,
        homograph: null,
        sense: null,
        partOfSpeech: multi?.partOfSpeech ?? PARTS[index % PARTS.length],
        meaningTh: hasMeaning ? `ความหมาย${order}` : "",
        pronunciationTh: hasMeaning ? `คำอ่าน${order}` : "",
        meaningThReading: hasMeaning ? `ความ-หมาย-${order}` : "",
        meaningThRoman: hasMeaning ? `khwam-mai-${order}` : "",
        ipa: hasMeaning ? `wɜːd${order}` : "",
        // Entry 0 of `posUsages` owns the single-example columns when it exists — the
        // admin form writes them together, so the fixture keeps them together too.
        exampleEn: multi?.usages[0]?.exampleEn
            ?? (hasMeaning ? `This is an example sentence for ${word}.` : ""),
        exampleTh: multi?.usages[0]?.exampleTh
            ?? (hasMeaning ? `ประโยคตัวอย่างของ ${word}` : ""),
        posUsages: JSON.stringify(multi?.usages ?? []),
        notes: "",
        status: isDraft ? "draft" : "published",
        reviewState: FLAGGED[order] ? "flagged" : "unreviewed",
        reviewFlags: JSON.stringify(FLAGGED[order] ?? []),
        // Two rows carry audio, and the rest deliberately do not — a play button where
        // there is a clip, nothing at all where there is not, never a button that 404s.
        //
        //   word1 — the word page and unit list.
        //   word5 — the fifth item of a fresh unit-1 session, which is the schedule slot
        //           `listen-choose` occupies (backend/src/session.ts). Without a clip
        //           there that item silently falls back to `choose-meaning`, and the
        //           listening path would never be exercised.
        audioKeyEn: AUDIO_WORDS.has(order)
            ? `audio/en/e2e-a1-${String(order).padStart(4, "0")}.mp3`
            : "",
        audioKeyExample: "",
    });
}

const adminHash = await hashPassword("admin-e2e-password");

const lines = [
    "-- GENERATED by scripts/generate-e2e-seed.mjs — do not edit by hand.",
    "DELETE FROM UserWordAttempt;",
    "DELETE FROM UserWordProgress;",
    "DELETE FROM UserUnitProgress;",
    "DELETE FROM QuizResult;",
    "DELETE FROM LearningSession;",
    'DELETE FROM "User";',
    "DELETE FROM AdminUser;",
    "DELETE FROM VocabWord;",
    "",
    `INSERT INTO AdminUser (id, username, password, createdAt, updatedAt) VALUES ('e2e-admin', 'admin', ${sql(adminHash)}, ${sql(STAMP)}, ${sql(STAMP)});`,
    "",
];

/**
 * A2: the irregular-unit level, and the production-shaped one.
 *
 * **Irregular units.** A1 above is a neat 40 published rows in two twenty-row units, which
 * is exactly why the unit-count defect (`todo.md` F-03) survived every test for so long:
 * with twenty-row units `ceil(rows / UNIT_SIZE)` happens to equal the real unit count, so
 * an arithmetic unit count and a stored one agree and no assertion can tell them apart.
 *
 * Production is not like that. Stored units hold 3 to 20 published rows, so A1's 758 rows
 * span 45 real units while the arithmetic claimed 38 — and 171 published rows across the
 * four levels were left out of the generated map, the Learn clamp and both sitemaps.
 *
 * This level reproduces that in miniature: **9 published rows across four units, sized
 * 2, 2, 2, 3**. `ceil(9 / 20)` is **1**; the real answer is **4**. Any consumer that goes
 * back to dividing will list one unit here and lose three, and the curriculum spec will
 * say so. The three-row tail unit is deliberately the size of production's A1 Unit 32 —
 * the unit whose public "practise this unit" CTA answered 422, because a trial needs four
 * options and the unit holds three words (`backend/src/practice.ts`).
 *
 * **Production shape.** Every A1 row above carries a transliteration, a romanisation, an
 * IPA string and an example sentence, and two carry audio. Production carries **none of
 * those on any of its 3,082 published rows** — `meaningThReading`, `meaningThRoman`,
 * `ipa`, `exampleEn`/`exampleTh` and `audioKeyEn` are empty everywhere. A seed where every
 * row is fully furnished cannot fail the way production fails, and it did not: the word
 * page gated its whole Thai-reading block (the speech control included) on
 * `meaningThReading || meaningThRoman`, so the feature was dead in production while the
 * suite was green. These rows carry a trusted meaning and a trusted pronunciation and
 * nothing else, so the "optional content is absent" path is exercised on every run.
 *
 * A1 keeps its rich rows: the audio, example, IPA and transliteration branches are real
 * features with their own coverage, and this is a second shape rather than a replacement.
 *
 * Numbers are spelled out in Thai rather than written as digits, because
 * `isTrustworthyPronunciation` (`lib/thai-text.ts`) rejects digits and brackets in a
 * respelling — `คำอ่านเอทู1` would be withheld from the page as OCR debris, which would
 * make these rows a *missing-pronunciation* fixture rather than a production-shaped one.
 *
 * Kept small on purpose: the public `vocabword` guard shape reads `take.default = 50`,
 * so a corpus above fifty published rows turns every unpaged read in the API specs into
 * a paged one and quietly changes what they assert.
 */
const A2_UNIT_SIZES = [2, 2, 2, 3];
const THAI_NUMERAL_WORDS = [
    "ศูนย์",
    "หนึ่ง",
    "สอง",
    "สาม",
    "สี่",
    "ห้า",
    "หก",
    "เจ็ด",
    "แปด",
    "เก้า",
];
let a2Order = 0;

for (const [unitIndex, size] of A2_UNIT_SIZES.entries()) {
    for (let seat = 0; seat < size; seat += 1) {
        a2Order += 1;
        const word = `a2word${a2Order}`;

        words.push({
            id: `e2e-a2-${String(a2Order).padStart(4, "0")}`,
            sourceKey: `a2-${word}`,
            sourceOrder: 1000 + a2Order,
            sourceName: "oxford-3000",
            sourceTitle: "The Oxford 3000 by CEFR level",
            level: "A2",
            unit: unitIndex + 1,
            word,
            displayWord: word,
            slug: word,
            homograph: null,
            sense: null,
            partOfSpeech: PARTS[a2Order % PARTS.length],
            // Trusted Thai, both of them — this level's point is that the *optional*
            // fields are missing, not that the row is damaged.
            meaningTh: `ความหมายเอทู${THAI_NUMERAL_WORDS[a2Order]}`,
            pronunciationTh: `คำอ่านเอทู${THAI_NUMERAL_WORDS[a2Order]}`,
            // Everything below this line is empty because it is empty in production.
            meaningThReading: "",
            meaningThRoman: "",
            ipa: "",
            exampleEn: "",
            exampleTh: "",
            // `'[]'`, not `''`: A1 above and every production row store an empty JSON
            // array here, and a bare empty string is a shape no reader is written for.
            posUsages: "[]",
            notes: "",
            status: "published",
            reviewState: "unreviewed",
            reviewFlags: "[]",
            audioKeyEn: "",
            audioKeyExample: "",
        });
    }
}

for (const w of words) {
    lines.push(
        `INSERT INTO VocabWord (id, sourceKey, sourceOrder, sourceName, sourceTitle, level, unit, word, displayWord, slug, homograph, sense, partOfSpeech, meaningTh, pronunciationTh, meaningThReading, meaningThRoman, ipa, exampleEn, exampleTh, posUsages, notes, status, reviewState, reviewFlags, audioKeyEn, audioKeyExample, createdAt, updatedAt) VALUES (` +
            [
                sql(w.id),
                sql(w.sourceKey),
                w.sourceOrder,
                sql(w.sourceName),
                sql(w.sourceTitle),
                sql(w.level),
                w.unit,
                sql(w.word),
                sql(w.displayWord),
                sql(w.slug),
                w.homograph === null ? "NULL" : w.homograph,
                w.sense === null ? "NULL" : sql(w.sense),
                sql(w.partOfSpeech),
                sql(w.meaningTh),
                sql(w.pronunciationTh),
                sql(w.meaningThReading),
                sql(w.meaningThRoman),
                sql(w.ipa),
                sql(w.exampleEn),
                sql(w.exampleTh),
                sql(w.posUsages),
                sql(w.notes),
                sql(w.status),
                sql(w.reviewState),
                sql(w.reviewFlags),
                sql(w.audioKeyEn),
                sql(w.audioKeyExample),
                sql(STAMP),
                sql(STAMP),
            ].join(", ") +
            ");",
    );
}

process.stdout.write(lines.join("\n") + "\n");
