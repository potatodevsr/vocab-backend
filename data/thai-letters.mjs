// The Thai writing system as curated reference content, in the order it is taught.
//
// This module is the *authoring* source. It is compiled into `migrations/0009_thai_letter.sql`
// by `scripts/generate-thai-letter-seed.mjs`; the migration is what every environment
// actually applies, so dev, e2e and production all start from identical rows without a
// separate seeding step. Admins may then edit the romanisations through `/admin/letters` —
// those edits live in D1 and are never overwritten, because the migration only ever runs once.
//
// Four kinds, because they answer different questions:
//
//   consonant  (44)  ก–ฮ, with their acrophonic names. `sound`/`soundFinal` differ: ร is
//                    `r` at the start of a syllable and `n` at the end, which is why one
//                    column cannot serve both.
//   vowelSign  (22)  The marks that are *written*. `เ` is one entry even though `เ‑ีย` is a
//                    single sound spread around its consonant — a per-character breakdown
//                    can only honestly name the mark it is pointing at.
//   tone        (4)  ไม้เอก–ไม้จัตวา.
//   vowelSound (32)  The traditional 32 vowels, which are *sounds*, not marks. They cannot
//                    drive the per-character buttons for the reason above; they exist as a
//                    reference table a learner reads on its own page.
//
// `roman` is the romanised *name* — what a learner who cannot read Thai script sees under a
// button ("ko kai", "sara e"). `sound` is the RTGS transcription value ("k", "e"). They are
// separate because RTGS deliberately drops vowel length: สระอิ and สระอี are both `i`, so a
// button labelled from `sound` could not tell them apart. `vowelLength` carries the
// distinction as data instead of smuggling it into the spelling.

/** [char, name, roman, sound, soundFinal] */
const CONSONANTS = [
    ["ก", "ก ไก่", "ko kai", "k", "k"],
    ["ข", "ข ไข่", "kho khai", "kh", "k"],
    ["ฃ", "ฃ ขวด", "kho khuat", "kh", "k"],
    ["ค", "ค ควาย", "kho khwai", "kh", "k"],
    ["ฅ", "ฅ คน", "kho khon", "kh", "k"],
    ["ฆ", "ฆ ระฆัง", "kho rakhang", "kh", "k"],
    ["ง", "ง งู", "ngo ngu", "ng", "ng"],
    ["จ", "จ จาน", "cho chan", "ch", "t"],
    ["ฉ", "ฉ ฉิ่ง", "cho ching", "ch", ""],
    ["ช", "ช ช้าง", "cho chang", "ch", "t"],
    ["ซ", "ซ โซ่", "so so", "s", "t"],
    ["ฌ", "ฌ เฌอ", "cho choe", "ch", ""],
    ["ญ", "ญ หญิง", "yo ying", "y", "n"],
    ["ฎ", "ฎ ชฎา", "do chada", "d", "t"],
    ["ฏ", "ฏ ปฏัก", "to patak", "t", "t"],
    ["ฐ", "ฐ ฐาน", "tho than", "th", "t"],
    ["ฑ", "ฑ มณโฑ", "tho montho", "th", "t"],
    ["ฒ", "ฒ ผู้เฒ่า", "tho phuthao", "th", "t"],
    ["ณ", "ณ เณร", "no nen", "n", "n"],
    ["ด", "ด เด็ก", "do dek", "d", "t"],
    ["ต", "ต เต่า", "to tao", "t", "t"],
    ["ถ", "ถ ถุง", "tho thung", "th", "t"],
    ["ท", "ท ทหาร", "tho thahan", "th", "t"],
    ["ธ", "ธ ธง", "tho thong", "th", "t"],
    ["น", "น หนู", "no nu", "n", "n"],
    ["บ", "บ ใบไม้", "bo baimai", "b", "p"],
    ["ป", "ป ปลา", "po pla", "p", "p"],
    ["ผ", "ผ ผึ้ง", "pho phueng", "ph", ""],
    ["ฝ", "ฝ ฝา", "fo fa", "f", ""],
    ["พ", "พ พาน", "pho phan", "ph", "p"],
    ["ฟ", "ฟ ฟัน", "fo fan", "f", "p"],
    ["ภ", "ภ สำเภา", "pho samphao", "ph", "p"],
    ["ม", "ม ม้า", "mo ma", "m", "m"],
    // ย and ว close a syllable as the second half of a vowel (เ-ีย, -ัว) rather than as a
    // final consonant, so they have an initial value and no final one.
    ["ย", "ย ยักษ์", "yo yak", "y", ""],
    ["ร", "ร เรือ", "ro ruea", "r", "n"],
    ["ล", "ล ลิง", "lo ling", "l", "n"],
    ["ว", "ว แหวน", "wo waen", "w", ""],
    ["ศ", "ศ ศาลา", "so sala", "s", "t"],
    ["ษ", "ษ ฤๅษี", "so ruesi", "s", "t"],
    ["ส", "ส เสือ", "so suea", "s", "t"],
    ["ห", "ห หีบ", "ho hip", "h", ""],
    ["ฬ", "ฬ จุฬา", "lo chula", "l", "n"],
    // อ is a placeholder that carries a vowel rather than a consonant sound of its own —
    // `อาหาร` is `ahan`, with nothing written for the อ. An empty `sound` is the fact.
    ["อ", "อ อ่าง", "o ang", "", ""],
    ["ฮ", "ฮ นกฮูก", "ho nokhuk", "h", ""],
];

