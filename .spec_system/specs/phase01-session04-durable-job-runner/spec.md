# Session Specification

**Session ID**: `phase01-session04-durable-job-runner`
**Phase**: 01 - Backend Runtime and Job Infrastructure
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Session 01 established the API runtime, Session 02 added the SQLite-backed
operational store, and Session 03 created the authenticated agent bootstrap
surface. The next missing backend foundation is the durable runner that turns
those pieces into resumable work. Until that exists, Phase 01 still cannot
start, persist, recover, and complete long-running app-owned jobs in a
structured way.

This session adds a package-local durable job runner inside `apps/api`. The
runner should enqueue work, claim it through SQLite-backed lifecycle state,
persist heartbeats and checkpoints, resume interrupted jobs after process
restart, and retry safe failures without replaying already-completed side
effects. The design should stay internal to the backend and reuse the existing
store, service container, workspace boundary, and agent-runtime bootstrap
instead of inventing a parallel orchestration path.

This is the correct next session because the authoritative analyzer shows
Session 04 as the first incomplete candidate in Phase 01, and Session 05 lists
it as a direct prerequisite. Completing the durable runner now gives the next
approval and observability work one stable execution surface to pause, resume,
and inspect rather than forcing that later session to define core job
semantics itself.

---

## 2. Objectives

1. Create one backend-owned job runner service that can enqueue, claim,
   execute, and complete app-owned jobs using `apps/api` dependencies.
2. Extend the operational-store contract so jobs, sessions, and run metadata
   can persist claim ownership, heartbeats, retry budget, and resume
   checkpoints.
3. Add recovery behavior that can reclaim stale running work after restart,
   resume from persisted checkpoints when safe, and prevent duplicate side
   effects for already-completed steps.
