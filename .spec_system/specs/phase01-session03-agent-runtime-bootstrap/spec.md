# Session Specification

**Session ID**: `phase01-session03-agent-runtime-bootstrap`
**Phase**: 01 - Backend Runtime and Job Infrastructure
**Status**: Not Started
**Created**: 2026-04-21
**Package**: apps/api
**Package Stack**: TypeScript Node

---

## 1. Session Overview

Session 01 established the long-lived API runtime and Session 02 added the
SQLite operational store that later background work will reuse. The next
missing backend foundation is an authenticated agent-runtime bootstrap inside
`apps/api`. The repo already owns the OpenAI account-auth flow, Codex
transport, and smoke harnesses under `scripts/lib/openai-account-auth/`, but
the API package does not yet expose one reusable runtime surface that can load
checked-in prompts and create authenticated agent execution state.

This session adds that missing boundary. The work should introduce a
package-local `agent-runtime` module that resolves the repo-owned auth and
provider helpers through a typed adapter, loads workflow prompt bundles through
the existing prompt contract, and exposes a reusable bootstrap service that
later job and tool sessions can call without duplicating prompt or auth logic.

This is the correct next session because the authoritative analyzer shows
Session 03 as the first incomplete candidate in Phase 01, Session 04 depends
on it directly, and Session 05 depends on Session 04. Completing the
authenticated runtime bootstrap now gives later durable-job and approval work
one clear execution surface instead of forcing those sessions to invent their
own provider and prompt wiring.

---

## 2. Objectives

1. Reuse the repo-owned OpenAI account-auth and Agents SDK provider stack from
   `scripts/lib/openai-account-auth/` through a typed `apps/api` adapter.
2. Create one backend-owned agent-runtime bootstrap service that loads
   checked-in prompt bundles and prepares authenticated agent execution
   dependencies for later jobs and typed tools.
3. Extend startup diagnostics with deterministic authenticated-runtime
   readiness reporting, including actionable auth and prompt failure details,
   without hidden writes or an `OPENAI_API_KEY`-only fallback path.
4. Add package and repo validation coverage for missing, invalid, expired, and
   ready auth states plus a fake-backend agent bootstrap smoke path.

---

## 3. Prerequisites

### Required Sessions

- [x] `phase01-session01-api-service-runtime` - provides the long-lived API
      server, runtime config boundary, typed routes, and service container.
- [x] `phase01-session02-sqlite-operational-store` - provides the operational
      store boundary and current startup diagnostics contract extended here.
- [x] `phase00-session03-prompt-loading-contract` - provides checked-in prompt
      routing, composition, and freshness-aware loading that this runtime must
      reuse.

### Required Tools/Knowledge

- `.spec_system/CONVENTIONS.md` for TypeScript Node structure, validation, and
  deterministic script behavior
- `.spec_system/CONSIDERATIONS.md` for read-first boot, registry-first
  contracts, and repo-freshness constraints
- Repo-owned auth and provider helpers in
  `scripts/lib/openai-account-auth/index.mjs`
- Existing smoke harnesses `scripts/openai-agents-codex-smoke.mjs` and
  `scripts/test-openai-agents-provider.mjs`
- Current prompt-loader modules in `apps/api/src/prompt/`

### Environment Requirements

- Node.js workspace dependencies installed from the repo root
- `@openai/agents` available through the existing workspace install
- A stored auth file at `data/openai-account-auth.json` or an explicit
  override path for test fixtures
- Local loopback networking available for fake Codex backend tests

---

## 4. Scope

### In Scope (MVP)

- Backend runtime can inspect stored OpenAI account auth readiness and provider
  configuration through a typed adapter that reuses the repo-owned `.mjs`
  auth stack.
- Backend services can load checked-in prompt bundles by workflow and create a
  reusable authenticated runtime bootstrap surface for later runner and tool
  work.
- Startup diagnostics can expose agent-runtime readiness, auth-path context,
  and prompt readiness without hidden writes and without relying on an
  `OPENAI_API_KEY`-only execution path.
- Maintainer can run deterministic package and repo smoke checks that cover
  missing, invalid, expired, and ready auth states plus fake-backend agent
  bootstrap behavior.

### Out of Scope (Deferred)

- Workflow-specific typed tools, tool wrappers, or tool-registration logic -
  *Reason: Phase 02 owns typed tool and orchestration expansion.*
- Durable queue execution, retries, resume state machines, or side-effect
  recovery - *Reason: Session 04 owns the durable job runner.*
- Approval pause or resume behavior and trace correlation - *Reason: Session
  05 owns approval semantics and observability.*
- UI login or onboarding flows for OpenAI account setup - *Reason: Phase 03
  owns chat, onboarding, and approvals UX.*

---

## 5. Technical Approach

### Architecture

Create a package-local `apps/api/src/agent-runtime/` boundary that owns typed
runtime bootstrap behavior for authenticated agent execution. This layer
should not reimplement OAuth, token storage, Codex transport, or the Agents
provider. Instead, it should dynamically resolve the checked-in
`scripts/lib/openai-account-auth/index.mjs` entrypoint from the repo root and
wrap it in narrow TypeScript-owned adapter functions and summaries.