/** [char, name, roman] — a written mark has no sound of its own; the 32 vowels carry that. */
const VOWEL_SIGNS = [
    ["ะ", "สระอะ", "sara a"],
    ["ั", "ไม้หันอากาศ", "mai han akat"],
    ["า", "สระอา", "sara aa"],
    ["ำ", "สระอำ", "sara am"],
    ["ิ", "สระอิ", "sara i"],
    ["ี", "สระอี", "sara ii"],
    ["ึ", "สระอึ", "sara ue"],
    ["ื", "สระอือ", "sara uee"],
    ["ุ", "สระอุ", "sara u"],
    ["ู", "สระอู", "sara uu"],
    ["เ", "สระเอ", "sara e"],
    ["แ", "สระแอ", "sara ae"],
    ["โ", "สระโอ", "sara o"],
    ["ใ", "สระใอ ไม้ม้วน", "sara ai maimuan"],
    ["ไ", "สระไอ ไม้มลาย", "sara ai maimalai"],
    ["ๅ", "ลากข้าง", "lakkhang"],
    ["็", "ไม้ไต่คู้", "mai taikhu"],
    ["์", "ทัณฑฆาต การันต์", "thanthakhat"],
    ["ๆ", "ไม้ยมก", "mai yamok"],
    ["ํ", "นิคหิต", "nikkhahit"],
    ["ฤ", "ตัว ฤ", "rue"],
    ["ฦ", "ตัว ฦ", "lue"],
];

/** [char, name, roman] */
const TONES = [
    ["่", "ไม้เอก", "mai ek"],
    ["้", "ไม้โท", "mai tho"],
    ["๊", "ไม้ตรี", "mai tri"],
    ["๋", "ไม้จัตวา", "mai chattawa"],
];

/**
 * The traditional 32 vowels, in school order: each short vowel followed by its long
 * partner, then the four that stand alone, then the ฤ/ฦ series.
 *
 * `sound` is strict RTGS, which is why the list repeats itself — `a` appears twice, `o`
 * four times. That is not an error to be tidied away: RTGS records neither length nor the
 * เอาะ/ออ distinction, and a learner meeting `phon` in a romanised place name deserves to
 * know it could have been either.
 *
 * [char, name, roman, sound, length]
 */
