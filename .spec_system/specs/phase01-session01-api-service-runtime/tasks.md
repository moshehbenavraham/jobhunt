# Task Checklist

**Session ID**: `phase01-session01-api-service-runtime`
**Total Tasks**: 15
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
| Setup | 3 | 0 | 3 |
| Foundation | 4 | 0 | 4 |
| Implementation | 5 | 0 | 5 |
| Testing | 3 | 0 | 3 |
| **Total** | **15** | **0** | **15** |

---

## Setup (3 tasks)

Initial runtime configuration and package-level preparation.

### apps/api

- [x] T001 [S0101] Update the API workspace manifest with explicit runtime and
      contract-test aliases (`apps/api/package.json`)
- [x] T002 [S0101] Create runtime config parsing for host, port, and timeout
      defaults with explicit validation errors (`apps/api/src/runtime/runtime-config.ts`)
- [x] T003 [S0101] Create the shared service container and composition root for
      startup diagnostics plus future backend services with cleanup on scope
      exit for all acquired resources (`apps/api/src/runtime/service-container.ts`)

---

## Foundation (4 tasks)

Core route contracts and baseline runtime modules.

### apps/api

- [x] T004 [S0101] [P] Create typed route definitions, request context, and
      JSON error helpers with schema-validated input and explicit error mapping
      (`apps/api/src/server/route-contract.ts`)
- [x] T005 [S0101] [P] Create the health route handler around the service
      container and current diagnostics contract (`apps/api/src/server/routes/health-route.ts`)
- [x] T006 [S0101] [P] Create the startup route handler around the service
      container and current startup payload serializer (`apps/api/src/server/routes/startup-route.ts`)
- [x] T007 [S0101] Create the central route registry for current boot endpoints
      and future runtime modules with deterministic registration order
      (`apps/api/src/server/routes/index.ts`)

---

## Implementation (5 tasks)

Main API runtime wiring and repo-facing integration.

### apps/api

- [x] T008 [S0101] Update one-shot diagnostics exports so the service container
      can reuse boot services without duplicating workspace or prompt logic
      (`apps/api/src/index.ts`)
- [x] T009 [S0101] Implement the API server dispatcher with typed route lookup,
      rate limiting, and explicit 404 and 405 handling with schema-validated
      input and explicit error mapping (`apps/api/src/server/http-server.ts`)
- [x] T010 [S0101] Update the long-lived server entrypoint to build the runtime
      once per process, wire graceful startup and shutdown, and close cleanly
      on `SIGINT` and `SIGTERM` with cleanup on scope exit for all acquired
      resources (`apps/api/src/server/index.ts`)
- [x] T011 [S0101] Update the API package guide to document the real runtime
      boundary, current routes, and smoke-test path (`apps/api/README_api.md`)

### repo root

- [x] T012 [S0101] Update repo-root runtime aliases and the bootstrap smoke path
      so they exercise the real API runtime entrypoint and keep startup checks
      read-first (`package.json`, `scripts/test-app-bootstrap.mjs`)

---

## Testing (3 tasks)

Verification and regression coverage for the new runtime boundary.

### apps/api

- [x] T013 [S0101] [P] Expand server contract coverage for route dispatch,
      `HEAD` requests, method errors, repo-resolution failures, and
      no-mutation guarantees (`apps/api/src/server/http-server.test.ts`)
- [x] T014 [S0101] [P] Create runtime config and service-container coverage for
      invalid env input and repeated startup reuse
      (`apps/api/src/runtime/runtime-config.test.ts`,
      `apps/api/src/runtime/service-container.test.ts`)

### repo root

- [x] T015 [S0101] Update the quick suite hooks, then run API build and check,
      bootstrap smoke validation, and ASCII verification for all new runtime
      files (`scripts/test-all.mjs`)

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

Run the `implement` workflow step to begin AI-led implementation.
