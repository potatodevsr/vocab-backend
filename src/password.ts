// Password hashing on WebCrypto — bcrypt/argon are Node-native and CPU-hostile on Workers.
// Format: pbkdf2$<iterations>$<base64 salt>$<base64 hash>

const ITERATIONS = 210_000;
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

    const expected = fromBase64(hash);
    const actual = await derive(password, fromBase64(salt), Number(iterations));

    return timingSafeEqual(actual, expected);
};
