# Task Checklist

**Session ID**: `phase01-session03-agent-runtime-bootstrap`
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

Package manifests and runtime bootstrap contracts.

### apps/api

- [x] T001 [S0103] Update the API workspace and repo-root manifests with
      explicit agent-runtime test and validation aliases
      (`apps/api/package.json`, `package.json`)
- [x] T002 [S0103] [P] Create typed agent-runtime contracts for auth
      readiness, prompt bootstrap summaries, and runtime bootstrap errors
      (`apps/api/src/agent-runtime/agent-runtime-contract.ts`)
- [x] T003 [S0103] [P] Create agent-runtime config parsing for auth path, base
      URL, originator, and model overrides with explicit invalid-value errors
      (`apps/api/src/agent-runtime/agent-runtime-config.ts`)

---

## Foundation (4 tasks)

Core adapter and bootstrap modules.

### apps/api

- [x] T004 [S0103] Create the repo-owned auth and provider adapter with typed
      dynamic imports, readiness mapping, and no `OPENAI_API_KEY` fallback
      (`apps/api/src/agent-runtime/openai-account-provider.ts`)
- [x] T005 [S0103] [P] Create shared fake Codex backend and auth fixture
      helpers for deterministic package tests
      (`apps/api/src/agent-runtime/test-utils.ts`)
- [x] T006 [S0103] [P] Create the agent-runtime barrel and public bootstrap
      surface for later runner integration (`apps/api/src/agent-runtime/index.ts`)
- [x] T007 [S0103] Create the agent-runtime service that loads checked-in
      prompt bundles and prepares authenticated agent execution dependencies
      with explicit loading, missing, empty, and auth-required states
      (`apps/api/src/agent-runtime/agent-runtime-service.ts`)

---

## Implementation (5 tasks)

Main runtime integration and diagnostics wiring.

### apps/api

- [x] T008 [S0103] Update the API service container to lazily create, cache,
      and dispose the agent runtime service with cleanup on scope exit for all
      acquired resources (`apps/api/src/runtime/service-container.ts`)
- [x] T009 [S0103] Update startup diagnostics to expose agent-runtime
      readiness, auth-path context, and current session metadata without
      hidden writes during boot (`apps/api/src/index.ts`)
- [x] T010 [S0103] Update startup status mapping to surface actionable
      auth-required, invalid-auth, and prompt-failure guidance with explicit
      error mapping (`apps/api/src/server/startup-status.ts`)
- [x] T011 [S0103] Update the API package guide with the agent bootstrap
      contract and canonical validation flow (`apps/api/README_api.md`)
- [x] T012 [S0103] [P] Create config and auth-adapter coverage for missing,
      invalid, expired, and ready credential states plus provider overrides
      (`apps/api/src/agent-runtime/agent-runtime-config.test.ts`,
      `apps/api/src/agent-runtime/openai-account-provider.test.ts`)

---

## Testing (3 tasks)

Verification and repo-smoke coverage for the authenticated runtime path.

### apps/api

- [x] T013 [S0103] [P] Create bootstrap service coverage for supported and
      unsupported workflows plus fake-backend agent run setup
      (`apps/api/src/agent-runtime/agent-runtime-service.test.ts`)
- [x] T014 [S0103] Update service-container and startup-route coverage to
      assert agent-runtime caching, readiness summaries, and no-mutation boot
      behavior (`apps/api/src/runtime/service-container.test.ts`,
      `apps/api/src/server/http-server.test.ts`)

### repo root

- [x] T015 [S0103] Update repo bootstrap and quick-suite coverage to include
      the agent-runtime contract path (`scripts/test-app-bootstrap.mjs`,
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
