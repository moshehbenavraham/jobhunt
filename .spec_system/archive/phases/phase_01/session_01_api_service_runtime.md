# Session 01: API Service Runtime

**Session ID**: `phase01-session01-api-service-runtime`
**Package**: apps/api
**Status**: Complete
**Estimated Tasks**: ~14
**Estimated Duration**: 2-4 hours

---

## Objective

Turn the Phase 00 scaffold into a real local API process with typed route
registration, lifecycle wiring, and shared backend service boundaries for the
rest of the runtime work.

---

## Scope

### In Scope (MVP)

- Create the primary API server entrypoint and route shell in `apps/api`
- Define lifecycle and configuration wiring for startup, shutdown, and local
  runtime settings
- Preserve the existing startup and health semantics while moving them into a
  reusable service container shape
- Add a baseline request and error contract for future runtime endpoints

### Out of Scope

- SQLite schema design
- Background job execution
- Agent and tool orchestration

---

## Prerequisites

- [ ] Phase 00 completed and archived
- [ ] Existing boot diagnostics and workspace adapter contract reviewed

---

## Deliverables

1. API server structure and typed route contract for `apps/api`
2. Shared service container or composition root for backend runtime services
3. Local smoke-test path that proves the API boots without mutating repo data

---

## Success Criteria

- [ ] The API can boot as a local service with explicit startup and shutdown
      handling
- [ ] Health and startup diagnostics remain structured and read-first
- [ ] Future runtime modules have one clear backend entrypoint to attach to
      instead of ad hoc script glue
