// `prisma-generator-express` bakes the *absolute* schema path of whichever machine ran
// `prisma generate` into `prisma/generated/hono/queryBuilder.ts`:
//
//     const schemaPath = options.schemaPath || "/Users/someone/repo/prisma/schema.prisma";
//
// The generated tree is committed and CI asserts `git diff --quiet -- prisma/generated`
// after regenerating. An absolute path makes that assertion unsatisfiable: it is
// `/Users/...` on a laptop and `/home/runner/work/...` on the runner, so exactly one line
// differs and the contract job fails for everyone except whoever last committed.
//
// Rewriting it to a cwd-relative `resolve()` keeps the runtime behaviour (every script
// that starts the query builder runs from the repo root, which is where `prisma/` lives)
// and makes the output identical on every machine. Run after `prisma generate` —
// `pnpm db:generate` does both.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// `fileURLToPath`, not `URL.pathname`: the latter stays percent-encoded, so a checkout
// under a path containing a space would resolve to a directory that does not exist.
const GENERATED_DIR = fileURLToPath(new URL("../prisma/generated/", import.meta.url));
const QUERY_BUILDER = join(GENERATED_DIR, "hono/queryBuilder.ts");

// The literal the generator emits, in the one place it emits it. Matched loosely on the
// tail so a generator that changes the surrounding formatting still gets normalised.
const ABSOLUTE_SCHEMA_PATH = /"\/[^"\n]*\/prisma\/schema\.prisma"/g;
const NORMALISED = 'resolve(process.cwd(), "prisma/schema.prisma")';

let changed = 0;

const source = readFileSync(QUERY_BUILDER, "utf8");
const normalised = source.replace(ABSOLUTE_SCHEMA_PATH, NORMALISED);
if (normalised !== source) {
  writeFileSync(QUERY_BUILDER, normalised);
  changed += 1;
}

// `resolve` is already imported by the generated file; if a future generator version stops
// importing it the rewrite would produce code that does not compile, so say so loudly
// rather than committing a broken tree.
if (!/import\s*{[^}]*\bresolve\b[^}]*}\s*from\s*"path"/.test(normalised)) {
  console.error(
    "normalize-generated: queryBuilder.ts no longer imports `resolve` from \"path\" — " +
      "the rewritten default would not compile. Update scripts/normalize-generated.mjs.",
  );
  process.exit(1);
}

// Nothing else in the tree may carry a machine-specific path. If the generator starts
// emitting one somewhere new, fail here rather than at 3am in CI with a one-line diff.
const offenders = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|js|mjs|json)$/.test(entry)) continue;
    const text = readFileSync(full, "utf8");
    for (const match of text.matchAll(/"(\/(?:Users|home|root)\/[^"\n]*)"/g)) {
      offenders.push(`${relative(GENERATED_DIR, full)}: ${match[1]}`);
    }
  }
};
walk(GENERATED_DIR);

if (offenders.length > 0) {
  console.error(
    "normalize-generated: machine-specific absolute paths remain in the generated tree:\n" +
      offenders.map((line) => `  ${line}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  changed > 0
    ? "normalize-generated: rewrote the hardcoded schema path in hono/queryBuilder.ts"
    : "normalize-generated: generated tree already portable",
);