const VOWEL_SOUNDS = [
    ["อะ", "สระอะ", "sara a", "a", "short"],
    ["อา", "สระอา", "sara aa", "a", "long"],
    ["อิ", "สระอิ", "sara i", "i", "short"],
    ["อี", "สระอี", "sara ii", "i", "long"],
    ["อึ", "สระอึ", "sara ue", "ue", "short"],
    ["อือ", "สระอือ", "sara uee", "ue", "long"],
    ["อุ", "สระอุ", "sara u", "u", "short"],
    ["อู", "สระอู", "sara uu", "u", "long"],
    ["เอะ", "สระเอะ", "sara e", "e", "short"],
    ["เอ", "สระเอ", "sara ee", "e", "long"],
    ["แอะ", "สระแอะ", "sara ae", "ae", "short"],
    ["แอ", "สระแอ", "sara aae", "ae", "long"],
    ["โอะ", "สระโอะ", "sara o", "o", "short"],
    ["โอ", "สระโอ", "sara oo", "o", "long"],
    ["เอาะ", "สระเอาะ", "sara ao", "o", "short"],
    ["ออ", "สระออ", "sara oo", "o", "long"],
    ["เออะ", "สระเออะ", "sara oe", "oe", "short"],
    ["เออ", "สระเออ", "sara ooe", "oe", "long"],
    ["เอียะ", "สระเอียะ", "sara ia", "ia", "short"],
    ["เอีย", "สระเอีย", "sara iia", "ia", "long"],
    ["เอือะ", "สระเอือะ", "sara uea", "uea", "short"],
    ["เอือ", "สระเอือ", "sara ueea", "uea", "long"],
    ["อัวะ", "สระอัวะ", "sara ua", "ua", "short"],
    ["อัว", "สระอัว", "sara uua", "ua", "long"],
    ["อำ", "สระอำ", "sara am", "am", "short"],
    ["ใอ", "สระใอ", "sara ai maimuan", "ai", "short"],
    ["ไอ", "สระไอ", "sara ai maimalai", "ai", "short"],
    ["เอา", "สระเอา", "sara ao", "ao", "short"],
    ["ฤ", "ตัว ฤ", "rue", "rue", "short"],
    ["ฤๅ", "ตัว ฤๅ", "ruee", "rue", "long"],
    ["ฦ", "ตัว ฦ", "lue", "lue", "short"],
    ["ฦๅ", "ตัว ฦๅ", "luee", "lue", "long"],
];

/**
 * A stable id, derived from the romanised name.
 *
 * Derived rather than authored because these ids address audio objects in R2, and a
 * hand-typed list of 102 slugs is 102 chances to disagree with the row it names. The
 * kind prefix keeps `sara-e` the mark distinct from `sara-e` the sound, which are
 * genuinely different rows a curator may want to write different audio for.
 */
const slug = (kind, roman, char) => {
    const base = roman.trim().replace(/\s+/g, "-").toLowerCase();
    const prefix = kind === "vowelSound" ? "sound-" : "";
    // ใอ and ไอ share `sara ai …` stems but differ by mark name, so the slug stays unique;
    // เอาะ/เอา both romanise to `sara ao` and do not, hence the codepoint tiebreaker.
    return `${prefix}${base}`.length > 0
        ? `${prefix}${base}`
        : `${prefix}u${char.codePointAt(0).toString(16)}`;
};

const build = (rows, kind, mapper) => {
    const seen = new Map();

    return rows.map((row, index) => {
        const letter = mapper(row, kind);
        const count = (seen.get(letter.id) ?? 0) + 1;
        seen.set(letter.id, count);

        return {
            ...letter,
            // Two rows may legitimately romanise the same (เอาะ and เอา are both `sara ao`);
            // the suffix keeps the primary key unique without renaming either of them.
            id: count === 1 ? letter.id : `${letter.id}-${count}`,
            kind,
            ordinal: index + 1,
        };
    });
};

export const THAI_LETTERS = [
    ...build(CONSONANTS, "consonant", ([char, name, roman, sound, soundFinal], kind) => ({
        id: slug(kind, roman, char),
        char,
        name,
        roman,
        sound,
        soundFinal,
        vowelLength: "",
    })),
    ...build(VOWEL_SIGNS, "vowelSign", ([char, name, roman], kind) => ({
        id: slug(kind, roman, char),
        char,
        name,
        roman,
        sound: "",
        soundFinal: "",
        vowelLength: "",
    })),
    ...build(TONES, "tone", ([char, name, roman], kind) => ({
        id: slug(kind, roman, char),
        char,
        name,
        roman,
        sound: "",
        soundFinal: "",
        vowelLength: "",
    })),
    ...build(
        VOWEL_SOUNDS,
        "vowelSound",
        ([char, name, roman, sound, vowelLength], kind) => ({
            id: slug(kind, roman, char),
            char,
            name,
            roman,
            sound,
            soundFinal: "",
            vowelLength,
        }),
    ),
];

export const THAI_LETTER_COUNTS = {
    consonant: CONSONANTS.length,
    vowelSign: VOWEL_SIGNS.length,
    tone: TONES.length,
    vowelSound: VOWEL_SOUNDS.length,
};
