import { Hono } from "hono";
import { SignJWT, importJWK } from "jose";

import type { Bindings, Variables } from "./index.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * Web push, as the second delivery channel for the reminder the learner already asked for.
 *
 * Email reaches an inbox; push reaches the phone the app is installed on, which for this
 * audience is where the habit actually lives. The rules are the reminder's rules
 * (`reminders.ts`) — opt-in, the learner's own hour, never on a day they already practised
 * — because a second channel with its own rules is how a product ends up nagging twice.
 *
 * **No payload.** A Web Push message may carry an encrypted body, and encrypting it means
 * implementing aes128gcm + HKDF + an ECDH agreement against each subscription's keys on a
 * Worker. Instead the push is sent empty and the service worker fetches
 * `GET /reminders/preview` when it arrives, with the learner's own cookie, and shows what
 * comes back. The text is then personal ("3 words are due") without a single byte of
 * personal data passing through Google's or Mozilla's push service.
 *
 * VAPID is still required for an empty push: the `Authorization` header proves to the push
 * service which application server is sending. That is an ES256 JWT over the endpoint's
 * origin, signed with the private key in `VAPID_PRIVATE_KEY`.
 */

export const push = new Hono<Env>();

/** How long a push service should hold the message for a device that is offline. */
const TTL_SECONDS = 6 * 60 * 60;

/** VAPID JWTs are short-lived by spec; twelve hours is the common ceiling. */
const VAPID_TTL = "12h";

const configured = (env: Bindings) =>
    Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

/**
 * The signed `Authorization` header for one push endpoint.
 *
 * `aud` is the endpoint's *origin*, not the endpoint — a JWT scoped to the full URL is
 * rejected by every major push service, and the failure looks like a 401 with no
 * explanation.
 */
const vapidHeader = async (env: Bindings, endpoint: string) => {
    const audience = new URL(endpoint).origin;

    const key = await importJWK(
        {
            kty: "EC",
            crv: "P-256",
            d: env.VAPID_PRIVATE_KEY,
            // The public key is the raw uncompressed point (0x04 ‖ X ‖ Y); JWK wants the
            // two halves separately.
            x: rawToJwkPart(env.VAPID_PUBLIC_KEY!, 1, 33),
            y: rawToJwkPart(env.VAPID_PUBLIC_KEY!, 33, 65),
        },
        "ES256",
    );

    const token = await new SignJWT({})
        .setProtectedHeader({ alg: "ES256" })
        .setAudience(audience)
        .setExpirationTime(VAPID_TTL)
        // A contact address is required by the spec so a push service can reach the sender
        // about abuse. `mailto:` of the sending address the product already has.
        .setSubject(env.MAGIC_LINK_FROM ? `mailto:${extractEmail(env.MAGIC_LINK_FROM)}` : "mailto:admin@example.com")
        .sign(key);

    return `vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`;
};

/** `Vocab Learning <hi@example.com>` -> `hi@example.com`; a bare address passes through. */
const extractEmail = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from.trim();

const rawToJwkPart = (rawBase64Url: string, start: number, end: number) => {
    const binary = atob(rawBase64Url.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)).slice(
        start,
        end,
    );
    let out = "";
    for (const byte of bytes) out += String.fromCharCode(byte);
    return btoa(out).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

type Subscription = { id: string; endpoint: string };

/**
 * Sends one empty push. Returns whether the subscription is still alive.
 *
 * 404 and 410 mean the browser threw the subscription away (uninstalled, cleared site
 * data). That is not an error to retry — it is a row to delete, which the caller does.
 */
export const sendPush = async (env: Bindings, subscription: Subscription) => {
    if (!configured(env)) return { ok: false, gone: false };

    try {
        const response = await fetch(subscription.endpoint, {
            method: "POST",
            headers: {
                Authorization: await vapidHeader(env, subscription.endpoint),
                TTL: String(TTL_SECONDS),
                // No body, so no `Content-Encoding`. Stating the length explicitly keeps
                // strict push services (Apple's especially) from rejecting the request.
                "Content-Length": "0",
            },
        });

        return { ok: response.ok, gone: response.status === 404 || response.status === 410 };
    } catch {
        return { ok: false, gone: false };
    }
};

/** The application server key a browser needs before it can subscribe at all. */
push.get("/push/key", (c) => {
    if (!configured(c.env)) return c.json({ message: "Push is not configured" }, 503);
    return c.json({ key: c.env.VAPID_PUBLIC_KEY });
});

push.post("/push/subscribe", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);
    if (!configured(c.env)) return c.json({ message: "Push is not configured" }, 503);

    const body = (await c.req.json().catch(() => null)) as {
        endpoint?: unknown;
        keys?: { p256dh?: unknown; auth?: unknown };
    } | null;

    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
    const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";

    if (!endpoint || !p256dh || !auth) {
        return c.json({ message: "endpoint and keys are required" }, 400);
    }

    // Only real push endpoints. Without this the table is an open list of URLs this Worker
    // will POST to on a schedule.
    if (!/^https:\/\//.test(endpoint)) {
        return c.json({ message: "endpoint must be https" }, 400);
    }

    /**
     * Upsert on the endpoint, not on (user, endpoint): a shared device that changes hands
     * re-subscribes with the same endpoint under a new account, and the row has to follow
     * the person now holding the browser rather than keep mailing the previous one.
     */
    await c.get("prisma").pushSubscription.upsert({
        where: { endpoint },
        update: { userId, p256dh, auth, failedAt: null },
        create: { userId, endpoint, p256dh, auth },
    });

    return c.json({ ok: true });
});

push.post("/push/unsubscribe", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = (await c.req.json().catch(() => null)) as { endpoint?: unknown } | null;
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) return c.json({ message: "endpoint is required" }, 400);

    // Scoped to the caller: an endpoint is guessable-ish, and nobody should be able to
    // silence someone else's phone by posting a URL.
    await c.get("prisma").pushSubscription.deleteMany({ where: { endpoint, userId } });

    return c.json({ ok: true });
});
