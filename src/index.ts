import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { SignJWT, jwtVerify } from "jose";

import { hashPassword, verifyPassword } from "./password.js";
import { guard } from "../prisma/generated/guard/client.js";
import { VocabWordRouter } from "../prisma/generated/hono/VocabWord/VocabWordRouter.js";
import { UserRouter } from "../prisma/generated/hono/User/UserRouter.js";
import {
    USER_SHAPES,
    VOCAB_WORD_SHAPES,
    VOCAB_WORD_UPDATE_SHAPE,
    resolveVariant,
} from "./guard-shapes.js";
import { progress } from "./progress.js";

export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    /**
     * Origin allowed to call this Worker from a browser. Only needed while the web app
     * and the API are on different origins in local dev — once Next forwards `/api/*`
     * over a service binding (see docs/SPEC.md §2.1) requests are same-origin and this
     * goes away entirely.
     */
    FRONTEND_URL?: string;
    APP_URL?: string;
    RESEND_API_KEY?: string;
    MAGIC_LINK_FROM?: string;
    MAGIC_LINK_DEV_MODE?: string;
};

export type Variables = {
    prisma: PrismaClient;
    role: "admin" | "user" | "anonymous";
    userId?: string;
};

type Env = { Bindings: Bindings; Variables: Variables };

const USER_TOKEN = "user_token";
const ADMIN_TOKEN = "admin_token";
const USER_TTL_DAYS = 30;
const ADMIN_TTL_DAYS = 7;
const MAGIC_LINK_TTL_MINUTES = 15;
const MAGIC_LINK_COOLDOWN_MS = 60_000;

const MAGIC_LINK_EMAIL = {
    en: {
        subject: "Your Vocab Learning App sign-in link",
        body: (link: string) =>
            `Use the link below to sign in to Vocab Learning App. It expires in ${MAGIC_LINK_TTL_MINUTES} minutes.\n\n${link}\n\nIf you did not request this email, you can safely ignore it.`,
    },
    th: {
        subject: "ลิงก์เข้าสู่ระบบ Vocab Learning App ของคุณ",
        body: (link: string) =>
            `ใช้ลิงก์ด้านล่างเพื่อเข้าสู่ระบบ Vocab Learning App ลิงก์นี้จะหมดอายุภายใน ${MAGIC_LINK_TTL_MINUTES} นาที\n\n${link}\n\nหากคุณไม่ได้ขออีเมลนี้ คุณสามารถเพิกเฉยได้อย่างปลอดภัย`,
    },
} as const;

type MagicLinkLocale = keyof typeof MAGIC_LINK_EMAIL;
type MagicLinkErrorCode =
    | "INVALID_EMAIL"
    | "INVALID_OR_EXPIRED_MAGIC_LINK"
    | "MAGIC_LINK_UNAVAILABLE"
    | "MAGIC_LINK_DELIVERY_FAILED";

const magicLinkError = (code: MagicLinkErrorCode, message: string) => ({ code, message });

