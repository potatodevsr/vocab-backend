// The backend's real TypeScript gate.
//
//   pnpm typecheck            # the gate
//   pnpm typecheck --update   # re-record the generated baseline after a generator change
//
// `tsc --noEmit` on its own cannot be the gate here, and pretending otherwise is how a
// review ends up believing a red command is green. `tsconfig.json` includes only
// `src/**/*.ts`, but `src` imports the committed `prisma/generated/` tree, so TypeScript
// pulls those files into the program and checks them too — and that tree does not
// typecheck. It has never typechecked. The errors are not ours to fix in application code:
//
//   * 111 of them are `TS2345` across the three generated routers, and 81 of those carry
//     a single message: `HandlerContext` is declared over
//     `{ Variables: HonoInternalVariables }`, where `prisma` is optional, and is passed to
//     `Context<HonoEnv>`, where `prisma` is required. Both types are generator output;
//     nothing in `src/` appears in the error.
//   * The rest come from `routeConfig.ts` and `routeConfig.target.ts` declaring two
//     structurally incompatible `RouteConfig` types and the routers passing one where the
//     other is expected, plus three missing `.js` extensions and one bad
//     `@prisma/client` re-export.
//
// Fixing that means changing `prisma-generator-express` or rewriting its output, which is
// a separate piece of work from any application change. So this script draws the line
// explicitly instead of hiding it:
//
//   * The compiler run itself is validated first. A `tsc` that never started, was killed,
//     or died on an internal error produces no output — and "no diagnostics" is
//     indistinguishable from "clean" unless someone checks. See `validateRun`.
//   * **Any** error in `src/` fails the run. That is the gate.
//   * Errors in `prisma/generated/` are compared against a recorded multiset keyed by
//     file, error code **and normalised message** — see `fingerprintOf` for why the
//     message is part of the identity and line numbers are not.
//
// Everything worth testing lives in `./typecheck-diagnostics.mjs`, which is pure and is
// covered by `e2e/unit/backend-typecheck.spec.ts` in the web repo. This file is the wiring.
//
// Run `pnpm exec tsc --noEmit` directly to read the raw list.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
    diffFingerprints,
    fingerprintOf,
    parseDiagnostics,
    totalOf,
    validateRun,
} from "./typecheck-diagnostics.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = resolve(root, "scripts/generated-typecheck-baseline.json");
const GENERATED_PREFIX = "prisma/generated/";

const shouldUpdate = process.argv.includes("--update");

const result = spawnSync("pnpm", ["exec", "tsc", "--noEmit"], {
    cwd: root,
    encoding: "utf8",
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const diagnostics = parseDiagnostics(output, root);

/**
 * Validate the run before believing a single thing it says.
 *
 * This guard is why `--update` cannot record an empty baseline: a compiler that crashed
 * reports nothing, and without this the update below would happily write `{}` and every
 * later run would agree with it.
 */
const run = validateRun(result, diagnostics.length);

if (!run.ok) {
    console.error(`✖ ${run.reason}\n`);
    if (output.trim()) console.error(`--- tsc output ---\n${output.trim().slice(-4_000)}`);
    process.exit(1);
}

const ours = diagnostics.filter((d) => !d.file.startsWith(GENERATED_PREFIX));

if (ours.length > 0) {
    console.error(`✖ ${ours.length} TypeScript error(s) outside prisma/generated:\n`);
    for (const diagnostic of ours) console.error(`  ${diagnostic.raw}`);
    process.exit(1);
}

const fingerprint = fingerprintOf(diagnostics, GENERATED_PREFIX);
const total = totalOf(fingerprint);

if (shouldUpdate) {
    let existingComment;
    try {
        existingComment = JSON.parse(readFileSync(BASELINE_PATH, "utf8"))._comment;
    } catch {
        existingComment = undefined;
    }

    const record = {
        _comment: existingComment ?? [
            "Diagnostics the committed prisma/generated/ tree emits, as",
            "'<file>|<error code>|<normalised message>' -> count. Re-record with",
            "`pnpm typecheck --update` ONLY alongside a deliberate generator change, and read",
            "the diff — never re-record to make a red run green. Line and column numbers are",
            "excluded on purpose: they shift on every regeneration.",
        ],
    };
    for (const key of Object.keys(fingerprint).sort()) record[key] = fingerprint[key];

    writeFileSync(BASELINE_PATH, `${JSON.stringify(record, null, 2)}\n`);
    console.log(
        `✓ Re-recorded ${Object.keys(fingerprint).length} generated diagnostic group(s), ` +
            `${total} error(s) total. Read the diff before committing it.`,
    );
    process.exit(0);
}

/**
 * The baseline has to travel with this script.
 *
 * They are two files and can be committed apart — which would leave the gate unable to
 * read its own reference and failing with a bare `ENOENT`. Say what is missing and how to
 * produce it instead.
 */
let baselineFile;
try {
    baselineFile = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch (error) {
    console.error(
        `✖ Cannot read the generated-diagnostics baseline at ${BASELINE_PATH}.\n` +
            `  ${error instanceof Error ? error.message : String(error)}\n\n` +
            "  It is committed alongside this script. If it is genuinely absent, recreate it\n" +
            "  with `pnpm typecheck --update` and read the result before committing.",
    );
    process.exit(1);
}

const baseline = Object.fromEntries(
    Object.entries(baselineFile).filter(([key]) => !key.startsWith("_")),
);

const drift = diffFingerprints(baseline, fingerprint);

if (drift.length > 0) {
    console.error("✖ The prisma/generated diagnostics no longer match the recorded baseline:\n");

    for (const { key, was, now, label } of drift) {
        const [file, code, ...messageParts] = key.split("|");
        const message = messageParts.join("|");
        console.error(`  ${label.padEnd(8)} ${file} ${code}  ${was} -> ${now}`);
        console.error(`           ${message}`);
    }

    console.error(
        "\n  A regeneration changed what the generated tree reports. Read " +
            "`pnpm exec tsc --noEmit`, decide whether it is an improvement or a break, and " +
            "only then re-record with `pnpm typecheck --update`.\n" +
            "  Never re-record to make a run pass.",
    );
    process.exit(1);
}

console.log(
    `✓ src/ is clean. ${total} known generator errors in prisma/generated/ across ` +
        `${Object.keys(fingerprint).length} file/code/message group(s), matching the ` +
        "recorded baseline (scripts/generated-typecheck-baseline.json).",
);
