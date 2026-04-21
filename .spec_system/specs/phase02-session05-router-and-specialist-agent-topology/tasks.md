# Task Checklist

**Session ID**: `phase02-session05-router-and-specialist-agent-topology`
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
| Implementation | 4 | 0 | 4 |
| Testing | 4 | 0 | 4 |
| **Total** | **15** | **0** | **15** |

---

## Setup (3 tasks)

The orchestration layer needs a typed contract, a specialist catalog, and a
registry-backed tool-scope boundary before any routing logic can land.

### apps/api

- [x] T001 [S0205] Create orchestration contracts and exports for specialist
      ids, route statuses, session-launch requests, and handoff envelopes with
      types matching declared contract and exhaustive enum handling
      (`apps/api/src/orchestration/orchestration-contract.ts`,
      `apps/api/src/orchestration/index.ts`)
- [x] T002 [S0205] Create the initial specialist catalog and registry-backed
      tool-scope helpers with denied/restricted/revoked handling and fallback
      behavior (`apps/api/src/orchestration/specialist-catalog.ts`,
      `apps/api/src/orchestration/tool-scope.ts`)
- [x] T003 [S0205] Extend the tool-registry contract with deterministic
      specialist-scoped catalog filtering and missing-tool validation with
      bounded pagination, validated filters, and deterministic ordering
      (`apps/api/src/tools/tool-contract.ts`,
      `apps/api/src/tools/tool-registry.ts`)

---

## Foundation (4 tasks)

Core routing and session lifecycle behavior for the new backend orchestration
surface.

### apps/api

- [x] T004 [S0205] Implement the workflow router that resolves explicit
      workflow requests and resume requests into one specialist selection with
      schema-validated input and explicit error mapping
      (`apps/api/src/orchestration/workflow-router.ts`)
- [x] T005 [S0205] Implement session lifecycle helpers for create-or-resume
      flows with idempotency protection, transaction boundaries, and
      compensation on failure
      (`apps/api/src/orchestration/session-lifecycle.ts`)
- [x] T006 [S0205] Implement the orchestration service bootstrap path that
      loads prompt bundles and filtered specialist tool catalogs for new
      sessions with timeout, retry/backoff, and failure-path handling
      (`apps/api/src/orchestration/orchestration-service.ts`)
- [x] T007 [S0205] Implement the resume-path orchestration flow that surfaces
      active jobs, pending approvals, completed-state summaries, and
      deterministic tooling-gap outcomes with state reset or revalidation on
      re-entry (`apps/api/src/orchestration/orchestration-service.ts`)

---

## Implementation (4 tasks)

Shared-runtime wiring, docs, and contract updates needed for later UX phases.

### apps/api

- [x] T008 [S0205] Wire the orchestration service into the shared runtime
      container and expose one reusable backend-owned entrypoint with cleanup
      on scope exit for all acquired resources
      (`apps/api/src/runtime/service-container.ts`,
      `apps/api/src/orchestration/index.ts`)
- [x] T009 [S0205] Update API package validation commands and package guide for
      the orchestration surface, specialist topology, and deterministic
      blocked-state semantics (`apps/api/package.json`,
      `apps/api/README_api.md`)
- [x] T010 [S0205] [P] Add specialist-catalog and tool-scope tests for
      workflow coverage, allowed-tool filtering, and drift guardrails with
      denied/restricted/revoked handling and fallback behavior
      (`apps/api/src/orchestration/specialist-catalog.test.ts`,
      `apps/api/src/orchestration/tool-scope.test.ts`)
- [x] T011 [S0205] [P] Add workflow-router and session-lifecycle tests for
      resume precedence, stored-state summarization, and deterministic blocked
      outcomes with schema-validated input and explicit error mapping
      (`apps/api/src/orchestration/workflow-router.test.ts`,
      `apps/api/src/orchestration/session-lifecycle.test.ts`)

---

## Testing (4 tasks)

Verification and regression coverage for the new orchestration contract.

### apps/api

- [x] T012 [S0205] [P] Add orchestration-service tests for session creation,
      session reuse, filtered prompt bootstrap, and active approval summaries
      with cleanup on scope exit for all acquired resources
      (`apps/api/src/orchestration/orchestration-service.test.ts`)
- [x] T013 [S0205] [P] Extend service-container and tool-registry tests for
      default orchestration registration, specialist-scoped catalog access, and
      deterministic ordering (`apps/api/src/runtime/service-container.test.ts`,
      `apps/api/src/tools/tool-registry.test.ts`)

### repo root

- [x] T014 [S0205] [P] Update quick-suite coverage for the new orchestration
      files and API runtime validation path with deterministic ordering
      (`scripts/test-all.mjs`)
- [x] T015 [S0205] Run build plus tools and runtime regressions, then verify
      ASCII-only session deliverables with state reset or revalidation on
      re-entry (`apps/api/src/orchestration/`, `apps/api/src/runtime/`,
      `apps/api/src/tools/`, `scripts/test-all.mjs`)

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

Run the `implement` workflow step to begin AI-led implementation. After a
successful `plansession` run, `implement` is always the next workflow command.
