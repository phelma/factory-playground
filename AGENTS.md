# Factory playground

A small todo app used as a testing ground for an automated coding agent. It is disposable: nothing here is production code.

## Stack

- `src/client/`: React 19 front end served by Vite. `App.tsx` is the whole UI; `api.ts` wraps the HTTP calls.
- `src/server/`: Hono API on Node. `app.ts` defines the routes, `db.ts` opens the SQLite database using the built-in `node:sqlite` module, `index.ts` starts the server.
- `src/shared/`: types and pure functions used by both sides.
- TypeScript everywhere, vitest for tests, eslint for lint. Node 24 or newer is required.

## Run

```sh
npm ci
npm run dev        # API on :3000 and Vite on :5173, with /api proxied
```

The database file is `data/todos.db`. Delete it to start clean. Set `DATABASE_PATH=:memory:` for a throwaway database.

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
