# API

The API package owns the local app runtime for Job-Hunt. It provides the
one-shot diagnostics entrypoint, the long-lived boot server, the workspace
adapter, and the prompt-loading contract used by the app shell.

## Quick Start

```bash
npm run dev
npm run serve:runtime
npm run build
npm run check
npm run test:runtime-contract
npm run test:prompt-contract
npm run test:store-contract
npm run validate:store
```

## What Lives Here

- `src/index.ts` - one-shot diagnostics and the shared startup-diagnostics service
- `src/runtime/` - validated runtime config and the package service container
- `src/server/index.ts` - the long-lived HTTP runtime entrypoint
- `src/store/` - SQLite-backed operational store for sessions, jobs, approvals, and run metadata
- `src/server/routes/` - registry-backed HTTP route modules
- `src/workspace/` - repo-bound file contract helpers and guarded read/write logic
- `src/prompt/` - prompt source ordering, cache, composition, and loader logic

When you are working from the repo root, the corresponding aliases are
`npm run app:api:dev`, `npm run app:api:serve`, `npm run app:api:build`,
`npm run app:api:test:runtime`, `npm run app:api:test:store`, `npm run app:check`, and
`npm run app:boot:test`.

## Runtime Boundaries

- The package reads the checked-in repo contract first and does not own user
  data.
- App-owned runtime state lives in `.jobhunt-app/`.
- The operational SQLite database lives at `.jobhunt-app/app.db`.
- App startup must not mutate `profile/`, `config/`, `data/`, `reports/`,
  `output/`, `interview-prep/`, or `jds/`.
- Store inspection stays read-only on `/health` and `/startup`; only explicit
  store initialization paths create `.jobhunt-app/app.db`.

## Current Routes

- `GET` and `HEAD` `/health` - health summary for runtime readiness
- `GET` and `HEAD` `/startup` - full startup diagnostics payload

## Smoke Path

From the repo root, the runtime validation path is:

```bash
npm run app:api:test:runtime
npm run app:api:test:store
npm run app:api:build
npm run app:boot:test
```

## Related Docs

- [Architecture](../../docs/ARCHITECTURE.md)
- [Development](../../docs/development.md)
- [Setup Guide](../../docs/SETUP.md)
