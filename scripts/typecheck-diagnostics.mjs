/**
 * Parsing and comparing `tsc` diagnostics. Pure, so the two failure modes that matter can
 * be tested without arranging for a broken compiler or a broken generator.
 *
 * Consumed by `scripts/typecheck.mjs` (the gate) and by
 * `e2e/unit/backend-typecheck.spec.ts` in the web repo (its tests).
 */

/**
 * `path/to/file.ts(12,34): error TS1234: message` — an error's own line.
 *
 * Continuation lines of a multi-line diagnostic are indented, so the leading
 * `[^\s(]` keeps them out and stops one error being counted several times.
 */
const DIAGNOSTIC_LINE = /^([^\s(][^(]*)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

/**
 * Machine-specific absolute paths, replaced so a fingerprint is portable.
 *
 * Diagnostics embed them — `import("/Users/someone/repo/backend/prisma/generated/…")` — and
 * without this the baseline would only ever match on the machine that recorded it.
 */
export const normaliseMessage = (message, root) => {
    const withoutRoot = root ? message.split(root).join("<root>") : message;

    // pnpm's store path carries the resolved version, so `wrangler@4.123.0/…` in a message
    // would churn the baseline on an unrelated dependency bump.
    return withoutRoot
        .replace(/\/node_modules\/\.pnpm\/[^/]+\//g, "/node_modules/.pnpm/<pkg>/")
        .replace(/\s+/g, " ")
        .trim();
};

/**
 * Every diagnostic `tsc` reported, in order.
 *
 * @param {string} output combined stdout+stderr from `tsc --noEmit`
 * @param {string} [root] absolute path to strip out of messages
 */
export const parseDiagnostics = (output, root) => {
    const diagnostics = [];
    let current;
    for (const line of output.split(/\r?\n/)) {
        const match = DIAGNOSTIC_LINE.exec(line);
        if (match) {
            current = {
                file: match[1].replaceAll("\\", "/"),
                line: Number(match[2]),
                column: Number(match[3]),
                code: match[4],
                message: match[5],
                raw: match[0],
            };
            diagnostics.push(current);
        } else if (current && /^\s+\S/.test(line)) {
            // Overload details and nested incompatibilities are part of the identity,
            // not additional diagnostics. A generic header alone can hide a new error.
            current.message += `\n${line}`;
            current.raw += `\n${line}`;
        } else {
            current = undefined;
        }
    }
    return diagnostics.map((diagnostic) => ({
        ...diagnostic,
        message: normaliseMessage(diagnostic.message, root),
    }));
};

/**
 * `{ "<file>|<code>|<message>": count }`.
 *
 * The message is part of the identity on purpose. Keying on `<file>|<code>` alone let a
 * regeneration swap one problem for a *different* problem of the same code in the same
 * file and keep the count identical — 37 `TS2345` in `UserRouter.ts` before and after,
 * describing different breakage. The message is what distinguishes them.
 *
 * Line and column are still excluded: they shift whenever generated output moves by a
 * line, which would make the baseline churn on every regeneration and train everyone to
 * re-record it without reading it — the failure mode a baseline exists to prevent.
 */
export const fingerprintOf = (diagnostics, prefix = "") => {
    const fingerprint = {};

    for (const diagnostic of diagnostics) {
        if (prefix && !diagnostic.file.startsWith(prefix)) continue;

        const key = `${diagnostic.file}|${diagnostic.code}|${diagnostic.message}`;
        fingerprint[key] = (fingerprint[key] ?? 0) + 1;
    }

    return fingerprint;
};

/** Entries whose count differs, in key order. Empty when the two match exactly. */
export const diffFingerprints = (baseline, current) => {
    const keys = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort();

    return keys
        .map((key) => ({ key, was: baseline[key] ?? 0, now: current[key] ?? 0 }))
        .filter((entry) => entry.was !== entry.now)
        .map((entry) => ({
            ...entry,
            label: entry.was === 0 ? "NEW" : entry.now === 0 ? "GONE" : "CHANGED",
        }));
};

export const totalOf = (fingerprint) =>
    Object.values(fingerprint).reduce((sum, count) => sum + count, 0);

/**
 * Whether a `spawnSync` result is a compiler run we may draw conclusions from.
 *
 * This is the other way a baseline gate lies. If `tsc` never ran — the binary is missing,
 * the process was killed, it died on an internal error — the output is empty, and "no
 * diagnostics parsed" is indistinguishable from "the code is clean" unless someone
 * checks. Worse, `--update` would happily record that emptiness as the new baseline and
 * every future run would agree with it.
 *
 * TypeScript's exit codes: `0` clean, `2` diagnostics reported. `1`, `3` and anything else
 * mean the compiler itself failed (internal error, bad project config), so they are never
 * a result to reason about.
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export const validateRun = (result, diagnosticCount) => {
    if (result.error) {
        return { ok: false, reason: `tsc could not be started: ${result.error.message}` };
    }

    if (result.signal) {
        return {
            ok: false,
            reason:
                `tsc was killed by ${result.signal} — usually the machine running out of ` +
                "memory. Nothing can be concluded from a partial run.",
        };
    }

    if (result.status !== 0 && result.status !== 2) {
        return {
            ok: false,
            reason:
                `tsc exited ${result.status}, which is a compiler failure rather than a ` +
                "report of diagnostics (0 = clean, 2 = diagnostics).",
        };
    }

    // The status and the parse have to agree, or the parser has drifted from tsc's output
    // format and is silently reporting a clean tree.
    if (result.status === 2 && diagnosticCount === 0) {
        return {
            ok: false,
            reason:
                "tsc reported diagnostics (exit 2) but none could be parsed. The output " +
                "format has probably changed — this gate cannot be trusted until the " +
                "parser in scripts/typecheck-diagnostics.mjs is updated.",
        };
    }

    if (result.status === 0 && diagnosticCount > 0) {
        return {
            ok: false,
            reason: `tsc exited clean but ${diagnosticCount} diagnostic(s) were parsed.`,
        };
    }

    return { ok: true };
};
