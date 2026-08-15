/**
 * Google sign-in.
 *
 * Authorization Code flow with PKCE, verified against Google's published keys. Everything
 * here is WebCrypto and `jose` — no Node crypto, no googleapis client (backend/AGENTS.md).
 *
 * Why the code flow rather than the simpler "send us the ID token from the browser": the
 * browser half of this app never handles a credential, and an ID token minted for a client
 * id we do not control is exactly the token-substitution bug that pattern invites. The
 * exchange happens Worker-side with the client secret, and the resulting ID token is
 * checked for issuer, audience and expiry before any account is touched.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Short-lived: it only has to survive the round trip to Google and back. */
const STATE_TTL_SECONDS = 600;
const STATE_COOKIE = "g_state";
const VERIFIER_COOKIE = "g_verifier";
const RETURN_COOKIE = "g_from";

/**
 * One JWKS cache per isolate. `createRemoteJWKSet` handles its own refresh and rate
 * limiting; building a new one per request would fetch Google's keys on every sign-in.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
const keys = () => (jwks ??= createRemoteJWKSet(JWKS_URL));

const bytesToHex = (bytes: Uint8Array) =>
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const randomHex = (size = 32) => {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
};

/** base64url, which PKCE requires and btoa does not produce. */
const base64url = (buffer: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

const challengeFor = async (verifier: string) =>
    base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));

export type GoogleIdentity = {
    sub: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
};

/**
 * The redirect URI Google will call back on.
 *
 * Derived from the request rather than configured separately so it cannot drift from the
 * host the user actually started on — Google rejects any mismatch, and a stale constant
 * is a confusing way to discover that. It must be registered verbatim in the Google Cloud
 * console.
 */
export const redirectUriFor = (c: { req: { url: string }; env: { APP_URL?: string } }) => {
    const origin = (c.env.APP_URL ?? new URL(c.req.url).origin).replace(/\/$/, "");
    return `${origin}/api/user/google/callback`;
};

const cookieOptions = (url: string, maxAge: number) => ({
    httpOnly: true,
    secure: url.startsWith("https"),
    sameSite: "Lax" as const,
    path: "/",
    maxAge,
});

/** Build the redirect to Google and stash the state + PKCE verifier for the callback. */
export const startGoogleAuth = async (c: {
    req: { url: string; query: (k: string) => string | undefined };
    env: { GOOGLE_CLIENT_ID?: string; GOOGLE_AUTH_DEV_MODE?: string; APP_URL?: string };
    redirect: (url: string, status?: 302) => Response;
    json: (body: unknown, status?: number) => Response;
}) => {
    /**
     * In test mode the exchange never reaches Google, so a real client id is not required
     * to build the redirect — and the state and PKCE material below is generated for real,
     * which is the part worth exercising.
     *
     * `GOOGLE_AUTH_DEV_MODE` is set by `e2e/scripts/start-api.sh` and deliberately *not*
     * by `pnpm dev`. The suite never follows this redirect, so a placeholder id costs it
     * nothing; a human clicking the button does follow it, and lands on Google's own
     * "Error 401: invalid_client" page — a dead end that looks like the app is broken
     * rather than unconfigured. Ordinary local dev therefore behaves like production:
     * no credentials, no Google button.
     */
    const clientId =
        c.env.GOOGLE_CLIENT_ID ?? (c.env.GOOGLE_AUTH_DEV_MODE === "true" ? "test-client-id" : undefined);

    if (!clientId) {
        /**
         * Bounce to the sign-in page rather than answering with JSON. This endpoint is
         * reached by a browser navigation from an anchor, so a 503 body renders as raw
         * JSON in the address bar — the login form already knows how to explain a failed
         * Google attempt, and this is one.
         */
        const appUrl = c.env.APP_URL ?? "";
        const locale = c.req.query("locale") === "en" ? "en" : "th";

        if (appUrl) {
            return c.redirect(`${appUrl}/${locale}/auth/login?error=google_unavailable`, 302);
        }

        return c.json({ code: "GOOGLE_AUTH_UNAVAILABLE", message: "Google sign-in is not configured" }, 503);
    }

    const state = randomHex();
    const verifier = randomHex(48);

    // An open redirector here would let a crafted link bounce a freshly signed-in learner
    // to another origin, so only same-site paths survive.
    const from = c.req.query("from");
    const safeFrom = from?.startsWith("/") && !from.startsWith("//") ? from : "/";

    setCookie(c as never, STATE_COOKIE, state, cookieOptions(c.req.url, STATE_TTL_SECONDS));
    setCookie(c as never, VERIFIER_COOKIE, verifier, cookieOptions(c.req.url, STATE_TTL_SECONDS));
    setCookie(c as never, RETURN_COOKIE, safeFrom, cookieOptions(c.req.url, STATE_TTL_SECONDS));

    const url = new URL(AUTH_ENDPOINT);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUriFor(c as never));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", await challengeFor(verifier));
    url.searchParams.set("code_challenge_method", "S256");
    // Ask for the account chooser rather than silently reusing the one session Google
    // happens to have — shared devices are normal for the audience this app serves.
    url.searchParams.set("prompt", "select_account");

    return c.redirect(url.toString(), 302);
};

