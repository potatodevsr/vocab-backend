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
import { ThaiLetterRouter } from "../prisma/generated/hono/ThaiLetter/ThaiLetterRouter.js";
import {
    USER_SHAPES,
    VOCAB_WORD_SHAPES,
    VOCAB_WORD_UPDATE_SHAPE,
    THAI_LETTER_SHAPES,
    THAI_LETTER_CREATE_SHAPE,
    THAI_LETTER_UPDATE_SHAPE,
    THAI_LETTER_DELETE_SHAPE,
    resolveVariant,
} from "./guard-shapes.js";
import { progress } from "./progress.js";
import { practice, applyTrialClaim, verifyTrialClaim, TRIAL_CLAIM_COOKIE } from "./practice.js";
import { session } from "./session.js";
import {
    startGoogleAuth,
    exchangeGoogleCode,
    clearOAuthCookies,
    returnPathFrom,
} from "./google-auth.js";
import { checkpoint } from "./checkpoint.js";
import { audio } from "./audio.js";
import { reminders, runReminderPass } from "./reminders.js";
import { placement } from "./placement.js";
import { wordlists } from "./wordlists.js";
import { push } from "./push.js";
import { stats } from "./stats.js";
import { units } from "./units.js";

export type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    /**
     * Pre-generated word and example audio (SPEC §5.6), keyed `audio/en/{wordId}.mp3`.
     * Optional so the API still boots where the bucket is not bound — `src/audio.ts`
     * answers 404/503 and the learner simply gets no player.
     */
    AUDIO?: R2Bucket;
    /** Workers AI, used only by the admin-driven TTS generation route. */
    AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
    /** Pins one TTS model for a deploy, overriding the fallback order in `audio.ts`. */
    TTS_MODEL?: string;
    /**
     * Origin allowed to call this Worker from a browser. Only needed while the web app
     * and the API are on different origins in local dev — once Next forwards `/api/*`
     * over a service binding (see docs/SPEC.md §2.1) requests are same-origin and this
     * goes away entirely.
     */
    FRONTEND_URL?: string;
    APP_URL?: string;
    RESEND_API_KEY?: string;
    /**
     * Web push application-server keys. Absent means push routes answer 503 and the
     * reminder falls back to email — the channel is optional, the reminder is not.
     */
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    MAGIC_LINK_FROM?: string;
    MAGIC_LINK_DEV_MODE?: string;
    /** Test harness only: prevents every browser test sharing Wrangler's loopback IP bucket. */
    E2E_MODE?: string;
    /** From the Google Cloud OAuth client. Absent means Google sign-in answers 503. */
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    /**
     * Stubs *only* the network round trip to accounts.google.com, so the e2e suite can
     * exercise the callback against a real Worker and a real database. Never set in
     * production; the stub identity arrives in a request header, not from the public.
     */
    GOOGLE_AUTH_DEV_MODE?: string;
};

export type Variables = {
    prisma: PrismaClient;
    role: "admin" | "user" | "anonymous";
    userId?: string;
};

type Env = { Bindings: Bindings; Variables: Variables };

const USER_TOKEN = "user_token";

/**
 * Non-`httpOnly`, non-secret: mirrors the presence of `USER_TOKEN` so the browser can
 * tell signed-in from signed-out without a round trip. Never trusted for authorisation.
 */
const USER_SESSION_HINT = "signed_in";
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

/**
 * OpenAPI for the hand-written practice-trial verbs (`practice.ts`). Generated CRUD gets
 * its schema from `prisma-generator-express`; these three routes are hand-written gameplay
 * verbs (AGENTS.md rule 7) and so are documented by hand, same as AUTH_OPENAPI above — kept
 * accurate here is what lets `pnpm gen:api-types` produce real client types instead of the
 * frontend hand-rolling duplicate response shapes (repo AGENTS.md rule 2).
 */
