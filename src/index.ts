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

    return c.json({ id: user.id, email: user.email, username: user.username });
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
