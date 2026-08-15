// Creates or resets an admin account in D1.
//
// Replaces scripts/seed-admin.ts, which had rotted in two independent ways and could not
// have produced a working login:
//
//   1. It hashed with `bcryptjs`. The API verifies PBKDF2 (`src/password.ts`, format
//      `pbkdf2$210000$<salt>$<hash>`), so a bcrypt hash never matches — and bcryptjs is
//      banned outright by AGENTS.md rule 4 because it is Node-native and CPU-hostile on
//      a Worker.
//   2. It wrote to `file:./dev.db` through better-sqlite3 — the pre-D1 Prisma path. The
//      app reads D1 (`.wrangler/state`), so the row landed in a database nothing queries.
//
// Same WebCrypto scheme as the API, and it writes through wrangler so dev and e2e both
// get a real row.
//
//   node scripts/seed-admin.mjs                        # admin / admin_vocab2026
//   ADMIN_USERNAME=me ADMIN_PASSWORD=... node scripts/seed-admin.mjs
//   node scripts/seed-admin.mjs --remote               # against deployed D1
//
// Re-running resets the password for that username rather than failing.

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REMOTE = process.argv.includes("--remote");

// Must match src/password.ts exactly — these constants are the hash format.
const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const toBase64 = (bytes) => Buffer.from(bytes).toString("base64");

const hashPassword = async (password) => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"],
    );

    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
        key,
        KEY_LENGTH * 8,
    );

    return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
};

const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "admin_vocab2026";

const hash = await hashPassword(password);
const escape = (v) => `'${String(v).replace(/'/g, "''")}'`;

// `id` has no database-side default (Prisma generates cuids in the client), so the insert
// has to supply one.
const id = `admin-${crypto.randomUUID()}`;
const now = new Date().toISOString();

const sql = `
INSERT INTO AdminUser (id, username, password, createdAt, updatedAt)
VALUES (${escape(id)}, ${escape(username)}, ${escape(hash)}, ${escape(now)}, ${escape(now)})
ON CONFLICT(username) DO UPDATE SET password = excluded.password, updatedAt = excluded.updatedAt;
`.trim();

execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "vocab", REMOTE ? "--remote" : "--local", "--command", sql],
    { cwd: ROOT, stdio: "inherit" },
);

console.log(`\nAdmin "${username}" ready (${REMOTE ? "remote" : "local"}).`);
console.log("Sign in at /admin/login.");