const PRACTICE_OPENAPI = {
    openapi: "3.1.0",
    info: { title: "Vocab Learning App practice-trial API", version: "1.0.0" },
    paths: {
        "/practice/start": {
            post: {
                operationId: "practiceStart",
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    level: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
                                    unit: { type: "integer", minimum: 1 },
                                    mode: { type: "string", enum: ["normal", "comeback", "review"] },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Trial started", content: { "application/json": { schema: { $ref: "#/components/schemas/PracticeStartResult" } } } },
                    "422": { description: "Not enough published content for a trial", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "429": { description: "Rate limited or a trial is already in progress", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/practice/answer": {
            post: {
                operationId: "practiceAnswer",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["itemIndex", "selectedOptionIndex"],
                                properties: {
                                    itemIndex: { type: "integer", minimum: 0 },
                                    selectedOptionIndex: { type: "integer", minimum: 0 },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Item graded", content: { "application/json": { schema: { $ref: "#/components/schemas/PracticeAnswerResult" } } } },
                    "400": { description: "Missing fields, out of range, or out of order", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "404": { description: "Trial not found or expired", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "409": { description: "Could not record answer, please retry", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/practice/claim": {
            post: {
                operationId: "practiceClaim",
                responses: {
                    "200": { description: "Trial claimed into the signed-in account (idempotent)", content: { "application/json": { schema: { $ref: "#/components/schemas/PracticeClaimResult" } } } },
                    "400": { description: "No completed trial to claim, or an invalid/expired claim", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "404": { description: "Trial not found, expired, or not completed", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
    },
    components: {
        schemas: {
            ApiMessage: { type: "object", required: ["message"], properties: { message: { type: "string" } }, additionalProperties: false },
            // Never a word id or slug — see practice.ts's promptFace/optionFace commentary.
            PracticePrompt: { type: "object", required: ["displayWord", "partOfSpeech", "pronunciationTh"], properties: { displayWord: { type: "string" }, partOfSpeech: { type: "string" }, pronunciationTh: { type: "string" } }, additionalProperties: false },
            PracticeOption: { type: "object", required: ["meaningTh", "partOfSpeech"], properties: { meaningTh: { type: "string" }, partOfSpeech: { type: "string" } }, additionalProperties: false },
            PracticeItem: {
                type: "object",
                required: ["index", "prompt", "options"],
                properties: {
                    index: { type: "integer" },
                    prompt: { $ref: "#/components/schemas/PracticePrompt" },
                    options: { type: "array", items: { $ref: "#/components/schemas/PracticeOption" } },
                },
                additionalProperties: false,
            },
            PracticeStartResult: {
                type: "object",
                required: ["trialId", "itemCount", "items"],
                properties: {
                    trialId: { type: "string" },
                    itemCount: { type: "integer" },
                    items: { type: "array", items: { $ref: "#/components/schemas/PracticeItem" } },
                },
                additionalProperties: false,
            },
            PracticeAnswerResult: {
                type: "object",
                required: ["itemIndex", "correct", "correctOptionIndex", "done", "duplicate"],
                properties: {
                    itemIndex: { type: "integer" },
                    correct: { type: "boolean" },
                    correctOptionIndex: { type: "integer" },
                    done: { type: "boolean" },
                    duplicate: { type: "boolean" },
                    // Only present once `done` is true — the trial's own honest tally, never
                    // a client-reported score (LEARNER-LIFECYCLE.md §3.2).
                    correctCount: { type: "integer" },
                    total: { type: "integer" },
                },
                additionalProperties: false,
            },
            PracticeClaimResult: {
                type: "object",
                required: ["ok", "duplicate", "correctCount", "total"],
                properties: {
                    ok: { const: true },
                    duplicate: { type: "boolean", description: "true when this trial was already claimed by an earlier, idempotent call" },
                    correctCount: { type: "integer" },
                    total: { type: "integer" },
                },
                additionalProperties: false,
            },
        },
    },
} as const;

/**
 * OpenAPI for the merged eight-item mixed session and the Today card
 * (`session.ts`, `progress.ts`'s `/progress/today`, `/progress/goal` and
 * `/progress/export`) — hand-written gameplay verbs, documented by hand like
 * PRACTICE_OPENAPI above.
 */
const SESSION_OPENAPI = {
    openapi: "3.1.0",
    info: { title: "Vocab Learning App mixed-session API", version: "1.0.0" },
    paths: {
        "/progress/session/start": {
            post: {
                operationId: "sessionStart",
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    level: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
                                    unit: { type: "integer", minimum: 1 },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Session started", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionStartResult" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "422": { description: "Not enough published content for a session", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/progress/session/answer": {
            post: {
                operationId: "sessionAnswer",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["sessionId", "itemIndex"],
                                properties: {
                                    sessionId: { type: "string" },
                                    itemIndex: { type: "integer", minimum: 0 },
                                    selectedOptionIndex: { type: "integer" },
                                    spelling: { type: "string" },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Item graded", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionAnswerResult" } } } },
                    "400": { description: "Missing fields, out of range, or out of order", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "404": { description: "Session not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "409": { description: "Could not record answer, please retry", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/progress/session/{id}": {
            get: {
                operationId: "sessionStatus",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Session status", content: { "application/json": { schema: { $ref: "#/components/schemas/SessionStatusResult" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/progress/today": {
            get: {
                operationId: "getToday",
                responses: {
                    "200": { description: "Today card summary", content: { "application/json": { schema: { $ref: "#/components/schemas/TodaySummary" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/progress/goal": {
            post: {
                operationId: "setWeeklyGoal",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["days"],
                                properties: { days: { type: "integer", minimum: 1, maximum: 7 } },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Weekly goal set", content: { "application/json": { schema: { $ref: "#/components/schemas/SetGoalResult" } } } },
                    "400": { description: "days out of range", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "403": { description: "Weekly goal not yet eligible", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/progress/export": {
            get: {
                operationId: "exportProgress",
                parameters: [
                    {
                        name: "format",
                        in: "query",
                        required: false,
                        schema: { type: "string", enum: ["json", "csv"], default: "json" },
                    },
                ],
                responses: {
                    "200": {
                        description: "The caller's own data export (GDPR-style takeout), as JSON or CSV",
                        content: {
                            "application/json": { schema: { $ref: "#/components/schemas/ProgressExport" } },
                            "text/csv": { schema: { type: "string" } },
                        },
                    },
                    "400": { description: "format must be json or csv", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
    },
    components: {
        schemas: {
            SessionPromptFace: {
                type: "object",
                properties: {
                    displayWord: { type: "string" },
                    meaningTh: { type: "string" },
                    partOfSpeech: { type: "string" },
                    pronunciationTh: { type: "string" },
                    // The R2 key of the word's clip. Present on a prompt, never on an
                    // option — an option that could be played would give the answer away
                    // on a listening item.
                    audioKeyEn: { type: "string" },
                    // The example sentence with the word blanked out, on a cloze prompt.
                    clozeEn: { type: "string" },
                },
                additionalProperties: false,
            },
            SessionItem: {
                type: "object",
                required: ["index", "type", "prompt"],
                properties: {
                    index: { type: "integer" },
                    type: { type: "string", enum: ["choose-meaning", "choose-word", "spelling", "listen-choose", "cloze", "match-pairs", "speed-round"] },
                    prompt: { $ref: "#/components/schemas/SessionPromptFace" },
                    options: { type: "array", items: { $ref: "#/components/schemas/SessionPromptFace" } },
                },
                additionalProperties: false,
            },
            SessionStartResult: {
                type: "object",
                required: ["sessionId", "level", "unit", "mode", "itemCount", "dueCount", "items"],
                properties: {
                    sessionId: { type: "string", nullable: true },
                    level: { type: "string" },
                    unit: { type: "integer", nullable: true },
                    mode: { type: "string", enum: ["normal", "comeback", "review"] },
                    itemCount: { type: "integer" },
                    dueCount: { type: "integer" },
                    items: { type: "array", items: { $ref: "#/components/schemas/SessionItem" } },
                },
                additionalProperties: false,
            },
            SessionAnswerResult: {
                type: "object",
                required: ["itemIndex", "correct", "done", "duplicate"],
                properties: {
                    itemIndex: { type: "integer" },
                    correct: { type: "boolean" },
                    done: { type: "boolean" },
                    duplicate: { type: "boolean" },
                    correctSpelling: { type: "string" },
                    correctCount: { type: "integer" },
                    total: { type: "integer" },
                },
                additionalProperties: false,
            },
            SessionStatusResult: {
                type: "object",
                required: ["sessionId", "level", "unit", "answeredCount", "total", "correctCount", "done"],
                properties: {
                    sessionId: { type: "string" },
                    level: { type: "string" },
                    unit: { type: "integer", nullable: true },
                    answeredCount: { type: "integer" },
                    total: { type: "integer" },
                    correctCount: { type: "integer" },
                    done: { type: "boolean" },
                },
                additionalProperties: false,
            },
            CollectionLevel: {
                type: "object",
                required: ["level", "total", "strong", "mastered"],
                properties: {
                    level: { type: "string" },
                    total: { type: "integer" },
                    strong: { type: "integer" },
                    mastered: { type: "integer" },
                },
                additionalProperties: false,
            },
            TodaySummary: {
                type: "object",
                required: ["dueCount", "inProgressSession", "absenceDays", "lifecycleState", "recommendedAction", "nextUnit", "defaultLevel", "weeklyGoal", "streak", "collection"],
                properties: {
                    dueCount: { type: "integer" },
                    absenceDays: { type: "integer", nullable: true, description: "Whole local days since the most recent completed session/quiz, or null if none ever completed" },
                    lifecycleState: { type: "string", enum: ["active", "at-risk", "returning", "level-complete", "course-complete", "maintenance"], description: "LEARNER-LIFECYCLE.md §2 state: absence-derived, overridden by completion milestones" },
                    recommendedAction: { type: "string", enum: ["start", "resume", "comeback", "review", "next-level", "maintenance"], description: "The single home CTA derived from lifecycle state, open session and due reviews" },
                    inProgressSession: {
                        nullable: true,
                        type: "object",
                        required: ["id", "level", "unit", "createdAt"],
                        properties: {
                            id: { type: "string" },
                            level: { type: "string" },
                            unit: { type: "integer", nullable: true },
                            createdAt: { type: "string" },
                        },
                        additionalProperties: false,
                    },
                    nextUnit: { type: "integer", nullable: true },
                    defaultLevel: { type: "string" },
                    weeklyGoal: {
                        type: "object",
                        required: ["goalDays", "eligibleToSetGoal", "activeDaysThisWeek", "weekStart"],
                        properties: {
                            goalDays: { type: "integer", nullable: true },
                            eligibleToSetGoal: { type: "boolean" },
                            activeDaysThisWeek: { type: "integer" },
                            weekStart: { type: "string" },
                        },
                        additionalProperties: false,
                    },
                    streak: {
                        type: "object",
                        required: ["days", "weeks", "activeToday"],
                        properties: {
                            // Consecutive active days, ending today or yesterday — a
                            // streak does not break at midnight before the learner has
                            // had their evening.
                            days: { type: "integer" },
                            // Consecutive weeks that met the learner's own goal. The
                            // headline number for this audience (SPEC §5.4.3).
                            weeks: { type: "integer" },
                            activeToday: { type: "boolean" },
                        },
                        additionalProperties: false,
                    },
                    collection: {
                        type: "object",
                        required: ["courseLevel", "levels", "totalStrong", "totalMastered"],
                        properties: {
                            courseLevel: { type: "string" },
                            levels: { type: "array", items: { $ref: "#/components/schemas/CollectionLevel" } },
                            totalStrong: { type: "integer" },
                            totalMastered: { type: "integer" },
                        },
                        additionalProperties: false,
                    },
                },
                additionalProperties: false,
            },
            SetGoalResult: {
                type: "object",
                required: ["ok", "goalDays"],
                properties: {
                    ok: { const: true },
                    goalDays: { type: "integer" },
                },
                additionalProperties: false,
            },
            ProgressExportWord: {
                type: "object",
                required: ["displayWord", "level", "unit", "mastery", "lastSeenAt", "nextReviewAt", "correctCount", "incorrectCount"],
                properties: {
                    displayWord: { type: "string" },
                    level: { type: "string" },
                    unit: { type: "integer", nullable: true },
                    mastery: { type: "integer" },
                    lastSeenAt: { type: "string", nullable: true },
                    nextReviewAt: { type: "string", nullable: true },
                    correctCount: { type: "integer" },
                    incorrectCount: { type: "integer" },
                },
                additionalProperties: false,
            },
            ProgressExport: {
                type: "object",
                required: ["exportedAt", "learner", "summary", "words"],
                properties: {
                    exportedAt: { type: "string" },
                    learner: {
                        type: "object",
                        required: ["email", "username", "timezone"],
                        properties: {
                            email: { type: "string" },
                            username: { type: "string" },
                            timezone: { type: "string", nullable: true },
                        },
                        additionalProperties: false,
                    },
                    summary: {
                        type: "object",
                        required: ["total", "strong", "mastered"],
                        properties: {
                            total: { type: "integer" },
                            strong: { type: "integer" },
                            mastered: { type: "integer" },
                        },
                        additionalProperties: false,
                    },
                    words: { type: "array", items: { $ref: "#/components/schemas/ProgressExportWord" } },
                },
                additionalProperties: false,
            },
        },
    },
} as const;

/**
 * OpenAPI for the end-of-unit checkpoint gate (`checkpoint.ts`) — a hand-written gameplay
 * verb like PRACTICE_OPENAPI and SESSION_OPENAPI above, so documented by hand. The item
 * faces are deliberately answer-key-free: a `prompt`/`option` face never carries a word id
 * or slug, a `spelling` item's prompt is only the Thai meaning (never the target word), and
 * no "correct option index" is ever transmitted — the schemas mirror that exactly.
 */
const CHECKPOINT_OPENAPI = {
    openapi: "3.1.0",
    info: { title: "Vocab Learning App checkpoint API", version: "1.0.0" },
    paths: {
        "/progress/checkpoint/start": {
            post: {
                operationId: "checkpointStart",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["level", "unit"],
                                properties: {
                                    level: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
                                    unit: { type: "integer", minimum: 1 },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Checkpoint started or resumed", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckpointStartResult" } } } },
                    "400": { description: "level or unit missing or out of range", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "422": { description: "Not enough learned words in this unit for a checkpoint yet", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckpointNotReady" } } } },
                },
            },
        },
        "/progress/checkpoint/answer": {
            post: {
                operationId: "checkpointAnswer",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["checkpointId", "itemIndex"],
                                properties: {
                                    checkpointId: { type: "string" },
                                    itemIndex: { type: "integer", minimum: 0 },
                                    selectedOptionIndex: { type: "integer", minimum: 0 },
                                    spelling: { type: "string" },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Item graded", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckpointAnswerResult" } } } },
                    "400": { description: "Missing fields, out of range, or out of order", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "404": { description: "Checkpoint not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "409": { description: "Could not record answer, please retry", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
        "/progress/checkpoint/{id}": {
            get: {
                operationId: "checkpointStatus",
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                responses: {
                    "200": { description: "Checkpoint status", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckpointStatusResult" } } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                    "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiMessage" } } } },
                },
            },
        },
    },
    components: {
        schemas: {
            ApiMessage: { type: "object", required: ["message"], properties: { message: { type: "string" } }, additionalProperties: false },
            // Present only on the 422 from /start — the learner needs this many more mastered
            // words before the unit can be gated.
            CheckpointNotReady: { type: "object", required: ["message", "recoveryCount"], properties: { message: { type: "string" }, recoveryCount: { type: "integer" } }, additionalProperties: false },
            // Every property optional: which appear depends on the item's direction and type.
            // A `choose-meaning` prompt carries displayWord/partOfSpeech/pronunciationTh and its
            // options carry meaningTh/partOfSpeech; `choose-word` is the mirror; a `spelling`
            // prompt carries meaningTh alone. Never a word id or slug (checkpoint.ts).
            CheckpointPromptFace: {
                type: "object",
                properties: {
                    displayWord: { type: "string" },
                    meaningTh: { type: "string" },
                    partOfSpeech: { type: "string" },
                    pronunciationTh: { type: "string" },
                },
                additionalProperties: false,
            },
            CheckpointItem: {
                type: "object",
                required: ["index", "type", "prompt"],
                properties: {
                    index: { type: "integer" },
                    type: { type: "string", enum: ["choose-meaning", "choose-word", "spelling"] },
                    prompt: { $ref: "#/components/schemas/CheckpointPromptFace" },
                    // Absent on a `spelling` item, which renders a text field instead.
                    options: { type: "array", items: { $ref: "#/components/schemas/CheckpointPromptFace" } },
                },
                additionalProperties: false,
            },
            CheckpointStartResult: {
                type: "object",
                required: ["checkpointId", "level", "unit", "itemCount", "answeredCount", "items"],
                properties: {
                    checkpointId: { type: "string" },
                    level: { type: "string" },
                    unit: { type: "integer" },
                    itemCount: { type: "integer" },
                    answeredCount: { type: "integer" },
                    items: { type: "array", items: { $ref: "#/components/schemas/CheckpointItem" } },
                },
                additionalProperties: false,
            },
            CheckpointAnswerResult: {
                type: "object",
                required: ["itemIndex", "correct", "done", "duplicate"],
                properties: {
                    itemIndex: { type: "integer" },
                    correct: { type: "boolean" },
                    done: { type: "boolean" },
                    duplicate: { type: "boolean" },
                    // Only present on a `spelling` item whose target word was found.
                    correctSpelling: { type: "string" },
                    // The block below is present only once `done` is true — the checkpoint's own
                    // honest tally and settled gate decision, never a client-reported score.
                    correctCount: { type: "integer" },
                    total: { type: "integer" },
                    passed: { type: "boolean" },
                    awarded: { type: "boolean" },
                    recoveryCount: { type: "integer" },
                },
                additionalProperties: false,
            },
            CheckpointStatusResult: {
                type: "object",
                required: ["checkpointId", "level", "unit", "answeredCount", "itemCount", "correctCount", "done", "passed", "awarded", "recoveryCount", "items"],
                properties: {
                    checkpointId: { type: "string" },
                    level: { type: "string" },
                    unit: { type: "integer" },
                    answeredCount: { type: "integer" },
                    itemCount: { type: "integer" },
                    correctCount: { type: "integer" },
                    done: { type: "boolean" },
                    passed: { type: "boolean" },
                    awarded: { type: "boolean" },
                    recoveryCount: { type: "integer" },
                    items: { type: "array", items: { $ref: "#/components/schemas/CheckpointItem" } },
                },
                additionalProperties: false,
            },
        },
    },
} as const;

/**
 * The reminder settings a learner controls (`reminders.ts`). The cron-driven send has no
 * OpenAPI surface on purpose — it is not a route anyone calls — and `/reminders/run` is
 * dev-mode only, so it is documented in the module rather than in the public contract.
 */
const REMINDERS_OPENAPI = {
    openapi: "3.1.0",
    info: { title: "Vocab Learning App reminders API", version: "1.0.0" },
    paths: {
        "/wordlists": {
            get: {
                operationId: "wordlistsList",
                responses: {
                    "200": { description: "Published word lists", content: { "application/json": { schema: { $ref: "#/components/schemas/WordlistsResult" } } } },
                },
            },
        },
        "/wordlists/current": {
            get: {
                operationId: "wordlistCurrentGet",
                responses: {
                    "200": { description: "The learner's list", content: { "application/json": { schema: { $ref: "#/components/schemas/CurrentWordlist" } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
            post: {
                operationId: "wordlistCurrentSet",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["wordlistId"],
                                properties: { wordlistId: { type: "string" } },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Switched", content: { "application/json": { schema: { $ref: "#/components/schemas/CurrentWordlist" } } } },
                    "402": { description: "Not available on the caller's plan", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                    "404": { description: "No such published list", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/placement/start": {
            post: {
                operationId: "placementStart",
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    // Present for `/english/test/[level]` ("are you ready
                                    // for A2?"): questions come from that level only, and
                                    // there are twice as many of them.
                                    level: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Questions, with no answer key", content: { "application/json": { schema: { $ref: "#/components/schemas/PlacementStartResult" } } } },
                    "422": { description: "Not enough published content", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/placement/score": {
            post: {
                operationId: "placementScore",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["token", "answers"],
                                properties: {
                                    token: { type: "string" },
                                    // One selected option index per item, in item order.
                                    // A null is an unanswered item and scores as wrong.
                                    answers: { type: "array", items: { type: "integer", nullable: true } },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Result", content: { "application/json": { schema: { $ref: "#/components/schemas/PlacementResult" } } } },
                    "400": { description: "Expired or forged token", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/progress/units": {
            get: {
                operationId: "progressUnits",
                parameters: [
                    { name: "level", in: "query", required: false, schema: { type: "string", enum: ["A1", "A2", "B1", "B2"] } },
                ],
                responses: {
                    "200": { description: "Unit states for the level", content: { "application/json": { schema: { $ref: "#/components/schemas/UnitProgress" } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/progress/history": {
            get: {
                operationId: "progressHistory",
                parameters: [
                    { name: "days", in: "query", required: false, schema: { type: "integer", minimum: 7, maximum: 365 } },
                ],
                responses: {
                    "200": { description: "Per-day activity", content: { "application/json": { schema: { $ref: "#/components/schemas/ProgressHistory" } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/reminders/settings": {
            get: {
                operationId: "reminderSettingsGet",
                responses: {
                    "200": { description: "Current settings", content: { "application/json": { schema: { $ref: "#/components/schemas/ReminderSettings" } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
            post: {
                operationId: "reminderSettingsSave",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["optIn"],
                                properties: {
                                    optIn: { type: "boolean" },
                                    hour: { type: "integer", minimum: 0, maximum: 23 },
                                },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Saved", content: { "application/json": { schema: { $ref: "#/components/schemas/ReminderSettings" } } } },
                    "400": { description: "Invalid", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/reminders/preview": {
            get: {
                operationId: "reminderPreview",
                responses: {
                    "200": { description: "What a notification should say right now", content: { "application/json": { schema: { $ref: "#/components/schemas/ReminderPreview" } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/push/key": {
            get: {
                operationId: "pushKey",
                responses: {
                    "200": { description: "The VAPID application server key", content: { "application/json": { schema: { type: "object", required: ["key"], properties: { key: { type: "string" } }, additionalProperties: false } } } },
                    "503": { description: "Push is not configured", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/push/subscribe": {
            post: {
                operationId: "pushSubscribe",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["endpoint", "keys"],
                                properties: {
                                    endpoint: { type: "string", format: "uri" },
                                    keys: {
                                        type: "object",
                                        required: ["p256dh", "auth"],
                                        properties: { p256dh: { type: "string" }, auth: { type: "string" } },
                                        additionalProperties: false,
                                    },
                                },
                                additionalProperties: true,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Subscribed", content: { "application/json": { schema: { type: "object", required: ["ok"], properties: { ok: { const: true } }, additionalProperties: false } } } },
                    "400": { description: "Missing or non-https endpoint", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                    "503": { description: "Push is not configured", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/push/unsubscribe": {
            post: {
                operationId: "pushUnsubscribe",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["endpoint"],
                                properties: { endpoint: { type: "string", format: "uri" } },
                                additionalProperties: false,
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Unsubscribed", content: { "application/json": { schema: { type: "object", required: ["ok"], properties: { ok: { const: true } }, additionalProperties: false } } } },
                    "401": { description: "Not signed in", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
        "/reminders/unsubscribe": {
            get: {
                operationId: "reminderUnsubscribe",
                parameters: [
                    { name: "token", in: "query", required: true, schema: { type: "string" } },
                ],
                responses: {
                    "200": { description: "Unsubscribed", content: { "application/json": { schema: { type: "object", required: ["ok"], properties: { ok: { const: true } }, additionalProperties: false } } } },
                    "400": { description: "Expired or forged link", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
                },
            },
        },
    },
    components: {
        schemas: {
            Wordlist: {
                type: "object",
                required: ["id", "title", "titleTh", "description", "descriptionTh", "isFree", "wordCount"],
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    titleTh: { type: "string" },
                    description: { type: "string" },
                    descriptionTh: { type: "string" },
                    // The entitlement seam. Everything is free today; the field exists so
                    // the client never has to infer availability from a name.
                    isFree: { type: "boolean" },
                    // Published words only — a list is as big as what a learner can reach.
                    wordCount: { type: "integer" },
                },
                additionalProperties: false,
            },
            WordlistsResult: {
                type: "object",
                required: ["lists"],
                properties: {
                    lists: { type: "array", items: { $ref: "#/components/schemas/Wordlist" } },
                },
                additionalProperties: false,
            },
            CurrentWordlist: {
                type: "object",
                required: ["wordlistId"],
                properties: { wordlistId: { type: "string" } },
                additionalProperties: false,
            },
            PlacementItem: {
                type: "object",
                required: ["index", "level", "prompt", "options"],
                properties: {
                    index: { type: "integer" },
                    level: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
                    prompt: {
                        type: "object",
                        required: ["displayWord", "partOfSpeech"],
                        properties: {
                            displayWord: { type: "string" },
                            partOfSpeech: { type: "string" },
                        },
                        additionalProperties: false,
                    },
                    options: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["meaningTh"],
                            properties: { meaningTh: { type: "string" } },
                            additionalProperties: false,
                        },
                    },
                },
                additionalProperties: false,
            },
            PlacementStartResult: {
                type: "object",
                required: ["token", "itemCount", "items"],
                properties: {
                    // Carries the answer key, signed. The client never sees which option
                    // is correct until it submits.
                    token: { type: "string" },
                    itemCount: { type: "integer" },
                    items: { type: "array", items: { $ref: "#/components/schemas/PlacementItem" } },
                },
                additionalProperties: false,
            },
            PlacementResult: {
                type: "object",
                required: ["recommendedLevel", "correctCount", "itemCount", "levels"],
                properties: {
                    recommendedLevel: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
                    correctCount: { type: "integer" },
                    itemCount: { type: "integer" },
                    levels: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["level", "correct", "total"],
                            properties: {
                                level: { type: "string", enum: ["A1", "A2", "B1", "B2"] },
                                correct: { type: "integer" },
                                total: { type: "integer" },
                            },
                            additionalProperties: false,
                        },
                    },
                },
                additionalProperties: false,
            },
            UnitProgress: {
                type: "object",
                required: ["level", "nextUnit", "crowns", "units"],
                properties: {
                    level: { type: "string" },
                    // Where the path should send the learner: the first open, unfinished
                    // unit.
                    nextUnit: { type: "integer" },
                    crowns: { type: "integer" },
                    units: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["unit", "words", "strong", "complete", "unlocked", "crown"],
                            properties: {
                                unit: { type: "integer" },
                                words: { type: "integer" },
                                strong: { type: "integer" },
                                complete: { type: "boolean" },
                                // Derived, never stored: unit 1 is always open, the rest
                                // follow the one before them.
                                unlocked: { type: "boolean" },
                                crown: { type: "boolean" },
                            },
                            additionalProperties: false,
                        },
                    },
                },
                additionalProperties: false,
            },
            ProgressHistory: {
                type: "object",
                required: ["days", "entries"],
                properties: {
                    days: { type: "integer" },
                    entries: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["day", "sessions", "items"],
                            properties: {
                                // A Bangkok calendar day, `YYYY-MM-DD` — the same day
                                // boundary the weekly goal is measured against.
                                day: { type: "string" },
                                sessions: { type: "integer" },
                                items: { type: "integer" },
                            },
                            additionalProperties: false,
                        },
                    },
                },
                additionalProperties: false,
            },
            ReminderPreview: {
                type: "object",
                required: ["title", "body", "url"],
                properties: {
                    title: { type: "string" },
                    body: { type: "string" },
                    // Where the notification should open. Same-origin path, not a URL.
                    url: { type: "string" },
                },
                additionalProperties: false,
            },
            ReminderSettings: {
                type: "object",
                required: ["optIn", "hour"],
                properties: {
                    optIn: { type: "boolean" },
                    /** An hour in the learner's own timezone, not UTC. */
                    hour: { type: "integer", minimum: 0, maximum: 23 },
                    timezone: { type: "string", nullable: true },
                },
                additionalProperties: false,
            },
        },
    },
} as const;

/**
 * Merges AUTH_OPENAPI, PRACTICE_OPENAPI, SESSION_OPENAPI and CHECKPOINT_OPENAPI into one
 * document so `pnpm gen:api-types` runs `openapi-typescript` once, against one URL, and
 * `lib/api-types.ts` carries every hand-written verb's real response shape rather than a
 * hand-duplicated guess.
 */
const OPENAPI = {
    openapi: "3.1.0" as const,
    info: { title: "Vocab Learning App API", version: "1.0.0" },
    paths: { ...AUTH_OPENAPI.paths, ...PRACTICE_OPENAPI.paths, ...SESSION_OPENAPI.paths, ...CHECKPOINT_OPENAPI.paths, ...REMINDERS_OPENAPI.paths },
    components: {
        schemas: {
            ...AUTH_OPENAPI.components.schemas,
            ...PRACTICE_OPENAPI.components.schemas,
            ...SESSION_OPENAPI.components.schemas,
            ...CHECKPOINT_OPENAPI.components.schemas,
            ...REMINDERS_OPENAPI.components.schemas,
        },
    },
};

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

/**
 * A username for an account created without a form — magic-link sign-up and Google both
 * arrive with an email and no chosen handle.
 *
 * Derived from the address's local part so it is recognisable, stripped to the character
 * set the rest of the app already assumes, and suffixed until it is free. After a couple
 * of collisions it stops counting and takes a random suffix: probing `name1`, `name2`, …
 * one query at a time is a slow way to discover which handles exist.
 */
const deriveUsername = async (
    prisma: { user: { findUnique: (args: never) => Promise<unknown> } },
    email: string,
) => {
    const base =
        (email.split("@")[0] ?? "")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "")
            .slice(0, 20) || "learner";

    for (const candidate of [base, `${base}1`, `${base}2`]) {
        const taken = await prisma.user.findUnique({
            where: { username: candidate },
            select: { id: true },
        } as never);
        if (!taken) return candidate;
    }

    return `${base.slice(0, 12)}${randomToken().slice(0, 8)}`;
};

const hashToken = async (token: string) =>
    bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));

/**
 * Browsers scope cookies by host and path, not by port. Local development can therefore
 * leave two `user_token` cookies from unrelated apps on localhost (for example one
 * host-only cookie and one `Domain=localhost` cookie). Hono's `getCookie` returns only
 * one value, whose ordering is browser-dependent, so a stale token could mask the fresh
 * token that magic-link verification had just issued. Preserve every candidate and let
 * signature verification decide which, if any, is this app's session.
 */
const cookieValues = (cookieHeader: string | undefined, name: string): string[] => {
    if (!cookieHeader) return [];
    const prefix = `${name}=`;
    return cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter((part) => part.startsWith(prefix))
        .map((part) => part.slice(prefix.length))
        .filter(Boolean);
};

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

    /**
     * A readable companion to the token above. It carries no identity and grants no
     * access — it says only "a session cookie exists", which is precisely the question
     * the browser cannot otherwise answer about an `httpOnly` cookie.
     *
     * Without it the app bar had to ask the server on every page load, so every
     * logged-out visit made a `GET /api/user/me` that returned 401 — a Worker
     * invocation, a D1 read and a console error per pageview, to learn something the
     * request already knew. Anything that matters is still decided by `user_token`
     * server-side; forging this one buys an attacker a different-looking navbar.
     */
    setCookie(c, USER_SESSION_HINT, "1", {
        httpOnly: false,
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

    const userTokens = cookieValues(c.req.header("Cookie"), USER_TOKEN);
    const adminToken = getCookie(c, ADMIN_TOKEN);

    if (adminToken) {
        try {
            const { payload } = await jwtVerify(adminToken, secretOf(c));
            if (payload.role === "admin") c.set("role", "admin");
        } catch {
            // fall through as anonymous
        }
    } else {
        for (const userToken of userTokens) {
            try {
                const { payload } = await jwtVerify(userToken, secretOf(c));
                if (payload.role === "user" && typeof payload.userId === "string") {
                    c.set("role", "user");
                    c.set("userId", payload.userId);
                    break;
                }
            } catch {
                // Try the next same-name cookie. A different localhost app may have
                // issued this candidate with another signing key.
            }
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
app.get("/practice/openapi.json", (c) => c.json(PRACTICE_OPENAPI));
// The one document `pnpm gen:api-types` actually points at (package.json).
app.get("/openapi.json", (c) => c.json(OPENAPI));

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

/**
 * Captured silently from `Intl.DateTimeFormat().resolvedOptions().timeZone`
 * (LEARNER-LIFECYCLE.md §3.4) — never a form field, so this only ever validates a value
 * the browser itself produced. `Intl.DateTimeFormat` throws `RangeError` for anything that
 * isn't a real IANA zone, which is the whole check: no hand-maintained zone list to drift
 * out of date. `Asia/Bangkok` is the default for the primary (Thai) audience when the
 * field is absent or fails validation, per §9 decision 10.
 */
const DEFAULT_TIMEZONE = "Asia/Bangkok";
const resolveTimezone = (value: unknown): string => {
    if (typeof value !== "string" || value.length === 0 || value.length > 100) {
        return DEFAULT_TIMEZONE;
    }
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: value });
        return value;
    } catch {
        return DEFAULT_TIMEZONE;
    }
};

app.post("/user/register", async (c) => {
    const { email, username, password, firstName, lastName, timezone, locale } =
        await c.req.json<{
            email?: string;
            username?: string;
            password?: string;
            firstName?: string;
            lastName?: string;
            timezone?: string;
            // The interface language the learner registered under. Captured silently like
            // the timezone — never a form field — and used later by the surfaces that have
            // no request to read it from (reminder email, push text).
            locale?: string;
        }>();

    // Name is not required to learn vocabulary. It stays accepted, because the profile
    // still shows it, but demanding it was two fields of friction in front of the product.
    if (!email || !username || !password) {
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
            // The column is non-null with a "" default; an omitted name stores that
            // rather than failing the insert.
            firstName: firstName ?? "",
            lastName: lastName ?? "",
            timezone: resolveTimezone(timezone),
            locale: locale === "en" ? "en" : "th",
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

    // An account created by Google or a magic link stores '' rather than a hash (see
    // `User.password`). Refuse it here, before any comparison: '' is not a hash any
    // verifier should be asked to parse, and the answer must not differ from a wrong
    // password or it would reveal how an account was created.
    if (!user || !user.password || !(await verifyPassword(password, user.password))) {
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

    {
        // A link is issued whether or not the address has an account. The two cases differ
        // only in which table records it: an existing learner gets a MagicLinkToken, a new
        // address gets a PendingSignup that becomes an account when the link is verified.
        //
        // The response is identical either way — still an unconditional 202 — so this adds
        // no way to ask the API whether an address is registered.
        const bypassCooldown =
            testMode && c.req.header("x-magic-link-test-bypass-cooldown") === "true";

        const latest = user
            ? await c.get("prisma").magicLinkToken.findFirst({
                  where: { userId: user.id },
                  orderBy: { createdAt: "desc" },
                  select: { createdAt: true },
              })
            : await c.get("prisma").pendingSignup.findFirst({
                  where: { email: normalizedEmail },
                  orderBy: { createdAt: "desc" },
                  select: { createdAt: true },
              });

        if (
            latest &&
            latest.createdAt.getTime() > Date.now() - MAGIC_LINK_COOLDOWN_MS &&
            !bypassCooldown
        ) {
            return c.json({ ok: true }, 202);
        }

        const token = randomToken();
        const safeFrom = from?.startsWith("/") && !from.startsWith("//") ? from : `/${safeLocale}`;
        // Snapshot *this browser's* pending trial onto the request now, not onto the
        // cookie jar that verifies it (LEARNER-LIFECYCLE.md §3.3) — LINE's in-app browser
        // handing off to the system browser lands `/auth/verify` in a different jar than
        // the one that held it. The claim cookie is verified right here and only the bare
        // trial id is kept — never the signed bearer token itself.
        const requesterClaimCookie = getCookie(c, TRIAL_CLAIM_COOKIE);
        const pendingTrialId = requesterClaimCookie
            ? await verifyTrialClaim(c, requesterClaimCookie)
            : null;
        const origin = (c.env.APP_URL ?? c.env.FRONTEND_URL ?? new URL(c.req.url).origin).replace(/\/$/, "");
        const link = new URL(`${origin}/${safeLocale}/auth/verify`);
        link.searchParams.set("token", token);
        link.searchParams.set("from", safeFrom);

        const tokenHash = await hashToken(token);
        const expiresAt = new Date(
            Date.now() +
            (testMode && c.req.header("x-magic-link-test-expired") === "true"
                ? -1
                : MAGIC_LINK_TTL_MINUTES * 60_000),
        );

        // A newly requested link supersedes older unredeemed links. Each statement is
        // independently safe on D1; no transaction semantics are assumed.
        if (user) {
            await c.get("prisma").$executeRaw`
                UPDATE MagicLinkToken
                SET usedAt = ${new Date()}
                WHERE userId = ${user.id} AND usedAt IS NULL
            `;
            await c.get("prisma").magicLinkToken.create({
                data: { tokenHash, userId: user.id, pendingTrialId, expiresAt },
            });
        } else {
            await c.get("prisma").$executeRaw`
                UPDATE PendingSignup
                SET usedAt = ${new Date()}
                WHERE email = ${normalizedEmail} AND usedAt IS NULL
            `;
            await c.get("prisma").pendingSignup.create({
                data: { tokenHash, email: normalizedEmail, pendingTrialId, expiresAt },
            });
        }

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

    const tokenHash = await hashToken(token);
    const usable = <T extends { usedAt: Date | null; expiresAt: Date }>(
        row: T | null,
    ): row is T => !!row && !row.usedAt && row.expiresAt > new Date();

    const record = await c.get("prisma").magicLinkToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, username: true, email: true } } },
    });

    if (!usable(record)) {
        // Not a sign-in link for an existing account. It may be a sign-up link, which
        // carries an address rather than a user because the account does not exist yet.
        const pending = await c.get("prisma").pendingSignup.findUnique({ where: { tokenHash } });

        if (usable(pending)) {
            // Redeem a sign-up link: the address is proven, so the account is created now.
            // Consumption uses the same conditional update as a sign-in link — the only way
            // to make a one-time token single-use without transactions — and it runs
            // *before* the account is created, so a double-redeemed link cannot produce two.
            let claimed = 0;
            try {
                claimed = await c.get("prisma").$executeRaw`
                    UPDATE PendingSignup
                    SET usedAt = ${new Date()}
                    WHERE id = ${pending.id} AND usedAt IS NULL
                `;
            } catch {
                claimed = 0;
            }
            if (claimed !== 1) {
                return c.json(
                    magicLinkError("INVALID_OR_EXPIRED_MAGIC_LINK", "This sign-in link is invalid or expired"),
                    400,
                );
            }

            // The address may have gained an account between request and redemption — a
            // password sign-up, or a Google sign-in on the same address. Adopt it rather
            // than failing: this link proved the address, which is what linking requires.
            const existing = await c.get("prisma").user.findUnique({
                where: { email: pending.email },
                select: { id: true, username: true, email: true },
            });

            const created =
                existing ??
                (await c.get("prisma").user.create({
                    data: {
                        email: pending.email,
                        username: await deriveUsername(c.get("prisma") as never, pending.email),
                        // No password: this account signs in by link. See `User.password`.
                        password: "",
                    },
                    select: { id: true, username: true, email: true },
                }));

            await setUserSession(c as never, created);

            if (pending.pendingTrialId) {
                await applyTrialClaim(c, created.id, pending.pendingTrialId);
            }

            return c.json(created);
        }

        return c.json(
            magicLinkError("INVALID_OR_EXPIRED_MAGIC_LINK", "This sign-in link is invalid or expired"),
            400,
        );
    }

    // Conditional update makes concurrent redemption single-use without a transaction.
    let consumed = 0;
    try {
        consumed = await c.get("prisma").$executeRaw`
            UPDATE MagicLinkToken
            SET usedAt = ${new Date()}
            WHERE id = ${record.id} AND usedAt IS NULL
        `;
    } catch {
        // D1 may reject the losing writer when two redemptions reach this conditional
        // update simultaneously. That contender did not consume the token, so it has the
        // same public meaning as a zero-row update: the one-time link is no longer valid.
        // Returning the stable auth error also keeps a harmless redemption race from
        // terminating the local Worker and cascading into unrelated request failures.
        consumed = 0;
    }
    if (consumed !== 1) {
        return c.json(
            magicLinkError("INVALID_OR_EXPIRED_MAGIC_LINK", "This sign-in link is invalid or expired"),
            400,
        );
    }

    await setUserSession(c as never, record.user);

    // Recover a trial bound at request time (§3.3) even though this browser never held
    // the claim cookie itself — that's the whole point of binding to the token instead of
    // the requester's cookie jar.
    if (record.pendingTrialId) {
        await applyTrialClaim(c, record.user.id, record.pendingTrialId);
    }

    return c.json(record.user);
});

app.get("/user/google/start", async (c) => startGoogleAuth(c as never));

app.get("/user/google/callback", async (c) => {
    const locale = c.req.query("locale") === "th" ? "th" : "en";
    const returnPath = returnPathFrom(c);
    const origin = (c.env.APP_URL ?? c.env.FRONTEND_URL ?? new URL(c.req.url).origin).replace(/\/$/, "");
    const failure = `${origin}/${locale}/auth/login?error=google`;

    const identity = await exchangeGoogleCode(c as never);
    clearOAuthCookies(c);

    if (!identity) return c.redirect(failure, 302);

    // An unverified Google address must never be allowed to adopt an existing account:
    // that is the whole attack — register the victim's address at an identity provider
    // that does not check it, then sign in as them. Verified is the precondition for
    // linking, so refuse rather than silently creating a second account.
    if (!identity.emailVerified) return c.redirect(failure, 302);

    const prisma = c.get("prisma");

    // `sub` first: it is the only stable handle. Email can be reassigned by a workspace
    // admin, and matching on it alone would hand the new owner the old owner's progress.
    let user = await prisma.user.findUnique({
        where: { googleId: identity.sub },
        select: { id: true, username: true, email: true },
    });

    if (!user) {
        const byEmail = await prisma.user.findUnique({
            where: { email: identity.email },
            select: { id: true, username: true, email: true, googleId: true },
        });

        if (byEmail && !byEmail.googleId) {
            // Same verified address, no Google link yet — adopt the existing account so a
            // learner who signed up by password or link keeps their progress.
            await prisma.user.update({
                where: { id: byEmail.id },
                data: { googleId: identity.sub },
            });
            user = { id: byEmail.id, username: byEmail.username, email: byEmail.email };
        } else if (!byEmail) {
            user = await prisma.user.create({
                data: {
                    email: identity.email,
                    username: await deriveUsername(prisma as never, identity.email),
                    googleId: identity.sub,
                    firstName: identity.firstName,
                    lastName: identity.lastName,
                    // No password: this account signs in with Google. See `User.password`.
                    password: "",
                },
                select: { id: true, username: true, email: true },
            });
        } else {
            // The address already carries a *different* Google account. Nothing safe to do.
            return c.redirect(failure, 302);
        }
    }

    await setUserSession(c as never, user);

    // Same trial hand-off the magic link performs — a learner who practised before signing
    // in keeps that work.
    const claimCookie = getCookie(c, TRIAL_CLAIM_COOKIE);
    if (claimCookie) {
        const trialId = await verifyTrialClaim(c, claimCookie);
        if (trialId) await applyTrialClaim(c, user.id, trialId);
    }

    const safeReturn = returnPath.startsWith("/") && !returnPath.startsWith("//") ? returnPath : `/${locale}`;
    return c.redirect(`${origin}${safeReturn}`, 302);
});

app.post("/user/logout", (c) => {
    deleteCookie(c, USER_TOKEN, { path: "/" });
    // Both, or the bar keeps claiming a session that no longer exists.
    deleteCookie(c, USER_SESSION_HINT, { path: "/" });
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
app.route("/", practice);
app.route("/", session);
app.route("/", checkpoint);
app.route("/", audio);
app.route("/", reminders);
app.route("/", placement);
app.route("/", wordlists);
app.route("/", push);
app.route("/", stats);
app.route("/", units);

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

// The alphabet is read by anonymous learners (the reference page and the letter breakdown
// under a word) and curated by an admin, who may add, edit and remove rows — a course may
// want a mark this list does not carry, or may not want one it does.
//
// `updateMany`/`deleteMany` stay off. Both are unbounded by nature, and the entire table is
// 102 rows: one mistyped `where` would take the alphabet with it. Per-row writes make the
// blast radius of any single call exactly one letter.
app.route(
    "/",
    ThaiLetterRouter<Env>({
        findMany: { shape: THAI_LETTER_SHAPES },
        findManyPaginated: { shape: THAI_LETTER_SHAPES },
        create: {
            before: [requireAdmin as never],
            shape: THAI_LETTER_CREATE_SHAPE,
        },
        update: {
            before: [requireAdmin as never],
            shape: THAI_LETTER_UPDATE_SHAPE,
        },
        delete: {
            before: [requireAdmin as never],
            shape: THAI_LETTER_DELETE_SHAPE,
        },
        guard: { resolveVariant },
        pagination: { defaultLimit: 120, maxLimit: 120 },
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

/**
 * The Worker, with its scheduled half.
 *
 * The cron fires hourly and the reminder pass decides who, if anyone, is at their chosen
 * local hour right now (`reminders.ts`) — one UTC send time would reach Bangkok and Berlin
 * at unrelated moments of their day, and the audience is in one of those places.
 *
 * `waitUntil` rather than a bare await so a slow mail provider cannot make the scheduled
 * invocation itself look failed and get retried, which would mail people twice.
 */
export default {
    fetch: app.fetch,
    scheduled: async (
        _event: unknown,
        env: Bindings,
        ctx: { waitUntil: (promise: Promise<unknown>) => void },
    ) => {
        const prisma = getPrisma(env.DB) as never;
        ctx.waitUntil(
            runReminderPass(env, prisma, new Date(), { dryRun: false }).catch((error) => {
                console.error("reminder pass failed", error);
            }),
        );
    },
};
export { requireUser };