4. Add deterministic validation coverage for enqueue, checkpoint, retry,
   restart-recovery, and terminal-failure paths.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-api-service-runtime` - provides the long-lived API
      runtime, service container, and backend module boundaries this runner
      will extend.
- [x] `phase01-session02-sqlite-operational-store` - provides the SQLite
      schema, repository layer, and app-owned persistence boundary the runner
      must reuse.
- [x] `phase01-session03-agent-runtime-bootstrap` - provides authenticated
      agent bootstrap and prompt-loading behavior for jobs that need runtime
      execution state.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for deterministic TypeScript Node patterns and
  validation expectations
- `.spec_system/CONSIDERATIONS.md` for read-first boot, registry-first path
  ownership, and repo-freshness constraints
- Existing store modules in `apps/api/src/store/`
- Existing agent-runtime service in `apps/api/src/agent-runtime/`
- Existing service container lifecycle in `apps/api/src/runtime/`

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- SQLite access through the existing `node:sqlite` store layer
- Write access limited to app-owned state under `.jobhunt-app/`
- Deterministic test execution available through package and repo-root npm
  scripts

---

## 4. Scope

### In Scope (MVP)

- Backend runtime can enqueue and persist app-owned jobs with durable queued,
  running, waiting, failed, cancelled, and completed lifecycle transitions.
- Backend runtime can claim queued work, persist heartbeats, checkpoint
  progress in run metadata, and resume interrupted jobs after process restart.
- Backend runtime can retry resumable failures within a bounded retry policy
  while preserving terminal failure state for non-resumable work.
- Maintainer can run deterministic package and repo validations that prove
  enqueue, resume, retry, and terminal failure behavior.

### Out of Scope (Deferred)

- Approval pause or resume semantics and approval record orchestration -
  *Reason: Session 05 owns approval-state behavior on top of this runner.*
- Structured logs, traces, and operator diagnostics for jobs - *Reason:
  Session 05 owns observability.*
- Workflow-specific evaluation, scan, PDF, or batch business logic - *Reason:
  later phases own workflow parity while this session only creates the runtime
  execution surface.*
- Public API routes or UI surfaces for job control - *Reason: later phases
  own chat, review, and workflow-trigger UX.*

---

## 5. Technical Approach

### Architecture

Create a package-local boundary at `apps/api/src/job-runner/` that owns durable
job execution. The runner should expose a typed enqueue API, a deterministic
executor registry, and one service that coordinates lifecycle transitions with
the existing operational store. The service should stay lazy and container
owned, mirroring the existing store and agent-runtime patterns instead of
adding process-global worker state.

Extend the store contract only where the runner needs durable state that does
not fit the current Session 02 schema. Jobs need claim ownership, heartbeats,
retry metadata, and deterministic ordering for recovery scans. Run metadata
should hold checkpoint information that tells the runner what already finished
before an interruption. Session records should continue to hold workflow-level
context and heartbeats so recovery logic can determine whether a process died
mid-run.

The runner should use a checkpoint-first recovery model. Before a handler
replays any side-effecting step, it must inspect persisted checkpoint metadata
and only continue from the next safe stage. Claim acquisition, heartbeat
renewal, retry transitions, and terminal completion should all be persisted
through explicit repository helpers instead of ad hoc state mutation in runner
code. Service disposal should stop polling or timer work cleanly so later
approval and observability work can build on a predictable lifecycle.

### Design Patterns

- Durable claim and lease model: a claimed job carries explicit ownership and
  heartbeat state so stale work can be recovered after restart.
- Executor registry: map job types to bounded handlers instead of scattering
  workflow branching across the service container.
- Checkpoint-driven recovery: persist completed step markers in run metadata
  so resume paths avoid duplicate side effects.
- Transactional lifecycle transitions: persist claim, retry, and terminal
  state changes behind explicit repository operations instead of open-coded
  multi-step writes.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing SQLite store and repository layer in `apps/api/src/store/`
- Existing authenticated agent-runtime service in `apps/api/src/agent-runtime/`
- Node standard library timers and `AbortController` for bounded runner
  lifecycle control

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/job-runner/job-runner-contract.ts` | Define runner lifecycle, enqueue, checkpoint, and recovery shapes | ~150 |
| `apps/api/src/job-runner/job-runner-state-machine.ts` | Centralize valid lifecycle transitions and retry decisions | ~130 |
| `apps/api/src/job-runner/job-runner-executors.ts` | Define executor registration and dispatch behavior for supported job types | ~120 |
| `apps/api/src/job-runner/job-runner-service.ts` | Enqueue, claim, heartbeat, checkpoint, resume, and retry durable jobs | ~240 |
| `apps/api/src/job-runner/test-utils.ts` | Provide fake handlers and restart harnesses for deterministic runner tests | ~120 |
| `apps/api/src/job-runner/index.ts` | Export the public durable-runner surface | ~30 |
| `apps/api/src/job-runner/job-runner-state-machine.test.ts` | Cover valid transitions and retry exhaustion behavior | ~110 |
| `apps/api/src/job-runner/job-runner-service.test.ts` | Cover enqueue, resume, retry, and terminal failure flows | ~220 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/store/store-contract.ts` | Add durable job-runner persistence shapes and repository method contracts | ~110 |
| `apps/api/src/store/sqlite-schema.ts` | Add job-runner columns, indexes, and migration-safe schema updates | ~90 |
| `apps/api/src/store/job-repository.ts` | Add claim, heartbeat, retry, and recovery-oriented query helpers | ~180 |
| `apps/api/src/store/session-repository.ts` | Extend session persistence for runner heartbeats and active-session queries | ~70 |
| `apps/api/src/store/run-metadata-repository.ts` | Add checkpoint-focused save and lookup helpers for recovery | ~90 |
| `apps/api/src/store/repositories.test.ts` | Cover durable claim, checkpoint, and repeated-save behavior | ~120 |
| `apps/api/src/runtime/service-container.ts` | Lazily create, cache, and dispose the durable job runner service | ~80 |
| `apps/api/src/runtime/service-container.test.ts` | Verify job-runner caching, cleanup, and restart-safe lifecycle wiring | ~100 |
| `apps/api/package.json` | Add package-level durable-runner test and validation aliases | ~12 |
| `apps/api/README_api.md` | Document the durable-runner boundary and validation path | ~30 |
| `package.json` | Add repo-root aliases for the durable-runner contract path | ~12 |
| `scripts/test-all.mjs` | Include durable-runner validation in the quick regression suite | ~20 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] Backend code can enqueue jobs and persist structured lifecycle state for
      queued, running, waiting, failed, cancelled, and completed work.
- [ ] Restarting the API process allows stale running jobs to be recovered and
      resumed or failed deterministically from persisted state.
- [ ] Retryable failures can be retried through bounded durable state without
      replaying already-checkpointed side effects.
- [ ] The API service container exposes one reusable durable job-runner
      surface for later approval and observability work.

### Testing Requirements

- [ ] Package tests cover state-machine transitions, retry exhaustion, and
      non-resumable terminal failure behavior.
- [ ] Package tests cover enqueue, checkpoint resume, restart recovery, and
      duplicate-trigger prevention while work is in flight.
- [ ] `npm run app:api:test:job-runner`, `npm run app:api:test:store`, and
      `npm run app:api:build` pass after the durable-runner integration.
- [ ] The repo quick suite stays green with the durable-runner validation path
      enabled.

### Non-Functional Requirements

- [ ] Runner state remains confined to app-owned storage and does not mutate
      user-layer files during enqueue, resume, or recovery.
- [ ] Recovery logic is deterministic enough that stale claims and retries do
      not leave jobs permanently stuck in `running`.
- [ ] Failure paths preserve structured store state that later observability
      work can inspect without stdout scraping.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Session 02 intentionally kept the store narrow. Extend it only where durable
  runner state requires new persisted fields; do not turn this session into a
  general store redesign.
- Session 03 already owns authenticated runtime bootstrap. The durable runner
  should depend on that service instead of importing repo auth or prompt logic
  directly.
- Session 05 still owns approvals and observability. Leave clear extension
  points for pause or resume state and structured trace identifiers, but do not
  implement them here.

### Potential Challenges

- Duplicate side effects after restart: recovery must consult durable
  checkpoints before retrying or resuming side-effecting work.
- Schema evolution from Session 02: migration steps must stay idempotent and
  preserve existing test fixtures plus current repository behavior.
- Runner cleanup: polling, timers, or long-lived claims must stop cleanly on
  service disposal to avoid orphaned in-memory work loops.

### Relevant Considerations

- [P00-apps/api] **Workspace registry coupling**: keep runner writes behind the
  existing app-owned store and workspace boundary rather than ad hoc path
  access.
- [P00] **Read-first boot surface**: do not create hidden writes from startup
  or diagnostics paths just to inspect runner state.
- [P00] **Canonical live surface**: workflow intent and prompt behavior remain
  repo-owned; the runner should orchestrate them, not redefine them.
- [P00] **Registry-first contracts**: reuse checked-in store, prompt, and
  workspace helpers instead of embedding parallel runtime-specific guesses.

### Behavioral Quality Focus

Checklist active: Yes
Top behavioral risks for this session:
- Duplicate execution after crash or restart replays a side-effecting step
  that already completed.
- Lost heartbeat or stale claims leave jobs stranded in `running` without a
  deterministic recovery path.
- Retry loops mask permanent failures instead of cleanly recording terminal
  error state.

---

## 9. Testing Strategy

### Unit Tests

- Validate allowed and rejected lifecycle transitions in the runner state
  machine.
- Validate retry-budget decisions and non-resumable failure classification.

### Integration Tests

- Exercise enqueue, claim, heartbeat, checkpoint, completion, and restart
  recovery against the SQLite-backed store.
- Exercise service-container reuse and cleanup so the durable runner does not
  leak timers or stale ownership between runs.

### Manual Testing

- Run `npm run app:api:test:job-runner` and `npm run test:quick` from the repo
  root after implementation.
- Recreate a restart scenario in tests by disposing and recreating the
  container while jobs remain durable in the operational store.

### Edge Cases

- Duplicate enqueue request for the same durable job while a prior attempt is
  still active
- Stale running job with missing or partial checkpoint metadata
- Retry budget exhausted after a partially completed side-effecting step

---

## 10. Dependencies

### External Libraries

- No new libraries planned; reuse the existing workspace dependencies and Node
  standard library runtime already present in the repo.

### Other Sessions

- **Depends on**: `phase01-session01-api-service-runtime`,
  `phase01-session02-sqlite-operational-store`,
  `phase01-session03-agent-runtime-bootstrap`
- **Depended by**: `phase01-session05-approval-and-observability-contract`,
  Phase 02 typed tool and orchestration sessions

---

## Next Steps

Run the `implement` workflow step to begin AI-led implementation.