Split the new boundary into three concerns. First, an agent-runtime config
module should normalize auth path, base URL, originator, and model overrides
for backend use. Second, an auth-provider adapter should inspect stored auth
status, map missing or invalid credentials into typed readiness summaries, and
create the reusable OpenAI Codex provider configuration path. Third, an
agent-runtime service should combine prompt loading with the provider adapter
to expose one bootstrap surface for later sessions, rather than scattering
prompt loading and provider setup across jobs, routes, or tools.

Startup diagnostics should remain read-first and available even when the agent
runtime is not ready yet. Extend `apps/api/src/index.ts` and
`apps/api/src/server/startup-status.ts` to surface agent-runtime readiness as
structured diagnostics with actionable guidance, but do not refresh auth or
write credentials during boot. The service container should own provider
lifecycle and cleanup so repeated test or runtime creation does not leak
cached model state.

### Design Patterns

- Typed dynamic-import adapter: resolve the repo-owned `.mjs` auth module at
  runtime and expose only narrowed TypeScript-safe shapes to `apps/api`.
- Readiness-first diagnostics: separate "server is booted" from "authenticated
  agent runtime is ready" so the UI can surface repair guidance without
  losing the diagnostics route.
- Prompt-contract reuse: keep workflow instructions sourced from the existing
  prompt loader and composed prompt bundle, not a parallel runtime prompt
  path.
- Explicit provider lifecycle: create, cache, and dispose provider state in
  the service container so repeated runs stay deterministic.

### Technology Stack

- TypeScript Node ESM in `apps/api`
- Existing workspace dependency `@openai/agents`
- Repo-owned OpenAI account-auth and provider helpers in `scripts/lib/`
- Existing prompt-loader and runtime-container modules in `apps/api/src/`
- Node standard library HTTP utilities for fake-backend tests

---

## 6. Deliverables

### Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `apps/api/src/agent-runtime/agent-runtime-contract.ts` | Define auth readiness, prompt bootstrap, and runtime error shapes | ~140 |
| `apps/api/src/agent-runtime/agent-runtime-config.ts` | Normalize auth path, base URL, originator, and model overrides | ~90 |
| `apps/api/src/agent-runtime/openai-account-provider.ts` | Wrap the repo-owned auth/provider `.mjs` module in a typed adapter | ~180 |
| `apps/api/src/agent-runtime/agent-runtime-service.ts` | Load prompt bundles and prepare authenticated agent runtime state | ~200 |
| `apps/api/src/agent-runtime/index.ts` | Export the public agent-runtime surface | ~30 |
| `apps/api/src/agent-runtime/test-utils.ts` | Provide fake Codex backend and auth fixture helpers for tests | ~120 |
| `apps/api/src/agent-runtime/agent-runtime-config.test.ts` | Cover config parsing and invalid override handling | ~90 |
| `apps/api/src/agent-runtime/openai-account-provider.test.ts` | Cover auth readiness mapping and provider bootstrap against a fake backend | ~180 |
| `apps/api/src/agent-runtime/agent-runtime-service.test.ts` | Cover workflow prompt loading and authenticated bootstrap behavior | ~200 |

### Files to Modify

| File | Changes | Est. Lines |
|------|---------|------------|
| `apps/api/src/runtime/service-container.ts` | Lazily create and dispose the agent runtime service alongside existing services | ~70 |
| `apps/api/src/runtime/service-container.test.ts` | Verify agent runtime caching and cleanup behavior | ~80 |
| `apps/api/src/index.ts` | Extend startup diagnostics with agent-runtime readiness and current session metadata | ~90 |
| `apps/api/src/server/startup-status.ts` | Surface actionable agent-runtime readiness messaging without breaking boot payload stability | ~80 |
| `apps/api/src/server/http-server.test.ts` | Assert startup and health payloads report agent runtime readiness | ~110 |
| `apps/api/package.json` | Add package-level agent-runtime test and validation aliases | ~12 |
| `apps/api/README_api.md` | Document agent bootstrap boundaries and validation commands | ~30 |
| `package.json` | Add repo-root aliases that run the agent-runtime contract path | ~12 |
| `scripts/test-app-bootstrap.mjs` | Extend repo bootstrap smoke coverage for agent runtime readiness | ~40 |
| `scripts/test-all.mjs` | Include the new agent-runtime validation path in the quick regression suite | ~25 |

---

## 7. Success Criteria

### Functional Requirements

- [ ] The backend can inspect stored OpenAI account auth and create an
      authenticated runtime bootstrap without an `OPENAI_API_KEY`-only path.
- [ ] Prompt composition for workflow execution continues to use the checked-in
      source order from the existing prompt contract.
- [ ] Startup diagnostics surface ready, missing, invalid, or expired auth
      states with exact path context and actionable next steps.
- [ ] The service container exposes one reusable agent runtime surface for
      later durable-job and typed-tool sessions.

### Testing Requirements

- [ ] Package tests cover config parsing, auth readiness mapping, fake-backend
      provider bootstrap, and workflow prompt-loading behavior.
