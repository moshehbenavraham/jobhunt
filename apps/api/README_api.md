# API

The API package owns the local app runtime for Job-Hunt. It provides the
one-shot diagnostics entrypoint, the long-lived boot server, the workspace
adapter, the prompt-loading contract used by the app shell, onboarding repair
summary and mutation routes, approval inbox routes, settings routes, and the
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
npm run test:orchestration
npm run test:runtime-contract
npm run test:prompt-contract
npm run test:store-contract
npm run test:tools
npm run validate:approval-runtime
npm run validate:agent-runtime
npm run validate:job-runner
npm run validate:observability
npm run validate:runtime
npm run validate:store
npm run validate:tools
```

## What Lives Here

- `src/index.ts` - one-shot diagnostics and the shared startup-diagnostics service
- `src/runtime/` - validated runtime config and the package service container
- `src/agent-runtime/` - typed auth readiness, provider bridge, and prompt bootstrap service
- `src/approval-runtime/` - persisted approval creation, resolution, and pending-approval summaries
- `src/server/` - HTTP routes for startup, onboarding, approvals, settings, and workflow surfaces
- `src/job-runner/` - durable queueing, checkpoint recovery, executor registry, and service tests
- `src/observability/` - redacted runtime event writes and bounded diagnostics summaries
- `src/orchestration/` - workflow routing, specialist topology, session reuse, and typed orchestration handoff envelopes
- `src/server/index.ts` - the long-lived HTTP runtime entrypoint
- `src/store/` - SQLite-backed operational store for sessions, jobs, approvals, run metadata, and runtime events
- `src/server/routes/` - registry-backed HTTP route modules
- `src/tools/` - typed backend-owned tool contracts, execution policy, and constrained side-effect adapters
- `src/workspace/` - repo-bound file contract helpers and guarded read/write logic
- `src/prompt/` - prompt source ordering, cache, composition, and loader logic

## HTTP Surfaces

- `/startup` and `/health` expose the startup diagnostics and runtime health
  contract.
- `/onboarding` and `/onboarding/repair` expose the missing-file summary and
  template-backed repair flow.
- `/approvals` exposes the approval inbox and approve/reject mutations.
- `/settings` exposes maintenance commands, updater state, and bounded
  workspace previews.
- Workflow bootstrap routes expose the app-owned launch and resume helpers for
  the operator shell.

When you are working from the repo root, the corresponding aliases are
`npm run app:api:dev`, `npm run app:api:serve`, `npm run app:api:build`,
`npm run app:api:test:runtime`, `npm run app:api:test:agent-runtime`,
`npm run app:api:test:approval-runtime`, `npm run app:api:test:observability`,
`npm run app:api:test:job-runner`, `npm run app:api:test:store`,
`npm run app:api:test:tools`,
`npm run app:check`, and `npm run app:boot:test`.

## Orchestration

- `src/orchestration/specialist-catalog.ts` owns the checked-in workflow to
  specialist mapping and marks partial workflows as deterministic
  `tooling-gap` outcomes instead of free-form fallbacks.
- `src/orchestration/tool-scope.ts` reduces the shared tool registry to the
  selected specialist's allowed or restricted catalog before the caller sees
  it.
- `src/orchestration/workflow-router.ts` resolves launch vs resume requests,
  session reuse, and unsupported workflow classification without prompt-side
  branching.
- `src/orchestration/orchestration-service.ts` composes routing, session
  lifecycle, prompt bootstrap metadata, scoped tools, and active job or
  approval summaries into one backend-owned handoff envelope.
- `src/runtime/service-container.ts` exposes one cached orchestration service
  that reuses the shared agent-runtime, store, and tool execution surfaces.

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
- `src/job-runner/workflow-job-contract.ts` defines the typed payload and
  result contracts for `scan-portals`, `process-pipeline`, and
  `batch-evaluation`.
- `src/job-runner/workflow-job-executors.ts` wraps the repo-owned scan,
  pipeline, and batch flows in checkpointed durable executors instead of
  exposing raw shell orchestration to later phases.
- `src/runtime/service-container.ts` exposes one cached durable job-runner
  instance plus shared approval-runtime and observability services.
- `src/orchestration/orchestration-service.ts` returns only prompt metadata and
  specialist-scoped tool catalogs; it does not persist raw prompt text, source
  contents, or live provider handles in the store.
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
  policy requires it, emits metadata-only lifecycle events, and lets selected
  tools enqueue durable jobs through the shared runner.
- `src/tools/script-execution-adapter.ts` wraps allowlisted repo script
  dispatch with bounded cwd, environment, timeout, and retry behavior.
- `src/tools/workspace-mutation-adapter.ts` authorizes explicit user-layer or
  app-layer mutation targets at the workspace boundary before writing
  atomically.
- `src/runtime/service-container.ts` exposes one cached tools surface so
  workflow tools reuse shared workspace, approval-runtime, durable-job-runner,
  and observability services instead of creating another execution path.

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
- `check-job-liveness` and `check-job-liveness-batch` wrap the allowlisted
  Playwright liveness script and return typed `ready`, `empty`, `offline`, or
  `error` states instead of raw stdout.
- `enqueue-portal-scan` starts a durable `scan-portals` job with duplicate
  suppression while an identical scan is still live.
- `enqueue-pipeline-processing` normalizes pending, first, or selected-URL
  queue intent and enqueues the durable `process-pipeline` workflow.
- `start-batch-evaluation`, `retry-batch-evaluation-failures`, and
  `dry-run-batch-evaluation` expose the batch runner semantics through the
  durable `batch-evaluation` workflow instead of shell-first orchestration.
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
- Session 04 workflow executors checkpoint only typed progress summaries,
  warnings, and per-item status metadata; they do not persist raw JD text,
  prompt bodies, or report contents in the operational store.

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
