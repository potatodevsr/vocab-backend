// Password hashing on WebCrypto — bcrypt/argon are Node-native and CPU-hostile on Workers.
// Format: pbkdf2$<iterations>$<base64 salt>$<base64 hash>

/**
 * The Workers runtime refuses PBKDF2 above 100,000 iterations:
 *
 *   NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported
 *
 * This was 210,000 (the OWASP figure for PBKDF2-SHA256) and it cost a production outage
 * that no local run could have caught: `workerd` under `wrangler dev --local` does not
 * enforce the cap, so dev, `pnpm test:e2e` and every admin login on this machine passed,
 * while the deployed Worker threw on the first correct password it was ever given. The
 * symptom is a 500 rather than a 401 — a wrong username short-circuits before the hash is
 * touched, so only *valid* credentials fail.
 *
 * 100,000 is the ceiling, not a choice. It is below current guidance; the platform does
 * not offer more. If that margin ever matters more than staying on Workers' WebCrypto,
 * the answer is a different KDF (scrypt/argon2 via WASM), not a larger number here.
 */
const MAX_WORKERS_ITERATIONS = 100_000;
// Spelled as a literal, not as `= MAX_WORKERS_ITERATIONS`: the seed scripts carry their own
// copy of this number, and the deployment contract test reads all three declarations to
// check they still agree.
const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

const fromBase64 = (value: string) =>
    Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const derive = async (
    password: string,
    salt: Uint8Array,
    iterations: number,
): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );

    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
        key,
        KEY_LENGTH * 8,
    );

    return new Uint8Array(bits);
};

export const hashPassword = async (password: string): Promise<string> => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const hash = await derive(password, salt, ITERATIONS);

    return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
};

/** Constant-time comparison so a failed verify leaks no timing information. */
const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
    if (a.length !== b.length) return false;

    let diff = 0;
    for (let index = 0; index < a.length; index += 1) {
        diff |= a[index] ^ b[index];
    }

    return diff === 0;
};

export const verifyPassword = async (
    password: string,
    stored: string,
): Promise<boolean> => {
    const [scheme, iterations, salt, hash] = stored.split("$");

    if (scheme !== "pbkdf2" || !iterations || !salt || !hash) return false;

    /**
     * A hash written before the cap was known cannot be verified on this runtime at all —
     * `deriveBits` throws rather than returning a mismatch. Failing closed turns that into
     * "wrong password", which is both true (there is no way to accept it) and a 401 rather
     * than a 500. Such a row needs its password reset; it cannot be migrated in place,
     * because the plaintext is gone.
     */
    if (Number(iterations) > MAX_WORKERS_ITERATIONS) return false;

    const expected = fromBase64(hash);
    const actual = await derive(password, fromBase64(salt), Number(iterations));

    return timingSafeEqual(actual, expected);
};