export const clearOAuthCookies = (c: unknown) => {
    for (const name of [STATE_COOKIE, VERIFIER_COOKIE, RETURN_COOKIE]) {
        deleteCookie(c as never, name, { path: "/" });
    }
};

export const returnPathFrom = (c: unknown) => getCookie(c as never, RETURN_COOKIE) ?? "/";

/**
 * Exchange the code and verify the resulting ID token.
 *
 * Returns the identity, or null when anything about the round trip fails to line up —
 * callers turn that into one indistinguishable failure rather than reporting which check
 * rejected it.
 */
export const exchangeGoogleCode = async (
    c: {
        req: {
            url: string;
            query: (k: string) => string | undefined;
            header: (k: string) => string | undefined;
        };
        env: {
            GOOGLE_CLIENT_ID?: string;
            GOOGLE_CLIENT_SECRET?: string;
            GOOGLE_AUTH_DEV_MODE?: string;
            APP_URL?: string;
        };
    },
): Promise<GoogleIdentity | null> => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const expectedState = getCookie(c as never, STATE_COOKIE);
    const verifier = getCookie(c as never, VERIFIER_COOKIE);

    // CSRF: the callback must carry the state this browser was issued.
    if (!code || !state || !expectedState || state !== expectedState || !verifier) return null;

    /**
     * Test mode. The e2e suite runs the real Worker against a real database, and cannot
     * reach accounts.google.com — so the *only* thing stubbed is the network round trip
     * to Google. State, PKCE, cookie handling, account creation, linking and session
     * issuing all run exactly as in production.
     *
     * Gated on an explicit env var that production never sets, and the identity it returns
     * comes from a request header, so it cannot be triggered by a crafted public request.
     */
    if (c.env.GOOGLE_AUTH_DEV_MODE === "true") {
        const raw = c.req.header("x-google-test-identity") ?? c.req.query("test_identity");
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as Partial<GoogleIdentity>;
            if (!parsed.sub || !parsed.email) return null;
            return {
                sub: parsed.sub,
                email: parsed.email.toLowerCase(),
                emailVerified: parsed.emailVerified !== false,
                firstName: parsed.firstName ?? "",
                lastName: parsed.lastName ?? "",
            };
        } catch {
            return null;
        }
    }

    if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) return null;

    let idToken: string | undefined;
    try {
        const response = await fetch(TOKEN_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: c.env.GOOGLE_CLIENT_ID,
                client_secret: c.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUriFor(c as never),
                grant_type: "authorization_code",
                code_verifier: verifier,
            }),
        });
        if (!response.ok) return null;
        idToken = ((await response.json()) as { id_token?: string }).id_token;
    } catch {
        return null;
    }

    if (!idToken) return null;

    try {
        const { payload } = await jwtVerify(idToken, keys(), {
            issuer: ISSUERS,
            audience: c.env.GOOGLE_CLIENT_ID,
        });

        const sub = typeof payload.sub === "string" ? payload.sub : undefined;
        const email = typeof payload.email === "string" ? payload.email.toLowerCase() : undefined;
        if (!sub || !email) return null;

        return {
            sub,
            email,
            // Google sends this as a boolean or the string "true" depending on the path.
            emailVerified: payload.email_verified === true || payload.email_verified === "true",
            firstName: typeof payload.given_name === "string" ? payload.given_name : "",
            lastName: typeof payload.family_name === "string" ? payload.family_name : "",
        };
    } catch {
        return null;
    }
};
