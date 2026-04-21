# Session Specification

**Session ID**: `phase01-session05-approval-and-observability-contract`
**Phase**: 01 - Backend Runtime and Job Infrastructure
**Status**: Not Started
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 01 already has the API runtime, SQLite operational store, authenticated
agent bootstrap, and durable job runner. The last missing backend contract in
this phase is the layer that can pause work for human approval and expose
structured diagnostics without forcing the operator to inspect raw stdout or
infer state from incomplete job rows.

This session adds approval-aware waiting semantics on top of the durable
runner, a package-local approval service, and a structured observability path
for HTTP requests, jobs, sessions, and approvals. The design should keep
state inside `apps/api` and `.jobhunt-app/app.db`, reuse the existing store,
job-runner, and route registry boundaries, and record metadata-only events so
later phases can build approvals UX and tool orchestration on an inspectable
backend contract.

This is the correct next session because the authoritative analyzer reports
Session 05 as the only incomplete candidate in Phase 01, and the phase PRD
explicitly calls for resumable approvals plus logs and traces that make
failures inspectable without stdout scraping. Completing it now closes the
backend-runtime phase and gives Phase 02 one stable contract for pausing,
resuming, rejecting, and inspecting app-owned work.

---

## 2. Objectives

1. Create a backend-owned approval contract that can persist pending approvals,
   resume approved jobs, and reject blocked jobs through durable state.
2. Extend the durable runner and store surfaces with approval-linked waiting
   semantics plus traceable correlation metadata for sessions, jobs, and
   approvals.
3. Add a structured observability pipeline that records bounded metadata-only
   runtime events and exposes diagnostics for pending approvals and failed
   runs.
