# Factory playground

A small todo app used as a testing ground for an automated coding agent. It is disposable: nothing here is production code.

## Stack

- `src/client/`: React 19 front end served by Vite. `App.tsx` is the whole UI; `api.ts` wraps the HTTP calls.
- `src/server/`: Hono API on Cloudflare Workers. `app.ts` defines the routes, `store.ts` accesses the D1 Todo store bound as `DB`, `worker.ts` is the fetch entry.
- `src/shared/`: types and pure functions used by both sides.
- TypeScript everywhere, vitest for tests, eslint for lint. Node 24 or newer is required. Cloudflare deploys the Worker plus the built client from `dist/` as static assets on one origin.

## Run

```sh
npm ci
npm run dev        # Vite on :5173 and Worker on :8787, with /api proxied
```

Local development runs against a simulated local D1 store (migrations in `migrations/` are applied automatically by `wrangler dev`). Production uses the managed D1 database bound as `DB`; pushes to `main` migrate the remote store then deploy via GitHub Actions (requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets).

## Test and check

```sh
npm test             # vitest
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run check        # all three
```

CI runs the same three commands plus `npm run build` on every pull request, and `main` is protected so CI must pass before merging.

## Conventions

- Unit tests sit beside the code as `*.test.ts`. API tests call the Hono app directly with `app.request()`; no server is started.
- Add or update a test for every behaviour change. Keep pure logic in `src/shared/` so it can be tested without the database.
- Work on a branch, open a pull request that references the issue, and keep the pull request to the scope of the issue.
- Run `npm run check` before pushing.
