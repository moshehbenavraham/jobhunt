# Session Specification

**Session ID**: `phase01-session02-sqlite-operational-store`
**Phase**: 01 - Backend Runtime and Job Infrastructure
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Session 01 established the long-lived API runtime, typed route registration,
and read-first startup diagnostics for `apps/api`. The next missing backend
foundation is a durable operational store that can hold app-owned runtime state
without moving any user-layer workflow artifacts out of the repo. Until that
exists, later sessions have nowhere reliable to persist resumable runs,
approval checkpoints, or agent state.

This session adds the first SQLite-backed persistence boundary under
`.jobhunt-app/` and keeps it narrow on purpose. The goal is not to build job
execution yet. The goal is to define the schema, connection rules, and typed
repository helpers for runtime sessions, jobs, approvals, and run metadata
while preserving the read-first startup contract from Phase 00 and Session 01.

This is the correct next session because the authoritative analyzer shows
Session 02 as the first incomplete Phase 01 candidate, and Sessions 03 through
05 all list it as a prerequisite. Completing the operational store now unblocks
agent bootstrap, durable job execution, and approval-state work without
forcing those later sessions to invent their own persistence contract.

---

## 2. Objectives

1. Define the initial SQLite storage contract and file location inside
   `.jobhunt-app/` without leaking writes into repo-owned artifact paths.
2. Add typed repository helpers for runtime sessions, jobs, approvals, and run
   metadata behind one backend-owned store boundary in `apps/api`.
3. Keep startup and diagnostics read-first by making store inspection explicit
   and preventing hidden database creation during boot routes.
