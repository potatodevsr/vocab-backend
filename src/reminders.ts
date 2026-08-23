import { Hono } from "hono";
import { SignJWT, jwtVerify } from "jose";

import type { Bindings, Variables } from "./index.js";
import { sendPush } from "./push.js";

type Env = { Bindings: Bindings; Variables: Variables };

/**
 * Reminder and weekly-recap email.
 *
 * The product has a daily loop, a weekly goal and a streak, and until now no way to reach
 * a learner who closed the tab — every return visit had to be self-initiated. This is the
 * one channel that changes that, so it is also the one most able to become a nuisance.
 * The constraints that keep it honest:
 *
 * - **Off until asked for.** No opt-in at signup, no pre-checked box. A learner turns it
 *   on in their profile after they have decided the app is worth returning to.
 * - **Never sent to someone who already showed up.** The send checks today's activity
 *   first: a reminder to practise, arriving after you practised, teaches the learner that
 *   the mail is noise.
 * - **One-click unsubscribe, no login.** The link carries a signed token, because someone
 *   who wants out is in the worst possible mood to be asked for a password.
 * - **Local time, not UTC.** The hour is the learner's own; the cron runs hourly and works
 *   out who is at their chosen hour right now.
 *
 * D1 has no transactions, so "already sent today" is a stored local date compared before
 * the send and written after it. A crash between the two means at worst one duplicate for
 * one learner, which is the failure direction to prefer over silently skipping a day.
 */

export const reminders = new Hono<Env>();

/** How long an unsubscribe link stays valid. Long, because email lives in an archive. */
const UNSUBSCRIBE_TTL = "180d";

/** The default hour when a learner opts in without picking one — early evening, local. */
export const DEFAULT_REMINDER_HOUR = 19;

/** Weekly recap goes out Monday morning: the week ahead is still open to be won. */
const RECAP_WEEKDAY = 1;
const RECAP_HOUR = 9;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The learner's wall-clock time, from an IANA zone name.
 *
 * `Intl` is the only timezone database on Workers, and `formatToParts` is the only way to
 * read a specific zone's fields without pulling one in. An unknown or missing zone falls
 * back to Asia/Bangkok — the audience's zone, and a better guess than UTC, which would
 * mail Thai learners at 7am local while claiming to be their evening.
 */
