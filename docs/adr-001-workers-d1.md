# ADR 001: Host on Cloudflare Workers with a D1 Todo store

Status: accepted.

## Context

The todo app ran as two local dev processes (a Node API backed by a
process-disk SQLite file plus a Vite web server) with no public URL. Todos
lived in `data/todos.db`, so a fresh machine lost them and no live demo could
be shared. We needed one public URL serving client and API, a durable store
shared across visitors and redeploys, push-to-live deploys, and local
development that does not touch production data.

## Decision

- **Hosting**: Cloudflare Workers. A single Worker serves the built web client
  and the Todo API from one `workers.dev` URL. Unmatched non-API routes serve
  the client with single-page-application fallback; `/api/*` routes always run
  the Worker first. Static handling uses the platform's static-assets
  mechanism (`[assets]` in `wrangler.toml`), not serving from process disk.
- **Store**: Cloudflare D1, bound into the Worker request environment as `DB`.
  All store access is asynchronous per request. Schema travels as versioned
  migrations in `migrations/`, applied to the simulated store locally and to
  the remote store during deploy.
- **Pipeline**: GitHub Actions stays the deploy runner. The existing check
  workflow (lint, typecheck, tests, web build) gates every change; a deploy
  job on pushes to the default branch then applies remote store migrations
  (`wrangler d1 migrations apply --remote`) and deploys the Worker. Production
  credentials (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) live in CI
  secrets, never in the repo.
- **Local parity**: `npm run dev` builds the client and runs `wrangler dev`,
  which serves the full app against a simulated local D1 store. No local
  secrets are needed.

## Alternatives considered

- **Keep the file database** (local SQLite on process disk): surprising fit at
  first glance because it is already there and zero-ops, but it cannot survive
  a redeploy or a fresh machine, is not shared between visitors, and Workers
  have no process disk to serve it from. Discarded; the existing local file is
  not imported and the demo starts from an empty managed store.
- **Fly.io with SQLite/LiteFS**: genuine alternative — keeps SQLite semantics
  with durable volumes and replication. Rejected: heavier operational surface
  (volumes, regions, process supervision) for a disposable demo, and still two
  things to run instead of one unit.
- **Render with Postgres or disk**: genuine alternative — managed Postgres is
  familiar and durable. Rejected: splits hosting from the store, needs
  connection management and CORS between client and API origins, and costs
  more idle machinery than a single Worker unit.

## Consequences

- **Managed lock-in**: we depend on Workers static assets, D1 bindings, and
  the Wrangler toolchain. Moving off means re-platforming hosting and the
  store together.
- The Node listen-and-serve entry (`src/server/index.ts`) and the
  process-disk database module (`src/server/db.ts`) are gone; environment
  access is via Worker bindings, so the old port/production-flag branching
  and `DATABASE_PATH` handling no longer exist.
- Demos survive shipping: todos persist across redeploys and are visible to
  all visitors of the shared store. Local iteration stays hermetic via the
  simulated store.
- No custom domain yet (ships on `workers.dev`; DNS-only change later) and no
  access control (open write stays).
