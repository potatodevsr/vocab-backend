# Vocab Learning App — api Worker

The API for the Duolingo-style vocab app. Consumed **only** by the web Worker over a
Cloudflare **service binding** — this Worker has no public hostname and no CORS.

The product spec, data model, and roadmap live in the web repo: `docs/SPEC.md`. Read it
before changing the schema or adding routes.

## Stack

| Piece | Choice | Note |
| --- | --- | --- |
| Runtime | Cloudflare Workers | not Node — see constraints below |
| HTTP | Hono | `hono/cookie`, `hono/cors` (cors normally unused) |
| Routes | `prisma-generator-express`, `target = "hono"` | generated per model, do not hand-edit |
| Authorization | `prisma-guard` | mandatory on every operation |
| ORM | Prisma 7.9.x + `@prisma/adapter-d1` | |
| DB | Cloudflare D1 (SQLite) | schema `provider = "sqlite"` stays |
| Auth | `jose` JWT in httpOnly cookies, WebCrypto PBKDF2 passwords | |

## Gotchas that cost real debugging time

- **`runtime = "workerd"` on the client generator is mandatory.** Without it the generated
  Prisma client emits `fileURLToPath(import.meta.url)` at module scope and the Worker dies
  on boot with `The "path" argument must be of type string`.
- **Routes are strict and case-sensitive.** Express matched `/VocabWord` and `/vocabword/`;
  Hono does not. Model paths are flat lowercase with no trailing slash.
- **Unique-where shapes take a different form.** `update`/`findUnique` target a Prisma
  `WhereUniqueInput`, which rejects operator objects: use `where: { id: true }`, not
  `where: { id: { equals: true } }`. Reads use the operator form.
- **Generated routers land in `prisma/generated/hono/`** — the path derives from `target`;
  the generator has no `output` option (the value in the log line is cosmetic).
- **CORS is temporary.** It exists only because dev runs web and API on different origins.
  Once Next forwards `/api/*` over a service binding, delete it.

## Worker constraints — these are not style preferences

- **No `express`, `cookie-parser`, `cors`, `bcryptjs`, `jsonwebtoken`, `better-sqlite3`,
  `fs`, or `net`** in anything that ships. They are Node-only or CPU-hostile on Workers.
- **D1 has no transactions — of any kind.** Prisma's docs: implicit and explicit
  transactions "will be ignored and run as individual queries, which breaks the guarantees
  of the ACID properties." The array form of `$transaction` buys nothing. Multi-write
  operations must be idempotent, ledger-first, and use `{ increment: n }` rather than
  read-modify-write. See `docs/SPEC.md` §5.3.
- Keep `findManyPaginatedMode = "promiseAll"` in the generator config — `"transaction"`
  needs interactive transaction support the D1 adapter does not have.
- Prefer a **per-request Prisma client** closing over the caller's identity over
  `AsyncLocalStorage` for guard scope context. D1 adapter clients are cheap; ALS on Workers
  is the thing we're trying not to depend on.

## Hard rules

1. **Every generated operation has a guard shape. No `enableAll`.** The README is explicit:
   "when neither `shape` nor `variants` is configured, the generated handler calls Prisma
   directly with no guard enforcement." An operation without a shape is an unreviewed data
   export — that is precisely today's `User` router.
2. **`guard.resolveVariant` must always return a definite variant.** Caller resolution goes
   `resolveVariant(request)` → **the client-controlled `x-api-variant` header** →
   `undefined`. A `resolveVariant` returning `undefined` (e.g. the README's own
   `req.user?.role` for an anonymous caller) lets a client select its own guard shape by
   sending a header. Return `'public'` explicitly; never `?.`.
3. **Mark `User` `@scope-root`** so per-user tables (`UserWordProgress`, `XpEvent`, …) get
   `WHERE userId = <caller>` injected rather than filtered by a client-supplied field.
4. **…but `@scope-root` does not protect the root model itself.** Guard's docs: scope roots
   "are not automatically scoped by their own `@scope-root` marker." Marking `User` secures
   the child tables and does nothing for `user.findMany()` — the one leaking passwords. That
   needs its own explicit `select` shape.
5. **`updateEach` stays disabled.** Verbatim from the generator's docs: "`updateEach` does
   **not** apply prisma-guard shapes on any target, by design… Because it bypasses guard, it
   can write any field the underlying `update` allows."
6. **Password hashes appear in no `select`, in no variant, ever.** The `User` router today
   returns them to any admin-authenticated list call — that is the bug guard shapes exist
   to fix.
7. **Generated CRUD is for reads and admin writes only.** Anything that awards XP, moves a
   streak, spends a heart, or advances mastery is a hand-written verb that derives the user
   from the JWT. Never trust a `userId` in a request body.
8. **One secret, and check the `role` claim.** Sign and verify with `JWT_SECRET`. The web
   repo's `proxy.ts` currently verifies user tokens with `ADMIN_JWT_SECRET` and never checks
   `role`; both sides get fixed together.

## Commands

