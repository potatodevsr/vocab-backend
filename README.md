# Vocab Learning API

The Cloudflare-native API behind [Vocab Learning](https://github.com/potatodevsr/vocab-learning-app), a bilingual Thai vocabulary platform built around familiar Oxford 3000 English prompts.

The API owns authentication, vocabulary delivery, learning sessions, quizzes, progress, mastery, and review scheduling. It runs independently from the Next.js web application and is consumed through a Cloudflare service binding.

## Architecture

```text
Browser
  │ same-origin /api/*
  ▼
Next.js web Worker
  │ Cloudflare service binding
  ▼
Hono API Worker
  ├── Prisma Guard — authorization and response shapes
  ├── Prisma D1 adapter — typed data access
  └── Cloudflare D1 — users, vocabulary, sessions, and progress
```

This boundary keeps browser requests first-party, avoids production CORS, and lets the web and API deploy independently.

## Responsibilities

- Password, magic-link, and Google authentication
- JWT sessions in secure HTTP-only cookies
- Oxford 3000 vocabulary and Thai learning content
- Unit lessons, practice sessions, quizzes, and checkpoints
- Server-authoritative progress, mastery, streak, and reward updates
- Per-user authorization enforced through guarded data shapes
- Idempotent learning mutations designed for Cloudflare D1

## Stack

| Area | Technology |
| --- | --- |
| Runtime | Cloudflare Workers |
| HTTP | Hono |
| Database | Cloudflare D1 |
| Data access | Prisma 7 with `@prisma/adapter-d1` |
| Authorization | `prisma-guard` |
| Validation | Zod |
| Authentication | JOSE, WebCrypto, OAuth 2.0 with PKCE |

## Run locally

### Prerequisites

- Node.js 20 or newer
- pnpm 10 or newer

### Install and prepare D1

```bash
pnpm install
pnpm db:migrate:local
pnpm db:seed:dev
```

### Start the Worker

```bash
pnpm dev
```

The API starts at `http://localhost:4000`; its health endpoint is available at
`http://localhost:4000/health`. Local Wrangler state is isolated from production data.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the API Worker locally on port 4000 |
| `pnpm db:generate` | Regenerate Prisma clients, routes, and guard output |
| `pnpm db:migrate:local` | Apply D1 migrations locally |
| `pnpm db:seed:dev` | Rebuild and load development vocabulary data |
| `pnpm db:seed:e2e` | Regenerate the deterministic end-to-end seed |

## Repository structure

```text
src/          Hono entry point and hand-written domain routes
prisma/       Schema and generated guarded routers
migrations/   Cloudflare D1 migration history
scripts/      Vocabulary processing and seed generation
seed/         Deterministic local and end-to-end fixtures
data/         Reviewed vocabulary source data
```

## Security model

Clients report learning events; they never choose user IDs, XP awards, scores, or mastery values. The Worker derives identity from the signed session, applies explicit guard shapes to generated operations, and keeps gameplay mutations in reviewed hand-written routes.

Never commit `.dev.vars`, API keys, signing secrets, OAuth credentials, or production learner data.

## Related project

- [Web application](https://github.com/potatodevsr/vocab-learning-app)
- [Live product](https://vocab-learning-app.hoshiku1997.workers.dev)
