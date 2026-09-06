/** Mechanical OCR checks, matching the web's lib/thai-text.ts (parity-tested).
 * These do not certify a translation or change editorial reviewState.
 */
const normaliseThai = (value: string): string => value
    .replace(/ํา/g, "ำ")
    .replace(/^(?:n|v|adj|adv|prep|conj|pron|det|exclam|num|aux|modal)\.\s*/i, "")
    .normalize("NFC")
    .trim();

export const trustedThai = (value: string): string | null => {
    const text = normaliseThai(value);
    return /[฀-๿]/.test(text) && !/[A-Za-z]/.test(text) ? text : null;
};

export const trustedPronunciation = (value: string): string | null => {
    const text = trustedThai(value);
    return text && !/[0-9๐-๙()\[\]]/.test(text) ? text : null;
};

/** Fill a bounded pool from bounded reads, without treating a corrupt page as EOF. */
export const readTrustedPool = async <T extends { meaningTh: string }>(
    readPage: (skip: number, take: number) => Promise<T[]>,
    size: number,
): Promise<T[]> => {
    const words: T[] = [];
    for (let skip = 0; words.length < size; skip += size) {
        const rows = await readPage(skip, size);
        words.push(...rows.filter((word) => trustedThai(word.meaningTh) !== null));
        if (rows.length < size) break;
    }
    return words.slice(0, size);
};