```bash
pnpm dev                  # wrangler dev on :4000, local D1/R2 + remote Workers AI
pnpm typecheck            # THE TypeScript gate — see below. Not `tsc --noEmit`.
pnpm typecheck --update   # re-record the generated baseline (read the diff!)
pnpm db:generate          # prisma generate — regenerates client + routers + guard
pnpm db:migrate:local     # wrangler d1 migrations apply vocab --local
pnpm db:migrate:new       # prisma migrate diff -> SQL for a new migrations/ file
pnpm db:seed:dev          # rebuild + load the real Oxford data from data/vocab_review.csv
pnpm db:seed:e2e          # regenerate seed/e2e.sql (committed; e2e asserts on its bytes)

# Content pipeline. All need a running API and ADMIN_PASSWORD, and all are resumable —
# each only touches rows that are still empty, so an interrupted run is restarted.
pnpm qa:thai              # flag OCR damage into the /admin/review queue
pnpm gen:audio            # Workers AI TTS -> R2, one clip at a time
pnpm gen:examples         # example sentences, drafted by a local Ollama model
pnpm gen:pos-usages       # one sentence per part of speech, for the 260 multi-sense words
pnpm import:wordlist      # CSV -> a new, unpublished list of draft words
```

**`pnpm dev` deliberately omits `--local`.** That flag means "run locally *with remote
bindings disabled*", and Workers AI has no local simulator: with it, `env.AI` is reported
`not supported` and the TTS route answers 503. Without it, the default local runtime still
serves D1 and R2 from `.wrangler/state` — only the AI binding (`remote: true`) leaves the
machine. The e2e launcher keeps `--local` on purpose: a test gate must never reach a billed
model.

Two databases, deliberately separate: `.wrangler/state` (dev, real content) and
`.wrangler/e2e-state` (wiped and reseeded on every e2e run). The e2e stack runs on :4100
so it can never reach the dev one.

**`pnpm exec tsc --noEmit` is red and always has been — use `pnpm typecheck`.**
`tsconfig.json` includes only `src/**/*.ts`, but `src` imports the committed
`prisma/generated/` tree, so TypeScript checks that too and it does not compile: 133 errors,
none of them in application code. 111 are `TS2345` across the three generated routers, and
81 of those carry one message — `HandlerContext` declares `prisma` optional while
`Context<HonoEnv>` requires it, both generated types. Most of the rest come from
`routeConfig.ts` and `routeConfig.target.ts` exporting two incompatible `RouteConfig` types.
Fixing it means changing or upgrading `prisma-generator-express`.

`pnpm typecheck` is the honest gate: **any** error in `src/` fails, and the generated
diagnostics are pinned to a **multiset** — how many of each error code and complete
normalised diagnostic message (including nested overload details), in each file
(`scripts/generated-typecheck-baseline.json`). Not a total: a count alone would let a
regeneration remove one known error and introduce a different one somewhere else and still
read as 133. A swap shows up as one entry going to zero and another appearing, and both are
named in the failure. Line numbers are excluded on purpose, since they move on any
regeneration.

After a deliberate generator change, re-record with `pnpm typecheck --update` and **read the
diff before committing it** — never re-record to make a run pass. It is what CI and the
release checklist should run. Read the raw list with `pnpm exec tsc --noEmit`.

**Do not run `prisma migrate dev` or `prisma migrate deploy` against D1.** Prisma's
documented D1 workflow is `wrangler d1 migrations create` + `prisma migrate diff` +
`wrangler d1 migrations apply` — wrangler owns migration state, not Prisma's
`_prisma_migrations` table. The existing `prisma/migrations/` history was authored the old
way against local SQLite and needs reconciling before the first D1 deploy.

**Before the first regeneration:** `schema.prisma` sets the express generator's
`output = "../src/generated/api"`, but `src/index.ts` imports from
`../prisma/generated/express/…` and `src/generated/` does not exist. Running
`pnpm db:generate` today writes a new tree and leaves four imports dangling. Fix the output
path to match the imports (or vice versa) first.

## Content pipeline

`scripts/` holds the Oxford 3000 extraction, the Thai import, and the CSV review
round-trip.

Two datasets exist and **do not join**: `data/vocab_review.csv` (3,752 rows,
`oxford-3000-american`, 3,546 with cleaned Thai meanings) and the web repo's
`data/oxford-3000-seed.json` (3,298 rows, `oxford-3000`, 20 with meanings). Different
`sourceKey` schemes, different level assignments. Choosing the canonical one is a blocker,
not a detail — see `docs/SPEC.md` §4.4.

Most of that row-count gap was never a content difference. The CSV carries **one row per
(word, part of speech)** — `about` appears as `prep.` and again as `adv.`, with identical
Thai — while the JSON already joins them (`"prep., adv."`). `generate-dev-seed.mjs` now
merges them on import, so the seeded database holds **3,295 words**, and units are
recomputed over the merged list rather than inherited (22 groups straddled a boundary).
Measured before the change: of the 436 collapsing groups, zero disagreed on `meaningTh`
and zero on `pronunciationTh`.

Curation state lives on the row (`reviewState`, `reviewFlags`) and is **wiped by
`pnpm db:seed:dev`**, which rebuilds `VocabWord` from the CSV. Re-run `pnpm qa:thai` after
any reseed, or the review queue reports an empty backlog it has simply forgotten about.

De-spacing is essentially done (4 rows still show `"ล ะ ท ิ ้ ง"`-style spacing).
Character accuracy is **not** verified — `"ความสามารถึง"` (should be `ความสามารถ`) survives
cleaning. The remaining job is proofreading, not reprocessing. A word only reaches
`status: "published"` with a verified meaning, pronunciation, example, and generated audio.
**Nothing in either dataset is `published` today**, which is why the app renders empty.

## Deploy order

Deploy this Worker **before** the web Worker on any schema change, then bump the submodule
pointer in the web repo. The web repo generates its types from this API's OpenAPI output
(`GET /{model}/openapi.json`).
