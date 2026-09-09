# factory-playground

A disposable todo app that exists so an automated coding agent has something real to work on. Issues here are seeded on purpose; pull requests are opened by a bot. Expect it to be deleted.

See [AGENTS.md](AGENTS.md) for how to run and test it.

## Run locally

```sh
npm ci
npm run dev    # builds the client, applies migrations to the simulated local
               # store (confirm once when prompted), then serves the full app
               # (client + API) on http://localhost:8787
```

No local secrets are needed; see [.dev.vars.example](.dev.vars.example). The
simulated store is local-only — production data is never touched.

## Deploy

Pushes to `main` deploy automatically: the check workflow (lint, typecheck,
tests, web build) runs first, then the deploy job applies the versioned store
migrations to the remote D1 database
(`wrangler d1 migrations apply factory-playground-todos --remote`) and
deploys the Worker (`wrangler deploy`) to the public `workers.dev` URL.

Production credentials live in GitHub Actions secrets and never in the repo:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Provision the D1 database once with
`wrangler d1 create factory-playground-todos` and put the resulting id in
`wrangler.toml`.

See [docs/domain.md](docs/domain.md) for the domain language and
[docs/adr-001-workers-d1.md](docs/adr-001-workers-d1.md) for why the app is
hosted on Cloudflare Workers with a D1 store.