4. Add deterministic validation coverage for approval pause, approval resume,
   rejection, and diagnostics retrieval paths.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session02-sqlite-operational-store` - provides the SQLite
      schema, repository layer, and app-owned persistence boundary this
      session must extend.
- [x] `phase01-session04-durable-job-runner` - provides durable enqueue,
      checkpoint, retry, and recovery behavior that approval pauses must build
      on instead of replacing.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic TypeScript Node structure,
  repo validation, and machine-readable output expectations
- `.spec_system/CONSIDERATIONS.md` for read-first diagnostics, registry-first
  ownership, and no-stdout-scraping guidance
- Existing runtime modules in `apps/api/src/job-runner/`, `apps/api/src/store/`,
  `apps/api/src/runtime/`, and `apps/api/src/server/`
- Existing repo validation entrypoints such as `npm run app:api:build` and
  `node scripts/test-all.mjs --quick`

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- SQLite access through the existing `node:sqlite` operational-store layer
- Write access limited to `.jobhunt-app/` for runtime metadata and event logs
- Deterministic local HTTP tests available through the API package test suite

---

## 4. Scope

### In Scope (MVP)

- Backend runtime can persist pending approvals, correlate them to sessions,
  jobs, and trace identifiers, and resolve them through approve or reject
  transitions.
- Durable job execution can pause for approval using explicit waiting
  semantics, then resume or fail deterministically after the approval
  decision.
- Backend runtime can record structured metadata-only events for HTTP
  requests, job transitions, approval actions, and failure summaries without
  relying on stdout scraping.
- Operator can inspect pending approvals and failed or waiting runtime work
  through dedicated backend diagnostics routes or service summaries with
  bounded ordering and filters.

### Out of Scope (Deferred)

- Approval UI flows, chat affordances, or operator-facing interaction design -
  *Reason: Phase 03 owns the approvals user experience.*
- Tool-wrapper implementation and workflow-specific approval policies -
  *Reason: Phase 02 and later workflow phases own typed tool orchestration and
  policy details.*
- Logging raw prompt bodies, user-layer content, or model transcripts -
  *Reason: observability in this session stays metadata-only to preserve the
  local data contract and avoid stdout-driven debugging.*
- Cross-repo or cloud-hosted telemetry pipelines - *Reason: the PRD keeps the
  migration local-first and app-owned during initial parity.*

---

## 5. Technical Approach

### Architecture

Add two package-local boundaries inside `apps/api`: one for approval runtime
and one for observability. The approval boundary should own approval request,
resolution, and runner-resume semantics. The observability boundary should own
structured runtime event shapes, persistence helpers, and diagnostics
summaries for recent approvals, failed jobs, and correlated traces. Both
boundaries should compose through the existing service container rather than
through process-global helpers.

Extend the operational store just enough to support these contracts. Approval
records need correlation metadata and query shapes for pending and resolved
work. Runtime diagnostics need a dedicated event-log repository with bounded
filters and deterministic ordering. The durable runner should keep using the
existing `waiting` lifecycle state, but it should distinguish retry waiting
from approval waiting through explicit metadata so approval resumes do not
fight retry logic or stale-claim recovery.

Instrument the backend at the boundaries that already own lifecycle changes.
HTTP request handling should stamp request or trace identifiers and persist
structured request events. Durable job execution should emit claim, approval,
resume, failure, and completion events through the observability service. The
approval service should be the only code path allowed to resolve approval
records and transition waiting jobs back to runnable or terminal state.

### Design Patterns

- Boundary-owned approval orchestration: keep approve or reject transitions in
  one service instead of scattering state updates across routes and runner
  code.
- Metadata-only event sourcing: persist structured runtime events with
  correlation identifiers rather than parsing stdout or storing raw transcripts.
- Waiting-reason extension: reuse the runner's durable waiting lifecycle while
  tagging whether a job is paused for retry backoff or human approval.
- Bounded diagnostics queries: keep filters explicit, ordering deterministic,
  and payloads small enough for stable inspection surfaces.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing SQLite operational store in `apps/api/src/store/`
- Existing durable job runner in `apps/api/src/job-runner/`
- Existing route registry and HTTP server in `apps/api/src/server/`
- Node standard library request handling, timestamps, and IDs

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/approval-runtime/approval-runtime-contract.ts` | Define approval request, resolution, pause, and resume shapes | ~140 |
| `apps/api/src/approval-runtime/approval-runtime-service.ts` | Persist approvals and coordinate approve or reject transitions for waiting jobs | ~220 |
| `apps/api/src/approval-runtime/index.ts` | Export the approval-runtime boundary | ~30 |
| `apps/api/src/approval-runtime/approval-runtime-service.test.ts` | Cover approval creation, resume, reject, and duplicate-resolution paths | ~180 |
| `apps/api/src/observability/observability-contract.ts` | Define runtime event, correlation, filter, and diagnostics summary shapes | ~140 |
| `apps/api/src/observability/observability-service.ts` | Persist runtime events and build bounded diagnostics summaries | ~220 |
| `apps/api/src/observability/index.ts` | Export the observability boundary | ~30 |
| `apps/api/src/observability/observability-service.test.ts` | Cover event persistence, filtering, redaction, and summary behavior | ~170 |
| `apps/api/src/store/runtime-event-repository.ts` | Persist and query structured runtime events | ~190 |
| `apps/api/src/server/routes/runtime-approvals-route.ts` | Expose pending approval summaries for operator inspection | ~90 |
| `apps/api/src/server/routes/runtime-diagnostics-route.ts` | Expose failed-run and recent-event diagnostics with bounded filters | ~110 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/store/store-contract.ts` | Add approval wait metadata, event-log repository contracts, and diagnostics inputs | ~120 |
| `apps/api/src/store/sqlite-schema.ts` | Add approval correlation columns plus a runtime event-log table and indexes | ~130 |
| `apps/api/src/store/approval-repository.ts` | Add pending, by-job, and resolution-oriented helpers with deterministic ordering | ~130 |
| `apps/api/src/store/index.ts` | Export and register the runtime event repository in the operational store | ~30 |
| `apps/api/src/store/repositories.test.ts` | Cover approval correlation fields and structured event persistence | ~140 |
| `apps/api/src/job-runner/job-runner-contract.ts` | Add approval-pause result shapes and correlation metadata surfaces | ~90 |
| `apps/api/src/job-runner/job-runner-state-machine.ts` | Add explicit approval waiting and resolution transition helpers | ~70 |
| `apps/api/src/job-runner/job-runner-service.ts` | Persist approval pauses, emit runtime events, and resume or reject waiting jobs safely | ~220 |
| `apps/api/src/job-runner/job-runner-service.test.ts` | Cover approval pause, approval resume, rejection, and restart-safe recovery | ~180 |
| `apps/api/src/runtime/service-container.ts` | Lazily create approval and observability services and wire them into routes and runner | ~120 |
| `apps/api/src/runtime/service-container.test.ts` | Verify service reuse, cleanup, and diagnostics wiring for the new services | ~120 |
| `apps/api/src/server/http-server.ts` | Stamp request correlation identifiers and emit structured request events | ~90 |
| `apps/api/src/server/routes/index.ts` | Register approval and diagnostics routes alongside existing health surfaces | ~30 |
| `apps/api/src/server/http-server.test.ts` | Cover diagnostics routes, pending approvals, and failed-run summaries | ~180 |
| `apps/api/package.json` | Add approval and observability test or validation aliases | ~16 |
| `apps/api/README_api.md` | Document approval and observability boundaries plus diagnostics routes | ~40 |
| `package.json` | Add repo-root aliases for the new API validation path | ~16 |
| `scripts/test-all.mjs` | Include the approval and observability validation path in the repo quick suite | ~24 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Backend code can persist pending approvals tied to sessions, jobs, and
      correlation identifiers in app-owned state.
- [ ] Durable jobs can pause for approval, remain inspectable while waiting,
      and then resume or terminate cleanly after approve or reject decisions.
- [ ] Runtime events can be queried with deterministic ordering for pending
      approvals, failed jobs, and recent correlated activity.
- [ ] HTTP diagnostics routes expose pending approval and failed-run summaries
      without requiring raw stdout inspection.

### Testing Requirements

- [ ] Package tests cover approval creation, duplicate-resolution protection,
      approval resume, and rejection failure paths.
- [ ] Package tests cover structured event persistence, bounded diagnostics
      filters, and request or job correlation summaries.
- [ ] `npm run app:api:test:approval-runtime`,
      `npm run app:api:test:observability`,
      `npm run app:api:test:job-runner`,
      `npm run app:api:test:store`, and `npm run app:api:build` pass after
      integration.
- [ ] The repo quick suite remains green with the new approval and
      observability validation path enabled.

### Non-Functional Requirements

- [ ] Observability stays metadata-only and does not log raw user-layer
      content, prompt bodies, or stdout transcripts.
- [ ] Diagnostics queries remain bounded, deterministic, and safe to call
      while the runtime is busy or recovering.
- [ ] Approval and diagnostics state remains confined to app-owned storage and
      does not mutate user-layer files.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Approval pauses should extend the existing durable-runner lifecycle instead
  of introducing a second orchestration loop or a new ad hoc worker model.
- Structured diagnostics should stay metadata-only and queryable from SQLite;
  this session should not fall back to stdout scraping or raw transcript
  capture.
- Keep route and service wiring inside the existing container and route
  registry so Phase 03 can reuse the same backend contract for UI surfaces.

### Potential Challenges

- Approval waits versus retry waits: the job runner must distinguish these
  states clearly enough that resume logic and retry logic do not conflict.
- Duplicate approval actions: approve or reject operations must be idempotent
  when operators retry a request or a stale client repeats a decision.
- Event volume drift: diagnostics queries must stay bounded so request logging
  does not create noisy or expensive inspection paths.

### Relevant Considerations

- [P00-apps/api] **Workspace registry coupling**: keep repo reads and writes
  behind existing workspace and registry helpers rather than ad hoc path logic.
- [P00] **Read-first boot surface**: new diagnostics routes must stay read-only
  and must not create app state during inspection.
- [P00] **Repo-bound startup freshness**: diagnostics messaging should stay
  aligned with the live repo contract and required-file checks.
- [P00] **Stdout scraping**: prefer structured payloads and summary objects
  over parsing console output for approval or failure state.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:
- Duplicate approve or reject requests while a waiting job is already being
  resumed or failed
- Diagnostics routes returning unbounded or stale approval data during runner
  recovery
- Request, job, and approval correlation IDs drifting apart across retries or
  restart recovery

---

## 9. Testing Strategy

### Unit Tests

- Approval contract validation and approval-resolution guard rails
- Observability filter normalization, event redaction, and summary shaping
- Durable runner state-machine decisions for approval waiting and resolution

### Integration Tests

- Approval repository and event repository persistence with correlation fields
- Durable runner pause, approve, reject, and restart-safe recovery flows
- HTTP diagnostics routes for pending approvals and failed runs

### Manual Testing

- Create a fixture-backed job that pauses for approval, inspect diagnostics,
  approve it, and verify the resumed job completes with correlated events
- Create a second fixture-backed approval, reject it, and verify the job
  reaches the expected terminal state with a failure summary
- Hit diagnostics routes repeatedly while a job is running to confirm bounded
  output and no hidden writes

### Edge Cases

- Resolving the same approval twice
- Waiting jobs whose approval record is missing or already terminal
- Failed jobs with no stored result payload but a persisted error summary
- Event queries filtered by session, job, or approval when one identifier is
  absent

---

## 10. Dependencies

### External Libraries

- `zod` - validate approval and diagnostics input shapes where route or runner
  inputs need typed parsing

### Internal Dependencies

- Existing operational store repositories in `apps/api/src/store/`
- Existing durable runner in `apps/api/src/job-runner/`
- Existing service container and route registry in `apps/api/src/runtime/`
  and `apps/api/src/server/`

