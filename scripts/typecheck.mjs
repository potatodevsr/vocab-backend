// The backend's real TypeScript gate.
//
//   pnpm typecheck
//
// `tsc --noEmit` on its own cannot be the gate here, and pretending otherwise is how a
// review ends up believing a red command is green. `tsconfig.json` includes only
// `src/**/*.ts`, but `src` imports the committed `prisma/generated/` tree, so TypeScript
// pulls those files into the program and checks them too — and that tree does not
// typecheck. It has never typechecked. The errors are not ours to fix in application code:
//
//   * 81 of them are one generator bug. `HandlerContext` is declared over
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
//   * **Any** error in `src/` fails the run. That is the gate.
//   * Errors in `prisma/generated/` are counted against the recorded baseline below. The
//     count going *up* also fails the run — a regeneration that breaks something new must
//     not disappear into the noise — and the count going *down* fails too, so whoever
//     finally fixes the generator is forced to lower the baseline rather than leave a
//     stale number behind.
//
// Run `pnpm exec tsc --noEmit` directly to read the raw list.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Errors the committed `prisma/generated/` tree emits today, with
 * `prisma-generator-express` at the version in the lockfile and TypeScript 5.9.
 *
 * Lower this the moment the generator is fixed or upgraded. Never raise it to make a run
 * pass: a higher number means a regeneration broke something, which is the one thing this
 * baseline exists to catch.
 */
const GENERATED_BASELINE = 133;

const GENERATED_PREFIX = "prisma/generated/";

const result = spawnSync("pnpm", ["exec", "tsc", "--noEmit"], {
    cwd: root,
    encoding: "utf8",
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

// `path/to/file.ts(12,34): error TS1234: …` — the only lines that are an error's location.
// Continuation lines of a multi-line error are indented and must not be counted twice.
const ERROR_LINE = /^([^\s(][^(]*)\((\d+),(\d+)\): error TS\d+:/;

const errors = output
    .split("\n")
    .map((line) => ERROR_LINE.exec(line))
    .filter((match) => match !== null)
    .map((match) => ({ file: match[1].replaceAll("\\", "/"), line: match[0] }));

const generated = errors.filter((error) => error.file.startsWith(GENERATED_PREFIX));
const ours = errors.filter((error) => !error.file.startsWith(GENERATED_PREFIX));

if (ours.length > 0) {
    console.error(`✖ ${ours.length} TypeScript error(s) outside prisma/generated:\n`);
    for (const error of ours) console.error(`  ${error.line}`);
    process.exit(1);
}

if (generated.length !== GENERATED_BASELINE) {
    const direction = generated.length > GENERATED_BASELINE ? "rose" : "fell";
    console.error(
        `✖ prisma/generated error count ${direction}: ${GENERATED_BASELINE} -> ${generated.length}.\n` +
            (generated.length > GENERATED_BASELINE
                ? "  A regeneration broke something new. Read `pnpm exec tsc --noEmit`.\n"
                : "  Good news — now lower GENERATED_BASELINE in scripts/typecheck.mjs to match.\n"),
    );
    process.exit(1);
}

console.log(
    `✓ src/ is clean. ${generated.length} known generator errors in prisma/generated/ ` +
        "(unchanged baseline — see scripts/typecheck.mjs).",
);
