# API

The API package owns the local app runtime for Job-Hunt. It provides the
one-shot diagnostics entrypoint, the long-lived boot server, the workspace
adapter, the prompt-loading contract used by the app shell, and the
authenticated agent-runtime bootstrap plus the durable job-runner surface used
by later runner and tool work.

## Quick Start

```bash
npm run dev
npm run serve:runtime
npm run build
npm run check
npm run test:approval-runtime
npm run test:agent-runtime
npm run test:job-runner
npm run test:observability
npm run test:runtime-contract
npm run test:prompt-contract
npm run test:store-contract
npm run validate:approval-runtime
npm run validate:agent-runtime
npm run validate:job-runner
npm run validate:observability
npm run validate:store
```

## What Lives Here

- `src/index.ts` - one-shot diagnostics and the shared startup-diagnostics service
- `src/runtime/` - validated runtime config and the package service container
- `src/agent-runtime/` - typed auth readiness, provider bridge, and prompt bootstrap service
- `src/approval-runtime/` - persisted approval creation, resolution, and pending-approval summaries
- `src/job-runner/` - durable queueing, checkpoint recovery, executor registry, and service tests
- `src/observability/` - redacted runtime event writes and bounded diagnostics summaries
- `src/server/index.ts` - the long-lived HTTP runtime entrypoint
- `src/store/` - SQLite-backed operational store for sessions, jobs, approvals, run metadata, and runtime events
- `src/server/routes/` - registry-backed HTTP route modules
- `src/workspace/` - repo-bound file contract helpers and guarded read/write logic
- `src/prompt/` - prompt source ordering, cache, composition, and loader logic

When you are working from the repo root, the corresponding aliases are
`npm run app:api:dev`, `npm run app:api:serve`, `npm run app:api:build`,
`npm run app:api:test:runtime`, `npm run app:api:test:agent-runtime`,
`npm run app:api:test:approval-runtime`, `npm run app:api:test:observability`,
`npm run app:api:test:job-runner`, `npm run app:api:test:store`,
`npm run app:check`, and `npm run app:boot:test`.

## Runtime Boundaries

- The package reads the checked-in repo contract first and does not own user
  data.
- App-owned runtime state lives in `.jobhunt-app/`.
- The operational SQLite database lives at `.jobhunt-app/app.db`.
- App startup must not mutate `profile/`, `config/`, `data/`, `reports/`,
  `output/`, `interview-prep/`, or `jds/`.
- Store inspection stays read-only on `/health` and `/startup`; only explicit
  store initialization paths create `.jobhunt-app/app.db`.
- Agent-runtime readiness is separate from boot readiness. `/health` and
  `/startup` may stay available while stored OpenAI account auth is missing,
  invalid, or expired.

## Agent Runtime

- `src/agent-runtime/openai-account-provider.ts` owns the typed bridge to the
  repo-owned `scripts/lib/openai-account-auth/` stack.
- `src/agent-runtime/agent-runtime-service.ts` owns prompt-bundle loading,
  auth readiness inspection, and provider bootstrap for later sessions.
- Startup diagnostics expose `agentRuntime` readiness plus current session
  metadata without refreshing credentials or making backend requests.
- Use `JOBHUNT_API_OPENAI_AUTH_PATH`, `JOBHUNT_API_OPENAI_BASE_URL`,
  `JOBHUNT_API_OPENAI_ORIGINATOR`, and `JOBHUNT_API_OPENAI_MODEL` when you
  need deterministic test fixtures or backend overrides.

## Durable Job Runner

- `src/job-runner/job-runner-service.ts` owns durable enqueue, claim,
  heartbeat, checkpoint, and retry flows for app-owned jobs.
- Approval pauses reuse the durable `waiting` state with explicit
  `waitReason: 'approval'` metadata instead of introducing a second worker loop.
- `src/job-runner/job-runner-executors.ts` validates payloads against the
  registered executor schemas before a job runs.
- `src/runtime/service-container.ts` exposes one cached durable job-runner
  instance plus shared approval-runtime and observability services.
- Recovery state stays in `.jobhunt-app/app.db`; checkpoint progress is stored
  in `runtime_run_metadata`, and lease plus retry state is stored in
  `runtime_jobs`.

## Approval Runtime

- `src/approval-runtime/approval-runtime-service.ts` owns idempotent approval
  creation, pending-summary reads, and approve or reject transitions for
  waiting jobs.
- Pending approvals are stored in `runtime_approvals` with trace ids that
  correlate back to jobs, sessions, and event-log entries.
- Approval resolution updates both the approval record and the waiting job
  state, then re-synchronizes the owning session status.

## Observability

- `src/observability/observability-service.ts` records metadata-only runtime
  events without forcing store initialization when `.jobhunt-app/app.db` does
  not exist yet.
- Sensitive metadata keys such as `prompt`, `body`, `stdout`, and
  `transcript` are redacted before persistence.
- Failed-run diagnostics are derived from structured `job-failed` events and
  recent correlated event history in `runtime_events`.

## Current Routes

- `GET` and `HEAD` `/health` - health summary for runtime readiness
- `GET` and `HEAD` `/startup` - full startup diagnostics payload
- `GET` and `HEAD` `/runtime/approvals` - pending approval summaries with
  optional `sessionId` and `limit` filters
- `GET` and `HEAD` `/runtime/diagnostics` - failed-run summaries plus recent
  runtime events with optional `jobId`, `requestId`, `sessionId`, `traceId`,
  and `limit` filters

## Smoke Path

From the repo root, the runtime validation path is:

```bash
npm run app:api:test:runtime
npm run app:api:test:agent-runtime
npm run app:api:test:approval-runtime
npm run app:api:test:observability
npm run app:api:test:job-runner
npm run app:api:test:store
npm run app:api:build
npm run app:boot:test
```

## Related Docs

- [Architecture](../../docs/ARCHITECTURE.md)
- [Development](../../docs/development.md)
- [Setup Guide](../../docs/SETUP.md)
