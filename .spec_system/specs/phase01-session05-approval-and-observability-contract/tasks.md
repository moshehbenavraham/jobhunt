# Task Checklist

**Session ID**: `phase01-session05-approval-and-observability-contract`
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

Approval and observability package scaffolding plus public entrypoints.

### apps/api

- [x] T001 [S0105] Update the API workspace and repo-root manifests with
      approval-runtime and observability test or validation aliases
      (`apps/api/package.json`, `package.json`)
- [x] T002 [S0105] [P] Create typed approval-runtime contracts for approval
      requests, resolution decisions, and pause or resume metadata
      (`apps/api/src/approval-runtime/approval-runtime-contract.ts`)
- [x] T003 [S0105] [P] Create typed observability contracts for runtime events,
      diagnostics filters, and correlation identifiers
      (`apps/api/src/observability/observability-contract.ts`)

---

## Foundation (4 tasks)

Store extensions required for approval-aware runtime inspection.

### apps/api

- [x] T004 [S0105] Extend the operational-store contracts with approval wait
      metadata, approval-resolution inputs, and structured event-repository
      interfaces (`apps/api/src/store/store-contract.ts`)
- [x] T005 [S0105] Extend the SQLite schema with approval-correlation fields
      and a runtime-event table using migration-safe indexes and deterministic
      ordering (`apps/api/src/store/sqlite-schema.ts`)
- [x] T006 [S0105] [P] Update the approval repository with pending, by-job,
      and resolution-safe query helpers with idempotency protection and
      deterministic ordering (`apps/api/src/store/approval-repository.ts`)
- [x] T007 [S0105] [P] Create a runtime-event repository with bounded filters,
      metadata-only payload storage, and deterministic ordering
      (`apps/api/src/store/runtime-event-repository.ts`,
      `apps/api/src/store/index.ts`)

---

## Implementation (5 tasks)

Approval orchestration, event recording, and diagnostics delivery.

### apps/api

- [x] T008 [S0105] Create the approval-runtime service for approval creation,
      approval lookup, approve or reject transitions, and duplicate-resolution
      prevention while in-flight (`apps/api/src/approval-runtime/approval-runtime-service.ts`,
      `apps/api/src/approval-runtime/index.ts`)
- [x] T009 [S0105] [P] Create the observability service for request, job, and
      approval event writes plus pending or failed diagnostics summaries with
      bounded pagination, validated filters, and redaction
      (`apps/api/src/observability/observability-service.ts`,
      `apps/api/src/observability/index.ts`)
- [x] T010 [S0105] Update durable-job-runner contracts and transition helpers
      with approval-pending wait semantics, explicit error mapping, and types
      matching the declared contract (`apps/api/src/job-runner/job-runner-contract.ts`,
      `apps/api/src/job-runner/job-runner-state-machine.ts`)
- [x] T011 [S0105] Update the durable job-runner service to persist approval
      pauses, emit structured runtime events, and resume or reject waiting jobs
      with cleanup on scope exit for all acquired resources
      (`apps/api/src/job-runner/job-runner-service.ts`)
- [x] T012 [S0105] Update the service container, HTTP server, and route
      registry to wire approval-runtime plus observability services and expose
      diagnostics endpoints with schema-validated input and explicit error
      mapping (`apps/api/src/runtime/service-container.ts`,
      `apps/api/src/server/http-server.ts`,
      `apps/api/src/server/routes/index.ts`,
      `apps/api/src/server/routes/runtime-approvals-route.ts`,
      `apps/api/src/server/routes/runtime-diagnostics-route.ts`)

---

## Testing (4 tasks)

Verification and regression coverage for pause, resume, reject, and inspect
flows.

### apps/api

- [x] T013 [S0105] [P] Create approval-runtime and observability service
      coverage for approval creation, duplicate resolution, event filtering,
      and diagnostics summary behavior
      (`apps/api/src/approval-runtime/approval-runtime-service.test.ts`,
      `apps/api/src/observability/observability-service.test.ts`)
- [x] T014 [S0105] [P] Extend store and durable-runner coverage for approval
      pause, approval resume, rejection failure paths, and structured event
      persistence (`apps/api/src/store/repositories.test.ts`,
      `apps/api/src/job-runner/job-runner-service.test.ts`)
- [x] T015 [S0105] Update HTTP server and service-container coverage for
      pending approvals, failed-run diagnostics, request correlation, and
      cleanup-on-dispose behavior (`apps/api/src/server/http-server.test.ts`,
      `apps/api/src/runtime/service-container.test.ts`)

### repo root

- [x] T016 [S0105] Update the API package guide and repo quick-suite coverage
      for the approval and observability validation path
      (`apps/api/README_api.md`, `scripts/test-all.mjs`)

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
