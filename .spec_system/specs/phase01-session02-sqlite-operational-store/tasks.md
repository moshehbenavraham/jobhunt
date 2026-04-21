# Task Checklist

**Session ID**: `phase01-session02-sqlite-operational-store`
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

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Setup | 3 | 3 | 0 |
| Foundation | 4 | 4 | 0 |
| Implementation | 6 | 6 | 0 |
| Testing | 3 | 3 | 0 |
| **Total** | **16** | **16** | **0** |

---

## Setup (3 tasks)

Initial store configuration and package-level preparation.

### apps/api

- [x] T001 [S0102] Update the API workspace manifest with explicit
      operational-store test aliases and a canonical validation path
      (`apps/api/package.json`)
- [x] T002 [S0102] Extend the app-state root helpers to resolve the SQLite file
      path and inspect store status without creating it
      (`apps/api/src/config/app-state-root.ts`)
- [x] T003 [S0102] [P] Create typed operational-store contracts for runtime
      sessions, jobs, approvals, and run metadata
      (`apps/api/src/store/store-contract.ts`)

---

## Foundation (4 tasks)

Core persistence modules and schema setup.

### apps/api

- [x] T004 [S0102] [P] Create the initial SQLite schema module with idempotent
      table and index setup (`apps/api/src/store/sqlite-schema.ts`)
- [x] T005 [S0102] Create the SQLite store adapter with read-only status
      inspection, transaction helpers, and actionable corruption or
      locked-database error mapping with timeout, retry/backoff, and
      failure-path handling (`apps/api/src/store/sqlite-store.ts`)
- [x] T006 [S0102] [P] Create session persistence helpers with idempotency
      protection, transaction boundaries, and compensation on failure
      (`apps/api/src/store/session-repository.ts`)
- [x] T007 [S0102] [P] Create job persistence helpers with idempotency
      protection, transaction boundaries, and compensation on failure
      (`apps/api/src/store/job-repository.ts`)

---

## Implementation (6 tasks)

Main runtime integration and repository coverage.

### apps/api

- [x] T008 [S0102] [P] Create approval persistence helpers with idempotency
      protection, transaction boundaries, and compensation on failure
      (`apps/api/src/store/approval-repository.ts`)
- [x] T009 [S0102] [P] Create run-metadata persistence helpers with
      idempotency protection, transaction boundaries, and compensation on
      failure (`apps/api/src/store/run-metadata-repository.ts`)
- [x] T010 [S0102] Create the store barrel and runtime-facing repository bundle
      for later job and agent modules (`apps/api/src/store/index.ts`)
- [x] T011 [S0102] Update the API service container to lazily create and
      dispose the operational store with cleanup on scope exit for all acquired
      resources (`apps/api/src/runtime/service-container.ts`)
- [x] T012 [S0102] Update startup diagnostics and status mapping to surface
      operational-store readiness and explicit store failures without hidden
      writes on boot (`apps/api/src/index.ts`,
      `apps/api/src/server/startup-status.ts`)
- [x] T013 [S0102] Update the API package guide and repo-root aliases so the
      store contract has one canonical execution path (`apps/api/README_api.md`,
      `package.json`)

---

## Testing (3 tasks)

Verification and regression coverage for the operational store boundary.

### apps/api

- [x] T014 [S0102] [P] Create initialization coverage for missing roots,
      schema idempotency, and corrupt-store diagnostics
      (`apps/api/src/store/sqlite-store.test.ts`)
- [x] T015 [S0102] [P] Create CRUD coverage for sessions, jobs, approvals, and
      run metadata against a temp app-state root
      (`apps/api/src/store/repositories.test.ts`)

### repo root

- [x] T016 [S0102] Update startup-route and repo quick-suite coverage to assert
      store readiness reporting and no-mutation bootstrap behavior
      (`apps/api/src/server/http-server.test.ts`,
      `scripts/test-app-bootstrap.mjs`, `scripts/test-all.mjs`)

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

Session complete. Run `plansession` for the next Phase 01 session.
