# Task Checklist

**Session ID**: `phase02-session01-tool-registry-and-execution-policy`
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

| Category       | Total  | Done | Remaining |
| -------------- | ------ | ---- | --------- |
| Setup          | 3      | 3    | 0         |
| Foundation     | 4      | 4    | 0         |
| Implementation | 5      | 5    | 0         |
| Testing        | 4      | 4    | 0         |
| **Total**      | **16** | **16** | **0**   |

---

## Setup (3 tasks)

Typed tool package scaffolding and package-level validation entrypoints.

### apps/api

- [x] T001 [S0201] Update the API workspace and repo-root manifests with tool
      test and validation aliases (`apps/api/package.json`, `package.json`)
- [x] T002 [S0201] [P] Create typed tool contracts and error taxonomy for tool
      definitions, permission policy, invocation envelopes, and deterministic
      failure codes (`apps/api/src/tools/tool-contract.ts`,
      `apps/api/src/tools/tool-errors.ts`)
- [x] T003 [S0201] [P] Create the tool registry and package exports with
      duplicate-safe registration, deterministic catalog ordering, and types
      matching the declared contract (`apps/api/src/tools/tool-registry.ts`,
      `apps/api/src/tools/index.ts`)

---

## Foundation (4 tasks)

Shared adapter and policy primitives that later tool suites will reuse.

### apps/api

- [x] T004 [S0201] Extend workspace types and errors with tool-facing mutation
      policy, approval hints, and deterministic denial detail
      (`apps/api/src/workspace/workspace-types.ts`,
      `apps/api/src/workspace/workspace-errors.ts`)
- [x] T005 [S0201] Update workspace contract and boundary helpers with
      explicit mutation-policy classification for future onboarding, tracker,
      and artifact tool writes with authorization enforced at the boundary
      closest to the resource (`apps/api/src/workspace/workspace-contract.ts`,
      `apps/api/src/workspace/workspace-boundary.ts`)
- [x] T006 [S0201] [P] Refactor workspace write helpers into adapter-safe
      atomic primitives with cleanup on scope exit for all acquired resources
      and state reset or revalidation on re-entry
      (`apps/api/src/workspace/workspace-write.ts`)
- [x] T007 [S0201] [P] Create constrained script-execution and
      workspace-mutation adapters with schema-validated input, timeout,
      retry-backoff, and failure-path handling plus compensation on failure
      (`apps/api/src/tools/script-execution-adapter.ts`,
      `apps/api/src/tools/workspace-mutation-adapter.ts`)

---

## Implementation (5 tasks)

Runtime composition, execution policy, and observability integration.

### apps/api

- [x] T008 [S0201] Extend runtime event typing for tool lifecycle events and
      tool-correlation metadata so execution remains observable through the
      existing diagnostics path (`apps/api/src/store/store-contract.ts`)
- [x] T009 [S0201] Create the tool execution service for schema-validated
      input, permission checks, approval routing, and deterministic result
      envelopes with duplicate-trigger prevention while in-flight
      (`apps/api/src/tools/tool-execution-service.ts`)
- [x] T010 [S0201] [P] Create tool test utilities and fixture helpers for
      script, workspace, approval, and observability harness setup
      (`apps/api/src/tools/test-utils.ts`)
- [x] T011 [S0201] Update the service container to lazily compose the tools
      surface with shared workspace, approval-runtime, and observability
      services with cleanup on scope exit for all acquired resources
      (`apps/api/src/runtime/service-container.ts`)
- [x] T012 [S0201] Update the API package guide and repo quick-suite hooks for
      the typed tool-contract validation path and backend-owned execution
      policy (`apps/api/README_api.md`, `scripts/test-all.mjs`)

---

## Testing (4 tasks)

Verification and regression coverage for registry, adapters, and runtime
composition.

### apps/api

- [x] T013 [S0201] [P] Create tool registry and execution-service coverage for
      duplicate registration, schema validation, permission denials,
      approval-required flows, and explicit error mapping
      (`apps/api/src/tools/tool-registry.test.ts`,
      `apps/api/src/tools/tool-execution-service.test.ts`)
- [x] T014 [S0201] [P] Create adapter coverage for allowlisted script
      dispatch, subprocess timeouts, protected-path denials, atomic writes,
      and retry-safe failure cleanup
      (`apps/api/src/tools/script-execution-adapter.test.ts`,
      `apps/api/src/tools/workspace-mutation-adapter.test.ts`)
- [x] T015 [S0201] Update service-container coverage for tool-surface reuse,
      dependency wiring, and disposal semantics
      (`apps/api/src/runtime/service-container.test.ts`)

### repo root

- [x] T016 [S0201] Run API build, tool test suite, repo quick suite, and ASCII
      verification for the new tool files (`apps/api/package.json`,
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

Run the `implement` workflow step next. After a successful `plansession` run,
`implement` is always the next workflow command.
