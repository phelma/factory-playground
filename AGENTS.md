# Factory playground

A small todo app used as a testing ground for an automated coding agent. It is disposable: nothing here is production code.

## Stack

- `src/client/`: React 19 front end served by Vite. `App.tsx` is the whole UI; `api.ts` wraps the HTTP calls.
- `src/server/`: Hono API on Cloudflare Workers. `app.ts` defines the routes, `store.ts` implements the D1 Todo store, `worker.ts` is the fetch entry bound to `DB`.
- `src/shared/`: types and pure functions used by both sides.
- TypeScript everywhere, vitest for tests, eslint for lint. Node 24 or newer is required.

## Run

```sh
npm ci
npm run dev        # builds the client, applies local store migrations, then serves the full app (client + API) on http://localhost:8787 against a simulated local D1 store
```

Local development needs no secrets (see `.dev.vars.example`). Production
deploys happen on pushes to `main`: checks run first, then remote D1
migrations are applied, then the Worker is deployed, using the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` CI secrets.

See `docs/domain.md` for the domain language and
`docs/adr-001-workers-d1.md` for the hosting plus store decision.

## Test and check

```sh
npm test             # vitest
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run check        # all three
```

CI runs lint, typecheck, tests, and the web build on every pull request, and `main` is protected so CI must pass before merging. Pushes to `main` then apply the remote D1 migrations and deploy the Worker to the public URL.

## Conventions

- Unit tests sit beside the code as `*.test.ts`. API tests call the Hono app directly with `app.request()`; no server is started.
- Add or update a test for every behaviour change. Keep pure logic in `src/shared/` so it can be tested without the database.
- Work on a branch, open a pull request that references the issue, and keep the pull request to the scope of the issue.
- Run `npm run check` before pushing.