- [ ] `npm run app:api:test:agent-runtime`, `npm run app:api:build`, and
      `npm run app:boot:test` pass after the runtime bootstrap work.
- [ ] The repo quick suite stays green with the added agent-runtime contract
      coverage.

### Non-Functional Requirements

- [ ] Boot diagnostics remain read-first and do not mutate user-layer files or
      stored auth credentials.
- [ ] The auth/provider bridge stays inside `apps/api` as one narrow adapter
      instead of ad hoc imports from repo scripts.
- [ ] Runtime readiness failures preserve exact auth-path or prompt-cause
      context instead of collapsing into generic startup errors.

### Quality Gates

- [ ] All files ASCII-encoded
- [ ] Unix LF line endings
- [ ] Code follows project conventions

---

## 8. Implementation Notes

### Key Considerations

- The repo already owns OAuth, token storage, Codex transport, and the Agents
  provider glue under `scripts/lib/openai-account-auth/`. Reuse that code
  through one adapter instead of reimplementing auth or transport logic.
- `data/openai-account-auth.json` remains user-layer data. The API runtime may
  inspect readiness, but it must not refresh, rewrite, or migrate auth
  credentials during boot diagnostics.
- `configureDefaultOpenAICodexModelProvider` sets process-global provider
  state. Keep that behavior behind one explicit bootstrap service and pair it
  with deterministic cleanup in the container lifecycle.

### Potential Challenges

- Strict TypeScript boundary: the repo-owned auth module is `.mjs` and not part
  of the `apps/api` source tree. Use typed dynamic imports and narrowed
  adapter contracts instead of loose cross-package imports.
- Readiness ambiguity: startup may be healthy while auth is missing, invalid,
  or expired. Expose agent-runtime readiness separately and provide clear
  repair guidance without hiding the diagnostics route.
- Provider state leakage: repeated tests or service-container creation can
  retain cached provider or model state unless cleanup is explicit.

### Relevant Considerations

- [P00] **Prompt and boot contract drift**: extend startup diagnostics without
  breaking the existing smoke harness or payload expectations.
- [P00-apps/api] **Workspace registry coupling**: resolve auth and script paths
  through existing repo-path helpers rather than embedding new relative-path
  guesses.
- [P00] **Repo-bound startup freshness**: inspect the live stored auth status
  and prompt sources instead of relying on cached startup assumptions.
- [P00] **Read-first boot surface**: do not create app state, refresh auth, or
  write credentials during `/health` or `/startup`.
- [P00] **Registry-first contracts**: reuse checked-in prompt routing and the
  repo-owned auth/provider stack instead of adding a parallel runtime-only
  bootstrap path.

### Behavioral Quality Focus

Checklist active: Yes

Top behavioral risks for this session:

- Startup reports the agent runtime as ready even when stored auth is missing,
  invalid, or expired.
- The runtime accepts unsupported workflows or missing prompt bundles and fails
  later without explicit error mapping.
- Provider or model state leaks across repeated container creation and causes
  re-entry drift in tests or local runtime restarts.

---

## 9. Testing Strategy

### Unit Tests

- Validate agent-runtime config parsing for auth path, base URL, originator,
  and model overrides.
- Validate auth readiness mapping for missing, invalid, expired, and ready
  stored credentials.
- Validate workflow prompt-loading behavior and explicit unsupported-workflow
  error handling in the bootstrap service.

### Integration Tests

- Start a fake local Codex backend, seed stored auth credentials, and confirm
  the agent-runtime bootstrap can prepare an authenticated run against the
  fake server.
- Start the API runtime and confirm `/startup` and `/health` surface
  agent-runtime readiness without mutating the auth file or other user-layer
  content.
- Remove or corrupt the auth file and confirm diagnostics surface actionable
  runtime-readiness guidance while the base diagnostics route remains
  available.

### Manual Testing

- Run `npm run app:api:test:agent-runtime` from the repo root and confirm the
  package agent-runtime contract passes.
- Run `npm run agents:codex:smoke -- --json` with valid auth and confirm the
  repo-owned smoke path still works against the same provider assumptions.
- Run `npm run app:api:serve` and fetch `/startup` to confirm the payload
  includes agent-runtime readiness and current session metadata.

### Edge Cases

- Missing `data/openai-account-auth.json`
- Invalid or expired stored auth credentials
- Unsupported workflow names or missing required prompt sources
- Base URL, auth-path, or model overrides that conflict with the repo-owned
  defaults
- Repeated service-container creation and disposal within the same process

---

## 10. Dependencies

### External Libraries

- Existing workspace dependency `@openai/agents`
- Repo-owned auth/provider helpers in `scripts/lib/openai-account-auth/`
- Node standard library HTTP and URL utilities for local fake-backend tests
- No new third-party runtime dependency expected for this session

### Other Sessions

- **Depends on**: `phase00-session03-prompt-loading-contract`,
  `phase01-session01-api-service-runtime`,
  `phase01-session02-sqlite-operational-store`
- **Depended by**: `phase01-session04-durable-job-runner` and the later
  Phase 02 typed-tool and orchestration sessions

---

## Next Steps

Run the implement workflow step to begin AI-led implementation.