4. Add deterministic validation coverage for store initialization, basic
   persistence flows, and corrupt-store failure handling.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-api-service-runtime` - provides the long-lived API
      runtime, service container, typed routes, and startup diagnostics
      contract that the operational store must extend.
- [x] `phase00-session02-workspace-adapter-contract` - provides guarded
      workspace ownership rules that keep writes inside `.jobhunt-app/`.
- [x] `phase00-session04-boot-path-and-validation` - provides the read-first
      bootstrap smoke path that must remain non-mutating after store work.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for standard-library-first Node decisions and
  repo validation expectations
- `.spec_system/CONSIDERATIONS.md` for read-first boot, registry-first path
  ownership, and startup-freshness constraints
- Current app-state helpers in `apps/api/src/config/app-state-root.ts`
- Current runtime container and diagnostics flow in `apps/api/src/runtime/`
  and `apps/api/src/index.ts`

### Environment Requirements

- Node.js `v24.14.0` or newer available in the local workspace
- SQLite access through the Node standard library `node:sqlite` module
- Write access limited to app-owned paths under `.jobhunt-app/`
- Live repo-root validation commands available from `package.json` scripts

---

## 4. Scope

### In Scope (MVP)

- Operator-facing runtime can resolve an explicit SQLite file path under
  `.jobhunt-app/` and initialize the operational schema only through store
  setup paths, not through boot diagnostics.
- Backend services can persist and reload runtime sessions, jobs, approvals,
  and run metadata through typed repository helpers in `apps/api`.
- Startup diagnostics can report operational-store readiness or actionable
  corruption errors without creating the database during `/health` or
  `/startup`.
- Maintainer can run deterministic package and repo checks that validate basic
  store creation, CRUD flows, and no-mutation boot behavior.

### Out of Scope (Deferred)

- Background job execution, retries, or resumable state machines - *Reason:
  Session 04 owns the durable runner.*
- Provider auth bootstrap and agent-runtime creation - *Reason: Session 03
  owns authenticated runtime bootstrap.*
- Approval UI surfaces or decision policies - *Reason: Session 05 owns
  approval-state semantics and observability.*
- Migrating tracker, reports, profile data, or any other repo-owned artifact
  into SQLite - *Reason: the PRD keeps domain artifacts in repo files during
  parity work.*

---

## 5. Technical Approach

### Architecture

Keep the operational store behind a thin package-local boundary at
`apps/api/src/store/`. The store layer should own SQLite file resolution,
schema bootstrap, connection lifecycle, typed row mapping, and repository
helpers for the four runtime entity groups: sessions, jobs, approvals, and run
metadata.

The existing app-state root helpers remain authoritative for where app-owned
state may live. Extend those helpers to resolve the operational database path,
but do not create the file during startup diagnostics. Store creation should be
an explicit repository or initializer action, while a separate read-only status
path can inspect whether the store is absent, ready, or corrupt.

Wire the store into the API service container lazily so later sessions can
reuse a single runtime-owned store instance per process. Startup diagnostics
should read a store readiness summary and surface clear failure messages, but
boot routes must remain metadata-only and must not create `.jobhunt-app/` or
the database file as a side effect.

### Design Patterns

- Thin persistence adapter: isolate `node:sqlite` behind package-owned helpers
  so later sessions do not depend on the raw experimental module surface.
- Repository pattern: expose typed persistence methods for sessions, jobs,
  approvals, and run metadata instead of scattering SQL across runtime modules.
- Explicit init vs inspect split: separate schema creation from read-only
  readiness checks to preserve the no-hidden-write boot contract.
- Transactional writes: group multi-statement changes behind explicit
  transactions so later resumable-job work inherits stable persistence rules.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Node standard library `node:sqlite` for local SQLite access
- Existing app-state path helpers in `apps/api/src/config/`
- Existing runtime container and startup diagnostics modules in `apps/api/src/`
- Repo validation scripts from `package.json` and `scripts/test-all.mjs`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/store/store-contract.ts` | Define typed runtime records and repository input/output shapes | ~130 |
| `apps/api/src/store/sqlite-schema.ts` | Define schema bootstrap SQL, indexes, and idempotent migration steps | ~120 |
| `apps/api/src/store/sqlite-store.ts` | Own connection lifecycle, init logic, read-only status inspection, and transaction helpers | ~190 |
| `apps/api/src/store/session-repository.ts` | Persist and load runtime session records | ~110 |
| `apps/api/src/store/job-repository.ts` | Persist and load job lifecycle records | ~130 |
| `apps/api/src/store/approval-repository.ts` | Persist and load approval state records | ~110 |
| `apps/api/src/store/run-metadata-repository.ts` | Persist and load run metadata records | ~110 |
| `apps/api/src/store/index.ts` | Export the operational-store surface for runtime modules | ~40 |
| `apps/api/src/store/sqlite-store.test.ts` | Cover store init, absent-root behavior, and corruption diagnostics | ~150 |
| `apps/api/src/store/repositories.test.ts` | Cover basic CRUD flows across the repository helpers | ~190 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/config/app-state-root.ts` | Resolve the SQLite database path and expose non-mutating status helpers | ~60 |
| `apps/api/src/runtime/service-container.ts` | Lazily wire the operational store into the runtime container and cleanup flow | ~80 |
| `apps/api/src/index.ts` | Extend startup diagnostics with store readiness metadata and error summaries | ~70 |
| `apps/api/src/server/startup-status.ts` | Treat store-corruption state as a runtime error without changing read-first boot behavior | ~60 |
| `apps/api/src/server/http-server.test.ts` | Extend runtime tests for store readiness reporting and corrupt-store responses | ~90 |
| `apps/api/package.json` | Add package-level store test and validation aliases | ~12 |
| `apps/api/README_api.md` | Document the operational-store boundary and explicit init behavior | ~25 |
| `package.json` | Add repo-root aliases that run the new store validation path | ~10 |
| `scripts/test-app-bootstrap.mjs` | Keep bootstrap smoke aligned with the store readiness contract and no-mutation rules | ~30 |
| `scripts/test-all.mjs` | Include the new store test path in the quick regression suite | ~20 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] SQLite operational state resolves to one explicit file path under
      `.jobhunt-app/`.
- [ ] Backend code can create, persist, and reload sessions, jobs, approvals,
      and run metadata through typed repository helpers.
- [ ] Startup diagnostics can distinguish ready, absent, and corrupt-store
      states with actionable messages.
- [ ] The store boundary keeps repo-owned workflow artifacts out of SQLite and
      leaves domain files in their existing checked-in locations.

### Testing Requirements

- [ ] Package tests cover schema init, idempotent re-entry, and corrupt-store
      failure mapping.
- [ ] Package tests cover basic create and load flows for the four repository
      helper groups.
- [ ] `npm run app:api:test:store`, `npm run app:api:build`, and
      `npm run app:boot:test` pass after the store integration.

### Non-Functional Requirements

- [ ] Boot diagnostics remain metadata-only and do not create `.jobhunt-app/`
      or the SQLite file as a side effect.
- [ ] Store code stays isolated enough that Session 03 and Session 04 can
      reuse it without direct SQL in runtime orchestration modules.
- [ ] Store failures surface exact path or corruption context instead of
      generic startup errors.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- The existing bootstrap smoke path proves that startup must remain read-first.
  Store inspection must not create `.jobhunt-app/` or a database file just to
  answer `/health` or `/startup`.
- The workspace boundary already knows `.jobhunt-app/` is app-owned. Reuse that
  contract instead of adding special-case path handling for the SQLite file.
- `node:sqlite` is available in the live environment but still experimental in
  Node 24.x. Keep it behind a thin adapter so a future swap does not leak
  through the runtime codebase.

### Potential Challenges

- Store bootstrap drift: schema init can accidentally happen during startup
  diagnostics if the store status path is not kept separate from the init path.
- Overfitting early schema: later job and approval sessions need room to evolve
  state fields without undoing this first migration. Keep the schema minimal
  and aligned to the PRD deliverables.
- Corruption handling: SQLite open failures must preserve the exact file path
  and error cause so users can repair local state without guesswork.

### Relevant Considerations

- [P00] **Prompt and boot contract drift**: extend startup diagnostics without
  breaking the existing smoke harness or payload semantics.
- [P00-apps/api] **Workspace registry coupling**: keep SQLite path ownership
  behind the checked-in workspace and app-state helpers.
- [P00] **Repo-bound startup freshness**: validate store readiness against the
  live repo root, not cached assumptions.
- [P00] **Read-first boot surface**: do not create app state or database files
  during diagnostics and health checks.
- [P00] **Registry-first contracts**: reuse checked-in runtime and path helpers
  instead of embedding new relative-path guesses inside the store layer.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- Boot diagnostics create or modify the operational store while only checking
  readiness, violating the read-first startup contract.
- Repository writes partially succeed across related runtime records and leave
  resumable sessions in inconsistent local state.
- Corrupt, locked, or missing store files collapse into generic runtime errors
  that do not tell the operator what failed or where.

---

## 9. Testing Strategy

### Unit Tests

- Validate app-state path resolution and read-only store status behavior.
- Validate schema bootstrap ordering, idempotent re-entry, and explicit store
  error mapping.
- Validate record serialization and row mapping for the repository helpers.

### Integration Tests

- Create a temp app-state root, initialize the SQLite store, and exercise basic
  create and load flows for sessions, jobs, approvals, and run metadata.
- Start the runtime on an ephemeral port and confirm `/startup` and `/health`
  report store readiness without creating the database when no explicit init
  path has run.
- Seed a corrupt database file and confirm startup surfaces a runtime error
  with actionable diagnostics.

### Manual Testing

- Run `npm run app:api:test:store` from the repo root and confirm the package
  store contract passes.
- Run `npm run app:api:serve` and fetch `/startup` before any explicit store
  initialization to confirm no `.jobhunt-app/` mutation occurs.
- Initialize the store through the package contract path, then rerun
  `npm run app:boot:test` to confirm readiness remains visible and non-mutating.

### Edge Cases

- Missing `.jobhunt-app/` root before first store initialization
- Existing database file at an unexpected path or wrong file type
- Corrupt SQLite contents or a locked database file
- Repeated idempotent writes for the same session, job, approval, or run
  metadata identifier

---

## 10. Dependencies

### External Libraries

- Node standard library `node:sqlite` (experimental in Node `v24.14.0`)
- Existing TypeScript tooling already used by `apps/api`
- No new third-party database dependency expected for this session

### Other Sessions

- **Depends on**: `phase01-session01-api-service-runtime`
- **Depended by**: `phase01-session03-agent-runtime-bootstrap`,
  `phase01-session04-durable-job-runner`,
  `phase01-session05-approval-and-observability-contract`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
