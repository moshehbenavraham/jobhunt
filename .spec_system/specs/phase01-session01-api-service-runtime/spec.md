# Session Specification

**Session ID**: `phase01-session01-api-service-runtime`
**Phase**: 01 - Backend Runtime and Job Infrastructure
**Status**: Complete
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Phase 00 proved that the app can inspect the live repo, expose startup
diagnostics, and render those diagnostics in the web shell without mutating
user-layer files. What is still missing is a real API runtime inside
`apps/api`: one process-owned server surface with typed routes, explicit
lifecycle control, and shared backend service boundaries that later sessions
can extend without copying boot logic.

This session turns the current boot server into that runtime foundation. The
work should introduce a small composition root for backend services, define a
typed route contract for the existing boot endpoints, and keep startup,
shutdown, timeout, and error behavior explicit instead of embedding them in ad
hoc server branches. The current `/health` and `/startup` behaviors stay
read-first and stable, but they move behind reusable route modules and runtime
services.

This is the correct next session because it is the only unblocked Phase 01
candidate in the authoritative project analysis, and every later backend
session depends on having one clear API runtime entrypoint in `apps/api`
before SQLite, agent bootstrap, jobs, approvals, or observability are added.

---

## 2. Objectives

1. Establish one explicit API runtime entrypoint in `apps/api` with typed
   route registration for current and future backend endpoints.
2. Introduce a shared service container and runtime configuration boundary that
   later sessions can extend for SQLite, auth, and job orchestration work.
3. Preserve the existing health and startup diagnostics as read-first route
   handlers with explicit request and error contracts.