const localParts = (now: Date, timezone: string | null) => {
    const zone = timezone || "Asia/Bangkok";

    const format = (options: Intl.DateTimeFormatOptions) => {
        try {
            return new Intl.DateTimeFormat("en-CA", { timeZone: zone, ...options });
        } catch {
            return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", ...options });
        }
    };

    const date = format({ year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const hour = Number(format({ hour: "2-digit", hour12: false }).format(now));
    const weekday = format({ weekday: "short" }).format(now);

    // en-CA gives `YYYY-MM-DD`, which sorts and compares as a string — the property the
    // idempotency key depends on.
    return { date, hour, weekday };
};

/**
 * The UTC instant at which the learner's local day began.
 *
 * Not `new Date(\`${date}T00:00:00Z\`)`, which is the tempting one-liner and is wrong by
 * the zone's whole offset: for a learner in Bangkok it points at 07:00 local, so a session
 * finished over breakfast reads as "yesterday" and the reminder goes out to someone who
 * has already practised. The offset has to be measured, and `Intl` is the only thing on
 * Workers that knows it.
 */
const startOfLocalDay = (now: Date, timezone: string | null): Date => {
    const zone = timezone || "Asia/Bangkok";

    let parts: Intl.DateTimeFormatPart[];
    try {
        parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: zone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).formatToParts(now);
    } catch {
        return new Date(now.getTime());
    }

    const field = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
    const [year, month, day, hour, minute, second] = [
        field("year"), field("month"), field("day"), field("hour"), field("minute"), field("second"),
    ];

    // Reading the zone's wall clock as if it were UTC, minus the real instant, is the
    // offset — including whatever DST is in force at that moment.
    const offsetMs = Date.UTC(year, month - 1, day, hour, minute, second) - now.getTime();

    return new Date(Date.UTC(year, month - 1, day) - offsetMs);
};

const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const signUnsubscribe = async (secret: string, userId: string) =>
    new SignJWT({ purpose: "unsubscribe", userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(UNSUBSCRIBE_TTL)
        .sign(new TextEncoder().encode(secret));

const readUnsubscribe = async (secret: string, token: string): Promise<string | null> => {
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        if (payload.purpose !== "unsubscribe" || typeof payload.userId !== "string") return null;
        return payload.userId;
    } catch {
        return null;
    }
};

type Mail = { to: string; subject: string; text: string };

/**
 * Composes the daily nudge.
 *
 * Deliberately short, deliberately specific, and it never guilts: it names what is
 * waiting (due reviews, or the next unit) rather than what will be lost. The one number
 * in it is the learner's own progress, which is the thing they came for.
 */
const dailyMail = (
    { email, locale }: { email: string; locale: "en" | "th" },
    { dueCount, appUrl, unsubscribeUrl }: { dueCount: number; appUrl: string; unsubscribeUrl: string },
): Mail => {
    const th = locale === "th";

    const subject = th
        ? dueCount > 0
            ? `มีคำรอทบทวน ${dueCount} คำวันนี้`
            : "ฝึกสัก 3 นาทีไหม"
        : dueCount > 0
          ? `${dueCount} words are due for review`
          : "Three minutes of practice?";

    const body = th
        ? [
              dueCount > 0
                  ? `วันนี้มีคำที่ถึงเวลาทบทวน ${dueCount} คำ ใช้เวลาประมาณ 3 นาที`
                  : "บทเรียนสั้น ๆ วันนี้พร้อมแล้ว ใช้เวลาประมาณ 3 นาที",
              "",
              `เริ่มเลย: ${appUrl}`,
              "",
              `ไม่อยากรับอีเมลนี้ กดที่นี่ครั้งเดียวจบ: ${unsubscribeUrl}`,
          ]
        : [
              dueCount > 0
                  ? `${dueCount} words are due for review today. About three minutes.`
                  : "Today's short session is ready. About three minutes.",
              "",
              `Start here: ${appUrl}`,
              "",
              `Not useful? One click to stop these: ${unsubscribeUrl}`,
          ];

    return { to: email, subject, text: body.join("\n") };
};

/** The Monday recap: what last week actually was, in numbers the learner earned. */
const recapMail = (
    { email, locale }: { email: string; locale: "en" | "th" },
    {
        activeDays,
        wordsLearned,
        appUrl,
        unsubscribeUrl,
    }: { activeDays: number; wordsLearned: number; appUrl: string; unsubscribeUrl: string },
): Mail => {
    const th = locale === "th";

    return {
        to: email,
        subject: th ? "สรุปสัปดาห์ที่ผ่านมา" : "Your week in review",
        text: (th
            ? [
                  `สัปดาห์ที่ผ่านมาคุณเรียน ${activeDays} วัน และเก็บคำใหม่ได้ ${wordsLearned} คำ`,
                  "",
                  `สัปดาห์นี้เริ่มแล้ว: ${appUrl}`,
                  "",
                  `หยุดรับอีเมลนี้: ${unsubscribeUrl}`,
              ]
            : [
                  `Last week you practised on ${activeDays} days and added ${wordsLearned} words.`,
                  "",
                  `This week is open: ${appUrl}`,
                  "",
                  `Stop these emails: ${unsubscribeUrl}`,
              ]
        ).join("\n"),
    };
};

const send = async (env: Bindings, mail: Mail) => {
    if (!env.RESEND_API_KEY || !env.MAGIC_LINK_FROM) {
        throw new Error("RESEND_API_KEY and MAGIC_LINK_FROM are required to send reminders");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: env.MAGIC_LINK_FROM,
            to: mail.to,
            subject: mail.subject,
            text: mail.text,
        }),
    });

    if (!response.ok) throw new Error(`Resend responded ${response.status}`);
};

type Candidate = {
    id: string;
    email: string;
    timezone: string | null;
    /** The interface language this learner registered under — `th` unless they chose `en`. */
    locale: string;
    reminderHour: number | null;
    lastReminderOn: string | null;
    lastRecapOn: string | null;
};

/**
 * One pass of the reminder loop, shared by the cron handler and the dev-mode route the
 * e2e suite drives. Returns what was sent (or would have been), so a test can assert on
 * the decision without a mail provider in the loop.
 */
