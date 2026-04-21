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
npm run test:tools
npm run validate:approval-runtime
npm run validate:agent-runtime
npm run validate:job-runner
npm run validate:observability
npm run validate:store
npm run validate:tools
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
- `src/tools/` - typed backend-owned tool contracts, execution policy, and constrained side-effect adapters
- `src/workspace/` - repo-bound file contract helpers and guarded read/write logic
- `src/prompt/` - prompt source ordering, cache, composition, and loader logic

When you are working from the repo root, the corresponding aliases are
`npm run app:api:dev`, `npm run app:api:serve`, `npm run app:api:build`,
`npm run app:api:test:runtime`, `npm run app:api:test:agent-runtime`,
`npm run app:api:test:approval-runtime`, `npm run app:api:test:observability`,
`npm run app:api:test:job-runner`, `npm run app:api:test:store`,
`npm run app:api:test:tools`,
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

## Tools

- `src/tools/tool-registry.ts` owns duplicate-safe tool registration and the
  deterministic backend tool catalog.
- `src/tools/tool-execution-service.ts` validates tool input, enforces
  declared script and workspace-mutation permissions, requests approval when
  policy requires it, and emits metadata-only lifecycle events.
- `src/tools/script-execution-adapter.ts` wraps allowlisted repo script
  dispatch with bounded cwd, environment, timeout, and retry behavior.
- `src/tools/workspace-mutation-adapter.ts` authorizes explicit user-layer or
  app-layer mutation targets at the workspace boundary before writing
  atomically.
- `src/runtime/service-container.ts` exposes one cached tools surface so
  workflow tools reuse shared workspace, approval-runtime, and observability
  services instead of creating another execution path.

### Default Tool Suite

- `inspect-startup-diagnostics` exposes startup readiness, prompt metadata,
  missing startup files, and workspace write boundaries without mutating the
  repo.
- `inspect-prompt-contract` exposes prompt source order and workflow route
  metadata for one workflow or the full supported set.
- `inspect-required-workspace-files` reports startup-critical and repairable
  repo surfaces in canonical path order.
- `summarize-profile-sources` projects `config/profile.yml`,
  `config/portals.yml`, CV, and article-digest data into a deterministic
  settings summary with legacy `cv.md` and `article-digest.md` fallback.
- `list-workspace-artifacts` lists top-level `reports/`, `output/`, and `jds/`
  entries with bounded offset and limit pagination.
- `summarize-workflow-support` verifies that prompt-routed workflow mode files
  still exist at their declared paths.
- `preview-onboarding-repair` shows which onboarding files can be created from
  checked-in templates.
- `repair-onboarding-files` maps missing onboarding files to checked-in
  templates and the tracker skeleton through the guarded mutation path.
- `extract-ats-job` wraps the allowlisted ATS extractor and returns either a
  normalized intake payload or an explicit `unsupported-ats` state.
- `normalize-raw-job-description` converts pasted JD text into the shared
  evaluation input shape without script dispatch.
- `bootstrap-single-evaluation` and `bootstrap-auto-pipeline` reuse the
  authenticated agent runtime and return typed readiness states such as
  `auth-required`, `prompt-missing`, or `ready`.
- `reserve-report-artifact` allocates the next canonical report path through
  `.jobhunt-app/report-reservations/` before later writes target `reports/`.
- `write-report-artifact` writes the reserved report file and marks the
  reservation as written instead of reusing raw shell writes.
- `list-evaluation-artifacts` paginates `reports/` and `output/` entries in
  deterministic repo-relative order.
- `generate-ats-pdf` validates that output stays inside `output/`, rejects
  collisions, and wraps the checked-in Playwright PDF generator.
- `stage-tracker-addition` writes exactly one TSV row into
  `batch/tracker-additions/` and rejects non-canonical status labels.
- `merge-tracker-additions`, `verify-tracker-pipeline`,
  `normalize-tracker-statuses`, and `dedup-tracker-entries` expose the tracker
  closeout scripts with structured warning propagation.

### Evaluation And Tracker Boundaries

- Report reservations live in `.jobhunt-app/report-reservations/`; the user
  report is only written once a reservation is consumed by
  `write-report-artifact`.
- Report writes are limited to `reports/`, PDF writes are limited to `output/`,
  and staged tracker rows are limited to `batch/tracker-additions/`.
- Tracker closeout still follows the repo contract: stage TSV -> merge ->
  verify, with normalize or dedup available only as explicit cleanup steps.
- Session 03 tool warnings come from repo-script warning lines, but
  observability remains metadata-only and never persists raw prompt text,
  report bodies, or PDF bytes.

### Repair Boundaries

- Onboarding repair is limited to `config/profile.yml`, `config/portals.yml`,
  `profile/cv.md`, `modes/_profile.md`, and `data/applications.md`.
- Repair sources are the checked-in repo templates:
  `config/profile.example.yml`, `config/portals.example.yml`,
  `profile/cv.example.md`, `modes/_profile.template.md`, and
  `data/applications.example.md`.
- Repair preview stays read-only.
- Repair execution refuses to overwrite existing user files, including the
  accepted legacy `cv.md` fallback.
- Multi-file repair uses best-effort rollback if a later write fails after
  earlier files were created.

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
npm run app:api:test:tools
npm run app:api:build
npm run app:boot:test
```

## Related Docs

- [Architecture](../../docs/ARCHITECTURE.md)
- [Development](../../docs/development.md)
- [Setup Guide](../../docs/SETUP.md)