4. Add deterministic smoke and regression coverage that proves startup and
   shutdown remain local, inspectable, and non-mutating.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase00-session01-monorepo-app-skeleton` - provides the app workspace
      layout, package manifests, and repo-root command surface.
- [x] `phase00-session02-workspace-adapter-contract` - provides registry-driven
      repo boundary classification and guarded workspace access.
- [x] `phase00-session03-prompt-loading-contract` - provides checked-in prompt
      routing, composition, and freshness-aware loading behavior.
- [x] `phase00-session04-boot-path-and-validation` - provides the current boot
      server, startup payload contract, and repo-level bootstrap smoke path.

### Required Tools/Knowledge

- `AGENTS.md` startup checklist and read-first repo contract rules
- `.spec_system/CONVENTIONS.md` for Node ESM structure, validation, and script
  expectations
- Existing diagnostics exports in `apps/api/src/index.ts`
- Existing boot server behavior in `apps/api/src/server/`

### Environment Requirements

- Node.js and npm installed for the workspace
- Write access to `apps/api/`, `scripts/`, and `.spec_system/`
- A live repo clone available for local boot and smoke validation
- User-layer files treated as read-only inputs during runtime startup

---

## 4. Scope

### In Scope (MVP)

- Operator-facing API runtime can boot from `apps/api` through one explicit
  server entrypoint with startup and shutdown handled in package-owned code.
- Backend modules can register typed routes and reuse shared runtime services
  instead of embedding workspace and prompt wiring in individual handlers.
- Existing `/health` and `/startup` endpoints can preserve their current
  read-first semantics while conforming to the new request, response, and
  error contract.
- Maintainer can run deterministic package and repo smoke checks that prove
  the API boots locally without mutating repo-owned user data.

### Out of Scope (Deferred)

- SQLite schema design, app-owned repositories, or new `.jobhunt-app/`
  persistence behavior - *Reason: Session 02 owns the operational store.*
- OpenAI runtime auth bootstrap, provider wiring, or prompt-driven agent
  execution - *Reason: Session 03 owns backend runtime bootstrap.*
- Background queueing, retries, resumable runs, or approval pause points -
  *Reason: Sessions 04 and 05 own jobs, approvals, and observability.*

---

## 5. Technical Approach

### Architecture

Keep the current diagnostics logic as domain behavior and wrap it in a real API
runtime boundary. `apps/api/src/index.ts` should remain the source of one-shot
startup diagnostics, but the long-lived server should consume those diagnostics
through a shared service container rather than importing and branching ad hoc
inside the request handler.

Introduce a small runtime layer for validated config and service construction,
then split the server into typed route contracts, route modules, a central
registry, and a dispatcher. The dispatcher remains thin: method and path
matching, rate limiting, response serialization, timeout handling, and error
mapping. The health and startup routes become the first registry-backed
handlers, which gives later sessions a stable place to attach runtime-specific
endpoints without changing the whole server shape again.

Validation should reuse the existing repo-owned smoke harness. Package tests
should prove route behavior, failure mapping, and lifecycle handling, while
the repo-level bootstrap smoke confirms that the real API runtime still boots
against a live repo clone and keeps startup metadata-only.

### Design Patterns

- Composition root: create runtime services once per process and pass them to
  route handlers explicitly.
- Typed route registry: define method, path, handler, and error behavior in a
  central contract instead of hardcoded `if` branches.
- Read-first diagnostics reuse: keep startup payload generation behind the
  existing workspace and prompt contracts.
- Explicit lifecycle ownership: server startup, shutdown, and resource cleanup
  stay in one place and remain testable.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Node standard library `http`, `net`, and `url`
- Existing workspace and prompt modules in `apps/api/src/`
- Existing repo validation scripts in `scripts/`

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/runtime/runtime-config.ts` | Validate and normalize API host, port, and timeout settings | ~90 |
| `apps/api/src/runtime/service-container.ts` | Build shared runtime services for diagnostics and future backend modules | ~130 |
| `apps/api/src/server/route-contract.ts` | Define typed route, request context, and JSON error helpers | ~120 |
| `apps/api/src/server/routes/health-route.ts` | Implement the health endpoint as a typed route module | ~80 |
| `apps/api/src/server/routes/startup-route.ts` | Implement the startup endpoint as a typed route module | ~90 |
| `apps/api/src/server/routes/index.ts` | Register current boot routes in deterministic order | ~60 |
| `apps/api/src/runtime/runtime-config.test.ts` | Cover invalid config and default normalization | ~80 |
| `apps/api/src/runtime/service-container.test.ts` | Cover service creation and repeated runtime reuse assumptions | ~90 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/index.ts` | Expose diagnostics behavior in a service-container-friendly way without duplicating repo logic | ~50 |
| `apps/api/src/server/http-server.ts` | Replace hardcoded route branching with typed dispatch, shared errors, and runtime services | ~180 |
| `apps/api/src/server/index.ts` | Use runtime config, lifecycle wiring, and graceful shutdown around the real API runtime | ~70 |
| `apps/api/src/server/http-server.test.ts` | Expand route and no-mutation coverage for the new runtime boundary | ~120 |
| `apps/api/package.json` | Add explicit runtime test aliases for the package | ~12 |
| `apps/api/README_api.md` | Document the new runtime boundary and local smoke path | ~25 |
| `package.json` | Add or adjust repo-root aliases for the real API runtime entrypoint | ~10 |
| `scripts/test-app-bootstrap.mjs` | Assert the repo smoke path starts the real API runtime entrypoint | ~40 |
| `scripts/test-all.mjs` | Keep the quick suite aligned with the runtime contract and new test files | ~20 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] The API can boot as a local service through one explicit runtime
      entrypoint with clear startup and shutdown handling.
- [ ] Health and startup diagnostics remain structured and read-first after
      moving behind typed route modules.
- [ ] Future runtime modules have one clear service container and route
      registry to extend instead of ad hoc server glue.
- [ ] Unsupported routes and methods return an explicit, stable error
      contract.

### Testing Requirements

- [ ] Package tests cover typed route dispatch, method handling, failure
      mapping, and graceful shutdown behavior.
- [ ] `npm run app:api:check`, `npm run app:api:build`, and
      `npm run app:boot:test` pass after the runtime refactor.
- [ ] Manual smoke testing confirms `npm run app:api:serve` starts and stops
      cleanly from the repo root.

### Non-Functional Requirements

- [ ] Startup remains metadata-only and does not write user-layer files.
- [ ] Runtime config and service wiring stay small enough for later sessions to
      extend without another server rewrite.
- [ ] Existing web bootstrap consumers keep a stable `/health` and `/startup`
      contract.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- Session 04 already proved the boot surface; this session should generalize
  that server shape, not replace the startup contract with a parallel runtime.
- The workspace adapter and prompt loader are the authoritative sources for
  repo state. Runtime services should consume those modules rather than
  rebuilding path logic or prompt resolution.
- The runtime boundary should stay deliberately narrow. This session should
  make Session 02 and later easier, not pre-implement SQLite, jobs, or auth.

### Potential Challenges

- Boot-contract drift: moving to typed routes can accidentally change payload
  shape or status semantics. Reuse the existing serializers and smoke tests.
- Lifecycle leaks: if startup and shutdown are spread across files, later job
  runner work will inherit brittle server state. Keep process ownership in one
  entrypoint.
- Hidden writes: service setup may be tempted to create state roots or other
  files. Keep startup strictly read-first and assert that in tests.

### Relevant Considerations

- [P00] **Prompt and boot contract drift**: keep the runtime refactor aligned
  with the existing bootstrap smoke and startup payload expectations.
- [P00-apps/api] **Workspace registry coupling**: keep repo reads behind the
  checked-in workspace adapter and surface registry.
- [P00] **Repo-bound startup freshness**: runtime checks must reflect the live
  required-file contract instead of stale cached assumptions.
- [P00] **Read-first boot surface**: diagnostics and health paths must remain
  metadata-only and avoid hidden writes or stdout scraping.
- [P00] **Registry-first contracts**: future route handlers should reuse
  checked-in registries and prompt routing rather than duplicate path logic.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- The runtime accepts unsupported methods or routes without a stable error
  payload, making later API expansion harder to debug.
- Service setup or route handlers bypass the workspace registry and mutate
  repo-owned surfaces during startup checks.
- Server restart and shutdown behavior leaks listeners or ports, which would
  make later job-runner sessions unreliable.

---

## 9. Testing Strategy

### Unit Tests

- Validate runtime config parsing and explicit failure messages for invalid
  host, port, and timeout input.
- Validate service-container construction and reuse assumptions for current
  diagnostics services.
- Validate route dispatch and JSON error helpers in the server boundary.

### Integration Tests

- Start the API on an ephemeral port and fetch `/health` plus `/startup`
  through the package tests and repo smoke harness.
- Validate `HEAD`, `404`, `405`, and repo-root failure behavior against the
  real runtime entrypoint.

### Manual Testing

- Run `npm run app:api:serve` from the repo root and confirm the process starts
  cleanly, serves boot diagnostics, and exits cleanly on `Ctrl+C`.
- Confirm the existing web bootstrap path still reads the startup payload from
  the API after the runtime refactor.

### Edge Cases

- Invalid `JOBHUNT_API_PORT` or timeout environment values
- Unsupported route or method requests
- Repo-root override outside the expected workspace root
- Repeated start and stop cycles on the same machine during local development

---

## 10. Dependencies

### External Libraries

- None expected beyond the existing workspace dependencies
- Node standard library HTTP primitives
- Existing TypeScript tooling already used by `apps/api`

### Other Sessions

- **Depends on**: `phase00-session01-monorepo-app-skeleton`,
  `phase00-session02-workspace-adapter-contract`,
  `phase00-session03-prompt-loading-contract`,
  `phase00-session04-boot-path-and-validation`
- **Depended by**: `phase01-session02-sqlite-operational-store`,
  `phase01-session03-agent-runtime-bootstrap`,
  `phase01-session04-durable-job-runner`,
  `phase01-session05-approval-and-observability-contract`

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