export const runReminderPass = async (
    env: Bindings,
    prisma: Variables["prisma"],
    now: Date,
    { dryRun }: { dryRun: boolean },
): Promise<Mail[]> => {
    const appUrl = env.APP_URL ?? "https://vocab-learning-app.thousandsofraccoons.workers.dev";
    const candidates = (await prisma.user.findMany({
        where: { reminderOptIn: true },
        select: {
            id: true,
            email: true,
            timezone: true,
            locale: true,
            reminderHour: true,
            lastReminderOn: true,
            lastRecapOn: true,
        },
    })) as Candidate[];

    const sent: Mail[] = [];

    for (const learner of candidates) {
        const { date, hour, weekday } = localParts(now, learner.timezone);
        const token = await signUnsubscribe(env.JWT_SECRET, learner.id);
        const unsubscribeUrl = `${appUrl}/api/reminders/unsubscribe?token=${token}`;
        // The learner's own interface language, captured at registration. A Thai email about
        // a course somebody is reading in English is the kind of small wrongness that makes
        // a product feel like it was built for somebody else.
        const locale: "en" | "th" = learner.locale === "en" ? "en" : "th";

        const isRecapTime =
            WEEKDAY_INDEX[weekday] === RECAP_WEEKDAY &&
            hour === RECAP_HOUR &&
            learner.lastRecapOn !== date;

        if (isRecapTime) {
            const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
            const [sessions, learned] = await Promise.all([
                prisma.mixedSession.findMany({
                    where: { userId: learner.id, completedAt: { gte: weekAgo } },
                    select: { completedAt: true },
                }),
                prisma.userWordProgress.count({
                    where: { userId: learner.id, updatedAt: { gte: weekAgo }, mastery: { gte: 1 } },
                }),
            ]);

            const activeDays = new Set(
                sessions
                    .map((s: { completedAt: Date | null }) => s.completedAt)
                    .filter((value: Date | null): value is Date => value !== null)
                    .map((value: Date) => localParts(value, learner.timezone).date),
            ).size;

            const mail = recapMail(
                { email: learner.email, locale },
                { activeDays, wordsLearned: learned, appUrl, unsubscribeUrl },
            );

            if (!dryRun) {
                await send(env, mail);
                await prisma.user.update({
                    where: { id: learner.id },
                    data: { lastRecapOn: date },
                });
            }

            sent.push(mail);
            continue;
        }

        const wanted = learner.reminderHour ?? DEFAULT_REMINDER_HOUR;
        if (hour !== wanted || learner.lastReminderOn === date) continue;

        /**
         * Someone who already practised today does not get told to practise today. This is
         * the check that decides whether the mail reads as help or as spam, so it is a
         * real query rather than a flag some other code path has to remember to set.
         */
        const activeToday = await prisma.mixedSession.count({
            where: {
                userId: learner.id,
                completedAt: { gte: startOfLocalDay(now, learner.timezone) },
            },
        });
        if (activeToday > 0) continue;

        const dueCount = await prisma.userWordProgress.count({
            where: { userId: learner.id, nextReviewAt: { lte: now } },
        });

        /**
         * Push first, email second — never both.
         *
         * A learner who installed the app and allowed notifications has told us where they
         * want to be reached; also mailing them is the same nudge twice, which is how a
         * useful reminder becomes something to turn off. Email remains the fallback, and
         * the only channel for someone who never granted the permission.
         */
        const subscriptions = (await prisma.pushSubscription.findMany({
            where: { userId: learner.id, failedAt: null },
            select: { id: true, endpoint: true },
        })) as { id: string; endpoint: string }[];

        let pushed = false;

        if (!dryRun && subscriptions.length > 0) {
            for (const subscription of subscriptions) {
                const result = await sendPush(env, subscription);
                if (result.ok) pushed = true;
                if (result.gone) {
                    // The browser threw the subscription away. Nothing to retry.
                    await prisma.pushSubscription.delete({ where: { id: subscription.id } });
                }
            }
        }

        const mail = dailyMail(
            { email: learner.email, locale },
            { dueCount, appUrl, unsubscribeUrl },
        );

        if (!dryRun) {
            if (!pushed) await send(env, mail);
            await prisma.user.update({
                where: { id: learner.id },
                data: { lastReminderOn: date },
            });
        }

        sent.push(mail);
    }

    return sent;
};

/**
 * What a notification should say, right now, for the caller.
 *
 * The service worker fetches this when an (empty) push arrives — see `push.ts` for why the
 * push itself carries no payload. It is a normal cookie-authenticated read: personal text
 * reaches the device without passing through Google's or Mozilla's push service.
 */