const AUTH_OPENAPI = {
    openapi: "3.1.0",
    info: { title: "Vocab Learning App authentication API", version: "1.0.0" },
    paths: {
        "/user/magic-link/request": {
            post: {
                operationId: "requestMagicLink",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email"],
                                properties: {
                                    email: { type: "string", format: "email" },
                                    locale: { type: "string", enum: ["en", "th"] },
                                    from: { type: "string" },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "202": { description: "Request accepted", content: { "application/json": { schema: { $ref: "#/components/schemas/MagicLinkRequestAccepted" } } } },
                    "400": { description: "Invalid email", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                    "503": { description: "Mail service unavailable", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/user/magic-link/verify": {
            post: {
                operationId: "verifyMagicLink",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", required: ["token"], properties: { token: { type: "string", pattern: "^[a-f0-9]{64}$" } }, additionalProperties: false } } },
                },
                responses: {
                    "200": { description: "Authenticated learner", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthUser" } } } },
                    "400": { description: "Invalid or expired link", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
    },
    components: {
        schemas: {
            ApiError: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" } }, additionalProperties: false },
            MagicLinkRequestAccepted: { type: "object", required: ["ok"], properties: { ok: { const: true }, devMagicLink: { type: "string", format: "uri", description: "Present only when MAGIC_LINK_DEV_MODE is explicitly enabled." }, devEmail: { type: "object", description: "Present only when MAGIC_LINK_DEV_MODE is explicitly enabled.", required: ["to", "subject", "text"], properties: { to: { type: "string", format: "email" }, subject: { type: "string" }, text: { type: "string" } }, additionalProperties: false } }, additionalProperties: false },
            AuthUser: { type: "object", required: ["id", "email", "username"], properties: { id: { type: "string" }, email: { type: "string", format: "email" }, username: { type: "string" } }, additionalProperties: false },
        },
    },
} as const;

const secretOf = (c: { env: Bindings }) =>
    new TextEncoder().encode(c.env.JWT_SECRET);

const sign = async (
    payload: Record<string, unknown>,
    secret: Uint8Array,
    days: number,
) =>
    new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${days}d`)
        .sign(secret);

const bytesToHex = (bytes: Uint8Array) =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const randomToken = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
};

const hashToken = async (token: string) =>
    bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));

const setUserSession = async (
    c: Parameters<typeof setCookie>[0] & { env: Bindings; req: { url: string } },
    user: { id: string; username: string },
) => {
    const token = await sign(
        { role: "user", userId: user.id, username: user.username },
        secretOf(c),
        USER_TTL_DAYS,
    );

    setCookie(c, USER_TOKEN, token, {
        httpOnly: true,
        secure: c.req.url.startsWith("https"),
        sameSite: "Lax",
        path: "/",
        maxAge: USER_TTL_DAYS * 24 * 60 * 60,
    });
};

const sendMagicLink = async (
    c: { env: Bindings },
    email: string,
    link: string,
    locale: MagicLinkLocale,
) => {
    if (!c.env.RESEND_API_KEY || !c.env.MAGIC_LINK_FROM) {
        throw new Error("RESEND_API_KEY and MAGIC_LINK_FROM are required to send magic links");
    }

    const content = MAGIC_LINK_EMAIL[locale];

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: c.env.MAGIC_LINK_FROM,
            to: [email],
            subject: content.subject,
            text: content.body(link),
        }),
    });

    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
};

const app = new Hono<Env>();

app.use("*", async (c, next) =>
    cors({
        origin: c.env.FRONTEND_URL ?? "http://localhost:3000",
        credentials: true,
        allowHeaders: ["Content-Type"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })(c, next),
);

/**
 * One guarded Prisma client per isolate, not per request.
 *
 * A per-request client was the original plan (it is how guard scope context can be
 * supplied without `AsyncLocalStorage`), but we do not use scope roots yet, so the
 * context function returns `{}` and the per-request instance bought nothing while
 * instantiating a WASM query compiler on every call. Reuse is both cheaper and steadier
 * under load. If scope roots are introduced later, either pass the caller through
 * `.guard(shape, caller)` — which the generated routers already do — or revisit this.
 */
let cached: { db: D1Database; client: unknown } | null = null;

const getPrisma = (db: D1Database) => {
    if (cached?.db === db) return cached.client;

    const client = new PrismaClient({ adapter: new PrismaD1(db) }).$extends(
        guard.extension(() => ({})),
    );

    cached = { db, client };

    return client;
};

app.use("*", async (c, next) => {
    c.set("prisma", getPrisma(c.env.DB) as never);
    c.set("role", "anonymous");

    const userToken = getCookie(c, USER_TOKEN);
    const adminToken = getCookie(c, ADMIN_TOKEN);

    if (adminToken) {
        try {
            const { payload } = await jwtVerify(adminToken, secretOf(c));
            if (payload.role === "admin") c.set("role", "admin");
        } catch {
            // fall through as anonymous
        }
    } else if (userToken) {
        try {
            const { payload } = await jwtVerify(userToken, secretOf(c));
            if (payload.role === "user" && typeof payload.userId === "string") {
                c.set("role", "user");
                c.set("userId", payload.userId);
            }
        } catch {
            // fall through as anonymous
        }
    }

    await next();
});

const requireAdmin = async (c: { get: (k: "role") => string; json: Function }, next: () => Promise<void>) => {
    if (c.get("role") !== "admin") return c.json({ message: "Unauthorized" }, 401);
    await next();
};

const requireUser = async (c: { get: (k: "role") => string; json: Function }, next: () => Promise<void>) => {
    if (c.get("role") !== "user") return c.json({ message: "Unauthorized" }, 401);
    await next();
};

app.get("/health", (c) => c.json({ ok: true }));
app.get("/auth/openapi.json", (c) => c.json(AUTH_OPENAPI));

// ---------------------------------------------------------------- admin auth

app.post("/auth/login", async (c) => {
    const { username, password } = await c.req.json<{
        username?: string;
        password?: string;
    }>();

    if (!username || !password) {
        return c.json({ message: "Invalid credentials" }, 401);
    }

    const admin = await c.get("prisma").adminUser.findUnique({ where: { username } });

    if (!admin || !(await verifyPassword(password, admin.password))) {
        return c.json({ message: "Invalid credentials" }, 401);
    }

    const token = await sign({ role: "admin", username }, secretOf(c), ADMIN_TTL_DAYS);

    setCookie(c, ADMIN_TOKEN, token, {
        httpOnly: true,
        secure: c.env.JWT_SECRET !== undefined && c.req.url.startsWith("https"),
        sameSite: "Lax",
        path: "/",
        maxAge: ADMIN_TTL_DAYS * 24 * 60 * 60,
    });

    return c.json({ ok: true });
});

app.post("/auth/logout", (c) => {
    deleteCookie(c, ADMIN_TOKEN, { path: "/" });
    return c.json({ ok: true });
});

app.get("/auth/me", async (c) => {
    if (c.get("role") !== "admin") return c.json({ message: "Unauthorized" }, 401);
    return c.json({ role: "admin" });
});

// ----------------------------------------------------------------- user auth

app.post("/user/register", async (c) => {
    const { email, username, password, firstName, lastName } = await c.req.json<{
        email?: string;
        username?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
    }>();

    if (!email || !username || !password || !firstName || !lastName) {
        return c.json({ message: "กรุณากรอกข้อมูลให้ครบ" }, 400);
    }

    const prisma = c.get("prisma");
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
        select: { id: true },
    });

    if (existing) {
        return c.json({ message: "อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว" }, 409);
    }

    const user = await prisma.user.create({
        data: {
            email,
            username,
            password: await hashPassword(password),
            firstName,
            lastName,
        },
        select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
        },
    });

    return c.json(user);
});

app.post("/user/login", async (c) => {
    const { email, password } = await c.req.json<{
        email?: string;
        password?: string;
    }>();

    if (!email || !password) {
        return c.json({ message: "กรุณากรอกข้อมูลให้ครบ" }, 400);
    }

    const user = await c.get("prisma").user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.password))) {
        return c.json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, 401);
    }

    await setUserSession(c as never, user);

    return c.json({ id: user.id, email: user.email, username: user.username });
});

app.post("/user/magic-link/request", async (c) => {
    const { email, locale, from } = await c.req.json<{
        email?: string;
        locale?: string;
        from?: string;
    }>();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return c.json(magicLinkError("INVALID_EMAIL", "A valid email is required"), 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const safeLocale: MagicLinkLocale = locale === "th" ? "th" : "en";
    const testMode = c.env.MAGIC_LINK_DEV_MODE === "true";
    const testDelivery = testMode ? c.req.header("x-magic-link-test-delivery") : undefined;

    if (testDelivery === "missing-config") {
        return c.json(
            magicLinkError("MAGIC_LINK_UNAVAILABLE", "Magic-link sign-in is temporarily unavailable"),
            503,
        );
    }

    const user = await c.get("prisma").user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
    });
    let devMagicLink: string | undefined;

    if (user) {
        const latest = await c.get("prisma").magicLinkToken.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });
        if (
            latest &&
            latest.createdAt.getTime() > Date.now() - MAGIC_LINK_COOLDOWN_MS &&
            !(testMode && c.req.header("x-magic-link-test-bypass-cooldown") === "true")
        ) {
            return c.json({ ok: true }, 202);
        }

        const token = randomToken();
        const safeFrom = from?.startsWith("/") && !from.startsWith("//") ? from : `/${safeLocale}`;
        const origin = (c.env.APP_URL ?? c.env.FRONTEND_URL ?? new URL(c.req.url).origin).replace(/\/$/, "");
        const link = new URL(`${origin}/${safeLocale}/auth/verify`);
        link.searchParams.set("token", token);
        link.searchParams.set("from", safeFrom);

        // A newly requested link supersedes older unredeemed links. Each statement is
        // independently safe on D1; no transaction semantics are assumed.
        await c.get("prisma").$executeRaw`
            UPDATE MagicLinkToken
            SET usedAt = ${new Date()}
            WHERE userId = ${user.id} AND usedAt IS NULL
        `;
        await c.get("prisma").magicLinkToken.create({
            data: {
                tokenHash: await hashToken(token),
                userId: user.id,
                expiresAt: new Date(
                    Date.now() +
                    (testMode && c.req.header("x-magic-link-test-expired") === "true"
                        ? -1
                        : MAGIC_LINK_TTL_MINUTES * 60_000),
                ),
            },
        });

        if (testMode) {
            if (testDelivery === "failure") {
                return c.json(
                    magicLinkError("MAGIC_LINK_DELIVERY_FAILED", "Magic-link email could not be delivered"),
                    503,
                );
            }
            devMagicLink = link.toString();
        } else {
            try {
                await sendMagicLink(c, normalizedEmail, link.toString(), safeLocale);
            } catch (error) {
                console.error("Magic-link delivery failed", error);
                const code =
                    !c.env.RESEND_API_KEY || !c.env.MAGIC_LINK_FROM
                        ? "MAGIC_LINK_UNAVAILABLE"
                        : "MAGIC_LINK_DELIVERY_FAILED";
                return c.json(
                    magicLinkError(
                        code,
                        code === "MAGIC_LINK_UNAVAILABLE"
                            ? "Magic-link sign-in is temporarily unavailable"
                            : "Magic-link email could not be delivered",
                    ),
                    503,
                );
            }
        }
    }

    const devEmail = devMagicLink
        ? {
              to: normalizedEmail,
              subject: MAGIC_LINK_EMAIL[safeLocale].subject,
              text: MAGIC_LINK_EMAIL[safeLocale].body(devMagicLink),
          }
        : undefined;
    return c.json({ ok: true, ...(devMagicLink ? { devMagicLink, devEmail } : {}) }, 202);
});

app.post("/user/magic-link/verify", async (c) => {
    const { token } = await c.req.json<{ token?: string }>();
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
        return c.json(
            magicLinkError("INVALID_OR_EXPIRED_MAGIC_LINK", "This sign-in link is invalid or expired"),
            400,
        );
    }

    const record = await c.get("prisma").magicLinkToken.findUnique({
        where: { tokenHash: await hashToken(token) },
        include: { user: { select: { id: true, username: true, email: true } } },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
        return c.json(
            magicLinkError("INVALID_OR_EXPIRED_MAGIC_LINK", "This sign-in link is invalid or expired"),
            400,
        );
    }

    // Conditional update makes concurrent redemption single-use without a transaction.
    const consumed = await c.get("prisma").$executeRaw`
        UPDATE MagicLinkToken
        SET usedAt = ${new Date()}
        WHERE id = ${record.id} AND usedAt IS NULL
    `;
    if (consumed !== 1) {
        return c.json(
            magicLinkError("INVALID_OR_EXPIRED_MAGIC_LINK", "This sign-in link is invalid or expired"),
            400,
        );
    }

    await setUserSession(c as never, record.user);
    return c.json(record.user);
});

app.post("/user/logout", (c) => {
    deleteCookie(c, USER_TOKEN, { path: "/" });
    return c.json({ ok: true });
});

app.get("/user/me", async (c) => {
    const userId = c.get("userId");

    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const user = await c.get("prisma").user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            createdAt: true,
        },
    });

    if (!user) return c.json({ message: "Unauthorized" }, 401);

    return c.json(user);
});

// --------------------------------------------------------- gameplay verbs

app.route("/", progress);

// ------------------------------------------------------------ generated CRUD

app.route(
    "/",
    VocabWordRouter<Env>({
        // findUnique is intentionally not exposed: nothing in the app needs it, and a
        // unique-where shape cannot carry the forced `status = published` filter that
        // keeps drafts invisible. Least privilege beats an endpoint nobody calls.
        findMany: { shape: VOCAB_WORD_SHAPES },
        findManyPaginated: { shape: VOCAB_WORD_SHAPES },
        update: {
            before: [requireAdmin as never],
            shape: VOCAB_WORD_UPDATE_SHAPE,
        },
        guard: { resolveVariant },
        pagination: { defaultLimit: 50, maxLimit: 100 },
    } as never),
);

app.route(
    "/",
    UserRouter<Env>({
        findMany: { before: [requireAdmin as never], shape: USER_SHAPES },
        findManyPaginated: {
            before: [requireAdmin as never],
            shape: USER_SHAPES,
        },
        guard: { resolveVariant },
        pagination: { defaultLimit: 50, maxLimit: 100 },
    } as never),
);

export default app;
export { requireUser };
