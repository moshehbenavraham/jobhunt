# Task Checklist

**Session ID**: `phase01-session04-durable-job-runner`
**Total Tasks**: 16
**Estimated Duration**: 3-4 hours
**Created**: 2026-04-21

---

## Legend

- `[x]` = Completed
- `[ ]` = Pending
- `[P]` = Parallelizable (can run with other [P] tasks)
- `[SNNMM]` = Session reference (NN=phase number, MM=session number)
- `TNNN` = Task ID

---

## Progress Summary

| Category       | Total  | Done   | Remaining |
| -------------- | ------ | ------ | --------- |
| Setup          | 3      | 3      | 0         |
| Foundation     | 4      | 4      | 0         |
| Implementation | 5      | 5      | 0         |
| Testing        | 4      | 4      | 0         |
| **Total**      | **16** | **16** | **0**     |

---

## Setup (3 tasks)

Package manifests and durable-runner contract surfaces.

### apps/api

- [x] T001 [S0104] Update the API workspace and repo-root manifests with
      explicit durable-job-runner test and validation aliases
      (`apps/api/package.json`, `package.json`)
- [x] T002 [S0104] [P] Create typed durable-job-runner contracts for lifecycle
      state, enqueue input, checkpoint metadata, and recovery summaries
      (`apps/api/src/job-runner/job-runner-contract.ts`)
- [x] T003 [S0104] [P] Extend the store contracts with durable claim,
      heartbeat, retry-budget, and checkpoint persistence shapes
      (`apps/api/src/store/store-contract.ts`)

---

## Foundation (4 tasks)

Store and state-machine primitives required by the runner.

### apps/api

- [x] T004 [S0104] Extend the SQLite schema with job-lease, heartbeat, retry,
      and checkpoint fields using migration-safe indexes and deterministic
      ordering (`apps/api/src/store/sqlite-schema.ts`)
- [x] T005 [S0104] Update the job repository with claim, list-claimable,
      heartbeat, and terminal-state helpers with idempotency protection,
      transaction boundaries, and compensation on failure
      (`apps/api/src/store/job-repository.ts`)
- [x] T006 [S0104] [P] Update the session repository with active-session lookup
      and heartbeat persistence for restart-safe runner ownership
      (`apps/api/src/store/session-repository.ts`)
- [x] T007 [S0104] [P] Update the run-metadata repository with checkpoint save
      and load helpers plus deterministic ordering for recovery scans
      (`apps/api/src/store/run-metadata-repository.ts`)

---

## Implementation (5 tasks)

Main durable-runner logic and backend integration.

### apps/api

- [x] T008 [S0104] Create the durable state-machine helpers for queued,
      running, waiting, completed, failed, and cancelled transitions with
      bounded retry decisions (`apps/api/src/job-runner/job-runner-state-machine.ts`)
- [x] T009 [S0104] [P] Create runner test utilities with fake handlers and
      restart harnesses for enqueue, resume, retry, and terminal failure
      coverage (`apps/api/src/job-runner/test-utils.ts`)
- [x] T010 [S0104] [P] Create executor registration and public runner exports
      with schema-validated input and explicit error mapping for supported job
      types (`apps/api/src/job-runner/job-runner-executors.ts`,
      `apps/api/src/job-runner/index.ts`)
- [x] T011 [S0104] Create the durable job-runner service for enqueue, claim,
      heartbeat, checkpoint, resume, and retry flows with cleanup on scope exit
      for all acquired resources (`apps/api/src/job-runner/job-runner-service.ts`)
- [x] T012 [S0104] Update the API service container to lazily create, cache,
      start, and dispose the durable job runner with state reset or
      revalidation on re-entry (`apps/api/src/runtime/service-container.ts`)

---

## Testing (4 tasks)

Verification and regression coverage for durable execution semantics.

### apps/api

- [x] T013 [S0104] [P] Create state-machine coverage for valid transitions,
      retry exhaustion, and non-resumable terminal failure decisions
      (`apps/api/src/job-runner/job-runner-state-machine.test.ts`)
- [x] T014 [S0104] [P] Create durable-runner service coverage for enqueue,
      restart recovery, checkpoint resume, and duplicate-trigger prevention
      while in flight (`apps/api/src/job-runner/job-runner-service.test.ts`)
- [x] T015 [S0104] Update repository and service-container coverage for claim
      persistence, stale-runner recovery, and cleanup-on-dispose behavior
      (`apps/api/src/store/repositories.test.ts`,
      `apps/api/src/runtime/service-container.test.ts`)

### repo root

- [x] T016 [S0104] Update the API package guide and repo quick-suite coverage
      for the durable-job-runner validation path (`apps/api/README_api.md`,
      `scripts/test-all.mjs`)

---

## Completion Checklist

Before marking session complete:

- [x] All tasks marked `[x]`
- [x] All tests passing
- [x] All files ASCII-encoded
- [x] implementation-notes.md updated
- [x] Ready for the `validate` workflow step

---

## Next Steps

Run the `implement` workflow step next. After a successful `plansession` run,
`implement` is always the next workflow command.