reminders.get("/reminders/preview", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const prisma = c.get("prisma");
    const now = new Date();

    const [dueCount, learner] = await Promise.all([
        prisma.userWordProgress.count({
            where: { userId, nextReviewAt: { lte: now } },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { locale: true } }),
    ]);

    // The learner's own language, and a link into that locale — a notification that opens
    // the wrong half of a bilingual app is worse than no notification.
    const th = learner?.locale !== "en";

    return c.json({
        title: th
            ? dueCount > 0
                ? `มีคำรอทบทวน ${dueCount} คำ`
                : "ฝึกสัก 3 นาทีไหม"
            : dueCount > 0
              ? `${dueCount} words are due`
              : "Three minutes of practice?",
        body: th
            ? dueCount > 0
                ? "บทเรียนสั้น ๆ พร้อมแล้ว ใช้เวลาประมาณ 3 นาที"
                : "วันนี้ยังไม่ได้ฝึก มาต่อกันสักหน่อย"
            : dueCount > 0
              ? "A short session is ready. About three minutes."
              : "You have not practised today yet.",
        url: th ? "/th" : "/en",
    });
});

// ------------------------------------------------------------------ learner settings

reminders.get("/reminders/settings", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const user = await c.get("prisma").user.findUnique({
        where: { id: userId },
        select: { reminderOptIn: true, reminderHour: true, timezone: true },
    });

    if (!user) return c.json({ message: "Not found" }, 404);

    return c.json({
        optIn: user.reminderOptIn,
        hour: user.reminderHour ?? DEFAULT_REMINDER_HOUR,
        timezone: user.timezone ?? null,
    });
});

reminders.post("/reminders/settings", async (c) => {
    const userId = c.get("userId");
    if (!userId) return c.json({ message: "Unauthorized" }, 401);

    const body = (await c.req.json().catch(() => null)) as {
        optIn?: unknown;
        hour?: unknown;
    } | null;

    if (typeof body?.optIn !== "boolean") {
        return c.json({ message: "optIn is required" }, 400);
    }

    // An hour outside the day is a client bug, and silently clamping it would mail someone
    // at a time they never chose.
    const hour =
        typeof body.hour === "number" && Number.isInteger(body.hour) ? body.hour : null;
    if (hour !== null && (hour < 0 || hour > 23)) {
        return c.json({ message: "hour must be between 0 and 23" }, 400);
    }

    const user = await c.get("prisma").user.update({
        where: { id: userId },
        data: {
            reminderOptIn: body.optIn,
            reminderHour: hour ?? DEFAULT_REMINDER_HOUR,
            // Turning it back on must not inherit yesterday's "already sent" marker.
            ...(body.optIn ? { lastReminderOn: null } : {}),
        },
        select: { reminderOptIn: true, reminderHour: true },
    });

    return c.json({ optIn: user.reminderOptIn, hour: user.reminderHour ?? DEFAULT_REMINDER_HOUR });
});

/**
 * One click, no login, from an email that may be months old.
 *
 * A GET because that is what a mail client will follow. The token is single-purpose and
 * signed, so the worst a leaked link can do is stop someone's reminders — and the person
 * holding it is, by construction, the person who wanted that.
 */
reminders.get("/reminders/unsubscribe", async (c) => {
    const token = c.req.query("token") ?? "";
    const userId = await readUnsubscribe(c.env.JWT_SECRET, token);

    if (!userId) return c.json({ message: "This link is no longer valid" }, 400);

    await c.get("prisma").user.update({
        where: { id: userId },
        data: { reminderOptIn: false },
    });

    return c.json({ ok: true });
});

/**
 * Runs the pass on demand, for the e2e suite only.
 *
 * Gated on `MAGIC_LINK_DEV_MODE` — the same flag that already makes magic-link mail
 * inspectable instead of sent — and always a dry run, so a test can assert *who would be
 * mailed and why* without a Resend key and without a scheduled trigger to wait for.
 */
reminders.post("/reminders/run", async (c) => {
    if (c.env.MAGIC_LINK_DEV_MODE !== "true") return c.json({ message: "Not found" }, 404);

    const body = (await c.req.json().catch(() => ({}))) as { now?: unknown };
    const now = typeof body.now === "string" ? new Date(body.now) : new Date();
    if (Number.isNaN(now.getTime())) return c.json({ message: "now must be an ISO date" }, 400);

    const mails = await runReminderPass(c.env, c.get("prisma"), now, { dryRun: true });

    return c.json({ ok: true, mails });
});
